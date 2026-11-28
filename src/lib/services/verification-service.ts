/**
 * Caretaker Certificate Automated Verification Pipeline Service.
 * Manages intake, atomic job scheduling, pipeline execution, audit trails, and synchronization.
 */

import { prisma } from "@/lib/prisma";
import { getFileStorage } from "@/lib/verification/storage";
import { validateCertificateFile } from "@/lib/verification/security/file-validator";
import { getOcrProvider } from "@/lib/verification/providers/ocr";
import { getProviderRegistry } from "@/lib/verification/providers/registry";
import { isIdentityBindingConfigured, getIdentityBindingProvider } from "@/lib/verification/providers/identity-binding";
import {
  normalizeName,
  normalizeRegistrationNumber,
  normalizeAuthority,
  evaluateRiskSignals,
  evaluateVerificationPolicy,
  assertValidTransition,
  getReasonMessage,
  DEFAULT_POLICY_CONFIG,
  VerificationReasonCode,
  type VerificationCaseStatus,
} from "@/lib/domain/verification";
import { sendEmail } from "@/lib/email/service";

export interface IntakeResult {
  caseId: string;
  status: VerificationCaseStatus;
  message: string;
}

/**
 * Step 1: Intake a caretaker profile into the automated verification pipeline
 */
export async function intakeVerification(
  caretakerProfileId: string,
  actorUserId: string
): Promise<IntakeResult> {
  const profile = await prisma.caretakerProfile.findUnique({
    where: { id: caretakerProfileId },
    include: { user: true },
  });

  if (!profile) {
    throw new Error("Caretaker profile not found for verification intake.");
  }

  // 1. Rate Limit Enforcement: Max 5 submissions per caretaker account per 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const submissionsToday = await prisma.verificationCase.count({
    where: {
      caretakerProfileId,
      createdAt: { gte: oneDayAgo },
    },
  });

  if (submissionsToday >= DEFAULT_POLICY_CONFIG.maxSubmissionsPerDay) {
    throw new Error(
      `Daily submission limit reached (${DEFAULT_POLICY_CONFIG.maxSubmissionsPerDay} submissions per day). Please try again tomorrow.`
    );
  }

  // 2. Fetch and validate file from storage
  const storage = getFileStorage();
  const fileBuffer = await storage.getFile(profile.documentFilePath);
  const fileValidation = validateCertificateFile(fileBuffer);

  if (!fileValidation.valid) {
    throw new Error(fileValidation.error || "Uploaded certificate file failed integrity checks.");
  }

  const documentHash = fileValidation.fileHash;
  const normalizedRegNumber = normalizeRegistrationNumber(profile.registrationNumber || "");
  const normalizedAuthority = normalizeAuthority(profile.issuingAuthority);

  // 3. Create VerificationCase and Pipeline Jobs in a transaction
  const verificationCase = await prisma.$transaction(async (tx) => {
    const vCase = await tx.verificationCase.create({
      data: {
        caretakerProfileId,
        status: "SUBMITTED",
        decisionSource: "SYSTEM",
        documentHash,
        normalizedRegNumber,
        normalizedAuthority,
        reasonCodes: [],
      },
    });

    // Create ordered pipeline stages
    const stages: Array<"FILE_CHECKS" | "EXTRACTION" | "RISK_CHECKS" | "REGISTRY_LOOKUP" | "DECISION" | "NOTIFICATIONS"> = [
      "FILE_CHECKS",
      "EXTRACTION",
      "RISK_CHECKS",
      "REGISTRY_LOOKUP",
      "DECISION",
      "NOTIFICATIONS",
    ];

    for (let i = 0; i < stages.length; i++) {
      await tx.verificationJob.create({
        data: {
          caseId: vCase.id,
          stage: stages[i],
          status: "PENDING",
          attempts: 0,
          maxAttempts: 3,
          nextAttemptAt: new Date(Date.now() + i * 200), // Staggered by 200ms
        },
      });
    }

    // Append-only audit log: INTAKE
    await tx.verificationEvent.create({
      data: {
        caseId: vCase.id,
        stage: "INTAKE",
        actor: actorUserId,
        outcome: "SUBMITTED",
        details: {
          profileId: caretakerProfileId,
          documentFileName: profile.documentFileName,
          fileSize: fileValidation.size,
          fileHash: documentHash,
        },
      },
    });

    return vCase;
  });

  // 4. Eager execution: Process initial jobs immediately so fast responses complete within seconds
  try {
    await processVerificationCase(verificationCase.id);
  } catch (err: any) {
    console.warn(`[Verification Eager Execution Warning] Case ${verificationCase.id}:`, err.message);
  }

  const updatedCase = await prisma.verificationCase.findUnique({
    where: { id: verificationCase.id },
  });

  return {
    caseId: verificationCase.id,
    status: updatedCase?.status || "SUBMITTED",
    message: "Certificate queued for automated verification.",
  };
}

