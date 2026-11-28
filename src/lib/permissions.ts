import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export type CareNestPermission =
  | "CAN_VIEW_RECORDS"
  | "CAN_CONFIRM_DOSE"
  | "CAN_MANAGE_MEDS"
  | "CAN_MANAGE_APPOINTMENTS"
  | "CAN_MANAGE_CIRCLE"
  | "CAN_LOG_CARE_NOTES"
  | "CAN_COMPLETE_TASKS"
  | "CAN_RECEIVE_ESCALATIONS";

/**
 * Retrieves all elderly profiles that a given user is authorized to access.
 * Enforces multi-profile access control and IDOR prevention.
 */
export async function getAuthorizedProfiles(userId: string) {
  // Check if caretaker is approved before exposing any patient profiles
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (user?.role === "CARETAKER") {
    const caretakerProfile = await prisma.caretakerProfile.findUnique({
      where: { userId },
      select: { status: true },
    });
    // Unapproved caretakers have zero access to patient medical records
    const isApproved =
      caretakerProfile?.status === "APPROVED" ||
      (caretakerProfile?.status as any) === "AUTO_APPROVED";
    if (!isApproved) {
      return [];
    }
  }

  // Profiles created directly by the user
  const createdProfiles = await prisma.elderlyProfile.findMany({
    where: { createdById: userId },
    include: {
      careCircles: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
          },
        },
      },
    },
  });

  // Profiles where user is a Care Circle member
  const memberCircles = await prisma.careCircleMember.findMany({
    where: {
      userId,
      isActive: true,
    },
    include: {
      careCircle: {
        include: {
          elderlyProfile: {
            include: {
              careCircles: {
                include: {
                  members: {
                    include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const profileMap = new Map<string, any>();

  for (const p of createdProfiles) {
    profileMap.set(p.id, p);
  }

  for (const mc of memberCircles) {
    const p = mc.careCircle.elderlyProfile;
    if (p && !profileMap.has(p.id)) {
      profileMap.set(p.id, p);
    }
  }

  // Include profiles linked through approved PatientAccessRequest for caretakers
  if (user?.role === "CARETAKER") {
    const approvedRequests = await prisma.patientAccessRequest.findMany({
      where: {
        caretakerId: userId,
        status: "APPROVED",
      },
      include: {
        elderlyProfile: {
          include: {
            careCircles: {
              include: {
                members: {
                  include: { user: { select: { id: true, name: true, email: true, role: true, avatarUrl: true } } },
                },
              },
            },
          },
        },
      },
    });

    for (const req of approvedRequests) {
      if (req.elderlyProfile && !profileMap.has(req.elderlyProfile.id)) {
        profileMap.set(req.elderlyProfile.id, req.elderlyProfile);
      }
    }
  }

  return Array.from(profileMap.values());
}

/**
 * Validates whether a user has access to a specific elderly profile,
 * optionally checking for a specific permission flag.
 */
export async function verifyProfileAccess(
  userId: string,
  elderlyProfileId: string,
  requiredPermission?: CareNestPermission
) {
  const profile = await prisma.elderlyProfile.findUnique({
    where: { id: elderlyProfileId },
    include: {
      careCircles: {
        include: {
          members: {
            where: { userId, isActive: true },
          },
        },
      },
    },
  });

  if (!profile) {
    return { authorized: false, reason: "PROFILE_NOT_FOUND", profile: null, memberRecord: null };
  }

  // Fetch user role to enforce server-side role boundaries
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  // Security gate: Caretakers must have an APPROVED qualification profile to access patient medical data
  if (user?.role === "CARETAKER") {
    const caretakerProfile = await prisma.caretakerProfile.findUnique({
      where: { userId },
      select: { status: true },
    });

    const isApproved =
      caretakerProfile?.status === "APPROVED" ||
      (caretakerProfile?.status as any) === "AUTO_APPROVED";
    if (!isApproved) {
      return {
        authorized: false,
        reason: "CARETAKER_VERIFICATION_REQUIRED",
        profile: null,
        memberRecord: null,
      };
    }
  }

  // Strict restriction: Medication management (adding, editing, deleting) is exclusively reserved for Caretakers.
  // Family Administrators and Seniors have read-only access to medications, schedules, and adherence.
  if (requiredPermission === "CAN_MANAGE_MEDS") {
    if (user?.role === "FAMILY" || user?.role === "SENIOR") {
      return {
        authorized: false,
        reason: "MEDICATIONS_RESTRICTED_TO_CARETAKERS",
        profile,
        memberRecord: null,
      };
    }
  }

  // Profile creator has full access to administrative tasks (excluding medication management)
  if (profile.createdById === userId) {
    if (requiredPermission === "CAN_MANAGE_MEDS") {
      return {
        authorized: false,
        reason: "MEDICATIONS_RESTRICTED_TO_CARETAKERS",
        profile,
        memberRecord: null,
      };
    }
    return { authorized: true, profile, memberRecord: null };
  }

  // Check circle memberships
  for (const circle of profile.careCircles) {
    const member = circle.members?.find((m: any) => m.userId === userId && m.isActive !== false);
    if (member) {
      if (!requiredPermission) {
        return { authorized: true, profile, memberRecord: member };
      }

      // If requiredPermission is CAN_MANAGE_MEDS, member must have CAN_MANAGE_MEDS AND be a CARETAKER
      if (requiredPermission === "CAN_MANAGE_MEDS") {
        if (member.role === "CARETAKER" && (member.permissions?.includes("CAN_MANAGE_MEDS") || user?.role === "CARETAKER")) {
          return { authorized: true, profile, memberRecord: member };
        }
        return { authorized: false, reason: "FORBIDDEN", profile, memberRecord: member };
      }

      // Check permission array
      const hasPermission =
        member.role === "ADMIN" || Boolean(member.permissions?.includes(requiredPermission));

      if (hasPermission) {
        return { authorized: true, profile, memberRecord: member };
      }
    }
  }

  // If caretaker has an approved non-revoked PatientAccessRequest for this patient
  if (user?.role === "CARETAKER") {
    const approvedRequest = await prisma.patientAccessRequest.findFirst({
      where: {
        caretakerId: userId,
        elderlyProfileId,
        status: "APPROVED",
      },
    });

    if (approvedRequest) {
      return { authorized: true, profile, memberRecord: null };
    }
  }

  return { authorized: false, reason: "FORBIDDEN", profile: null, memberRecord: null };
}

/**
 * Validates that a user is an active Admin of the given Care Circle.
 */
export async function verifyCircleAdmin(userId: string, careCircleId: string) {
  const circle = await prisma.careCircle.findUnique({
    where: { id: careCircleId },
    include: {
      members: {
        where: { userId, isActive: true },
      },
    },
  });

  if (!circle) {
    return { authorized: false, reason: "CIRCLE_NOT_FOUND" };
  }

  if (circle.createdById === userId) {
    return { authorized: true, circle };
  }

  const member = circle.members?.find((m: any) => m.userId === userId && m.isActive !== false);
  if (member && member.role === "ADMIN") {
    return { authorized: true, circle };
  }

  return { authorized: false, reason: "FORBIDDEN" };
}
