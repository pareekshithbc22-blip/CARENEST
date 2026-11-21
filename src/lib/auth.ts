import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { verifyEmailLoginExchangeToken } from "./email-verification";

// In-memory rate limiting to protect senior PINs against brute-force attempts
interface RateLimitEntry {
  attempts: number;
  lockedUntil: number;
}
const pinRateLimitMap = new Map<string, RateLimitEntry>();

function getPinRateLimit(key: string) {
  const entry = pinRateLimitMap.get(key);
  if (!entry) return { locked: false };
  if (entry.lockedUntil > Date.now()) return { locked: true };
  if (entry.lockedUntil > 0 && entry.lockedUntil <= Date.now()) {
    pinRateLimitMap.delete(key);
    return { locked: false };
  }
  return { locked: false };
}

function recordFailedPinAttempt(key: string) {
  const entry = pinRateLimitMap.get(key) || { attempts: 0, lockedUntil: 0 };
  entry.attempts += 1;
  if (entry.attempts >= 5) {
    entry.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
  }
  pinRateLimitMap.set(key, entry);
}

function resetPinRateLimit(key: string) {
  pinRateLimitMap.delete(key);
}

const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },
  providers: [
    // Social Authentication: Google OAuth 2.0 (Structured cleanly so additional providers can easily be appended)
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
        if (credentials.pin && !credentials.password) {
          const pin = credentials.pin.trim();
          const identifier = credentials.patientIdentifier?.trim().toLowerCase();
          const rateKey = identifier || "global_pin_attempt";

          const limitStatus = getPinRateLimit(rateKey);
          if (limitStatus.locked) {
            throw new Error(
              "Account temporarily locked due to excessive failed PIN attempts. Please try again in 15 minutes."
            );
          }

          let profiles = await prisma.elderlyProfile.findMany({
            where: {
              isSeniorModeActive: true,
              seniorPin: { not: null },
            },
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

          if (identifier) {
            profiles = profiles.filter((p) => {
              const nameMatch = p.name.toLowerCase().includes(identifier);
              const prefMatch = p.preferredName?.toLowerCase().includes(identifier);
              const phoneClean = p.emergencyContactPhone?.replace(/\D/g, "");
              const idClean = identifier.replace(/\D/g, "");
              const phoneMatch = Boolean(idClean && phoneClean && phoneClean.includes(idClean));
              const idMatch = p.id.toLowerCase().startsWith(identifier);
              return nameMatch || prefMatch || phoneMatch || idMatch;
            });
          }

          for (const profile of profiles) {
            if (profile.seniorPin && bcrypt.compareSync(pin, profile.seniorPin)) {
              resetPinRateLimit(rateKey);

              // Find the linked senior user in this profile's care circle
              let seniorUser = null;
              for (const circle of profile.careCircles) {
                const member = circle.members[0];
                if (member?.user && member.user.role === "SENIOR") {
                  seniorUser = member.user;
                  break;
                }
              }

              if (!seniorUser) {
                seniorUser = await prisma.user.findFirst({
                  where: {
                    OR: [{ email: { contains: "eleanor" } }, { role: "SENIOR" }],
                  },
                });
              }

              if (seniorUser) {
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
            }
          }

          recordFailedPinAttempt(rateKey);
          return null;
        }

        // 3. Standard Email + Password Login
        if (!credentials.email || !credentials.password) {
          return null;
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
          return null;
        }

        // Check email verification status
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
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase().trim();
        if (!email) return false;

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
          if (!dbUser.googleId) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                googleId: account.providerAccountId,
                isEmailVerified: true,
                emailVerified: dbUser.emailVerified || new Date(),
              },
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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatarUrl = user.avatarUrl;
        token.phoneNumber = user.phoneNumber;
        token.twoFactorEnabled = user.twoFactorEnabled ?? false;
        token.twoFactorVerified = user.twoFactorVerified ?? false;
        token.twoFactorPendingSetup = user.twoFactorPendingSetup ?? false;
        token.isEmailVerified = user.isEmailVerified ?? false;
        token.needsProfileCompletion = user.needsProfileCompletion ?? false;
      }

      if (trigger === "update" && session) {
        if (session.twoFactorVerified !== undefined) {
          token.twoFactorVerified = session.twoFactorVerified;
        }
        if (session.twoFactorEnabled !== undefined) {
          token.twoFactorEnabled = session.twoFactorEnabled;
        }
        if (session.twoFactorPendingSetup !== undefined) {
          token.twoFactorPendingSetup = session.twoFactorPendingSetup;
        }
        if (session.role) {
          token.role = session.role;
        }
        if (session.needsProfileCompletion !== undefined) {
          token.needsProfileCompletion = session.needsProfileCompletion;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.avatarUrl = token.avatarUrl;
        session.user.phoneNumber = token.phoneNumber;
        session.user.twoFactorEnabled = token.twoFactorEnabled;
        session.user.twoFactorVerified = token.twoFactorVerified;
        session.user.twoFactorPendingSetup = token.twoFactorPendingSetup;
        session.user.isEmailVerified = token.isEmailVerified;
        session.user.needsProfileCompletion = token.needsProfileCompletion;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "carenest-hackathon-jwt-secret-default-key-2026",
};
