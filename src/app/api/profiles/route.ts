import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/session";
import { getAuthorizedProfiles } from "@/lib/permissions";
import { ProfileCreateSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { allocateNextPatientCode } from "@/lib/services/patient-service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profiles = await getAuthorizedProfiles(user.id);
    return NextResponse.json({ profiles });
  } catch (err: any) {
    console.error("[Profiles GET Error]:", err);
    return NextResponse.json(
      { error: "Failed to retrieve elderly profiles" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = ProfileCreateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const data = validated.data;
    if (data.seniorPin && data.confirmPin && data.seniorPin !== data.confirmPin) {
      return NextResponse.json(
        { error: "Senior PIN and Confirm PIN do not match. Please verify your 4-digit PIN." },
        { status: 400 }
      );
    }

    const pinHash = data.seniorPin ? await bcrypt.hash(data.seniorPin, 10) : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Atomically allocate next sequential patient code (PT-0001, PT-0002...)
      const patientCode = await allocateNextPatientCode(tx);

      const hasCaretaker = Boolean(data.caretakerId && data.caretakerId.trim().length > 0);
      const assignmentStatus = hasCaretaker ? "AWAITING_APPROVAL" : "UNASSIGNED";

      // 2. Create Elderly Profile with sequential code
      const profile = await tx.elderlyProfile.create({
        data: {
          name: data.name,
          preferredName: data.preferredName,
          patientCode,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          bloodGroup: data.bloodGroup,
          allergies: data.allergies,
          medicalConditions: data.medicalConditions,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          emergencyContactRelation: data.emergencyContactRelation,
          notes: data.notes,
          isSeniorModeActive: data.isSeniorModeActive,
          seniorPin: pinHash,
          assignmentStatus,
          declinedCaretakerIds: [],
          createdById: user.id,
        },
      });

      // 3. Automatically establish the default Care Circle
      const circle = await tx.careCircle.create({
        data: {
          name: `${profile.name} Care Circle`,
          elderlyProfileId: profile.id,
          createdById: user.id,
        },
      });

      // 4. Add Creator as Circle Admin
      await tx.careCircleMember.create({
        data: {
          careCircleId: circle.id,
          userId: user.id,
          role: "ADMIN",
          permissions: [
            "CAN_VIEW_RECORDS",
            "CAN_CONFIRM_DOSE",
            "CAN_MANAGE_APPOINTMENTS",
            "CAN_RECEIVE_ESCALATIONS",
            "CAN_MANAGE_CIRCLE",
            "CAN_LOG_CARE_NOTES",
            "CAN_COMPLETE_TASKS",
          ],
        },
      });

      // 4b. Create linked Senior User account if senior PIN is configured
      if (pinHash && data.seniorPin) {
        const seniorEmail = `${patientCode.toLowerCase()}@carenest.patient`;
        const seniorUser = await tx.user.upsert({
          where: { email: seniorEmail },
          create: {
            name: data.preferredName?.trim() || data.name.trim(),
            email: seniorEmail,
            role: "SENIOR",
            passwordHash: pinHash,
            isEmailVerified: true,
            emailVerified: new Date(),
            twoFactorEnabled: false,
            isActive: true,
          },
          update: {
            name: data.preferredName?.trim() || data.name.trim(),
            role: "SENIOR",
            passwordHash: pinHash,
            isActive: true,
          },
        });

        await tx.careCircleMember.create({
          data: {
            careCircleId: circle.id,
            userId: seniorUser.id,
            role: "SENIOR",
            isActive: true,
            permissions: ["CAN_VIEW_RECORDS", "CAN_CONFIRM_DOSE"],
          },
        });
      }

      // 5. If caretaker selected, create pending PatientAccessRequest
      let request = null;
      if (hasCaretaker && data.caretakerId) {
        const caretaker = await tx.user.findUnique({
          where: { id: data.caretakerId },
          include: { caretakerProfile: true },
        });

        if (caretaker && caretaker.role === "CARETAKER" && caretaker.caretakerProfile?.status === "APPROVED") {
          request = await tx.patientAccessRequest.create({
            data: {
              elderlyProfileId: profile.id,
              caretakerId: data.caretakerId,
              familyAdminId: user.id,
              status: "PENDING",
              notes: "Initial caretaker request from patient registration",
            },
          });

          const nowMs = Date.now();
          const age = Math.abs(new Date(nowMs - new Date(data.dateOfBirth).getTime()).getUTCFullYear() - 1970);

          await tx.notification.create({
            data: {
              userId: data.caretakerId,
              elderlyProfileId: profile.id,
              type: "SYSTEM",
              title: "New Patient Request",
              message: `${user.name || "A family administrator"} added you as the caretaker for ${profile.name} (${profile.patientCode}), age ${age}. Are you willing to accept?`,
              dedupKey: `req-created-${request.id}`,
              data: {
                requestId: request.id,
                patientId: profile.id,
                patientCode: profile.patientCode,
                name: profile.name,
                age,
                familyAdminName: user.name,
              },
            },
          });
        }
      }

      // 6. Audit Log
      await tx.auditLog.create({
        data: {
          elderlyProfileId: profile.id,
          careCircleId: circle.id,
          userId: user.id,
          action: "ELDERLY_PROFILE_CREATED",
          entityType: "ElderlyProfile",
          entityId: profile.id,
          details: {
            name: profile.name,
            patientCode: profile.patientCode,
            createdByRole: user.role,
            caretakerId: data.caretakerId || null,
          },
        },
      });

      return { profile, request };
    });

    return NextResponse.json(
      {
        profile: result.profile,
        request: result.request,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[Profile POST Error]:", err);
    return NextResponse.json(
      { error: "Failed to create elderly profile" },
      { status: 500 }
    );
  }
}
