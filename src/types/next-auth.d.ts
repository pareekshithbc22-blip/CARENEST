import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tokenId?: string | null;
      role: "SENIOR" | "FAMILY" | "CARETAKER" | "ADMIN";
      phoneNumber?: string | null;
      avatarUrl?: string | null;
      twoFactorEnabled?: boolean;
      twoFactorVerified?: boolean;
      twoFactorPendingSetup?: boolean;
      googleId?: string | null;
      isEmailVerified?: boolean;
      needsProfileCompletion?: boolean;
      caretakerStatus?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    tokenId?: string | null;
    role: "SENIOR" | "FAMILY" | "CARETAKER" | "ADMIN";
    phoneNumber?: string | null;
    avatarUrl?: string | null;
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
    twoFactorPendingSetup?: boolean;
    googleId?: string | null;
    isEmailVerified?: boolean;
    needsProfileCompletion?: boolean;
    caretakerStatus?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tokenId?: string | null;
    role: "SENIOR" | "FAMILY" | "CARETAKER" | "ADMIN";
    phoneNumber?: string | null;
    avatarUrl?: string | null;
    twoFactorEnabled?: boolean;
    twoFactorVerified?: boolean;
    twoFactorPendingSetup?: boolean;
    googleId?: string | null;
    isEmailVerified?: boolean;
    needsProfileCompletion?: boolean;
    caretakerStatus?: string | null;
  }
}
