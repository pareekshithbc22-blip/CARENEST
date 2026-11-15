import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { getProfileTimeline } from "@/lib/analytics/service";

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
    const timeline = await getProfileTimeline(profileId, 30);
    return NextResponse.json({ timeline });
  } catch (err: any) {
    console.error("[Timeline GET Error]:", err);
    return NextResponse.json({ error: "Failed to load timeline" }, { status: 500 });
  }
}
