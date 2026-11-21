import { describe, it, expect } from "vitest";
import {
  base32Encode,
  base32Decode,
  generateTotp,
  verifyTotp,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
  checkTwoFactorRateLimit,
  recordFailedTwoFactorAttempt,
  resetTwoFactorRateLimit,
  generateTotpSetup,
} from "@/lib/totp";

describe("CareNest TOTP & 2FA Engine", () => {
  it("encodes and decodes Base32 symmetrically", () => {
    const original = Buffer.from("CareNest-Health-TOTP-2026-Secret");
    const encoded = base32Encode(original);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = base32Decode(encoded);
    expect(decoded.toString("utf8")).toBe(original.toString("utf8"));
  });

  it("generates deterministic 6-digit TOTP codes for standard time steps", () => {
    const testSecret = "JBSWY3DPEHPK3PXP"; // Standard RFC 3548 test vector
    const timestamp = 1700000000000;

    const code1 = generateTotp(testSecret, timestamp);
    const code2 = generateTotp(testSecret, timestamp);

    expect(code1).toHaveLength(6);
    expect(/^\d{6}$/.test(code1)).toBe(true);
    expect(code1).toBe(code2);
  });

  it("verifies TOTP codes and handles 30s clock drift tolerance", () => {
    const testSecret = "KVKFKRCPNZQUYMLX";
    const now = Date.now();
    const currentCode = generateTotp(testSecret, now);

    // Current code must be valid
    expect(verifyTotp(testSecret, currentCode)).toBe(true);

    // Code from 25 seconds ago should still be valid with default window=1
    const pastCode = generateTotp(testSecret, now - 25 * 1000);
    expect(verifyTotp(testSecret, pastCode)).toBe(true);

    // Completely bogus or wrong code must fail
    expect(verifyTotp(testSecret, "000000")).toBe(false);
    expect(verifyTotp(testSecret, "invalid")).toBe(false);
  });

  it("encrypts and decrypts TOTP secrets securely using AES-256-GCM", () => {
    const rawSecret = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
    const cipher = encryptSecret(rawSecret);

    expect(cipher).not.toBe(rawSecret);
    expect(cipher.split(":")).toHaveLength(3); // iv:authTag:encrypted

    const decrypted = decryptSecret(cipher);
    expect(decrypted).toBe(rawSecret);
  });

  it("generates recovery codes and enforces single-use consumption", () => {
    const { plaintextCodes, hashedCodes } = generateRecoveryCodes(8);

    expect(plaintextCodes).toHaveLength(8);
    expect(hashedCodes).toHaveLength(8);

    const codeToUse = plaintextCodes[0];
    const { valid, remainingHashes } = verifyAndConsumeRecoveryCode(codeToUse, hashedCodes);

    expect(valid).toBe(true);
    expect(remainingHashes).toHaveLength(7);

    // Attempting to reuse the same recovery code must fail (single-use)
    const secondAttempt = verifyAndConsumeRecoveryCode(codeToUse, remainingHashes);
    expect(secondAttempt.valid).toBe(false);
  });

  it("enforces rate-limiting after 5 failed 2FA verification attempts", () => {
    const testUserId = "user-totp-rate-limit-test";
    resetTwoFactorRateLimit(testUserId);

    expect(checkTwoFactorRateLimit(testUserId).locked).toBe(false);

    // Record 4 failed attempts
    for (let i = 0; i < 4; i++) {
      const res = recordFailedTwoFactorAttempt(testUserId);
      expect(res.locked).toBe(false);
      expect(res.attemptsRemaining).toBe(5 - (i + 1));
    }

    // 5th attempt triggers lockout
    const finalRes = recordFailedTwoFactorAttempt(testUserId);
    expect(finalRes.locked).toBe(true);
    expect(finalRes.attemptsRemaining).toBe(0);

    expect(checkTwoFactorRateLimit(testUserId).locked).toBe(true);

    resetTwoFactorRateLimit(testUserId);
    expect(checkTwoFactorRateLimit(testUserId).locked).toBe(false);
  });

  it("generates setup bundle with QR code data URI", async () => {
    const setup = await generateTotpSetup("sarah.vance@carenest.health");
    expect(setup.secret).toHaveLength(32);
    expect(setup.otpauthUrl).toContain("otpauth://totp/CareNest:sarah.vance%40carenest.health");
    expect(setup.qrCodeDataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });
});
