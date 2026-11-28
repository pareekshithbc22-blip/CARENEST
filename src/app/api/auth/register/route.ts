import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegisterSchema } from "@/lib/validations";
import { requestEmailOtp } from "@/lib/otp";
import { intakeVerification } from "@/lib/services/verification-service";
import {
  checkPersistentRateLimit,
  recordPersistentFailedAttempt,
  resetPersistentRateLimit,
} from "@/lib/services/rate-limit-service";

export async function POST(req: Request) {
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  try {
    const rateStatus = await checkPersistentRateLimit({
      action: "REGISTER",
      identifier: clientIp,
      ip: clientIp,
    });

    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: `Too many registration attempts from this network. Please try again in ${Math.ceil(
            (rateStatus.remainingSeconds || 1800) / 60
          )} minutes.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validated = RegisterSchema.safeParse(body);

    if (!validated.success) {
      await recordPersistentFailedAttempt({
        action: "REGISTER",
        identifier: clientIp,
        ip: clientIp,
      });
      const firstIssue = validated.error.issues[0];
      const userMessage = firstIssue ? firstIssue.message : "Validation failed. Please check your details.";
      return NextResponse.json(
        { error: userMessage, details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name, role, phoneNumber, caretakerProfile } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    if (role === "CARETAKER") {
      if (!caretakerProfile) {
        return NextResponse.json(
          { error: "Professional qualification details and certificate upload are required for Caretaker registration." },
          { status: 400 }
        );
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser && existingUser.isEmailVerified) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in or use a different email." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isEmailVerified = false;

    let user;
    if (existingUser && !existingUser.isEmailVerified) {
      // Re-registering prior to verifying: update credentials and details
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          name,
          role,
          phoneNumber,
          isEmailVerified: false,
          emailVerified: null,
        },
      });

      if (role === "CARETAKER" && caretakerProfile) {
        await prisma.caretakerProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            fullName: caretakerProfile.fullName.trim(),
            professionalCategory: caretakerProfile.professionalCategory.trim(),
            qualification: caretakerProfile.qualification.trim(),
            registrationNumber: caretakerProfile.registrationNumber?.trim() || null,
            issuingAuthority: caretakerProfile.issuingAuthority.trim(),
            state: caretakerProfile.state?.trim() || null,
            documentFileName: caretakerProfile.documentFileName,
            documentFilePath: caretakerProfile.documentFilePath,
            documentMimeType: caretakerProfile.documentMimeType,
            documentFileSize: caretakerProfile.documentFileSize,
            status: "PENDING",
          },
          update: {
            fullName: caretakerProfile.fullName.trim(),
            professionalCategory: caretakerProfile.professionalCategory.trim(),
            qualification: caretakerProfile.qualification.trim(),
            registrationNumber: caretakerProfile.registrationNumber?.trim() || null,
            issuingAuthority: caretakerProfile.issuingAuthority.trim(),
            state: caretakerProfile.state?.trim() || null,
            documentFileName: caretakerProfile.documentFileName,
            documentFilePath: caretakerProfile.documentFilePath,
            documentMimeType: caretakerProfile.documentMimeType,
            documentFileSize: caretakerProfile.documentFileSize,
            status: "PENDING",
          },
        });
      }
    } else {
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            name,
            role,
            phoneNumber,
            isEmailVerified: false,
            emailVerified: null,
          },
        });

        // Default notification preferences
        await tx.notificationPreference.create({
          data: {
            userId: newUser.id,
            emailReminders: true,
            missedDoseAlerts: true,
            escalationAlerts: true,
            appointmentReminders: true,
            dailySummaryEmail: role === "FAMILY",
            gracePeriodMinutes: 45,
          },
        });

        // Automatic profile & care circle onboarding linking
        if (role === "SENIOR") {
          const pinHash = await bcrypt.hash("1234", 10);
          const profile = await tx.elderlyProfile.create({
            data: {
              name,
              preferredName: name,
              dateOfBirth: new Date("1952-05-14"),
              emergencyContactName: "Primary Family Coordinator",
              emergencyContactPhone: phoneNumber || "+1 (555) 234-5678",
              emergencyContactRelation: "Family Coordinator",
              isSeniorModeActive: true,
              seniorPin: pinHash,
              createdById: newUser.id,
            },
          });

          const circle = await tx.careCircle.create({
            data: {
              name: `${name}'s Care Circle`,
              elderlyProfileId: profile.id,
              createdById: newUser.id,
            },
          });

          await tx.careCircleMember.create({
            data: {
              careCircleId: circle.id,
              userId: newUser.id,
              role: "SENIOR",
              permissions: ["CAN_VIEW_RECORDS", "CAN_CONFIRM_DOSE"],
            },
          });

          const med = await tx.medication.create({
            data: {
              elderlyProfileId: profile.id,
              name: "Lisinopril",
              strength: "10 mg",
              form: "TABLET",
              dosageInstructions: "Take 1 tablet every morning with water",
              purpose: "Blood Pressure Maintenance",
            },
          });

          const now = new Date();
          const morningDose = new Date(now);
          morningDose.setHours(8, 0, 0, 0);

          await tx.scheduledDose.create({
            data: {
              medicationId: med.id,
              elderlyProfileId: profile.id,
              scheduledAt: morningDose,
              status: "SCHEDULED",
            },
          });
        } else if (role === "CARETAKER" && caretakerProfile) {
          await tx.caretakerProfile.create({
            data: {
              userId: newUser.id,
              fullName: caretakerProfile.fullName.trim(),
              professionalCategory: caretakerProfile.professionalCategory.trim(),
              qualification: caretakerProfile.qualification.trim(),
              registrationNumber: caretakerProfile.registrationNumber?.trim() || null,
              issuingAuthority: caretakerProfile.issuingAuthority.trim(),
              state: caretakerProfile.state?.trim() || null,
              documentFileName: caretakerProfile.documentFileName,
              documentFilePath: caretakerProfile.documentFilePath,
              documentMimeType: caretakerProfile.documentMimeType,
              documentFileSize: caretakerProfile.documentFileSize,
              status: "PENDING",
            },
          });
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId: newUser.id,
            action: "USER_REGISTERED",
            entityType: "User",
            entityId: newUser.id,
            details: { role, email: normalizedEmail, isEmailVerified: false },
          },
        });

        return newUser;
      });
    }

    // Start automated verification pipeline for Caretakers
    if (role === "CARETAKER") {
      const ctProfile = await prisma.caretakerProfile.findUnique({
        where: { userId: user.id },
      });
      if (ctProfile) {
        try {
          await intakeVerification(ctProfile.id, user.id);
        } catch (intakeErr: any) {
          console.warn("[Register Verification Intake Warning]:", intakeErr.message);
        }
      }
    }

    // Send 6-digit Email OTP immediately
    const otpResult = await requestEmailOtp(normalizedEmail, name, clientIp);

    if (!otpResult.success) {
      return NextResponse.json(
        {
          error: otpResult.error || "We could not send the email. Please try again.",
          cooldownSeconds: otpResult.cooldownSeconds,
        },
        { status: 400 }
      );
    }

    // Reset rate limiter upon successful account registration
    await resetPersistentRateLimit("REGISTER", clientIp, clientIp);

    return NextResponse.json(
      {
        message: "Account created. Please enter the 6-digit verification code sent to your email.",
        requiresEmailVerification: true,
        email: normalizedEmail,
        devNotice: otpResult.devNotice,
        cooldownSeconds: otpResult.cooldownSeconds ?? 60,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: false,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[Register API Error]:", err);

    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in or use a different email." },
        { status: 409 }
      );
    }

    const clientMsg =
      err.message && !err.message.includes("invocation") && !err.message.includes("PrismaClient")
        ? err.message
        : "Unable to complete registration. Please check your details and try again.";

    return NextResponse.json(
      { error: clientMsg },
      { status: 400 }
    );
  }
}