/**
 * Step 2: Executes pending jobs for a specific verification case
 */
export async function processVerificationCase(caseId: string): Promise<void> {
  const pendingJobs = await prisma.verificationJob.findMany({
    where: {
      caseId,
      status: "PENDING",
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const job of pendingJobs) {
    await processVerificationJob(job.id);
  }
}

/**
 * Step 3: Atomic execution of a single VerificationJob
 */
export async function processVerificationJob(jobId: string): Promise<void> {
  const now = new Date();

  // 1. Atomic claim: Lock job row
  const claimedCount = await prisma.verificationJob.updateMany({
    where: {
      id: jobId,
      status: "PENDING",
      nextAttemptAt: { lte: now },
      lockedAt: null,
    },
    data: {
      status: "PROCESSING",
      lockedAt: now,
      attempts: { increment: 1 },
    },
  });

  if (claimedCount.count === 0) {
    return; // Already claimed by another worker
  }

  const job = await prisma.verificationJob.findUnique({
    where: { id: jobId },
    include: {
      case: {
        include: {
          caretakerProfile: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!job) return;

  const vCase = job.case;
  const profile = vCase.caretakerProfile;

  try {
    // 2. Execute Stage Logic
    switch (job.stage) {
      case "FILE_CHECKS": {
        await executeFileChecksStage(vCase.id, profile);
        break;
      }
      case "EXTRACTION": {
        await executeExtractionStage(vCase.id, profile);
        break;
      }
      case "RISK_CHECKS": {
        await executeRiskChecksStage(vCase.id, profile);
        break;
      }
      case "REGISTRY_LOOKUP": {
        await executeRegistryLookupStage(vCase.id, profile);
        break;
      }
      case "IDENTITY_BINDING": {
        // Handled asynchronously if configured
        break;
      }
      case "DECISION": {
        await executeDecisionStage(vCase.id, profile);
        break;
      }
      case "NOTIFICATIONS": {
        await executeNotificationsStage(vCase.id, profile);
        break;
      }
    }

    // 3. Mark job COMPLETED
    await prisma.verificationJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        lockedAt: null,
      },
    });
  } catch (err: any) {
    console.error(`[Verification Job Failed] Stage: ${job.stage}, Job ID: ${job.id}:`, err);

    const isLastAttempt = job.attempts >= job.maxAttempts;

    if (isLastAttempt) {
      // Transition case to MANUAL_REVIEW on repeated worker failure
      await prisma.$transaction(async (tx) => {
        await tx.verificationJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            lastErrorCode: "JOB_RETRY_LIMIT_EXCEEDED",
            lockedAt: null,
          },
        });

        await tx.verificationCase.update({
          where: { id: vCase.id },
          data: {
            status: "MANUAL_REVIEW",
            reasonCodes: { push: VerificationReasonCode.MAX_ATTEMPTS_EXCEEDED },
          },
        });

        await tx.verificationEvent.create({
          data: {
            caseId: vCase.id,
            stage: job.stage,
            actor: "SYSTEM",
            outcome: "ROUTED_TO_MANUAL_REVIEW",
            reasonCodes: [VerificationReasonCode.MAX_ATTEMPTS_EXCEEDED],
            details: { error: "Processing retry limit reached. Routed to platform compliance team." },
          },
        });
      });
    } else {
      // Exponential backoff retry
      const delayMs = Math.pow(2, job.attempts) * 1000;
      await prisma.verificationJob.update({
        where: { id: jobId },
        data: {
          status: "PENDING",
          lockedAt: null,
          nextAttemptAt: new Date(Date.now() + delayMs),
          lastErrorCode: "TRANSIENT_PROCESSING_ERROR",
        },
      });
    }
  }
}

// ================= STAGE EXECUTIONS =================

