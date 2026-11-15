import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { DoseSkipSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const dose = await prisma.scheduledDose.findUnique({
      where: { id },
      include: { medication: true },
    });

    if (!dose) {
      return NextResponse.json({ error: "Dose record not found" }, { status: 404 });
    }

    const access = await verifyProfileAccess(
      user.id,
      dose.elderlyProfileId,
      "CAN_CONFIRM_DOSE"
    );

    if (!access.authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const validated = DoseSkipSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { reason } = validated.data;
    const now = new Date();

    const updatedDose = await prisma.$transaction(async (tx) => {
      const updated = await tx.scheduledDose.update({
        where: { id },
        data: {
          status: "SKIPPED",
          confirmedAt: now,
          confirmedById: user.id,
          confirmationNotes: `Skipped: ${reason}`,
        },
        include: {
          medication: true,
          confirmedBy: { select: { id: true, name: true, role: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          elderlyProfileId: dose.elderlyProfileId,
          userId: user.id,
          action: "DOSE_SKIPPED",
          entityType: "ScheduledDose",
          entityId: id,
          details: {
            medication: dose.medication.name,
            reason,
            recordedBy: user.name,
            recordedByRole: user.role,
          },
        },
      });

      return updated;
    });

    return NextResponse.json({
      message: "Dose marked as skipped with clinical documentation",
      dose: updatedDose,
    });
  } catch (err: any) {
    console.error("[Dose Skip Error]:", err);
    return NextResponse.json({ error: "Failed to record skipped dose" }, { status: 500 });
  }
}
