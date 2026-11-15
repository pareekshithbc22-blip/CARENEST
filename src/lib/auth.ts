import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

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
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        pin: { label: "Senior PIN", type: "password" },
        patientIdentifier: { label: "Patient Identifier", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        // 1. PIN-based Senior Login Support
        if (credentials.pin && !credentials.password) {
          const pin = credentials.pin.trim();
          const identifier = credentials.patientIdentifier?.trim().toLowerCase();
          const rateKey = identifier || "global_pin_attempt";

          const limitStatus = getPinRateLimit(rateKey);
          if (limitStatus.locked) {
            throw new Error("Account temporarily locked due to excessive failed PIN attempts. Please try again in 15 minutes.");
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
                    OR: [
                      { email: { contains: "eleanor" } },
                      { role: "SENIOR" },
                    ],
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
                };
              }
            }
          }

          recordFailedPinAttempt(rateKey);
          return null;
        }

        // 2. Standard Email + Password Login
        if (!credentials.email || !credentials.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
          phoneNumber: user.phoneNumber,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatarUrl = user.avatarUrl;
        token.phoneNumber = user.phoneNumber;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.avatarUrl = token.avatarUrl;
        session.user.phoneNumber = token.phoneNumber;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "carenest-hackathon-jwt-secret-default-key-2026",
};
