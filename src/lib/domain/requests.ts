/**
 * Caretaker Request State Machine and History Rules
 * Pure functions: PENDING, ACCEPTED, REJECTED, CANCELLED, REVOKED
 */

export type RequestState = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "REVOKED";

export interface RequestTransitionResult {
  allowed: boolean;
  error?: string;
}

export function canTransitionRequest(
  currentState: RequestState,
  targetState: RequestState
): RequestTransitionResult {
  if (currentState === targetState) {
    return { allowed: false, error: `Request is already ${currentState}` };
  }

  switch (currentState) {
    case "PENDING":
      if (targetState === "ACCEPTED" || targetState === "REJECTED" || targetState === "CANCELLED") {
        return { allowed: true };
      }
      return { allowed: false, error: `Cannot transition from PENDING to ${targetState}` };

    case "ACCEPTED":
      if (targetState === "REVOKED") {
        return { allowed: true };
      }
      return { allowed: false, error: `Accepted assignment can only be REVOKED, not ${targetState}` };

    case "REJECTED":
    case "CANCELLED":
    case "REVOKED":
      return { allowed: false, error: `Terminal request state ${currentState} cannot be transitioned to ${targetState}` };

    default:
      return { allowed: false, error: `Unknown request state: ${currentState}` };
  }
}

export function isCaretakerDeclined(
  declinedCaretakerIds: string[] | undefined | null,
  caretakerId: string
): boolean {
  if (!declinedCaretakerIds || !Array.isArray(declinedCaretakerIds)) return false;
  return declinedCaretakerIds.includes(caretakerId);
}

export function redactPatientDetailsForRequest(patient: {
  name: string;
  age?: number | null;
  patientCode?: string | null;
  familyAdminName?: string | null;
  [key: string]: any;
}): {
  name: string;
  age: number | null;
  patientCode: string | null;
  familyAdminName: string | null;
} {
  return {
    name: patient.name,
    age: patient.age ?? null,
    patientCode: patient.patientCode || null,
    familyAdminName: patient.familyAdminName || null,
  };
}
