import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getReasonMessage } from "@/lib/domain/verification";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "CARETAKER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Access denied. Only caretakers can check verification status." }, { status: 403 });
  }

  const profile = await prisma.caretakerProfile.findUnique({
    where: { userId: user.id },
    include: {
      verificationCases: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          jobs: { orderBy: { createdAt: "asc" } },
          events: { orderBy: { timestamp: "asc" } },
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Caretaker profile not found" }, { status: 404 });
  }

  const latestCase = profile.verificationCases[0];

  if (!latestCase) {
    return NextResponse.json({
      hasCase: false,
      profileStatus: profile.status,
      isVerified: profile.status === "APPROVED" || (profile.status as any) === "AUTO_APPROVED",
      canResubmit: profile.status === "REJECTED",
    });
  }

  // Determine stage progression
  const jobs = latestCase.jobs;
  const stages = [
    {
      id: "file",
      label: "Checking file",
      status: jobs.find((j) => j.stage === "FILE_CHECKS")?.status || "PENDING",
    },
    {
      id: "extraction",
      label: "Reading certificate",
      status: jobs.find((j) => j.stage === "EXTRACTION")?.status || "PENDING",
    },
    {
      id: "registry",
      label: "Checking registry",
      status: jobs.find((j) => j.stage === "REGISTRY_LOOKUP")?.status || "PENDING",
    },
    {
      id: "result",
      label: "Result",
      status: latestCase.decidedAt ? "COMPLETED" : "PENDING",
    },
  ];

  const primaryReason = latestCase.reasonCodes[0] || "";
  const reasonMessage = primaryReason ? getReasonMessage(primaryReason) : null;
  const isVerified = latestCase.status === "AUTO_APPROVED" || latestCase.status === "APPROVED";

  return NextResponse.json({
    hasCase: true,
    caseId: latestCase.id,
    status: latestCase.status,
    decisionSource: latestCase.decisionSource,
    isVerified,
    canResubmit: latestCase.status === "AUTO_REJECTED" || latestCase.status === "REJECTED",
    canRequestReview: latestCase.status === "AUTO_REJECTED",
    submittedAt: latestCase.submittedAt,
    decidedAt: latestCase.decidedAt,
    reasonMessage,
    stages,
    events: latestCase.events.map((e) => ({
      stage: e.stage,
      outcome: e.outcome,
      timestamp: e.timestamp,
    })),
  });
}
