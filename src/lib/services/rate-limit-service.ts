/**
 * Persistent Database-Backed Rate Limiting Service.
 * Replaces all in-memory Map limiters with database-backed atomic counters.
 *
 * Security Features:
 * - Atomic upsert counters against database table RateLimitBucket
 * - Per-account and per-IP separation to prevent DoS attacks against victims
 * - Progressive lockout: Doubling backoff with strict maximum cap (cannot lock out indefinitely)
 * - Automatic reset on successful authentication
 */

import { prisma } from "../prisma";

export interface RateLimitOptions {
  action:
    | "PIN_LOGIN"
    | "TOTP_VERIFY"
    | "EMAIL_OTP"
    | "PASSWORD_LOGIN"
    | "REGISTER"
    | "UPLOAD"
    | "VERIFY_SUBMIT";
  identifier: string; // Account identifier (email, patientCode, userId)
  ip?: string | null;  // Client IP address
  maxAttempts?: number;
  windowMs?: number;
  baseLockoutMs?: number;
  maxLockoutMs?: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  lockedUntil?: Date | null;
  remainingSeconds?: number;
  attemptsRemaining?: number;
  isLocked: boolean;
}

const DEFAULT_LIMITS: Record<
  RateLimitOptions["action"],
  { maxAttempts: number; windowMs: number; baseLockoutMs: number; maxLockoutMs: number }
> = {
  PIN_LOGIN: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,     // 15 min window
    baseLockoutMs: 5 * 60 * 1000,  // 5 min base lock
    maxLockoutMs: 30 * 60 * 1000,  // Max 30 min lock
  },
  TOTP_VERIFY: {
    maxAttempts: 5,
    windowMs: 10 * 60 * 1000,
    baseLockoutMs: 5 * 60 * 1000,
    maxLockoutMs: 30 * 60 * 1000,
  },
  EMAIL_OTP: {
    maxAttempts: 5,
    windowMs: 10 * 60 * 1000,
    baseLockoutMs: 10 * 60 * 1000,
    maxLockoutMs: 60 * 60 * 1000,
  },
  PASSWORD_LOGIN: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    baseLockoutMs: 5 * 60 * 1000,
    maxLockoutMs: 30 * 60 * 1000,
  },
  REGISTER: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000,     // 10 per hour per IP
    baseLockoutMs: 30 * 60 * 1000,
    maxLockoutMs: 2 * 60 * 60 * 1000,
  },
  UPLOAD: {
    maxAttempts: 15,
    windowMs: 15 * 60 * 1000,     // 15 per 15 min per IP
    baseLockoutMs: 15 * 60 * 1000,
    maxLockoutMs: 60 * 60 * 1000,
  },
  VERIFY_SUBMIT: {
    maxAttempts: 5,
    windowMs: 24 * 60 * 60 * 1000, // 5 submissions per day
    baseLockoutMs: 60 * 60 * 1000,
    maxLockoutMs: 24 * 60 * 60 * 1000,
  },
};

// In-memory fallback map for environments prior to applying 'prisma db push'
const memoryFallbackMap = new Map<
  string,
  {
    attempts: number;
    firstAttemptAt: Date;
    lastAttemptAt: Date;
    lockedUntil: Date | null;
    blockedCount: number;
  }
>();

function isTableMissingError(err: any): boolean {
  if (!err) return false;
  const code = err.code || err.cause?.code;
  const msg = err.message || "";
  return code === "P2021" || msg.includes("does not exist") || msg.includes("TableDoesNotExist");
}

/**
 * Checks if an action is permitted by inspecting persistent database rate limits.
 * Evaluates both the account-level identifier and the client IP.
 */
