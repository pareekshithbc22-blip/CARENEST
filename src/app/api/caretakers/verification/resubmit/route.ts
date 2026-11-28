import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { intakeVerification } from "@/lib/services/verification-service";
import {
  checkPersistentRateLimit,
  recordPersistentFailedAttempt,
} from "@/lib/services/rate-limit-service";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CARETAKER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Enforce daily submission rate limiting
  const limitStatus = await checkPersistentRateLimit({
    action: "VERIFY_SUBMIT",
    identifier: user.id,
  });

  if (!limitStatus.allowed) {
    return NextResponse.json(
      {
        error: `Submission limit reached. Please try again in ${Math.ceil(
          (limitStatus.remainingSeconds || 3600) / 60
        )} minutes.`,
      },
      { status: 429 }
    );
  }

  const profile = await prisma.caretakerProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: "Caretaker profile not found" }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { registrationNumber, issuingAuthority, state, qualification, documentFilePath, documentFileName, documentMimeType, documentFileSize } = body;

    // Optional update of details if provided during resubmit
    if (registrationNumber || issuingAuthority || documentFilePath) {
      await prisma.caretakerProfile.update({
        where: { id: profile.id },
        data: {
          registrationNumber: registrationNumber ? registrationNumber.trim() : profile.registrationNumber,
          issuingAuthority: issuingAuthority ? issuingAuthority.trim() : profile.issuingAuthority,
          state: state !== undefined ? state?.trim() || null : profile.state,
          qualification: qualification ? qualification.trim() : profile.qualification,
          documentFilePath: documentFilePath || profile.documentFilePath,
          documentFileName: documentFileName || profile.documentFileName,
          documentMimeType: documentMimeType || profile.documentMimeType,
          documentFileSize: documentFileSize || profile.documentFileSize,
          status: "PENDING",
          rejectionReason: null,
        },
      });
    }

    const intakeResult = await intakeVerification(profile.id, user.id);

    return NextResponse.json({
      success: true,
      caseId: intakeResult.caseId,
      status: intakeResult.status,
      message: "Credentials resubmitted successfully for automated verification.",
    });
  } catch (err: any) {
    console.error("[Verification Resubmit Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to resubmit credentials" }, { status: 400 });
  }
}
