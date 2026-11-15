import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in or create an account to accept this invitation" }, { status: 401 });
  }

  const { token } = await params;

  try {
    const invitation = await prisma.careCircleInvitation.findUnique({
      where: { token },
      include: {
        careCircle: {
          include: { elderlyProfile: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid or nonexistent invitation token" }, { status: 404 });
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: `This invitation is no longer valid (Status: ${invitation.status})` },
        { status: 400 }
      );
    }

    const now = new Date();
    if (now > invitation.expiresAt) {
      await prisma.careCircleInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "This invitation link has expired" }, { status: 410 });
    }

    // Role-specific default permissions
    let permissions = ["CAN_VIEW_RECORDS", "CAN_CONFIRM_DOSE"];
    if (invitation.role === "ADMIN") {
      permissions = [
        "CAN_MANAGE_MEDS",
        "CAN_CONFIRM_DOSE",
        "CAN_VIEW_RECORDS",
        "CAN_MANAGE_APPOINTMENTS",
        "CAN_RECEIVE_ESCALATIONS",
        "CAN_MANAGE_CIRCLE",
        "CAN_LOG_CARE_NOTES",
        "CAN_COMPLETE_TASKS",
      ];
    } else if (invitation.role === "CARETAKER") {
      permissions = [
        "CAN_CONFIRM_DOSE",
        "CAN_VIEW_RECORDS",
        "CAN_LOG_CARE_NOTES",
        "CAN_COMPLETE_TASKS",
        "CAN_RECEIVE_ESCALATIONS",
      ];
    } else if (invitation.role === "FAMILY_MEMBER") {
      permissions = [
        "CAN_VIEW_RECORDS",
        "CAN_CONFIRM_DOSE",
        "CAN_RECEIVE_ESCALATIONS",
      ];
    }

    await prisma.$transaction(async (tx) => {
      // Upsert membership
      await tx.careCircleMember.upsert({
        where: {
          careCircleId_userId: {
            careCircleId: invitation.careCircleId,
            userId: user.id,
          },
        },
        create: {
          careCircleId: invitation.careCircleId,
          userId: user.id,
          role: invitation.role,
          permissions,
          isActive: true,
        },
        update: {
          role: invitation.role,
          permissions,
          isActive: true,
        },
      });

      // Mark invitation accepted (single use!)
      await tx.careCircleInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: now,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          careCircleId: invitation.careCircleId,
          elderlyProfileId: invitation.careCircle.elderlyProfileId,
          userId: user.id,
          action: "INVITATION_ACCEPTED",
          entityType: "CareCircleMember",
          details: { role: invitation.role, email: user.email },
        },
      });
    });

    return NextResponse.json({
      message: "Successfully joined the Care Circle",
      circleId: invitation.careCircleId,
      profileName: invitation.careCircle.elderlyProfile.name,
    });
  } catch (err: any) {
    console.error("[Accept Invite Error]:", err);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}
