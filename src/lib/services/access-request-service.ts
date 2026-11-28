import { prisma } from "@/lib/prisma";
import { MAX_CARETAKER_PATIENTS } from "@/lib/domain/caretaker-capacity";
import { canTransitionRequest } from "@/lib/domain/requests";

export async function getRedactedRequestDetails(requestId: string, caretakerUserId: string) {
  const request = await prisma.patientAccessRequest.findUnique({
    where: { id: requestId },
    include: {
      elderlyProfile: {
        select: {
          id: true,
          name: true,
          patientCode: true,
          dateOfBirth: true,
        },
      },
      familyAdmin: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!request || request.caretakerId !== caretakerUserId) {
    throw new Error("Request not found or access denied.");
  }

  const nowMs = Date.now();
  const dobMs = request.elderlyProfile.dateOfBirth.getTime();
  const age = Math.abs(new Date(nowMs - dobMs).getUTCFullYear() - 1970);

  // Strictly redacted: ONLY name, age, patient ID and family admin's name
  return {
    id: request.id,
    status: request.status,
    patientId: request.elderlyProfile.id,
    patientName: request.elderlyProfile.name,
    patientCode: request.elderlyProfile.patientCode,
    age,
    familyAdminName: request.familyAdmin.name,
    requestedAt: request.requestedAt,
  };
}

export async function respondToCaretakerRequest(
  requestId: string,
  caretakerUserId: string,
  action: "ACCEPT" | "REJECT",
  reason?: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch the request
    const request = await tx.patientAccessRequest.findUnique({
      where: { id: requestId },
      include: {
        elderlyProfile: true,
        familyAdmin: { select: { id: true, name: true } },
        caretaker: {
          include: { caretakerProfile: true },
        },
      },
    });

    if (!request) {
      throw new Error("Request record not found.");
    }

    if (request.caretakerId !== caretakerUserId) {
      throw new Error("You are not authorized to respond to this request.");
    }

    if (request.status !== "PENDING") {
      throw new Error(`Request has already been processed (current status: ${request.status}).`);
    }

    const now = new Date();
    const caretakerName = request.caretaker.caretakerProfile?.fullName || request.caretaker.name;
    const patientName = request.elderlyProfile.name;
    const patientCode = request.elderlyProfile.patientCode || "PT-xxxx";

    if (action === "ACCEPT") {
      // Transition validation
      const check = canTransitionRequest("PENDING", "ACCEPTED");
      if (!check.allowed) {
        throw new Error(check.error);
      }

      // Check current accepted patient load inside the transaction
      const currentLoad = await tx.patientAccessRequest.count({
        where: {
          caretakerId: caretakerUserId,
          status: "APPROVED",
        },
      });

      if (currentLoad >= MAX_CARETAKER_PATIENTS) {
        throw new Error(`You have reached the maximum limit of ${MAX_CARETAKER_PATIENTS} assigned patients.`);
      }

      // Update request to APPROVED
      const updatedReq = await tx.patientAccessRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          actionByUserId: caretakerUserId,
          actionAt: now,
          respondedAt: now,
        },
      });

      // Update patient assignment status to ASSIGNED
      await tx.elderlyProfile.update({
        where: { id: request.elderlyProfileId },
        data: {
          assignmentStatus: "ASSIGNED",
        },
      });

      // Add Caretaker to Care Circle
      const careCircle = await tx.careCircle.findFirst({
        where: { elderlyProfileId: request.elderlyProfileId },
      });

      if (careCircle) {
        await tx.careCircleMember.upsert({
          where: {
            careCircleId_userId: {
              careCircleId: careCircle.id,
              userId: caretakerUserId,
            },
          },
          update: {
            isActive: true,
            role: "CARETAKER",
            permissions: ["CAN_VIEW_RECORDS", "CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE"],
          },
          create: {
            careCircleId: careCircle.id,
            userId: caretakerUserId,
            role: "CARETAKER",
            permissions: ["CAN_VIEW_RECORDS", "CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE"],
            isActive: true,
          },
        });
      }

      // Notify Family Administrator
      await tx.notification.create({
        data: {
          userId: request.familyAdminId,
          elderlyProfileId: request.elderlyProfileId,
          type: "SYSTEM",
          title: "Caretaker Request Accepted",
          message: `${caretakerName} accepted your request for ${patientName} (${patientCode}).`,
          dedupKey: `req-acc-${requestId}`,
          data: {
            requestId,
            patientId: request.elderlyProfileId,
            caretakerId: caretakerUserId,
            caretakerName,
          },
        },
      });

      return { success: true, status: "APPROVED", request: updatedReq };
    } else {
      // REJECT
      const check = canTransitionRequest("PENDING", "REJECTED");
      if (!check.allowed) {
        throw new Error(check.error);
      }

      const updatedReq = await tx.patientAccessRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          rejectionReason: reason || "Declined by caretaker",
          actionByUserId: caretakerUserId,
          actionAt: now,
          respondedAt: now,
        },
      });

      // Record caretaker in declined list and set UNASSIGNED
      const currentDeclined = request.elderlyProfile.declinedCaretakerIds || [];
      const updatedDeclined = Array.from(new Set([...currentDeclined, caretakerUserId]));

      await tx.elderlyProfile.update({
        where: { id: request.elderlyProfileId },
        data: {
          assignmentStatus: "UNASSIGNED",
          declinedCaretakerIds: updatedDeclined,
        },
      });

      // Notify Family Administrator
      await tx.notification.create({
        data: {
          userId: request.familyAdminId,
          elderlyProfileId: request.elderlyProfileId,
          type: "SYSTEM",
          title: "Caretaker Request Declined",
          message: `${caretakerName} declined your request for ${patientName} (${patientCode}).`,
          dedupKey: `req-rej-${requestId}`,
          data: {
            requestId,
            patientId: request.elderlyProfileId,
            caretakerId: caretakerUserId,
            caretakerName,
            reason: reason || "Declined by caretaker",
          },
        },
      });

      return { success: true, status: "REJECTED", request: updatedReq };
    }
  });
}

