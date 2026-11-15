import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAuthorizedProfiles } from "@/lib/permissions";
import { getProfileAnalytics, getProfileTimeline } from "@/lib/analytics/service";
import { getProfileRefillEstimates } from "@/lib/refill/service";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { FamilyDashboardClient } from "@/components/family/family-dashboard-client";
import { FamilyOnboarding } from "@/components/family/family-onboarding";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Family Care Coordinator Dashboard - CareNest",
  description: "One connected circle of care. Real-time medication adherence, caretaker coordination, and healthcare timelines.",
};

export default async function FamilyDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ profileId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/dashboard/family");
  }

  const profiles = await getAuthorizedProfiles(user.id);
  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <FamilyOnboarding userName={user.name || "Family Coordinator"} />
        </main>
      </div>
    );
  }

  const { profileId } = await searchParams;
  const activeProfile =
    (profileId && profiles.find((p) => p.id === profileId)) ||
    profiles.find((p) => p.name.includes("Eleanor")) ||
    profiles[0];

  // Fetch full details of the active selected profile
  const fullProfile = await prisma.elderlyProfile.findUnique({
    where: { id: activeProfile.id },
    include: {
      careCircles: {
        include: {
          members: {
            where: { isActive: true },
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true, avatarUrl: true, phoneNumber: true },
              },
            },
          },
        },
      },
      medications: {
        where: { isArchived: false },
        include: {
          stock: true,
          schedules: { where: { isActive: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      appointments: {
        orderBy: { appointmentDate: "asc" },
      },
      careNotes: {
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
    },
  });

  if (!fullProfile) {
    redirect("/dashboard/family");
  }

  // Fetch summary metadata for all senior patient profiles registered & managed by this administrator
  const managedSeniors = await Promise.all(
    profiles.map(async (p) => {
      const caretakerMember = await prisma.careCircleMember.findFirst({
        where: {
          careCircle: { elderlyProfileId: p.id },
          role: "CARETAKER",
          isActive: true,
        },
        include: {
          user: { select: { id: true, name: true, phoneNumber: true, email: true } },
        },
      });

      const medCount = await prisma.medication.count({
        where: { elderlyProfileId: p.id, isArchived: false },
      });

      const apptCount = await prisma.appointment.count({
        where: { elderlyProfileId: p.id, status: "UPCOMING" },
      });

      return {
        id: p.id,
        name: p.name,
        preferredName: p.preferredName,
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString() : null,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        allergies: p.allergies || [],
        medicalConditions: p.medicalConditions || [],
        emergencyContactName: p.emergencyContactName,
        emergencyContactPhone: p.emergencyContactPhone,
        emergencyContactRelation: p.emergencyContactRelation || "Family Member",
        notes: p.notes,
        avatarUrl: p.avatarUrl,
        caretaker: caretakerMember?.user
          ? {
              id: caretakerMember.user.id,
              name: caretakerMember.user.name,
              phoneNumber: caretakerMember.user.phoneNumber,
              email: caretakerMember.user.email,
            }
          : null,
        medicationsCount: medCount,
        upcomingAppointmentsCount: apptCount,
      };
    })
  );

  // Health records & vitals for the active profile
  const vitalsNotes = await prisma.careNote.findMany({
    where: {
      elderlyProfileId: fullProfile.id,
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  const parsedVitals = vitalsNotes
    .filter((n) => n.vitalSigns !== null && typeof n.vitalSigns === "object")
    .map((n) => {
      const v = (n.vitalSigns || {}) as Record<string, unknown>;
      return {
        id: n.id,
        createdAt: n.createdAt.toISOString(),
        heartRate: typeof v.heartRate === "number" ? v.heartRate : null,
        bloodGlucose: typeof v.bloodGlucose === "number" ? v.bloodGlucose : null,
        bloodPressure: typeof v.bloodPressure === "string" ? v.bloodPressure : null,
        systolic: typeof v.systolic === "number" ? v.systolic : null,
        diastolic: typeof v.diastolic === "number" ? v.diastolic : null,
        temperature: typeof v.temperature === "number" ? v.temperature : null,
        oxygenSaturation: typeof v.oxygenSaturation === "number" ? v.oxygenSaturation : null,
        weight: typeof v.weight === "number" ? v.weight : null,
        notes: n.content,
      };
    });

  // Active profile's assigned caretaker (or null if pending)
  const activeCaretakerMember = fullProfile.careCircles[0]?.members?.find(
    (m) => m.role === "CARETAKER" && m.isActive
  );
  const activeCaretaker = activeCaretakerMember?.user
    ? {
        name: activeCaretakerMember.user.name,
        phoneNumber: activeCaretakerMember.user.phoneNumber,
        email: activeCaretakerMember.user.email,
      }
    : null;

  // Analytics, Refill Projections, and Timeline
  const [analytics, refillEstimates, timeline] = await Promise.all([
    getProfileAnalytics(fullProfile.id),
    getProfileRefillEstimates(fullProfile.id),
    getProfileTimeline(fullProfile.id, 25),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        activeProfileId={fullProfile.id}
        availableProfiles={profiles.map((p) => ({
          id: p.id,
          name: p.name,
          preferredName: p.preferredName,
        }))}
      />
      <main className="flex-1">
        <FamilyDashboardClient
          adminUser={{
            id: user.id,
            name: user.name || "Family Administrator",
            email: user.email || "",
          }}
          managedSeniors={managedSeniors}
          profile={fullProfile}
          activeCaretaker={activeCaretaker}
          vitalsHistory={parsedVitals}
          availableProfiles={profiles.map((p) => ({
            id: p.id,
            name: p.name,
            preferredName: p.preferredName,
          }))}
          analytics={analytics}
          refillEstimates={refillEstimates}
          timeline={timeline}
          currentUserId={user.id}
        />
      </main>
    </div>
  );
}
