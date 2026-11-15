import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { verifyProfileAccess } from "@/lib/permissions";

describe("CareNest RBAC & Server-side Authorization", () => {
  it("denies access to an unauthorized user for an arbitrary profile (IDOR protection)", async () => {
    // Arbitrary unknown user id
    const fakeUserId = "00000000-0000-0000-0000-000000000000";

    const profile = await prisma.elderlyProfile.findFirst();
    if (!profile) return;

    const access = await verifyProfileAccess(fakeUserId, profile.id, "CAN_VIEW_RECORDS");
    expect(access.authorized).toBe(false);
    expect(access.reason).toBe("FORBIDDEN");
  });

  it("restricts medication management: denies family admin from managing meds, but permits viewing records and appointments", async () => {
    const adminUser = await prisma.user.findFirst({
      where: { role: "FAMILY", email: "sarah.vance@carenest.org" },
    });
    const profile = await prisma.elderlyProfile.findFirst({
      where: { name: "Eleanor Vance" },
    });

    if (!adminUser || !profile) return;

    // Family admin must NOT have permission to manage medications
    const medAccess = await verifyProfileAccess(adminUser.id, profile.id, "CAN_MANAGE_MEDS");
    expect(medAccess.authorized).toBe(false);
    expect(medAccess.reason).toBe("MEDICATIONS_RESTRICTED_TO_CARETAKERS");

    // Family admin CAN view records and manage appointments
    const viewAccess = await verifyProfileAccess(adminUser.id, profile.id, "CAN_VIEW_RECORDS");
    expect(viewAccess.authorized).toBe(true);

    const apptAccess = await verifyProfileAccess(adminUser.id, profile.id, "CAN_MANAGE_APPOINTMENTS");
    expect(apptAccess.authorized).toBe(true);
  });

  it("permits caretaker to manage medications, confirm dose and log care notes", async () => {
    const caretaker = await prisma.user.findFirst({
      where: { role: "CARETAKER", email: "marcus.reed@carenest.org" },
    });
    const profile = await prisma.elderlyProfile.findFirst({
      where: { name: "Eleanor Vance" },
    });

    if (!caretaker || !profile) return;

    const medAccess = await verifyProfileAccess(caretaker.id, profile.id, "CAN_MANAGE_MEDS");
    expect(medAccess.authorized).toBe(true);

    const doseAccess = await verifyProfileAccess(caretaker.id, profile.id, "CAN_CONFIRM_DOSE");
    expect(doseAccess.authorized).toBe(true);

    const notesAccess = await verifyProfileAccess(caretaker.id, profile.id, "CAN_LOG_CARE_NOTES");
    expect(notesAccess.authorized).toBe(true);
  });
});
