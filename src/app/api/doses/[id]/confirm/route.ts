import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { DoseConfirmSchema } from "@/lib/validations";
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
      include: {
        medication: {
          include: { stock: true },
        },
        schedule: true,
      },
    });

    if (!dose) {
      return NextResponse.json({ error: "Dose record not found" }, { status: 404 });
    }

    // Verify authorized user has permission to confirm dose for this elderly profile
    const access = await verifyProfileAccess(
      user.id,
      dose.elderlyProfileId,
      "CAN_CONFIRM_DOSE"
    );

    if (!access.authorized) {
      return NextResponse.json({ error: "Access denied to confirm dose" }, { status: 403 });
    }

    if (dose.status === "TAKEN") {
      return NextResponse.json(
        { message: "Dose was already confirmed taken", dose },
        { status: 200 }
      );
    }

    let confirmationNotes = "Confirmed on schedule";
    try {
      const body = await req.json();
      const validated = DoseConfirmSchema.safeParse(body);
      if (validated.success && validated.data.confirmationNotes) {
        confirmationNotes = validated.data.confirmationNotes;
      }
    } catch {
      // JSON body is optional for quick one-tap confirmation
    }

    const now = new Date();
    const doseQuantity = dose.schedule?.dosageQuantity || 1.0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Dose Status
      const updatedDose = await tx.scheduledDose.update({
        where: { id },
        data: {
          status: "TAKEN",
          confirmedAt: now,
          confirmedById: user.id,
          confirmationNotes,
        },
        include: {
          medication: true,
          confirmedBy: { select: { id: true, name: true, role: true } },
        },
      });

      // 2. Decrement Medication Stock
      const stock = dose.medication.stock;
      let newStockLevel: number | null = null;
      let triggeredRefillAlert = false;

      if (stock) {
        newStockLevel = Math.max(0, stock.currentStock - doseQuantity);

        await tx.medicationStock.update({
          where: { id: stock.id },
          data: { currentStock: newStockLevel },
        });

        // Check if stock has reached or dropped below refill threshold
        if (newStockLevel <= stock.refillThreshold && stock.currentStock > stock.refillThreshold) {
          triggeredRefillAlert = true;

          // Create in-app notification for Care Circle
          const profile = await tx.elderlyProfile.findUnique({
            where: { id: dose.elderlyProfileId },
            include: {
              careCircles: {
                include: {
                  members: {
                    where: { isActive: true },
                    include: { user: true },
                  },
                },
              },
            },
          });

          if (profile && profile.careCircles[0]) {
            for (const member of profile.careCircles[0].members) {
              await tx.notification.create({
                data: {
                  userId: member.userId,
                  elderlyProfileId: profile.id,
                  type: "REFILL_ALERT",
                  title: `Low Medication Stock: ${dose.medication.name}`,
                  message: `${dose.medication.name} supply has dropped to ${newStockLevel} ${stock.unit} (Threshold: ${stock.refillThreshold}). Please arrange a prescription refill.`,
                  data: {
                    medicationId: dose.medication.id,
                    currentStock: newStockLevel,
                    threshold: stock.refillThreshold,
                  },
                },
              });
            }
          }
        }
      }

      // 3. Audit Log
      await tx.auditLog.create({
        data: {
          elderlyProfileId: dose.elderlyProfileId,
          userId: user.id,
          action: "DOSE_CONFIRMED",
          entityType: "ScheduledDose",
          entityId: id,
          details: {
            medication: dose.medication.name,
            confirmedBy: user.name,
            confirmedByRole: user.role,
            timestamp: now.toISOString(),
            remainingStock: newStockLevel,
            triggeredRefillAlert,
          },
        },
      });

      return { dose: updatedDose, remainingStock: newStockLevel, triggeredRefillAlert };
    });

    return NextResponse.json({
      message: "Dose successfully confirmed as administered",
      ...result,
    });
  } catch (err: any) {
    console.error("[Dose Confirm Error]:", err);
    return NextResponse.json({ error: "Failed to confirm dose" }, { status: 500 });
  }
}
