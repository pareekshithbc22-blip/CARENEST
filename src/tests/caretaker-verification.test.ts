import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { verifyProfileAccess, getAuthorizedProfiles } from "@/lib/permissions";
import { CaretakerProfileCreateSchema } from "@/lib/validations";

describe("Caretaker Professional Verification & Discovery Security", () => {
  it("enforces that unapproved caretakers (PENDING) are blocked from accessing patient medical records", async () => {
    // Find unapproved caretaker (anjali.rao@carenest.org seeded with PENDING status)
    const pendingCaretaker = await prisma.user.findFirst({
      where: { email: "anjali.rao@carenest.org" },
      include: { caretakerProfile: true },
    });

    const profile = await prisma.elderlyProfile.findFirst({
      where: { name: "Lakshmi Rao" },
    });

    expect(pendingCaretaker).toBeDefined();
    expect(pendingCaretaker?.caretakerProfile?.status).toBe("PENDING");
    expect(profile).toBeDefined();

    if (!pendingCaretaker || !profile) return;

    // Must be blocked from viewing records
    const viewAccess = await verifyProfileAccess(
      pendingCaretaker.id,
      profile.id,
      "CAN_VIEW_RECORDS"
    );
    expect(viewAccess.authorized).toBe(false);
    expect(viewAccess.reason).toBe("CARETAKER_VERIFICATION_REQUIRED");

    // getAuthorizedProfiles must return empty array for unapproved caretaker
    const authorizedProfiles = await getAuthorizedProfiles(pendingCaretaker.id);
    expect(authorizedProfiles).toHaveLength(0);
  });

  it("permits approved caretakers with CareCircle membership to access patient records and confirm doses", async () => {
    const approvedCaretaker = await prisma.user.findFirst({
      where: { email: "marcus.reed@carenest.org" },
      include: { caretakerProfile: true },
    });

    const eleanor = await prisma.elderlyProfile.findFirst({
      where: { name: "Eleanor Vance" },
    });

    expect(approvedCaretaker).toBeDefined();
    expect(approvedCaretaker?.caretakerProfile?.status).toBe("APPROVED");
    expect(eleanor).toBeDefined();

    if (!approvedCaretaker || !eleanor) return;

    const access = await verifyProfileAccess(
      approvedCaretaker.id,
      eleanor.id,
      "CAN_VIEW_RECORDS"
    );
    expect(access.authorized).toBe(true);

    const doseAccess = await verifyProfileAccess(
      approvedCaretaker.id,
      eleanor.id,
      "CAN_CONFIRM_DOSE"
    );
    expect(doseAccess.authorized).toBe(true);

    const authorizedProfiles = await getAuthorizedProfiles(approvedCaretaker.id);
    expect(authorizedProfiles.some((p) => p.id === eleanor.id)).toBe(true);
  });

  it("validates Caretaker registration credential schema correctly", () => {
    const validData = {
      fullName: "Ananya Sharma, RN",
      professionalCategory: "Registered Nurse (RN)",
      qualification: "B.Sc. Nursing",
      registrationNumber: "RN-KA-2024-9988",
      issuingAuthority: "Karnataka State Nursing Council",
      state: "Karnataka",
      documentFileName: "nursing_license_ananya.pdf",
      documentFilePath: "storage/secure_documents/uuid-ananya.pdf",
      documentMimeType: "application/pdf",
      documentFileSize: 1024 * 500, // 500KB
    };

    const parsed = CaretakerProfileCreateSchema.safeParse(validData);
    expect(parsed.success).toBe(true);

    // Invalid: file exceeding 10MB limit
    const oversizeData = {
      ...validData,
      documentFileSize: 11 * 1024 * 1024, // 11MB
    };
    const oversizeParsed = CaretakerProfileCreateSchema.safeParse(oversizeData);
    expect(oversizeParsed.success).toBe(false);

    // Invalid: unsupported mime type
    const invalidMime = {
      ...validData,
      documentMimeType: "application/x-msdownload",
    };
    const invalidMimeParsed = CaretakerProfileCreateSchema.safeParse(invalidMime);
    expect(invalidMimeParsed.success).toBe(false);
  });

  it("tracks access request states and maintains care circle relationship integrity", async () => {
    const familyAdmin = await prisma.user.findFirst({
      where: { email: "sarah.vance@carenest.org" },
    });
    const caretaker = await prisma.user.findFirst({
      where: { email: "marcus.reed@carenest.org" },
    });
    const profile = await prisma.elderlyProfile.findFirst({
      where: { name: "Eleanor Vance" },
    });

    expect(familyAdmin).toBeDefined();
    expect(caretaker).toBeDefined();
    expect(profile).toBeDefined();

    if (!familyAdmin || !caretaker || !profile) return;

    // Check seeded request
    const existingReq = await prisma.patientAccessRequest.findFirst({
      where: {
        elderlyProfileId: profile.id,
        caretakerId: caretaker.id,
      },
    });

    expect(existingReq).toBeDefined();
    expect(existingReq?.status).toBe("APPROVED");
  });
});
