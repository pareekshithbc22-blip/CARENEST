import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "SENIOR" | "FAMILY" | "CARETAKER" | "ADMIN";
      phoneNumber?: string | null;
      avatarUrl?: string | null;
      twoFactorEnabled?: boolean;
      twoFactorVerified?: boolean;
      twoFactorPendingSetup?: boolean;
      googleId?: string | null;
      isEmailVerified?: boolean;
      needsProfileCompletion?: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: "SENIOR" | "FAMILY" | "CARETAKER" | "ADMIN";
    phoneNumber?: string | null;
    avatarUrl?: string | null;
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
    twoFactorPendingSetup?: boolean;
    googleId?: string | null;
    isEmailVerified?: boolean;
    needsProfileCompletion?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "SENIOR" | "FAMILY" | "CARETAKER" | "ADMIN";
    phoneNumber?: string | null;
    avatarUrl?: string | null;
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
    twoFactorPendingSetup?: boolean;
    googleId?: string | null;
    isEmailVerified?: boolean;
    needsProfileCompletion?: boolean;
  }
}
