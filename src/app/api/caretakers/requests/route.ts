import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "CARETAKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all requests directed to this caretaker
  const requests = await prisma.patientAccessRequest.findMany({
    where: { caretakerId: user.id },
    include: {
      elderlyProfile: {
        select: {
          id: true,
          name: true,
          patientCode: true,
          dateOfBirth: true,
        },
      },
      familyAdmin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { requestedAt: "desc" },
  });

  const nowMs = Date.now();

  // For pending requests, redact to ONLY name, age, patient ID and family admin's name
  const sanitized = requests.map((r) => {
    const age = Math.abs(new Date(nowMs - r.elderlyProfile.dateOfBirth.getTime()).getUTCFullYear() - 1970);
    return {
      id: r.id,
      status: r.status,
      requestedAt: r.requestedAt,
      patientId: r.elderlyProfile.id,
      patientName: r.elderlyProfile.name,
      patientCode: r.elderlyProfile.patientCode,
      age,
      familyAdminName: r.familyAdmin.name,
      // Full details only if APPROVED
      ...(r.status === "APPROVED"
        ? {
            notes: r.notes,
            respondedAt: r.respondedAt,
          }
        : {}),
    };
  });

  return NextResponse.json({
    requests: sanitized,
    pending: sanitized.filter((r) => r.status === "PENDING"),
  });
}
