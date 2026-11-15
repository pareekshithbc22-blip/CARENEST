import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  generateSecureOtp,
  hashOtp,
  generateVerificationToken,
  verifyVerificationToken,
  requestEmailOtp,
  verifyEmailOtp,
} from "@/lib/otp";
import { RegisterSchema } from "@/lib/validations";

describe("CareNest Email OTP Verification & Security", () => {
  const testEmail = "test.coordinator@carenest.health";

  beforeEach(async () => {
    // Clean up any test OTP records
    await prisma.emailVerificationOtp.deleteMany({
      where: { email: { in: [testEmail, "cooldown@carenest.health", "bruteforce@carenest.health"] } },
    });
  });

  afterAll(async () => {
    await prisma.emailVerificationOtp.deleteMany({
      where: { email: { in: [testEmail, "cooldown@carenest.health", "bruteforce@carenest.health"] } },
    });
  });

  it("generates a cryptographically secure 6-digit numeric OTP", () => {
    for (let i = 0; i < 20; i++) {
      const otp = generateSecureOtp();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it("produces deterministic, salted SHA-256 hashes", () => {
    const otp = "842915";
    const hash1 = hashOtp(otp);
    const hash2 = hashOtp(otp);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string

    // Different OTP produces different hash
    const hash3 = hashOtp("842916");
    expect(hash1).not.toBe(hash3);
  });

  it("signs and validates tamper-resistant verification tokens", () => {
    const email = "verified.family@example.com";
    const token = generateVerificationToken(email);

    expect(token).toBeTruthy();
    expect(token).toContain(".");

    // Valid verification
    expect(verifyVerificationToken(token, email)).toBe(true);
    expect(verifyVerificationToken(token, "VERIFIED.FAMILY@EXAMPLE.COM")).toBe(true);

    // Mismatched email should fail
    expect(verifyVerificationToken(token, "other.user@example.com")).toBe(false);

    // Tampered token signature should fail
    const [payload, sig] = token.split(".");
    const tamperedToken = `${payload}.${sig.slice(0, -2)}xx`;
    expect(verifyVerificationToken(tamperedToken, email)).toBe(false);

    // Garbage token should fail safely
    expect(verifyVerificationToken("invalid-token-string", email)).toBe(false);
  });

  it("enforces 60-second cooldown on consecutive OTP requests", async () => {
    const email = "cooldown@carenest.health";

    // 1st request: should succeed
    const firstReq = await requestEmailOtp(email, "Family Coordinator");
    expect(firstReq.success).toBe(true);
    expect(firstReq.cooldownSeconds).toBe(60);

    // 2nd request immediately: should be blocked by cooldown
    const secondReq = await requestEmailOtp(email, "Family Coordinator");
    expect(secondReq.success).toBe(false);
    expect(secondReq.error).toContain("Please wait");
    expect(secondReq.cooldownSeconds).toBeGreaterThan(0);
    expect(secondReq.cooldownSeconds).toBeLessThanOrEqual(60);
  });

  it("rejects invalid OTP formats and handles non-existent records", async () => {
    const nonExistentEmail = "nobody@carenest.health";

    // Invalid format (less than 6 digits)
    const shortRes = await verifyEmailOtp(nonExistentEmail, "123");
    expect(shortRes.success).toBe(false);
    expect(shortRes.error).toContain("6 numeric digits");

    // Invalid format (letters)
    const letterRes = await verifyEmailOtp(nonExistentEmail, "12345a");
    expect(letterRes.success).toBe(false);
    expect(letterRes.error).toContain("6 numeric digits");

    // Valid format but no record exists
    const missingRes = await verifyEmailOtp(nonExistentEmail, "123456");
    expect(missingRes.success).toBe(false);
    expect(missingRes.error).toContain("No active verification code found");
  });

  it("protects against brute-force attacks by revoking code after 5 failed attempts", async () => {
    const email = "bruteforce@carenest.health";
    const rawOtp = "654321";
    const hashedOtp = hashOtp(rawOtp);

    // Seed directly with 5-minute expiry
    await prisma.emailVerificationOtp.create({
      data: {
        email,
        hashedOtp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 0,
      },
    });

    // 4 wrong attempts
    for (let i = 1; i <= 4; i++) {
      const res = await verifyEmailOtp(email, "000000");
      expect(res.success).toBe(false);
      expect(res.attemptsRemaining).toBe(5 - i);
    }

    // 5th wrong attempt should lock out and delete the OTP
    const lockoutRes = await verifyEmailOtp(email, "000000");
    expect(lockoutRes.success).toBe(false);
    expect(lockoutRes.error).toContain("Too many failed attempts");

    // Verify record was deleted from database
    const record = await prisma.emailVerificationOtp.findUnique({ where: { email } });
    expect(record).toBeNull();
  });

  it("successfully verifies correct OTP, deletes it immediately (single-use), and issues signed token", async () => {
    const email = testEmail;
    const correctOtp = "918273";
    const hashedOtp = hashOtp(correctOtp);

    // Seed OTP
    await prisma.emailVerificationOtp.create({
      data: {
        email,
        hashedOtp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 0,
      },
    });

    // Verify with correct OTP
    const res = await verifyEmailOtp(email, correctOtp);
    expect(res.success).toBe(true);
    expect(res.verificationToken).toBeTruthy();

    // Verify the verification token matches the verified email
    const tokenValid = verifyVerificationToken(res.verificationToken!, email);
    expect(tokenValid).toBe(true);

    // Ensure OTP record was deleted from DB (cannot be reused)
    const record = await prisma.emailVerificationOtp.findUnique({ where: { email } });
    expect(record).toBeNull();

    // Re-attempting verification with same OTP must fail
    const reuseRes = await verifyEmailOtp(email, correctOtp);
    expect(reuseRes.success).toBe(false);
    expect(reuseRes.error).toContain("No active verification code found");
  });

  it("validates mandatory phone number format in registration schema", () => {
    const base = {
      name: "Amit Kumar",
      email: "amit.kumar@example.com",
      password: "SuperSecretPassword123!",
      role: "FAMILY" as const,
    };

    // Valid formats
    expect(RegisterSchema.safeParse({ ...base, phoneNumber: "+1 (555) 234-5678" }).success).toBe(true);
    expect(RegisterSchema.safeParse({ ...base, phoneNumber: "+919876543210" }).success).toBe(true);
    expect(RegisterSchema.safeParse({ ...base, phoneNumber: "9876543210" }).success).toBe(true);
    expect(RegisterSchema.safeParse({ ...base, phoneNumber: "(555) 123-4567" }).success).toBe(true);

    // Invalid: missing / undefined
    expect(RegisterSchema.safeParse({ ...base }).success).toBe(false);

    // Invalid: empty string
    expect(RegisterSchema.safeParse({ ...base, phoneNumber: "" }).success).toBe(false);

    // Invalid: too short (< 7 characters)
    expect(RegisterSchema.safeParse({ ...base, phoneNumber: "12345" }).success).toBe(false);

    // Invalid: letters / malicious characters
    expect(RegisterSchema.safeParse({ ...base, phoneNumber: "+1 (555) CALL-ME" }).success).toBe(false);
    expect(RegisterSchema.safeParse({ ...base, phoneNumber: "<script>alert(1)</script>" }).success).toBe(false);
  });
});
