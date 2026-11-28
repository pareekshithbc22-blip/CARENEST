import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { formatPatientCode } from "@/lib/domain/patient-code";

/**
 * Atomically allocates the next sequential patient code (PT-0001, PT-0002...).
 * Uses a singleton counter row in the database so numbers are strictly sequential,
 * unique, and never reused even after profile deletion.
 */
export async function allocateNextPatientCode(tx: any = prisma): Promise<string> {
  const counter = await tx.patientCodeCounter.upsert({
    where: { id: "singleton" },
    update: { seq: { increment: 1 } },
    create: { id: "singleton", seq: 1 },
  });
  return formatPatientCode(counter.seq);
}

export interface CreateSeniorPatientInput {
  name: string;
  preferredName?: string | null;
  dateOfBirth: string; // YYYY-MM-DD
  gender?: string | null;
  bloodGroup?: string | null;
  allergies?: string[];
  medicalConditions?: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation?: string | null;
  notes?: string | null;
  caretakerId?: string | null;
  seniorPin?: string | null;
  isSeniorModeActive?: boolean;
}

export async function createSeniorPatient(
  familyAdminUserId: string,
  input: CreateSeniorPatientInput
) {
  const pinHash = input.seniorPin ? await bcrypt.hash(input.seniorPin, 10) : null;

  return await prisma.$transaction(async (tx) => {
    // 1. Atomically generate sequential patient code
    const patientCode = await allocateNextPatientCode(tx);

    const hasCaretaker = Boolean(input.caretakerId && input.caretakerId.trim().length > 0);
    const assignmentStatus = hasCaretaker ? "AWAITING_APPROVAL" : "UNASSIGNED";

    // 2. Create the ElderlyProfile
    const profile = await tx.elderlyProfile.create({
      data: {
        name: input.name,
        preferredName: input.preferredName || null,
        patientCode,
        dateOfBirth: new Date(input.dateOfBirth),
        gender: input.gender || null,
        bloodGroup: input.bloodGroup || null,
        allergies: input.allergies || [],
        medicalConditions: input.medicalConditions || [],
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        emergencyContactRelation: input.emergencyContactRelation || "Family Administrator",
        notes: input.notes || null,
        isSeniorModeActive: input.isSeniorModeActive ?? true,
        seniorPin: pinHash,
        assignmentStatus,
        declinedCaretakerIds: [],
        createdById: familyAdminUserId,
      },
    });

    // 3. Create initial Care Circle with the Family Administrator as ADMIN
    const careCircle = await tx.careCircle.create({
      data: {
        name: `${input.preferredName || input.name}'s Circle of Care`,
        elderlyProfileId: profile.id,
        createdById: familyAdminUserId,
        members: {
          create: {
            userId: familyAdminUserId,
            role: "ADMIN",
            permissions: ["CAN_VIEW_RECORDS", "CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE"],
            isActive: true,
          },
        },
      },
    });

    // 3b. Create linked Senior User account if senior PIN is configured
    if (pinHash && input.seniorPin) {
      const seniorEmail = `${patientCode.toLowerCase()}@carenest.patient`;
      const seniorUser = await tx.user.upsert({
        where: { email: seniorEmail },
        create: {
          name: input.preferredName?.trim() || input.name.trim(),
          email: seniorEmail,
          role: "SENIOR",
          passwordHash: pinHash,
          isEmailVerified: true,
          emailVerified: new Date(),
          twoFactorEnabled: false,
          isActive: true,
        },
        update: {
          name: input.preferredName?.trim() || input.name.trim(),
          role: "SENIOR",
          passwordHash: pinHash,
          isActive: true,
        },
      });

      await tx.careCircleMember.create({
        data: {
          careCircleId: careCircle.id,
          userId: seniorUser.id,
          role: "SENIOR",
          isActive: true,
          permissions: ["CAN_VIEW_RECORDS", "CAN_CONFIRM_DOSE"],
        },
      });
    }

    let request = null;

    // 4. If a caretaker was chosen, create the pending PatientAccessRequest
    if (hasCaretaker && input.caretakerId) {
      // Verify caretaker exists and is verified
      const caretaker = await tx.user.findUnique({
        where: { id: input.caretakerId },
        include: { caretakerProfile: true },
      });

      if (!caretaker || caretaker.role !== "CARETAKER" || caretaker.caretakerProfile?.status !== "APPROVED") {
        throw new Error("Selected caretaker is not an active verified caretaker.");
      }

      request = await tx.patientAccessRequest.create({
        data: {
          elderlyProfileId: profile.id,
          caretakerId: input.caretakerId,
          familyAdminId: familyAdminUserId,
          status: "PENDING",
          notes: "Initial caretaker request from patient registration",
        },
      });

      // Notify the chosen caretaker
      const adminUser = await tx.user.findUnique({ where: { id: familyAdminUserId } });
      const nowMs = Date.now();
      const age = Math.abs(new Date(nowMs - new Date(input.dateOfBirth).getTime()).getUTCFullYear() - 1970);

      await tx.notification.create({
        data: {
          userId: input.caretakerId,
          elderlyProfileId: profile.id,
          type: "SYSTEM",
          title: "New Patient Request",
          message: `${adminUser?.name || "A family administrator"} added you as the caretaker for ${profile.name} (${profile.patientCode}), age ${age}. Are you willing to accept?`,
          dedupKey: `req-created-${request.id}`,
          data: {
            requestId: request.id,
            patientId: profile.id,
            patientCode: profile.patientCode,
            name: profile.name,
            age,
            familyAdminName: adminUser?.name,
          },
        },
      });
    }

    return { profile, careCircle, request };
  });
}
