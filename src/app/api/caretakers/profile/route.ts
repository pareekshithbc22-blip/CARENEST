import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { updateCaretakerProfessionalProfile } from "@/lib/services/caretaker-service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CARETAKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.caretakerProfile.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({ profile });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CARETAKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updated = await updateCaretakerProfessionalProfile(user.id, {
      specialization: body.specialization,
      yearsOfExperience: body.yearsOfExperience !== undefined ? Number(body.yearsOfExperience) : undefined,
      backgroundSummary: body.backgroundSummary,
    });

    return NextResponse.json({ profile: updated });
  } catch (err: any) {
    console.error("[Caretaker Profile PATCH Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to update profile" }, { status: 400 });
  }
}
