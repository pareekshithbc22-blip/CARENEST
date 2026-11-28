/**
 * Caretaker Patient Capacity and Availability Rules
 * Pure functions: Maximum 5 accepted patients per caretaker.
 * Patient count is always derived strictly from ACCEPTED assignments.
 */

export const MAX_CARETAKER_PATIENTS = 5;

export interface CaretakerAvailability {
  count: number;
  max: number;
  availableSlots: number;
  isFull: boolean;
  availabilityLabel: string;
}

export function deriveCaretakerPatientCount(
  input: number | Array<{ status: string }> | undefined | null
): number {
  if (Array.isArray(input)) {
    const acceptedCount = input.filter(
      (a) => a && (a.status === "ACCEPTED" || a.status === "APPROVED")
    ).length;
    return Math.max(0, Math.min(MAX_CARETAKER_PATIENTS, acceptedCount));
  }
  return Math.max(0, Math.min(MAX_CARETAKER_PATIENTS, input || 0));
}

export function canCaretakerAcceptPatient(currentAcceptedCount: number): boolean {
  return (currentAcceptedCount || 0) < MAX_CARETAKER_PATIENTS;
}

export function formatCaretakerAvailability(acceptedCount: number): CaretakerAvailability {
  const count = deriveCaretakerPatientCount(acceptedCount);
  const isFull = count >= MAX_CARETAKER_PATIENTS;
  const availableSlots = Math.max(0, MAX_CARETAKER_PATIENTS - count);

  let availabilityLabel = `${count} of ${MAX_CARETAKER_PATIENTS} patients`;
  if (isFull) {
    availabilityLabel = `Fully booked (${MAX_CARETAKER_PATIENTS} of ${MAX_CARETAKER_PATIENTS} patients)`;
  } else {
    availabilityLabel = `${count} of ${MAX_CARETAKER_PATIENTS} patients, ${availableSlots} slot${availableSlots === 1 ? "" : "s"} free`;
  }

  return {
    count,
    max: MAX_CARETAKER_PATIENTS,
    availableSlots,
    isFull,
    availabilityLabel,
  };
}
