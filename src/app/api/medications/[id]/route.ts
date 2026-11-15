import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const med = await prisma.medication.findUnique({
    where: { id },
    include: { stock: true, schedules: true },
  });

  if (!med) {
    return NextResponse.json({ error: "Medication not found" }, { status: 404 });
  }

  const access = await verifyProfileAccess(user.id, med.elderlyProfileId, "CAN_VIEW_RECORDS");
  if (!access.authorized) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json({ medication: med });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const med = await prisma.medication.findUnique({ where: { id } });
  if (!med) {
    return NextResponse.json({ error: "Medication not found" }, { status: 404 });
  }

  const access = await verifyProfileAccess(user.id, med.elderlyProfileId, "CAN_MANAGE_MEDS");
  if (!access.authorized) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updated = await prisma.$transaction(async (tx) => {
      const updatedMed = await tx.medication.update({
        where: { id },
        data: {
          name: body.name ?? med.name,
          brandName: body.brandName,
          genericName: body.genericName,
          form: body.form ?? med.form,
          strength: body.strength ?? med.strength,
          dosageInstructions: body.dosageInstructions ?? med.dosageInstructions,
          prescribingDoctor: body.prescribingDoctor,
          prescribingClinic: body.prescribingClinic,
          rxNumber: body.rxNumber,
          purpose: body.purpose,
        },
      });

      // Update stock if provided
      if (body.currentStock !== undefined) {
        await tx.medicationStock.upsert({
          where: { medicationId: id },
          create: {
            medicationId: id,
            currentStock: Number(body.currentStock),
            unit: body.unit || "tablets",
            refillThreshold: Number(body.refillThreshold || 10),
            lastRefillDate: new Date(),
          },
          update: {
            currentStock: Number(body.currentStock),
            unit: body.unit,
            refillThreshold: body.refillThreshold ? Number(body.refillThreshold) : undefined,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          elderlyProfileId: med.elderlyProfileId,
          userId: user.id,
          action: "MEDICATION_UPDATED",
          entityType: "Medication",
          entityId: id,
          details: { name: updatedMed.name },
        },
      });

      return updatedMed;
    });

    return NextResponse.json({ medication: updated });
  } catch (err: any) {
    console.error("[Medication PUT Error]:", err);
    return NextResponse.json({ error: "Failed to update medication" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const med = await prisma.medication.findUnique({ where: { id } });
  if (!med) {
    return NextResponse.json({ error: "Medication not found" }, { status: 404 });
  }

  const access = await verifyProfileAccess(user.id, med.elderlyProfileId, "CAN_MANAGE_MEDS");
  if (!access.authorized) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const reason = searchParams.get("reason") || "Discontinued by authorized care circle";

    await prisma.$transaction(async (tx) => {
      // Archive medication safely without deleting clinical history
      await tx.medication.update({
        where: { id },
        data: {
          isArchived: true,
          discontinuedReason: reason,
        },
      });

      // Deactivate associated schedules
      await tx.medicationSchedule.updateMany({
        where: { medicationId: id },
        data: { isActive: false },
      });

      // Cancel future scheduled doses
      await tx.scheduledDose.deleteMany({
        where: {
          medicationId: id,
          status: "SCHEDULED",
          scheduledAt: { gte: new Date() },
        },
      });

      await tx.auditLog.create({
        data: {
          elderlyProfileId: med.elderlyProfileId,
          userId: user.id,
          action: "MEDICATION_DISCONTINUED",
          entityType: "Medication",
          entityId: id,
          details: { name: med.name, reason },
        },
      });
    });

    return NextResponse.json({ message: "Medication discontinued and safely archived" });
  } catch (err: any) {
    console.error("[Medication DELETE Error]:", err);
    return NextResponse.json({ error: "Failed to archive medication" }, { status: 500 });
  }
}
