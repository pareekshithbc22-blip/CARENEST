import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { respondToCaretakerRequest } from "@/lib/services/access-request-service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CARETAKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const action = body.action?.toUpperCase();

    if (action !== "ACCEPT" && action !== "REJECT" && action !== "APPROVE") {
      return NextResponse.json(
        { error: "Action must be ACCEPT or REJECT" },
        { status: 400 }
      );
    }

    const normAction = action === "REJECT" ? "REJECT" : "ACCEPT";
    const result = await respondToCaretakerRequest(
      id,
      user.id,
      normAction,
      body.rejectionReason || body.reason
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Caretaker Request Respond Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to respond to patient request" },
      { status: 400 }
    );
  }
}
