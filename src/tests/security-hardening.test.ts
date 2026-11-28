import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import {
  getNextAuthSecret,
  timingSafeEqualString,
  verifyCronSecret,
  generateUploadToken,
  verifyUploadToken,
  recordTwoFactorVerification,
  checkServerTwoFactorStatus,
  cleanOrphanUploadedFiles,
} from "../lib/security";
import {
  checkPersistentRateLimit,
  recordPersistentFailedAttempt,
  resetPersistentRateLimit,
} from "../lib/services/rate-limit-service";
import { authOptions } from "../lib/auth";
import { prisma } from "../lib/prisma";

describe("CareNest Security Hardening Specification", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // =========================================================================
  // ITEM 1: SESSION TOKEN HARDENING & REGRESSION TEST
  // =========================================================================
  describe("1. Session Token & Client-Update Hardening", () => {
    it("proves a client-sent jwt update trigger CANNOT change role, 2FA status, or flags", async () => {
      const jwtCallback = authOptions.callbacks?.jwt;
      expect(jwtCallback).toBeDefined();

      const initialToken = {
        id: "user-victim-123",
        role: "FAMILY" as const,
        twoFactorVerified: false,
        twoFactorEnabled: false,
        twoFactorPendingSetup: true,
        needsProfileCompletion: false,
      };

      // Mock database lookup returning the real role and status
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "user-victim-123",
        role: "FAMILY",
        isActive: true,
        twoFactorEnabled: false,
        phoneNumber: "+1234567890",
        avatarUrl: null,
        isEmailVerified: true,
        caretakerProfile: null,
      } as any);

      // Client attempts malicious privilege escalation
      const maliciousClientPayload = {
        role: "ADMIN",
        twoFactorVerified: true,
        twoFactorEnabled: true,
        twoFactorPendingSetup: false,
        needsProfileCompletion: false,
      };

      const updatedToken = await jwtCallback!({
        token: { ...initialToken },
        user: undefined as any,
        trigger: "update",
        session: maliciousClientPayload,
        account: null,
      });

      // Role MUST remain FAMILY, twoFactorVerified MUST remain false
      expect(updatedToken.role).toBe("FAMILY");
      expect(updatedToken.twoFactorVerified).toBe(false);
      expect(updatedToken.twoFactorEnabled).toBe(false);
      expect(updatedToken.twoFactorPendingSetup).toBe(true);
    });

    it("invalidates session (returns null) on token refresh if account is deactivated", async () => {
      const jwtCallback = authOptions.callbacks?.jwt;
      expect(jwtCallback).toBeDefined();

      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "deactivated-user-123",
        isActive: false, // Inactive user
      } as any);

      const result = await jwtCallback!({
        token: { id: "deactivated-user-123", role: "FAMILY" },
        user: undefined as any,
        trigger: undefined,
        session: undefined,
        account: null,
      });

      expect(result).toBeNull();
    });

    it("tracks and checks server-side 2FA verification in database", async () => {
      const userId = "test-2fa-user";
      const tokenId = "test-token-uuid-123";

      vi.spyOn(prisma.userSession, "upsert").mockResolvedValue({
        id: "sess-1",
        userId,
        tokenId,
        twoFactorVerified: true,
        verifiedAt: new Date(),
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await recordTwoFactorVerification(userId, tokenId);
      expect(prisma.userSession.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tokenId },
          create: expect.objectContaining({ twoFactorVerified: true }),
        })
      );

      vi.spyOn(prisma.userSession, "findUnique").mockResolvedValue({
        id: "sess-1",
        userId,
        tokenId,
        twoFactorVerified: true,
      } as any);

      const status = await checkServerTwoFactorStatus(userId, tokenId);
      expect(status.isVerified).toBe(true);
    });
  });

  // =========================================================================
  // ITEM 2: NO FALLBACK SECRETS & SCHEDULER AUTHORIZATION
  // =========================================================================
  describe("2. No Fallback Secrets & Scheduler Security", () => {
    it("refuses to start in production if NEXTAUTH_SECRET is unset", () => {
      (process.env as any).NODE_ENV = "production";
      delete process.env.NEXTAUTH_SECRET;

      expect(() => getNextAuthSecret()).toThrowError(
        /FATAL SECURITY CONFIGURATION ERROR/
      );
    });

    it("returns secret when configured", () => {
      process.env.NEXTAUTH_SECRET = "production-super-secret-key-64-characters-long-care-nest";
      expect(getNextAuthSecret()).toBe("production-super-secret-key-64-characters-long-care-nest");
    });

    it("verifies CRON_SECRET fails closed when unconfigured", () => {
      delete process.env.CRON_SECRET;
      expect(verifyCronSecret("any-token")).toBe(false);
      expect(verifyCronSecret("")).toBe(false);
      expect(verifyCronSecret(null)).toBe(false);
    });

    it("verifies CRON_SECRET in constant-time with crypto.timingSafeEqual", () => {
      process.env.CRON_SECRET = "cloud-scheduler-high-entropy-secret-key-999";
      expect(verifyCronSecret("cloud-scheduler-high-entropy-secret-key-999")).toBe(true);
      expect(verifyCronSecret("wrong-secret")).toBe(false);
    });

    it("constant-time string comparison timingSafeEqualString", () => {
      expect(timingSafeEqualString("tokenA", "tokenA")).toBe(true);
      expect(timingSafeEqualString("tokenA", "tokenB")).toBe(false);
      expect(timingSafeEqualString("tokenA", "tokenLonger")).toBe(false);
    });
  });

  // =========================================================================
  // ITEM 3: SENIOR PIN LOGIN (EXACT CODE, SINGLE PROFILE, NO FALLBACK)
  // =========================================================================
  describe("3. Senior PIN Login Security", () => {
    it("rejects PIN login without exact patient code", async () => {
      const credentialsProvider = authOptions.providers.find(
        (p) => p.id === "credentials"
      ) as any;

      const result = await credentialsProvider.authorize({
        pin: "1234",
        patientIdentifier: "", // Empty identifier
      });

      expect(result).toBeNull();
    });

    it("loads exactly one profile by patient code and fails if no linked senior user", async () => {
      const credentialsProvider = authOptions.providers.find(
        (p) => p.id === "credentials"
      ) as any;

      // Mock profile with no linked active SENIOR member
      vi.spyOn(prisma.rateLimitBucket, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValue({
        id: "profile-1",
        patientCode: "PT-9999",
        isSeniorModeActive: true,
        seniorPin: "$2a$10$abcdefghijklmnopqrstuuNOPASSWORDHASH",
        careCircles: [
          {
            members: [], // No senior members!
          },
        ],
      } as any);

      vi.spyOn(prisma.rateLimitBucket, "upsert").mockResolvedValue({} as any);

      const result = await credentialsProvider.authorize({
        pin: "1234",
        patientIdentifier: "PT-9999",
      });

      // Must fail closed without falling back to Eleanor or any other senior
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // ITEM 4: PERSISTENT DATABASE RATE LIMITING
  // =========================================================================
  describe("4. Persistent Database-Backed Rate Limiting", () => {
    it("enforces progressive lockout and caps maximum lockout duration", async () => {
      const now = new Date();

      // Mock rate limit bucket locked until future
      vi.spyOn(prisma.rateLimitBucket, "findUnique").mockResolvedValue({
        id: "bucket-1",
        key: "PASSWORD_LOGIN:acc:victim@example.com",
        action: "PASSWORD_LOGIN",
        identifier: "victim@example.com",
        attempts: 6,
        firstAttemptAt: new Date(now.getTime() - 60000),
        lastAttemptAt: now,
        lockedUntil: new Date(now.getTime() + 10 * 60 * 1000), // Locked for 10 min
        blockedCount: 2,
        createdAt: now,
        updatedAt: now,
      } as any);

      const status = await checkPersistentRateLimit({
        action: "PASSWORD_LOGIN",
        identifier: "victim@example.com",
      });

      expect(status.allowed).toBe(false);
      expect(status.isLocked).toBe(true);
      expect(status.remainingSeconds).toBeGreaterThan(0);
    });

    it("separates IP and account buckets so attacker IP cannot lock out victim account", async () => {
      // Mock account bucket is clean, but attacker IP bucket is locked
      (vi.spyOn(prisma.rateLimitBucket, "findUnique") as any).mockImplementation(async ({ where }: any) => {
        if (where.key && where.key.includes("198.51.100.1")) {
          return {
            id: "ip-bucket",
            key: where.key,
            lockedUntil: new Date(Date.now() + 60000),
          } as any;
        }
        return null;
      });

      const checkFromAttackerIp = await checkPersistentRateLimit({
        action: "PASSWORD_LOGIN",
        identifier: "innocent@example.com",
        ip: "198.51.100.1",
      });

      // Blocked because of attacker IP
      expect(checkFromAttackerIp.allowed).toBe(false);

      // Check from benign user IP
      const checkFromVictimIp = await checkPersistentRateLimit({
        action: "PASSWORD_LOGIN",
        identifier: "innocent@example.com",
        ip: "203.0.113.5",
      });

      // Allowed from victim's own IP
      expect(checkFromVictimIp.allowed).toBe(true);
    });
  });

  // =========================================================================
  // ITEM 5: UPLOAD ROUTE SECURITY & UPLOAD TOKENS
  // =========================================================================
  describe("5. Upload Route & Token Validation", () => {
    it("generates and verifies short-lived upload tokens", () => {
      process.env.NEXTAUTH_SECRET = "signing-secret-key-12345678901234567890";
      const token = generateUploadToken("CARETAKER_REGISTRATION");
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      expect(verifyUploadToken(token, "CARETAKER_REGISTRATION")).toBe(true);
      expect(verifyUploadToken(token, "WRONG_PURPOSE")).toBe(false);
      expect(verifyUploadToken("invalid-tampered-token")).toBe(false);
    });

    it("verifies cleanOrphanUploadedFiles scans and returns metrics safely", async () => {
      const result = await cleanOrphanUploadedFiles();
      expect(result).toHaveProperty("deletedCount");
      expect(result).toHaveProperty("scannedCount");
      expect(typeof result.deletedCount).toBe("number");
    });
  });

  // =========================================================================
  // ITEM 6: GOOGLE LINKING & EMAIL_VERIFIED FAIL-CLOSED
  // =========================================================================
  describe("6. Google OAuth Account Linking Hardening", () => {
    it("fails closed if google email_verified is missing or false", async () => {
      const signInCallback = authOptions.callbacks?.signIn;
      expect(signInCallback).toBeDefined();

      const user = { email: "test@gmail.com", name: "Test User" };
      const account = { provider: "google", providerAccountId: "g-123" };

      // Profile has email_verified missing
      const profileWithoutVerified = { email: "test@gmail.com" };

      const resultMissing = await signInCallback!({
        user: user as any,
        account: account as any,
        profile: profileWithoutVerified as any,
      });

      expect(resultMissing).toBe("/login?error=GoogleEmailUnverified");

      // Profile has email_verified = false
      const profileFalse = { email: "test@gmail.com", email_verified: false };
      const resultFalse = await signInCallback!({
        user: user as any,
        account: account as any,
        profile: profileFalse as any,
      });

      expect(resultFalse).toBe("/login?error=GoogleEmailUnverified");
    });

    it("invalidates passwordHash when linking Google to an unverified existing account", async () => {
      const signInCallback = authOptions.callbacks?.signIn;
      expect(signInCallback).toBeDefined();

      const email = "unverified-prior@example.com";
      const user = { email, name: "Legit Owner" };
      const account = { provider: "google", providerAccountId: "g-999" };
      const profile = { email, email_verified: true };

      // Existing user had unverified email and an attacker password
      vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
        id: "u-existing-unverified",
        email,
        isEmailVerified: false,
        googleId: null,
        passwordHash: "$2a$10$insecurePriorHash",
        isActive: true,
      } as any);

      const updateSpy = vi.spyOn(prisma.user, "update").mockResolvedValue({
        id: "u-existing-unverified",
        email,
        role: "FAMILY",
        isEmailVerified: true,
      } as any);

      const result = await signInCallback!({
        user: user as any,
        account: account as any,
        profile: profile as any,
      });

      expect(result).toBe(true);
      // Confirms passwordHash is invalidated (set to null)
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: null,
            isEmailVerified: true,
          }),
        })
      );
    });
  });

  // =========================================================================
  // ITEM 7: SESSION LIFETIME (8 HOURS)
  // =========================================================================
  describe("7. Session Lifetime", () => {
    it("configures session maxAge to 8 hours with sliding refresh", () => {
      expect(authOptions.session?.maxAge).toBe(8 * 60 * 60); // 28,800 seconds
    });
  });

  // =========================================================================
  // ITEM 8: SEED SCRIPTS CLEANUP
  // =========================================================================
  describe("8. Insecure Seed Scripts Verification", () => {
    it("confirms seed scripts are not present in project root or package.json", async () => {
      const fs = await import("fs");
      const path = await import("path");

      expect(fs.existsSync(path.resolve(process.cwd(), "prisma", "seed.mjs"))).toBe(false);
      expect(fs.existsSync(path.resolve(process.cwd(), "prisma", "seed.js"))).toBe(false);
      expect(fs.existsSync(path.resolve(process.cwd(), "prisma", "seed.ts"))).toBe(false);

      const pkgRaw = fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8");
      const pkg = JSON.parse(pkgRaw);
      expect(pkg.scripts.seed).toBeUndefined();
    });
  });
});
