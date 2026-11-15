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

  // Profile creator always has full access
  if (profile.createdById === userId) {
    return { authorized: true, profile, memberRecord: null };
  }

  // Check circle memberships
  for (const circle of profile.careCircles) {
    const member = circle.members[0];
    if (member) {
      if (!requiredPermission) {
        return { authorized: true, profile, memberRecord: member };
      }

      // Check permission array
      const hasPermission =
        member.role === "ADMIN" || member.permissions.includes(requiredPermission);

      if (hasPermission) {
        return { authorized: true, profile, memberRecord: member };
      }
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

  const member = circle.members[0];
  if (member && member.role === "ADMIN") {
    return { authorized: true, circle };
  }

  return { authorized: false, reason: "FORBIDDEN" };
}
