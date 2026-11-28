import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canCaretakerAcceptPatient } from "@/lib/domain/caretaker-capacity";
import { isCaretakerDeclined } from "@/lib/domain/requests";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "FAMILY" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { patientId, caretakerId } = body;

    if (!patientId || !caretakerId) {
      return NextResponse.json({ error: "patientId and caretakerId are required" }, { status: 400 });
    }

    const patient = await prisma.elderlyProfile.findUnique({
      where: { id: patientId },
    });

    if (!patient || patient.createdById !== user.id) {
      return NextResponse.json({ error: "Patient not found or unauthorized" }, { status: 404 });
    }

    // Check if caretaker has previously declined this patient
    if (isCaretakerDeclined(patient.declinedCaretakerIds, caretakerId)) {
      return NextResponse.json(
        { error: "This caretaker has previously declined and cannot be assigned to this patient." },
        { status: 400 }
      );
    }

    // Verify caretaker status and capacity
    const caretaker = await prisma.user.findUnique({
      where: { id: caretakerId },
      include: { caretakerProfile: true },
    });

    if (!caretaker || caretaker.role !== "CARETAKER" || caretaker.caretakerProfile?.status !== "APPROVED") {
      return NextResponse.json({ error: "Caretaker is not verified" }, { status: 400 });
    }

    const currentLoad = await prisma.patientAccessRequest.count({
      where: { caretakerId, status: "APPROVED" },
    });

    if (!canCaretakerAcceptPatient(currentLoad)) {
      return NextResponse.json({ error: "Caretaker has reached maximum patient capacity" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create pending request
      const request = await tx.patientAccessRequest.create({
        data: {
          elderlyProfileId: patientId,
          caretakerId,
          familyAdminId: user.id,
          status: "PENDING",
          notes: "Reassigned caretaker request",
        },
      });

      // Update patient status to AWAITING_APPROVAL
      await tx.elderlyProfile.update({
        where: { id: patientId },
        data: { assignmentStatus: "AWAITING_APPROVAL" },
      });

      const nowMs = Date.now();
      const age = Math.abs(new Date(nowMs - patient.dateOfBirth.getTime()).getUTCFullYear() - 1970);

      // Notify chosen caretaker
      await tx.notification.create({
        data: {
          userId: caretakerId,
          elderlyProfileId: patientId,
          type: "SYSTEM",
          title: "New Patient Request",
          message: `${user.name || "A family administrator"} added you as the caretaker for ${patient.name} (${patient.patientCode || "PT-xxxx"}), age ${age}. Are you willing to accept?`,
          dedupKey: `req-created-${request.id}`,
          data: {
            requestId: request.id,
            patientId,
            patientCode: patient.patientCode,
            name: patient.name,
            age,
            familyAdminName: user.name,
          },
        },
      });

      return request;
    });

    return NextResponse.json({ success: true, request: result });
  } catch (err: any) {
    console.error("[Reassign Caretaker Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to reassign caretaker" }, { status: 500 });
  }
}
