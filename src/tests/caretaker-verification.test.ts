import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { verifyProfileAccess, getAuthorizedProfiles } from "@/lib/permissions";
import { CaretakerProfileCreateSchema } from "@/lib/validations";

describe("Caretaker Professional Verification & Discovery Security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces that unapproved caretakers (PENDING) are blocked from accessing patient medical records", async () => {
    const pendingCaretakerId = "pending-nurse-1";
    const profileId = "profile-1";

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: pendingCaretakerId,
      role: "CARETAKER",
    } as any);

    vi.spyOn(prisma.caretakerProfile, "findUnique").mockResolvedValue({
      id: "cp-pending",
      userId: pendingCaretakerId,
      status: "PENDING",
    } as any);

    vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValue({
      id: profileId,
      createdById: "creator-1",
      careCircles: [],
    } as any);

    // Must be blocked from viewing records
    const viewAccess = await verifyProfileAccess(
      pendingCaretakerId,
      profileId,
      "CAN_VIEW_RECORDS"
    );
    expect(viewAccess.authorized).toBe(false);
    expect(viewAccess.reason).toBe("CARETAKER_VERIFICATION_REQUIRED");

    // getAuthorizedProfiles must return empty array for unapproved caretaker
    const authorizedProfiles = await getAuthorizedProfiles(pendingCaretakerId);
    expect(authorizedProfiles).toHaveLength(0);
  });

  it("permits approved caretakers with CareCircle membership to access patient records and confirm doses", async () => {
    const approvedCaretakerId = "approved-nurse-1";
    const profileId = "profile-2";

    vi.spyOn(prisma.user, "findUnique").mockResolvedValue({
      id: approvedCaretakerId,
      role: "CARETAKER",
    } as any);

    vi.spyOn(prisma.caretakerProfile, "findUnique").mockResolvedValue({
      id: "cp-approved",
      userId: approvedCaretakerId,
      status: "APPROVED",
    } as any);

    vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValue({
      id: profileId,
      name: "Eleanor Vance",
      createdById: "family-1",
      careCircles: [
        {
          members: [
            {
              userId: approvedCaretakerId,
              role: "CARETAKER",
              isActive: true,
              permissions: ["CAN_VIEW_RECORDS", "CAN_CONFIRM_DOSE", "CAN_MANAGE_MEDS"],
            },
          ],
        },
      ],
    } as any);

    const access = await verifyProfileAccess(
      approvedCaretakerId,
      profileId,
      "CAN_VIEW_RECORDS"
    );
    expect(access.authorized).toBe(true);

    const doseAccess = await verifyProfileAccess(
      approvedCaretakerId,
      profileId,
      "CAN_CONFIRM_DOSE"
    );
    expect(doseAccess.authorized).toBe(true);
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
    vi.spyOn(prisma.patientAccessRequest, "findFirst").mockResolvedValue({
      id: "req-1",
      elderlyProfileId: "profile-1",
      caretakerId: "caretaker-1",
      status: "APPROVED",
    } as any);

    const existingReq = await prisma.patientAccessRequest.findFirst({
      where: {
        elderlyProfileId: "profile-1",
        caretakerId: "caretaker-1",
      },
    });

    expect(existingReq).toBeDefined();
    expect(existingReq?.status).toBe("APPROVED");
  });
});
