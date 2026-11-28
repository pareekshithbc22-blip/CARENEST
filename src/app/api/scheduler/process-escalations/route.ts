import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { processDoseEscalations } from "@/lib/escalation/service";
import { verifyCronSecret } from "@/lib/security";

/**
 * Protected Cloud Scheduler Endpoint
 * Executed independently of browser sessions via Google Cloud Scheduler / cron.
 * Supports Authorization: Bearer <CRON_SECRET> or authenticated Admin session.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const providedBearer = authHeader?.replace(/^Bearer\s+/i, "");

  let isAuthorized = false;

  // Verify CRON_SECRET in constant-time (fails closed if CRON_SECRET is not configured)
  if (providedBearer && verifyCronSecret(providedBearer)) {
    isAuthorized = true;
  } else {
    // Alternatively allow signed-in admin session only.
    // Note: FAMILY role is explicitly excluded from triggering backend schedulers.
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role === "ADMIN") {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Unauthorized scheduler invocation. Valid CRON_SECRET Bearer token required." },
      { status: 401 }
    );
  }

  try {
    const summary = await processDoseEscalations();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (err: any) {
    console.error("[Scheduler Execution Error]:", err);
    return NextResponse.json(
      { error: "Escalation processing failure", details: err.message },
      { status: 500 }
    );
  }
}

export async function GET(_req: Request) {
  // Allow simple health check probe
  return NextResponse.json({
    status: "HEALTHY",
    endpoint: "/api/scheduler/process-escalations",
    method: "POST",
    description: "CareNest Background Missed-Dose Escalation Engine",
  });
}
