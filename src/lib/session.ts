import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (user.role !== "SENIOR" && !user.isEmailVerified) {
    throw new Error("EMAIL_VERIFICATION_REQUIRED");
  }
  // Compulsory 2FA verification for Family and Caretakers
  if ((user.role === "FAMILY" || user.role === "CARETAKER") && user.twoFactorVerified === false) {
    throw new Error("TWO_FACTOR_REQUIRED");
  }
  return user;
}
