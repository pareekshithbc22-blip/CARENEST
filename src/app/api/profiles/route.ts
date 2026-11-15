import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentUser } from "@/lib/session";
import { getAuthorizedProfiles } from "@/lib/permissions";
import { ProfileCreateSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

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
    const pinHash = data.seniorPin ? await bcrypt.hash(data.seniorPin, 10) : null;

    const newProfile = await prisma.$transaction(async (tx) => {
      // 1. Create Elderly Profile
      const profile = await tx.elderlyProfile.create({
        data: {
          name: data.name,
          preferredName: data.preferredName,
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
          createdById: user.id,
        },
      });

      // 2. Automatically establish the default Care Circle
      const circle = await tx.careCircle.create({
        data: {
          name: `${profile.name} Care Circle`,
          elderlyProfileId: profile.id,
          createdById: user.id,
        },
      });

      // 3. Add Creator as Circle Admin
      await tx.careCircleMember.create({
        data: {
          careCircleId: circle.id,
          userId: user.id,
          role: "ADMIN",
          permissions: [
            "CAN_MANAGE_MEDS",
            "CAN_CONFIRM_DOSE",
            "CAN_VIEW_RECORDS",
            "CAN_MANAGE_APPOINTMENTS",
            "CAN_RECEIVE_ESCALATIONS",
            "CAN_MANAGE_CIRCLE",
            "CAN_LOG_CARE_NOTES",
            "CAN_COMPLETE_TASKS",
          ],
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          elderlyProfileId: profile.id,
          careCircleId: circle.id,
          userId: user.id,
          action: "ELDERLY_PROFILE_CREATED",
          entityType: "ElderlyProfile",
          entityId: profile.id,
          details: { name: profile.name, createdByRole: user.role },
        },
      });

      return profile;
    });

    return NextResponse.json({ profile: newProfile }, { status: 201 });
  } catch (err: any) {
    console.error("[Profile POST Error]:", err);
    return NextResponse.json(
      { error: "Failed to create elderly profile" },
      { status: 500 }
    );
  }
}
