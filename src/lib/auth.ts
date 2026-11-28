import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "./prisma";
import { verifyEmailLoginExchangeToken } from "./email-verification";
import { getNextAuthSecret, checkServerTwoFactorStatus } from "./security";
import { normalizePatientId } from "./domain/patient-code";
import {
  checkPersistentRateLimit,
  recordPersistentFailedAttempt,
  resetPersistentRateLimit,
} from "./services/rate-limit-service";

const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours with sliding refresh
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },
  providers: [
    // Social Authentication: Google OAuth 2.0
    GoogleProvider({
      clientId: googleClientId || "unconfigured_google_client_id",
      clientSecret: googleClientSecret || "unconfigured_google_client_secret",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
      checks: ["pkce"],
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        pin: { label: "Senior PIN", type: "password" },
        patientIdentifier: { label: "Patient Identifier", type: "text" },
        verificationExchangeToken: { label: "Verification Exchange Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        // 1. One-Time Email Verification Auto-Login Exchange
        if (credentials.verificationExchangeToken) {
          const exchange = verifyEmailLoginExchangeToken(credentials.verificationExchangeToken);
          if (!exchange) {
            throw new Error("EXCHANGE_TOKEN_INVALID");
          }

          const verifiedUser = await prisma.user.findUnique({
            where: { id: exchange.userId },
            include: { caretakerProfile: true },
          });

          if (!verifiedUser || !verifiedUser.isActive) {
            return null;
          }

          return {
            id: verifiedUser.id,
            email: verifiedUser.email,
            name: verifiedUser.name,
            role: verifiedUser.role,
            avatarUrl: verifiedUser.avatarUrl,
            phoneNumber: verifiedUser.phoneNumber,
            twoFactorEnabled: verifiedUser.twoFactorEnabled,
            twoFactorVerified: false, // Compulsory 2FA setup screen next!
            twoFactorPendingSetup: !verifiedUser.twoFactorEnabled,
            isEmailVerified: true,
            needsProfileCompletion: verifiedUser.role === "CARETAKER" && !verifiedUser.caretakerProfile,
          };
        }

        // 2. PIN-based Senior Login Support
        // Senior logs in with their exact patient code (PT-xxxx) plus PIN.
        // Loads exactly one profile, does a single bcrypt.compare, and fails if no linked senior user.
        if (credentials.pin && !credentials.password) {
          const pin = credentials.pin.trim();
          const cleanCode = normalizePatientId(credentials.patientIdentifier);

          if (!cleanCode || !pin) {
            return null;
          }

          // Persistent database-backed rate limiting per patient code
          const limitStatus = await checkPersistentRateLimit({
            action: "PIN_LOGIN",
            identifier: cleanCode,
          });

          if (!limitStatus.allowed) {
            const minutes = Math.ceil((limitStatus.remainingSeconds || 900) / 60);
            throw new Error(`RATE_LIMIT_LOCKED:${minutes}`);
          }

          // Load exactly one profile by exact patient code
          const profile = await prisma.elderlyProfile.findUnique({
            where: { patientCode: cleanCode },
            include: {
              careCircles: {
                include: {
                  members: {
                    where: { role: "SENIOR", isActive: true },
                    include: { user: true },
                  },
                },
              },
            },
          });

          if (!profile || !profile.seniorPin || !profile.isSeniorModeActive) {
            await recordPersistentFailedAttempt({
              action: "PIN_LOGIN",
              identifier: cleanCode,
            });
            return null;
          }

          // Single bcrypt.compare on the loaded profile's PIN only
          const isPinValid = await bcrypt.compare(pin, profile.seniorPin);
          if (!isPinValid) {
            await recordPersistentFailedAttempt({
              action: "PIN_LOGIN",
              identifier: cleanCode,
            });
            return null;
          }

          // Find the linked senior user in this profile's care circle
          let seniorUser = null;
          for (const circle of profile.careCircles) {
            const member = circle.members[0];
            if (member?.user && member.user.role === "SENIOR" && member.user.isActive) {
              seniorUser = member.user;
              break;
            }
          }

          // If no linked senior user exists yet in this profile's care circle, link or create one
          if (!seniorUser && profile.careCircles.length > 0) {
            const circle = profile.careCircles[0];
            const seniorEmail = `${cleanCode.toLowerCase()}@carenest.patient`;
            seniorUser = await prisma.user.upsert({
              where: { email: seniorEmail },
              create: {
                name: profile.preferredName || profile.name,
                email: seniorEmail,
                role: "SENIOR",
                passwordHash: profile.seniorPin,
                isEmailVerified: true,
                emailVerified: new Date(),
                twoFactorEnabled: false,
                isActive: true,
              },
              update: {
                name: profile.preferredName || profile.name,
                role: "SENIOR",
                passwordHash: profile.seniorPin,
                isActive: true,
              },
            });

            await prisma.careCircleMember.create({
              data: {
                careCircleId: circle.id,
                userId: seniorUser.id,
                role: "SENIOR",
                isActive: true,
                permissions: ["CAN_VIEW_RECORDS", "CAN_CONFIRM_DOSE"],
              },
            });
          }

          // Fail the login if the profile still has no linked senior user
          if (!seniorUser) {
            await recordPersistentFailedAttempt({
              action: "PIN_LOGIN",
              identifier: cleanCode,
            });
            return null;
          }

          // Reset rate limit counter upon successful PIN authentication
          await resetPersistentRateLimit("PIN_LOGIN", cleanCode);

          return {
            id: seniorUser.id,
            email: seniorUser.email,
            name: profile.preferredName || profile.name,
            role: "SENIOR",
            avatarUrl: profile.avatarUrl,
            phoneNumber: profile.emergencyContactPhone,
            twoFactorEnabled: false,
            twoFactorVerified: true, // Seniors with PIN check-in are pre-verified
            twoFactorPendingSetup: false,
            isEmailVerified: true,
            needsProfileCompletion: false,
          };
        }

        // 3. Standard Email + Password Login
        if (!credentials.email || !credentials.password) {
          return null;
        }

        const normalizedEmail = credentials.email.toLowerCase().trim();

        // Persistent database rate limiting for password login
        const passLimitStatus = await checkPersistentRateLimit({
          action: "PASSWORD_LOGIN",
          identifier: normalizedEmail,
        });

        if (!passLimitStatus.allowed) {
          throw new Error(
            `Account temporarily locked due to excessive failed login attempts. Please try again in ${Math.ceil(
              (passLimitStatus.remainingSeconds || 900) / 60
            )} minutes.`
          );
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: { caretakerProfile: true },
        });

        if (!user || !user.isActive) {
          return null;
        }

        if (!user.passwordHash) {
          // User registered via Google and has no local password
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isPasswordValid) {
          await recordPersistentFailedAttempt({
            action: "PASSWORD_LOGIN",
            identifier: normalizedEmail,
          });
          return null;
        }

        // Reset rate limit on successful password authentication
        await resetPersistentRateLimit("PASSWORD_LOGIN", normalizedEmail);

        // An email/password account that is not verified cannot sign in
        if (!user.isEmailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        const isSenior = user.role === "SENIOR";
        const twoFactorEnabled = user.twoFactorEnabled;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          phoneNumber: user.phoneNumber,
          twoFactorEnabled,
          twoFactorVerified: isSenior, // Family and Caretakers MUST verify 2FA
          twoFactorPendingSetup: !isSenior && !twoFactorEnabled,
          isEmailVerified: user.isEmailVerified,
          needsProfileCompletion: user.role === "CARETAKER" && !user.caretakerProfile,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase().trim();
        if (!email) return false;

        // Fail closed: google email must be strictly verified
        const googleEmailVerified = (profile as any)?.email_verified;
        if (googleEmailVerified !== true) {
          return "/login?error=GoogleEmailUnverified";
        }

        let dbUser = await prisma.user.findUnique({
          where: { email },
          include: { caretakerProfile: true },
        });

        let isNewGoogleUser = false;
        if (!dbUser) {
          isNewGoogleUser = true;
          // Auto-provision Google user with pre-verified email
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name || "Google User",
              googleId: account.providerAccountId,
              avatarUrl: user.image || null,
              isEmailVerified: true,
              emailVerified: new Date(),
              role: "FAMILY", // Default initial role; user will pick on complete-profile
              twoFactorEnabled: false,
            },
            include: { caretakerProfile: true },
          });

          await prisma.notificationPreference.create({
            data: {
              userId: dbUser.id,
              emailReminders: true,
              missedDoseAlerts: true,
              escalationAlerts: true,
              appointmentReminders: true,
              dailySummaryEmail: true,
              gracePeriodMinutes: 45,
            },
          });
        } else {
          if (!dbUser.isActive) {
            return "/login?error=AccountDeactivated";
          }

          // If a password account exists with the same email, link Google login to it when Google reports the email verified.
          // When linking Google to an unverified existing account, invalidate any existing passwordHash and pending verification codes first.
          if (!dbUser.googleId || dbUser.googleId !== account.providerAccountId) {
            const wasUnverified = !dbUser.isEmailVerified;
            if (wasUnverified) {
              await (prisma as any).emailVerificationToken?.deleteMany({ where: { email } }).catch(() => {});
              await (prisma as any).oTPRequest?.deleteMany({ where: { email } }).catch(() => {});
            }

            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                googleId: account.providerAccountId,
                isEmailVerified: true,
                emailVerified: dbUser.emailVerified || new Date(),
                ...(wasUnverified ? { passwordHash: null } : {}),
              },
              include: { caretakerProfile: true },
            });
          }
        }

        const needsCaretakerProfile = dbUser.role === "CARETAKER" && !dbUser.caretakerProfile;

        user.id = dbUser.id;
        user.role = dbUser.role;
        user.phoneNumber = dbUser.phoneNumber;
        user.avatarUrl = dbUser.avatarUrl;
        user.twoFactorEnabled = dbUser.twoFactorEnabled;
        user.twoFactorVerified = dbUser.role === "SENIOR"; // Compulsory 2FA check!
        user.twoFactorPendingSetup = dbUser.role !== "SENIOR" && !dbUser.twoFactorEnabled;
        user.isEmailVerified = true;
        user.needsProfileCompletion = isNewGoogleUser || needsCaretakerProfile;
        return true;
      }
      return true;
    },
    async jwt({ token, user, trigger, session, account }) {
      if (!token.tokenId) {
        token.tokenId = crypto.randomUUID();
      }

      if (user) {
        token.id = user.id;
        token.tokenId = user.tokenId || token.tokenId;
        token.role = user.role;
        token.avatarUrl = user.avatarUrl;
        token.phoneNumber = user.phoneNumber;
        token.twoFactorEnabled = user.twoFactorEnabled ?? false;
        token.twoFactorVerified = user.twoFactorVerified ?? false;
        token.twoFactorPendingSetup = user.twoFactorPendingSetup ?? false;
        token.isEmailVerified = true;
        token.needsProfileCompletion = user.needsProfileCompletion ?? false;
      }

      // Re-read role, isActive and 2FA status from database on each protected request and token refresh.
      // Browser must NEVER be able to set role, twoFactorVerified, twoFactorEnabled, etc.
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            include: { caretakerProfile: true },
          });

          if (!dbUser || !dbUser.isActive) {
            // Refuse and invalidate session if user does not exist or was deactivated
            return null as any;
          }

          token.role = dbUser.role;
          token.phoneNumber = dbUser.phoneNumber;
          token.avatarUrl = dbUser.avatarUrl || (token.picture as string | null);
          token.twoFactorEnabled = dbUser.twoFactorEnabled;
          token.isEmailVerified = dbUser.isEmailVerified;

          // 2FA status check server-side
          if (dbUser.role === "SENIOR") {
            token.twoFactorVerified = true;
            token.twoFactorPendingSetup = false;
          } else {
            const server2FA = await checkServerTwoFactorStatus(dbUser.id, token.tokenId as string);
            token.twoFactorVerified = server2FA.isVerified;
            token.twoFactorPendingSetup = !dbUser.twoFactorEnabled;
          }

          // Caretaker profile & verification status
          if (dbUser.role === "CARETAKER") {
            token.needsProfileCompletion = !dbUser.caretakerProfile;
            token.caretakerStatus = dbUser.caretakerProfile?.status || null;
          } else {
            token.needsProfileCompletion = false;
            token.caretakerStatus = null;
          }
        } catch (e) {
          console.error("[JWT Re-verification Error]:", e);
        }
      }

      // Remove client trust: Client-supplied "update" trigger NEVER modifies security flags
      if (trigger === "update" && session) {
        if (typeof session.name === "string") {
          token.name = session.name;
        }
        if (typeof session.avatarUrl === "string") {
          token.avatarUrl = session.avatarUrl;
        }
        // role, twoFactorVerified, twoFactorEnabled, twoFactorPendingSetup, needsProfileCompletion
        // are strictly ignored from client session input.
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.tokenId = token.tokenId;
        session.user.role = token.role;
        session.user.avatarUrl = token.avatarUrl;
        session.user.phoneNumber = token.phoneNumber;
        session.user.twoFactorEnabled = token.twoFactorEnabled;
        session.user.twoFactorVerified = token.twoFactorVerified;
        session.user.twoFactorPendingSetup = token.twoFactorPendingSetup;
        session.user.isEmailVerified = token.isEmailVerified;
        session.user.needsProfileCompletion = token.needsProfileCompletion;
        session.user.caretakerStatus = token.caretakerStatus;
      }
      return session;
    },
  },
  secret: getNextAuthSecret(),
};
