import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAuthorizedProfiles } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { SeniorDashboardClient } from "@/components/senior/senior-dashboard-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Senior Dashboard - CareNest",
  description: "Accessible, high-contrast daily schedule and one-tap medication confirmation.",
};

export default async function SeniorDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/dashboard/senior");
  }

  // Retrieve accessible elderly profiles
  const profiles = await getAuthorizedProfiles(user.id);
  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">No Elderly Profile Connected</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your account is not currently connected to an active Care Circle. Please ask your family coordinator to invite you or create a profile.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Select first authorized profile for the senior
  const selectedProfile = profiles[0];

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  // Today's doses
  const doses = await prisma.scheduledDose.findMany({
    where: {
      elderlyProfileId: selectedProfile.id,
      scheduledAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      medication: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  // All active prescribed medications for this profile
  const allMedications = await prisma.medication.findMany({
    where: {
      elderlyProfileId: selectedProfile.id,
      isArchived: false,
    },
    include: {
      stock: true,
      schedules: { where: { isActive: true } },
    },
    orderBy: { name: "asc" },
  });

  // Upcoming appointments
  const appointments = await prisma.appointment.findMany({
    where: {
      elderlyProfileId: selectedProfile.id,
      status: "UPCOMING",
      appointmentDate: { gte: now },
    },
    orderBy: { appointmentDate: "asc" },
    take: 10,
  });

  // Assigned Caretaker
  const caretakerMember = await prisma.careCircleMember.findFirst({
    where: {
      careCircle: { elderlyProfileId: selectedProfile.id },
      role: "CARETAKER",
      isActive: true,
    },
    include: {
      user: { select: { name: true, phoneNumber: true, role: true } },
    },
  });

  // Recent Health Measurements
  const rawNotes = await prisma.careNote.findMany({
    where: {
      elderlyProfileId: selectedProfile.id,
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const formattedMeasurements = rawNotes
    .filter((n) => n.vitalSigns !== null && typeof n.vitalSigns === "object")
    .map((n) => {
      const v = (n.vitalSigns || {}) as Record<string, unknown>;
      const rawDate = new Date(n.createdAt);
      let systolic: number | null = typeof v.systolic === "number" ? v.systolic : null;
      let diastolic: number | null = typeof v.diastolic === "number" ? v.diastolic : null;

      if (typeof v.bloodPressure === "string" && (!systolic || !diastolic)) {
        const parts = v.bloodPressure.split("/");
        if (parts.length === 2) {
          const sys = parseInt(parts[0].trim(), 10);
          const dia = parseInt(parts[1].trim(), 10);
          if (!isNaN(sys)) systolic = sys;
          if (!isNaN(dia)) diastolic = dia;
        }
      }

      const bloodPressureStr =
        typeof v.bloodPressure === "string"
          ? v.bloodPressure
          : systolic && diastolic
          ? `${systolic}/${diastolic}`
          : null;

      return {
        id: n.id,
        timestamp: rawDate.toISOString(),
        dateFormatted: rawDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        timeFormatted: rawDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        heartRate: typeof v.heartRate === "number" ? v.heartRate : null,
        bloodGlucose: typeof v.bloodGlucose === "number" ? v.bloodGlucose : null,
        bloodPressure: bloodPressureStr,
        systolic,
        diastolic,
        temperature: typeof v.temperature === "number" ? v.temperature : null,
        oxygenSaturation: typeof v.oxygenSaturation === "number" ? v.oxygenSaturation : null,
        weight: typeof v.weight === "number" ? v.weight : null,
        source: typeof v.source === "string" ? v.source : "Self-Reported",
        notes: n.content,
      };
    })
    .filter(
      (m) =>
        m.heartRate !== null ||
        m.bloodGlucose !== null ||
        m.bloodPressure !== null ||
        m.temperature !== null ||
        m.oxygenSaturation !== null ||
        m.weight !== null
    );

  const formattedDoses = doses.map((d) => ({
    id: d.id,
    medication: {
      id: d.medication.id,
      name: d.medication.name,
      strength: d.medication.strength,
      form: d.medication.form,
      dosageInstructions: d.medication.dosageInstructions,
      purpose: d.medication.purpose,
    },
    scheduledAt: d.scheduledAt.toISOString(),
    status: d.status,
    confirmedAt: d.confirmedAt?.toISOString() || null,
    confirmationNotes: d.confirmationNotes,
  }));

  const formattedMedications = allMedications.map((m) => ({
    id: m.id,
    name: m.name,
    strength: m.strength,
    form: m.form,
    dosageInstructions: m.dosageInstructions,
    purpose: m.purpose,
    frequency: m.schedules[0]?.frequency || undefined,
    stockCount: m.stock?.currentStock || undefined,
  }));

  const formattedAppts = appointments.map((a) => ({
    id: a.id,
    title: a.title,
    doctorName: a.doctorName,
    clinicName: a.clinicName,
    appointmentDate: a.appointmentDate.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        activeProfileId={selectedProfile.id}
        availableProfiles={profiles.map((p) => ({
          id: p.id,
          name: p.name,
          preferredName: p.preferredName,
        }))}
      />
      <main className="flex-1">
        <SeniorDashboardClient
          initialProfile={{
            id: selectedProfile.id,
            name: selectedProfile.name,
            preferredName: selectedProfile.preferredName,
            emergencyContactName: selectedProfile.emergencyContactName,
            emergencyContactPhone: selectedProfile.emergencyContactPhone,
            notes: selectedProfile.notes,
          }}
          initialDoses={formattedDoses}
          allMedications={formattedMedications}
          upcomingAppointments={formattedAppts}
          initialMeasurements={formattedMeasurements}
          caretaker={
            caretakerMember
              ? {
                  name: caretakerMember.user.name,
                  phone: caretakerMember.user.phoneNumber || null,
                  role: "Licensed Nurse / Caretaker",
                }
              : null
          }
        />
      </main>
    </div>
  );

}
