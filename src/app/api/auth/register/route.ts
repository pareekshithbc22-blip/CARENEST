import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegisterSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = RegisterSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name, role, phoneNumber } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name,
          role,
          phoneNumber,
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
      } else if (role === "CARETAKER") {
        // Link new Caretaker to the active primary care circle so they have immediate patient assignment
        const primaryCircle = await tx.careCircle.findFirst({
          orderBy: { createdAt: "asc" },
        });

        if (primaryCircle) {
          await tx.careCircleMember.create({
            data: {
              careCircleId: primaryCircle.id,
              userId: newUser.id,
              role: "CARETAKER",
              permissions: [
                "CAN_CONFIRM_DOSE",
                "CAN_VIEW_RECORDS",
                "CAN_LOG_CARE_NOTES",
                "CAN_COMPLETE_TASKS",
                "CAN_RECEIVE_ESCALATIONS",
              ],
            },
          });
        }
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: "USER_REGISTERED",
          entityType: "User",
          entityId: newUser.id,
          details: { role, email: normalizedEmail },
        },
      });

      return newUser;
    });

    return NextResponse.json(
      {
        message: "Account registered successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[Register API Error]:", err);
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
