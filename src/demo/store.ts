import {
  DemoState,
  DemoScheduledDose,
  DemoVitalReading,
  DemoMedication,
  DemoCareTask,
  DemoCareNote,
  DemoNotification,
  DemoCaretakerRequest,
  DemoPatient,
  DemoUser,
  DemoCaretakerProfile,
  DemoHealthCondition,
  DemoTaskType,
} from "./types";
import { createInitialDemoState } from "./seed-data";
import {
  DOSE_GRACE_MINUTES,
  evaluateBloodSugar,
  evaluateBloodPressure,
  deriveTaskStatusForDay,
  formatPatientCode,
  deriveCaretakerPatientCount,
  canCaretakerAcceptPatient,
} from "@/lib/domain";

const STORAGE_KEY = "carenest_demo_state_v2";
const EVENT_NAME = "carenest_demo_update";

let inMemoryState: DemoState | null = null;

export function getDemoState(): DemoState {
  if (typeof window === "undefined") {
    if (!inMemoryState) {
      inMemoryState = createInitialDemoState();
    }
    return inMemoryState;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 2) {
        inMemoryState = parsed;
        return parsed;
      }
    }
  } catch {
    // sessionStorage not accessible or JSON parse error
  }

  const initial = createInitialDemoState();
  saveDemoState(initial);
  return initial;
}

export function saveDemoState(state: DemoState): void {
  inMemoryState = state;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: state }));
    } catch {
      // sessionStorage full or quota exceeded
    }
  }
}

export function resetDemoState(): DemoState {
  const fresh = createInitialDemoState();
  saveDemoState(fresh);
  return fresh;
}

export function subscribeToDemoUpdates(callback: (state: DemoState) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const custom = event as CustomEvent<DemoState>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getDemoState());
    }
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
  };
}

// ==========================================
// STORE-LEVEL TIME OFFSET (FAST-FORWARD)
// ==========================================

export function getEffectiveNow(state?: DemoState): number {
  const s = state || getDemoState();
  return Date.now() + (s.timeOffsetMinutes || 0) * 60 * 1000;
}

export function fastForwardTime(minutes: number = 30): DemoState {
  const state = getDemoState();
  state.timeOffsetMinutes = (state.timeOffsetMinutes || 0) + minutes;
  checkMissedDoses(state);
  saveDemoState(state);
  return state;
}

// ==========================================
// ACTIVE CARETAKER & SIMULATION MUTATIONS
// ==========================================

export function setActiveCaretakerId(caretakerId: string): void {
  const state = getDemoState();
  const found = state.caretakers.find((c) => c.user.id === caretakerId);
  if (!found) return;

  state.activeCaretakerId = caretakerId;
  state.caretakerUser = found.user;
  state.caretakerProfile = found.profile;
  saveDemoState(state);
}

export function setActiveFamilyAdminId(familyAdminId: string): void {
  const state = getDemoState();
  state.activeFamilyAdminId = familyAdminId;
  const found = state.familyAdmins?.find((f) => f.id === familyAdminId);
  if (found) {
    state.familyUser = found;
  }
  saveDemoState(state);
}

export function setActiveSeniorPatientId(patientId: string): void {
  const state = getDemoState();
  state.activeSeniorPatientId = patientId;
  const found = state.patients.find((p) => p.id === patientId);
  if (found) {
    state.seniorUser = {
      id: `demo-user-${found.id}`,
      name: found.name,
      email: `${found.patientCode.toLowerCase()}@carenest.invalid`,
      role: "SENIOR",
      avatarUrl: null,
    };
  }
  saveDemoState(state);
}

export function switchDemoRoleContext(
  targetRole: "CARETAKER" | "FAMILY" | "SENIOR",
  currentPatientId?: string
): string {
  const state = getDemoState();
  const patient =
    (currentPatientId && state.patients.find((p) => p.id === currentPatientId)) ||
    (state.activeSeniorPatientId && state.patients.find((p) => p.id === state.activeSeniorPatientId)) ||
    state.patients[0];

  if (targetRole === "CARETAKER") {
    if (patient?.caretakerId) {
      setActiveCaretakerId(patient.caretakerId);
    }
    return "/demo/caretaker";
  } else if (targetRole === "FAMILY") {
    if (patient?.familyAdminId) {
      setActiveFamilyAdminId(patient.familyAdminId);
    }
    return "/demo/family";
  } else {
    // SENIOR
    if (patient?.id) {
      setActiveSeniorPatientId(patient.id);
    }
    return "/demo/senior";
  }
}

export function setSimulationActive(active: boolean): void {
  const state = getDemoState();
  state.simulationActive = active;
  saveDemoState(state);
}

export function simulateRandomReading(targetPatientId?: string): DemoVitalReading | null {
  const state = getDemoState();
  if (!state.simulationActive) return null;

  const activeCaretaker =
    state.caretakers.find((c) => c.user.id === state.activeCaretakerId) || state.caretakers[0];
  const activePatients = state.patients.filter(
    (p) => p.caretakerId === activeCaretaker.user.id && p.approvalStatus === "APPROVED"
  );

  const patientId = targetPatientId || activePatients[0]?.id || state.patients[0]?.id;
  if (!patientId) return null;

  // Realistic random-walk reading with small occasional abnormal drift
  const isAbnormalDrift = Math.random() < 0.2; // 20% chance of abnormal drift to demonstrate alert logic

  let sugar: number;
  let sys: number;
  let dia: number;

  if (isAbnormalDrift) {
    // Alternate between high sugar or high BP
    if (Math.random() < 0.5) {
      sugar = Math.floor(160 + Math.random() * 45); // 160-205 (Warning range)
      sys = Math.floor(125 + Math.random() * 15);
      dia = Math.floor(80 + Math.random() * 8);
    } else {
      sugar = Math.floor(115 + Math.random() * 20);
      sys = Math.floor(142 + Math.random() * 25); // 142-167 (Warning/Critical BP)
      dia = Math.floor(92 + Math.random() * 12);
    }
  } else {
    // Normal plausible baseline
    sugar = Math.floor(110 + Math.random() * 25); // 110-135 mg/dL
    sys = Math.floor(118 + Math.random() * 12); // 118-130 mmHg
    dia = Math.floor(75 + Math.random() * 8); // 75-83 mmHg
  }

  return recordDemoVital(
    patientId,
    sugar,
    sys,
    dia,
    "Real-time telemetry reading (simulated)"
  );
}

// ==========================================
// STORE MUTATIONS (ALL IN-MEMORY / SESSION)
// ==========================================

export function confirmDemoDose(
  doseId: string,
  notes?: string,
  takenBy: "patient" | "caretaker" = "patient"
): DemoScheduledDose | null {
  const state = getDemoState();
  const doseIndex = state.scheduledDoses.findIndex((d) => d.id === doseId);
  if (doseIndex === -1) return null;

  const effectiveNow = getEffectiveNow(state);
  const updatedDose: DemoScheduledDose = {
    ...state.scheduledDoses[doseIndex],
    status: "TAKEN",
    confirmedAt: new Date(effectiveNow).toISOString(),
    confirmationNotes: notes || "Confirmed in Demo Mode",
    takenBy,
  };

  state.scheduledDoses[doseIndex] = updatedDose;
  saveDemoState(state);
  return updatedDose;
}

export function skipDemoDose(doseId: string, reason: string): DemoScheduledDose | null {
  const state = getDemoState();
  const doseIndex = state.scheduledDoses.findIndex((d) => d.id === doseId);
  if (doseIndex === -1) return null;

  const updatedDose: DemoScheduledDose = {
    ...state.scheduledDoses[doseIndex],
    status: "SKIPPED",
    skippedReason: reason || "Skipped in Demo Mode",
  };

  state.scheduledDoses[doseIndex] = updatedDose;
  saveDemoState(state);
  return updatedDose;
}

