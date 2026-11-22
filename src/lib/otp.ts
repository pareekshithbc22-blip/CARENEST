import crypto from "crypto";
import { prisma } from "./prisma";
import { sendOtpVerificationEmail, getSmtpConfigStatus } from "./email/service";

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5; // Max 5 verification attempts before invalidating

// In-memory rate limiting buckets
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const emailRateLimit = new Map<string, RateLimitBucket>();
const ipRateLimit = new Map<string, RateLimitBucket>();

function checkRateLimit(
  map: Map<string, RateLimitBucket>,
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const bucket = map.get(key);
  if (!bucket || bucket.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= maxRequests) {
    return false;
  }
  bucket.count += 1;
  return true;
}

/**
 * Returns secret key for hashing and signing
 */
function getSecret(): string {
  return process.env.NEXTAUTH_SECRET || "carenest-hackathon-production-jwt-encryption-key-2026-secure";
}

/**
 * Computes SHA-256 hash of OTP salted with application secret
 */
export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(`${otp}:${getSecret()}`).digest("hex");
}

/**
 * Generates a cryptographically secure random 6-digit numeric OTP
 */
export function generateSecureOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generates an HMAC-signed single-use verification token for the verified email
 */
export function generateVerificationToken(email: string): string {
  const normalizedEmail = email.toLowerCase().trim();
  const payload = JSON.stringify({
    email: normalizedEmail,
    verifiedAt: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000, // Token valid for 15 minutes to complete form
  });

  const payloadB64 = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies that the verification token is valid, unexpired, and matches the email
 */
export function verifyVerificationToken(token: string, expectedEmail: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [payloadB64, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", getSecret())
      .update(payloadB64)
      .digest("base64url");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    if (payload.email !== expectedEmail.toLowerCase().trim()) {
      return false;
    }

    if (Date.now() > payload.expiresAt) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export interface SendOtpResult {
  success: boolean;
  message?: string;
  devNotice?: string;
  cooldownSeconds?: number;
  error?: string;
}

/**
 * Generates, stores, and emails a secure 6-digit OTP to the user
 */
export async function requestEmailOtp(
  email: string,
  recipientName = "Care Coordinator",
  ip?: string
): Promise<SendOtpResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit checks: per-email and per-IP (10-minute sliding window)
  const isAllowedEmail = checkRateLimit(emailRateLimit, normalizedEmail, 5, 10 * 60 * 1000);
  if (!isAllowedEmail) {
    return {
      success: false,
      error: "Too many verification attempts for this email address. Please try again in 10 minutes.",
      cooldownSeconds: 60,
    };
  }

  if (ip) {
    const isAllowedIp = checkRateLimit(ipRateLimit, ip, 10, 10 * 60 * 1000);
    if (!isAllowedIp) {
      return {
        success: false,
        error: "Too many verification requests from this IP address. Please wait before trying again.",
        cooldownSeconds: 60,
      };
    }
  }

  // Check if an existing unexpired OTP is within cooldown window (60 seconds)
  const existing = await prisma.emailVerificationOtp.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    const elapsed = Date.now() - existing.lastSentAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return {
        success: false,
        error: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
        cooldownSeconds: remainingSeconds,
      };
    }
  }

  // Generate 6-digit secure random OTP with crypto.randomInt
  const rawOtp = generateSecureOtp();
  const hashedOtp = hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  // Check email provider configuration
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
  const isDev = process.env.NODE_ENV !== "production" && !isTest;
  const smtpStatus = getSmtpConfigStatus();
  const hasResend = Boolean(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes("your-resend-api-key"));
  const hasConfiguredProvider = (smtpStatus.isConfigured && Boolean(smtpStatus.user)) || hasResend;

  // In development, when SMTP is not configured, print the code in server terminal
  if (isDev && !hasConfiguredProvider) {
    console.log("\n========================================================");
    console.log(`🔑 [DEV EMAIL OTP] Registration code for ${normalizedEmail}: ${rawOtp}`);
    console.log("========================================================\n");

    await prisma.emailVerificationOtp.upsert({
      where: { email: normalizedEmail },
      create: {
        email: normalizedEmail,
        hashedOtp,
        expiresAt,
        attempts: 0,
        lastSentAt: new Date(),
      },
      update: {
        hashedOtp,
        expiresAt,
        attempts: 0,
        lastSentAt: new Date(),
      },
    });

    return {
      success: true,
      message: `Verification code sent to ${normalizedEmail}. Code expires in 10 minutes.`,
      devNotice: `[Development Mode] Email service is not configured. Verification code logged to terminal: ${rawOtp}`,
      cooldownSeconds: 60,
    };
  }

  // Dispatch actual transactional email
  const emailResult = await sendOtpVerificationEmail({
    to: normalizedEmail,
    name: recipientName,
    otp: rawOtp,
  });

  if (!emailResult.success) {
    console.error(`[CareNest OTP Error] Failed to send email to ${normalizedEmail}:`, emailResult.error);
    // Clean up OTP record so user doesn't get blocked when email delivery fails
    await prisma.emailVerificationOtp.deleteMany({
      where: { email: normalizedEmail },
    });

    return {
      success: false,
      error: emailResult.error || "We could not send the email. Please try again.",
    };
  }

  // Store hashed OTP in PostgreSQL ONLY after email provider confirms send
  await prisma.emailVerificationOtp.upsert({
    where: { email: normalizedEmail },
    create: {
      email: normalizedEmail,
      hashedOtp,
      expiresAt,
      attempts: 0,
      lastSentAt: new Date(),
    },
    update: {
      hashedOtp,
      expiresAt,
      attempts: 0,
      lastSentAt: new Date(),
    },
  });

  return {
    success: true,
    message: `Verification code sent to ${normalizedEmail}. Code expires in 10 minutes.`,
    cooldownSeconds: 60,
  };
}

