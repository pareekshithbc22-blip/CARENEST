import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { HealthMeasurementCreateSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  const timeframe = searchParams.get("timeframe") || "7d"; // "today" | "7d" | "30d"

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const access = await verifyProfileAccess(user.id, profileId, "CAN_VIEW_RECORDS");
  if (!access.authorized) {
    return NextResponse.json({ error: "Access denied to patient records" }, { status: 403 });
  }

  try {
    const now = new Date();
    let startDate: Date;

    if (timeframe === "today") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      // Default 7 days
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Query health updates and care notes with vitals
    const notes = await prisma.careNote.findMany({
      where: {
        elderlyProfileId: profileId,
        createdAt: { gte: startDate },
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const parsedHistory = notes
      .filter((n) => n.vitalSigns !== null && typeof n.vitalSigns === "object")
      .map((n) => {
        const v = (n.vitalSigns || {}) as Record<string, unknown>;
        const rawDate = new Date(n.createdAt);

        // Extract systolic / diastolic if stored or parsed from "120/80" string
        let systolic: number | null = typeof v.systolic === "number" ? v.systolic : null;
        let diastolic: number | null = typeof v.diastolic === "number" ? v.diastolic : null;

        if (typeof v.bloodPressure === "string" && (!systolic || !diastolic)) {
          const parts = v.bloodPressure.split("/");
          if (parts.length === 2) {
            const sys = parseInt(parts[0].trim(), 10);
            const dia = parseInt(parts[1].trim(), 10);
            if (!isNaN(sys)) systolic = sys;
            if (!isNaN(dia)) diastolic = dia;
          }
        }

        const bloodPressureStr =
          typeof v.bloodPressure === "string"
            ? v.bloodPressure
            : systolic && diastolic
            ? `${systolic}/${diastolic}`
            : null;

        return {
          id: n.id,
          timestamp: rawDate.toISOString(),
          dateFormatted: rawDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          timeFormatted: rawDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          heartRate: typeof v.heartRate === "number" ? v.heartRate : null,
          bloodGlucose: typeof v.bloodGlucose === "number" ? v.bloodGlucose : null,
          bloodPressure: bloodPressureStr,
          systolic,
          diastolic,
          temperature: typeof v.temperature === "number" ? v.temperature : null,
          oxygenSaturation: typeof v.oxygenSaturation === "number" ? v.oxygenSaturation : null,
          weight: typeof v.weight === "number" ? v.weight : null,
          source: typeof v.source === "string" ? v.source : "Manual Entry",
          notes: n.content,
          authorName: n.author?.name || "Care Staff",
        };
      })
      .filter(
        (m) =>
          m.heartRate !== null ||
          m.bloodGlucose !== null ||
          m.bloodPressure !== null ||
          m.temperature !== null ||
          m.oxygenSaturation !== null ||
          m.weight !== null
      );

    const latest = parsedHistory.length > 0 ? parsedHistory[parsedHistory.length - 1] : null;
    const previous = parsedHistory.length > 1 ? parsedHistory[parsedHistory.length - 2] : null;

    return NextResponse.json({
      profileId,
      timeframe,
      latest,
      previous,
      history: parsedHistory,
      totalCount: parsedHistory.length,
    });
  } catch (err: unknown) {
    console.error("[Health Metrics GET Error]:", err);
    return NextResponse.json({ error: "Failed to retrieve health measurements" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = HealthMeasurementCreateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const data = validated.data;
    const access = await verifyProfileAccess(user.id, data.elderlyProfileId, "CAN_VIEW_RECORDS");
    if (!access.authorized) {
      return NextResponse.json({ error: "Access denied to patient profile" }, { status: 403 });
    }

    // Determine systolic/diastolic and BP string
    let systolic = data.systolic ?? null;
    let diastolic = data.diastolic ?? null;
    let bpString = data.bloodPressure || null;

    if (bpString && (!systolic || !diastolic)) {
      const parts = bpString.split("/");
      if (parts.length === 2) {
        const sys = parseInt(parts[0].trim(), 10);
        const dia = parseInt(parts[1].trim(), 10);
        if (!isNaN(sys)) systolic = sys;
        if (!isNaN(dia)) diastolic = dia;
      }
    } else if (systolic && diastolic && !bpString) {
      bpString = `${systolic}/${diastolic}`;
    }

    const source =
      data.source ||
      (user.role === "SENIOR"
        ? "Senior Patient (Self-Reported)"
        : user.role === "CARETAKER"
        ? "Caretaker / Nurse Observation"
        : "Family Coordinator");

    const recordTime = data.recordedAt ? new Date(data.recordedAt) : new Date();

    const note = await prisma.$transaction(async (tx) => {
      const newNote = await tx.careNote.create({
        data: {
          elderlyProfileId: data.elderlyProfileId,
          authorId: user.id,
          category: "HEALTH_UPDATE",
          title: "Health Measurement Recorded",
          content: data.notes || `Health measurement recorded by ${user.name} (${source})`,
          vitalSigns: {
            heartRate: data.heartRate ?? undefined,
            bloodGlucose: data.bloodGlucose ?? undefined,
            systolic: systolic ?? undefined,
            diastolic: diastolic ?? undefined,
            bloodPressure: bpString ?? undefined,
            temperature: data.temperature ?? undefined,
            oxygenSaturation: data.oxygenSaturation ?? undefined,
            weight: data.weight ?? undefined,
            source,
            recordedAt: recordTime.toISOString(),
          },
          createdAt: recordTime,
        },
        include: {
          author: { select: { id: true, name: true, role: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          elderlyProfileId: data.elderlyProfileId,
          userId: user.id,
          action: "HEALTH_MEASUREMENT_RECORDED",
          entityType: "CareNote",
          entityId: newNote.id,
          details: {
            heartRate: data.heartRate,
            bloodGlucose: data.bloodGlucose,
            bloodPressure: bpString,
            temperature: data.temperature,
            oxygenSaturation: data.oxygenSaturation,
            source,
          },
        },
      });

      return newNote;
    });

    return NextResponse.json(
      {
        success: true,
        measurement: {
          id: note.id,
          timestamp: recordTime.toISOString(),
          heartRate: data.heartRate,
          bloodGlucose: data.bloodGlucose,
          bloodPressure: bpString,
          systolic,
          diastolic,
          temperature: data.temperature,
          oxygenSaturation: data.oxygenSaturation,
          weight: data.weight,
          source,
          notes: data.notes,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[Health Metrics POST Error]:", err);
    return NextResponse.json({ error: "Failed to record health measurement" }, { status: 500 });
  }
}