async function executeFileChecksStage(caseId: string, profile: any) {
  const storage = getFileStorage();
  const fileBuffer = await storage.getFile(profile.documentFilePath);
  const validation = validateCertificateFile(fileBuffer);

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Record audit event
  await prisma.verificationEvent.create({
    data: {
      caseId,
      stage: "FILE_CHECKS",
      actor: "SYSTEM",
      outcome: "PASSED",
      details: {
        detectedMime: validation.mimeType,
        sizeBytes: validation.size,
        hashSha256: validation.fileHash,
      },
    },
  });
}

async function executeExtractionStage(caseId: string, profile: any) {
  const storage = getFileStorage();
  const fileBuffer = await storage.getFile(profile.documentFilePath);
  const ocrProvider = getOcrProvider();

  const extraction = await ocrProvider.extractText(fileBuffer, profile.documentMimeType);

  await prisma.verificationEvent.create({
    data: {
      caseId,
      stage: "EXTRACTION",
      actor: "SYSTEM",
      outcome: extraction.rawText ? "EXTRACTED" : "NO_TEXT_FOUND",
      details: {
        rawLength: extraction.rawText.length,
        extractedRegNumber: extraction.fields.registrationNumber?.value || null,
        extractedName: extraction.fields.name?.value || null,
        metadataCreator: extraction.metadata?.creator || null,
      },
    },
  });
}

async function executeRiskChecksStage(caseId: string, profile: any) {
  const currentCase = await prisma.verificationCase.findUnique({
    where: { id: caseId },
  });

  if (!currentCase) return;

  // Check 1: Duplicate File Hash across different caretakers
  const duplicateHashCase = await prisma.verificationCase.findFirst({
    where: {
      documentHash: currentCase.documentHash,
      caretakerProfileId: { not: profile.id },
    },
  });

  // Check 2: Duplicate Registration Number across different caretakers
  const duplicateRegCase = currentCase.normalizedRegNumber
    ? await prisma.verificationCase.findFirst({
        where: {
          normalizedRegNumber: currentCase.normalizedRegNumber,
          normalizedAuthority: currentCase.normalizedAuthority,
          caretakerProfileId: { not: profile.id },
        },
      })
    : null;

  // Check 3: Extraction metadata anomalies
  const extractionEvent = await prisma.verificationEvent.findFirst({
    where: { caseId, stage: "EXTRACTION" },
    orderBy: { timestamp: "desc" },
  });

  const metadataCreator = (extractionEvent?.details as any)?.metadataCreator;
  const extractedRegNumber = (extractionEvent?.details as any)?.extractedRegNumber;

  const riskResult = evaluateRiskSignals({
    hasDuplicateFileHash: Boolean(duplicateHashCase),
    hasDuplicateRegNumber: Boolean(duplicateRegCase),
    metadataCreator,
    enteredName: profile.fullName,
    enteredRegNumber: profile.registrationNumber,
    extractedText: extractedRegNumber,
  });

  await prisma.verificationEvent.create({
    data: {
      caseId,
      stage: "RISK_CHECKS",
      actor: "SYSTEM",
      outcome: riskResult.hasRiskFlags ? "RISK_DETECTED" : "CLEAN",
      reasonCodes: riskResult.flags,
      details: {
        riskScore: riskResult.riskScore,
        flags: riskResult.flags,
      },
    },
  });
}

async function executeRegistryLookupStage(caseId: string, profile: any) {
  const providerRegistry = getProviderRegistry();

  const lookupResult = await providerRegistry.lookup({
    registrationNumber: profile.registrationNumber || "",
    authority: profile.issuingAuthority,
    state: profile.state,
    category: profile.professionalCategory,
    enteredFullName: profile.fullName,
  });

  await prisma.verificationEvent.create({
    data: {
      caseId,
      stage: "REGISTRY_LOOKUP",
      providerId: lookupResult.providerId,
      actor: "SYSTEM",
      outcome: lookupResult.outcome,
      details: {
        authoritative: lookupResult.authoritative,
        status: lookupResult.record?.status || null,
        fullName: lookupResult.record?.fullName || null,
        registrationNumber: lookupResult.record?.registrationNumber || null,
        authority: lookupResult.record?.authority || null,
      },
    },
  });
}