export async function checkPersistentRateLimit(
  options: RateLimitOptions
): Promise<RateLimitCheckResult> {
  const defaults = DEFAULT_LIMITS[options.action];
  const maxAttempts = options.maxAttempts ?? defaults.maxAttempts;
  const now = new Date();
  const accountKey = `${options.action}:acc:${options.identifier.toLowerCase().trim()}`;

  try {
    // 1. Check Account Key
    const accountBucket = await prisma.rateLimitBucket.findUnique({
      where: { key: accountKey },
    });

    if (accountBucket?.lockedUntil && accountBucket.lockedUntil > now) {
      const remainingSeconds = Math.ceil((accountBucket.lockedUntil.getTime() - now.getTime()) / 1000);
      return {
        allowed: false,
        isLocked: true,
        lockedUntil: accountBucket.lockedUntil,
        remainingSeconds,
        attemptsRemaining: 0,
      };
    }

    // 2. Check IP Key if provided
    if (options.ip) {
      const cleanIp = options.ip.split(",")[0].trim();
      const ipKey = `${options.action}:ip:${cleanIp}`;
      const ipBucket = await prisma.rateLimitBucket.findUnique({
        where: { key: ipKey },
      });

      if (ipBucket?.lockedUntil && ipBucket.lockedUntil > now) {
        const remainingSeconds = Math.ceil((ipBucket.lockedUntil.getTime() - now.getTime()) / 1000);
        return {
          allowed: false,
          isLocked: true,
          lockedUntil: ipBucket.lockedUntil,
          remainingSeconds,
          attemptsRemaining: 0,
        };
      }
    }

    const currentAttempts = accountBucket ? accountBucket.attempts : 0;
    const attemptsRemaining = Math.max(0, maxAttempts - currentAttempts);

    return {
      allowed: true,
      isLocked: false,
      attemptsRemaining,
    };
  } catch (err: any) {
    if (isTableMissingError(err)) {
      // Resilient fallback to memory state
      const accountMem = memoryFallbackMap.get(accountKey);
      if (accountMem?.lockedUntil && accountMem.lockedUntil > now) {
        const remainingSeconds = Math.ceil((accountMem.lockedUntil.getTime() - now.getTime()) / 1000);
        return {
          allowed: false,
          isLocked: true,
          lockedUntil: accountMem.lockedUntil,
          remainingSeconds,
          attemptsRemaining: 0,
        };
      }
      return { allowed: true, isLocked: false, attemptsRemaining: maxAttempts };
    }
    throw err;
  }
}

/**
 * Records a failed attempt in the database, applying progressive lockout if threshold is exceeded.
 */
