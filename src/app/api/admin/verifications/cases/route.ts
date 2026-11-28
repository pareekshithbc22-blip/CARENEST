import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Access denied. Only platform administrators can view verification cases." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");

  const whereClause: any = {};
  if (statusParam && statusParam !== "ALL") {
    whereClause.status = statusParam;
  }

  const cases = await prisma.verificationCase.findMany({
    where: whereClause,
    include: {
      caretakerProfile: {
        include: {
          user: {
            select: { id: true, name: true, email: true, phoneNumber: true, isEmailVerified: true },
          },
        },
      },
      events: {
        orderBy: { timestamp: "asc" },
      },
      jobs: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 50,
  });

  // Calculate platform verification metrics
  const totalCases = await prisma.verificationCase.count();
  const autoApprovedCount = await prisma.verificationCase.count({ where: { status: "AUTO_APPROVED" } });
  const approvedCount = await prisma.verificationCase.count({ where: { status: "APPROVED" } });
  const manualReviewCount = await prisma.verificationCase.count({ where: { status: "MANUAL_REVIEW" } });
  const rejectedCount = await prisma.verificationCase.count({ where: { status: { in: ["AUTO_REJECTED", "REJECTED"] } } });

  // Calculate average time to decision
  const decidedCases = await prisma.verificationCase.findMany({
    where: { decidedAt: { not: null } },
    select: { submittedAt: true, decidedAt: true },
    take: 100,
  });

  let totalDurationMs = 0;
  for (const c of decidedCases) {
    if (c.decidedAt) {
      totalDurationMs += c.decidedAt.getTime() - c.submittedAt.getTime();
    }
  }
  const avgDurationMs = decidedCases.length > 0 ? Math.round(totalDurationMs / decidedCases.length) : 0;

  return NextResponse.json({
    cases,
    metrics: {
      totalCases,
      autoApproved: autoApprovedCount,
      adminApproved: approvedCount,
      manualReview: manualReviewCount,
      rejected: rejectedCount,
      averageTimeToDecisionMs: avgDurationMs,
    },
  });
}