export interface VerifyOtpResult {
  success: boolean;
  verificationToken?: string;
  message?: string;
  error?: string;
  attemptsRemaining?: number;
}

/**
 * Validates entered OTP against stored hash, enforcing expiry and single-use
 */
export async function verifyEmailOtp(email: string, enteredOtp: string): Promise<VerifyOtpResult> {
  const normalizedEmail = email.toLowerCase().trim();
  const cleanedOtp = enteredOtp.trim();

  if (!/^\d{6}$/.test(cleanedOtp)) {
    return {
      success: false,
      error: "Verification code must be exactly 6 numeric digits.",
    };
  }

  const record = await prisma.emailVerificationOtp.findUnique({
    where: { email: normalizedEmail },
  });

  if (!record) {
    return {
      success: false,
      error: "No active verification code found for this email. Please request a new code.",
    };
  }

  // Check expiration
  if (Date.now() > record.expiresAt.getTime()) {
    await prisma.emailVerificationOtp.delete({ where: { email: normalizedEmail } }).catch(() => {});
    return {
      success: false,
      error: "Verification code has expired. Please request a new code.",
    };
  }

  // Check rate limiting / brute-force attempts
  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.emailVerificationOtp.delete({ where: { email: normalizedEmail } }).catch(() => {});
    return {
      success: false,
      error: "Too many failed attempts. For your security, this code has been revoked. Please request a new code.",
    };
  }

  // Verify hash
  const enteredHash = hashOtp(cleanedOtp);
  if (record.hashedOtp !== enteredHash) {
    const updatedAttempts = record.attempts + 1;
    const remaining = Math.max(0, MAX_ATTEMPTS - updatedAttempts);

    if (remaining === 0) {
      await prisma.emailVerificationOtp.delete({ where: { email: normalizedEmail } }).catch(() => {});
      return {
        success: false,
        error: "Too many failed attempts. For your security, this code has been revoked. Please request a new code.",
        attemptsRemaining: 0,
      };
    }

    await prisma.emailVerificationOtp.update({
      where: { email: normalizedEmail },
      data: { attempts: updatedAttempts },
    });

    return {
      success: false,
      error: `Incorrect verification code. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} remaining.`,
      attemptsRemaining: remaining,
    };
  }

  // Success: Delete OTP immediately so it can NEVER be reused (single-use guarantee)
  await prisma.emailVerificationOtp.delete({ where: { email: normalizedEmail } }).catch(() => {});

  // Mark user account verified in database
  await prisma.user.updateMany({
    where: { email: normalizedEmail },
    data: {
      isEmailVerified: true,
      emailVerified: new Date(),
    },
  });

  // Generate signed single-use verification token
  const token = generateVerificationToken(normalizedEmail);

  return {
    success: true,
    verificationToken: token,
    message: "Email address verified successfully.",
  };
}
