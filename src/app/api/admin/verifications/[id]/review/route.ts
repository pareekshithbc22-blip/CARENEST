import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const ReviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "SET_UNDER_REVIEW"]),
  rejectionReason: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Only platform administrators can review applications." },
        { status: 403 }
      );
    }

    const { id: applicationId } = await params;
    const body = await req.json();
    const validated = ReviewSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { action, rejectionReason } = validated.data;

    if (action === "REJECT" && (!rejectionReason || rejectionReason.trim().length < 5)) {
      return NextResponse.json(
        { error: "A clear rejection reason (minimum 5 characters) is required when declining credentials." },
        { status: 400 }
      );
    }

    const existingApplication = await prisma.caretakerProfile.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!existingApplication) {
      return NextResponse.json({ error: "Verification application not found" }, { status: 404 });
    }

    const statusMap = {
      APPROVE: "APPROVED" as const,
      REJECT: "REJECTED" as const,
      SET_UNDER_REVIEW: "UNDER_REVIEW" as const,
    };

    const newStatus = statusMap[action];
    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const app = await tx.caretakerProfile.update({
        where: { id: applicationId },
        data: {
          status: newStatus,
          rejectionReason: action === "REJECT" ? rejectionReason?.trim() : null,
          reviewedById: user.id,
          reviewedAt: now,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          reviewedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: `CARETAKER_CREDENTIAL_${action}`,
          entityType: "CaretakerProfile",
          entityId: app.id,
          details: {
            caretakerId: app.userId,
            caretakerName: app.fullName,
            reviewedBy: user.name,
            action,
            rejectionReason: action === "REJECT" ? rejectionReason : undefined,
          },
        },
      });

      // Notification for Caretaker
      const title =
        action === "APPROVE"
          ? "Professional Credentials Approved"
          : action === "REJECT"
          ? "Professional Credentials Rejected"
          : "Credentials Marked Under Review";

      const message =
        action === "APPROVE"
          ? "Congratulations! Your clinical credentials have been verified by CARENEST. You can now discover senior patients and provide clinical care."
          : action === "REJECT"
          ? `Your clinical credential submission was declined: "${rejectionReason}". You may re-submit updated documents.`
          : "Your clinical credential application is currently under formal review by the CARENEST medical compliance team.";

      await tx.notification.create({
        data: {
          userId: app.userId,
          type: "SYSTEM",
          title,
          message,
        },
      });

      return app;
    });

    return NextResponse.json({
      success: true,
      application: updated,
      message: `Caretaker application successfully updated to ${newStatus}.`,
    });
  } catch (error: any) {
    console.error("[Admin Review Error]:", error);
    return NextResponse.json(
      { error: "Internal server error while processing credential review" },
      { status: 500 }
    );
  }
}
