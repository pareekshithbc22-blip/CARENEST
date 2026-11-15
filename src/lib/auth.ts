import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

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
      },
      async authorize(credentials) {
        if (!credentials) return null;

        // 1. PIN-based Senior Login Support
        if (credentials.pin && !credentials.password) {
          const profiles = await prisma.elderlyProfile.findMany({
            where: {
              isSeniorModeActive: true,
              seniorPin: { not: null },
            },
            include: {
              createdBy: true,
            },
          });

          for (const profile of profiles) {
            if (profile.seniorPin && bcrypt.compareSync(credentials.pin, profile.seniorPin)) {
              // Find matching Senior User account or profile owner
              const seniorUser = await prisma.user.findFirst({
                where: {
                  OR: [
                    { email: { contains: "eleanor" } },
                    { role: "SENIOR" },
                  ],
                },
              });

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
