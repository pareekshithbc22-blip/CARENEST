import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { MedicationCreateSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const access = await verifyProfileAccess(user.id, profileId, "CAN_VIEW_RECORDS");
  if (!access.authorized) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const medications = await prisma.medication.findMany({
      where: {
        elderlyProfileId: profileId,
        isArchived: false,
      },
      include: {
        stock: true,
        schedules: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ medications });
  } catch (err: any) {
    console.error("[Medications GET Error]:", err);
    return NextResponse.json({ error: "Failed to load medications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Family Administrators and Seniors have read-only access to medication schedules
  if (user.role === "FAMILY" || user.role === "SENIOR") {
    return NextResponse.json(
      { error: "Medication management is restricted to authorized licensed Caretakers. Family Administrators have read-only access." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const validated = MedicationCreateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const data = validated.data;
    const access = await verifyProfileAccess(
      user.id,
      data.elderlyProfileId,
      "CAN_MANAGE_MEDS"
    );

    if (!access.authorized) {
      return NextResponse.json({ error: "Access denied to manage medications" }, { status: 403 });
    }

    const newMedication = await prisma.$transaction(async (tx) => {
      // 1. Create Medication
      const med = await tx.medication.create({
        data: {
          elderlyProfileId: data.elderlyProfileId,
          name: data.name,
          brandName: data.brandName,
          genericName: data.genericName,
          form: data.form,
          strength: data.strength,
          dosageInstructions: data.dosageInstructions,
          prescribingDoctor: data.prescribingDoctor,
          prescribingClinic: data.prescribingClinic,
          rxNumber: data.rxNumber,
          purpose: data.purpose,
        },
      });

      // 2. Create Schedule
      const schedule = await tx.medicationSchedule.create({
        data: {
          medicationId: med.id,
          frequency: data.frequency,
          timesOfDay: data.timesOfDay,
          dosageQuantity: data.dosageQuantity,
          instructions: data.instructions,
        },
      });

      // 3. Create Stock Record
      const stock = await tx.medicationStock.create({
        data: {
          medicationId: med.id,
          currentStock: data.initialStock,
          unit: data.unit,
          refillThreshold: data.refillThreshold,
          lastRefillDate: new Date(),
        },
      });

      // 4. Generate scheduled doses for today
      const today = new Date();
      for (const timeStr of data.timesOfDay) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const doseTime = new Date(today);
        doseTime.setHours(hours, minutes, 0, 0);

        await tx.scheduledDose.create({
          data: {
            medicationId: med.id,
            scheduleId: schedule.id,
            elderlyProfileId: data.elderlyProfileId,
            scheduledAt: doseTime,
            status: "SCHEDULED",
            idempotencyKey: `auto-${med.id}-${doseTime.toISOString()}`,
          },
        });
      }

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          elderlyProfileId: data.elderlyProfileId,
          userId: user.id,
          action: "MEDICATION_CREATED",
          entityType: "Medication",
          entityId: med.id,
          details: { name: med.name, strength: med.strength, form: med.form },
        },
      });

      return { ...med, schedules: [schedule], stock };
    });

    return NextResponse.json({ medication: newMedication }, { status: 201 });
  } catch (err: any) {
    console.error("[Medication POST Error]:", err);
    return NextResponse.json({ error: "Failed to create medication" }, { status: 500 });
  }
}
