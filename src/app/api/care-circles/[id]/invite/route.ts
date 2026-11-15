import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/session";
import { verifyCircleAdmin } from "@/lib/permissions";
import { CareCircleInviteSchema } from "@/lib/validations";
import { sendCareCircleInvitationEmail } from "@/lib/email/service";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/config";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: circleId } = await params;
  const adminCheck = await verifyCircleAdmin(user.id, circleId);
  if (!adminCheck.authorized) {
    return NextResponse.json(
      { error: "Only Care Circle Admins can invite new members" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const validated = CareCircleInviteSchema.safeParse({ ...body, careCircleId: circleId });

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if target user is already an active member
    const existingMember = await prisma.careCircleMember.findFirst({
      where: {
        careCircleId: circleId,
        user: { email: normalizedEmail },
        isActive: true,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "This user is already an active member of this Care Circle" },
        { status: 409 }
      );
    }

    const circle = await prisma.careCircle.findUnique({
      where: { id: circleId },
      include: { elderlyProfile: true },
    });

    if (!circle) {
      return NextResponse.json({ error: "Care Circle not found" }, { status: 404 });
    }

    // Generate secure single-use expiring token (64 hex characters)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiration window

    const invitation = await prisma.$transaction(async (tx) => {
      // Invalidate any existing pending invitations for this email in this circle
      await tx.careCircleInvitation.updateMany({
        where: {
          careCircleId: circleId,
          email: normalizedEmail,
          status: "PENDING",
        },
        data: { status: "REVOKED" },
      });

      const inv = await tx.careCircleInvitation.create({
        data: {
          careCircleId: circleId,
          email: normalizedEmail,
          role,
          token,
          invitedById: user.id,
          expiresAt,
          status: "PENDING",
        },
      });

      await tx.auditLog.create({
        data: {
          careCircleId: circleId,
          elderlyProfileId: circle.elderlyProfileId,
          userId: user.id,
          action: "CARE_CIRCLE_MEMBER_INVITED",
          entityType: "CareCircleInvitation",
          entityId: inv.id,
          details: { email: normalizedEmail, role, invitedBy: user.name },
        },
      });

      return inv;
    });

    const appUrl = getAppUrl();
    const invitationUrl = `${appUrl}/invite/${token}`;

    // Send Invitation Email
    const emailResult = await sendCareCircleInvitationEmail({
      to: normalizedEmail,
      inviterName: user.name || "Family Coordinator",
      seniorName: circle.elderlyProfile.name,
      circleName: circle.name,
      role,
      invitationUrl,
    });

    return NextResponse.json(
      {
        message: "Invitation issued successfully",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          invitationUrl,
        },
        emailDelivery: emailResult,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[Invite POST Error]:", err);
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }
}
