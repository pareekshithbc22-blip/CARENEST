import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Protect route in production: require authenticated ADMIN session
  if (process.env.NODE_ENV === "production") {
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Demo profile connection is disabled in production unless authenticated as Administrator." },
        { status: 403 }
      );
    }
  }

  try {
    // Find all existing care circles in the system (e.g. Eleanor Vance and Arthur Vance)
    const circles = await prisma.careCircle.findMany();

    for (const circle of circles) {
      await prisma.careCircleMember.upsert({
        where: {
          careCircleId_userId: {
            careCircleId: circle.id,
            userId: user.id,
          },
        },
        create: {
          careCircleId: circle.id,
          userId: user.id,
          role: "ADMIN",
          permissions: [
            "CAN_MANAGE_MEDS",
            "CAN_CONFIRM_DOSE",
            "CAN_VIEW_RECORDS",
            "CAN_MANAGE_APPOINTMENTS",
            "CAN_RECEIVE_ESCALATIONS",
            "CAN_MANAGE_CIRCLE",
            "CAN_LOG_CARE_NOTES",
            "CAN_COMPLETE_TASKS",
          ],
        },
        update: {
          isActive: true,
          role: "ADMIN",
        },
      });
    }

    return NextResponse.json({ success: true, message: "Connected to demo Care Circles" });
  } catch (err: any) {
    console.error("[Connect Demo Error]:", err);
    return NextResponse.json({ error: "Failed to connect to demo profiles" }, { status: 500 });
  }
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Demo profile connection is disabled in production unless authenticated as Administrator." },
        { status: 403 }
      );
    }
  }
  return NextResponse.json({ error: "Method not allowed. Use POST to connect demo profiles." }, { status: 405 });
}
