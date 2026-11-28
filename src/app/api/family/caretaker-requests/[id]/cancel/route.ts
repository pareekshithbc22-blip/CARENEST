import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { cancelCaretakerRequest } from "@/lib/services/access-request-service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "FAMILY" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await cancelCaretakerRequest(id, user.id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Cancel Caretaker Request Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to cancel request" }, { status: 400 });
  }
}
