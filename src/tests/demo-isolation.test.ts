import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import {
  getDemoState,
  saveDemoState,
  resetDemoState,
  confirmDemoDose,
  skipDemoDose,
  recordDemoVital,
  runSimulatedScheduler,
  getDemoCaretakerProps,
  getDemoFamilyProps,
  getDemoSeniorProps,
} from "@/demo/store";
import {
  setupDemoFetchInterceptor,
  teardownDemoFetchInterceptor,
} from "@/demo/fetch-interceptor";
import { DOSE_GRACE_MINUTES } from "@/lib/config";

describe("CareNest Demo Mode Isolation & Strict Sandbox Verification", () => {
  beforeEach(() => {
    resetDemoState();
  });

  afterEach(() => {
    teardownDemoFetchInterceptor();
    vi.restoreAllMocks();
  });

  // 1. Static Scan: Zero Prisma, DB, NextAuth Server, or Email Imports
  describe("Source Code Static Isolation Scan", () => {
    it("ensures no files in src/demo/** or src/app/demo/** import database, Prisma, server auth, or email services", () => {
      const demoDirs = [
        path.join(process.cwd(), "src", "demo"),
        path.join(process.cwd(), "src", "app", "demo"),
      ];

      const forbiddenPatterns = [
        /@\/lib\/prisma/i,
        /from\s+["'].*prisma["']/i,
        /@\/lib\/email/i,
        /@\/lib\/session/i,
        /@\/lib\/auth["']/i,
        /nodemailer/i,
        /@prisma\/client/i,
      ];

      function scanDir(dir: string): string[] {
        let results: string[] = [];
        if (!fs.existsSync(dir)) return results;
        const list = fs.readdirSync(dir);
        for (const file of list) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat && stat.isDirectory()) {
            results = results.concat(scanDir(filePath));
          } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
            results.push(filePath);
          }
        }
        return results;
      }

      const scannedFiles = demoDirs.flatMap(scanDir);
      expect(scannedFiles.length).toBeGreaterThan(0);

      const violations: { file: string; pattern: string }[] = [];

      for (const file of scannedFiles) {
        const content = fs.readFileSync(file, "utf8");
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(content)) {
            violations.push({ file: path.relative(process.cwd(), file), pattern: pattern.toString() });
          }
        }
      }

      expect(violations).toEqual([]);
    });
  });

  // 2. Demo Store Logic & Mutations
  describe("Client-side Demo Store & Shared State", () => {
    it("loads initial seed state with verified caretakers, 15 patients, and pre-computed vitals", () => {
      const state = getDemoState();
      expect(state.caretakerProfile.status).toBe("APPROVED");
      expect(state.patients.length).toBe(15);

      // Verify fictional contact details (.invalid emails, zeroed phones)
      state.patients.forEach((p) => {
        expect(p.emergencyContactPhone).toMatch(/\+00 00000000\d+/);
      });

      // Confirm 14 days of vitals per patient
      expect(state.vitals.length).toBe(15 * 14);
    });

    it("confirms a scheduled dose and updates state for all roles", () => {
      const state = getDemoState();
      const pendingDose = state.scheduledDoses.find((d) => d.status === "PENDING");
      expect(pendingDose).toBeDefined();

      const confirmed = confirmDemoDose(pendingDose!.id, "Confirmed in unit test");
      expect(confirmed).not.toBeNull();
      expect(confirmed!.status).toBe("TAKEN");
      expect(confirmed!.confirmationNotes).toBe("Confirmed in unit test");

      const refreshed = getDemoState();
      const updatedInStore = refreshed.scheduledDoses.find((d) => d.id === pendingDose!.id);
      expect(updatedInStore?.status).toBe("TAKEN");
    });

    it("skips a scheduled dose and records the reason", () => {
      const state = getDemoState();
      const pendingDose = state.scheduledDoses.find((d) => d.status === "PENDING");
      expect(pendingDose).toBeDefined();

      const skipped = skipDemoDose(pendingDose!.id, "Nausea after meals");
      expect(skipped).not.toBeNull();
      expect(skipped!.status).toBe("SKIPPED");
      expect(skipped!.skippedReason).toBe("Nausea after meals");
    });

    it("records a vital reading and generates escalation notifications when abnormal", () => {
      const reading = recordDemoVital("patient-1", 280, 185, 115, "Post-lunch check");
      expect(reading.sugarSeverity).toBe("CRITICAL");
      expect(reading.bpSeverity).toBe("CRITICAL");

      const state = getDemoState();
      const alert = state.notifications.find(
        (n) => n.type === "ESCALATION_WARNING" && n.title.includes("Critical: Abnormal Vitals")
      );
      expect(alert).toBeDefined();
    });

    it("resets demo state back to clean initial seed", () => {
      // Mutate state
      recordDemoVital("patient-1", 300, 200, 120, "Spike");
      let state = getDemoState();
      expect(state.vitals[0].bloodGlucose).toBe(300);

      // Reset
      const fresh = resetDemoState();
      expect(fresh.vitals[0].bloodGlucose).not.toBe(300);
      expect(fresh.patients.length).toBe(15);
    });
  });

  // 3. Simulated Scheduler & Dose Grace Logic
  describe("Simulated Scheduler & Missed Dose Escalations", () => {
    it("marks pending doses older than 15 minutes as MISSED and creates notifications", () => {
      const state = getDemoState();
      const now = Date.now();
      const overdueTime = new Date(now - (DOSE_GRACE_MINUTES + 5) * 60 * 1000).toISOString();

      // Inject an overdue pending dose
      state.scheduledDoses.push({
        id: "dose-overdue-test",
        medicationId: "med-1",
        elderlyProfileId: "patient-1",
        scheduledAt: overdueTime,
        status: "PENDING",
        medication: {
          id: "med-1",
          name: "Metformin Hydrochloride",
          dosage: "500 mg",
          instructions: "Test dose",
        },
      });
      saveDemoState(state);

      const result = runSimulatedScheduler();
      expect(result.missedDosesCount).toBeGreaterThanOrEqual(1);

      const refreshed = getDemoState();
      const missedDose = refreshed.scheduledDoses.find((d) => d.id === "dose-overdue-test");
      expect(missedDose?.status).toBe("MISSED");

      const missedNotif = refreshed.notifications.find(
        (n) => n.type === "MISSED_DOSE" && n.title.includes("Metformin Hydrochloride")
      );
      expect(missedNotif).toBeDefined();
    });

    it("detects patients without assigned care plans and creates warning", () => {
      const result = runSimulatedScheduler();
      expect(result.newNotificationsCount).toBeGreaterThanOrEqual(0);

      const state = getDemoState();
      const unassignedPatient = state.patients.find((p) => p.id === "patient-5"); // Devraj Patel
      expect(unassignedPatient).toBeDefined();

      const warning = state.notifications.find(
        (n) => n.type === "CARE_PLAN_MISSING" && n.message.includes(unassignedPatient!.name)
      );
      expect(warning).toBeDefined();
    });
  });

  // 4. Props Generation for Dashboards
  describe("Dashboard Client Component Props Extraction", () => {
    it("formats Caretaker props without requiring database queries", () => {
      const props = getDemoCaretakerProps();
      expect(props.caretakerName).toBe("Sister Anjali Nair, RN");
      expect(props.caretakerProfile.status).toBe("APPROVED");
      // Sister Anjali keeps 5 patients (PT-0001 to PT-0005) under the 5-patient cap
      expect(props.profiles.length).toBe(5);
      expect(props.profiles[0].latestBloodSugar).toBeDefined();
    });

    it("formats Family Administrator props with caretaker provenance and adherence analytics", () => {
      const props = getDemoFamilyProps();
      expect(props.adminUser.name).toBe("Vikram Sharma");
      expect(props.managedSeniors.length).toBe(3);
      expect(props.profile.medications[0].assignedBy.name).toBe("Sister Anjali Nair, RN");
      expect(props.analytics.adherenceRate).toBeGreaterThan(0);
    });

    it("formats Senior Patient props with accessible checklist and alarm config", () => {
      const props = getDemoSeniorProps();
      expect(props.initialProfile.name).toBe("Ramesh Sharma");
      expect(props.initialDoses.length).toBeGreaterThan(0);
      expect(props.caretaker?.role).toBeDefined();
    });
  });

  // 5. Scoped Fetch Interceptor Whitelist & Teardown
  describe("Scoped Fetch Interceptor", () => {
    it("intercepts whitelisted calls and restores original fetch on unmount", async () => {
      const g: any = typeof window !== "undefined" ? window : globalThis;
      const original = g.fetch;
      const teardown = setupDemoFetchInterceptor();

      // 1. Session call returns demo user
      const sessionRes = await fetch("http://localhost:3000/api/auth/session");
      const sessionData = await sessionRes.json();
      expect(sessionRes.ok).toBe(true);
      expect(sessionData.user.name).toBeDefined();

      // 2. Doses call
      const dosesRes = await fetch("http://localhost:3000/api/doses?profileId=patient-1");
      const dosesData = await dosesRes.json();
      expect(dosesRes.ok).toBe(true);
      expect(dosesData.doses.length).toBeGreaterThan(0);

      // 3. Non-whitelisted API call is blocked
      const blockedRes = await fetch("http://localhost:3000/api/auth/register", { method: "POST" });
      expect(blockedRes.status).toBe(404);

      // 4. Teardown restores original fetch
      teardown();
      expect(g.fetch).toBe(original);
    });
  });
});
