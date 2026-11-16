import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. Only platform administrators can view verification requests." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    const whereClause: any = {};
    if (statusParam && ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"].includes(statusParam)) {
      whereClause.status = statusParam;
    }

    const applications = await prisma.caretakerProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            avatarUrl: true,
            isEmailVerified: true,
            createdAt: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const counts = {
      total: await prisma.caretakerProfile.count(),
      pending: await prisma.caretakerProfile.count({ where: { status: "PENDING" } }),
      underReview: await prisma.caretakerProfile.count({ where: { status: "UNDER_REVIEW" } }),
      approved: await prisma.caretakerProfile.count({ where: { status: "APPROVED" } }),
      rejected: await prisma.caretakerProfile.count({ where: { status: "REJECTED" } }),
    };

    return NextResponse.json({
      applications,
      counts,
    });
  } catch (error: any) {
    console.error("[Admin Verifications GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error while fetching verification applications" },
      { status: 500 }
    );
  }
}
