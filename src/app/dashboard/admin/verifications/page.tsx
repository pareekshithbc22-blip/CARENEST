import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { VerificationsPortal } from "@/components/admin/verifications-portal";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Clinical License Verifications - CareNest Admin",
  description: "Platform compliance review portal for licensed caretaker registrations and certificates.",
};

export default async function AdminVerificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/dashboard/admin/verifications");
  }

  // Strict role check: platform administrators only
  if (user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto text-xl font-black">
              ✕
            </div>
            <h2 className="text-xl font-black text-slate-900">Access Restricted</h2>
            <p className="text-xs text-slate-600">
              This portal is restricted to authorized platform clinical administrators. Your account ({user.email}) does not possess the ADMIN credential.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Fetch all caretaker profiles
  const profiles = await prisma.caretakerProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          createdAt: true,
        },
      },
      reviewedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedApplications = profiles.map((p) => ({
    id: p.id,
    userId: p.userId,
    fullName: p.fullName,
    professionalCategory: p.professionalCategory,
    qualification: p.qualification,
    registrationNumber: p.registrationNumber,
    issuingAuthority: p.issuingAuthority,
    state: p.state,
    documentFileName: p.documentFileName,
    documentMimeType: p.documentMimeType,
    documentFileSize: p.documentFileSize,
    status: p.status,
    rejectionReason: p.rejectionReason,
    reviewedAt: p.reviewedAt ? p.reviewedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    user: {
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
      phoneNumber: p.user.phoneNumber,
      createdAt: p.user.createdAt.toISOString(),
    },
    reviewedBy: p.reviewedBy
      ? {
          id: p.reviewedBy.id,
          name: p.reviewedBy.name,
          email: p.reviewedBy.email,
        }
      : null,
  }));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <VerificationsPortal
          initialApplications={serializedApplications}
          adminUser={{
            id: user.id,
            name: user.name || "Administrator",
            email: user.email || "",
          }}
        />
      </main>
    </div>
  );
}