export function recordDemoVital(
  elderlyProfileId: string,
  bloodGlucose?: number | null,
  systolic?: number | null,
  diastolic?: number | null,
  notes?: string
): DemoVitalReading {
  const state = getDemoState();
  const effectiveNow = getEffectiveNow(state);
  const patient = state.patients.find((p) => p.id === elderlyProfileId);
  const patientName = patient ? patient.name : "Patient";
  const author = state.caretakers.find((c) => c.user.id === state.activeCaretakerId)?.user.name || "Sister Anjali Nair, RN";

  const sugarEval = evaluateBloodSugar(bloodGlucose);
  const bpEval = evaluateBloodPressure(systolic, diastolic);

  const newReading: DemoVitalReading = {
    id: `vital-${effectiveNow}-${Math.random().toString(36).substring(2, 6)}`,
    elderlyProfileId,
    bloodGlucose: bloodGlucose ?? null,
    bloodPressureSystolic: systolic ?? null,
    bloodPressureDiastolic: diastolic ?? null,
    bloodPressure: systolic && diastolic ? `${systolic}/${diastolic}` : null,
    notes: notes || null,
    recordedAt: new Date(effectiveNow).toISOString(),
    authorName: author,
    sugarSeverity: sugarEval.severity,
    bpSeverity: bpEval.severity,
  };

  // Prepend to vitals
  state.vitals.unshift(newReading);

  // If abnormal, generate simulated warning/critical notifications
  if (sugarEval.isAbnormal || bpEval.isAbnormal) {
    const highestSeverity =
      sugarEval.severity === "CRITICAL" || bpEval.severity === "CRITICAL"
        ? "CRITICAL"
        : "WARNING";

    const title = `${highestSeverity === "CRITICAL" ? "🚨 Critical" : "⚠️ Warning"}: Abnormal Vitals for ${patientName} (${patient?.patientCode || ""})`;
    const descParts: string[] = [];
    if (sugarEval.message) descParts.push(sugarEval.message);
    if (bpEval.message) descParts.push(bpEval.message);

    const message = descParts.join(". ") || `Abnormal reading recorded by ${author}.`;

    state.notifications.unshift({
      id: `notif-${effectiveNow}-caretaker`,
      userId: state.activeCaretakerId,
      type: "ESCALATION_WARNING",
      title,
      message,
      isRead: false,
      createdAt: new Date(effectiveNow).toISOString(),
    });

    // Also notify Family Admin if family managed
    if (patient?.isFamilyManaged) {
      state.notifications.unshift({
        id: `notif-${effectiveNow}-family`,
        userId: state.familyUser.id,
        type: "ESCALATION_WARNING",
        title,
        message,
        isRead: false,
        createdAt: new Date(effectiveNow).toISOString(),
      });
    }
  }

  saveDemoState(state);
  return newReading;
}

// ------------------------------------------
// Stock Updater (Senior & Caretaker sync)
// ------------------------------------------
export function updateMedicationStock(
  medicationId: string,
  stockCount: number,
  updatedBy: "patient" | "caretaker" = "patient"
): DemoMedication | null {
  const state = getDemoState();
  const med = state.medications.find((m) => m.id === medicationId);
  if (!med) return null;

  const effectiveNow = getEffectiveNow(state);
  const validCount = Math.max(0, Math.min(999, Math.floor(stockCount)));
  med.stockCount = validCount;
  med.stockUpdatedAt = new Date(effectiveNow).toISOString();
  med.stockUpdatedBy = updatedBy;

  saveDemoState(state);
  return med;
}

// ------------------------------------------
// Requirement 1: Caretaker Publish Prescription
// ------------------------------------------
export function publishPrescription(
  patientId: string,
  medData: {
    name: string;
    strengthNumber: number;
    strengthUnit: "mg" | "mcg" | "ml";
    form: "tablet" | "capsule" | "syrup" | "drops";
    times: string[];
    durationDays: number;
    reason: string;
  }
): DemoMedication {
  if (!medData.name?.trim()) throw new Error("Medicine name is required");
  if (!medData.strengthNumber || medData.strengthNumber <= 0) throw new Error("Valid strength number is required");
  if (!medData.strengthUnit) throw new Error("Strength unit is required");
  if (!medData.form) throw new Error("Medication form is required");
  if (!medData.reason?.trim()) throw new Error("Clinical reason is required");
  if (!medData.times || medData.times.length === 0) throw new Error("At least one daily schedule time is required");

  const state = getDemoState();
  const effectiveNow = getEffectiveNow(state);
  const activeCaretaker =
    state.caretakers.find((c) => c.user.id === state.activeCaretakerId) || state.caretakers[0];
  const patient = state.patients.find((p) => p.id === patientId);

  const dosageStr = `${medData.strengthNumber} ${medData.strengthUnit}`;
  const duration = Math.max(1, Math.min(365, medData.durationDays || 30));
  const calculatedStock = duration * medData.times.length;

  const newMed: DemoMedication = {
    id: `med-${effectiveNow}`,
    elderlyProfileId: patientId,
    name: medData.name.trim(),
    dosage: dosageStr,
    frequency: medData.times.length === 1 ? "ONCE_DAILY" : medData.times.length === 2 ? "TWICE_DAILY" : "THREE_TIMES_DAILY",
    instructions: `Take ${dosageStr} (${medData.form}) daily for ${duration} days. Reason: ${medData.reason.trim()}`,
    times: medData.times,
    assignedById: activeCaretaker.user.id,
    assignedByName: activeCaretaker.user.name,
    assignedAt: new Date(effectiveNow).toISOString(),
    strengthNumber: medData.strengthNumber,
    strengthUnit: medData.strengthUnit,
    form: medData.form,
    durationDays: duration,
    reason: medData.reason.trim(),
    stockCount: calculatedStock,
    stockUpdatedAt: new Date(effectiveNow).toISOString(),
    stockUpdatedBy: "caretaker",
  };

  state.medications.unshift(newMed);

  // Generate today's scheduled doses for the new medication
  const today = new Date(effectiveNow);
  medData.times.forEach((t, i) => {
    const [hh, mm] = t.split(":").map(Number);
    const doseDate = new Date(today);
    doseDate.setHours(hh || 9, mm || 0, 0, 0);

    state.scheduledDoses.push({
      id: `dose-${newMed.id}-${i}-${effectiveNow}`,
      medicationId: newMed.id,
      elderlyProfileId: patientId,
      scheduledAt: doseDate.toISOString(),
      status: "PENDING",
      medication: {
        id: newMed.id,
        name: newMed.name,
        dosage: newMed.dosage,
        instructions: newMed.instructions,
        form: newMed.form,
        reason: newMed.reason,
      },
    });
  });

  // Mark unread for family admin
  if (!state.unreadFamilyTabs) state.unreadFamilyTabs = {};
  if (!state.unreadFamilyTabs[patientId]) state.unreadFamilyTabs[patientId] = {};
  state.unreadFamilyTabs[patientId].medications = true;

  // Add notification for family admin
  if (patient?.isFamilyManaged) {
    state.notifications.unshift({
      id: `notif-presc-${effectiveNow}`,
      userId: state.familyUser.id,
      type: "SYSTEM",
      title: "New Prescription Added",
      message: `${activeCaretaker.user.name} prescribed ${newMed.name} (${dosageStr}) for ${patient.name} (${patient.patientCode}).`,
      isRead: false,
      createdAt: new Date(effectiveNow).toISOString(),
    });
  }

  saveDemoState(state);
  return newMed;
}

