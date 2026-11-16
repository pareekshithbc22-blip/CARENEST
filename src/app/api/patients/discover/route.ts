import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "CARETAKER") {
      return NextResponse.json(
        { error: "Access denied. Patient discovery is reserved for licensed caretakers." },
        { status: 403 }
      );
    }

    // Gate: Caretaker MUST be verified and approved by CARENEST
    const caretakerProfile = await prisma.caretakerProfile.findUnique({
      where: { userId: user.id },
      select: { status: true, professionalCategory: true, qualification: true },
    });

    if (!caretakerProfile || caretakerProfile.status !== "APPROVED") {
      return NextResponse.json(
        {
          error: "Your professional qualifications are pending verification. Only approved caretakers can discover and connect with patients.",
          verificationStatus: caretakerProfile?.status || "PENDING",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim() || "";

    const whereClause: any = {};
    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { preferredName: { contains: query, mode: "insensitive" } },
      ];
    }

    const profiles = await prisma.elderlyProfile.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        preferredName: true,
        dateOfBirth: true,
        gender: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        careCircles: {
          take: 1,
          select: {
            id: true,
            name: true,
          },
        },
        caretakerAccessRequests: {
          where: { caretakerId: user.id },
          select: {
            id: true,
            status: true,
            requestedAt: true,
            respondedAt: true,
            notes: true,
            rejectionReason: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const now = new Date();
    const sanitizedPatients = profiles.map((p) => {
      // Calculate age from date of birth
      const dob = new Date(p.dateOfBirth);
      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
        age--;
      }

      const activeRequest = p.caretakerAccessRequests[0] || null;

      return {
        id: p.id,
        name: p.name,
        preferredName: p.preferredName || p.name,
        age: Math.max(0, age),
        gender: p.gender || "Not specified",
        primaryCareCircle: p.careCircles[0]?.name || "Family Care Circle",
        familyCoordinatorName: p.createdBy.name,
        connectionStatus: activeRequest ? activeRequest.status : "NONE",
        requestId: activeRequest?.id || null,
        rejectionReason: activeRequest?.rejectionReason || null,
        requestedAt: activeRequest?.requestedAt || null,
      };
    });

    return NextResponse.json({
      patients: sanitizedPatients,
      total: sanitizedPatients.length,
      caretakerStatus: caretakerProfile.status,
    });
  } catch (error: any) {
    console.error("[Patient Discovery API Error]:", error);
    return NextResponse.json(
      { error: "Internal server error during patient discovery search" },
      { status: 500 }
    );
  }
}
