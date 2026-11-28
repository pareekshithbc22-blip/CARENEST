/**
 * Verification Development Sandbox Provider.
 * Deterministic test harness for local development and test automation.
 *
 * SAFETY INVARIANT:
 * This provider is ONLY permitted when NODE_ENV is "development" AND VERIFICATION_DEV_SANDBOX is "true".
 * If VERIFICATION_DEV_SANDBOX is enabled in production, the provider throws a fatal error and refuses to start.
 */

import type { RegistryProvider, RegistryLookupQuery, RegistryLookupResult } from "./types";

export class VerificationDevSandboxProvider implements RegistryProvider {
  public readonly id = "dev-sandbox";
  public readonly name = "Developer Verification Sandbox";
  public readonly authoritative = true; // Simulates authoritative council response for testing

  constructor() {
    this.assertEnvironmentSafety();
  }

  /**
   * Asserts that sandbox provider is never instantiated or operated in production
   */
  public assertEnvironmentSafety(): void {
    const isProduction = process.env.NODE_ENV === "production";
    const sandboxEnabled = process.env.VERIFICATION_DEV_SANDBOX === "true";

    if (isProduction && sandboxEnabled) {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: VERIFICATION_DEV_SANDBOX cannot be enabled in production environments. System startup halted."
      );
    }
  }

  public supports(authority: string): boolean {
    // Enabled only when sandbox mode is explicitly set in development
    const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
    const isEnabled = process.env.VERIFICATION_DEV_SANDBOX === "true" || process.env.NODE_ENV === "test";
    return isDev && isEnabled;
  }

  public async lookup(query: RegistryLookupQuery): Promise<RegistryLookupResult> {
    this.assertEnvironmentSafety();

    const cleanReg = (query.registrationNumber || "").toUpperCase().trim();
    const now = new Date();
    const twoYearsLater = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // 1. TEST-SLOW*: Deliberate delay to simulate high-latency or slow external portal
    if (cleanReg.startsWith("TEST-SLOW")) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return {
        outcome: "FOUND",
        authoritative: true,
        checkedAt: new Date(),
        providerId: this.id,
        record: {
          fullName: query.enteredFullName || "Sarah Jenkins",
          registrationNumber: query.registrationNumber,
          status: "ACTIVE",
          validFrom: oneYearAgo,
          validUntil: twoYearsLater,
          qualification: "B.Sc Nursing",
          authority: query.authority,
        },
      };
    }

    // 2. TEST-NOTFOUND*: Simulates number not found in official registry
    if (cleanReg.startsWith("TEST-NOTFOUND")) {
      return {
        outcome: "NOT_FOUND",
        authoritative: true,
        checkedAt: new Date(),
        providerId: this.id,
        message: "Registration record not located in sandbox authority registry.",
      };
    }

    // 3. TEST-EXPIRED*: License exists but validity has lapsed
    if (cleanReg.startsWith("TEST-EXPIRED")) {
      return {
        outcome: "FOUND",
        authoritative: true,
        checkedAt: new Date(),
        providerId: this.id,
        record: {
          fullName: query.enteredFullName || "Sarah Jenkins",
          registrationNumber: query.registrationNumber,
          status: "EXPIRED",
          validFrom: new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000),
          validUntil: oneYearAgo,
          qualification: "General Nursing & Midwifery",
          authority: query.authority,
        },
      };
    }

    // 4. TEST-REVOKED*: Disciplinary revocation
    if (cleanReg.startsWith("TEST-REVOKED")) {
      return {
        outcome: "FOUND",
        authoritative: true,
        checkedAt: new Date(),
        providerId: this.id,
        record: {
          fullName: query.enteredFullName || "Sarah Jenkins",
          registrationNumber: query.registrationNumber,
          status: "REVOKED",
          validFrom: oneYearAgo,
          validUntil: twoYearsLater,
          qualification: "Registered Nurse (RN)",
          authority: query.authority,
        },
      };
    }

    // 5. TEST-MISMATCH*: Registration number exists, but belongs to someone else
    if (cleanReg.startsWith("TEST-MISMATCH")) {
      return {
        outcome: "FOUND",
        authoritative: true,
        checkedAt: new Date(),
        providerId: this.id,
        record: {
          fullName: "Ananya Sengupta", // Clearly different person
          registrationNumber: query.registrationNumber,
          status: "ACTIVE",
          validFrom: oneYearAgo,
          validUntil: twoYearsLater,
          qualification: "GNM",
          authority: query.authority,
        },
      };
    }

    // 6. TEST-OK*: Perfectly authentic, active license matching entered name
    if (cleanReg.startsWith("TEST-OK")) {
      return {
        outcome: "FOUND",
        authoritative: true,
        checkedAt: new Date(),
        providerId: this.id,
        record: {
          fullName: query.enteredFullName || "Priya Sharma",
          registrationNumber: query.registrationNumber,
          status: "ACTIVE",
          validFrom: oneYearAgo,
          validUntil: twoYearsLater,
          qualification: "B.Sc Nursing",
          authority: query.authority,
        },
      };
    }

    // Default sandbox fallback
    return {
      outcome: "UNAVAILABLE",
      authoritative: false,
      checkedAt: new Date(),
      providerId: this.id,
      message: "Unrecognized sandbox registration test prefix. Use TEST-OK, TEST-EXPIRED, TEST-REVOKED, TEST-MISMATCH, or TEST-NOTFOUND.",
    };
  }
}
