/**
 * Pure Verification Decision Policy Engine.
 * Configurable thresholds and evaluation rules without database dependencies.
 */

import { matchNames, matchRegistrationNumber, matchAuthorityAndState, checkValidityDates } from "./matching";
import { VerificationReasonCode } from "./reason-codes";
import type { VerificationCaseStatus } from "./state-machine";

export interface PolicyConfig {
  nameSimilarityThreshold: number;        // Default: 0.85
  nameMismatchRejectionThreshold: number; // Default: 0.30
  requireIdentityBinding: boolean;        // Default: true
  maxSubmissionsPerDay: number;           // Default: 5
  reverifyDays: number;                   // Default: 30
  expiryReminderDays: number;             // Default: 30
}

export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  nameSimilarityThreshold: 0.85,
  nameMismatchRejectionThreshold: 0.30,
  requireIdentityBinding: true,
  maxSubmissionsPerDay: 5,
  reverifyDays: 30,
  expiryReminderDays: 30,
};

export interface RegistryRecordPayload {
  fullName: string;
  registrationNumber: string;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED" | "EXPIRED";
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
  qualification?: string;
  authority: string;
}

export interface PolicyEvaluationInput {
  enteredFullName: string;
  enteredRegNumber: string;
  enteredAuthority: string;
  enteredState?: string | null;
  enteredCategory?: string;

  // Registry result
  registryOutcome: "FOUND" | "NOT_FOUND" | "UNAVAILABLE" | "RATE_LIMITED";
  registryRecord?: RegistryRecordPayload | null;
  registryAuthoritative?: boolean;
  providerId?: string;

  // Extracted OCR text & binding
  extractedContentMatches?: boolean;
  identityBindingConfirmed?: boolean;

  // Risk flags
  riskFlags: string[];

  // Config override
  config?: Partial<PolicyConfig>;
}

export interface PolicyDecision {
  status: Extract<VerificationCaseStatus, "AUTO_APPROVED" | "AUTO_REJECTED" | "MANUAL_REVIEW">;
  reasonCodes: string[];
  scores: {
    nameSimilarity: number;
    regNumberMatch: number;
    authorityMatch: number;
    riskScore: number;
    overallConfidence: number;
  };
}

/**
 * Pure policy evaluation engine.
 * Determines whether a verification case is AUTO_APPROVED, AUTO_REJECTED, or routed to MANUAL_REVIEW.
 */
