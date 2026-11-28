import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import { normalizePatientId } from "@/lib/domain/patient-code";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as rateLimitService from "@/lib/services/rate-limit-service";
import { createSeniorPatient } from "@/lib/services/patient-service";

describe("Senior Patient ID and PIN Login Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Patient ID Normalization
  describe("Patient ID Normalization (normalizePatientId)", () => {
    it("normalizes pt0001 to PT-0001", () => {
      expect(normalizePatientId("pt0001")).toBe("PT-0001");
    });

    it("normalizes PT 0001 to PT-0001", () => {
      expect(normalizePatientId("PT 0001")).toBe("PT-0001");
    });

    it("normalizes pt-1 to PT-0001", () => {
      expect(normalizePatientId("pt-1")).toBe("PT-0001");
    });

    it("normalizes pure digits '1' to PT-0001", () => {
      expect(normalizePatientId("1")).toBe("PT-0001");
    });

    it("normalizes PT-0042 to PT-0042", () => {
      expect(normalizePatientId("PT-0042")).toBe("PT-0042");
    });

    it("trims whitespace from input e.g. '  pt-0012  ' to PT-0012", () => {
      expect(normalizePatientId("  pt-0012  ")).toBe("PT-0012");
    });

    it("returns empty string for empty or null inputs", () => {
      expect(normalizePatientId("")).toBe("");
      expect(normalizePatientId(null)).toBe("");
      expect(normalizePatientId(undefined)).toBe("");
      expect(normalizePatientId("   ")).toBe("");
    });
  });

  // 2. Exact-Code Senior Login Flow
  describe("Senior CredentialsProvider Authorize Flow", () => {
    const credentialsProvider = authOptions.providers.find(
      (p: any) => p.id === "credentials"
    ) as any;
    const authorize = credentialsProvider.options?.authorize || credentialsProvider.authorize;

    it("authenticates senior with exact Patient ID (PT-0001) and valid PIN", async () => {
      const pinHash = await bcrypt.hash("1234", 10);

      vi.spyOn(rateLimitService, "checkPersistentRateLimit").mockResolvedValue({
        allowed: true,
        isLocked: false,
        attemptsRemaining: 5,
        remainingSeconds: 0,
      });
      vi.spyOn(rateLimitService, "resetPersistentRateLimit").mockResolvedValue();

      vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValue({
        id: "profile-1",
        name: "Eleanor Vance",
        preferredName: "Grandma Eleanor",
        patientCode: "PT-0001",
        seniorPin: pinHash,
        isSeniorModeActive: true,
        avatarUrl: null,
        emergencyContactPhone: "+1555123456",
        careCircles: [
          {
            id: "circle-1",
            members: [
              {
                id: "member-1",
                role: "SENIOR",
                isActive: true,
                user: {
                  id: "senior-user-1",
                  name: "Grandma Eleanor",
                  email: "pt-0001@carenest.patient",
                  role: "SENIOR",
                  isActive: true,
                },
              },
            ],
          },
        ],
      } as any);

      const result = await authorize({
        pin: "1234",
        patientIdentifier: "PT-0001",
      });

      expect(result).not.toBeNull();
      expect(result.id).toBe("senior-user-1");
      expect(result.role).toBe("SENIOR");
      expect(result.name).toBe("Grandma Eleanor");
      expect(result.twoFactorVerified).toBe(true);
    });

    it("accepts normalized variant 'pt0001' to log in as PT-0001", async () => {
      const pinHash = await bcrypt.hash("1234", 10);

      vi.spyOn(rateLimitService, "checkPersistentRateLimit").mockResolvedValue({
        allowed: true,
        isLocked: false,
        attemptsRemaining: 5,
        remainingSeconds: 0,
      });
      vi.spyOn(rateLimitService, "resetPersistentRateLimit").mockResolvedValue();

      const findUniqueSpy = vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValue({
        id: "profile-1",
        name: "Eleanor Vance",
        patientCode: "PT-0001",
        seniorPin: pinHash,
        isSeniorModeActive: true,
        careCircles: [
          {
            id: "circle-1",
            members: [
              {
                role: "SENIOR",
                isActive: true,
                user: {
                  id: "senior-user-1",
                  name: "Eleanor Vance",
                  email: "pt-0001@carenest.patient",
                  role: "SENIOR",
                  isActive: true,
                },
              },
            ],
          },
        ],
      } as any);

      const result = await authorize({
        pin: "1234",
        patientIdentifier: "pt0001",
      });

      expect(result).not.toBeNull();
      expect(findUniqueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientCode: "PT-0001" },
        })
      );
    });

    it("fails with null on wrong PIN (generic error, no PIN exposure)", async () => {
      const pinHash = await bcrypt.hash("1234", 10);

      vi.spyOn(rateLimitService, "checkPersistentRateLimit").mockResolvedValue({
        allowed: true,
        isLocked: false,
        attemptsRemaining: 4,
        remainingSeconds: 0,
      });
      const recordFailedSpy = vi.spyOn(rateLimitService, "recordPersistentFailedAttempt").mockResolvedValue({
        locked: false,
        attemptsRemaining: 3,
      });

      vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValue({
        id: "profile-1",
        name: "Eleanor Vance",
        patientCode: "PT-0001",
        seniorPin: pinHash,
        isSeniorModeActive: true,
        careCircles: [],
      } as any);

      const result = await authorize({
        pin: "9999", // wrong PIN
        patientIdentifier: "PT-0001",
      });

      expect(result).toBeNull();
      expect(recordFailedSpy).toHaveBeenCalledWith({
        action: "PIN_LOGIN",
        identifier: "PT-0001",
      });
    });

    it("fails with null on unknown Patient ID (generic error, identical to wrong PIN)", async () => {
      vi.spyOn(rateLimitService, "checkPersistentRateLimit").mockResolvedValue({
        allowed: true,
        isLocked: false,
        attemptsRemaining: 5,
        remainingSeconds: 0,
      });
      const recordFailedSpy = vi.spyOn(rateLimitService, "recordPersistentFailedAttempt").mockResolvedValue({
        locked: false,
        attemptsRemaining: 4,
      });

      vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValue(null);

      const result = await authorize({
        pin: "1234",
        patientIdentifier: "PT-9999",
      });

      expect(result).toBeNull();
      expect(recordFailedSpy).toHaveBeenCalledWith({
        action: "PIN_LOGIN",
        identifier: "PT-9999",
      });
    });

    it("rejects patient name matching (does not load by name)", async () => {
      vi.spyOn(rateLimitService, "checkPersistentRateLimit").mockResolvedValue({
        allowed: true,
        isLocked: false,
        attemptsRemaining: 5,
        remainingSeconds: 0,
      });

      const findUniqueSpy = vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValue(null);

      const result = await authorize({
        pin: "1234",
        patientIdentifier: "Eleanor", // Entering patient name must not match
      });

      expect(result).toBeNull();
      // findUnique was called with patientCode: "ELEANOR" (exact code match only, no name search)
      expect(findUniqueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientCode: "ELEANOR" },
        })
      );
    });

    it("throws RATE_LIMIT_LOCKED with minutes when rate limited", async () => {
      vi.spyOn(rateLimitService, "checkPersistentRateLimit").mockResolvedValue({
        allowed: false,
        isLocked: true,
        attemptsRemaining: 0,
        remainingSeconds: 900, // 15 minutes
      });

      await expect(
        authorize({
          pin: "1234",
          patientIdentifier: "PT-0001",
        })
      ).rejects.toThrow("RATE_LIMIT_LOCKED:15");
    });
  });

  // 3. Linked Senior User Creation
  describe("Linked Senior User Creation in Same Transaction", () => {
    it("creates linked Senior user account and circle member when seniorPin is set", async () => {
      const mockTx = {
        patientCodeCounter: {
          upsert: vi.fn().mockResolvedValue({ id: "singleton", seq: 1 }),
        },
        elderlyProfile: {
          create: vi.fn().mockResolvedValue({
            id: "new-profile-1",
            name: "Eleanor Vance",
            patientCode: "PT-0001",
            seniorPin: "hashed-pin",
            isSeniorModeActive: true,
          }),
        },
        careCircle: {
          create: vi.fn().mockResolvedValue({
            id: "circle-new-1",
            elderlyProfileId: "new-profile-1",
          }),
        },
        careCircleMember: {
          create: vi.fn().mockResolvedValue({ id: "ccm-1" }),
        },
        user: {
          upsert: vi.fn().mockResolvedValue({
            id: "senior-user-new",
            name: "Eleanor Vance",
            email: "pt-0001@carenest.patient",
            role: "SENIOR",
            isActive: true,
          }),
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const result = await createSeniorPatient("family-admin-1", {
        name: "Eleanor Vance",
        dateOfBirth: "1945-05-10",
        emergencyContactName: "Sarah Vance",
        emergencyContactPhone: "+1555123456",
        isSeniorModeActive: true,
        seniorPin: "1234",
      });

      expect(result.profile.patientCode).toBe("PT-0001");
      // Senior user upserted with role SENIOR and patientCode email
      expect(mockTx.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: "pt-0001@carenest.patient" },
          create: expect.objectContaining({
            email: "pt-0001@carenest.patient",
            role: "SENIOR",
          }),
        })
      );
      // Senior member added to circle
      expect(mockTx.careCircleMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: "SENIOR",
            userId: "senior-user-new",
          }),
        })
      );
    });
  });
});