// ------------------------------------------
// Requirement 3: Caretaker Care Note = Health Condition Update
// ------------------------------------------
export function publishCareNote(
  patientId: string,
  noteData: {
    overallCondition: DemoHealthCondition;
    observations: string;
    quickFields?: {
      appetite?: "Good" | "Fair" | "Poor";
      mood?: "Cheerful" | "Calm" | "Anxious" | "Depressed";
      sleepQuality?: "Restful" | "Interrupted" | "Insomnia";
      painLevel?: number;
      mobility?: "Independent" | "Assisted" | "Bedbound";
    };
  }
): DemoCareNote {
  if (!noteData.observations?.trim()) throw new Error("Observations text is required");
  if (!noteData.overallCondition) throw new Error("Overall health condition is required");

  const state = getDemoState();
  const effectiveNow = getEffectiveNow(state);
  const activeCaretaker =
    state.caretakers.find((c) => c.user.id === state.activeCaretakerId) || state.caretakers[0];
  const patient = state.patients.find((p) => p.id === patientId);

  // Update latestCondition on the patient
  if (patient) {
    patient.latestCondition = noteData.overallCondition;
  }

  const newNote: DemoCareNote = {
    id: `note-${effectiveNow}`,
    elderlyProfileId: patientId,
    category: "HEALTH_UPDATE",
    title: `Condition Update: ${noteData.overallCondition}`,
    content: noteData.observations.trim(),
    authorName: activeCaretaker.user.name,
    authorRole: activeCaretaker.profile.qualification || "Licensed Nurse (RN)",
    isPinned: false,
    createdAt: new Date(effectiveNow).toISOString(),
    overallCondition: noteData.overallCondition,
    observations: noteData.observations.trim(),
    quickFields: noteData.quickFields,
  };

  state.notes.unshift(newNote);

  // Mark unread for family admin
  if (!state.unreadFamilyTabs) state.unreadFamilyTabs = {};
  if (!state.unreadFamilyTabs[patientId]) state.unreadFamilyTabs[patientId] = {};
  state.unreadFamilyTabs[patientId].notes = true;

  // Add notification for family admin
  if (patient?.isFamilyManaged) {
    state.notifications.unshift({
      id: `notif-note-${effectiveNow}`,
      userId: state.familyUser.id,
      type: "SYSTEM",
      title: `Condition Update: ${patient.name}`,
      message: `${activeCaretaker.user.name} logged health condition "${noteData.overallCondition}" for ${patient.name} (${patient.patientCode}).`,
      isRead: false,
      createdAt: new Date(effectiveNow).toISOString(),
    });
  }

  saveDemoState(state);
  return newNote;
}

// ------------------------------------------
// Requirement 2: Caretaker Daily Tasks
// ------------------------------------------
export function createDailyTask(
  patientId: string,
  taskData: {
    taskType: DemoTaskType;
    title: string;
    description?: string;
    startDate?: string;
    durationDays?: number | "everyday";
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    details?: any;
  }
): DemoCareTask {
  if (!taskData.title?.trim()) throw new Error("Task title is required");

  const state = getDemoState();
  const effectiveNow = getEffectiveNow(state);
  const activeCaretaker =
    state.caretakers.find((c) => c.user.id === state.activeCaretakerId) || state.caretakers[0];
  const patient = state.patients.find((p) => p.id === patientId);

  const newTask: DemoCareTask = {
    id: `task-${effectiveNow}`,
    elderlyProfileId: patientId,
    taskType: taskData.taskType,
    title: taskData.title.trim(),
    description: taskData.description?.trim() || "",
    dueDate: taskData.startDate || new Date(effectiveNow).toISOString().split("T")[0],
    priority: taskData.priority || "MEDIUM",
    isCompleted: false,
    assignedById: activeCaretaker.user.id,
    assignedToName: activeCaretaker.user.name,
    assignedAt: new Date(effectiveNow).toISOString(),
    details: {
      ...taskData.details,
      startDate: taskData.startDate || new Date(effectiveNow).toISOString().split("T")[0],
      durationDays: taskData.durationDays || "everyday",
    },
  };

  state.tasks.unshift(newTask);

  // Mark unread for family admin
  if (!state.unreadFamilyTabs) state.unreadFamilyTabs = {};
  if (!state.unreadFamilyTabs[patientId]) state.unreadFamilyTabs[patientId] = {};
  state.unreadFamilyTabs[patientId].tasks = true;

  if (patient?.isFamilyManaged) {
    state.notifications.unshift({
      id: `notif-task-${effectiveNow}`,
      userId: state.familyUser.id,
      type: "SYSTEM",
      title: "Daily Care Task Assigned",
      message: `${activeCaretaker.user.name} assigned "${newTask.title}" for ${patient.name} (${patient.patientCode}).`,
      isRead: false,
      createdAt: new Date(effectiveNow).toISOString(),
    });
  }

  saveDemoState(state);
  return newTask;
}

// ------------------------------------------
// Backward-compatible wrappers
// ------------------------------------------
export function createDemoTask(
  elderlyProfileId: string,
  title: string,
  description?: string,
  dueDate?: string,
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
): DemoCareTask {
  return createDailyTask(elderlyProfileId, {
    taskType: "custom",
    title,
    description,
    startDate: dueDate,
    priority,
  });
}

export function assignDemoMedication(
  elderlyProfileId: string,
  data: {
    name: string;
    dosage: string;
    frequency?: string;
    instructions?: string;
    times: string[];
  }
): DemoMedication {
  const state = getDemoState();
  const effectiveNow = getEffectiveNow(state);
  const activeCaretaker =
    state.caretakers.find((c) => c.user.id === state.activeCaretakerId) || state.caretakers[0];

  const newMed: DemoMedication = {
    id: `med-${effectiveNow}`,
    elderlyProfileId,
    name: data.name,
    dosage: data.dosage,
    frequency: data.frequency || "DAILY",
    instructions: data.instructions || "Take with water",
    times: data.times && data.times.length > 0 ? data.times : ["09:00"],
    assignedById: activeCaretaker.user.id,
    assignedByName: activeCaretaker.user.name,
    assignedAt: new Date(effectiveNow).toISOString(),
    stockCount: 30,
    stockUpdatedAt: new Date(effectiveNow).toISOString(),
    stockUpdatedBy: "caretaker",
  };

  state.medications.unshift(newMed);

  const today = new Date(effectiveNow);
  newMed.times.forEach((t, i) => {
    const [hh, mm] = t.split(":").map(Number);
    const doseDate = new Date(today);
    doseDate.setHours(hh || 9, mm || 0, 0, 0);

    state.scheduledDoses.push({
      id: `dose-${newMed.id}-${i}-${effectiveNow}`,
      medicationId: newMed.id,
      elderlyProfileId,
      scheduledAt: doseDate.toISOString(),
      status: "PENDING",
      medication: {
        id: newMed.id,
        name: newMed.name,
        dosage: newMed.dosage,
        instructions: newMed.instructions,
      },
    });
  });

  saveDemoState(state);
  return newMed;
}

export function prescribeMedicationWithCareNote(
  patientId: string,
  noteData: {
    title: string;
    content: string;
    category?: "HEALTH_UPDATE" | "DAILY_OBSERVATION" | "INCIDENT" | "GENERAL";
  },
  medData?: {
    name: string;
    strengthNumber: number;
    strengthUnit: "mg" | "mcg" | "ml";
    form: "tablet" | "capsule" | "syrup" | "drops";
    times: string[];
    durationDays: number;
    reason: string;
  }
): { note: DemoCareNote; medication?: DemoMedication } {
  const note = publishCareNote(patientId, {
    overallCondition: "Stable",
    observations: `${noteData.title ? noteData.title + ": " : ""}${noteData.content}`,
  });
  let medication: DemoMedication | undefined;
  if (medData && medData.name.trim()) {
    medication = publishPrescription(patientId, medData);
  }
  return { note, medication };
}

