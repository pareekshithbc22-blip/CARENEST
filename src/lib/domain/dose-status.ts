/**
 * Dose Status Derivation and Missed-Dose Grace Period Rules
 * Pure function: calculates live dose status chips and labels.
 */

export const DOSE_GRACE_MINUTES = 15;

export type DerivedDoseStatus = "SCHEDULED" | "TAKEN" | "SKIPPED" | "MISSED" | "OVERDUE" | "PENDING";

export interface DoseStatusInfo {
  status: DerivedDoseStatus;
  statusLabel: string;
  label?: string;
  isActionable: boolean;
  timeString: string;
  isOverdue?: boolean;
  takenBy?: string | null;
  skipReason?: string | null;
}

export function deriveDoseStatus(
  scheduledAt: Date | string,
  rawStatus: string,
  options?: {
    confirmedAt?: Date | string | null;
    takenBy?: string | null;
    confirmationNotes?: string | null;
    skipReason?: string | null;
    effectiveNow?: number;
    referenceTime?: Date | number;
    gracePeriodMinutes?: number;
  }
): DoseStatusInfo {
  const schedDate = typeof scheduledAt === "string" ? new Date(scheduledAt) : scheduledAt;
  const schedMs = schedDate.getTime();
  const refTime = options?.referenceTime
    ? typeof options.referenceTime === "number"
      ? options.referenceTime
      : options.referenceTime.getTime()
    : options?.effectiveNow ?? Date.now();
  const graceMinutes = options?.gracePeriodMinutes ?? DOSE_GRACE_MINUTES;
  const graceWindowMs = graceMinutes * 60 * 1000;

  const timeString = schedDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const upperStatus = (rawStatus || "SCHEDULED").toUpperCase();

  if (upperStatus === "TAKEN") {
    const takenTimeStr = options?.confirmedAt
      ? new Date(options.confirmedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : timeString;
    const actor = options?.takenBy || "patient";
    const label = `Taken at ${takenTimeStr} (by ${actor})`;
    return {
      status: "TAKEN",
      statusLabel: label,
      label,
      takenBy: actor,
      isActionable: false,
      timeString,
      isOverdue: false,
    };
  }

  if (upperStatus === "SKIPPED") {
    const reason = options?.skipReason || options?.confirmationNotes || "Skipped by patient request";
    const cleanReason = reason.replace(/^Skipped:\s*/i, "");
    const label = `Skipped (${cleanReason})`;
    return {
      status: "SKIPPED",
      statusLabel: label,
      label,
      skipReason: cleanReason,
      isActionable: false,
      timeString,
      isOverdue: false,
    };
  }

  if (upperStatus === "MISSED") {
    return {
      status: "MISSED",
      statusLabel: `Missed (${timeString})`,
      label: `Missed (${timeString})`,
      isActionable: false,
      timeString,
      isOverdue: true,
    };
  }

  // Pending / Scheduled: evaluate overdue vs missed
  const diffMs = refTime - schedMs;
  if (diffMs > graceWindowMs) {
    return {
      status: "MISSED",
      statusLabel: `Missed (>15m past ${timeString})`,
      label: `Missed (>15m past ${timeString})`,
      isActionable: false,
      timeString,
      isOverdue: true,
    };
  }

  if (diffMs > 0) {
    return {
      status: "OVERDUE",
      statusLabel: `Due now (${timeString})`,
      label: `Due now (${timeString})`,
      isActionable: true,
      timeString,
      isOverdue: true,
    };
  }

  return {
    status: "PENDING",
    statusLabel: `Scheduled for ${timeString}`,
    label: `Scheduled for ${timeString}`,
    isActionable: true,
    timeString,
    isOverdue: false,
  };
}
