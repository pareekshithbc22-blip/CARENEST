/**
 * Per-Day Daily Task Status Derivation Rules
 * Pure function: calculates status of a daily task for a specific calendar day.
 */

export type DailyTaskStatus = "COMPLETED" | "NOT_COMPLETED" | "PENDING";

export interface TaskDayStatusInfo {
  status: DailyTaskStatus;
  label: string;
  completedAt?: string | null;
  completedByName?: string | null;
  completedById?: string | null;
}

export function deriveTaskStatusForDay(
  task: {
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    untilStopped?: boolean;
    stoppedAt?: string | Date | null;
  },
  dateStr: string, // YYYY-MM-DD
  todayStr: string, // YYYY-MM-DD
  completion?: {
    completed: boolean;
    completedAt?: string | Date | null;
    completedByName?: string | null;
    completedById?: string | null;
  } | null
): TaskDayStatusInfo {
  // If completed for this day
  if (completion && completion.completed) {
    const compTime = completion.completedAt
      ? new Date(completion.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "";
    const name = completion.completedByName || "Senior Patient";
    const label = compTime ? `Completed by ${name} at ${compTime}` : `Completed by ${name}`;
    return {
      status: "COMPLETED",
      label,
      completedAt: completion.completedAt ? new Date(completion.completedAt).toISOString() : null,
      completedByName: name,
      completedById: completion.completedById || null,
    };
  }

  // If past day and not completed
  if (dateStr < todayStr) {
    return {
      status: "NOT_COMPLETED",
      label: "Not completed",
      completedAt: null,
      completedByName: null,
      completedById: null,
    };
  }

  // Today or future day
  return {
    status: "PENDING",
    label: "Pending",
    completedAt: null,
    completedByName: null,
    completedById: null,
  };
}
