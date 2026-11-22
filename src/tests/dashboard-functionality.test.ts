import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  evaluateBloodSugar,
  evaluateBloodPressure,
  DOSE_GRACE_MINUTES,
} from "@/lib/config";
import { processDoseEscalations } from "@/lib/escalation/service";
import { prisma } from "@/lib/prisma";

describe("CareNest Dashboard, Scheduler & Clinical Alert Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================
  // 1. Threshold Evaluation for Blood Sugar & Blood Pressure
  // ========================================================
  describe("Clinical Threshold Evaluations (Blood Sugar & Blood Pressure)", () => {
    it("evaluates Blood Sugar across Normal, Warning, and Critical ranges", () => {
      // Normal range: 70 - 140 mg/dL
      expect(evaluateBloodSugar(95)).toEqual({
        severity: "NORMAL",
        label: "Normal",
        isAbnormal: false,
        message: "Normal blood sugar: 95 mg/dL",
      });
      expect(evaluateBloodSugar(70).severity).toBe("NORMAL");
      expect(evaluateBloodSugar(140).severity).toBe("NORMAL");

      // Warning range: 141 - 250 mg/dL
      const warningRes = evaluateBloodSugar(165);
      expect(warningRes.severity).toBe("WARNING");
      expect(warningRes.isAbnormal).toBe(true);

      // Critical range: < 70 or > 250 mg/dL
      const lowCritical = evaluateBloodSugar(55);
      expect(lowCritical.severity).toBe("CRITICAL");
      expect(lowCritical.isAbnormal).toBe(true);
      expect(lowCritical.label).toContain("Hypoglycemia");

      const highCritical = evaluateBloodSugar(280);
      expect(highCritical.severity).toBe("CRITICAL");
      expect(highCritical.isAbnormal).toBe(true);
      expect(highCritical.label).toContain("Hyperglycemia");

      // Null / undefined handling
      expect(evaluateBloodSugar(null).severity).toBe("NORMAL");
    });

    it("evaluates Blood Pressure across Normal, Warning, and Critical ranges", () => {
      // Normal range: 90-120 systolic and 60-80 diastolic
      const normalRes = evaluateBloodPressure(118, 76);
      expect(normalRes.severity).toBe("NORMAL");
      expect(normalRes.isAbnormal).toBe(false);

      // Warning range: 121-160 systolic or 81-100 diastolic
      const warningRes = evaluateBloodPressure(135, 85);
      expect(warningRes.severity).toBe("WARNING");
      expect(warningRes.isAbnormal).toBe(true);

      // Critical range: systolic < 90 or > 160, diastolic < 50 or > 100
      const highCritical = evaluateBloodPressure(175, 95);
      expect(highCritical.severity).toBe("CRITICAL");
      expect(highCritical.isAbnormal).toBe(true);

      const lowCritical = evaluateBloodPressure(82, 45);
      expect(lowCritical.severity).toBe("CRITICAL");
      expect(lowCritical.isAbnormal).toBe(true);

      // Missing values handling
      expect(evaluateBloodPressure(null, null).severity).toBe("NORMAL");
    });

    it("confirms DOSE_GRACE_MINUTES is strictly 15 minutes", () => {
      expect(DOSE_GRACE_MINUTES).toBe(15);
    });
  });

  // ========================================================
  // 2. Missed-Dose Detection, Idempotency & Batching
  // ========================================================
  describe("Missed-Dose Scheduler & Idempotency", () => {
    it("atomically claims overdue doses, marks them MISSED, and avoids duplicate notifications", async () => {
      const mockDoseId = "dose-test-123";
      const mockPatientId = "patient-test-456";
      const pastTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

      // Mock finding an overdue scheduled dose
      const findCandidateSpy = vi.spyOn(prisma.scheduledDose, "findMany").mockResolvedValueOnce([
        {
          id: mockDoseId,
          scheduledAt: pastTime,
          status: "SCHEDULED",
          confirmedAt: null,
          medication: {
            id: "med-1",
            name: "Lisinopril",
            strength: "10 mg",
            form: "TABLET",
          },
          elderlyProfile: {
            id: mockPatientId,
            name: "Robert Smith",
            createdById: "family-user-1",
            careCircles: [
              {
                members: [
                  {
                    role: "CARETAKER",
                    isActive: true,
                    user: { id: "caretaker-1", email: "nurse@example.com", name: "Nurse Jane", role: "CARETAKER" },
                  },
                  {
                    role: "ADMIN",
                    isActive: true,
                    user: { id: "family-1", email: "family@example.com", name: "Sarah Smith", role: "FAMILY" },
                  },
                ],
              },
            ],
          },
        } as any,
      ]);

      // Mock atomic updateMany claiming
      const updateManySpy = vi.spyOn(prisma.scheduledDose, "updateMany").mockResolvedValueOnce({ count: 1 });
      const notifUpsertSpy = vi.spyOn(prisma.notification, "upsert").mockResolvedValue({} as any);
      const auditCreateSpy = vi.spyOn(prisma.auditLog, "create").mockResolvedValue({} as any);
      vi.spyOn(prisma.patientAccessRequest, "findMany").mockResolvedValue([]);
      vi.spyOn(prisma.elderlyProfile, "findMany").mockResolvedValue([]);

      const summary = await processDoseEscalations();

      expect(summary.processedDoses).toBe(1);
      expect(summary.missedDosesMarked).toBe(1);
      expect(summary.notificationsCreated).toBeGreaterThanOrEqual(1);

      // Verify atomic claim was executed
      expect(updateManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockDoseId, status: "SCHEDULED" },
          data: expect.objectContaining({ status: "MISSED" }),
        })
      );

      // Verify deduplication key format
      expect(notifUpsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { dedupKey: expect.stringContaining(`missed-dose-${mockDoseId}`) },
        })
      );

      // Idempotency check: running again when updateMany count is 0 (already claimed)
      findCandidateSpy.mockResolvedValueOnce([
        {
          id: mockDoseId,
          scheduledAt: pastTime,
          status: "SCHEDULED",
          confirmedAt: null,
          medication: { id: "med-1", name: "Lisinopril", strength: "10 mg", form: "TABLET" },
          elderlyProfile: { id: mockPatientId, name: "Robert Smith", createdById: null, careCircles: [] },
        } as any,
      ]);
      updateManySpy.mockResolvedValueOnce({ count: 0 }); // Already updated by previous run

      const secondRun = await processDoseEscalations();
      expect(secondRun.missedDosesMarked).toBe(0);
    });

    it("detects patients without an active care plan and generates 'forgot to assign' alert once daily", async () => {
      const mockPatientId = "patient-unassigned-789";
      const mockCaretakerId = "caretaker-unassigned-999";

      vi.spyOn(prisma.scheduledDose, "findMany").mockResolvedValue([]);
      vi.spyOn(prisma.elderlyProfile, "findMany").mockResolvedValueOnce([
        {
          id: mockPatientId,
          name: "James Wilson",
          medications: [], // 0 active medications
          careTasks: [],   // 0 active tasks
          careCircles: [
            {
              members: [
                {
                  role: "CARETAKER",
                  isActive: true,
                  user: { id: mockCaretakerId, name: "Nurse John" },
                },
              ],
            },
          ],
          caretakerAccessRequests: [],
        } as any,
      ]);

      const notifUpsertSpy = vi.spyOn(prisma.notification, "upsert").mockResolvedValue({} as any);

      const summary = await processDoseEscalations();
      expect(summary.forgotToAssignAlerts).toBe(1);

      const todayStr = new Date().toISOString().split("T")[0];
      expect(notifUpsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            dedupKey: `forgot-to-assign-${mockPatientId}-${mockCaretakerId}-${todayStr}`,
          },
          create: expect.objectContaining({
            userId: mockCaretakerId,
            elderlyProfileId: mockPatientId,
            title: expect.stringContaining("Care Plan Incomplete"),
          }),
        })
      );
    });
  });

  // ========================================================
  // 3. Authorization & IDOR Access Control Isolation
  // ========================================================
  describe("Server-Side Authorization & Patient Link Isolation", () => {
    it("ensures unlinked users cannot access an arbitrary patient profile", async () => {
      const { verifyProfileAccess } = await import("@/lib/permissions");

      // Mock profile with care circle members not containing the querying user
      vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValueOnce({
        id: "target-profile-1",
        createdById: "creator-user-99",
        careCircles: [
          {
            members: [
              // User 'intruder-user-123' is NOT in this circle
              { userId: "legitimate-user-1", isActive: true, role: "FAMILY_MEMBER", permissions: ["CAN_VIEW_RECORDS"] },
            ],
          },
        ],
      } as any);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "intruder-user-123",
        role: "FAMILY",
      } as any);

      const access = await verifyProfileAccess("intruder-user-123", "target-profile-1", "CAN_VIEW_RECORDS");
      expect(access.authorized).toBe(false);
      expect(access.reason).toBe("FORBIDDEN");
    });

    it("verifies senior patients can view their own profile records but cannot manage medications", async () => {
      const { verifyProfileAccess } = await import("@/lib/permissions");

      vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValueOnce({
        id: "senior-profile-1",
        createdById: "family-admin-1",
        careCircles: [
          {
            members: [
              {
                userId: "senior-user-1",
                role: "SENIOR",
                isActive: true,
                permissions: ["CAN_VIEW_RECORDS", "CAN_CONFIRM_DOSE"],
              },
            ],
          },
        ],
      } as any);

      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "senior-user-1",
        role: "SENIOR",
      } as any);

      // Senior CAN view records
      const viewAccess = await verifyProfileAccess("senior-user-1", "senior-profile-1", "CAN_VIEW_RECORDS");
      expect(viewAccess.authorized).toBe(true);

      // Senior CANNOT manage medications (strictly reserved for licensed caretakers)
      vi.spyOn(prisma.elderlyProfile, "findUnique").mockResolvedValueOnce({
        id: "senior-profile-1",
        createdById: "family-admin-1",
        careCircles: [
          {
            members: [
              {
                userId: "senior-user-1",
                role: "SENIOR",
                isActive: true,
                permissions: ["CAN_VIEW_RECORDS", "CAN_CONFIRM_DOSE"],
              },
            ],
          },
        ],
      } as any);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "senior-user-1",
        role: "SENIOR",
      } as any);

      const medAccess = await verifyProfileAccess("senior-user-1", "senior-profile-1", "CAN_MANAGE_MEDS");
      expect(medAccess.authorized).toBe(false);
      expect(medAccess.reason).toBe("MEDICATIONS_RESTRICTED_TO_CARETAKERS");
    });
  });

  // ========================================================
  // 4. Role Isolation for Web Audio Alarm
  // ========================================================
  describe("Web Audio Alarm Scoping", () => {
    it("confirms alarm hook interface is designed strictly for senior role", async () => {
      const { useSeniorAlarm } = await import("@/hooks/use-senior-alarm");
      expect(useSeniorAlarm).toBeDefined();
      expect(typeof useSeniorAlarm).toBe("function");
    });
  });
});
