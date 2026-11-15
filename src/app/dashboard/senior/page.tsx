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

  // Default to Eleanor Vance or first profile
  const selectedProfile =
    profiles.find((p) => p.name.includes("Eleanor")) || profiles[0];

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

  // Upcoming appointments
  const appointments = await prisma.appointment.findMany({
    where: {
      elderlyProfileId: selectedProfile.id,
      status: "UPCOMING",
      appointmentDate: { gte: now },
    },
    orderBy: { appointmentDate: "asc" },
    take: 2,
  });

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
          upcomingAppointments={formattedAppts}
        />
      </main>
    </div>
  );
}
