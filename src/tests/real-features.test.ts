import { describe, it, expect } from "vitest";
import { formatPatientCode, parsePatientCode } from "@/lib/domain/patient-code";
import {
  MAX_CARETAKER_PATIENTS,
  deriveCaretakerPatientCount,
  canCaretakerAcceptPatient,
  formatCaretakerAvailability,
} from "@/lib/domain/caretaker-capacity";
import {
  canTransitionRequest,
  isCaretakerDeclined,
  redactPatientDetailsForRequest,
} from "@/lib/domain/requests";
import { deriveDoseStatus, DOSE_GRACE_MINUTES } from "@/lib/domain/dose-status";
import {
  evaluateBloodSugar,
  evaluateBloodPressure,
} from "@/lib/domain/clinical-thresholds";
import { getSuggestedTaskValues } from "@/lib/domain/task-suggestions";
import { deriveTaskStatusForDay } from "@/lib/domain/task-status";
import { isLowStock, formatStockSummary } from "@/lib/domain/stock";
import { completeTaskBySenior } from "@/lib/services/task-service";

describe("CareNest Real Features Domain & Services Suite", () => {
  // F1. Sequential Patient Codes
  describe("F1: Patient Code Generator & Parser", () => {
    it("formats sequential patient code with PT- prefix and 4 digits padding", () => {
      expect(formatPatientCode(1)).toBe("PT-0001");
      expect(formatPatientCode(15)).toBe("PT-0015");
      expect(formatPatientCode(999)).toBe("PT-0999");
      expect(formatPatientCode(1234)).toBe("PT-1234");
    });

    it("parses valid patient code into numeric sequence", () => {
      expect(parsePatientCode("PT-0001")).toBe(1);
      expect(parsePatientCode("PT-0042")).toBe(42);
      expect(parsePatientCode("pt-0100")).toBe(100);
      expect(parsePatientCode("INVALID")).toBeNull();
      expect(parsePatientCode("PT-ABC")).toBeNull();
    });
  });

  // F2 & F5. Caretaker Capacity & 5-Patient Cap
  describe("F2 & F5: Caretaker Capacity & 5-Patient Limit", () => {
    it("enforces MAX_CARETAKER_PATIENTS = 5", () => {
      expect(MAX_CARETAKER_PATIENTS).toBe(5);
    });

    it("derives count strictly from active accepted assignments", () => {
      const assignments = [
        { status: "ACCEPTED" },
        { status: "ACCEPTED" },
        { status: "PENDING" },
        { status: "REJECTED" },
        { status: "REVOKED" },
      ];
      expect(deriveCaretakerPatientCount(assignments)).toBe(2);
      expect(deriveCaretakerPatientCount(3)).toBe(3);
    });

    it("verifies caretaker acceptance eligibility under the 5-patient cap", () => {
      expect(canCaretakerAcceptPatient(0)).toBe(true);
      expect(canCaretakerAcceptPatient(4)).toBe(true);
      expect(canCaretakerAcceptPatient(5)).toBe(false);
      expect(canCaretakerAcceptPatient(6)).toBe(false);
    });

    it("formats availability correctly", () => {
      expect(formatCaretakerAvailability(3).availabilityLabel).toBe("3 of 5 patients, 2 slots free");
      expect(formatCaretakerAvailability(5).availabilityLabel).toBe("Fully booked (5 of 5 patients)");
    });
  });

  // F4. Access Request State Machine & Redaction
  describe("F4: Request State Machine & Pre-acceptance Redaction", () => {
    it("allows valid transitions from PENDING", () => {
      expect(canTransitionRequest("PENDING", "ACCEPTED").allowed).toBe(true);
      expect(canTransitionRequest("PENDING", "REJECTED").allowed).toBe(true);
      expect(canTransitionRequest("PENDING", "CANCELLED").allowed).toBe(true);
      expect(canTransitionRequest("PENDING", "REVOKED").allowed).toBe(false);
    });

    it("allows revocation only from ACCEPTED", () => {
      expect(canTransitionRequest("ACCEPTED", "REVOKED").allowed).toBe(true);
      expect(canTransitionRequest("ACCEPTED", "PENDING").allowed).toBe(false);
      expect(canTransitionRequest("REJECTED", "ACCEPTED").allowed).toBe(false);
      expect(canTransitionRequest("CANCELLED", "ACCEPTED").allowed).toBe(false);
    });

    it("prevents declined caretakers from re-selection", () => {
      const declined = ["caretaker-1", "caretaker-2"];
      expect(isCaretakerDeclined(declined, "caretaker-1")).toBe(true);
      expect(isCaretakerDeclined(declined, "caretaker-3")).toBe(false);
    });

    it("redacts patient details before acceptance to strictly name, age, patient ID, and family coordinator", () => {
      const sensitivePatient = {
        name: "Eleanor Vance",
        age: 78,
        patientCode: "PT-0001",
        familyAdminName: "Sarah Vance",
        medicalConditions: ["Hypertension", "Diabetes"],
        allergies: ["Penicillin"],
        notes: "Confidential clinical history",
      };

      const redacted = redactPatientDetailsForRequest(sensitivePatient);
      expect(redacted.name).toBe("Eleanor Vance");
      expect(redacted.age).toBe(78);
      expect(redacted.patientCode).toBe("PT-0001");
      expect(redacted.familyAdminName).toBe("Sarah Vance");
      expect((redacted as any).medicalConditions).toBeUndefined();
      expect((redacted as any).allergies).toBeUndefined();
      expect((redacted as any).notes).toBeUndefined();
    });
  });

  // F8 & F9. Tasks & Role-based Completion Restriction
  describe("F8 & F9: Daily Tasks & Senior-Only Completion", () => {
    it("generates age-appropriate baseline suggestions", () => {
      const sug65 = getSuggestedTaskValues(65);
      expect(sug65.walking.durationMinutes).toBe(30);

      const sug75 = getSuggestedTaskValues(75);
      expect(sug75.walking.durationMinutes).toBe(25);

      const sug85 = getSuggestedTaskValues(85);
      expect(sug85.walking.durationMinutes).toBe(15);
      expect(sug85.disclaimer).toContain("Suggested starting values for age 85");
    });

    it("derives daily task status correctly across 7-day timeline", () => {
      const task = {
        id: "task-1",
        startDate: new Date("2026-11-20T00:00:00Z"),
        endDate: null,
        untilStopped: true,
      };

      // Past day completed
      const pastComp = { completed: true, completedAt: new Date(), completedByName: "Senior" };
      const st1 = deriveTaskStatusForDay(task, "2026-11-22", "2026-11-26", pastComp);
      expect(st1.status).toBe("COMPLETED");

      // Past day not completed
      const st2 = deriveTaskStatusForDay(task, "2026-11-22", "2026-11-26", null);
      expect(st2.status).toBe("NOT_COMPLETED");

      // Today pending
      const st3 = deriveTaskStatusForDay(task, "2026-11-26", "2026-11-26", null);
      expect(st3.status).toBe("PENDING");
    });

    it("enforces server-side authorization: throws 403 when Caretaker or Family tries to complete task", async () => {
      await expect(
        completeTaskBySenior("user-caretaker", "CARETAKER", "task-1")
      ).rejects.toThrow(/Task completion is restricted to Senior Patients only/);

      await expect(
        completeTaskBySenior("user-family", "FAMILY", "task-1")
      ).rejects.toThrow(/Task completion is restricted to Senior Patients only/);
    });
  });

  // F7. Medication Stock Calculations
  describe("F7: Medication Stock Calculations", () => {
    it("identifies low stock when current stock is 5 or fewer units", () => {
      expect(isLowStock(0)).toBe(true);
      expect(isLowStock(3)).toBe(true);
      expect(isLowStock(5)).toBe(true);
      expect(isLowStock(6)).toBe(false);
      expect(isLowStock(30)).toBe(false);
    });

    it("formats stock summary accurately", () => {
      expect(formatStockSummary(20, "tablets")).toBe("20 tablets left");
      expect(formatStockSummary(4, "capsules")).toBe("4 capsules left (Low Stock)");
      expect(formatStockSummary(0, "tablets")).toBe("Out of stock (0 tablets left)");
    });
  });

  // F12. Live Dose Status Derivation
  describe("F12: Dose Status Derivation", () => {
    const baseNow = new Date("2026-11-26T12:00:00Z");

    it("derives TAKEN status with confirmed time and actor label", () => {
      const scheduledAt = new Date("2026-11-26T08:00:00Z");
      const confirmedAt = new Date("2026-11-26T08:15:00Z");
      const result = deriveDoseStatus(scheduledAt, "TAKEN", {
        confirmedAt,
        takenBy: "patient",
        referenceTime: baseNow,
      });

      expect(result.status).toBe("TAKEN");
      expect(result.takenBy).toBe("patient");
      expect(result.label).toContain("Taken at");
      expect(result.label).toContain("(by patient)");
    });

    it("derives SKIPPED status with documented reason", () => {
      const scheduledAt = new Date("2026-11-26T08:00:00Z");
      const result = deriveDoseStatus(scheduledAt, "SKIPPED", {
        skipReason: "Nausea advised by doctor",
        referenceTime: baseNow,
      });

      expect(result.status).toBe("SKIPPED");
      expect(result.label).toBe("Skipped (Nausea advised by doctor)");
    });

    it("derives OVERDUE when dose is pending and within 15 min past schedule", () => {
      // Scheduled 5 minutes ago (between 0 and 15 min)
      const scheduledAt = new Date(baseNow.getTime() - 5 * 60000);
      const result = deriveDoseStatus(scheduledAt, "SCHEDULED", {
        referenceTime: baseNow,
      });

      expect(result.status).toBe("OVERDUE");
      expect(result.isOverdue).toBe(true);
    });

    it("derives MISSED when dose is pending and past grace period (>15 min)", () => {
      // Scheduled 30 minutes ago (>15 min grace window)
      const scheduledAt = new Date(baseNow.getTime() - 30 * 60000);
      const result = deriveDoseStatus(scheduledAt, "SCHEDULED", {
        referenceTime: baseNow,
      });

      expect(result.status).toBe("MISSED");
      expect(result.isOverdue).toBe(true);
    });

    it("derives PENDING when dose is scheduled in the future", () => {
      // Scheduled 30 minutes in the future
      const scheduledAt = new Date(baseNow.getTime() + 30 * 60000);
      const result = deriveDoseStatus(scheduledAt, "SCHEDULED", {
        referenceTime: baseNow,
      });

      expect(result.status).toBe("PENDING");
      expect(result.isOverdue).toBe(false);
    });
  });

  // F14. Clinical Thresholds Evaluation
  describe("F14: Clinical Vitals Telemetry Thresholds", () => {
    it("evaluates blood sugar levels into NORMAL, WARNING, CRITICAL bands", () => {
      expect(evaluateBloodSugar(110).severity).toBe("NORMAL");
      expect(evaluateBloodSugar(180).severity).toBe("WARNING");
      expect(evaluateBloodSugar(280).severity).toBe("CRITICAL");
      expect(evaluateBloodSugar(60).severity).toBe("CRITICAL");
    });

    it("evaluates blood pressure systolic and diastolic accurately", () => {
      expect(evaluateBloodPressure(118, 76).severity).toBe("NORMAL");
      expect(evaluateBloodPressure(135, 85).severity).toBe("WARNING");
      expect(evaluateBloodPressure(165, 105).severity).toBe("CRITICAL");
      expect(evaluateBloodPressure(85, 45).severity).toBe("CRITICAL");
    });
  });
});
