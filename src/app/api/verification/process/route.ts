import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processVerificationJob, reverifyActiveCaretakers } from "@/lib/services/verification-service";
import { verifyCronSecret } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * Background Worker Endpoint for Automated Verification Processing.
 * Secured by CRON_SECRET header to prevent unauthorized invocation.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const providedSecret = authHeader?.replace(/^Bearer\s+/i, "") || req.headers.get("x-cron-secret");

  // Constant-time cron verification; fails closed (false) if CRON_SECRET is not configured
  if (!verifyCronSecret(providedSecret)) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing cron secret" }, { status: 401 });
  }

  const now = new Date();

  try {
    // 1. Find due pending jobs
    const dueJobs = await prisma.verificationJob.findMany({
      where: {
        status: "PENDING",
        nextAttemptAt: { lte: now },
        lockedAt: null,
      },
      orderBy: { nextAttemptAt: "asc" },
      take: 15,
      select: { id: true },
    });

    let processedCount = 0;
    for (const job of dueJobs) {
      await processVerificationJob(job.id);
      processedCount += 1;
    }

    // 2. Run periodic re-verification check
    const reverifyResult = await reverifyActiveCaretakers();

    return NextResponse.json({
      success: true,
      processedJobs: processedCount,
      reverified: reverifyResult.reverified,
      expired: reverifyResult.expired,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("[Verification Worker Error]:", error);
    return NextResponse.json(
      { error: "Internal server error during verification background processing" },
      { status: 500 }
    );
  }
}
