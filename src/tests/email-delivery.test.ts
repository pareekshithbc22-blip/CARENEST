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
    expect(result.messageId).toBeDefined();
  });
});
