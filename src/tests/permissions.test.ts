import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { verifyProfileAccess } from "@/lib/permissions";

describe("CareNest RBAC & Server-side Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies access to an unauthorized user for an arbitrary profile (IDOR protection)", async () => {
    const fakeUserId = "00000000-0000-0000-0000-000000000000";
    const profileId = "profile-test-111";

    vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValueOnce({
      id: profileId,
      createdById: "creator-999",
      careCircles: [
        {
          members: [],
        },
      ],
    } as any);

    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
      id: fakeUserId,
      role: "FAMILY",
    } as any);

    const access = await verifyProfileAccess(fakeUserId, profileId, "CAN_VIEW_RECORDS");
    expect(access.authorized).toBe(false);
    expect(access.reason).toBe("FORBIDDEN");
  });

  it("restricts medication management: denies family admin from managing meds, but permits viewing records and appointments", async () => {
    const adminUserId = "admin-user-1";
    const profileId = "profile-test-222";

    const mockProfile = {
      id: profileId,
      createdById: adminUserId, // Family Admin created profile
      careCircles: [
        {
          members: [
            {
              userId: adminUserId,
              role: "ADMIN",
              isActive: true,
              permissions: ["CAN_VIEW_RECORDS", "CAN_MANAGE_APPOINTMENTS", "CAN_MANAGE_CIRCLE"],
            },
          ],
        },
      ],
    } as any;

    const mockUser = {
      id: adminUserId,
      role: "FAMILY",
    } as any;

    // 1. Family admin must NOT have permission to manage medications
    vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValueOnce(mockProfile);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(mockUser);
    const medAccess = await verifyProfileAccess(adminUserId, profileId, "CAN_MANAGE_MEDS");
    expect(medAccess.authorized).toBe(false);
    expect(medAccess.reason).toBe("MEDICATIONS_RESTRICTED_TO_CARETAKERS");

    // 2. Family admin CAN view records
    vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValueOnce(mockProfile);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(mockUser);
    const viewAccess = await verifyProfileAccess(adminUserId, profileId, "CAN_VIEW_RECORDS");
    expect(viewAccess.authorized).toBe(true);

    // 3. Family admin CAN manage appointments
    vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValueOnce(mockProfile);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(mockUser);
    const apptAccess = await verifyProfileAccess(adminUserId, profileId, "CAN_MANAGE_APPOINTMENTS");
    expect(apptAccess.authorized).toBe(true);
  });

  it("permits approved caretaker to manage medications, confirm dose and log care notes", async () => {
    const caretakerId = "caretaker-user-1";
    const profileId = "profile-test-333";

    const mockProfile = {
      id: profileId,
      createdById: "creator-999",
      careCircles: [
        {
          members: [
            {
              userId: caretakerId,
              role: "CARETAKER",
              isActive: true,
              permissions: ["CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE", "CAN_LOG_CARE_NOTES", "CAN_VIEW_RECORDS"],
            },
          ],
        },
      ],
    } as any;

    const mockUser = {
      id: caretakerId,
      role: "CARETAKER",
    } as any;

    vi.spyOn(prisma.caretakerProfile, "findUnique").mockResolvedValue({
      id: "cp-1",
      userId: caretakerId,
      status: "APPROVED",
    } as any);

    // 1. Manage meds
    vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValueOnce(mockProfile);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(mockUser);
    const medAccess = await verifyProfileAccess(caretakerId, profileId, "CAN_MANAGE_MEDS");
    expect(medAccess.authorized).toBe(true);

    // 2. Confirm dose
    vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValueOnce(mockProfile);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(mockUser);
    const doseAccess = await verifyProfileAccess(caretakerId, profileId, "CAN_CONFIRM_DOSE");
    expect(doseAccess.authorized).toBe(true);

    // 3. Log care notes
    vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValueOnce(mockProfile);
    vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(mockUser);
    const notesAccess = await verifyProfileAccess(caretakerId, profileId, "CAN_LOG_CARE_NOTES");
    expect(notesAccess.authorized).toBe(true);
  });
});
