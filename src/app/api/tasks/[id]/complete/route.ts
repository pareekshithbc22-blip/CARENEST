import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { completeTaskBySenior } from "@/lib/services/task-service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    let targetDateStr: string | undefined;
    try {
      const body = await req.json();
      targetDateStr = body.targetDateStr;
    } catch {
      // Body optional
    }

    const result = await completeTaskBySenior(user.id, user.role, id, targetDateStr);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("[Task Complete POST Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to complete task" },
      { status: err.statusCode || 500 }
    );
  }
}