export function completeTaskBySenior(
  taskId: string,
  targetDateStr?: string
): { success: boolean; error?: string; task?: DemoCareTask } {
  const state = getDemoState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return { success: false, error: "Task not found" };

  const effectiveNow = getEffectiveNow(state);
  const todayStr = new Date(effectiveNow).toISOString().split("T")[0];

  // The senior can only complete today's instance
  if (targetDateStr && targetDateStr !== todayStr) {
    return { success: false, error: "Senior patient can only complete today's task" };
  }

  const patient = state.patients.find((p) => p.id === task.elderlyProfileId);
  const patientName = patient?.name || "Senior Patient";
  const patientId = patient?.id || "patient";
  const completionIso = new Date(effectiveNow).toISOString();

  if (!task.completionsByDate) {
    task.completionsByDate = {};
  }

  task.completionsByDate[todayStr] = {
    completed: true,
    completedAt: completionIso,
    completedByName: patientName,
    completedById: patientId,
  };

  task.isCompleted = true;
  task.completedAt = completionIso;
  task.completedByName = patientName;
  task.completedById = patientId;

  // Immediately add notification entry "<patient> completed <task>" for the caretaker and the family administrator
  const notifMessage = `${patientName} completed ${task.title}`;

  if (patient?.caretakerId) {
    state.notifications.unshift({
      id: `notif-task-c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: patient.caretakerId,
      type: "SYSTEM",
      title: "Task Completed",
      message: notifMessage,
      isRead: false,
      createdAt: completionIso,
    });
  }

  const familyAdminId = patient?.familyAdminId || state.familyUser?.id;
  if (familyAdminId) {
    state.notifications.unshift({
      id: `notif-task-f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: familyAdminId,
      type: "SYSTEM",
      title: "Task Completed",
      message: notifMessage,
      isRead: false,
      createdAt: completionIso,
    });
  }

  saveDemoState(state);
  return { success: true, task };
}

export function getTaskStatusForDay(
  task: DemoCareTask,
  dateStr: string,
  effectiveTodayStr: string
): {
  status: "COMPLETED" | "PENDING" | "NOT_COMPLETED";
  label: string;
  completedAt?: string | null;
  completedByName?: string | null;
} {
  const comp = task.completionsByDate?.[dateStr];
  const legacyComp =
    dateStr === effectiveTodayStr && task.isCompleted && task.completedAt
      ? {
          completed: true,
          completedAt: task.completedAt,
          completedByName: task.completedByName || "patient",
        }
      : comp;

  const details = task.details;
  const startDate = details?.startDate || (task.assignedAt ? task.assignedAt.slice(0, 10) : undefined);
  const duration = typeof details?.durationDays === "number" ? details.durationDays : undefined;

  return deriveTaskStatusForDay(
    {
      startDate,
      endDate: duration ? undefined : null,
      untilStopped: !duration,
    },
    dateStr,
    effectiveTodayStr,
    legacyComp
  );
}

export function toggleTaskCompletion(taskId: string, isCompleted?: boolean): DemoCareTask | null {
  const state = getDemoState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const target = isCompleted !== undefined ? isCompleted : !task.isCompleted;
  if (target) {
    const res = completeTaskBySenior(taskId);
    return res.task || task;
  } else {
    const effectiveNow = getEffectiveNow(state);
    const todayStr = new Date(effectiveNow).toISOString().split("T")[0];
    task.isCompleted = false;
    task.completedAt = null;
    task.completedByName = null;
    task.completedById = null;
    if (task.completionsByDate && task.completionsByDate[todayStr]) {
      delete task.completionsByDate[todayStr];
    }
    saveDemoState(state);
    return task;
  }
}

export function markFamilyTabRead(patientId: string, tab: "tasks" | "medications" | "notes"): void {
  const state = getDemoState();
  if (state.unreadFamilyTabs && state.unreadFamilyTabs[patientId]) {
    state.unreadFamilyTabs[patientId][tab] = false;
    saveDemoState(state);
  }
}

export function markDemoNotificationRead(notifId: string): void {
  const state = getDemoState();
  const notif = state.notifications.find((n) => n.id === notifId);
  if (notif) {
    notif.isRead = true;
    saveDemoState(state);
  }
}

// ==========================================
// SIMULATED SCHEDULER & MISSED DOSE NOTIFICATION (Requirement 6)
// ==========================================

