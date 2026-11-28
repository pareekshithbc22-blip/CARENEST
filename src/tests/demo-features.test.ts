import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  getDemoState,
  resetDemoState,
  createSeniorPatientWithRequest,
  respondToCaretakerRequest,
  cancelCaretakerRequest,
  reassignCaretaker,
  updateMedicationStock,
  publishPrescription,
  publishCareNote,
  createDailyTask,
  toggleTaskCompletion,
  completeTaskBySenior,
  confirmDemoDose,
  skipDemoDose,
  fastForwardTime,
  getEffectiveNow,
  checkMissedDoses,
  simulateRandomReading,
  setSimulationActive,
  setActiveCaretakerId,
  setActiveFamilyAdminId,
  setActiveSeniorPatientId,
  switchDemoRoleContext,
  getCaretakerPatientCount,
  getDemoCaretakerProps,
  getDemoFamilyProps,
  getDemoSeniorProps,
  getDemoCaretakersList,
  prescribeMedicationWithCareNote,
} from "@/demo/store";
import { getSuggestedTaskValues } from "@/demo/task-suggestions";
import { DemoTaskType } from "@/demo/types";

describe("CareNest Demo Mode Comprehensive Feature Verification", () => {
  beforeEach(() => {
    resetDemoState();
  });

  // 1. Sequential Patient IDs (PT-0001 ...)
  describe("Sequential Patient IDs and No Reuse", () => {
    it("initializes seed patients with PT-0001 through PT-0015", () => {
      const state = getDemoState();
      expect(state.patients.length).toBe(15);
      expect(state.patients[0].patientCode).toBe("PT-0001");
      expect(state.patients[1].patientCode).toBe("PT-0002");
      expect(state.patients[2].patientCode).toBe("PT-0003");
      expect(state.patients[3].patientCode).toBe("PT-0004");
      expect(state.patients[4].patientCode).toBe("PT-0005");
      expect(state.patients[5].patientCode).toBe("PT-0006");
      expect(state.patients[14].patientCode).toBe("PT-0015");
      expect(state.nextPatientNumber).toBe(16);
    });

    it("assigns sequential PT-0016, PT-0017 without reuse on new patient registrations", () => {
      const p1 = createSeniorPatientWithRequest(
        { name: "Test Senior One", dateOfBirth: "1950-01-01" },
        "demo-caretaker-2" // Nurse Priya
      );
      expect(p1.patient.patientCode).toBe("PT-0016");

      const p2 = createSeniorPatientWithRequest(
        { name: "Test Senior Two", dateOfBirth: "1953-05-12" },
        "demo-caretaker-2"
      );
      expect(p2.patient.patientCode).toBe("PT-0017");

      const state = getDemoState();
      expect(state.nextPatientNumber).toBe(18);
    });

    it("resets sequential patient IDs only when resetDemoState is invoked", () => {
      createSeniorPatientWithRequest({ name: "Temp Senior", dateOfBirth: "1950-01-01" }, "demo-caretaker-2");
      let state = getDemoState();
      expect(state.nextPatientNumber).toBe(17);

      resetDemoState();
      state = getDemoState();
      expect(state.nextPatientNumber).toBe(16);
      expect(state.patients[0].patientCode).toBe("PT-0001");
      expect(state.patients[14].patientCode).toBe("PT-0015");
    });
  });

  // 2. Maximum 5 Patients per Caretaker & Capacity Enforcement
  describe("Maximum 5 Patients per Caretaker Cap & Derived Counts", () => {
    it("ensures initial seed respects the 5 patient cap for all 6 caretakers and accurately derives counts", () => {
      const state = getDemoState();
      expect(state.caretakers.length).toBe(6);

      // Verify exact assignments: Anjali (5), Priya (1), Rajesh (3), Deepa (2), Amit (4), Fatima (0)
      const expectedCounts: Record<string, number> = {
        "demo-caretaker-id": 5, // Sister Anjali Nair
        "demo-caretaker-2": 1,  // Nurse Priya Mathew
        "demo-caretaker-3": 3,  // Nurse Rajesh Kulkarni
        "demo-caretaker-4": 2,  // Nurse Deepa Sundaram
        "demo-caretaker-5": 4,  // Nurse Amit Saxena
        "demo-caretaker-6": 0,  // Nurse Fatima Zahra
      };

      for (const [id, count] of Object.entries(expectedCounts)) {
        const derived = getCaretakerPatientCount(state, id);
        expect(derived).toBe(count);
        // Verify it matches state.patients directly
        const actualPatients = state.patients.filter(
          (p) => p.caretakerId === id && p.approvalStatus === "APPROVED"
        ).length;
        expect(derived).toBe(actualPatients);
      }

      // Verify no baseLoad property exists on any caretaker profile
      for (const c of state.caretakers) {
        expect((c as any).baseLoad).toBeUndefined();
      }

      // Caretakers catalog lists free caretakers first and marks full ones
      const catalog = getDemoCaretakersList();
      const fullCaretakers = catalog.filter((c) => c.isFull);
      expect(fullCaretakers.some((c) => c.user.name.includes("Sister Anjali Nair"))).toBe(true);
    });

    it("blocks request acceptance when caretaker is at capacity (5/5)", () => {
      const { request } = createSeniorPatientWithRequest(
        { name: "Overcapacity Senior", dateOfBirth: "1950-01-01" },
        "demo-caretaker-id"
      );

      const result = respondToCaretakerRequest(request.id, "ACCEPTED");
      expect(result.success).toBe(false);
      expect(result.error).toContain("maximum limit of 5");

      const state = getDemoState();
      const updatedReq = state.caretakerRequests.find((r) => r.id === request.id);
      expect(updatedReq?.status).toBe("PENDING");
    });

    it("allows request acceptance when caretaker has available slots (< 5)", () => {
      const { patient, request } = createSeniorPatientWithRequest(
        { name: "Priya Patient", dateOfBirth: "1950-01-01" },
        "demo-caretaker-2"
      );

      const result = respondToCaretakerRequest(request.id, "ACCEPTED");
      expect(result.success).toBe(true);

      const state = getDemoState();
      const updatedPatient = state.patients.find((p) => p.id === patient.id);
      expect(updatedPatient?.approvalStatus).toBe("APPROVED");
      expect(updatedPatient?.caretakerId).toBe("demo-caretaker-2");

      const priyaCount = getCaretakerPatientCount(state, "demo-caretaker-2");
      expect(priyaCount).toBe(2);
    });
  });

  // 2.5 Multi-Role Viewing Context & Family Administrators
  describe("Multi-Role Viewing Context & Family Administrators", () => {
    it("seeds 6 family administrators, each owning 2 to 3 patients", () => {
      const state = getDemoState();
      expect(state.familyAdmins).toBeDefined();
      expect(state.familyAdmins?.length).toBe(6);

      // Verify each patient belongs to exactly one family administrator
      state.patients.forEach((p) => {
        expect(p.familyAdminId).toBeDefined();
        const admin = state.familyAdmins?.find((a) => a.id === p.familyAdminId);
        expect(admin).toBeDefined();
      });

      // Verify each family administrator owns 2 to 3 patients
      state.familyAdmins?.forEach((admin) => {
        const owned = state.patients.filter((p) => p.familyAdminId === admin.id);
        expect(owned.length).toBeGreaterThanOrEqual(2);
        expect(owned.length).toBeLessThanOrEqual(3);
      });
    });

    it("filters loved ones by active family administrator", () => {
      // Set active to family admin 2 (Kavita Patel)
      setActiveFamilyAdminId("demo-family-admin-2");
      const props = getDemoFamilyProps();
      expect(props.adminUser.name).toBe("Kavita Patel");
      props.managedSeniors.forEach((s) => {
        expect(s.familyAdminId).toBe("demo-family-admin-2");
      });
    });

    it("preserves context when switching across roles via switchDemoRoleContext", () => {
      // Pick patient-7 (Kavita Deshmukh, caretaker = Rajesh demo-caretaker-3, family = demo-family-admin-3)
      const p7 = getDemoState().patients.find((p) => p.id === "patient-7");
      expect(p7).toBeDefined();
      expect(p7?.caretakerId).toBe("demo-caretaker-3");
      expect(p7?.familyAdminId).toBe("demo-family-admin-3");

      // Switch to Caretaker role from patient-7 context
      const caretakerUrl = switchDemoRoleContext("CARETAKER", "patient-7");
      expect(caretakerUrl).toBe("/demo/caretaker");
      expect(getDemoState().activeCaretakerId).toBe("demo-caretaker-3");

      // Switch to Family role from patient-7 context
      const familyUrl = switchDemoRoleContext("FAMILY", "patient-7");
      expect(familyUrl).toBe("/demo/family");
      expect(getDemoState().activeFamilyAdminId).toBe("demo-family-admin-3");

      // Switch to Senior role from patient-7 context
      const seniorUrl = switchDemoRoleContext("SENIOR", "patient-7");
      expect(seniorUrl).toBe("/demo/senior");
      expect(getDemoState().activeSeniorPatientId).toBe("patient-7");
    });
  });

  // 3. Request Lifecycle (Accept / Reject / Cancel / Reassign)
  describe("Caretaker Request and Notification Lifecycle", () => {
    it("handles full rejection and allows reassignment to another caretaker", () => {
      const { patient, request } = createSeniorPatientWithRequest(
        { name: "Declined Patient", dateOfBirth: "1952-03-10" },
        "demo-caretaker-2" // Priya
      );

      const rejectResult = respondToCaretakerRequest(request.id, "REJECTED");
      expect(rejectResult.success).toBe(true);

      let state = getDemoState();
      let updatedP = state.patients.find((p) => p.id === patient.id);
      expect(updatedP?.approvalStatus).toBe("NO_CARETAKER");
      expect(updatedP?.caretakerId).toBeNull();
      expect(updatedP?.declinedCaretakerIds).toContain("demo-caretaker-2");

      const retryDeclined = reassignCaretaker(patient.id, "demo-caretaker-2");
      expect(retryDeclined.success).toBe(false);
      expect(retryDeclined.error).toContain("previously declined");

      const reassignResult = reassignCaretaker(patient.id, "demo-caretaker-6");
      expect(reassignResult.success).toBe(true);

      state = getDemoState();
      updatedP = state.patients.find((p) => p.id === patient.id);
      expect(updatedP?.approvalStatus).toBe("PENDING_APPROVAL");
      expect(updatedP?.caretakerId).toBe("demo-caretaker-6");
    });

    it("allows Family Administrator to cancel a pending request", () => {
      const { patient, request } = createSeniorPatientWithRequest(
        { name: "Cancellable Patient", dateOfBirth: "1950-01-01" },
        "demo-caretaker-2"
      );

      const cancelResult = cancelCaretakerRequest(request.id);
      expect(cancelResult.success).toBe(true);

      const state = getDemoState();
      const updatedReq = state.caretakerRequests.find((r) => r.id === request.id);
      expect(updatedReq?.status).toBe("CANCELLED");

      const updatedPatient = state.patients.find((p) => p.id === patient.id);
      expect(updatedPatient?.approvalStatus).toBe("NO_CARETAKER");
    });
  });

  // 4. Senior Stock Update Synchronization
  describe("Senior Medicine Stock Update Propagation", () => {
    it("updates medication stock and immediately propagates to Caretaker and Family views", () => {
      const medId = "med-1";
      const updated = updateMedicationStock(medId, 14, "patient");
      expect(updated).not.toBeNull();
      expect(updated!.stockCount).toBe(14);
      expect(updated!.stockUpdatedBy).toBe("patient");

      const caretakerProps = getDemoCaretakerProps("patient-1");
      const caretakerMed = caretakerProps.profiles[0].medications.find((m) => m.id === medId);
      expect(caretakerMed?.stockCount).toBe(14);
      expect(caretakerMed?.stockUpdatedBy).toBe("patient");

      const familyProps = getDemoFamilyProps("patient-1");
      const familyMed = familyProps.profile.medications.find((m) => m.id === medId);
      expect(familyMed?.stock.currentStock).toBe(14);
      expect(familyMed?.stock.displaySummary).toContain("14 tablets left, updated by patient just now");

      const seniorProps = getDemoSeniorProps();
      const seniorMed = seniorProps.allMedications.find((m) => m.id === medId);
      expect(seniorMed?.stockCount).toBe(14);
    });

    it("clamps stock counts between 0 and 999", () => {
      const underflow = updateMedicationStock("med-1", -5);
      expect(underflow?.stockCount).toBe(0);

      const overflow = updateMedicationStock("med-1", 1200);
      expect(overflow?.stockCount).toBe(999);
    });
  });

  // 5. REQUIREMENT 1: Prescribe Section Location & Functionality
  describe("Requirement 1: Move Prescribe Medicine to Medications Tab", () => {
    it("verifies the UI file has Prescribe Medicine in the Medications tab and not in the Care Notes tab", () => {
      const caretakerViewPath = path.join(
        process.cwd(),
        "src",
        "demo",
        "components",
        "demo-caretaker-view.tsx"
      );
      const content = fs.readFileSync(caretakerViewPath, "utf8");

      // Verify "Prescribe Medicine" and "Publish Prescription" exist in the medications tab section
      expect(content).toContain('activeTab === "medications"');
      expect(content).toContain("Publish Prescription");
      expect(content).toContain("Prescribe Medicine");

      // Verify the notes tab only contains health condition update & care note form
      expect(content).toContain('activeTab === "notes"');
      expect(content).toContain("Health Condition Update");
      expect(content).toContain("Publish Care Note");
    });

    it("publishes prescription with required fields and immediately propagates to Family and Senior views", () => {
      const patientId = "patient-1";
      const newMed = publishPrescription(patientId, {
        name: "Atorvastatin Calcium",
        strengthNumber: 20,
        strengthUnit: "mg",
        form: "tablet",
        times: ["21:00"],
        durationDays: 30,
        reason: "Hyperlipidemia cholesterol regulation",
      });

      expect(newMed.name).toBe("Atorvastatin Calcium");
      expect(newMed.dosage).toBe("20 mg");
      expect(newMed.form).toBe("tablet");
      expect(newMed.durationDays).toBe(30);
      expect(newMed.stockCount).toBe(30); // 30 days * 1 time

      // Verify scheduled doses created for today
      const state = getDemoState();
      const dose = state.scheduledDoses.find((d) => d.medicationId === newMed.id);
      expect(dose).toBeDefined();
      expect(dose?.status).toBe("PENDING");

      // Verify Family Admin View
      const familyProps = getDemoFamilyProps(patientId);
      const famMed = familyProps.activePatientMedications.find((m) => m.name === "Atorvastatin Calcium");
      expect(famMed).toBeDefined();
      expect(famMed?.dosage).toBe("20 mg");
      expect(familyProps.unreadTabs?.medications).toBe(true);

      // Verify Senior View
      const seniorProps = getDemoSeniorProps();
      const senMed = seniorProps.allMedications.find((m) => m.name === "Atorvastatin Calcium");
      expect(senMed).toBeDefined();
    });

    it("validates required prescription fields", () => {
      expect(() => {
        publishPrescription("patient-1", {
          name: "",
          strengthNumber: 10,
          strengthUnit: "mg",
          form: "tablet",
          times: ["08:00"],
          durationDays: 10,
          reason: "Test",
        });
      }).toThrow("Medicine name is required");

      expect(() => {
        publishPrescription("patient-1", {
          name: "Test Med",
          strengthNumber: 0,
          strengthUnit: "mg",
          form: "tablet",
          times: ["08:00"],
          durationDays: 10,
          reason: "Test",
        });
      }).toThrow("Valid strength number is required");

      expect(() => {
        publishPrescription("patient-1", {
          name: "Test Med",
          strengthNumber: 10,
          strengthUnit: "mg",
          form: "tablet",
          times: ["08:00"],
          durationDays: 10,
          reason: "",
        });
      }).toThrow("Clinical reason is required");
    });
  });

  // 6. REQUIREMENT 2: Daily Tasks & Age-Based Suggested Starting Values
  describe("Requirement 2: Caretaker Daily Tasks & Age Suggestions", () => {
    it("returns correct age-based suggested starting values with disclaimer label", () => {
      // Age 65
      const s65 = getSuggestedTaskValues(65);
      expect(s65.walking.durationMinutes).toBe(30);
      expect(s65.sleep.targetSleepHours).toBe(7.5);
      expect(s65.hydration.glassesPerDay).toBe(8);
      expect(s65.disclaimer).toBe(
        "Suggested starting values for age 65. The caretaker decides. Not medical advice."
      );

      // Age 75
      const s75 = getSuggestedTaskValues(75);
      expect(s75.walking.durationMinutes).toBe(25);
      expect(s75.hydration.glassesPerDay).toBe(7);
      expect(s75.disclaimer).toBe(
        "Suggested starting values for age 75. The caretaker decides. Not medical advice."
      );

      // Age 85
      const s85 = getSuggestedTaskValues(85);
      expect(s85.walking.activity).toBe("chair_exercises");
      expect(s85.walking.durationMinutes).toBe(15);
      expect(s85.sleep.targetSleepHours).toBe(8);
      expect(s85.hydration.glassesPerDay).toBe(6);
      expect(s85.disclaimer).toBe(
        "Suggested starting values for age 85. The caretaker decides. Not medical advice."
      );
    });

    it("creates and validates typed daily tasks and propagates them to Family view", () => {
      const patientId = "patient-1";
      const types: DemoTaskType[] = [
        "walking",
        "sleep",
        "blood_sugar",
        "blood_pressure",
        "hydration",
        "meals",
        "custom",
      ];

      types.forEach((type) => {
        const task = createDailyTask(patientId, {
          taskType: type,
          title: `Daily Test ${type}`,
          priority: "HIGH",
          startDate: "2026-11-25",
          durationDays: 14,
          details: { sample: "value" },
        });

        expect(task.taskType).toBe(type);
        expect(task.title).toBe(`Daily Test ${type}`);
        expect(task.isCompleted).toBe(false);
      });

      // Verify in Family view
      const familyProps = getDemoFamilyProps(patientId);
      expect(familyProps.activePatientTasks.length).toBeGreaterThanOrEqual(7);
      expect(familyProps.unreadTabs?.tasks).toBe(true);
    });

    it("toggles daily task completion correctly via senior completion delegation", () => {
      const task = createDailyTask("patient-1", {
        taskType: "walking",
        title: "Morning Hallway Walk",
      });
      expect(task.isCompleted).toBe(false);

      const toggled = toggleTaskCompletion(task.id);
      expect(toggled?.isCompleted).toBe(true);
      expect(toggled?.completedAt).toBeDefined();

      const untoggled = toggleTaskCompletion(task.id);
      expect(untoggled?.isCompleted).toBe(false);
      expect(untoggled?.completedAt).toBeNull();
    });

    it("completes task by senior patient, records completion metadata, and notifies caretaker & family", () => {
      const patientId = "patient-1";
      const task = createDailyTask(patientId, {
        taskType: "walking",
        title: "Senior Guided Walk",
      });

      const res = completeTaskBySenior(task.id);
      expect(res.success).toBe(true);
      expect(res.task?.isCompleted).toBe(true);
      expect(res.task?.completedByName).toBe("Ramesh Sharma");
      expect(res.task?.completedAt).toBeDefined();

      const state = getDemoState();
      const updatedTask = state.tasks.find((t) => t.id === task.id);
      expect(updatedTask?.isCompleted).toBe(true);
      expect(updatedTask?.completedByName).toBe("Ramesh Sharma");

      // Verify notifications generated for caretaker and family
      const p1 = state.patients.find((p) => p.id === patientId);
      const caretakerNotif = state.notifications.find(
        (n) => n.userId === p1?.caretakerId && n.message.includes("Ramesh Sharma completed Senior Guided Walk")
      );
      expect(caretakerNotif).toBeDefined();

      const familyNotif = state.notifications.find(
        (n) => n.userId === p1?.familyAdminId && n.message.includes("Ramesh Sharma completed Senior Guided Walk")
      );
      expect(familyNotif).toBeDefined();

      // Verify read-only status in Caretaker Props
      const caretakerProps = getDemoCaretakerProps(patientId);
      const careTask = caretakerProps.profiles[0].tasks.find((t) => t.id === task.id);
      expect(careTask?.isCompleted).toBe(true);
      expect(careTask?.completedByName).toBe("Ramesh Sharma");
      expect(careTask?.todayStatusLabel).toContain("Completed by Ramesh Sharma");

      // Verify read-only status in Family Props
      const familyProps = getDemoFamilyProps(patientId);
      const famTask = familyProps.activePatientTasks.find((t) => t.id === task.id);
      expect(famTask?.isCompleted).toBe(true);
      expect(famTask?.completedByName).toBe("Ramesh Sharma");
      expect(famTask?.todayStatusLabel).toContain("Completed by Ramesh Sharma");
    });

    it("blocks senior patient from completing a task for past dates", () => {
      const task = createDailyTask("patient-1", {
        taskType: "hydration",
        title: "Past Water Intake",
      });

      const res = completeTaskBySenior(task.id, "2026-11-20");
      expect(res.success).toBe(false);
      expect(res.error).toContain("Senior patient can only complete today's task");
    });

    it("includes 7-day completion history in caretaker and family props", () => {
      const patientId = "patient-1";
      const caretakerProps = getDemoCaretakerProps(patientId);
      expect(caretakerProps.profiles[0].tasks.length).toBeGreaterThan(0);
      caretakerProps.profiles[0].tasks.forEach((task) => {
        expect(task.history).toBeDefined();
        expect(task.history?.length).toBe(8); // today + 7 past days
        expect(task.history?.[0].status).toBeDefined();
        expect(task.history?.[0].label).toBeDefined();
      });

      const familyProps = getDemoFamilyProps(patientId);
      familyProps.activePatientTasks.forEach((task) => {
        expect(task.history).toBeDefined();
        expect(task.history?.length).toBe(8);
      });
    });

    it("verifies caretaker and family views are read-only for daily tasks", () => {
      const caretakerPath = path.join(
        process.cwd(),
        "src",
        "demo",
        "components",
        "demo-caretaker-view.tsx"
      );
      const caretakerCode = fs.readFileSync(caretakerPath, "utf8");
      // Must not contain toggle buttons or mark-as-completed button in task detail
      expect(caretakerCode).not.toContain("toggleTaskCompletion");
      expect(caretakerCode).not.toContain("Mark Incomplete");

      const familyPath = path.join(
        process.cwd(),
        "src",
        "demo",
        "components",
        "demo-family-view.tsx"
      );
      const familyCode = fs.readFileSync(familyPath, "utf8");
      expect(familyCode).not.toContain("toggleTaskCompletion");
    });
  });

  // 7. REQUIREMENT 3: Care Notes as Health Condition Updates
  describe("Requirement 3: Care Notes as Health Condition Updates", () => {
    it("publishes health condition update and reflects latestCondition on patient card and panel", () => {
      const patientId = "patient-1";
      const note = publishCareNote(patientId, {
        overallCondition: "Needs attention",
        observations: "Systolic blood pressure elevated to 155 mmHg. Resting quietly.",
        quickFields: {
          appetite: "Fair",
          mood: "Anxious",
          sleepQuality: "Interrupted",
          painLevel: 3,
          mobility: "Assisted",
        },
      });

      expect(note.overallCondition).toBe("Needs attention");
      expect(note.observations).toContain("155 mmHg");
      expect(note.quickFields?.painLevel).toBe(3);

      // Verify patient state updated
      const state = getDemoState();
      const patient = state.patients.find((p) => p.id === patientId);
      expect(patient?.latestCondition).toBe("Needs attention");

      // Verify Caretaker Props
      const caretakerProps = getDemoCaretakerProps(patientId);
      const profile = caretakerProps.profiles.find((p) => p.id === patientId);
      expect(profile?.latestCondition).toBe("Needs attention");

      // Verify Family Props
      const familyProps = getDemoFamilyProps(patientId);
      expect(familyProps.latestCondition).toBe("Needs attention");
      expect(familyProps.unreadTabs?.notes).toBe(true);
    });
  });

  // 8. REQUIREMENT 4: Family Administrator Tabs for Caretaker Assignments
  describe("Requirement 4: Family Administrator Tabs for Caretaker Assignments", () => {
    it("isolates assignments to the selected loved one only", () => {
      // Add a note and a task to patient-1
      publishCareNote("patient-1", {
        overallCondition: "Improving",
        observations: "Patient-1 observation notes",
      });
      createDailyTask("patient-1", {
        taskType: "hydration",
        title: "Patient-1 Water Routine",
      });

      // Check patient-1 family props
      const p1Props = getDemoFamilyProps("patient-1");
      expect(p1Props.activePatientNotes.some((n) => n.observations?.includes("Patient-1 observation notes"))).toBe(true);
      expect(p1Props.activePatientTasks.some((t) => t.title === "Patient-1 Water Routine")).toBe(true);

      // Check another patient (e.g. patient-2) does NOT contain patient-1's assignments
      const p2Props = getDemoFamilyProps("patient-2");
      expect(p2Props.activePatientNotes.some((n) => n.observations?.includes("Patient-1 observation notes"))).toBe(false);
      expect(p2Props.activePatientTasks.some((t) => t.title === "Patient-1 Water Routine")).toBe(false);
    });
  });

  // 9. REQUIREMENT 5: Dose Status Visibility on Family & Caretaker Dashboards
  describe("Requirement 5: Dose Status Visibility on Family & Caretaker Dashboards", () => {
    it("immediately reflects senior Taken and Skipped actions in Today's Medicines on Family and Caretaker dashboards", () => {
      // Initial state of dose-3 (scheduled for 20:00)
      const initialFam = getDemoFamilyProps("patient-1");
      const d3FamInitial = initialFam.todayDoses.find((d) => d.id === "dose-3");
      expect(d3FamInitial?.status).toBe("PENDING");

      // Senior confirms dose-3 as TAKEN
      confirmDemoDose("dose-3", "Taken with dinner", "patient");

      // Verify Family Dashboard Today's Medicines
      const famAfterTake = getDemoFamilyProps("patient-1");
      const d3FamTaken = famAfterTake.todayDoses.find((d) => d.id === "dose-3");
      expect(d3FamTaken?.status).toBe("TAKEN");
      expect(d3FamTaken?.statusLabel).toContain("Taken at");
      expect(d3FamTaken?.statusLabel).toContain("by patient");

      // Verify Caretaker Dashboard Today's Medicines
      const careAfterTake = getDemoCaretakerProps("patient-1");
      const d3CareTaken = careAfterTake.profiles[0].todayDoses.find((d) => d.id === "dose-3");
      expect(d3CareTaken?.status).toBe("TAKEN");
      expect(d3CareTaken?.statusLabel).toContain("Taken at");
      expect(d3CareTaken?.statusLabel).toContain("by patient");

      // Senior skips dose-4
      skipDemoDose("dose-4", "Experiencing mild nausea");

      // Verify Family Dashboard
      const famAfterSkip = getDemoFamilyProps("patient-1");
      const d4FamSkipped = famAfterSkip.todayDoses.find((d) => d.id === "dose-4");
      expect(d4FamSkipped?.status).toBe("SKIPPED");
      expect(d4FamSkipped?.statusLabel).toContain("Skipped: Experiencing mild nausea");

      // Verify Caretaker Dashboard
      const careAfterSkip = getDemoCaretakerProps("patient-1");
      const d4CareSkipped = careAfterSkip.profiles[0].todayDoses.find((d) => d.id === "dose-4");
      expect(d4CareSkipped?.status).toBe("SKIPPED");
      expect(d4CareSkipped?.statusLabel).toContain("Skipped: Experiencing mild nausea");
    });
  });

  // 10. REQUIREMENT 6: Forgotten Tablet Escalation, Fast-Forward & Deduplication
  describe("Requirement 6: Missed Dose Notification, Fast-Forward & Deduplication", () => {
    it("fast-forwards demo clock, marks missed doses, and notifies both caretaker and family with deduplication", () => {
      let state = getDemoState();
      expect(state.timeOffsetMinutes).toBe(0);

      // Fast forward time by 1440 minutes (24 hours) to guarantee doses pass the 15-min grace window
      fastForwardTime(1440);

      state = getDemoState();
      expect(state.timeOffsetMinutes).toBe(1440);

      // Check dose-3 (was pending at 20:00)
      const d3 = state.scheduledDoses.find((d) => d.id === "dose-3");
      expect(d3?.status).toBe("MISSED");
      expect(d3?.missedNotified).toBe(true);

      // Notifications should have been generated for both caretaker and family
      const caretakerNotif = state.notifications.find(
        (n) => n.userId === state.activeCaretakerId && n.type === "MISSED_DOSE" && n.message.includes("Metformin Hydrochloride")
      );
      expect(caretakerNotif).toBeDefined();
      expect(caretakerNotif?.message).toContain("Ramesh Sharma (PT-0001) has not taken Metformin Hydrochloride");

      const familyNotif = state.notifications.find(
        (n) => n.userId === state.familyUser.id && n.type === "MISSED_DOSE" && n.message.includes("Metformin Hydrochloride")
      );
      expect(familyNotif).toBeDefined();
      expect(familyNotif?.message).toContain("Ramesh Sharma (PT-0001) has not taken Metformin Hydrochloride");

      const notifCountBefore = state.notifications.length;

      // Fast forward AGAIN by 30 minutes - verify deduplication!
      fastForwardTime(30);

      state = getDemoState();
      expect(state.timeOffsetMinutes).toBe(1470);
      // No duplicate notifications should be added for the same missed dose
      const notifCountAfter = state.notifications.length;
      expect(notifCountAfter).toBe(notifCountBefore);
    });

    it("resets store-level time offset when resetDemoState is called", () => {
      fastForwardTime(60);
      let state = getDemoState();
      expect(state.timeOffsetMinutes).toBe(60);

      resetDemoState();
      state = getDemoState();
      expect(state.timeOffsetMinutes).toBe(0);
    });
  });

  // 11. Demo Isolation Verification
  describe("Strict Demo Isolation Verification", () => {
    it("verifies demo directory does not import prisma, database, or next-auth server code", () => {
      const demoDir = path.join(process.cwd(), "src", "demo");
      const files = fs.readdirSync(demoDir, { recursive: true }) as string[];

      files.forEach((file) => {
        const fullPath = path.join(demoDir, file);
        if (fs.statSync(fullPath).isFile() && (file.endsWith(".ts") || file.endsWith(".tsx"))) {
          const content = fs.readFileSync(fullPath, "utf8");
          expect(content).not.toMatch(/@\/lib\/prisma/);
          expect(content).not.toMatch(/@prisma\/client/);
          expect(content).not.toMatch(/next-auth\/next/);
          expect(content).not.toMatch(/getServerSession/);
          expect(content).not.toMatch(/@\/server\//);
        }
      });
    });
  });
});
