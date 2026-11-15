import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  const filter = searchParams.get("filter") || "all"; // "today", "upcoming", "past", "all"

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const access = await verifyProfileAccess(user.id, profileId, "CAN_VIEW_RECORDS");
  if (!access.authorized) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const whereClause: any = { elderlyProfileId: profileId };

    if (filter === "today") {
      whereClause.scheduledAt = {
        gte: startOfToday,
        lte: endOfToday,
      };
    } else if (filter === "upcoming") {
      whereClause.scheduledAt = { gte: now };
      whereClause.status = "SCHEDULED";
    } else if (filter === "attention") {
      whereClause.status = { in: ["MISSED", "UNCONFIRMED"] };
    }

    const doses = await prisma.scheduledDose.findMany({
      where: whereClause,
      include: {
        medication: {
          include: { stock: true },
        },
        confirmedBy: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json({ doses });
  } catch (err: any) {
    console.error("[Doses GET Error]:", err);
    return NextResponse.json({ error: "Failed to retrieve doses" }, { status: 500 });
  }
}
