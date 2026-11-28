import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { respondToCaretakerRequest } from "@/lib/services/access-request-service";

const RespondSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "ACCEPT"]),
  rejectionReason: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: requestId } = await params;
    const body = await req.json();
    const validated = RespondSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { action, rejectionReason } = validated.data;

    // If caller is caretaker, dispatch to caretaker response service
    if (user.role === "CARETAKER") {
      const normAction = action === "REJECT" ? "REJECT" : "ACCEPT";
      const result = await respondToCaretakerRequest(
        requestId,
        user.id,
        normAction,
        rejectionReason
      );
      return NextResponse.json(result);
    }

    if (user.role !== "FAMILY" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only authorized roles can respond to requests" }, { status: 403 });
    }

    const request = await prisma.patientAccessRequest.findUnique({
      where: { id: requestId },
      include: {
        elderlyProfile: {
          include: {
            careCircles: { take: 1 },
          },
        },
        caretaker: { select: { id: true, name: true, email: true } },
      },
    });

    if (!request) {
      return NextResponse.json({ error: "Access request not found" }, { status: 404 });
    }

    // Authorization: User must be the familyAdmin assigned to this request
    if (request.familyAdminId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. You do not manage this patient." },
        { status: 403 }
      );
    }

    const now = new Date();

    if (action === "APPROVE") {
      const updated = await prisma.$transaction(async (tx) => {
        // 1. Update Request Status
        const reqUpdated = await tx.patientAccessRequest.update({
          where: { id: requestId },
          data: {
            status: "APPROVED",
            rejectionReason: null,
            respondedAt: now,
          },
        });

        // 2. Add Caretaker to Patient's CareCircle
        const primaryCircle = request.elderlyProfile.careCircles[0];
        if (primaryCircle) {
          await tx.careCircleMember.upsert({
            where: {
              careCircleId_userId: {
                careCircleId: primaryCircle.id,
                userId: request.caretakerId,
              },
            },
            create: {
              careCircleId: primaryCircle.id,
              userId: request.caretakerId,
              role: "CARETAKER",
              isActive: true,
              permissions: [
                "CAN_CONFIRM_DOSE",
                "CAN_VIEW_RECORDS",
                "CAN_LOG_CARE_NOTES",
                "CAN_COMPLETE_TASKS",
                "CAN_RECEIVE_ESCALATIONS",
                "CAN_MANAGE_MEDS",
              ],
            },
            update: {
              isActive: true,
              role: "CARETAKER",
              permissions: [
                "CAN_CONFIRM_DOSE",
                "CAN_VIEW_RECORDS",
                "CAN_LOG_CARE_NOTES",
                "CAN_COMPLETE_TASKS",
                "CAN_RECEIVE_ESCALATIONS",
                "CAN_MANAGE_MEDS",
              ],
            },
          });
        }

        // 3. Notify Caretaker
        await tx.notification.create({
          data: {
            userId: request.caretakerId,
            elderlyProfileId: request.elderlyProfileId,
            type: "CARE_TASK_ASSIGNED",
            title: "Access Request Approved",
            message: `Your access request for ${request.elderlyProfile.name} has been approved by ${user.name}. You can now view their telemetry and log doses.`,
          },
        });

        // 4. Audit Log
        await tx.auditLog.create({
          data: {
            userId: user.id,
            elderlyProfileId: request.elderlyProfileId,
            careCircleId: primaryCircle?.id,
            action: "CARETAKER_ACCESS_APPROVED",
            entityType: "PatientAccessRequest",
            entityId: requestId,
            details: {
              caretakerName: request.caretaker.name,
              patientName: request.elderlyProfile.name,
              approvedBy: user.name,
            },
          },
        });

        return reqUpdated;
      });

      return NextResponse.json({
        success: true,
        message: `Approved ${request.caretaker.name} for monitoring ${request.elderlyProfile.name}.`,
        request: updated,
      });
    } else {
      // REJECT
      const updated = await prisma.$transaction(async (tx) => {
        const reqUpdated = await tx.patientAccessRequest.update({
          where: { id: requestId },
          data: {
            status: "REJECTED",
            rejectionReason: rejectionReason?.trim() || "Declined by family coordinator",
            respondedAt: now,
          },
        });

        // Notify Caretaker
        await tx.notification.create({
          data: {
            userId: request.caretakerId,
            elderlyProfileId: request.elderlyProfileId,
            type: "SYSTEM",
            title: "Access Request Declined",
            message: `Your monitoring request for ${request.elderlyProfile.name} was declined${
              rejectionReason ? `: "${rejectionReason}"` : "."
            }`,
          },
        });

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId: user.id,
            elderlyProfileId: request.elderlyProfileId,
            action: "CARETAKER_ACCESS_REJECTED",
            entityType: "PatientAccessRequest",
            entityId: requestId,
            details: {
              caretakerName: request.caretaker.name,
              patientName: request.elderlyProfile.name,
              rejectedBy: user.name,
              rejectionReason,
            },
          },
        });

        return reqUpdated;
      });

      return NextResponse.json({
        success: true,
        message: `Declined request from ${request.caretaker.name}.`,
        request: updated,
      });
    }
  } catch (error: any) {
    console.error("[Family Respond Error]:", error);
    return NextResponse.json(
      { error: "Internal server error while responding to caretaker request" },
      { status: 500 }
    );
  }
}
