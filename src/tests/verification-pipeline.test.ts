import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  normalizeName,
  normalizeRegistrationNumber,
  normalizeAuthority,
  matchNames,
  matchRegistrationNumber,
  matchAuthorityAndState,
  checkValidityDates,
  evaluateRiskSignals,
  canTransition,
  assertValidTransition,
  evaluateVerificationPolicy,
  VerificationReasonCode,
  type VerificationCaseStatus,
} from "../lib/domain/verification";
import { VerificationDevSandboxProvider } from "../lib/verification/providers/sandbox-provider";
import { CircuitBreaker } from "../lib/verification/providers/circuit-breaker";
import { validateCertificateFile, detectMagicBytes, computeFileSha256 } from "../lib/verification/security/file-validator";
import { LocalFileStorageAdapter } from "../lib/verification/storage/local-storage";
import fs from "fs";
import path from "path";

describe("Caretaker Automated Verification Pipeline", () => {
  // =========================================================================
  // 1. Normalization & Indian Name Variants
  // =========================================================================
  describe("1. Normalization Engine", () => {
    it("strips honorifics and clinical titles correctly", () => {
      expect(normalizeName("Dr. Priya Sharma")).toBe("priya sarma");
      expect(normalizeName("Sister Mary Joseph")).toBe("mary josef");
      expect(normalizeName("Nurse Rajesh Kumar RN")).toBe("rajes kumar");
      expect(normalizeName("Smt. Ananya Sen")).toBe("ananya sen");
      expect(normalizeName("Mr. Suresh Patel")).toBe("sures patel");
    });

    it("handles diacritics, punctuation, and multiple spaces", () => {
      expect(normalizeName("Renée  Müller-Smith")).toBe("reni muller smit");
      expect(normalizeName("  Deepa,   K.  ")).toBe("dipa k");
    });

    it("normalizes common Indian phonetic / transliteration variants", () => {
      // ph -> f, ee -> i, oo -> u, w -> v, sh -> s
      expect(normalizeName("Deepak Sharma")).toBe(normalizeName("Dipak Sarma"));
      expect(normalizeName("Pooja Verma")).toBe(normalizeName("Puja Verma"));
      expect(normalizeName("Swati")).toBe(normalizeName("Svati"));
    });

    it("normalizes registration numbers by stripping symbols and capitalizing", () => {
      expect(normalizeRegistrationNumber(" knc-1234/2022. ")).toBe("KNC12342022");
      expect(normalizeRegistrationNumber("RN - 98765")).toBe("RN98765");
      expect(normalizeRegistrationNumber("")).toBe("");
    });

    it("expands known nursing and medical council acronyms", () => {
      expect(normalizeAuthority("KNC")).toBe("karnataka nursing council");
      expect(normalizeAuthority("INC")).toBe("indian nursing council");
      expect(normalizeAuthority("DNC")).toBe("delhi nursing council");
      expect(normalizeAuthority("MNC")).toBe("maharashtra nursing council");
      expect(normalizeAuthority("Karnataka State Nursing Council")).toContain("karnataka");
    });
  });

  // =========================================================================
  // 2. Matching Engine with Scores & Initials
  // =========================================================================
  describe("2. Matching Engine", () => {
    it("awards near-perfect scores for token permutations (re-ordered names)", () => {
      const match = matchNames("Priya Sharma", "Sharma Priya");
      expect(match.tokenSortMatch).toBe(true);
      expect(match.score).toBeGreaterThanOrEqual(0.95);
      expect(match.confidence).toBe("HIGH");
    });

    it("matches single-letter initials with high confidence", () => {
      const match = matchNames("P. Sharma", "Priya Sharma");
      expect(match.initialsMatch).toBe(true);
      expect(match.score).toBeGreaterThanOrEqual(0.85);
      expect(match.confidence).toBe("HIGH");
    });

    it("awards low score for clearly distinct names", () => {
      const match = matchNames("Priya Sharma", "Ananya Sengupta");
      expect(match.score).toBeLessThan(0.3);
      expect(match.confidence).toBe("NONE");
    });

    it("matches registration numbers strictly (exact only)", () => {
      expect(matchRegistrationNumber("KNC-12345", "knc 12345").match).toBe(true);
      expect(matchRegistrationNumber("KNC-12345", "KNC-12346").match).toBe(false);
      expect(matchRegistrationNumber("KNC-12345", "KNC-12346").score).toBe(0);
    });

    it("evaluates issuing authority and state compatibility", () => {
      const match1 = matchAuthorityAndState("KNC", "Karnataka Nursing Council", "Karnataka", "Karnataka");
      expect(match1.match).toBe(true);
      expect(match1.score).toBe(1.0);

      const mismatch = matchAuthorityAndState("Delhi Nursing Council", "Karnataka Nursing Council", "Delhi", "Karnataka");
      expect(mismatch.match).toBe(false);
      expect(mismatch.score).toBe(0.0);
    });

    it("validates validity dates accurately", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
      const future = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365);

      const active = checkValidityDates(past, future, now);
      expect(active.isValid).toBe(true);
      expect(active.isExpired).toBe(false);
      expect(active.daysRemaining).toBeGreaterThan(300);

      const expired = checkValidityDates(past, past, now);
      expect(expired.isValid).toBe(false);
      expect(expired.isExpired).toBe(true);
    });
  });

  // =========================================================================
  // 3. Pure Verification Decision Policy Paths
  // =========================================================================
  describe("3. Decision Policy Engine", () => {
    it("path: AUTO_APPROVED when active, exact reg, strong name match and binding evidence", () => {
      const decision = evaluateVerificationPolicy({
        enteredFullName: "Priya Sharma",
        enteredRegNumber: "KNC-1001",
        enteredAuthority: "Karnataka Nursing Council",
        registryOutcome: "FOUND",
        registryAuthoritative: true,
        providerId: "test-provider",
        registryRecord: {
          fullName: "Priya Sharma",
          registrationNumber: "KNC-1001",
          status: "ACTIVE",
          authority: "Karnataka Nursing Council",
        },
        extractedContentMatches: true,
        riskFlags: [],
      });

      expect(decision.status).toBe("AUTO_APPROVED");
      expect(decision.reasonCodes).toContain(VerificationReasonCode.REGISTRY_MATCH_CONFIRMED);
      expect(decision.reasonCodes).toContain(VerificationReasonCode.DOC_CONTENT_VERIFIED);
      expect(decision.scores.nameSimilarity).toBeGreaterThanOrEqual(0.85);
      expect(decision.scores.overallConfidence).toBeGreaterThan(0.9);
    });

    it("path: AUTO_REJECTED for authoritative revoked status", () => {
      const decision = evaluateVerificationPolicy({
        enteredFullName: "Sarah Jenkins",
        enteredRegNumber: "KNC-9999",
        enteredAuthority: "Karnataka Nursing Council",
        registryOutcome: "FOUND",
        registryAuthoritative: true,
        providerId: "test-provider",
        registryRecord: {
          fullName: "Sarah Jenkins",
          registrationNumber: "KNC-9999",
          status: "REVOKED",
          authority: "Karnataka Nursing Council",
        },
        riskFlags: [],
      });

      expect(decision.status).toBe("AUTO_REJECTED");
      expect(decision.reasonCodes).toContain(VerificationReasonCode.REGISTRY_REVOKED);
    });

    it("path: AUTO_REJECTED for number match but completely mismatched person (< 0.30)", () => {
      const decision = evaluateVerificationPolicy({
        enteredFullName: "David Miller",
        enteredRegNumber: "KNC-1001",
        enteredAuthority: "Karnataka Nursing Council",
        registryOutcome: "FOUND",
        registryAuthoritative: true,
        providerId: "test-provider",
        registryRecord: {
          fullName: "Ananya Sengupta",
          registrationNumber: "KNC-1001",
          status: "ACTIVE",
          authority: "Karnataka Nursing Council",
        },
        riskFlags: [],
      });

      expect(decision.status).toBe("AUTO_REJECTED");
      expect(decision.reasonCodes).toContain(VerificationReasonCode.REGISTRY_NAME_MISMATCH);
    });

    it("path: MANUAL_REVIEW for NOT_FOUND (never auto-reject)", () => {
      const decision = evaluateVerificationPolicy({
        enteredFullName: "Priya Sharma",
        enteredRegNumber: "UNKNOWN-999",
        enteredAuthority: "Karnataka Nursing Council",
        registryOutcome: "NOT_FOUND",
        registryAuthoritative: true,
        providerId: "test-provider",
        registryRecord: null,
        riskFlags: [],
      });

      expect(decision.status).toBe("MANUAL_REVIEW");
      expect(decision.reasonCodes).toContain(VerificationReasonCode.REGISTRY_NOT_FOUND);
      expect(decision.reasonCodes).toContain(VerificationReasonCode.MANUAL_REVIEW_REQUIRED);
    });

    it("path: MANUAL_REVIEW when provider is UNAVAILABLE or unconfigured", () => {
      const decision = evaluateVerificationPolicy({
        enteredFullName: "Priya Sharma",
        enteredRegNumber: "KNC-1001",
        enteredAuthority: "Karnataka Nursing Council",
        registryOutcome: "UNAVAILABLE",
        providerId: "manual-review",
        riskFlags: [],
      });

      expect(decision.status).toBe("MANUAL_REVIEW");
      expect(decision.reasonCodes).toContain(VerificationReasonCode.REGISTRY_UNAVAILABLE);
    });

    it("path: MANUAL_REVIEW when duplicate risk flag is present", () => {
      const decision = evaluateVerificationPolicy({
        enteredFullName: "Priya Sharma",
        enteredRegNumber: "KNC-1001",
        enteredAuthority: "Karnataka Nursing Council",
        registryOutcome: "FOUND",
        registryAuthoritative: true,
        providerId: "test-provider",
        registryRecord: {
          fullName: "Priya Sharma",
          registrationNumber: "KNC-1001",
          status: "ACTIVE",
          authority: "Karnataka Nursing Council",
        },
        extractedContentMatches: true,
        riskFlags: ["DUPLICATE_FILE_HASH"],
      });

      // Risk flags prevent AUTO_APPROVED and route to MANUAL_REVIEW
      expect(decision.status).toBe("MANUAL_REVIEW");
      expect(decision.reasonCodes).toContain("DUPLICATE_FILE_HASH");
    });
  });

  // =========================================================================
  // 4. State Machine Allowed and Forbidden Transitions
  // =========================================================================
  describe("4. State Machine Transitions", () => {
    it("permits legal lifecycle transitions", () => {
      expect(canTransition("SUBMITTED", "PROCESSING")).toBe(true);
      expect(canTransition("PROCESSING", "AUTO_APPROVED")).toBe(true);
      expect(canTransition("PROCESSING", "MANUAL_REVIEW")).toBe(true);
      expect(canTransition("PROCESSING", "AUTO_REJECTED")).toBe(true);
      expect(canTransition("MANUAL_REVIEW", "APPROVED")).toBe(true);
      expect(canTransition("MANUAL_REVIEW", "REJECTED")).toBe(true);
      expect(canTransition("AUTO_REJECTED", "SUBMITTED")).toBe(true);
      expect(canTransition("AUTO_REJECTED", "MANUAL_REVIEW")).toBe(true);
      expect(canTransition("AUTO_APPROVED", "EXPIRED")).toBe(true);
    });

    it("forbids illegal direct transitions and throws error", () => {
      expect(canTransition("SUBMITTED", "APPROVED")).toBe(false);
      expect(canTransition("SUBMITTED", "AUTO_APPROVED")).toBe(false);
      expect(canTransition("APPROVED", "PROCESSING")).toBe(false);

      expect(() => assertValidTransition("SUBMITTED", "APPROVED")).toThrow(/Illegal verification status transition/);
    });
  });

  // =========================================================================
  // 5. Risk Signals & Metadata Anomaly Detection
  // =========================================================================
  describe("5. Risk Signals", () => {
    it("flags duplicate file hashes and registration numbers", () => {
      const risk = evaluateRiskSignals({
        hasDuplicateFileHash: true,
        hasDuplicateRegNumber: true,
        enteredName: "Priya Sharma",
      });

      expect(risk.hasRiskFlags).toBe(true);
      expect(risk.flags).toContain("DUPLICATE_FILE_HASH");
      expect(risk.flags).toContain("DUPLICATE_REGISTRATION_NUMBER");
      expect(risk.riskScore).toBeGreaterThanOrEqual(0.8);
    });

    it("flags anomalous PDF metadata from image editing software", () => {
      const risk = evaluateRiskSignals({
        hasDuplicateFileHash: false,
        hasDuplicateRegNumber: false,
        metadataCreator: "Adobe Photoshop CC 2024 (Windows)",
        enteredName: "Priya Sharma",
      });

      expect(risk.hasRiskFlags).toBe(true);
      expect(risk.flags).toContain("ANOMALOUS_METADATA");
    });

    it("returns clean result when no anomalies are detected", () => {
      const risk = evaluateRiskSignals({
        hasDuplicateFileHash: false,
        hasDuplicateRegNumber: false,
        metadataCreator: "Canon Scanner Utility",
        enteredName: "Priya Sharma",
      });

      expect(risk.hasRiskFlags).toBe(false);
      expect(risk.riskScore).toBe(0.0);
    });
  });

  // =========================================================================
  // 6. Developer Sandbox Provider Security
  // =========================================================================
  describe("6. Dev Sandbox Provider", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it("refuses to run and throws fatal error if enabled in production", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.VERIFICATION_DEV_SANDBOX = "true";

      expect(() => new VerificationDevSandboxProvider()).toThrow(/CRITICAL SECURITY CONFIGURATION ERROR/);
    });

    it("returns deterministic responses for test prefixes", async () => {
      (process.env as any).NODE_ENV = "development";
      process.env.VERIFICATION_DEV_SANDBOX = "true";

      const sandbox = new VerificationDevSandboxProvider();

      // TEST-OK
      const okRes = await sandbox.lookup({
        registrationNumber: "TEST-OK-001",
        authority: "Karnataka Nursing Council",
        enteredFullName: "Sarah Jenkins",
      });
      expect(okRes.outcome).toBe("FOUND");
      expect(okRes.record?.status).toBe("ACTIVE");
      expect(okRes.record?.fullName).toBe("Sarah Jenkins");

      // TEST-EXPIRED
      const expRes = await sandbox.lookup({
        registrationNumber: "TEST-EXPIRED-002",
        authority: "Karnataka Nursing Council",
      });
      expect(expRes.record?.status).toBe("EXPIRED");

      // TEST-REVOKED
      const revRes = await sandbox.lookup({
        registrationNumber: "TEST-REVOKED-003",
        authority: "Karnataka Nursing Council",
      });
      expect(revRes.record?.status).toBe("REVOKED");

      // TEST-MISMATCH
      const misRes = await sandbox.lookup({
        registrationNumber: "TEST-MISMATCH-004",
        authority: "Karnataka Nursing Council",
      });
      expect(misRes.record?.fullName).toBe("Ananya Sengupta");

      // TEST-NOTFOUND
      const nfRes = await sandbox.lookup({
        registrationNumber: "TEST-NOTFOUND-005",
        authority: "Karnataka Nursing Council",
      });
      expect(nfRes.outcome).toBe("NOT_FOUND");
    });
  });

  // =========================================================================
  // 7. File Security & Magic Bytes Validation
  // =========================================================================
  describe("7. File Security & Magic Bytes", () => {
    it("detects genuine PDF magic bytes (%PDF-)", () => {
      const pdfBuffer = Buffer.from("%PDF-1.7 header content here");
      expect(detectMagicBytes(pdfBuffer)).toBe("application/pdf");
      const validation = validateCertificateFile(pdfBuffer);
      expect(validation.valid).toBe(true);
      expect(validation.mimeType).toBe("application/pdf");
    });

    it("detects genuine JPEG magic bytes (0xFF 0xD8 0xFF)", () => {
      const jpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      expect(detectMagicBytes(jpgBuffer)).toBe("image/jpeg");
    });

    it("detects genuine PNG magic bytes (0x89 PNG)", () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(detectMagicBytes(pngBuffer)).toBe("image/png");
    });

    it("rejects spoofed text files masquerading as PDF", () => {
      const fakeBuffer = Buffer.from("Just plain text with fake content");
      expect(detectMagicBytes(fakeBuffer)).toBeNull();
      const validation = validateCertificateFile(fakeBuffer);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("Invalid file content format");
    });

    it("computes deterministic SHA-256 hash", () => {
      const buf = Buffer.from("Deterministic document test content");
      const hash1 = computeFileSha256(buf);
      const hash2 = computeFileSha256(buf);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });
  });

  // =========================================================================
  // 8. Circuit Breaker Resilience
  // =========================================================================
  describe("8. Circuit Breaker", () => {
    it("trips open after 5 consecutive failures and protects upstream", () => {
      const cb = new CircuitBreaker(5, 5000);
      expect(cb.isAvailable()).toBe(true);

      for (let i = 0; i < 4; i++) {
        cb.recordFailure();
        expect(cb.isAvailable()).toBe(true);
      }

      // 5th failure trips it open
      cb.recordFailure();
      expect(cb.isAvailable()).toBe(false);
      expect(cb.getState()).toBe("OPEN");

      // Success resets it
      cb.recordSuccess();
      expect(cb.isAvailable()).toBe(true);
      expect(cb.getState()).toBe("CLOSED");
    });
  });

  // =========================================================================
  // 9. Local Storage Adapter Contract
  // =========================================================================
  describe("9. Local Storage Contract", () => {
    const storage = new LocalFileStorageAdapter();
    const testFileName = `test_${Date.now()}.pdf`;
    const testBuffer = Buffer.from("%PDF-1.4 test certificate storage contract");

    it("saves and retrieves files faithfully", async () => {
      const saved = await storage.saveFile(testFileName, testBuffer, "application/pdf");
      expect(saved.storagePath).toContain("storage/secure_documents");

      const retrieved = await storage.getFile(saved.storagePath);
      expect(retrieved.equals(testBuffer)).toBe(true);

      // Clean up test file
      const fullPath = path.resolve(process.cwd(), saved.storagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

    it("blocks directory traversal attempts", async () => {
      await expect(storage.getFile("../../../etc/passwd")).rejects.toThrow(/Access denied/);
    });
  });
});
