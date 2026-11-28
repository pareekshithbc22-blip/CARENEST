import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { getPatientHealthMetricsByRange, HealthMetricsRange } from "@/lib/services/health-metrics-service";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");
  const range = (searchParams.get("range") || "live") as HealthMetricsRange;

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const access = await verifyProfileAccess(user.id, profileId, "CAN_VIEW_RECORDS");
  if (!access.authorized) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const data = await getPatientHealthMetricsByRange(profileId, range);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[Health Metrics Range Error]:", err);
    return NextResponse.json({ error: "Failed to retrieve health metrics" }, { status: 500 });
  }
}
