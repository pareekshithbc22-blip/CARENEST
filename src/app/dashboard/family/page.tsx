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

  // Fetch full profile details
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
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
    },
  });

  if (!fullProfile) {
    redirect("/dashboard/family");
  }

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
          profile={fullProfile}
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
