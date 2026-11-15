import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const access = await verifyProfileAccess(
    user.id,
    appt.elderlyProfileId,
    "CAN_MANAGE_APPOINTMENTS"
  );
  if (!access.authorized) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.appointment.update({
        where: { id },
        data: {
          title: body.title ?? appt.title,
          doctorName: body.doctorName ?? appt.doctorName,
          specialty: body.specialty ?? appt.specialty,
          clinicName: body.clinicName ?? appt.clinicName,
          locationAddress: body.locationAddress ?? appt.locationAddress,
          appointmentDate: body.appointmentDate
            ? new Date(body.appointmentDate)
            : appt.appointmentDate,
          status: body.status ?? appt.status,
          outcomeSummary: body.outcomeSummary ?? appt.outcomeSummary,
          notes: body.notes ?? appt.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          elderlyProfileId: appt.elderlyProfileId,
          userId: user.id,
          action: "APPOINTMENT_UPDATED",
          entityType: "Appointment",
          entityId: id,
          details: { status: res.status, title: res.title },
        },
      });

      return res;
    });

    return NextResponse.json({ appointment: updated });
  } catch (err: any) {
    console.error("[Appointment PUT Error]:", err);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
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
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const access = await verifyProfileAccess(
    user.id,
    appt.elderlyProfileId,
    "CAN_MANAGE_APPOINTMENTS"
  );
  if (!access.authorized) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.appointment.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          elderlyProfileId: appt.elderlyProfileId,
          userId: user.id,
          action: "APPOINTMENT_CANCELLED",
          entityType: "Appointment",
          entityId: id,
          details: { title: appt.title },
        },
      });
    });

    return NextResponse.json({ message: "Appointment cancelled" });
  } catch (err: any) {
    console.error("[Appointment DELETE Error]:", err);
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 });
  }
}
