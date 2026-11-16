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

export default async function CaretakerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; profileId?: string; tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/dashboard/caretaker");
  }

  // Fetch caretaker professional verification profile
  const caretakerProfile = await prisma.caretakerProfile.findUnique({
    where: { userId: user.id },
  });

  // Accessible profiles (enforces verification status === "APPROVED" in permissions.ts)
  const profiles = await getAuthorizedProfiles(user.id);

  const { patientId, profileId, tab } = await searchParams;
  const initialPatientId =
    (patientId && profiles.some((p) => p.id === patientId) ? patientId : null) ||
    (profileId && profiles.some((p) => p.id === profileId) ? profileId : null) ||
    profiles[0]?.id ||
    "";

  // Assigned tasks for accessible patients
  const tasks =
    profiles.length > 0
      ? await prisma.careTask.findMany({
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
        })
      : [];

  // Recent care notes for accessible patients
  const notes =
    profiles.length > 0
      ? await prisma.careNote.findMany({
          where: {
            elderlyProfileId: { in: profiles.map((p) => p.id) },
          },
          include: {
            author: { select: { id: true, name: true, role: true } },
            shiftHandoverTo: { select: { id: true, name: true } },
          },
          orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
          take: 15,
        })
      : [];

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
          caretakerProfile={
            caretakerProfile
              ? {
                  id: caretakerProfile.id,
                  status: caretakerProfile.status,
                  rejectionReason: caretakerProfile.rejectionReason,
                  professionalCategory: caretakerProfile.professionalCategory,
                  qualification: caretakerProfile.qualification,
                  registrationNumber: caretakerProfile.registrationNumber,
                  issuingAuthority: caretakerProfile.issuingAuthority,
                  state: caretakerProfile.state,
                }
              : null
          }
          initialSelectedPatientId={initialPatientId}
          initialTasks={tasks}
          initialNotes={notes}
          initialSection={tab === "discover" ? "discover" : "patients"}
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
