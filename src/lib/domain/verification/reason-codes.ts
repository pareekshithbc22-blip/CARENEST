/**
 * Verification Reason Codes and User-Safe Explanations.
 * Stable enum and user-facing messages that do not expose internal registry mechanics.
 */

export const VerificationReasonCode = {
  // Positive confirmation
  REGISTRY_MATCH_CONFIRMED: "REGISTRY_MATCH_CONFIRMED",
  DOC_CONTENT_VERIFIED: "DOC_CONTENT_VERIFIED",
  IDENTITY_BINDING_CONFIRMED: "IDENTITY_BINDING_CONFIRMED",

  // Clear negative evidence (Authoritative provider)
  REGISTRY_REVOKED: "REGISTRY_REVOKED",
  REGISTRY_SUSPENDED: "REGISTRY_SUSPENDED",
  REGISTRY_EXPIRED: "REGISTRY_EXPIRED",
  REGISTRY_NAME_MISMATCH: "REGISTRY_NAME_MISMATCH",

  // Routing to Manual Review (Never auto-reject)
  REGISTRY_NOT_FOUND: "REGISTRY_NOT_FOUND",
  REGISTRY_UNAVAILABLE: "REGISTRY_UNAVAILABLE",
  REGISTRY_RATE_LIMITED: "REGISTRY_RATE_LIMITED",
  NO_REGISTRY_PROVIDER_CONFIGURED: "NO_REGISTRY_PROVIDER_CONFIGURED",
  MANUAL_REVIEW_REQUIRED: "MANUAL_REVIEW_REQUIRED",
  PARTIAL_NAME_MATCH: "PARTIAL_NAME_MATCH",
  AUTHORITY_MISMATCH: "AUTHORITY_MISMATCH",

  // Risk Signals
  DUPLICATE_REGISTRATION_NUMBER: "DUPLICATE_REGISTRATION_NUMBER",
  DUPLICATE_FILE_HASH: "DUPLICATE_FILE_HASH",
  ANOMALOUS_METADATA: "ANOMALOUS_METADATA",
  FIELD_EXTRACTION_MISMATCH: "FIELD_EXTRACTION_MISMATCH",
  MISSING_BINDING_EVIDENCE: "MISSING_BINDING_EVIDENCE",

  // System & Operational
  MAX_ATTEMPTS_EXCEEDED: "MAX_ATTEMPTS_EXCEEDED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  ADMIN_OVERRIDE_APPROVED: "ADMIN_OVERRIDE_APPROVED",
  ADMIN_OVERRIDE_REJECTED: "ADMIN_OVERRIDE_REJECTED",
  REVERIFICATION_LAPSED: "REVERIFICATION_LAPSED",
} as const;

export type VerificationReasonCode =
  (typeof VerificationReasonCode)[keyof typeof VerificationReasonCode];

const REASON_MESSAGES: Record<VerificationReasonCode, string> = {
  REGISTRY_MATCH_CONFIRMED: "Registration details matched the official authority record.",
  DOC_CONTENT_VERIFIED: "Uploaded certificate details verified against official licensing standards.",
  IDENTITY_BINDING_CONFIRMED: "Identity verified successfully through secure identity confirmation.",

  REGISTRY_REVOKED: "The professional license has been revoked by the issuing authority.",
  REGISTRY_SUSPENDED: "The professional license is currently suspended by the issuing authority.",
  REGISTRY_EXPIRED: "The professional registration has expired and is no longer active.",
  REGISTRY_NAME_MISMATCH: "The entered name does not match the licensee on record for this registration number.",

  REGISTRY_NOT_FOUND: "The registration number could not be automatically located in the public register. Our compliance team will review your application manually.",
  REGISTRY_UNAVAILABLE: "The issuing authority's automated portal is temporarily unavailable. Your credentials have been routed for manual compliance review.",
  REGISTRY_RATE_LIMITED: "Licensing registry enquiry threshold reached. Queued for standard compliance verification.",
  NO_REGISTRY_PROVIDER_CONFIGURED: "This issuing authority requires direct physical credential verification by our compliance team.",
  MANUAL_REVIEW_REQUIRED: "Your credential submission requires review by the CARENEST medical compliance team.",
  PARTIAL_NAME_MATCH: "Name spelling differs slightly from authority records. Our team is reviewing the discrepancy.",
  AUTHORITY_MISMATCH: "The issuing council selected does not match the registry category. Routed for review.",

  DUPLICATE_REGISTRATION_NUMBER: "This registration number is already associated with an existing account. Routed for identity review.",
  DUPLICATE_FILE_HASH: "This exact certificate file was previously submitted. Routed for manual verification.",
  ANOMALOUS_METADATA: "Document formatting requires additional review by our compliance team.",
  FIELD_EXTRACTION_MISMATCH: "Discrepancy detected between certificate text and submitted profile details. Routed for manual review.",
  MISSING_BINDING_EVIDENCE: "Additional confirmation of identity or physical license verification required.",

  MAX_ATTEMPTS_EXCEEDED: "Automated verification retry limit reached. Routed to our medical compliance team.",
  RATE_LIMIT_EXCEEDED: "Submission limit exceeded for today. Please try again tomorrow.",
  ADMIN_OVERRIDE_APPROVED: "Credentials approved following formal review by CARENEST platform administrator.",
  ADMIN_OVERRIDE_REJECTED: "Credentials declined following formal review by CARENEST platform administrator.",
  REVERIFICATION_LAPSED: "Scheduled periodic license re-verification was unable to confirm active status.",
};

/**
 * Returns a user-safe plain language explanation for a reason code
 */
export function getReasonMessage(code: string): string {
  if (code in REASON_MESSAGES) {
    return REASON_MESSAGES[code as VerificationReasonCode];
  }
  return "Credentials queued for manual medical compliance review.";
}
