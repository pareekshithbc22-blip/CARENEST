import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAuthorizedProfiles } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { CaretakerDashboardClient } from "@/components/caretaker/caretaker-dashboard-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Caretaker Dashboard - CareNest",
  description: "Assigned responsibilities, daily care tasks, clinical vitals logging, and shift handovers.",
};

export default async function CaretakerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/dashboard/caretaker");
  }

  // Accessible profiles
  const profiles = await getAuthorizedProfiles(user.id);
  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-lg bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Awaiting Patient Care Assignment</h2>
            <p className="text-sm text-slate-600">
              Welcome, {user.name}. You are registered as a Licensed Caretaker / Nurse. You will see assigned patient schedules, clinical tasks, vital sign logs, and handover notes here once a family coordinator assigns you to their Care Circle.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Assigned tasks
  const tasks = await prisma.careTask.findMany({
    where: {
      OR: [
        { assignedToId: user.id },
        { elderlyProfileId: { in: profiles.map((p) => p.id) } },
      ],
    },
    include: {
      assignedTo: { select: { id: true, name: true, role: true } },
      completedBy: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  // Recent care notes
  const notes = await prisma.careNote.findMany({
    where: {
      elderlyProfileId: { in: profiles.map((p) => p.id) },
    },
    include: {
      author: { select: { id: true, name: true, role: true } },
      shiftHandoverTo: { select: { id: true, name: true } },
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 10,
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        availableProfiles={profiles.map((p) => ({
          id: p.id,
          name: p.name,
          preferredName: p.preferredName,
        }))}
      />
      <main className="flex-1">
        <CaretakerDashboardClient
          caretakerName={user.name || "Care Staff"}
          initialTasks={tasks}
          initialNotes={notes}
          profiles={profiles.map((p) => ({
            id: p.id,
            name: p.name,
            preferredName: p.preferredName,
            dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString() : undefined,
            emergencyContactName: p.emergencyContactName,
            emergencyContactPhone: p.emergencyContactPhone,
            medicalConditions: p.medicalConditions,
            allergies: p.allergies,
          }))}
        />
      </main>
    </div>
  );
}