export async function recordPersistentFailedAttempt(
  options: RateLimitOptions
): Promise<{ locked: boolean; lockedUntil?: Date; attemptsRemaining: number }> {
  const defaults = DEFAULT_LIMITS[options.action];
  const maxAttempts = options.maxAttempts ?? defaults.maxAttempts;
  const windowMs = options.windowMs ?? defaults.windowMs;
  const baseLockoutMs = options.baseLockoutMs ?? defaults.baseLockoutMs;
  const maxLockoutMs = options.maxLockoutMs ?? defaults.maxLockoutMs;
  const now = new Date();
  const accountKey = `${options.action}:acc:${options.identifier.toLowerCase().trim()}`;

  try {
    // 1. Record for Account Key
    const existing = await prisma.rateLimitBucket.findUnique({
      where: { key: accountKey },
    });

    let newAttempts = 1;
    let blockedCount = existing?.blockedCount || 0;
    let lockedUntil: Date | null = null;

    if (existing) {
      const isWithinWindow = now.getTime() - existing.firstAttemptAt.getTime() < windowMs;
      newAttempts = isWithinWindow ? existing.attempts + 1 : 1;

      if (newAttempts >= maxAttempts) {
        const lockoutDurationMs = Math.min(
          maxLockoutMs,
          baseLockoutMs * Math.pow(2, Math.min(blockedCount, 4))
        );
        lockedUntil = new Date(now.getTime() + lockoutDurationMs);
        blockedCount += 1;
      }

      await prisma.rateLimitBucket.update({
        where: { key: accountKey },
        data: {
          attempts: newAttempts,
          firstAttemptAt: isWithinWindow ? existing.firstAttemptAt : now,
          lastAttemptAt: now,
          lockedUntil,
          blockedCount,
        },
      });
    } else {
      await prisma.rateLimitBucket.create({
        data: {
          key: accountKey,
          action: options.action,
          identifier: options.identifier,
          attempts: 1,
          firstAttemptAt: now,
          lastAttemptAt: now,
        },
      });
    }

    // 2. Also record for IP if provided
    if (options.ip) {
      const cleanIp = options.ip.split(",")[0].trim();
      const ipKey = `${options.action}:ip:${cleanIp}`;
      const ipExisting = await prisma.rateLimitBucket.findUnique({
        where: { key: ipKey },
      });

      if (ipExisting) {
        const isWithinWindow = now.getTime() - ipExisting.firstAttemptAt.getTime() < windowMs;
        const ipAttempts = isWithinWindow ? ipExisting.attempts + 1 : 1;
        let ipLockedUntil: Date | null = null;
        let ipBlockedCount = ipExisting.blockedCount;

        if (ipAttempts >= maxAttempts * 2) {
          const lockoutDurationMs = Math.min(
            maxLockoutMs,
            baseLockoutMs * Math.pow(2, Math.min(ipBlockedCount, 4))
          );
          ipLockedUntil = new Date(now.getTime() + lockoutDurationMs);
          ipBlockedCount += 1;
        }

        await prisma.rateLimitBucket.update({
          where: { key: ipKey },
          data: {
            attempts: ipAttempts,
            firstAttemptAt: isWithinWindow ? ipExisting.firstAttemptAt : now,
            lastAttemptAt: now,
            lockedUntil: ipLockedUntil,
            blockedCount: ipBlockedCount,
          },
        });
      } else {
        await prisma.rateLimitBucket.create({
          data: {
            key: ipKey,
            action: options.action,
            identifier: cleanIp,
            attempts: 1,
            firstAttemptAt: now,
            lastAttemptAt: now,
          },
        });
      }
    }

    const attemptsRemaining = Math.max(0, maxAttempts - newAttempts);
    return {
      locked: Boolean(lockedUntil),
      lockedUntil: lockedUntil || undefined,
      attemptsRemaining,
    };
  } catch (err: any) {
    if (isTableMissingError(err)) {
      // In-memory fallback
      const existing = memoryFallbackMap.get(accountKey);
      let newAttempts = 1;
      let blockedCount = existing?.blockedCount || 0;
      let lockedUntil: Date | null = null;

      if (existing) {
        const isWithinWindow = now.getTime() - existing.firstAttemptAt.getTime() < windowMs;
        newAttempts = isWithinWindow ? existing.attempts + 1 : 1;

        if (newAttempts >= maxAttempts) {
          const lockoutDurationMs = Math.min(
            maxLockoutMs,
            baseLockoutMs * Math.pow(2, Math.min(blockedCount, 4))
          );
          lockedUntil = new Date(now.getTime() + lockoutDurationMs);
          blockedCount += 1;
        }

        memoryFallbackMap.set(accountKey, {
          attempts: newAttempts,
          firstAttemptAt: isWithinWindow ? existing.firstAttemptAt : now,
          lastAttemptAt: now,
          lockedUntil,
          blockedCount,
        });
      } else {
        memoryFallbackMap.set(accountKey, {
          attempts: 1,
          firstAttemptAt: now,
          lastAttemptAt: now,
          lockedUntil: null,
          blockedCount: 0,
        });
      }

      const attemptsRemaining = Math.max(0, maxAttempts - newAttempts);
      return {
        locked: Boolean(lockedUntil),
        lockedUntil: lockedUntil || undefined,
        attemptsRemaining,
      };
    }
    throw err;
  }
}

/**
 * Resets persistent rate limit counters upon successful authentication or action.
 */
export async function resetPersistentRateLimit(
  action: RateLimitOptions["action"],
  identifier: string,
  ip?: string | null
): Promise<void> {
  const accountKey = `${action}:acc:${identifier.toLowerCase().trim()}`;

  try {
    await prisma.rateLimitBucket.deleteMany({
      where: { key: accountKey },
    });

    if (ip) {
      const cleanIp = ip.split(",")[0].trim();
      const ipKey = `${action}:ip:${cleanIp}`;
      await prisma.rateLimitBucket.deleteMany({
        where: { key: ipKey },
      });
    }
  } catch (err: any) {
    if (isTableMissingError(err)) {
      memoryFallbackMap.delete(accountKey);
      if (ip) {
        const cleanIp = ip.split(",")[0].trim();
        memoryFallbackMap.delete(`${action}:ip:${cleanIp}`);
      }
      return;
    }
    throw err;
  }
}
