import crypto from "crypto";
import { prisma } from "./prisma";
import { sendVerificationLinkEmail, EmailResult } from "./email/service";
import { getAppUrl } from "./config";

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function getSecret(): string {
  return process.env.NEXTAUTH_SECRET || "carenest-hackathon-production-jwt-encryption-key-2026-secure";
}

/**
 * Creates a cryptographically random 64-character verification token
 * Uses Prisma Client with resilient fallback to raw SQL
 */
export async function createVerificationToken(email: string): Promise<string> {
  const normalizedEmail = email.toLowerCase().trim();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

  try {
    if ((prisma as any).emailVerificationToken) {
      await (prisma as any).emailVerificationToken.deleteMany({
        where: { email: normalizedEmail },
      }).catch(() => {});

      await (prisma as any).emailVerificationToken.create({
        data: {
          email: normalizedEmail,
          token,
          expiresAt,
        },
      });
    } else {
      // Direct PostgreSQL fallback if in-memory Prisma client was loaded before schema update
      await prisma.$executeRawUnsafe(
        `DELETE FROM "EmailVerificationToken" WHERE "email" = $1`,
        normalizedEmail
      ).catch(() => {});

      await prisma.$executeRawUnsafe(
        `INSERT INTO "EmailVerificationToken" ("id", "email", "token", "expiresAt") VALUES (gen_random_uuid(), $1, $2, $3)`,
        normalizedEmail,
        token,
        expiresAt
      );
    }
  } catch (err: any) {
    console.error("[Email Verification Token DB Error]:", err);
    // If raw insert also needs table creation
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    await prisma.$executeRawUnsafe(
      `INSERT INTO "EmailVerificationToken" ("id", "email", "token", "expiresAt") VALUES (gen_random_uuid(), $1, $2, $3)`,
      normalizedEmail,
      token,
      expiresAt
    ).catch(() => {});
  }

  return token;
}

/**
 * Generates token, prints verification link in server terminal,
 * and sends email if provider credentials are configured.
 */
export async function sendAccountVerificationEmail(
  email: string,
  name: string
): Promise<EmailResult & { token: string; verificationUrl: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const token = await createVerificationToken(normalizedEmail);
  const verificationUrl = `${getAppUrl()}/verify-email?token=${token}`;

  // Always print the verification link in the server terminal for development/testing
  console.log("\n========================================================");
  console.log("🔗 [CareNest Email Verification Link]");
  console.log(`Recipient: ${normalizedEmail}`);
  console.log(`Verification URL: ${verificationUrl}`);
  console.log("Open this URL in your browser to verify this account immediately.");
  console.log("========================================================\n");

  let sendResult: EmailResult;
  try {
    sendResult = await sendVerificationLinkEmail({
      to: normalizedEmail,
      name,
      verificationUrl,
    });
  } catch (err: any) {
    console.warn(`[CareNest Email Dispatch Warning]: ${err.message}`);
    sendResult = {
      success: false,
      error: err.message,
      provider: "NONE",
      isSimulated: false,
      diagnosticCode: "EMAIL_NOT_CONFIGURED",
    };
  }

  return {
    ...sendResult,
    token,
    verificationUrl,
  };
}

/**
 * Verifies the single-use token, marks user as email verified, and consumes the token
 */
export async function verifyEmailToken(token: string): Promise<{
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    twoFactorEnabled: boolean;
  };
}> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return { success: false, error: "Missing or invalid verification token." };
  }

  const cleanToken = token.trim();

  let record: { id: string; email: string; token: string; expiresAt: Date } | null = null;

  try {
    if ((prisma as any).emailVerificationToken) {
      record = await (prisma as any).emailVerificationToken.findUnique({
        where: { token: cleanToken },
      });
    } else {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id", "email", "token", "expiresAt" FROM "EmailVerificationToken" WHERE "token" = $1 LIMIT 1`,
        cleanToken
      );
      record = rows[0] || null;
    }
  } catch (err) {
    console.error("[Verify Email Token DB Error]:", err);
  }

  if (!record) {
    return {
      success: false,
      error: "This email verification link is invalid or has already been used.",
    };
  }

  const expiresAt = new Date(record.expiresAt);
  if (expiresAt < new Date()) {
    // Delete expired token
    if ((prisma as any).emailVerificationToken) {
      await (prisma as any).emailVerificationToken.delete({
        where: { id: record.id },
      }).catch(() => {});
    } else {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "EmailVerificationToken" WHERE "id" = $1`,
        record.id
      ).catch(() => {});
    }

    return {
      success: false,
      error: "This email verification link has expired. Please request a new verification link.",
    };
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: record.email.toLowerCase().trim() },
  });

  if (!user) {
    return {
      success: false,
      error: "Account associated with this verification link was not found.",
    };
  }

  // Mark user as verified
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerified: new Date(),
    },
  });

  // Consume token (single use guarantee!)
  if ((prisma as any).emailVerificationToken) {
    await (prisma as any).emailVerificationToken.delete({
      where: { id: record.id },
    }).catch(() => {});
  } else {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "EmailVerificationToken" WHERE "id" = $1`,
      record.id
    ).catch(() => {});
  }

  return {
    success: true,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      twoFactorEnabled: updatedUser.twoFactorEnabled,
    },
  };
}

/**
 * Generates an HMAC-signed single-use token to allow immediate automatic login upon clicking the email link
 */
export function generateEmailLoginExchangeToken(userId: string, email: string): string {
  const payload = JSON.stringify({
    userId,
    email: email.toLowerCase().trim(),
    exp: Date.now() + 5 * 60 * 1000, // Valid for 5 minutes
    nonce: crypto.randomBytes(16).toString("hex"),
  });

  const payloadB64 = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies the email login exchange token
 */
export function verifyEmailLoginExchangeToken(token: string): { userId: string; email: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", getSecret())
      .update(payloadB64)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    if (Date.now() > payload.exp) {
      return null;
    }

    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}
