/**
 * Central Security Utilities for CARENEST.
 * Handles:
 * - Secret verification & production enforcement (No Fallback Secrets)
 * - Constant-time string comparison (timing attack prevention)
 * - Short-lived upload token generation and verification
 * - Server-side 2FA session verification tracking
 */

import crypto from "crypto";
import { prisma } from "./prisma";

/**
 * Returns NEXTAUTH_SECRET.
 * In production, the app strictly refuses to start or operate without it.
 */
export function getNextAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.trim().length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FATAL SECURITY CONFIGURATION ERROR: NEXTAUTH_SECRET is not configured in production. Application cannot start."
      );
    }
    // Return empty in non-production if unset so callers fail cleanly or rely on dev fallback
    return "";
  }
  return secret.trim();
}

/**
 * Constant-time string equality check to prevent timing attacks.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates CRON_SECRET in constant time and fails closed (false) if missing.
 */
export function verifyCronSecret(providedSecret?: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.trim().length === 0) {
    // Fail closed: If not configured, reject all scheduler requests
    return false;
  }
  if (!providedSecret || providedSecret.trim().length === 0) {
    return false;
  }
  return timingSafeEqualString(cronSecret.trim(), providedSecret.trim());
}

/**
 * Generates a short-lived signed upload token (valid for 15 minutes).
 */
export function generateUploadToken(purpose = "CARETAKER_REGISTRATION"): string {
  const secret = getNextAuthSecret() || "dev-upload-signing-key";
  const now = Date.now();
  const expiresAt = now + 15 * 60 * 1000; // 15 minutes
  const payload = `${purpose}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(JSON.stringify({ purpose, expiresAt, signature })).toString("base64url");
}

/**
 * Verifies a short-lived upload token.
 */
export function verifyUploadToken(tokenString: string, expectedPurpose = "CARETAKER_REGISTRATION"): boolean {
  try {
    if (!tokenString) return false;
    const secret = getNextAuthSecret() || "dev-upload-signing-key";
    const raw = Buffer.from(tokenString, "base64url").toString("utf8");
    const { purpose, expiresAt, signature } = JSON.parse(raw);

    if (purpose !== expectedPurpose) return false;
    if (Date.now() > expiresAt) return false;

    const payload = `${purpose}:${expiresAt}`;
    const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    return timingSafeEqualString(signature, expectedSignature);
  } catch {
    return false;
  }
}

function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const code = err.code || err.cause?.code;
  const msg = err.message || "";
  return code === "P2021" || msg.includes("does not exist") || msg.includes("TableDoesNotExist");
}

// Memory fallback for 2FA session verification prior to applying 'prisma db push'
const memorySession2FAMap = new Map<string, boolean>();

/**
 * Server-side 2FA verification tracking in database.
 * Writes a record only when server-side 2FA verification succeeds.
 */
export async function recordTwoFactorVerification(userId: string, tokenId?: string | null): Promise<void> {
  const now = new Date();

  try {
    if (tokenId) {
      await prisma.userSession.upsert({
        where: { tokenId },
        create: {
          userId,
          tokenId,
          twoFactorVerified: true,
          verifiedAt: now,
          lastActiveAt: now,
        },
        update: {
          twoFactorVerified: true,
          verifiedAt: now,
          lastActiveAt: now,
        },
      });
    } else {
      await prisma.userSession.updateMany({
        where: { userId },
        data: {
          twoFactorVerified: true,
          verifiedAt: now,
          lastActiveAt: now,
        },
      });
    }
  } catch (err: any) {
    if (isTableMissingError(err)) {
      if (tokenId) memorySession2FAMap.set(tokenId, true);
      memorySession2FAMap.set(userId, true);
      return;
    }
    throw err;
  }
}

/**
 * Checks server-side 2FA status from database for a given session token.
 */
export async function checkServerTwoFactorStatus(
  userId: string,
  tokenId?: string | null
): Promise<{ isVerified: boolean; sessionRecord: any | null }> {
  try {
    if (!tokenId) {
      const recent = await prisma.userSession.findFirst({
        where: { userId, twoFactorVerified: true },
        orderBy: { verifiedAt: "desc" },
      });
      return { isVerified: Boolean(recent), sessionRecord: recent };
    }

    const session = await prisma.userSession.findUnique({
      where: { tokenId },
    });

    return {
      isVerified: Boolean(session?.twoFactorVerified),
      sessionRecord: session,
    };
  } catch (err: any) {
    if (isTableMissingError(err)) {
      const isVerified = Boolean(
        (tokenId && memorySession2FAMap.get(tokenId)) || memorySession2FAMap.get(userId)
      );
      return { isVerified, sessionRecord: null };
    }
    throw err;
  }
}

/**
 * Cleans up orphan uploaded documents older than the specified duration (default 24 hours).
 * An orphan file is an uploaded file not referenced by any CaretakerProfile.
 */
export async function cleanOrphanUploadedFiles(
  olderThanMs = 24 * 60 * 60 * 1000
): Promise<{ deletedCount: number; scannedCount: number }> {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const storageDir = path.resolve(process.cwd(), "storage", "secure_documents");

    if (!fs.existsSync(storageDir)) {
      return { deletedCount: 0, scannedCount: 0 };
    }

    const files = fs.readdirSync(storageDir);
    const now = Date.now();
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(storageDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > olderThanMs) {
          const referenced = await prisma.caretakerProfile.findFirst({
            where: {
              OR: [
                { documentFileName: file },
                { documentFilePath: { contains: file } },
              ],
            },
          });

          if (!referenced) {
            fs.unlinkSync(filePath);
            deletedCount += 1;
          }
        }
      } catch {
        // Continue cleaning other files
      }
    }

    return { deletedCount, scannedCount: files.length };
  } catch (err) {
    console.error("[Orphan Cleanup Error]:", err);
    return { deletedCount: 0, scannedCount: 0 };
  }
}
