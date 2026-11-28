import { prisma } from "@/lib/prisma";
import { evaluateBloodSugar, evaluateBloodPressure } from "@/lib/domain/clinical-thresholds";

export type HealthMetricsRange = "live" | "24h" | "7d" | "14d";

export interface FormattedVitalReading {
  id: string;
  timestamp: string;
  timeFormatted: string;
  dateFormatted: string;
  bloodGlucose: number | null;
  bloodPressure: string | null;
  systolic: number | null;
  diastolic: number | null;
  sugarSeverity: "NORMAL" | "WARNING" | "CRITICAL";
  bpSeverity: "NORMAL" | "WARNING" | "CRITICAL";
  authorName: string;
  notes?: string | null;
}

export async function getPatientHealthMetricsByRange(
  elderlyProfileId: string,
  range: HealthMetricsRange = "live"
): Promise<{
  readings: FormattedVitalReading[];
  lastUpdated: string | null;
  count: number;
}> {
  const now = new Date();
  const whereClause: any = {
    elderlyProfileId,
    category: "HEALTH_UPDATE",
    vitalSigns: { not: null },
  };

  if (range === "24h") {
    whereClause.createdAt = { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) };
  } else if (range === "7d") {
    whereClause.createdAt = { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
  } else if (range === "14d") {
    whereClause.createdAt = { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) };
  }

  const take = range === "live" ? 20 : range === "24h" ? 50 : 100;

  const notes = await prisma.careNote.findMany({
    where: whereClause,
    include: {
      author: {
        select: { id: true, name: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  const formatted: FormattedVitalReading[] = notes
    .map((n) => {
      const v = (n.vitalSigns || {}) as Record<string, any>;
      const glucose = typeof v.bloodGlucose === "number" ? v.bloodGlucose : null;
      const sys = typeof v.systolic === "number" ? v.systolic : null;
      const dia = typeof v.diastolic === "number" ? v.diastolic : null;
      const bpStr =
        typeof v.bloodPressure === "string"
          ? v.bloodPressure
          : sys && dia
          ? `${sys}/${dia}`
          : null;

      const sugarEval = evaluateBloodSugar(glucose);
      const bpEval = evaluateBloodPressure(sys, dia);

      const d = new Date(n.createdAt);
      return {
        id: n.id,
        timestamp: d.toISOString(),
        timeFormatted: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        dateFormatted: d.toLocaleDateString([], { month: "short", day: "numeric" }),
        bloodGlucose: glucose,
        bloodPressure: bpStr,
        systolic: sys,
        diastolic: dia,
        sugarSeverity: sugarEval.severity,
        bpSeverity: bpEval.severity,
        authorName: n.author?.name || "Care Staff",
        notes: n.content,
      };
    })
    .reverse(); // Chronological for line charts

  return {
    readings: formatted,
    lastUpdated: formatted.length > 0 ? formatted[formatted.length - 1].timestamp : null,
    count: formatted.length,
  };
}
