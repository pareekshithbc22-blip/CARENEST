import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { listVerifiedCaretakers } from "@/lib/services/caretaker-service";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");

  let declinedIds: string[] = [];
  if (patientId) {
    const profile = await prisma.elderlyProfile.findUnique({
      where: { id: patientId },
      select: { declinedCaretakerIds: true },
    });
    declinedIds = profile?.declinedCaretakerIds || [];
  }

  try {
    const caretakers = await listVerifiedCaretakers(declinedIds);
    return NextResponse.json({ caretakers });
  } catch (err: any) {
    console.error("[Caretakers Discover Error]:", err);
    return NextResponse.json({ error: "Failed to load caretakers" }, { status: 500 });
  }
}
