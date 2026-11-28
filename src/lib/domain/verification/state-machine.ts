/**
 * Verification Case State Machine.
 * Enforces allowed status transitions strictly.
 */

export type VerificationCaseStatus =
  | "SUBMITTED"
  | "PROCESSING"
  | "AUTO_APPROVED"
  | "AUTO_REJECTED"
  | "MANUAL_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";

const ALLOWED_TRANSITIONS: Record<VerificationCaseStatus, VerificationCaseStatus[]> = {
  SUBMITTED: ["PROCESSING", "MANUAL_REVIEW"],
  PROCESSING: ["AUTO_APPROVED", "AUTO_REJECTED", "MANUAL_REVIEW"],
  MANUAL_REVIEW: ["APPROVED", "REJECTED"],
  AUTO_APPROVED: ["EXPIRED"],
  APPROVED: ["EXPIRED"],
  AUTO_REJECTED: ["SUBMITTED", "MANUAL_REVIEW"], // Caretaker can resubmit or appeal for manual review
  REJECTED: ["SUBMITTED"],                      // Caretaker can resubmit with corrected documents
  EXPIRED: ["SUBMITTED"],                       // Caretaker can re-apply upon license renewal
};

/**
 * Checks if a transition between two verification statuses is permissible
 */
export function canTransition(from: VerificationCaseStatus, to: VerificationCaseStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

/**
 * Validates a transition and throws an explicit error if illegal
 */
export function assertValidTransition(
  from: VerificationCaseStatus,
  to: VerificationCaseStatus
): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Illegal verification status transition: Cannot transition from '${from}' to '${to}'.`
    );
  }
}
