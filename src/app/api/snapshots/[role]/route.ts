import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getAuthorizedProfiles } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ role: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = await params;
  const normalizedRole = role.toLowerCase();

  // Validate role against user role
  if (
    (normalizedRole === "caretaker" && user.role !== "CARETAKER" && user.role !== "ADMIN") ||
    (normalizedRole === "family" && user.role !== "FAMILY" && user.role !== "ADMIN") ||
    (normalizedRole === "senior" && user.role !== "SENIOR" && user.role !== "ADMIN")
  ) {
    return NextResponse.json({ error: "Role mismatch for snapshot" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const sinceParam = searchParams.get("since");
  const sinceDate = sinceParam ? new Date(sinceParam) : null;
  const now = new Date();

  try {
    // 1. Get authorized profiles for this user
    const authorizedProfiles = await getAuthorizedProfiles(user.id);
    const profileIds = authorizedProfiles.map((p) => p.id);

    if (profileIds.length === 0) {
      return NextResponse.json({
        changed: false,
        serverTime: now.toISOString(),
        profileIds: [],
        doses: [],
        readings: [],
        tasks: [],
        notifications: [],
        unreadNotificationsCount: 0,
      });
    }

    // 2. Query delta for doses
    const doseWhere: any = {
      elderlyProfileId: { in: profileIds },
    };
    if (sinceDate && !isNaN(sinceDate.getTime())) {
      doseWhere.updatedAt = { gt: sinceDate };
    } else {
      // Default to today's doses if no cursor provided
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      doseWhere.scheduledAt = { gte: startOfDay, lte: endOfDay };
    }

    const doses = await prisma.scheduledDose.findMany({
      where: doseWhere,
      include: {
        medication: {
          select: {
            id: true,
            name: true,
            strength: true,
            form: true,
            dosageInstructions: true,
            stockCount: true,
            stock: { select: { currentStock: true, unit: true } },
            assignedBy: { select: { id: true, name: true, role: true } },
            assignedAt: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
      take: 100,
    });

    // 3. Query delta for readings (CareNotes with category HEALTH_UPDATE)
    const readingWhere: any = {
      elderlyProfileId: { in: profileIds },
      category: "HEALTH_UPDATE",
    };
    if (sinceDate && !isNaN(sinceDate.getTime())) {
      readingWhere.updatedAt = { gt: sinceDate };
    }

    const readings = await prisma.careNote.findMany({
      where: readingWhere,
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // 4. Query delta for tasks
    const taskWhere: any = {
      elderlyProfileId: { in: profileIds },
    };
    if (sinceDate && !isNaN(sinceDate.getTime())) {
      taskWhere.updatedAt = { gt: sinceDate };
    }

    const tasks = await prisma.careTask.findMany({
      where: taskWhere,
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        completedBy: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 50,
    });

    // 5. Query user notifications
    const notifWhere: any = {
      userId: user.id,
    };
    if (sinceDate && !isNaN(sinceDate.getTime())) {
      notifWhere.createdAt = { gt: sinceDate };
    }

    const notifications = await prisma.notification.findMany({
      where: notifWhere,
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    const unreadNotificationsCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    // Check if any record changed when sinceDate was provided
    if (sinceDate && !isNaN(sinceDate.getTime())) {
      const hasChanges =
        doses.length > 0 ||
        readings.length > 0 ||
        tasks.length > 0 ||
        notifications.length > 0;

      if (!hasChanges) {
        return NextResponse.json({
          changed: false,
          serverTime: now.toISOString(),
          unreadNotificationsCount,
        });
      }
    }

    // Format readings
    const formattedReadings = readings.map((n) => {
      const v = (n.vitalSigns || {}) as Record<string, unknown>;
      return {
        id: n.id,
        elderlyProfileId: n.elderlyProfileId,
        timestamp: n.createdAt.toISOString(),
        bloodGlucose: typeof v.bloodGlucose === "number" ? v.bloodGlucose : null,
        bloodPressure: (v.bloodPressure as string) || (v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : null),
        systolic: typeof v.systolic === "number" ? v.systolic : null,
        diastolic: typeof v.diastolic === "number" ? v.diastolic : null,
        sugarSeverity: v.sugarSeverity || "NORMAL",
        bpSeverity: v.bpSeverity || "NORMAL",
        overallSeverity: v.overallSeverity || "NORMAL",
        notes: n.content,
        authorName: n.author?.name || "Care Staff",
      };
    });

    return NextResponse.json({
      changed: true,
      serverTime: now.toISOString(),
      profileIds,
      doses: doses.map((d) => ({
        id: d.id,
        elderlyProfileId: d.elderlyProfileId,
        medicationId: d.medicationId,
        medicationName: d.medication.name,
        strength: d.medication.strength,
        form: d.medication.form,
        scheduledAt: d.scheduledAt.toISOString(),
        status: d.status,
        confirmedAt: d.confirmedAt ? d.confirmedAt.toISOString() : null,
        takenBy: d.takenBy || null,
        confirmationNotes: d.confirmationNotes || null,
        stockCount: d.medication.stockCount ?? d.medication.stock?.currentStock ?? null,
        assignedBy: d.medication.assignedBy?.name || null,
        assignedAt: d.medication.assignedAt ? d.medication.assignedAt.toISOString() : null,
      })),
      readings: formattedReadings,
      tasks: tasks.map((t) => ({
        id: t.id,
        elderlyProfileId: t.elderlyProfileId,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate.toISOString(),
        priority: t.priority,
        status: t.status,
        assignedToName: t.assignedTo?.name || null,
        completedByName: t.completedBy?.name || null,
      })),
      notifications,
      unreadNotificationsCount,
    });
  } catch (err: any) {
    console.error("[Snapshot GET Error]:", err);
    return NextResponse.json({ error: "Failed to generate snapshot" }, { status: 500 });
  }
}
