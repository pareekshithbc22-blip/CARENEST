import crypto from "crypto";
import QRCode from "qrcode";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const MAX_VERIFICATION_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

// In-memory rate limiting map for 2FA attempts
interface RateLimitState {
  attempts: number;
  lockedUntil: number;
}
const twoFactorRateLimitMap = new Map<string, RateLimitState>();

/**
 * Encodes a buffer to RFC 4648 Base32 string (without padding)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes RFC 4648 Base32 string into a Buffer
 */
export function base32Decode(str: string): Buffer {
  const cleaned = str.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (val === -1) {
      continue;
    }
    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates an encryption key from application secret
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET || "carenest-hackathon-production-jwt-encryption-key-2026-secure";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a TOTP secret using AES-256-GCM before storing in database
 */
export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted TOTP secret from database
 */
export function decryptSecret(cipherText: string): string {
  try {
    const parts = cipherText.split(":");
    if (parts.length !== 3) {
      // Fallback for unencrypted legacy secret if any
      return cipherText;
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[TOTP Decryption Error]:", err);
    throw new Error("Failed to decrypt two-factor secret.");
  }
}

/**
 * Generates a 6-digit TOTP code according to RFC 6238
 */
export function generateTotp(secretBase32: string, timestamp = Date.now()): string {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(timestamp / 1000 / TOTP_STEP_SECONDS);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binaryCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binaryCode % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, "0");
}

/**
 * Verifies a 6-digit TOTP code with time-step drift window tolerance
 */
export function verifyTotp(secretBase32: string, token: string, window = 1): boolean {
  const cleaned = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) {
    return false;
  }

  const now = Date.now();
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const checkTime = now + errorWindow * TOTP_STEP_SECONDS * 1000;
    const generated = generateTotp(secretBase32, checkTime);
    if (crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(cleaned))) {
      return true;
    }
  }

  return false;
}

/**
 * Generates a fresh random Base32 TOTP secret and QR code data URL
 */
export async function generateTotpSetup(
  userEmail: string
): Promise<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }> {
  const randomBytes = crypto.randomBytes(20);
  const secret = base32Encode(randomBytes);
  const cleanEmail = userEmail.trim().toLowerCase();
  const issuer = "CareNest";
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(cleanEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 260,
    margin: 2,
    color: {
      dark: "#0f766e", // CareNest brand teal
      light: "#ffffff",
    },
  });

  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  };
}

/**
 * Hashes a recovery code for secure persistent storage
 */
export function hashRecoveryCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Generates 8 secure alphanumeric recovery codes (formatted e.g. A1B2-C3D4)
 */
export function generateRecoveryCodes(count = 8): {
  plaintextCodes: string[];
  hashedCodes: string[];
} {
  const plaintextCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const formatted = `${part1}-${part2}`;
    plaintextCodes.push(formatted);
    hashedCodes.push(hashRecoveryCode(formatted));
  }

  return { plaintextCodes, hashedCodes };
}

/**
 * Verifies a submitted recovery code against stored hashes, consuming it if valid
 */
export function verifyAndConsumeRecoveryCode(
  submittedCode: string,
  storedHashedCodes: string[]
): { valid: boolean; remainingHashes: string[] } {
  const submittedHash = hashRecoveryCode(submittedCode);
  const index = storedHashedCodes.indexOf(submittedHash);

  if (index === -1) {
    return { valid: false, remainingHashes: storedHashedCodes };
  }

  // Consume code (single-use guarantee)
  const remainingHashes = [...storedHashedCodes];
  remainingHashes.splice(index, 1);
  return { valid: true, remainingHashes };
}

/**
 * Rate limit checks to prevent brute force 2FA attacks
 */
export function checkTwoFactorRateLimit(userId: string): {
  locked: boolean;
  remainingMinutes?: number;
} {
  const state = twoFactorRateLimitMap.get(userId);
  if (!state) return { locked: false };

  const now = Date.now();
  if (state.lockedUntil > now) {
    const remainingMinutes = Math.ceil((state.lockedUntil - now) / (60 * 1000));
    return { locked: true, remainingMinutes };
  }

  if (state.lockedUntil > 0 && state.lockedUntil <= now) {
    twoFactorRateLimitMap.delete(userId);
    return { locked: false };
  }

  return { locked: false };
}

export function recordFailedTwoFactorAttempt(userId: string): {
  locked: boolean;
  attemptsRemaining: number;
} {
  const now = Date.now();
  const state = twoFactorRateLimitMap.get(userId) || { attempts: 0, lockedUntil: 0 };
  state.attempts += 1;

  if (state.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_MS;
    twoFactorRateLimitMap.set(userId, state);
    return { locked: true, attemptsRemaining: 0 };
  }

  twoFactorRateLimitMap.set(userId, state);
  return {
    locked: false,
    attemptsRemaining: Math.max(0, MAX_VERIFICATION_ATTEMPTS - state.attempts),
  };
}

export function resetTwoFactorRateLimit(userId: string): void {
  twoFactorRateLimitMap.delete(userId);
}
