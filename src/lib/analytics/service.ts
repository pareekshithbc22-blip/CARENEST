import { prisma } from "../prisma";

export interface AdherenceMetrics {
  totalScheduled: number;
  totalTaken: number;
  totalMissed: number;
  totalSkipped: number;
  totalUnconfirmed: number;
  adherencePercentage: number;
  trendLast7Days: Array<{
    date: string;
    dayName: string;
    taken: number;
    missed: number;
    skipped: number;
    total: number;
    rate: number;
  }>;
  statusDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: "DOSE_CONFIRMED" | "DOSE_MISSED" | "DOSE_SKIPPED" | "CARE_NOTE" | "CARE_TASK" | "APPOINTMENT" | "SYSTEM_AUDIT";
  title: string;
  description: string;
  actorName?: string;
  severity: "info" | "success" | "warning" | "danger";
  metadata?: Record<string, any>;
}

/**
 * Calculates genuine adherence analytics directly from database records.
 */
export async function getProfileAnalytics(
  elderlyProfileId: string,
  daysLookback = 14
): Promise<AdherenceMetrics> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysLookback);
  startDate.setHours(0, 0, 0, 0);

  const doses = await prisma.scheduledDose.findMany({
    where: {
      elderlyProfileId,
      scheduledAt: { gte: startDate },
    },
    include: {
      medication: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  let totalTaken = 0;
  let totalMissed = 0;
  let totalSkipped = 0;
  let totalUnconfirmed = 0;
  const totalScheduled = doses.length;

  for (const dose of doses) {
    if (dose.status === "TAKEN") totalTaken++;
    else if (dose.status === "MISSED") totalMissed++;
    else if (dose.status === "SKIPPED") totalSkipped++;
    else if (dose.status === "UNCONFIRMED") totalUnconfirmed++;
  }

  const denominator = totalTaken + totalMissed + totalSkipped;
  const adherencePercentage =
    denominator > 0 ? Math.round((totalTaken / denominator) * 100) : 100;

  // Build 7-day trend array
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const trendMap = new Map<string, { taken: number; missed: number; skipped: number; total: number; dayName: string }>();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    trendMap.set(key, {
      taken: 0,
      missed: 0,
      skipped: 0,
      total: 0,
      dayName: dayNames[d.getDay()],
    });
  }

  for (const dose of doses) {
    const dateKey = new Date(dose.scheduledAt).toISOString().split("T")[0];
    const dayData = trendMap.get(dateKey);
    if (dayData) {
      dayData.total++;
      if (dose.status === "TAKEN") dayData.taken++;
      else if (dose.status === "MISSED") dayData.missed++;
      else if (dose.status === "SKIPPED") dayData.skipped++;
    }
  }

  const trendLast7Days = Array.from(trendMap.entries()).map(([date, d]) => {
    const dayDenom = d.taken + d.missed + d.skipped;
    const rate = dayDenom > 0 ? Math.round((d.taken / dayDenom) * 100) : (d.total > 0 ? 0 : 100);
    return {
      date,
      dayName: d.dayName,
      taken: d.taken,
      missed: d.missed,
      skipped: d.skipped,
      total: d.total,
      rate,
    };
  });

  const statusDistribution = [
    { name: "Confirmed Taken", value: totalTaken, color: "#0f766e" },
    { name: "Missed", value: totalMissed, color: "#dc2626" },
    { name: "Skipped (Clinical)", value: totalSkipped, color: "#d97706" },
    { name: "Unconfirmed", value: totalUnconfirmed, color: "#ea580c" },
  ].filter((item) => item.value > 0);

  if (statusDistribution.length === 0) {
    statusDistribution.push({ name: "Scheduled Active", value: totalScheduled || 1, color: "#0284c7" });
  }

  return {
    totalScheduled,
    totalTaken,
    totalMissed,
    totalSkipped,
    totalUnconfirmed,
    adherencePercentage,
    trendLast7Days,
    statusDistribution,
  };
}

/**
 * Aggregates a multi-source chronological Healthcare Timeline.
 */
export async function getProfileTimeline(
  elderlyProfileId: string,
  limit = 25
): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  // 1. Doses
  const recentDoses = await prisma.scheduledDose.findMany({
    where: {
      elderlyProfileId,
      status: { not: "SCHEDULED" },
    },
    include: {
      medication: true,
      confirmedBy: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 15,
  });

  for (const dose of recentDoses) {
    if (dose.status === "TAKEN") {
      events.push({
        id: `dose-${dose.id}`,
        timestamp: (dose.confirmedAt || dose.updatedAt).toISOString(),
        type: "DOSE_CONFIRMED",
        title: `Dose Administered: ${dose.medication.name} (${dose.medication.strength})`,
        description: dose.confirmationNotes || `Confirmed on schedule at ${new Date(dose.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        actorName: dose.confirmedBy?.name || "Self (Senior Mode)",
        severity: "success",
      });
    } else if (dose.status === "MISSED") {
      events.push({
        id: `dose-${dose.id}`,
        timestamp: dose.updatedAt.toISOString(),
        type: "DOSE_MISSED",
        title: `Missed Dose Alert: ${dose.medication.name}`,
        description: `Scheduled at ${new Date(dose.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} was not confirmed. Escalation logged.`,
        severity: "danger",
      });
    } else if (dose.status === "SKIPPED") {
      events.push({
        id: `dose-${dose.id}`,
        timestamp: dose.updatedAt.toISOString(),
        type: "DOSE_SKIPPED",
        title: `Dose Skipped: ${dose.medication.name}`,
        description: dose.confirmationNotes || "Skipped dose recorded per clinical observation.",
        actorName: dose.confirmedBy?.name,
        severity: "warning",
      });
    }
  }

  // 2. Care Notes
  const careNotes = await prisma.careNote.findMany({
    where: { elderlyProfileId },
    include: { author: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  for (const note of careNotes) {
    events.push({
      id: `note-${note.id}`,
      timestamp: note.createdAt.toISOString(),
      type: "CARE_NOTE",
      title: `${note.category.replace("_", " ")}: ${note.title}`,
      description: note.content,
      actorName: note.author.name,
      severity: note.category === "INCIDENT" ? "danger" : "info",
      metadata: note.vitalSigns as Record<string, any> || undefined,
    });
  }

  // 3. Care Tasks completed
  const tasks = await prisma.careTask.findMany({
    where: {
      elderlyProfileId,
      status: "COMPLETED",
    },
    include: { completedBy: true },
    orderBy: { completedAt: "desc" },
    take: 8,
  });

  for (const task of tasks) {
    if (task.completedAt) {
      events.push({
        id: `task-${task.id}`,
        timestamp: task.completedAt.toISOString(),
        type: "CARE_TASK",
        title: `Care Task Completed: ${task.title}`,
        description: task.notes || task.description || "Care task completed successfully.",
        actorName: task.completedBy?.name,
        severity: "success",
      });
    }
  }

  // 4. Appointments
  const appointments = await prisma.appointment.findMany({
    where: { elderlyProfileId },
    orderBy: { appointmentDate: "desc" },
    take: 6,
  });

  for (const appt of appointments) {
    events.push({
      id: `appt-${appt.id}`,
      timestamp: appt.appointmentDate.toISOString(),
      type: "APPOINTMENT",
      title: `Healthcare Visit: ${appt.title}`,
      description: `${appt.doctorName} at ${appt.clinicName}. Status: ${appt.status}`,
      severity: appt.status === "COMPLETED" ? "success" : "info",
    });
  }

  // Sort descending by timestamp
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events.slice(0, limit);
}
