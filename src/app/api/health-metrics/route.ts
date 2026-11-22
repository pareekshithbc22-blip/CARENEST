import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { HealthMeasurementCreateSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { evaluateBloodSugar, evaluateBloodPressure } from "@/lib/config";
import { sendAbnormalReadingAlertEmail } from "@/lib/email/service";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  const timeframe = searchParams.get("timeframe") || "7d"; // "today" | "7d" | "30d" | "all"
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const access = await verifyProfileAccess(user.id, profileId, "CAN_VIEW_RECORDS");
  if (!access.authorized) {
    return NextResponse.json({ error: "Access denied to patient records" }, { status: 403 });
  }

  try {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) {
      startDate = new Date(startDateParam);
    } else if (timeframe === "today") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeframe === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    if (endDateParam) {
      endDate = new Date(endDateParam);
    }

    const whereClause: any = {
      elderlyProfileId: profileId,
      category: "HEALTH_UPDATE",
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    // Query health updates with cursor pagination
    const notes = await prisma.careNote.findMany({
      where: whereClause,
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = notes.length > limit;
    const items = hasMore ? notes.slice(0, limit) : notes;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const parsedHistory = items
      .filter((n) => n.vitalSigns !== null && typeof n.vitalSigns === "object")
      .map((n) => {
        const v = (n.vitalSigns || {}) as Record<string, unknown>;
        const rawDate = new Date(n.createdAt);

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

        const bloodGlucose = typeof v.bloodGlucose === "number" ? v.bloodGlucose : null;
        const sugarEvaluation = evaluateBloodSugar(bloodGlucose);
        const bpEvaluation = evaluateBloodPressure(systolic, diastolic);

        return {
          id: n.id,
          timestamp: rawDate.toISOString(),
          dateFormatted: rawDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          timeFormatted: rawDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          bloodGlucose,
          bloodPressure: bloodPressureStr,
          systolic,
          diastolic,
          temperature: typeof v.temperature === "number" ? v.temperature : null,
          oxygenSaturation: typeof v.oxygenSaturation === "number" ? v.oxygenSaturation : null,
          weight: typeof v.weight === "number" ? v.weight : null,
          source: typeof v.source === "string" ? v.source : "Manual Entry",
          notes: n.content,
          authorName: n.author?.name || "Care Staff",
          sugarEvaluation,
          bpEvaluation,
        };
      })
      .filter((m) => m.bloodGlucose !== null || m.bloodPressure !== null);

    // Latest reading from all notes for this patient
    const latestNote = await prisma.careNote.findFirst({
      where: {
        elderlyProfileId: profileId,
        category: "HEALTH_UPDATE",
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    let latestParsed = null;
    if (latestNote && latestNote.vitalSigns && typeof latestNote.vitalSigns === "object") {
      const v = latestNote.vitalSigns as Record<string, unknown>;
      const rawDate = new Date(latestNote.createdAt);
      let sys = typeof v.systolic === "number" ? v.systolic : null;
      let dia = typeof v.diastolic === "number" ? v.diastolic : null;
      if (typeof v.bloodPressure === "string" && (!sys || !dia)) {
        const parts = v.bloodPressure.split("/");
        if (parts.length === 2) {
          sys = parseInt(parts[0].trim(), 10) || null;
          dia = parseInt(parts[1].trim(), 10) || null;
        }
      }
      const glucose = typeof v.bloodGlucose === "number" ? v.bloodGlucose : null;
      latestParsed = {
        id: latestNote.id,
        timestamp: rawDate.toISOString(),
        dateFormatted: rawDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        timeFormatted: rawDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        bloodGlucose: glucose,
        bloodPressure: sys && dia ? `${sys}/${dia}` : (v.bloodPressure as string) || null,
        systolic: sys,
        diastolic: dia,
        sugarEvaluation: evaluateBloodSugar(glucose),
        bpEvaluation: evaluateBloodPressure(sys, dia),
        authorName: latestNote.author?.name || "Care Staff",
      };
    }

    return NextResponse.json({
      profileId,
      timeframe,
      latest: latestParsed,
      history: parsedHistory,
      nextCursor,
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
    if (!access.authorized || !access.profile) {
      return NextResponse.json({ error: "Access denied to patient profile" }, { status: 403 });
    }

    const patientProfile = access.profile;

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

    // Clinical evaluation
    const sugarEval = evaluateBloodSugar(data.bloodGlucose);
    const bpEval = evaluateBloodPressure(systolic, diastolic);

    let highestSeverity: "NORMAL" | "WARNING" | "CRITICAL" = "NORMAL";
    if (sugarEval.severity === "CRITICAL" || bpEval.severity === "CRITICAL") {
      highestSeverity = "CRITICAL";
    } else if (sugarEval.severity === "WARNING" || bpEval.severity === "WARNING") {
      highestSeverity = "WARNING";
    }

    const note = await prisma.$transaction(async (tx) => {
      const newNote = await tx.careNote.create({
        data: {
          elderlyProfileId: data.elderlyProfileId,
          authorId: user.id,
          category: "HEALTH_UPDATE",
          title: highestSeverity !== "NORMAL" ? `Abnormal Vitals Alert (${highestSeverity})` : "Health Measurement Recorded",
          content: data.notes || `Health measurement recorded by ${user.name} (${source})`,
          vitalSigns: {
            bloodGlucose: data.bloodGlucose ?? undefined,
            systolic: systolic ?? undefined,
            diastolic: diastolic ?? undefined,
            bloodPressure: bpString ?? undefined,
            temperature: data.temperature ?? undefined,
            oxygenSaturation: data.oxygenSaturation ?? undefined,
            weight: data.weight ?? undefined,
            source,
            recordedAt: recordTime.toISOString(),
            sugarSeverity: sugarEval.severity,
            bpSeverity: bpEval.severity,
            overallSeverity: highestSeverity,
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
            bloodGlucose: data.bloodGlucose,
            bloodPressure: bpString,
            severity: highestSeverity,
            source,
          },
        },
      });

      return newNote;
    });

    // If abnormal reading, trigger notifications
    if (highestSeverity !== "NORMAL") {
      // Find all caretakers and family members linked to patient
      const careCircleMembers = await prisma.careCircleMember.findMany({
        where: {
          careCircle: { elderlyProfileId: data.elderlyProfileId },
          isActive: true,
        },
        include: { user: true },
      });

      const approvedRequests = await prisma.patientAccessRequest.findMany({
        where: {
          elderlyProfileId: data.elderlyProfileId,
          status: "APPROVED",
        },
        include: { caretaker: true, familyAdmin: true },
      });

      const recipientsMap = new Map<string, { id: string; email: string; name: string; role: string }>();

      // WARNING: notify Caretakers
      // CRITICAL: notify Caretakers AND Family Administrators
      for (const m of careCircleMembers) {
        if (m.user.id === user.id) continue; // Don't notify the person who just entered it
        if (m.role === "CARETAKER") {
          recipientsMap.set(m.user.id, m.user);
        } else if ((m.role === "ADMIN" || m.role === "FAMILY_MEMBER") && highestSeverity === "CRITICAL") {
          recipientsMap.set(m.user.id, m.user);
        }
      }

      for (const req of approvedRequests) {
        if (req.caretaker && req.caretaker.id !== user.id) {
          recipientsMap.set(req.caretaker.id, req.caretaker);
        }
        if (req.familyAdmin && req.familyAdmin.id !== user.id && highestSeverity === "CRITICAL") {
          recipientsMap.set(req.familyAdmin.id, req.familyAdmin);
        }
      }

      // Check 30-minute email rate limit for this patient and event type
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentEmailCount = await prisma.notification.count({
        where: {
          elderlyProfileId: data.elderlyProfileId,
          type: "ESCALATION_WARNING",
          emailSent: true,
          createdAt: { gte: thirtyMinutesAgo },
        },
      });
      const canSendEmail = highestSeverity === "CRITICAL" && recentEmailCount === 0;

      const evalDetail = [
        sugarEval.isAbnormal ? sugarEval.message : null,
        bpEval.isAbnormal ? bpEval.message : null,
      ]
        .filter(Boolean)
        .join("; ");

      for (const recipient of recipientsMap.values()) {
        const dedupKey = `abnormal-vital-${note.id}-${recipient.id}`;
        let emailSentStatus = false;

        if (canSendEmail) {
          try {
            await sendAbnormalReadingAlertEmail({
              to: recipient.email,
              seniorName: patientProfile.name,
              vitalType: sugarEval.isAbnormal ? "Blood Sugar" : "Blood Pressure",
              readingValue: sugarEval.isAbnormal
                ? `${data.bloodGlucose} mg/dL`
                : bpString || `${systolic}/${diastolic} mmHg`,
              severity: highestSeverity,
              message: evalDetail || "Abnormal clinical vital measurement recorded.",
            });
            emailSentStatus = true;
          } catch (mailErr) {
            console.error("[Abnormal Vital Email Error]:", mailErr);
          }
        }

        try {
          await prisma.notification.upsert({
            where: { dedupKey },
            create: {
              userId: recipient.id,
              elderlyProfileId: data.elderlyProfileId,
              type: "ESCALATION_WARNING",
              title: `${highestSeverity === "CRITICAL" ? "🚨 Critical" : "⚠️ Warning"}: Abnormal Vitals for ${patientProfile.name}`,
              message: `${evalDetail}. Recorded by ${user.name}.`,
              dedupKey,
              emailSent: emailSentStatus,
              data: {
                noteId: note.id,
                severity: highestSeverity,
                bloodGlucose: data.bloodGlucose,
                bloodPressure: bpString,
                sugarEvaluation: sugarEval,
                bpEvaluation: bpEval,
              } as any,
            },
            update: {},
          });
        } catch (notifErr) {
          console.error("[Abnormal Vital Notification Error]:", notifErr);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        measurement: {
          id: note.id,
          timestamp: recordTime.toISOString(),
          bloodGlucose: data.bloodGlucose,
          bloodPressure: bpString,
          systolic,
          diastolic,
          source,
          notes: data.notes,
          sugarEvaluation: sugarEval,
          bpEvaluation: bpEval,
          severity: highestSeverity,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("[Health Metrics POST Error]:", err);
    return NextResponse.json({ error: "Failed to record health measurement" }, { status: 500 });
  }
}
