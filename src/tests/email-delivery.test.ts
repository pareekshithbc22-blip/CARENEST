import { describe, it, expect } from "vitest";
import { sendEmail } from "@/lib/email/service";
import { requestEmailOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";

describe("CareNest Real Email Delivery & Error Transparency", () => {
  it("rejects claiming success when email provider credentials are not configured outside test mode", async () => {
    // Temporarily simulate non-test environment with no credentials
    const originalEnv = process.env.NODE_ENV;
    const originalVitest = process.env.VITEST;
    const originalResend = process.env.RESEND_API_KEY;
    const originalSmtp = process.env.SMTP_USER;

    try {
      (process.env as Record<string, string | undefined>)["NODE_ENV"] = "production";
      delete process.env.VITEST;
      delete process.env.RESEND_API_KEY;
      delete process.env.SMTP_USER;

      const result = await sendEmail({
        to: "recipient@gmail.com",
        subject: "Verification Test",
        html: "<p>Test</p>",
        type: "OTP_VERIFICATION",
      });

      // Must NEVER pretend an email was sent if provider is unconfigured!
      expect(result.success).toBe(false);
      expect(result.provider).toBe("NONE");
      expect(result.diagnosticCode).toBe("EMAIL_NOT_CONFIGURED");
      expect(result.error).toContain("Email delivery service is not configured");
    } finally {
      (process.env as Record<string, string | undefined>)["NODE_ENV"] = originalEnv;
      if (originalVitest) process.env.VITEST = originalVitest;
      if (originalResend) process.env.RESEND_API_KEY = originalResend;
      if (originalSmtp) process.env.SMTP_USER = originalSmtp;
    }
  });

  it("cleans up database OTP records if email dispatch fails so user is not blocked", async () => {
    const unconfiguredEmail = "unconfigured.test@example.com";

    // Clean up
    await prisma.emailVerificationOtp.deleteMany({
      where: { email: unconfiguredEmail },
    });

    const originalEnv = process.env.NODE_ENV;
    const originalVitest = process.env.VITEST;
    const originalResend = process.env.RESEND_API_KEY;
    const originalSmtp = process.env.SMTP_USER;

    try {
      (process.env as Record<string, string | undefined>)["NODE_ENV"] = "production";
      delete process.env.VITEST;
      delete process.env.RESEND_API_KEY;
      delete process.env.SMTP_USER;

      const reqResult = await requestEmailOtp(unconfiguredEmail, "Tester");
      expect(reqResult.success).toBe(false);
      expect(reqResult.error).toContain("Email delivery service is not configured");

      // Verify OTP was NOT left stranded in database
      const strandedOtp = await prisma.emailVerificationOtp.findUnique({
        where: { email: unconfiguredEmail },
      });
      expect(strandedOtp).toBeNull();
    } finally {
      (process.env as Record<string, string | undefined>)["NODE_ENV"] = originalEnv;
      if (originalVitest) process.env.VITEST = originalVitest;
      if (originalResend) process.env.RESEND_API_KEY = originalResend;
      if (originalSmtp) process.env.SMTP_USER = originalSmtp;

      await prisma.emailVerificationOtp.deleteMany({
        where: { email: unconfiguredEmail },
      });
    }
  });

  it("handles offline test mock delivery safely during test runs", async () => {
    const result = await sendEmail({
      to: "offline.tester@carenest.health",
      subject: "Test Dispatch",
      html: "<p>Sample</p>",
      type: "OTP_VERIFICATION",
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe("LOCAL_FALLBACK");
    expect(result.isSimulated).toBe(true);
    expect(result.diagnosticCode).toBe("TEST_MOCK_ACCEPTED");
    expect(result.messageId).toBeDefined();
  });

  it("recognizes Gmail SMTP configuration and handles authentication errors accurately", async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalVitest = process.env.VITEST;
    const originalHost = process.env.SMTP_HOST;
    const originalUser = process.env.SMTP_USER;
    const originalPass = process.env.SMTP_PASS;
    const originalFrom = process.env.SMTP_FROM;

    try {
      (process.env as Record<string, string | undefined>)["NODE_ENV"] = "production";
      delete process.env.VITEST;

      process.env.SMTP_HOST = "smtp.gmail.com";
      process.env.SMTP_PORT = "465";
      process.env.SMTP_USER = "mock.caregiver@gmail.com";
      process.env.SMTP_PASS = "mock app password test";
      process.env.SMTP_FROM = "CareNest Health <mock.caregiver@gmail.com>";

      const result = await sendEmail({
        to: "recipient@gmail.com",
        subject: "SMTP Test",
        html: "<p>Sample</p>",
        type: "OTP_VERIFICATION",
      });

      // Provider was recognized as SMTP (attempted real delivery)
      expect(result.provider).toBe("SMTP");
      expect(result.diagnosticCode).toBe("SMTP_AUTH_FAILED");
      // Since mock password is fake, it will fail authentication (not unconfigured)
      expect(result.success).toBe(false);
      expect(result.error).toContain("authentication failed");
    } finally {
      (process.env as Record<string, string | undefined>)["NODE_ENV"] = originalEnv;
      if (originalVitest) process.env.VITEST = originalVitest;
      if (originalHost) process.env.SMTP_HOST = originalHost;
      else delete process.env.SMTP_HOST;
      if (originalUser) process.env.SMTP_USER = originalUser;
      else delete process.env.SMTP_USER;
      if (originalPass) process.env.SMTP_PASS = originalPass;
      else delete process.env.SMTP_PASS;
      if (originalFrom) process.env.SMTP_FROM = originalFrom;
      else delete process.env.SMTP_FROM;
    }
  });

  it("identifies specific missing credential when only one SMTP parameter is provided", async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalVitest = process.env.VITEST;
    const originalUser = process.env.SMTP_USER;
    const originalPass = process.env.SMTP_PASS;

    try {
      (process.env as Record<string, string | undefined>)["NODE_ENV"] = "production";
      delete process.env.VITEST;

      // Case 1: USER provided, PASS missing
      process.env.SMTP_USER = "tester@gmail.com";
      delete process.env.SMTP_PASS;
      const res1 = await sendEmail({
        to: "recipient@gmail.com",
        subject: "Test",
        html: "<p>Test</p>",
      });
      expect(res1.success).toBe(false);
      expect(res1.diagnosticCode).toBe("EMAIL_NOT_CONFIGURED");
      expect(res1.error).toContain("SMTP_PASS");

      // Case 2: PASS provided, USER missing
      delete process.env.SMTP_USER;
      process.env.SMTP_PASS = "sample-pass";
      const res2 = await sendEmail({
        to: "recipient@gmail.com",
        subject: "Test",
        html: "<p>Test</p>",
      });
      expect(res2.success).toBe(false);
      expect(res2.diagnosticCode).toBe("EMAIL_NOT_CONFIGURED");
      expect(res2.error).toContain("SMTP_USER");
    } finally {
      (process.env as Record<string, string | undefined>)["NODE_ENV"] = originalEnv;
      if (originalVitest) process.env.VITEST = originalVitest;
      if (originalUser) process.env.SMTP_USER = originalUser;
      else delete process.env.SMTP_USER;
      if (originalPass) process.env.SMTP_PASS = originalPass;
      else delete process.env.SMTP_PASS;
    }
  });
});
