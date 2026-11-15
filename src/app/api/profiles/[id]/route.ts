import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const access = await verifyProfileAccess(user.id, id, "CAN_VIEW_RECORDS");
  if (!access.authorized || !access.profile) {
    return NextResponse.json({ error: "Access denied or profile not found" }, { status: 403 });
  }

  try {
    const fullProfile = await prisma.elderlyProfile.findUnique({
      where: { id },
      include: {
        careCircles: {
          include: {
            members: {
              where: { isActive: true },
              include: {
                user: {
                  select: { id: true, name: true, email: true, role: true, avatarUrl: true, phoneNumber: true },
                },
              },
            },
            invitations: {
              where: { status: "PENDING" },
            },
          },
        },
        medications: {
          where: { isArchived: false },
          include: { stock: true, schedules: true },
        },
        appointments: {
          orderBy: { appointmentDate: "asc" },
          take: 10,
        },
      },
    });

    return NextResponse.json({ profile: fullProfile });
  } catch (err: any) {
    console.error("[Profile GET by ID Error]:", err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
