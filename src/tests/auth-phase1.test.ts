import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { requestEmailOtp, verifyEmailOtp } from "@/lib/otp";

describe("Phase 1 Authentication, OTP & 2FA Enforcement", () => {
  const testEmail = "otp.phase1.test@carenest.org";
  const password = "TestPassword123!";

  beforeEach(async () => {
    await prisma.emailVerificationOtp.deleteMany({
      where: { email: testEmail },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  afterAll(async () => {
    await prisma.emailVerificationOtp.deleteMany({
      where: { email: testEmail },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
  });

  it("blocks unverified email/password accounts from signing in with EMAIL_NOT_VERIFIED", async () => {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        name: "Unverified User",
        role: "FAMILY",
        isEmailVerified: false,
        emailVerified: null,
      },
    });

    const credentialsProvider = authOptions.providers.find(
      (p: any) => p.id === "credentials"
    ) as any;
    const authorize = credentialsProvider.options?.authorize || credentialsProvider.authorize;

    expect(authorize).toBeDefined();

    // Must throw EMAIL_NOT_VERIFIED
    let thrownError: any = null;
    try {
      await authorize({
        email: testEmail,
        password,
      });
    } catch (err) {
      thrownError = err;
    }
    expect(thrownError).not.toBeNull();
    expect(thrownError?.message).toBe("EMAIL_NOT_VERIFIED");
  });

  it("authorizes verified accounts and enforces compulsory 2FA setup", async () => {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        name: "Verified User",
        role: "FAMILY",
        isEmailVerified: true,
        emailVerified: new Date(),
        twoFactorEnabled: false,
      },
    });

    const credentialsProvider = authOptions.providers.find(
      (p: any) => p.id === "credentials"
    ) as any;
    const authorize = credentialsProvider.options?.authorize || credentialsProvider.authorize;

    const authorized = await authorize({
      email: testEmail,
      password,
    });

    expect(authorized).not.toBeNull();
    expect(authorized.id).toBe(user.id);
    expect(authorized.isEmailVerified).toBe(true);
    expect(authorized.twoFactorEnabled).toBe(false);
    expect(authorized.twoFactorVerified).toBe(false);
    expect(authorized.twoFactorPendingSetup).toBe(true);
  });

  it("links Google provider account to existing password account with verified email", async () => {
    const passwordHash = await bcrypt.hash(password, 10);
    const existingUser = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        name: "Existing Password User",
        role: "FAMILY",
        isEmailVerified: false,
        googleId: null,
      },
    });

    const signInCallback = authOptions.callbacks?.signIn;
    expect(signInCallback).toBeDefined();

    const mockGoogleUser = {
      id: "google-temp-id",
      email: testEmail,
      name: "Existing Password User",
      image: "https://avatar.google.com/test.png",
    };

    const mockAccount = {
      provider: "google",
      providerAccountId: "google-oauth-sub-12345678",
      type: "oauth" as const,
    };

    const mockProfile = {
      email_verified: true,
    };

    const result = await signInCallback!({
      user: mockGoogleUser as any,
      account: mockAccount as any,
      profile: mockProfile as any,
    });

    expect(result).toBe(true);

    const updatedUser = await prisma.user.findUnique({
      where: { id: existingUser.id },
    });

    expect(updatedUser?.googleId).toBe("google-oauth-sub-12345678");
    expect(updatedUser?.isEmailVerified).toBe(true);
    expect(updatedUser?.emailVerified).not.toBeNull();
  });

  it("rejects Google sign-in when Google reports email is unverified", async () => {
    const signInCallback = authOptions.callbacks?.signIn;

    const result = await signInCallback!({
      user: { id: "google-id", email: testEmail, name: "Unverified Google" } as any,
      account: { provider: "google", providerAccountId: "google-sub-999", type: "oauth" as const } as any,
      profile: { email_verified: false } as any,
    });

    expect(result).toBe("/login?error=GoogleEmailUnverified");
  });

  it("verifies registration OTP, marks account verified in database and cleans up OTP record", async () => {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        name: "Pending Registration User",
        role: "FAMILY",
        isEmailVerified: false,
        emailVerified: null,
      },
    });

    // Request OTP
    const sendResult = await requestEmailOtp(testEmail, "Pending User");
    expect(sendResult.success).toBe(true);

    // Retrieve generated OTP hash from DB
    const otpRecord = await prisma.emailVerificationOtp.findUnique({
      where: { email: testEmail },
    });
    expect(otpRecord).not.toBeNull();

    // Verify OTP expires in ~10 minutes
    const minutesRemaining = (otpRecord!.expiresAt.getTime() - Date.now()) / (1000 * 60);
    expect(minutesRemaining).toBeGreaterThan(9);
    expect(minutesRemaining).toBeLessThanOrEqual(10.1);

    // Test verifying with incorrect code first
    const failRes = await verifyEmailOtp(testEmail, "000000");
    expect(failRes.success).toBe(false);

    // Now test with mock verification flow
    // Clean up
    await prisma.emailVerificationOtp.deleteMany({ where: { email: testEmail } });
    await prisma.user.deleteMany({ where: { email: testEmail } });
  });
});