async function executeDecisionStage(caseId: string, profile: any) {
  // Gather previous stage events
  const events = await prisma.verificationEvent.findMany({
    where: { caseId },
    orderBy: { timestamp: "asc" },
  });

  const registryEvent = events.find((e) => e.stage === "REGISTRY_LOOKUP");
  const riskEvent = events.find((e) => e.stage === "RISK_CHECKS");
  const extractionEvent = events.find((e) => e.stage === "EXTRACTION");

  const registryDetails = registryEvent?.details as any;
  const riskFlags = (riskEvent?.reasonCodes as string[]) || [];

  // Determine OCR extracted binding evidence
  const extractedName = (extractionEvent?.details as any)?.extractedName;
  const extractedReg = (extractionEvent?.details as any)?.extractedRegNumber;
  const extractedContentMatches = Boolean(
    extractedReg &&
    profile.registrationNumber &&
    normalizeRegistrationNumber(extractedReg) === normalizeRegistrationNumber(profile.registrationNumber)
  );

  const identityBindingConfirmed = false; // Optional stage

  // Evaluate pure decision policy
  const decision = evaluateVerificationPolicy({
    enteredFullName: profile.fullName,
    enteredRegNumber: profile.registrationNumber || "",
    enteredAuthority: profile.issuingAuthority,
    enteredState: profile.state,
    enteredCategory: profile.professionalCategory,

    registryOutcome: (registryEvent?.outcome as any) || "UNAVAILABLE",
    registryRecord: registryDetails?.status
      ? {
          fullName: registryDetails.fullName,
          registrationNumber: registryDetails.registrationNumber,
          status: registryDetails.status,
          authority: registryDetails.authority,
        }
      : null,
    registryAuthoritative: registryDetails?.authoritative,
    providerId: registryEvent?.providerId || undefined,

    extractedContentMatches,
    identityBindingConfirmed,
    riskFlags,
  });

  const now = new Date();
  const nextReverifyAt = new Date(now.getTime() + DEFAULT_POLICY_CONFIG.reverifyDays * 24 * 60 * 60 * 1000);

  // Synchronize Decision onto VerificationCase and CaretakerProfile
  await prisma.$transaction(async (tx) => {
    // 1. Update VerificationCase
    await tx.verificationCase.update({
      where: { id: caseId },
      data: {
        status: decision.status,
        decisionSource: "SYSTEM",
        reasonCodes: decision.reasonCodes,
        scores: decision.scores,
        decidedAt: now,
        nextReverifyAt: decision.status === "AUTO_APPROVED" ? nextReverifyAt : null,
      },
    });

    // 2. Synchronize CaretakerProfile status (mapped to verified values)
    let profileStatus: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "AUTO_APPROVED" | "AUTO_REJECTED" = "UNDER_REVIEW";
    let rejectionReason: string | null = null;

    if (decision.status === "AUTO_APPROVED") {
      profileStatus = "APPROVED"; // Maps to APPROVED so all access control gating succeeds cleanly
    } else if (decision.status === "AUTO_REJECTED") {
      profileStatus = "REJECTED";
      rejectionReason = getReasonMessage(decision.reasonCodes[0]);
    } else {
      profileStatus = "UNDER_REVIEW";
    }

    await tx.caretakerProfile.update({
      where: { id: profile.id },
      data: {
        status: profileStatus as any,
        rejectionReason,
        reviewedAt: now,
      },
    });

    // 3. Append-only Audit Log
    await tx.verificationEvent.create({
      data: {
        caseId,
        stage: "DECISION",
        actor: "SYSTEM",
        outcome: decision.status,
        reasonCodes: decision.reasonCodes,
        details: {
          scores: decision.scores,
          reasonMessage: getReasonMessage(decision.reasonCodes[0] || ""),
        },
      },
    });
  });
}

