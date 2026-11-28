import { prisma } from "@/lib/prisma";
import { formatStockUnit } from "@/lib/domain/stock";

export interface PrescribeMedicationInput {
  elderlyProfileId: string;
  name: string;
  strengthNumber: number;
  strengthUnit: "mg" | "mcg" | "ml";
  form: "tablet" | "capsule" | "syrup" | "drops";
  times: string[]; // e.g. ["08:00", "20:00"]
  durationDays: number;
  reason: string;
}

export async function prescribeMedication(
  caretakerUserId: string,
  input: PrescribeMedicationInput
) {
  if (!input.name || input.name.trim().length === 0) {
    throw new Error("Medicine name is required.");
  }
  if (!input.strengthNumber || input.strengthNumber <= 0) {
    throw new Error("Valid strength number is required.");
  }
  if (!input.strengthUnit) {
    throw new Error("Strength unit is required.");
  }
  if (!input.times || input.times.length === 0) {
    throw new Error("At least one schedule time per day is required.");
  }
  if (!input.durationDays || input.durationDays < 1 || input.durationDays > 365) {
    throw new Error("Duration must be between 1 and 365 days.");
  }
  if (!input.reason || input.reason.trim().length === 0) {
    throw new Error("Clinical reason is required.");
  }

  const now = new Date();
  const strengthString = `${input.strengthNumber} ${input.strengthUnit}`;
  const initialStock = input.times.length * input.durationDays;
  const unit = formatStockUnit(input.form);

  return await prisma.$transaction(async (tx) => {
    // 1. Verify caretaker authorization for this patient
    const caretakerUser = await tx.user.findUnique({
      where: { id: caretakerUserId },
      include: { caretakerProfile: true },
    });

    const patient = await tx.elderlyProfile.findUnique({
      where: { id: input.elderlyProfileId },
      include: { createdBy: true },
    });

    if (!patient) {
      throw new Error("Senior patient profile not found.");
    }

    const membership = await tx.careCircleMember.findFirst({
      where: {
        careCircle: { elderlyProfileId: input.elderlyProfileId },
        userId: caretakerUserId,
        role: "CARETAKER",
        isActive: true,
      },
    });

    if (!membership) {
      throw new Error("You are not an authorized caretaker for this patient.");
    }

    // 2. Create Medication
    const med = await tx.medication.create({
      data: {
        elderlyProfileId: input.elderlyProfileId,
        name: input.name.trim(),
        strength: strengthString,
        strengthNumber: input.strengthNumber,
        strengthUnit: input.strengthUnit,
        form: input.form.toUpperCase() as any,
        dosageInstructions: `Take 1 ${input.form} (${strengthString}) at ${input.times.join(", ")}`,
        durationDays: input.durationDays,
        reason: input.reason.trim(),
        purpose: input.reason.trim(),
        stockCount: initialStock,
        stockUpdatedAt: now,
        stockUpdatedById: caretakerUserId,
        assignedById: caretakerUserId,
        assignedAt: now,
      },
    });

    // 3. Create Medication Schedule
    const schedule = await tx.medicationSchedule.create({
      data: {
        medicationId: med.id,
        frequency: "DAILY",
        timesOfDay: input.times,
        startDate: now,
        endDate: new Date(now.getTime() + input.durationDays * 86400000),
        dosageQuantity: 1.0,
        instructions: `Take 1 ${input.form} (${strengthString})`,
      },
    });

    // 4. Create Medication Stock
    const stock = await tx.medicationStock.create({
      data: {
        medicationId: med.id,
        currentStock: initialStock,
        unit,
        refillThreshold: 5,
        lastRefillDate: now,
      },
    });

    // 5. Generate Scheduled Doses for today
    const today = new Date();
    for (const timeStr of input.times) {
      const [h, m] = timeStr.split(":").map(Number);
      const doseTime = new Date(today);
      doseTime.setHours(h, m, 0, 0);

      await tx.scheduledDose.create({
        data: {
          medicationId: med.id,
          scheduleId: schedule.id,
          elderlyProfileId: input.elderlyProfileId,
          scheduledAt: doseTime,
          status: "SCHEDULED",
          idempotencyKey: `auto-${med.id}-${doseTime.toISOString()}`,
        },
      });
    }

    // 6. Notify Family Administrator
    const caretakerName = caretakerUser?.caretakerProfile?.fullName || caretakerUser?.name || "Your caretaker";
    await tx.notification.create({
      data: {
        userId: patient.createdById,
        elderlyProfileId: patient.id,
        type: "SYSTEM",
        title: "New Prescription Assigned",
        message: `${caretakerName} prescribed ${med.name} (${strengthString}) for ${patient.name}.`,
        dedupKey: `rx-new-${med.id}`,
        data: {
          medicationId: med.id,
          name: med.name,
          strength: strengthString,
          form: input.form,
          reason: input.reason,
        },
      },
    });

    return { ...med, schedules: [schedule], stock };
  });
}

export async function updateMedicationStockCount(
  userId: string,
  medicationId: string,
  newStockCount: number,
  actorRole: string
) {
  const clampedStock = Math.max(0, Math.min(999, Math.floor(newStockCount)));
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    const med = await tx.medication.findUnique({
      where: { id: medicationId },
      include: { stock: true, elderlyProfile: true },
    });

    if (!med) {
      throw new Error("Medication record not found.");
    }

    // Update Medication stock fields
    const updatedMed = await tx.medication.update({
      where: { id: medicationId },
      data: {
        stockCount: clampedStock,
        stockUpdatedAt: now,
        stockUpdatedById: userId,
      },
    });

    // Update MedicationStock if exists
    if (med.stock) {
      await tx.medicationStock.update({
        where: { id: med.stock.id },
        data: {
          currentStock: clampedStock,
          updatedAt: now,
        },
      });
    } else {
      await tx.medicationStock.create({
        data: {
          medicationId,
          currentStock: clampedStock,
          unit: formatStockUnit(med.form),
          refillThreshold: 5,
        },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        elderlyProfileId: med.elderlyProfileId,
        userId,
        action: "MEDICATION_STOCK_UPDATED",
        entityType: "Medication",
        entityId: medicationId,
        details: {
          previousStock: med.stockCount,
          newStock: clampedStock,
          actorRole,
        },
      },
    });

    return updatedMed;
  });
}
