export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: "CARETAKER" | "FAMILY" | "SENIOR";
  avatarUrl?: string | null;
}

export interface DemoCaretakerProfile {
  id: string;
  userId: string;
  status: "APPROVED";
  professionalCategory: string;
  qualification: string;
  registrationNumber: string;
  issuingAuthority: string;
  state: string;
  specialization: string;
  yearsOfExperience: number;
  backgroundSummary: string;
  avatarUrl?: string | null;
}

export type DemoHealthCondition = "Stable" | "Improving" | "Needs attention" | "Critical";

export interface DemoPatient {
  id: string;
  patientCode: string; // e.g. "PT-0001"
  name: string;
  preferredName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: string;
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  medicalConditions: string[];
  allergies: string[];
  notes?: string;
  isFamilyManaged?: boolean; // True for the patients managed in Family Admin demo
  familyAdminId?: string;
  familyAdminName?: string;
  caretakerId?: string | null;
  caretakerName?: string | null;
  approvalStatus?: "APPROVED" | "PENDING_APPROVAL" | "NO_CARETAKER";
  declinedCaretakerIds?: string[];
  latestCondition?: DemoHealthCondition;
}

export interface DemoMedication {
  id: string;
  elderlyProfileId: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  times: string[]; // e.g. ["08:00", "20:00"]
  assignedById: string;
  assignedByName: string;
  assignedAt: string; // ISO string
  strengthNumber?: number;
  strengthUnit?: "mg" | "mcg" | "ml";
  form?: "tablet" | "capsule" | "syrup" | "drops";
  durationDays?: number;
  reason?: string;
  stockCount?: number;
  stockUpdatedAt?: string; // ISO string
  stockUpdatedBy?: string; // e.g. "patient" | "caretaker"
}

export interface DemoScheduledDose {
  id: string;
  medicationId: string;
  elderlyProfileId: string;
  scheduledAt: string; // ISO string
  status: "PENDING" | "TAKEN" | "SKIPPED" | "MISSED";
  confirmedAt?: string | null;
  confirmationNotes?: string | null;
  skippedReason?: string | null;
  takenBy?: "patient" | "caretaker";
  missedNotified?: boolean;
  medication: {
    id: string;
    name: string;
    dosage: string;
    instructions: string;
    form?: string;
    reason?: string;
  };
}

export interface DemoVitalReading {
  id: string;
  elderlyProfileId: string;
  bloodGlucose?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  bloodPressure?: string | null; // e.g. "120/80"
  notes?: string | null;
  recordedAt: string; // ISO string
  authorName: string;
  sugarSeverity: "NORMAL" | "WARNING" | "CRITICAL";
  bpSeverity: "NORMAL" | "WARNING" | "CRITICAL";
}

export type DemoTaskType =
  | "walking"
  | "sleep"
  | "blood_sugar"
  | "blood_pressure"
  | "hydration"
  | "meals"
  | "custom";

export interface DemoCareTask {
  id: string;
  elderlyProfileId: string;
  taskType?: DemoTaskType;
  title: string;
  description?: string;
  dueDate: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  isCompleted: boolean;
  assignedById?: string;
  assignedToName: string;
  assignedAt?: string;
  completedAt?: string | null;
  completedByName?: string | null;
  completedById?: string | null;
  completionsByDate?: {
    [dateStr: string]: {
      completed: boolean;
      completedAt: string;
      completedByName: string;
      completedById?: string;
    };
  };
  details?: {
    activity?: "walking" | "stretching" | "chair_exercises" | "yoga" | "physiotherapy";
    durationMinutes?: number;
    timesPerDay?: number;
    preferredTime?: string;
    intensity?: "light" | "moderate";
    targetSleepHours?: number;
    bedtime?: string;
    wakeupTime?: string;
    napAllowed?: boolean;
    napMinutes?: number;
    sugarTimes?: string[];
    bpTimes?: string[];
    restingReminder?: boolean;
    glassesPerDay?: number;
    reminderTimes?: string[];
    mealTimes?: string[];
    dietNote?: string;
    notes?: string;
    startDate?: string;
    durationDays?: number | "everyday";
    timeOfDay?: string;
  };
}

export interface DemoCareNote {
  id: string;
  elderlyProfileId: string;
  category: "HEALTH_UPDATE" | "DAILY_OBSERVATION" | "INCIDENT" | "GENERAL";
  title: string;
  content: string;
  authorName: string;
  authorRole?: string;
  isPinned: boolean;
  createdAt: string;
  overallCondition?: DemoHealthCondition;
  observations?: string;
  quickFields?: {
    appetite?: "Good" | "Fair" | "Poor";
    mood?: "Cheerful" | "Calm" | "Anxious" | "Depressed";
    sleepQuality?: "Restful" | "Interrupted" | "Insomnia";
    painLevel?: number; // 0 to 10
    mobility?: "Independent" | "Assisted" | "Bedbound";
  };
}

export interface DemoNotification {
  id: string;
  userId: string; // "demo-caretaker-id" | "demo-family-admin-id" | "demo-senior-user-id"
  type: "MISSED_DOSE" | "ESCALATION_WARNING" | "CARE_PLAN_MISSING" | "CARETAKER_REQUEST" | "SYSTEM";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DemoCaretakerRequest {
  id: string;
  patientId: string;
  patientCode: string; // e.g. "PT-0007"
  patientName: string;
  patientAge: number;
  familyAdminId: string;
  familyAdminName: string;
  caretakerId: string;
  caretakerName: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  createdAt: string;
  respondedAt?: string | null;
}

export interface DemoCaretakerItem {
  user: DemoUser;
  profile: DemoCaretakerProfile;
  assignedPatientsCount: number;
}

export interface DemoState {
  version: number;
  activeCaretakerId: string;
  activeFamilyAdminId?: string;
  activeSeniorPatientId?: string;
  simulationActive: boolean;
  timeOffsetMinutes: number; // Store-level time offset for fast-forward
  caretakerUser: DemoUser; // currently viewed caretaker
  caretakerProfile: DemoCaretakerProfile;
  caretakers: { user: DemoUser; profile: DemoCaretakerProfile }[];
  familyUser: DemoUser; // currently viewed family admin
  familyAdmins?: DemoUser[]; // all demo family admins
  seniorUser: DemoUser;
  nextPatientNumber: number;
  patients: DemoPatient[];
  caretakerRequests: DemoCaretakerRequest[];
  medications: DemoMedication[];
  scheduledDoses: DemoScheduledDose[];
  vitals: DemoVitalReading[];
  tasks: DemoCareTask[];
  notes: DemoCareNote[];
  notifications: DemoNotification[];
  unreadFamilyTabs?: {
    [elderlyProfileId: string]: {
      tasks?: boolean;
      medications?: boolean;
      notes?: boolean;
    };
  };
}
