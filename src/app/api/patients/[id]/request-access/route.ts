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

    if (user.role !== "CARETAKER") {
      return NextResponse.json(
        { error: "Access denied. Only licensed caretakers can request patient monitoring access." },
        { status: 403 }
      );
    }

    // Gate: Check Caretaker is APPROVED
    const caretakerProfile = await prisma.caretakerProfile.findUnique({
      where: { userId: user.id },
      select: { status: true, fullName: true, professionalCategory: true },
    });

    if (!caretakerProfile || caretakerProfile.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Your professional qualifications must be approved before you can request access to senior patients." },
        { status: 403 }
      );
    }

    const { id: elderlyProfileId } = await params;
    const body = await req.json().catch(() => ({}));
    const notes = typeof body.notes === "string" ? body.notes.trim() : null;

    const profile = await prisma.elderlyProfile.findUnique({
      where: { id: elderlyProfileId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Senior patient profile not found" }, { status: 404 });
    }

    const familyAdminId = profile.createdById;

    // Check if an existing request is already pending or approved
    const existing = await prisma.patientAccessRequest.findUnique({
      where: {
        elderlyProfileId_caretakerId: {
          elderlyProfileId,
          caretakerId: user.id,
        },
      },
    });

    if (existing?.status === "APPROVED") {
      return NextResponse.json(
        { error: "You already have approved access to this patient." },
        { status: 400 }
      );
    }

    if (existing?.status === "PENDING") {
      return NextResponse.json(
        { error: "An access request for this patient is already pending family administrator review." },
        { status: 400 }
      );
    }

    // Create or update request
    const accessRequest = await prisma.$transaction(async (tx) => {
      const reqRecord = await tx.patientAccessRequest.upsert({
        where: {
          elderlyProfileId_caretakerId: {
            elderlyProfileId,
            caretakerId: user.id,
          },
        },
        create: {
          elderlyProfileId,
          caretakerId: user.id,
          familyAdminId,
          status: "PENDING",
          notes,
          requestedAt: new Date(),
        },
        update: {
          status: "PENDING",
          notes,
          rejectionReason: null,
          requestedAt: new Date(),
          respondedAt: null,
        },
      });

      // Notification for Family Administrator
      await tx.notification.create({
        data: {
          userId: familyAdminId,
          elderlyProfileId,
          type: "CARE_TASK_ASSIGNED",
          title: "New Caretaker Access Request",
          message: `${caretakerProfile.fullName || user.name} (${caretakerProfile.professionalCategory}) has requested monitoring access for ${profile.name}.`,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          elderlyProfileId,
          action: "PATIENT_ACCESS_REQUESTED",
          entityType: "PatientAccessRequest",
          entityId: reqRecord.id,
          details: {
            caretakerId: user.id,
            caretakerName: caretakerProfile.fullName || user.name,
            patientName: profile.name,
            familyAdminId,
          },
        },
      });

      return reqRecord;
    });

    return NextResponse.json(
      {
        success: true,
        message: `Monitoring access request submitted to ${profile.createdBy.name}. You will be notified once reviewed.`,
        request: accessRequest,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Request Access Error]:", error);
    return NextResponse.json(
      { error: "Internal server error while submitting patient access request" },
      { status: 500 }
    );
  }
}
