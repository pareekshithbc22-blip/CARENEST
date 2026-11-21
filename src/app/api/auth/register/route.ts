import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegisterSchema } from "@/lib/validations";
import { sendAccountVerificationEmail } from "@/lib/email-verification";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = RegisterSchema.safeParse(body);

    if (!validated.success) {
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

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in or use a different email." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isEmailVerified = false; // Email verification link required before login

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name,
          role,
          phoneNumber,
          isEmailVerified,
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

        // Add daily maintenance medication and scheduled dose for today
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
        // Create professional verification application for administrator review
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
          details: { role, email: normalizedEmail, isEmailVerified },
        },
      });

      return newUser;
    });

    // Send single-use email verification link valid for 24 hours
    // If email service is not configured, logs link to server console without crashing
    let emailResult: any = { success: false, diagnosticCode: "EMAIL_NOT_CONFIGURED" };
    try {
      emailResult = await sendAccountVerificationEmail(normalizedEmail, name);
    } catch (err: any) {
      console.error("[Register Email Dispatch Error]:", err);
    }

    return NextResponse.json(
      {
        message: "Account created. Please check your email to verify.",
        requiresEmailVerification: true,
        email: normalizedEmail,
        verificationUrl:
          process.env.NODE_ENV !== "production" ? emailResult.verificationUrl : undefined,
        emailDelivery: {
          success: Boolean(emailResult.success),
          provider: emailResult.provider || "NONE",
          diagnosticCode: emailResult.diagnosticCode || "EMAIL_NOT_CONFIGURED",
          error: emailResult.error,
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
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
