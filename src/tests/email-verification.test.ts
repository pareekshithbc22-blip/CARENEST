import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createVerificationToken,
  verifyEmailToken,
  generateEmailLoginExchangeToken,
  verifyEmailLoginExchangeToken,
} from "@/lib/email-verification";

describe("CareNest Email Link Verification & Auto-Login Security", () => {
  const testEmail = "link.verification.test@carenest.health";

  beforeEach(async () => {
    await prisma.emailVerificationToken.deleteMany({
      where: { email: testEmail },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  afterAll(async () => {
    await prisma.emailVerificationToken.deleteMany({
      where: { email: testEmail },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  it("generates a random 64-character token with 24-hour expiration", async () => {
    const token = await createVerificationToken(testEmail);
    expect(token).toHaveLength(64);

    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });
    expect(record).not.toBeNull();
    expect(record?.email).toBe(testEmail);
    // Expires ~24 hours from now
    const hoursRemaining = (record!.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    expect(hoursRemaining).toBeGreaterThan(23);
    expect(hoursRemaining).toBeLessThanOrEqual(24.1);
  });

  it("successfully verifies email and consumes the single-use token", async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Test Verification User",
        role: "FAMILY",
        isEmailVerified: false,
      },
    });

    const token = await createVerificationToken(testEmail);
    const verifyResult = await verifyEmailToken(token);

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.user?.id).toBe(user.id);

    // Verify user in DB is marked verified
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.isEmailVerified).toBe(true);
    expect(updated?.emailVerified).not.toBeNull();

    // Verify single-use: token is deleted
    const tokenRecord = await prisma.emailVerificationToken.findUnique({ where: { token } });
    expect(tokenRecord).toBeNull();

    // Second attempt with same token must fail
    const secondAttempt = await verifyEmailToken(token);
    expect(secondAttempt.success).toBe(false);
    expect(secondAttempt.error).toContain("invalid or has already been used");
  });

  it("rejects expired verification tokens safely", async () => {
    const expiredToken = "expired-token-123456789012345678901234567890123456789012345678901234";
    await prisma.emailVerificationToken.create({
      data: {
        email: testEmail,
        token: expiredToken,
        expiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
      },
    });

    const result = await verifyEmailToken(expiredToken);
    expect(result.success).toBe(false);
    expect(result.error).toContain("expired");
  });

  it("creates and validates secure 5-minute auto-login exchange tokens", () => {
    const userId = "test-user-uuid-1234";
    const exchangeToken = generateEmailLoginExchangeToken(userId, testEmail);

    expect(exchangeToken).toBeTruthy();
    expect(exchangeToken).toContain(".");

    const verified = verifyEmailLoginExchangeToken(exchangeToken);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(userId);
    expect(verified?.email).toBe(testEmail);

    // Tampered token must fail
    const [payload, sig] = exchangeToken.split(".");
    const tampered = `${payload}.${sig.slice(0, -3)}abc`;
    expect(verifyEmailLoginExchangeToken(tampered)).toBeNull();
  });
});