export async function cancelCaretakerRequest(requestId: string, familyAdminUserId: string) {
  return await prisma.$transaction(async (tx) => {
    const request = await tx.patientAccessRequest.findUnique({
      where: { id: requestId },
      include: { elderlyProfile: true },
    });

    if (!request) {
      throw new Error("Request not found.");
    }

    if (request.familyAdminId !== familyAdminUserId) {
      throw new Error("Only the initiating family administrator can cancel this request.");
    }

    if (request.status !== "PENDING") {
      throw new Error(`Cannot cancel request with status ${request.status}.`);
    }

    const now = new Date();
    const updated = await tx.patientAccessRequest.update({
      where: { id: requestId },
      data: {
        status: "CANCELLED",
        actionByUserId: familyAdminUserId,
        actionAt: now,
      },
    });

    await tx.elderlyProfile.update({
      where: { id: request.elderlyProfileId },
      data: {
        assignmentStatus: "UNASSIGNED",
      },
    });

    return { success: true, request: updated };
  });
}

export async function revokeCaretakerAssignment(
  elderlyProfileId: string,
  caretakerUserId: string,
  familyAdminUserId: string
) {
  return await prisma.$transaction(async (tx) => {
    const profile = await tx.elderlyProfile.findUnique({
      where: { id: elderlyProfileId },
    });

    if (!profile || profile.createdById !== familyAdminUserId) {
      throw new Error("Profile not found or access denied.");
    }

    // Deactivate CareCircleMember
    const careCircle = await tx.careCircle.findFirst({
      where: { elderlyProfileId },
    });

    if (careCircle) {
      await tx.careCircleMember.updateMany({
        where: {
          careCircleId: careCircle.id,
          userId: caretakerUserId,
        },
        data: {
          isActive: false,
        },
      });
    }

    // Update Access Request to REVOKED
    await tx.patientAccessRequest.updateMany({
      where: {
        elderlyProfileId,
        caretakerId: caretakerUserId,
        status: "APPROVED",
      },
      data: {
        status: "REVOKED",
        actionByUserId: familyAdminUserId,
        actionAt: new Date(),
      },
    });

    // Set assignment status to UNASSIGNED
    await tx.elderlyProfile.update({
      where: { id: elderlyProfileId },
      data: {
        assignmentStatus: "UNASSIGNED",
      },
    });

    return { success: true };
  });
}