export function checkMissedDoses(state: DemoState): { missedCount: number; newNotifCount: number } {
  const effectiveNow = getEffectiveNow(state);
  const graceWindowMs = DOSE_GRACE_MINUTES * 60 * 1000;
  let missedCount = 0;
  let notifCount = 0;

  state.scheduledDoses.forEach((dose) => {
    if (dose.status === "PENDING") {
      const scheduledTime = new Date(dose.scheduledAt).getTime();
      if (effectiveNow - scheduledTime > graceWindowMs) {
        dose.status = "MISSED";
        missedCount++;

        if (!dose.missedNotified) {
          dose.missedNotified = true;
          const patient = state.patients.find((p) => p.id === dose.elderlyProfileId);
          const pName = patient ? patient.name : "Patient";
          const pCode = patient?.patientCode ? ` (${patient.patientCode})` : "";
          const schedTimeStr = new Date(dose.scheduledAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

          // Format specified in prompt: "<patient name> (PT-xxxx) has not taken <medicine> scheduled at <time>."
          const alertMessage = `${pName}${pCode} has not taken ${dose.medication.name} scheduled at ${schedTimeStr}.`;

          // 1. Notify Caretaker
          const caretakerId = patient?.caretakerId || state.activeCaretakerId;
          state.notifications.unshift({
            id: `missed-dose-${dose.id}-caretaker-${effectiveNow}`,
            userId: caretakerId,
            type: "MISSED_DOSE",
            title: `🚨 Missed Dose: ${dose.medication.name}`,
            message: alertMessage,
            isRead: false,
            createdAt: new Date(effectiveNow).toISOString(),
          });
          notifCount++;

          // 2. Notify Family Administrator
          const familyAdminId = patient?.familyAdminId || state.familyUser.id;
          state.notifications.unshift({
            id: `missed-dose-${dose.id}-family-${effectiveNow}`,
            userId: familyAdminId,
            type: "MISSED_DOSE",
            title: `🚨 Missed Dose Alert: ${dose.medication.name}`,
            message: alertMessage,
            isRead: false,
            createdAt: new Date(effectiveNow).toISOString(),
          });
          notifCount++;
        }
      }
    }
  });

  return { missedCount, newNotifCount: notifCount };
}

export function runSimulatedScheduler(): {
  missedDosesCount: number;
  newNotificationsCount: number;
} {
  const state = getDemoState();
  const effectiveNow = getEffectiveNow(state);
  const { missedCount, newNotifCount } = checkMissedDoses(state);
  let notifCount = newNotifCount;

  // Check for patients with 0 medications and 0 tasks (forgot to assign check)
  state.patients.forEach((patient) => {
    const medCount = state.medications.filter((m) => m.elderlyProfileId === patient.id).length;
    const taskCount = state.tasks.filter((t) => t.elderlyProfileId === patient.id).length;

    if (medCount === 0 && taskCount === 0) {
      const alreadyNotified = state.notifications.some(
        (n) => n.type === "CARE_PLAN_MISSING" && n.message.includes(patient.name)
      );
      if (!alreadyNotified) {
        state.notifications.unshift({
          id: `forgot-assign-${patient.id}-${effectiveNow}`,
          userId: state.activeCaretakerId,
          type: "CARE_PLAN_MISSING",
          title: "⚠️ Unassigned Care Plan",
          message: `${patient.name} has no medications or care tasks assigned today.`,
          isRead: false,
          createdAt: new Date(effectiveNow).toISOString(),
        });
        notifCount++;
      }
    }
  });

  if (missedCount > 0 || notifCount > 0) {
    saveDemoState(state);
  }

  return { missedDosesCount: missedCount, newNotificationsCount: notifCount };
}

// ==========================================
// CARETAKER CAPACITY & REQUEST LIFECYCLE
// ==========================================

export function getCaretakerPatientCount(state: DemoState, caretakerId: string): number {
  return state.patients.filter(
    (p) => p.caretakerId === caretakerId && p.approvalStatus === "APPROVED"
  ).length;
}

export function getDemoCaretakersList() {
  const state = getDemoState();
  const list = state.caretakers.map((c) => {
    const assignedCount = getCaretakerPatientCount(state, c.user.id);
    const isFull = assignedCount >= 5;
    const freeSlots = Math.max(0, 5 - assignedCount);
    return {
      user: c.user,
      profile: c.profile,
      assignedCount,
      isFull,
      freeSlots,
    };
  });

  // Sort so free caretakers appear first, full ones appear last
  return list.sort((a, b) => {
    if (a.isFull && !b.isFull) return 1;
    if (!a.isFull && b.isFull) return -1;
    return b.freeSlots - a.freeSlots;
  });
}

/**
 * Creates a new senior patient with sequential ID (e.g. PT-0007)
 * and sends an approval request to the chosen caretaker.
 */
export function createSeniorPatientWithRequest(
  patientData: {
    name: string;
    preferredName?: string;
    dateOfBirth: string;
    gender?: string;
    bloodGroup?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    medicalConditions?: string[];
    allergies?: string[];
    notes?: string;
  },
  caretakerId: string
): { patient: DemoPatient; request: DemoCaretakerRequest } {
  const state = getDemoState();
  const caretakerItem = state.caretakers.find((c) => c.user.id === caretakerId);
  if (!caretakerItem) {
    throw new Error("Chosen caretaker not found");
  }

  // 1. Sequential Patient ID: PT-0001, PT-0002... never reused
  const patientCode = `PT-${String(state.nextPatientNumber).padStart(4, "0")}`;
  state.nextPatientNumber += 1;

  const newPatientId = `patient-${Date.now()}`;
  const newPatient: DemoPatient = {
    id: newPatientId,
    patientCode,
    name: patientData.name.trim(),
    preferredName: patientData.preferredName?.trim() || patientData.name.trim().split(" ")[0],
    dateOfBirth: patientData.dateOfBirth,
    gender: patientData.gender || "Not specified",
    bloodGroup: patientData.bloodGroup || "O+",
    emergencyContactName: patientData.emergencyContactName || "Family Coordinator",
    emergencyContactPhone: patientData.emergencyContactPhone || "+00 0000000000",
    medicalConditions: patientData.medicalConditions || [],
    allergies: patientData.allergies || [],
    notes: patientData.notes || undefined,
    isFamilyManaged: true,
    caretakerId: caretakerItem.user.id,
    caretakerName: caretakerItem.user.name,
    approvalStatus: "PENDING_APPROVAL",
    declinedCaretakerIds: [],
  };

  state.patients.push(newPatient);

  // Calculate age for the request summary
  const dob = new Date(patientData.dateOfBirth);
  const age = Math.abs(new Date(Date.now() - dob.getTime()).getUTCFullYear() - 1970) || 70;

  // 2. Create Caretaker Request
  const newRequest: DemoCaretakerRequest = {
    id: `req-${Date.now()}`,
    patientId: newPatient.id,
    patientCode: newPatient.patientCode,
    patientName: newPatient.name,
    patientAge: age,
    familyAdminId: state.familyUser.id,
    familyAdminName: state.familyUser.name,
    caretakerId: caretakerItem.user.id,
    caretakerName: caretakerItem.user.name,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  state.caretakerRequests.unshift(newRequest);

  // 3. Notify chosen caretaker
  state.notifications.unshift({
    id: `notif-req-${Date.now()}`,
    userId: caretakerItem.user.id,
    type: "CARETAKER_REQUEST",
    title: "New Patient Care Request",
    message: `${state.familyUser.name} added you as the caretaker for ${newPatient.name} (${newPatient.patientCode}), age ${age}. Are you willing to accept?`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  saveDemoState(state);
  return { patient: newPatient, request: newRequest };
}

/**
 * Caretaker responds to a request (Accept / Reject)
 * Enforces maximum 5 patients per caretaker limit at accept time.
 */
export function respondToCaretakerRequest(
  requestId: string,
  action: "ACCEPTED" | "REJECTED"
): { success: boolean; error?: string } {
  const state = getDemoState();
  const request = state.caretakerRequests.find((r) => r.id === requestId);
  if (!request) return { success: false, error: "Request not found" };

  const patient = state.patients.find((p) => p.id === request.patientId);
  if (!patient) return { success: false, error: "Patient not found" };

  if (action === "ACCEPTED") {
    // Enforce 5 patient limit at accept time
    const currentCount = getCaretakerPatientCount(state, request.caretakerId);
    if (currentCount >= 5) {
      return {
        success: false,
        error: "Cannot accept: You have reached the maximum limit of 5 accepted patients.",
      };
    }

    request.status = "ACCEPTED";
    request.respondedAt = new Date().toISOString();

    patient.approvalStatus = "APPROVED";
    patient.caretakerId = request.caretakerId;
    patient.caretakerName = request.caretakerName;

    // Notify Family Administrator
    state.notifications.unshift({
      id: `notif-accepted-${Date.now()}`,
      userId: state.familyUser.id,
      type: "SYSTEM",
      title: "Caretaker Request Accepted",
      message: `${request.caretakerName} accepted the care request for ${patient.name} (${patient.patientCode}). Full health monitoring is now active.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  } else {
    // REJECTED
    request.status = "REJECTED";
    request.respondedAt = new Date().toISOString();

    patient.approvalStatus = "NO_CARETAKER";
    patient.caretakerId = null;
    patient.caretakerName = null;
    if (!patient.declinedCaretakerIds) patient.declinedCaretakerIds = [];
    if (!patient.declinedCaretakerIds.includes(request.caretakerId)) {
      patient.declinedCaretakerIds.push(request.caretakerId);
    }

    // Notify Family Administrator
    state.notifications.unshift({
      id: `notif-declined-${Date.now()}`,
      userId: state.familyUser.id,
      type: "SYSTEM",
      title: "Caretaker Request Declined",
      message: `${request.caretakerName} declined the care request for ${patient.name} (${patient.patientCode}). Please assign another available caretaker.`,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }

  saveDemoState(state);
  return { success: true };
}

/**
 * Family Admin cancels a pending caretaker request
 */
export function cancelCaretakerRequest(requestId: string): { success: boolean } {
  const state = getDemoState();
  const request = state.caretakerRequests.find((r) => r.id === requestId);
  if (!request) return { success: false };

  request.status = "CANCELLED";
  request.respondedAt = new Date().toISOString();

  const patient = state.patients.find((p) => p.id === request.patientId);
  if (patient) {
    patient.approvalStatus = "NO_CARETAKER";
    patient.caretakerId = null;
    patient.caretakerName = null;
  }

  saveDemoState(state);
  return { success: true };
}

/**
 * Family Admin reassigns a patient to another caretaker after rejection/cancellation
 */
export function reassignCaretaker(
  patientId: string,
  newCaretakerId: string
): { success: boolean; error?: string } {
  const state = getDemoState();
  const patient = state.patients.find((p) => p.id === patientId);
  if (!patient) return { success: false, error: "Patient not found" };

  if (patient.declinedCaretakerIds?.includes(newCaretakerId)) {
    return { success: false, error: "This caretaker previously declined this patient and cannot be re-selected." };
  }

  const caretakerItem = state.caretakers.find((c) => c.user.id === newCaretakerId);
  if (!caretakerItem) return { success: false, error: "Caretaker not found" };

  if (getCaretakerPatientCount(state, newCaretakerId) >= 5) {
    return { success: false, error: "Selected caretaker is fully booked (5/5)." };
  }

  patient.caretakerId = caretakerItem.user.id;
  patient.caretakerName = caretakerItem.user.name;
  patient.approvalStatus = "PENDING_APPROVAL";

  const dob = new Date(patient.dateOfBirth);
  const age = Math.abs(new Date(Date.now() - dob.getTime()).getUTCFullYear() - 1970) || 70;

  const newRequest: DemoCaretakerRequest = {
    id: `req-${Date.now()}`,
    patientId: patient.id,
    patientCode: patient.patientCode,
    patientName: patient.name,
    patientAge: age,
    familyAdminId: state.familyUser.id,
    familyAdminName: state.familyUser.name,
    caretakerId: caretakerItem.user.id,
    caretakerName: caretakerItem.user.name,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  state.caretakerRequests.unshift(newRequest);

  state.notifications.unshift({
    id: `notif-req-${Date.now()}`,
    userId: caretakerItem.user.id,
    type: "CARETAKER_REQUEST",
    title: "New Patient Care Request",
    message: `${state.familyUser.name} added you as the caretaker for ${patient.name} (${patient.patientCode}), age ${age}. Are you willing to accept?`,
    isRead: false,
    createdAt: new Date().toISOString(),
  });

  saveDemoState(state);
  return { success: true };
}

// ==========================================
// TIME AGO FORMATTER
// ==========================================
export function formatTimeAgo(isoString?: string): string {
  if (!isoString) return "just now";
  const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

// ==========================================
// TODAY'S DOSES FORMATTER (Requirement 5)
// ==========================================
export function formatTodayDoses(doses: DemoScheduledDose[], effectiveNow: number) {
  return doses.map((d) => {
    const schedDate = new Date(d.scheduledAt);
    const schedTimeStr = schedDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    let statusType: "TAKEN" | "SKIPPED" | "MISSED" | "OVERDUE" | "PENDING" = "PENDING";
    let statusLabel = "Pending";
    let chipClass = "bg-slate-100 text-slate-700 border-slate-300";

    if (d.status === "TAKEN") {
      statusType = "TAKEN";
      const takenTime = d.confirmedAt
        ? new Date(d.confirmedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : schedTimeStr;
      statusLabel = `Taken at ${takenTime} by ${d.takenBy || "patient"}`;
      chipClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
    } else if (d.status === "SKIPPED") {
      statusType = "SKIPPED";
      statusLabel = d.skippedReason ? `Skipped: ${d.skippedReason}` : "Skipped";
      chipClass = "bg-amber-100 text-amber-800 border-amber-300";
    } else if (d.status === "MISSED") {
      statusType = "MISSED";
      statusLabel = "Missed";
      chipClass = "bg-rose-100 text-rose-800 border-rose-300";
    } else {
      const diffMs = effectiveNow - schedDate.getTime();
      if (diffMs > 15 * 60 * 1000) {
        statusType = "MISSED";
        statusLabel = "Missed";
        chipClass = "bg-rose-100 text-rose-800 border-rose-300";
      } else if (diffMs > 0) {
        statusType = "OVERDUE";
        statusLabel = "Overdue";
        chipClass = "bg-amber-100 text-amber-800 border-amber-300";
      } else {
        statusType = "PENDING";
        statusLabel = "Pending";
        chipClass = "bg-slate-100 text-slate-700 border-slate-300";
      }
    }

    return {
      id: d.id,
      medicationName: d.medication.name,
      dosage: d.medication.dosage,
      form: d.medication.form || "tablet",
      scheduledAt: d.scheduledAt,
      scheduledTime: schedTimeStr,
      status: statusType,
      statusLabel,
      chipClass,
      confirmedAt: d.confirmedAt,
      skippedReason: d.skippedReason,
      takenBy: d.takenBy,
    };
  });
}

// ==========================================
// PROPS FORMATTERS FOR DASHBOARDS
// ==========================================

export function getDemoCaretakerProps(selectedPatientId?: string) {
  const state = getDemoState();
  const effectiveNow = getEffectiveNow(state);
  const todayStr = new Date(effectiveNow).toISOString().split("T")[0];
  const activeCaretaker =
    state.caretakers.find((c) => c.user.id === state.activeCaretakerId) || state.caretakers[0];

  // Assigned and approved patients for this active caretaker
  const activePatients = state.patients.filter(
    (p) => p.caretakerId === activeCaretaker.user.id && p.approvalStatus === "APPROVED"
  );

  const initialPatientId =
    (selectedPatientId && activePatients.some((p) => p.id === selectedPatientId) ? selectedPatientId : null) ||
    activePatients[0]?.id ||
    "";

  const totalPatientsCount = getCaretakerPatientCount(state, activeCaretaker.user.id);

  const historyDays: string[] = [];
  for (let i = 0; i <= 7; i++) {
    const d = new Date(effectiveNow);
    d.setDate(d.getDate() - i);
    historyDays.push(d.toISOString().split("T")[0]);
  }

  // Preload clinical summaries for each assigned patient
  const profilesWithSummaries = activePatients.map((p) => {
    const patientVitals = state.vitals.filter((v) => v.elderlyProfileId === p.id);
    const latestVital = patientVitals[0] || null;

    const patientDoses = state.scheduledDoses.filter((d) => d.elderlyProfileId === p.id);
    const takenDoses = patientDoses.filter((d) => d.status === "TAKEN").length;
    const totalDoses = patientDoses.length;

    const missedDoses = patientDoses.filter((d) => d.status === "MISSED").length;
    const criticalVitals = patientVitals.filter(
      (v) => v.sugarSeverity === "CRITICAL" || v.bpSeverity === "CRITICAL"
    ).length;

    const alertBadges: string[] = [];
    if (missedDoses > 0) alertBadges.push(`${missedDoses} Missed Dose`);
    if (criticalVitals > 0) alertBadges.push("Critical Vitals");

    const patientTasks = state.tasks.filter((t) => t.elderlyProfileId === p.id);
    const formattedTasks = patientTasks.map((t) => {
      const todayStatus = getTaskStatusForDay(t, todayStr, todayStr);
      return {
        ...t,
        isCompleted: todayStatus.status === "COMPLETED",
        completedAt: todayStatus.completedAt || t.completedAt,
        completedByName: todayStatus.completedByName || t.completedByName,
        todayStatusLabel: todayStatus.label,
        history: historyDays.map((dStr) => {
          const dObj = new Date(dStr + "T00:00:00");
          const dateFormatted = dObj.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
          const st = getTaskStatusForDay(t, dStr, todayStr);
          return {
            date: dStr,
            dateFormatted,
            status: st.status,
            label: st.label,
            completedAt: st.completedAt,
            completedByName: st.completedByName,
          };
        }),
      };
    });

    return {
      id: p.id,
      patientCode: p.patientCode,
      name: p.name,
      preferredName: p.preferredName,
      dateOfBirth: p.dateOfBirth,
      latestCondition: p.latestCondition || ("Stable" as DemoHealthCondition),
      emergencyContactName: p.emergencyContactName,
      emergencyContactPhone: p.emergencyContactPhone,
      medicalConditions: p.medicalConditions,
      allergies: p.allergies,
      notes: p.notes,
      latestBloodSugar: latestVital?.bloodGlucose ? `${latestVital.bloodGlucose} mg/dL` : null,
      latestBloodPressure: latestVital?.bloodPressure || null,
      sugarSeverity: latestVital?.sugarSeverity || ("NORMAL" as const),
      bpSeverity: latestVital?.bpSeverity || ("NORMAL" as const),
      doseProgress: { taken: takenDoses, total: totalDoses },
      todayDoses: formatTodayDoses(patientDoses, effectiveNow),
      alertBadges,
      vitals: patientVitals,
      medications: state.medications.filter((m) => m.elderlyProfileId === p.id),
      tasks: formattedTasks,
      notesList: state.notes.filter((n) => n.elderlyProfileId === p.id),
    };
  });

  // Pending requests for this caretaker
  const pendingRequests = state.caretakerRequests.filter(
    (r) => r.caretakerId === activeCaretaker.user.id && r.status === "PENDING"
  );

  return {
    caretakerName: activeCaretaker.user.name,
    caretakerProfile: activeCaretaker.profile,
    activeCaretakerId: activeCaretaker.user.id,
    patientsCapacityText: `Patients: ${totalPatientsCount} / 5`,
    patientsCount: totalPatientsCount,
    isFullyBooked: totalPatientsCount >= 5,
    initialSelectedPatientId: initialPatientId,
    initialTasks: state.tasks,
    initialNotes: state.notes,
    initialSection: "patients" as const,
    profiles: profilesWithSummaries,
    pendingRequests,
    simulationActive: state.simulationActive,
    notifications: state.notifications.filter((n) => n.userId === activeCaretaker.user.id),
  };
}

export function getDemoFamilyProps(selectedProfileId?: string) {
  const state = getDemoState();
  const effectiveNow = getEffectiveNow(state);
  const todayStr = new Date(effectiveNow).toISOString().split("T")[0];

  const activeAdminId = state.activeFamilyAdminId || state.familyAdmins?.[0]?.id || state.familyUser.id;
  const activeAdmin = state.familyAdmins?.find((a) => a.id === activeAdminId) || state.familyUser;

  const managedSeniors = state.patients.filter(
    (p) => p.familyAdminId === activeAdmin.id || (activeAdmin.id === "demo-family-admin-1" && p.isFamilyManaged)
  );
  const activeProfile =
    (selectedProfileId && state.patients.find((p) => p.id === selectedProfileId)) ||
    managedSeniors[0] ||
    state.patients[0];

  const profileMeds = state.medications.filter((m) => m.elderlyProfileId === activeProfile.id);
  const profileNotes = state.notes.filter((n) => n.elderlyProfileId === activeProfile.id);
  const rawTasks = state.tasks.filter((t) => t.elderlyProfileId === activeProfile.id);
  const profileVitals = state.vitals.filter((v) => v.elderlyProfileId === activeProfile.id);
  const profileDoses = state.scheduledDoses.filter((d) => d.elderlyProfileId === activeProfile.id);

  const historyDays: string[] = [];
  for (let i = 0; i <= 7; i++) {
    const d = new Date(effectiveNow);
    d.setDate(d.getDate() - i);
    historyDays.push(d.toISOString().split("T")[0]);
  }

  const profileTasks = rawTasks.map((t) => {
    const todayStatus = getTaskStatusForDay(t, todayStr, todayStr);
    return {
      ...t,
      isCompleted: todayStatus.status === "COMPLETED",
      completedAt: todayStatus.completedAt || t.completedAt,
      completedByName: todayStatus.completedByName || t.completedByName,
      todayStatusLabel: todayStatus.label,
      history: historyDays.map((dStr) => {
        const dObj = new Date(dStr + "T00:00:00");
        const dateFormatted = dObj.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
        const st = getTaskStatusForDay(t, dStr, todayStr);
        return {
          date: dStr,
          dateFormatted,
          status: st.status,
          label: st.label,
          completedAt: st.completedAt,
          completedByName: st.completedByName,
        };
      }),
    };
  });

  const getAge = (dobStr?: string) => {
    if (!dobStr) return null;
    const dob = new Date(dobStr);
    const diffMs = Date.now() - dob.getTime();
    return Math.abs(new Date(diffMs).getUTCFullYear() - 1970);
  };

  const takenCount = profileDoses.filter((d) => d.status === "TAKEN").length;
  const adherenceRate = profileDoses.length > 0 ? Math.round((takenCount / profileDoses.length) * 100) : 100;

  const activeCaretakerItem = state.caretakers.find((c) => c.user.id === activeProfile.caretakerId) || state.caretakers[0];

  return {
    adminUser: {
      id: activeAdmin.id,
      name: activeAdmin.name,
      email: activeAdmin.email,
    },
    managedSeniors: managedSeniors.map((p) => ({
      id: p.id,
      patientCode: p.patientCode,
      name: p.name,
      preferredName: p.preferredName,
      dateOfBirth: p.dateOfBirth,
      age: getAge(p.dateOfBirth),
      gender: p.gender,
      bloodGroup: p.bloodGroup,
      medicalConditions: p.medicalConditions,
      allergies: p.allergies,
      emergencyContactName: p.emergencyContactName,
      emergencyContactPhone: p.emergencyContactPhone,
      emergencyContactRelation: "Son / Guardian",
      notes: p.notes || null,
      avatarUrl: null,
      approvalStatus: p.approvalStatus || "APPROVED",
      latestCondition: p.latestCondition || ("Stable" as DemoHealthCondition),
      familyAdminId: p.familyAdminId,
      familyAdminName: p.familyAdminName,
      caretakerId: p.caretakerId,
      caretakerName: p.caretakerName,
      declinedCaretakerIds: p.declinedCaretakerIds || [],
      caretaker: {
        id: p.caretakerId || "",
        name: p.caretakerName || "Unassigned",
        email: "caretaker@carenest.invalid",
        phoneNumber: "+00 0000000000",
      },
      medicationsCount: state.medications.filter((m) => m.elderlyProfileId === p.id).length,
      upcomingAppointmentsCount: 1,
    })),
    profile: {
      id: activeProfile.id,
      patientCode: activeProfile.patientCode,
      name: activeProfile.name,
      preferredName: activeProfile.preferredName,
      dateOfBirth: activeProfile.dateOfBirth,
      gender: activeProfile.gender,
      bloodGroup: activeProfile.bloodGroup,
      medicalConditions: activeProfile.medicalConditions,
      allergies: activeProfile.allergies,
      notes: activeProfile.notes || null,
      approvalStatus: activeProfile.approvalStatus || "APPROVED",
      latestCondition: activeProfile.latestCondition || ("Stable" as DemoHealthCondition),
      familyAdminId: activeProfile.familyAdminId,
      familyAdminName: activeProfile.familyAdminName,
      caretakerId: activeProfile.caretakerId,
      caretakerName: activeProfile.caretakerName,
      declinedCaretakerIds: activeProfile.declinedCaretakerIds || [],
      emergencyContactName: activeProfile.emergencyContactName,
      emergencyContactPhone: activeProfile.emergencyContactPhone,
      medications: profileMeds.map((m) => {
        const stockCount = m.stockCount ?? 30;
        const stockLabel = `${stockCount} ${m.form === "syrup" || m.form === "drops" ? "units" : "tablets"} left${
          m.stockUpdatedBy ? `, updated by ${m.stockUpdatedBy} ${formatTimeAgo(m.stockUpdatedAt)}` : ""
        }`;

        return {
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          instructions: m.instructions,
          form: m.form || "tablet",
          durationDays: m.durationDays,
          reason: m.reason,
          schedules: m.times.map((t, idx) => ({ id: `sched-${idx}`, timeOfDay: t, isActive: true })),
          assignedBy: {
            id: m.assignedById,
            name: m.assignedByName,
            role: "CARETAKER",
          },
          assignedAt: m.assignedAt,
          stock: {
            currentStock: stockCount,
            unit: m.form === "syrup" || m.form === "drops" ? "units" : "tablets",
            minimumThreshold: 5,
            stockUpdatedAt: m.stockUpdatedAt,
            stockUpdatedBy: m.stockUpdatedBy,
            displaySummary: stockLabel,
          },
        };
      }),
      careCircles: [
        {
          id: "circle-demo",
          name: `${activeProfile.name}'s Circle of Care`,
          members: [
            {
              id: "mem-1",
              role: "FAMILY_MEMBER",
              user: {
                id: state.familyUser.id,
                name: state.familyUser.name,
                email: state.familyUser.email,
                role: "FAMILY",
                avatarUrl: null,
                phoneNumber: "+00 0000000000",
              },
            },
            {
              id: "mem-2",
              role: "CARETAKER",
              user: {
                id: activeCaretakerItem.user.id,
                name: activeCaretakerItem.user.name,
                email: activeCaretakerItem.user.email,
                role: "CARETAKER",
                avatarUrl: null,
                phoneNumber: "+00 0000000000",
              },
            },
          ],
        },
      ],
      appointments: [
        {
          id: "appt-1",
          title: "Cardiology Review",
          appointmentDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          location: "Metro Heart Institute, Suite 402",
          doctorName: "Dr. Arvind Roy, MD",
          status: "UPCOMING",
          notes: "Review echocardiogram and Amlodipine dosage",
        },
      ],
      careNotes: profileNotes.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        category: n.category,
        isPinned: n.isPinned,
        createdAt: n.createdAt,
        overallCondition: n.overallCondition,
        observations: n.observations,
        quickFields: n.quickFields,
        author: {
          id: state.caretakerUser.id,
          name: n.authorName,
          role: n.authorRole || "CARETAKER",
        },
      })),
    },
    activeAge: getAge(activeProfile.dateOfBirth),
    latestCondition: activeProfile.latestCondition || ("Stable" as DemoHealthCondition),
    todayDoses: formatTodayDoses(profileDoses, effectiveNow),
    activePatientTasks: profileTasks,
    activePatientMedications: profileMeds,
    activePatientNotes: profileNotes,
    unreadTabs: state.unreadFamilyTabs?.[activeProfile.id] || { tasks: false, medications: false, notes: false },
    activeCaretaker: {
      id: activeCaretakerItem.user.id,
      name: activeCaretakerItem.user.name,
      email: activeCaretakerItem.user.email,
      phoneNumber: "+00 0000000000",
      qualification: activeCaretakerItem.profile.qualification,
    },
    vitalsHistory: profileVitals.slice(0, 15).map((v) => ({
      id: v.id,
      createdAt: v.recordedAt,
      elderlyProfileId: v.elderlyProfileId,
      bloodGlucose: v.bloodGlucose,
      bloodPressure: v.bloodPressure,
      systolic: v.bloodPressureSystolic,
      diastolic: v.bloodPressureDiastolic,
      notes: v.notes,
      recordedAt: v.recordedAt,
      authorName: v.authorName,
      sugarSeverity: v.sugarSeverity,
      bpSeverity: v.bpSeverity,
    })),
    availableProfiles: managedSeniors.map((p) => ({
      id: p.id,
      patientCode: p.patientCode,
      name: p.name,
      preferredName: p.preferredName,
      approvalStatus: p.approvalStatus,
    })),
    analytics: {
      adherenceRate,
      totalScheduled: profileDoses.length,
      totalTaken: takenCount,
      adherenceByDay: [
        { date: "Mon", rate: 100 },
        { date: "Tue", rate: 85 },
        { date: "Wed", rate: 100 },
        { date: "Thu", rate: 100 },
        { date: "Fri", rate: 90 },
        { date: "Sat", rate: 100 },
        { date: "Sun", rate: adherenceRate },
      ],
    },
    refillEstimates: [
      {
        medicationId: profileMeds[0]?.id || "med-1",
        medicationName: profileMeds[0]?.name || "Metformin",
        dosage: profileMeds[0]?.dosage || "500 mg",
        currentStock: profileMeds[0]?.stockCount ?? 24,
        unit: "tablets",
        dailyUsage: 2,
        daysRemaining: Math.floor((profileMeds[0]?.stockCount ?? 24) / 2),
        urgency: ((profileMeds[0]?.stockCount ?? 24) <= 5 ? "HIGH" : "NORMAL") as "HIGH" | "NORMAL",
        predictedRunoutDate: new Date(Date.now() + 86400000 * 12).toLocaleDateString(),
      },
    ],
    timeline: [
      {
        id: "ev-1",
        timestamp: new Date().toISOString(),
        title: "Morning Dose Administered",
        category: "MEDICATION",
        description: "Metformin Hydrochloride 500 mg taken after breakfast",
        status: "COMPLETED",
      },
    ],
    currentUserId: activeAdmin.id,
    caretakersCatalog: getDemoCaretakersList(),
    caretakerRequests: state.caretakerRequests.filter((r) => r.familyAdminId === activeAdmin.id),
  };
}

