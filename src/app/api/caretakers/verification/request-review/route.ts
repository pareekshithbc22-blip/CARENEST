import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { assertValidTransition, VerificationReasonCode } from "@/lib/domain/verification";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CARETAKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.caretakerProfile.findUnique({
    where: { userId: user.id },
    include: {
      verificationCases: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!profile || profile.verificationCases.length === 0) {
    return NextResponse.json({ error: "No active verification case found" }, { status: 404 });
  }

  const latestCase = profile.verificationCases[0];

  // Only AUTO_REJECTED cases can request manual review appeal
  if (latestCase.status !== "AUTO_REJECTED") {
    return NextResponse.json(
      { error: `Manual review can only be requested for auto-rejected cases (current status: ${latestCase.status}).` },
      { status: 400 }
    );
  }

  assertValidTransition("AUTO_REJECTED", "MANUAL_REVIEW");

  const body = await req.json().catch(() => ({}));
  const appealNote = typeof body.appealNote === "string" ? body.appealNote.trim() : "";

  await prisma.$transaction(async (tx) => {
    // 1. Transition case to MANUAL_REVIEW
    await tx.verificationCase.update({
      where: { id: latestCase.id },
      data: {
        status: "MANUAL_REVIEW",
        reasonCodes: { push: VerificationReasonCode.MANUAL_REVIEW_REQUIRED },
      },
    });

    // 2. Set caretaker profile to UNDER_REVIEW
    await tx.caretakerProfile.update({
      where: { id: profile.id },
      data: {
        status: "UNDER_REVIEW",
        rejectionReason: null,
      },
    });

    // 3. Append-only event
    await tx.verificationEvent.create({
      data: {
        caseId: latestCase.id,
        stage: "MANUAL_REVIEW_REQUEST",
        actor: user.id,
        outcome: "REQUESTED_BY_CARETAKER",
        details: { appealNote },
      },
    });

    // 4. Notify platform admins
    const admins = await tx.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    for (const admin of admins) {
      await tx.notification.create({
        data: {
          userId: admin.id,
          type: "SYSTEM",
          title: "Caretaker Appeal for Manual Review",
          message: `${profile.fullName} requested manual compliance review for their certificate (${profile.issuingAuthority}).`,
          dedupKey: `appeal-review-${latestCase.id}-${admin.id}`,
        },
      });
    }
  });

  return NextResponse.json({
    success: true,
    message: "Your application has been queued for manual review by our medical compliance team.",
  });
}
