import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "FAMILY" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only family administrators can revoke caretaker access" }, { status: 403 });
    }

    const { id: requestId } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason.trim() : "Revoked by family administrator";

    const request = await prisma.patientAccessRequest.findUnique({
      where: { id: requestId },
      include: {
        elderlyProfile: {
          include: { careCircles: { take: 1 } },
        },
        caretaker: { select: { id: true, name: true, email: true } },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Access request not found" }, { status: 404 });
    }

    // Authorization: User must manage this patient
    if (request.familyAdminId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. You do not manage this patient." },
        { status: 403 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Request to REVOKED
      const reqUpdated = await tx.patientAccessRequest.update({
        where: { id: requestId },
        data: {
          status: "REVOKED",
          rejectionReason: reason,
          respondedAt: new Date(),
        },
      });

      // 2. Remove / deactivate CareCircleMember
      const primaryCircle = request.elderlyProfile.careCircles[0];
      if (primaryCircle) {
        await tx.careCircleMember.deleteMany({
          where: {
            careCircleId: primaryCircle.id,
            userId: request.caretakerId,
          },
        });
      }

      // 3. Notify Caretaker
      await tx.notification.create({
        data: {
          userId: request.caretakerId,
          elderlyProfileId: request.elderlyProfileId,
          type: "SYSTEM",
          title: "Patient Access Revoked",
          message: `Your clinical access for ${request.elderlyProfile.name} was revoked by the family administrator (${reason}).`,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          elderlyProfileId: request.elderlyProfileId,
          careCircleId: primaryCircle?.id,
          action: "CARETAKER_ACCESS_REVOKED",
          entityType: "PatientAccessRequest",
          entityId: requestId,
          details: {
            caretakerName: request.caretaker.name,
            patientName: request.elderlyProfile.name,
            revokedBy: user.name,
            reason,
          },
        },
      });

      return reqUpdated;
    });

    return NextResponse.json({
      success: true,
      message: `Access for ${request.caretaker.name} has been revoked. They can no longer view ${request.elderlyProfile.name}'s medical records.`,
      request: updated,
    });
  } catch (error: any) {
    console.error("[Family Revoke Error]:", error);
    return NextResponse.json(
      { error: "Internal server error while revoking caretaker access" },
      { status: 500 }
    );
  }
}
