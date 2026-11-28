import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getAuthorizedProfiles } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { CaretakerDashboardClient } from "@/components/caretaker/caretaker-dashboard-client";
import { evaluateBloodSugar, evaluateBloodPressure } from "@/lib/config";

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

  // Ensure email is verified before dashboard access
  if (user.role !== "SENIOR" && !user.isEmailVerified) {
    redirect(`/register?step=otp&email=${encodeURIComponent(user.email || "")}`);
  }

  // Fetch caretaker professional verification profile
  const caretakerProfile = await prisma.caretakerProfile.findUnique({
    where: { userId: user.id },
  });

  if (!caretakerProfile) {
    redirect("/auth/complete-profile?role=CARETAKER");
  }

  // Enforce Authenticator-based 2FA for Licensed Caretakers
  if (user.role === "FAMILY" || user.role === "CARETAKER") {
    if (!user.twoFactorEnabled) {
      redirect("/auth/2fa/setup");
    }
    if (!user.twoFactorVerified) {
      redirect("/auth/2fa/verify?callbackUrl=/dashboard/caretaker");
    }
  }

  // Accessible profiles (enforces verification status === "APPROVED" in permissions.ts)
  const profiles = await getAuthorizedProfiles(user.id);

  const { patientId, profileId, tab } = await searchParams;
  const initialPatientId =
    (patientId && profiles.some((p) => p.id === patientId) ? patientId : null) ||
    (profileId && profiles.some((p) => p.id === profileId) ? profileId : null) ||
    profiles[0]?.id ||
    "";

  // Preload clinical summaries for each assigned patient (latest vitals, dose progress, alert badges)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const profilesWithSummaries = await Promise.all(
    profiles.map(async (p) => {
      // 1. Latest Vital Note
      const latestNote = await prisma.careNote.findFirst({
        where: {
          elderlyProfileId: p.id,
          category: "HEALTH_UPDATE",
        },
        orderBy: { createdAt: "desc" },
      });

      let latestSugar: number | null = null;
      let latestBp: string | null = null;
      let sugarSeverity: "NORMAL" | "WARNING" | "CRITICAL" = "NORMAL";
      let bpSeverity: "NORMAL" | "WARNING" | "CRITICAL" = "NORMAL";

      if (latestNote?.vitalSigns && typeof latestNote.vitalSigns === "object") {
        const v = latestNote.vitalSigns as Record<string, unknown>;
        latestSugar = typeof v.bloodGlucose === "number" ? v.bloodGlucose : null;
        let sys = typeof v.systolic === "number" ? v.systolic : null;
        let dia = typeof v.diastolic === "number" ? v.diastolic : null;

        if (typeof v.bloodPressure === "string" && (!sys || !dia)) {
          const parts = v.bloodPressure.split("/");
          if (parts.length === 2) {
            sys = parseInt(parts[0].trim(), 10) || null;
            dia = parseInt(parts[1].trim(), 10) || null;
          }
        }

        latestBp = sys && dia ? `${sys}/${dia} mmHg` : (v.bloodPressure as string) || null;
        sugarSeverity = evaluateBloodSugar(latestSugar).severity;
        bpSeverity = evaluateBloodPressure(sys, dia).severity;
      }

      // 2. Today's Dose Progress
      const todayDoses = await prisma.scheduledDose.findMany({
        where: {
          elderlyProfileId: p.id,
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
        select: { status: true },
      });

      const totalDoses = todayDoses.length;
      const takenDoses = todayDoses.filter((d) => d.status === "TAKEN").length;
      const missedDoses = todayDoses.filter((d) => d.status === "MISSED").length;

      // 3. Alert Badges
      const alertBadges: string[] = [];
      if (missedDoses > 0) {
        alertBadges.push(`${missedDoses} Missed Dose${missedDoses > 1 ? "s" : ""}`);
      }
      if (sugarSeverity === "CRITICAL" || bpSeverity === "CRITICAL") {
        alertBadges.push("Critical Vitals");
      } else if (sugarSeverity === "WARNING" || bpSeverity === "WARNING") {
        alertBadges.push("Abnormal Vitals");
      }

      return {
        id: p.id,
        name: p.name,
        preferredName: p.preferredName,
        patientCode: p.patientCode,
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString() : undefined,
        emergencyContactName: p.emergencyContactName,
        emergencyContactPhone: p.emergencyContactPhone,
        medicalConditions: p.medicalConditions,
        allergies: p.allergies,
        latestBloodSugar: latestSugar ? `${latestSugar} mg/dL` : null,
        latestBloodPressure: latestBp,
        sugarSeverity,
        bpSeverity,
        latestCondition: latestNote?.condition || null,
        doseProgress: {
          taken: takenDoses,
          total: totalDoses,
        },
        alertBadges,
      };
    })
  );

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
          profiles={profilesWithSummaries}
        />
      </main>
    </div>
  );
}
