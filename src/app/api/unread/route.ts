import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getUnreadTabsForUser, markTabAsRead } from "@/lib/services/unread-marker-service";

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

  try {
    const unread = await getUnreadTabsForUser(user.id, profileId);
    return NextResponse.json({ unread });
  } catch (err: any) {
    console.error("[Unread GET Error]:", err);
    return NextResponse.json({ error: "Failed to get unread markers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { profileId, tab } = body;

    if (!profileId || !tab) {
      return NextResponse.json({ error: "profileId and tab are required" }, { status: 400 });
    }

    if (!["tasks", "medications", "notes"].includes(tab)) {
      return NextResponse.json({ error: "Invalid tab identifier" }, { status: 400 });
    }

    await markTabAsRead(user.id, profileId, tab);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Unread POST Error]:", err);
    return NextResponse.json({ error: "Failed to update unread marker" }, { status: 500 });
  }
}
