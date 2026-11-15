import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { getProfileAnalytics } from "@/lib/analytics/service";
import { getProfileRefillEstimates } from "@/lib/refill/service";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const access = await verifyProfileAccess(user.id, profileId, "CAN_VIEW_RECORDS");
  if (!access.authorized) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const [analytics, refillEstimates] = await Promise.all([
      getProfileAnalytics(profileId),
      getProfileRefillEstimates(profileId),
    ]);

    return NextResponse.json({
      analytics,
      refillEstimates,
    });
  } catch (err: any) {
    console.error("[Analytics GET Error]:", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