export function getDemoSeniorProps(selectedPatientId?: string) {
  const state = getDemoState();
  const effectiveNow = getEffectiveNow(state);
  const todayStr = new Date(effectiveNow).toISOString().split("T")[0];

  const seniorPatient =
    (selectedPatientId && state.patients.find((p) => p.id === selectedPatientId)) ||
    (state.activeSeniorPatientId && state.patients.find((p) => p.id === state.activeSeniorPatientId)) ||
    state.patients[0];

  const seniorDoses = state.scheduledDoses.filter((d) => d.elderlyProfileId === seniorPatient.id);
  const seniorMeds = state.medications.filter((m) => m.elderlyProfileId === seniorPatient.id);
  const seniorVitals = state.vitals.filter((v) => v.elderlyProfileId === seniorPatient.id);
  const seniorTasks = state.tasks.filter((t) => t.elderlyProfileId === seniorPatient.id);

  const formattedTasks = seniorTasks.map((t) => {
    const statusInfo = getTaskStatusForDay(t, todayStr, todayStr);
    return {
      ...t,
      isCompletedToday: statusInfo.status === "COMPLETED",
      todayStatusLabel: statusInfo.label,
      completedAt: statusInfo.completedAt || t.completedAt,
      completedByName: statusInfo.completedByName || t.completedByName,
    };
  });

  return {
    initialProfile: {
      id: seniorPatient.id,
      patientCode: seniorPatient.patientCode,
      name: seniorPatient.name,
      preferredName: seniorPatient.preferredName,
      emergencyContactName: seniorPatient.emergencyContactName,
      emergencyContactPhone: seniorPatient.emergencyContactPhone,
      notes: seniorPatient.notes || null,
    },
    initialDoses: seniorDoses.map((d) => {
      let mappedStatus: "SCHEDULED" | "TAKEN" | "MISSED" | "SKIPPED" | "UNCONFIRMED" = "SCHEDULED";
      if (d.status === "TAKEN") mappedStatus = "TAKEN";
      else if (d.status === "MISSED") mappedStatus = "MISSED";
      else if (d.status === "SKIPPED") mappedStatus = "SKIPPED";

      return {
        id: d.id,
        scheduledAt: d.scheduledAt,
        status: mappedStatus,
        confirmedAt: d.confirmedAt || null,
        confirmationNotes: d.confirmationNotes || null,
        medication: {
          id: d.medication.id,
          name: d.medication.name,
          strength: d.medication.dosage,
          form: d.medication.form ? d.medication.form.toUpperCase() : "TABLET",
          dosageInstructions: d.medication.instructions,
          reason: d.medication.reason,
        },
      };
    }),
    allMedications: seniorMeds.map((m) => ({
      id: m.id,
      name: m.name,
      strength: m.dosage,
      form: m.form ? m.form.toUpperCase() : "TABLET",
      dosageInstructions: m.instructions,
      timesOfDay: m.times,
      stockCount: m.stockCount ?? 30,
      stockUpdatedAt: m.stockUpdatedAt,
      stockUpdatedBy: m.stockUpdatedBy,
      reason: m.reason,
    })),
    tasks: formattedTasks,
    upcomingAppointments: [
      {
        id: "appt-1",
        title: "Cardiology Review",
        doctorName: "Dr. Arvind Roy, MD",
        clinicName: "Metro Heart Institute, Suite 402",
        appointmentDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        notes: "Review echocardiogram and blood pressure",
      },
    ],
    initialMeasurements: seniorVitals.slice(0, 10).map((v) => ({
      id: v.id,
      timestamp: v.recordedAt,
      dateFormatted: new Date(v.recordedAt).toLocaleDateString(),
      timeFormatted: new Date(v.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      bloodGlucose: v.bloodGlucose || null,
      bloodPressure: v.bloodPressure || null,
      systolic: v.bloodPressureSystolic || null,
      diastolic: v.bloodPressureDiastolic || null,
      source: v.authorName,
      notes: v.notes || null,
    })),
    caretaker: {
      name: seniorPatient.caretakerName || "Sister Anjali Nair, RN",
      phone: "+00 0000000000",
      role: "Licensed Nurse (RN)",
    },
  };
}
