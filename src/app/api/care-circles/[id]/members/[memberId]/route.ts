import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyCircleAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: circleId, memberId } = await params;
  const adminCheck = await verifyCircleAdmin(user.id, circleId);
  if (!adminCheck.authorized) {
    return NextResponse.json({ error: "Only Circle Admins can revoke member access" }, { status: 403 });
  }

  try {
    const member = await prisma.careCircleMember.findUnique({
      where: { id: memberId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        careCircle: true,
      },
    });

    if (!member || member.careCircleId !== circleId) {
      return NextResponse.json({ error: "Member record not found" }, { status: 404 });
    }

    // Do not allow revoking oneself if primary creator
    if (member.userId === user.id && member.careCircle.createdById === user.id) {
      return NextResponse.json({ error: "Cannot revoke circle creator access" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.careCircleMember.update({
        where: { id: memberId },
        data: { isActive: false },
      });

      await tx.auditLog.create({
        data: {
          careCircleId: circleId,
          elderlyProfileId: member.careCircle.elderlyProfileId,
          userId: user.id,
          action: "ACCESS_REVOKED",
          entityType: "CareCircleMember",
          entityId: memberId,
          details: {
            revokedUser: member.user.name,
            revokedEmail: member.user.email,
            revokedRole: member.role,
          },
        },
      });
    });

    return NextResponse.json({ message: "Member access revoked successfully" });
  } catch (err: any) {
    console.error("[Revoke Member Error]:", err);
    return NextResponse.json({ error: "Failed to revoke member" }, { status: 500 });
  }
}
