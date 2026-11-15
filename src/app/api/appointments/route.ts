import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { AppointmentCreateSchema } from "@/lib/validations";
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
    const appointments = await prisma.appointment.findMany({
      where: { elderlyProfileId: profileId },
      orderBy: { appointmentDate: "asc" },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json({ appointments });
  } catch (err: any) {
    console.error("[Appointments GET Error]:", err);
    return NextResponse.json({ error: "Failed to load appointments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = AppointmentCreateSchema.safeParse(body);

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
      "CAN_MANAGE_APPOINTMENTS"
    );

    if (!access.authorized) {
      return NextResponse.json({ error: "Access denied to schedule appointments" }, { status: 403 });
    }

    const newAppointment = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: {
          elderlyProfileId: data.elderlyProfileId,
          title: data.title,
          doctorName: data.doctorName,
          specialty: data.specialty,
          clinicName: data.clinicName,
          locationAddress: data.locationAddress,
          appointmentDate: new Date(data.appointmentDate),
          reminderMinutesBefore: data.reminderMinutesBefore,
          notes: data.notes,
          createdById: user.id,
        },
      });

      await tx.auditLog.create({
        data: {
          elderlyProfileId: data.elderlyProfileId,
          userId: user.id,
          action: "APPOINTMENT_SCHEDULED",
          entityType: "Appointment",
          entityId: appt.id,
          details: {
            title: appt.title,
            doctorName: appt.doctorName,
            appointmentDate: appt.appointmentDate.toISOString(),
          },
        },
      });

      return appt;
    });

    return NextResponse.json({ appointment: newAppointment }, { status: 201 });
  } catch (err: any) {
    console.error("[Appointment POST Error]:", err);
    return NextResponse.json({ error: "Failed to schedule appointment" }, { status: 500 });
  }
}
