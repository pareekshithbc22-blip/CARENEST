import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "FAMILY" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Only family administrators can manage caretaker requests." },
        { status: 403 }
      );
    }

    const requests = await prisma.patientAccessRequest.findMany({
      where: { familyAdminId: user.id },
      include: {
        elderlyProfile: {
          select: {
            id: true,
            name: true,
            preferredName: true,
            avatarUrl: true,
            dateOfBirth: true,
          },
        },
        caretaker: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
            caretakerProfile: {
              select: {
                id: true,
                fullName: true,
                professionalCategory: true,
                qualification: true,
                registrationNumber: true,
                issuingAuthority: true,
                state: true,
                status: true,
                documentFileName: true,
                documentMimeType: true,
              },
            },
          },
        },
      },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json({
      requests,
      total: requests.length,
      pendingCount: requests.filter((r) => r.status === "PENDING").length,
      approvedCount: requests.filter((r) => r.status === "APPROVED").length,
    });
  } catch (error: any) {
    console.error("[Family Caretaker Requests GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error while fetching caretaker requests" },
      { status: 500 }
    );
  }
}