async function executeNotificationsStage(caseId: string, profile: any) {
  const vCase = await prisma.verificationCase.findUnique({
    where: { id: caseId },
  });

  if (!vCase) return;

  const caretakerEmail = profile.user.email;
  const caretakerName = profile.fullName;
  const status = vCase.status;
  const primaryReason = vCase.reasonCodes[0] || "";
  const reasonMessage = getReasonMessage(primaryReason);

  // 1. In-App Notification to Caretaker
  let notificationTitle = "Credential Verification Update";
  let notificationMessage = "";

  if (status === "AUTO_APPROVED") {
    notificationTitle = "Credentials Automatically Verified!";
    notificationMessage = "Your clinical license has been confirmed with the authority registry. Full patient care capabilities are now enabled.";
  } else if (status === "AUTO_REJECTED") {
    notificationTitle = "Clinical License Verification Declined";
    notificationMessage = `Your credentials could not be verified: ${reasonMessage}. You may correct your details and resubmit, or request manual review.`;
  } else {
    notificationTitle = "Credentials Queued for Compliance Review";
    notificationMessage = "Your submission has been securely routed to our platform medical compliance team for manual verification.";
  }

  await prisma.notification.create({
    data: {
      userId: profile.userId,
      type: "SYSTEM",
      title: notificationTitle,
      message: notificationMessage,
      dedupKey: `verification-decision-${caseId}`,
    },
  });

  // 2. Email to Caretaker
  try {
    await sendEmail({
      to: caretakerEmail,
      subject: `CARENEST: ${notificationTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #0d9488;">${notificationTitle}</h2>
          <p>Dear ${caretakerName},</p>
          <p>${notificationMessage}</p>
          ${primaryReason ? `<p style="background: #f1f5f9; padding: 12px; border-radius: 8px;"><strong>Status Details:</strong> ${reasonMessage}</p>` : ""}
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">CARENEST Automated Clinical Compliance</p>
        </div>
      `,
    });
  } catch (err: any) {
    console.warn(`[Verification Email Delivery Warning] Caretaker ${caretakerEmail}:`, err.message);
  }

  // 3. If routed to MANUAL_REVIEW, notify platform ADMIN users
  if (status === "MANUAL_REVIEW") {
    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: "SYSTEM",
          title: "New Application Awaiting Review",
          message: `Caretaker ${caretakerName} (${profile.issuingAuthority}) requires manual verification.`,
          dedupKey: `admin-review-req-${caseId}-${admin.id}`,
        },
      });
    }
  }

  await prisma.verificationEvent.create({
    data: {
      caseId,
      stage: "NOTIFICATIONS",
      actor: "SYSTEM",
      outcome: "DISPATCHED",
      details: {
        notifiedCaretaker: caretakerEmail,
        status,
      },
    },
  });
}

/**
 * Step 4: Periodic Re-verification of Active Caretakers
 */
export async function reverifyActiveCaretakers(): Promise<{ reverified: number; expired: number }> {
  const now = new Date();

  // Find cases due for periodic re-check
  const dueCases = await prisma.verificationCase.findMany({
    where: {
      status: "AUTO_APPROVED",
      nextReverifyAt: { lte: now },
    },
    include: {
      caretakerProfile: { include: { user: true } },
    },
    take: 20,
  });

  let reverified = 0;
  let expired = 0;

  for (const vCase of dueCases) {
    const profile = vCase.caretakerProfile;
    const providerRegistry = getProviderRegistry();

    const lookupResult = await providerRegistry.lookup({
      registrationNumber: profile.registrationNumber || "",
      authority: profile.issuingAuthority,
      state: profile.state,
      category: profile.professionalCategory,
      enteredFullName: profile.fullName,
    });

    const isLapsed =
      lookupResult.outcome === "FOUND" &&
      (lookupResult.record?.status === "REVOKED" ||
        lookupResult.record?.status === "SUSPENDED" ||
        lookupResult.record?.status === "EXPIRED");

    if (isLapsed) {
      expired += 1;
      await prisma.$transaction(async (tx) => {
        await tx.verificationCase.update({
          where: { id: vCase.id },
          data: {
            status: "EXPIRED",
            reasonCodes: { push: VerificationReasonCode.REVERIFICATION_LAPSED },
          },
        });

        await tx.caretakerProfile.update({
          where: { id: profile.id },
          data: {
            status: "EXPIRED" as any,
            rejectionReason: "Periodic licensing re-verification was unable to confirm active registration.",
          },
        });

        await tx.verificationEvent.create({
          data: {
            caseId: vCase.id,
            stage: "REVERIFICATION",
            actor: "SYSTEM",
            outcome: "EXPIRED",
            reasonCodes: [VerificationReasonCode.REVERIFICATION_LAPSED],
            details: { registryStatus: lookupResult.record?.status },
          },
        });

        // Notify caretaker
        await tx.notification.create({
          data: {
            userId: profile.userId,
            type: "SYSTEM",
            title: "License Status Update: Re-verification Required",
            message: "Your periodic registry check indicates your registration is no longer active. New patient requests are paused.",
            dedupKey: `reverify-expired-${vCase.id}-${now.toISOString().slice(0, 10)}`,
          },
        });
      });
    } else {
      reverified += 1;
      const nextDate = new Date(now.getTime() + DEFAULT_POLICY_CONFIG.reverifyDays * 24 * 60 * 60 * 1000);
      await prisma.verificationCase.update({
        where: { id: vCase.id },
        data: { nextReverifyAt: nextDate },
      });
    }
  }

  return { reverified, expired };
}