export function evaluateVerificationPolicy(input: PolicyEvaluationInput): PolicyDecision {
  const config = { ...DEFAULT_POLICY_CONFIG, ...input.config };
  const reasonCodes: string[] = [];

  // 1. Initial scores
  let nameSimScore = 0.0;
  let regScore = 0.0;
  let authScore = 0.0;

  // 2. Risk check
  const hasRisk = input.riskFlags.length > 0;
  if (hasRisk) {
    reasonCodes.push(...input.riskFlags);
  }

  // 3. Handle cases where registry is not available or provider is not configured
  if (
    input.registryOutcome === "UNAVAILABLE" ||
    input.registryOutcome === "RATE_LIMITED" ||
    !input.providerId ||
    input.providerId === "manual-review"
  ) {
    if (input.registryOutcome === "RATE_LIMITED") {
      reasonCodes.push(VerificationReasonCode.REGISTRY_RATE_LIMITED);
    } else if (input.registryOutcome === "UNAVAILABLE") {
      reasonCodes.push(VerificationReasonCode.REGISTRY_UNAVAILABLE);
    } else {
      reasonCodes.push(VerificationReasonCode.NO_REGISTRY_PROVIDER_CONFIGURED);
    }
    reasonCodes.push(VerificationReasonCode.MANUAL_REVIEW_REQUIRED);

    return {
      status: "MANUAL_REVIEW",
      reasonCodes,
      scores: {
        nameSimilarity: 0,
        regNumberMatch: 0,
        authorityMatch: 0,
        riskScore: hasRisk ? 0.5 : 0,
        overallConfidence: 0,
      },
    };
  }

  // 4. Registry record NOT FOUND -> Always MANUAL_REVIEW, NEVER AUTO_REJECT
  if (input.registryOutcome === "NOT_FOUND" || !input.registryRecord) {
    reasonCodes.push(VerificationReasonCode.REGISTRY_NOT_FOUND);
    reasonCodes.push(VerificationReasonCode.MANUAL_REVIEW_REQUIRED);

    return {
      status: "MANUAL_REVIEW",
      reasonCodes,
      scores: {
        nameSimilarity: 0,
        regNumberMatch: 0,
        authorityMatch: 0,
        riskScore: hasRisk ? 0.5 : 0,
        overallConfidence: 0.1,
      },
    };
  }

  // 5. Registry Record FOUND -> Evaluate comparisons
  const record = input.registryRecord;

  // Name similarity
  const nameComparison = matchNames(input.enteredFullName, record.fullName);
  nameSimScore = nameComparison.score;

  // Registration number match
  const regComparison = matchRegistrationNumber(input.enteredRegNumber, record.registrationNumber);
  regScore = regComparison.score;

  // Authority & State match
  const authComparison = matchAuthorityAndState(
    input.enteredAuthority,
    record.authority,
    input.enteredState
  );
  authScore = authComparison.score;

  // Check validity dates
  const validity = checkValidityDates(record.validFrom, record.validUntil);

  // 6. Evaluate AUTO_REJECT conditions (Requires authoritative provider)
  const isAuthoritative = Boolean(input.registryAuthoritative);
  if (isAuthoritative) {
    // A) License revoked
    if (record.status === "REVOKED") {
      reasonCodes.push(VerificationReasonCode.REGISTRY_REVOKED);
      return {
        status: "AUTO_REJECTED",
        reasonCodes,
        scores: { nameSimilarity: nameSimScore, regNumberMatch: regScore, authorityMatch: authScore, riskScore: 0.9, overallConfidence: 0.95 },
      };
    }

    // B) License suspended
    if (record.status === "SUSPENDED") {
      reasonCodes.push(VerificationReasonCode.REGISTRY_SUSPENDED);
      return {
        status: "AUTO_REJECTED",
        reasonCodes,
        scores: { nameSimilarity: nameSimScore, regNumberMatch: regScore, authorityMatch: authScore, riskScore: 0.9, overallConfidence: 0.95 },
      };
    }

    // C) License expired
    if (record.status === "EXPIRED" || validity.isExpired) {
      reasonCodes.push(VerificationReasonCode.REGISTRY_EXPIRED);
      return {
        status: "AUTO_REJECTED",
        reasonCodes,
        scores: { nameSimilarity: nameSimScore, regNumberMatch: regScore, authorityMatch: authScore, riskScore: 0.8, overallConfidence: 0.9 },
      };
    }

    // D) Registration number found, but belongs to a clearly different person (name mismatch < 0.30)
    if (regScore === 1.0 && nameSimScore < config.nameMismatchRejectionThreshold) {
      reasonCodes.push(VerificationReasonCode.REGISTRY_NAME_MISMATCH);
      return {
        status: "AUTO_REJECTED",
        reasonCodes,
        scores: { nameSimilarity: nameSimScore, regNumberMatch: regScore, authorityMatch: authScore, riskScore: 0.85, overallConfidence: 0.9 },
      };
    }
  }

  // 7. Evaluate AUTO_APPROVED conditions
  const isRecordActive = record.status === "ACTIVE" && validity.isValid;
  const isRegExactMatch = regScore === 1.0;
  const isNameStrongMatch = nameSimScore >= config.nameSimilarityThreshold;
  const isAuthorityCompatible = authScore >= 0.8;

  // Check binding evidence
  const hasExtractedMatch = Boolean(input.extractedContentMatches);
  const hasIdentityBinding = Boolean(input.identityBindingConfirmed);
  const bindingSatisfied = config.requireIdentityBinding
    ? (hasExtractedMatch || hasIdentityBinding)
    : true;

  if (
    isRecordActive &&
    isRegExactMatch &&
    isNameStrongMatch &&
    isAuthorityCompatible &&
    !hasRisk &&
    bindingSatisfied
  ) {
    reasonCodes.push(VerificationReasonCode.REGISTRY_MATCH_CONFIRMED);
    if (hasExtractedMatch) reasonCodes.push(VerificationReasonCode.DOC_CONTENT_VERIFIED);
    if (hasIdentityBinding) reasonCodes.push(VerificationReasonCode.IDENTITY_BINDING_CONFIRMED);

    const overallConfidence = Number(((nameSimScore * 0.5) + (regScore * 0.3) + (authScore * 0.2)).toFixed(2));

    return {
      status: "AUTO_APPROVED",
      reasonCodes,
      scores: {
        nameSimilarity: nameSimScore,
        regNumberMatch: regScore,
        authorityMatch: authScore,
        riskScore: 0.0,
        overallConfidence,
      },
    };
  }

  // 8. Fallback: MANUAL_REVIEW
  if (!isNameStrongMatch) {
    reasonCodes.push(VerificationReasonCode.PARTIAL_NAME_MATCH);
  }
  if (!isAuthorityCompatible) {
    reasonCodes.push(VerificationReasonCode.AUTHORITY_MISMATCH);
  }
  if (!bindingSatisfied) {
    reasonCodes.push(VerificationReasonCode.MISSING_BINDING_EVIDENCE);
  }
  reasonCodes.push(VerificationReasonCode.MANUAL_REVIEW_REQUIRED);

  const overallConfidence = Number(((nameSimScore * 0.4) + (regScore * 0.3) + (authScore * 0.3)).toFixed(2));

  return {
    status: "MANUAL_REVIEW",
    reasonCodes,
    scores: {
      nameSimilarity: nameSimScore,
      regNumberMatch: regScore,
      authorityMatch: authScore,
      riskScore: hasRisk ? 0.4 : 0.1,
      overallConfidence,
    },
  };
}
