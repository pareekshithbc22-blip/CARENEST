import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { assertValidTransition, VerificationReasonCode } from "@/lib/domain/verification";
import { sendEmail } from "@/lib/email/service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Access denied. Only platform administrators can review cases." }, { status: 403 });
  }

  const { id: caseId } = await params;
  const body = await req.json().catch(() => ({}));
  const { action, reason } = body;

  if (action !== "APPROVE" && action !== "REJECT") {
    return NextResponse.json({ error: "Action must be either APPROVE or REJECT." }, { status: 400 });
  }

  if (!reason || typeof reason !== "string" || reason.trim().length < 5) {
    return NextResponse.json({ error: "A written administrative reason (minimum 5 characters) is required." }, { status: 400 });
  }

  const vCase = await prisma.verificationCase.findUnique({
    where: { id: caseId },
    include: {
      caretakerProfile: {
        include: { user: true },
      },
    },
  });

  if (!vCase) {
    return NextResponse.json({ error: "Verification case not found." }, { status: 404 });
  }

  const targetStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
  assertValidTransition(vCase.status as any, targetStatus);

  const now = new Date();
  const profile = vCase.caretakerProfile;

  await prisma.$transaction(async (tx) => {
    // 1. Update VerificationCase
    await tx.verificationCase.update({
      where: { id: caseId },
      data: {
        status: targetStatus,
        decisionSource: "ADMIN",
        reasonCodes: {
          push: action === "APPROVE" ? VerificationReasonCode.ADMIN_OVERRIDE_APPROVED : VerificationReasonCode.ADMIN_OVERRIDE_REJECTED,
        },
        decidedAt: now,
      },
    });

    // 2. Synchronize CaretakerProfile
    await tx.caretakerProfile.update({
      where: { id: profile.id },
      data: {
        status: targetStatus,
        rejectionReason: action === "REJECT" ? reason.trim() : null,
        reviewedById: user.id,
        reviewedAt: now,
      },
    });

    // 3. Append-only Audit Log
    await tx.verificationEvent.create({
      data: {
        caseId,
        stage: "ADMIN_OVERRIDE",
        actor: user.id,
        outcome: targetStatus,
        reasonCodes: [action === "APPROVE" ? VerificationReasonCode.ADMIN_OVERRIDE_APPROVED : VerificationReasonCode.ADMIN_OVERRIDE_REJECTED],
        details: {
          adminName: user.name,
          adminEmail: user.email,
          reason: reason.trim(),
        },
      },
    });

    // 4. In-App Notification to Caretaker
    const title = action === "APPROVE" ? "Credentials Approved by Compliance Admin" : "Credentials Declined by Compliance Admin";
    const message = action === "APPROVE"
      ? `Your professional license has been verified by CARENEST administrator ${user.name}. Full clinical features are now active.`
      : `Your credential submission was declined: "${reason.trim()}". You may correct your information and resubmit.`;

    await tx.notification.create({
      data: {
        userId: profile.userId,
        type: "SYSTEM",
        title,
        message,
        dedupKey: `admin-decision-${caseId}-${action}`,
      },
    });
  });

  // 5. Send Email to Caretaker
  try {
    await sendEmail({
      to: profile.user.email,
      subject: `CARENEST: ${action === "APPROVE" ? "Credentials Approved" : "Credentials Update"}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: ${action === "APPROVE" ? "#0d9488" : "#e11d48"};">${action === "APPROVE" ? "Credentials Approved" : "Credentials Declined"}</h2>
          <p>Dear ${profile.fullName},</p>
          <p>${action === "APPROVE" ? "Your clinical credentials have been formally approved by our platform medical compliance administrator." : `Your credential application was reviewed and declined with the following reason: "${reason.trim()}".`}</p>
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">CARENEST Platform Administration</p>
        </div>
      `,
    });
  } catch (emailErr: any) {
    console.warn("[Admin Review Email Warning]:", emailErr.message);
  }

  return NextResponse.json({
    success: true,
    status: targetStatus,
    message: `Case successfully marked as ${targetStatus}.`,
  });
}
