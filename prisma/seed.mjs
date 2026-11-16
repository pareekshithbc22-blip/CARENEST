// prisma/seed.ts
import "dotenv/config";

// generated/prisma/client.ts
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// generated/prisma/internal/class.ts
import * as runtime from "@prisma/client/runtime/client";
var config = {
  "previewFeatures": [],
  "clientVersion": "7.10.1",
  "engineVersion": "d1b3f377ca835d73fd50954a5e22128b9ebdd6b8",
  "activeProvider": "postgresql",
  "inlineSchema": 'generator client {\n  provider = "prisma-client"\n  output   = "../generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\nenum UserRole {\n  SENIOR\n  FAMILY\n  CARETAKER\n  ADMIN\n}\n\nenum CircleRole {\n  ADMIN\n  FAMILY_MEMBER\n  CARETAKER\n  SENIOR\n}\n\nenum InvitationStatus {\n  PENDING\n  ACCEPTED\n  EXPIRED\n  REVOKED\n}\n\nenum DoseStatus {\n  SCHEDULED\n  TAKEN\n  MISSED\n  SKIPPED\n  UNCONFIRMED\n}\n\nenum ScheduleFrequency {\n  DAILY\n  SPECIFIC_DAYS\n  AS_NEEDED\n  WEEKLY\n}\n\nenum MedicationForm {\n  TABLET\n  CAPSULE\n  SYRUP\n  INJECTION\n  DROPS\n  INHALER\n  TOPICAL\n  OTHER\n}\n\nenum AppointmentStatus {\n  UPCOMING\n  COMPLETED\n  CANCELLED\n  RESCHEDULED\n}\n\nenum TaskPriority {\n  LOW\n  MEDIUM\n  HIGH\n  URGENT\n}\n\nenum TaskStatus {\n  PENDING\n  IN_PROGRESS\n  COMPLETED\n  CANCELLED\n}\n\nenum NoteCategory {\n  GENERAL\n  OBSERVATION\n  MOOD\n  HEALTH_UPDATE\n  HANDOVER\n  INCIDENT\n}\n\nenum NotificationType {\n  MEDICATION_REMINDER\n  MISSED_DOSE_ALERT\n  ESCALATION_WARNING\n  APPOINTMENT_REMINDER\n  CARE_TASK_ASSIGNED\n  REFILL_ALERT\n  SYSTEM\n}\n\nenum VerificationStatus {\n  PENDING\n  UNDER_REVIEW\n  APPROVED\n  REJECTED\n}\n\nenum AccessRequestStatus {\n  PENDING\n  APPROVED\n  REJECTED\n  REVOKED\n}\n\nmodel User {\n  id              String    @id @default(uuid())\n  email           String    @unique\n  name            String\n  passwordHash    String\n  role            UserRole  @default(FAMILY)\n  phoneNumber     String?\n  avatarUrl       String?\n  isEmailVerified Boolean   @default(false)\n  emailVerified   DateTime?\n  isActive        Boolean   @default(true)\n  createdAt       DateTime  @default(now())\n  updatedAt       DateTime  @updatedAt\n\n  // Relationships\n  circleMemberships         CareCircleMember[]\n  createdCircles            CareCircle[]            @relation("CreatedCircles")\n  sentInvitations           CareCircleInvitation[]  @relation("SentInvitations")\n  elderlyProfilesCreated    ElderlyProfile[]        @relation("CreatedProfiles")\n  confirmedDoses            ScheduledDose[]         @relation("ConfirmedBy")\n  assignedTasks             CareTask[]              @relation("AssignedTo")\n  completedTasks            CareTask[]              @relation("CompletedBy")\n  authoredNotes             CareNote[]              @relation("AuthoredNotes")\n  handoverNotesReceived     CareNote[]              @relation("HandoverTo")\n  createdAppointments       Appointment[]           @relation("CreatedAppointments")\n  notifications             Notification[]\n  notificationPref          NotificationPreference?\n  auditLogs                 AuditLog[]\n  caretakerProfile          CaretakerProfile?       @relation("CaretakerVerificationProfile")\n  reviewedCaretakers        CaretakerProfile[]      @relation("ReviewedByAdmin")\n  caretakerAccessRequests   PatientAccessRequest[]  @relation("CaretakerAccessRequests")\n  familyAdminAccessRequests PatientAccessRequest[]  @relation("FamilyAdminAccessRequests")\n\n  @@index([email])\n}\n\nmodel ElderlyProfile {\n  id                       String   @id @default(uuid())\n  name                     String\n  preferredName            String?\n  dateOfBirth              DateTime\n  gender                   String?\n  bloodGroup               String?\n  allergies                String[] @default([])\n  medicalConditions        String[] @default([])\n  emergencyContactName     String\n  emergencyContactPhone    String\n  emergencyContactRelation String?\n  notes                    String?\n  avatarUrl                String?\n  isSeniorModeActive       Boolean  @default(false)\n  seniorPin                String? // Hashed 4-digit PIN for rapid simplified senior check-in\n  createdById              String\n  createdBy                User     @relation("CreatedProfiles", fields: [createdById], references: [id], onDelete: Cascade)\n  createdAt                DateTime @default(now())\n  updatedAt                DateTime @updatedAt\n\n  careCircles             CareCircle[]\n  medications             Medication[]\n  scheduledDoses          ScheduledDose[]\n  appointments            Appointment[]\n  careTasks               CareTask[]\n  careNotes               CareNote[]\n  auditLogs               AuditLog[]\n  notifications           Notification[]\n  caretakerAccessRequests PatientAccessRequest[]\n\n  @@index([createdById])\n}\n\nmodel CareCircle {\n  id               String         @id @default(uuid())\n  name             String\n  elderlyProfileId String\n  elderlyProfile   ElderlyProfile @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  createdById      String\n  createdBy        User           @relation("CreatedCircles", fields: [createdById], references: [id], onDelete: Cascade)\n  createdAt        DateTime       @default(now())\n  updatedAt        DateTime       @updatedAt\n\n  members     CareCircleMember[]\n  invitations CareCircleInvitation[]\n  auditLogs   AuditLog[]\n\n  @@index([elderlyProfileId])\n  @@index([createdById])\n}\n\nmodel CareCircleMember {\n  id           String     @id @default(uuid())\n  careCircleId String\n  careCircle   CareCircle @relation(fields: [careCircleId], references: [id], onDelete: Cascade)\n  userId       String\n  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)\n  role         CircleRole @default(FAMILY_MEMBER)\n  permissions  String[]   @default(["CAN_VIEW_RECORDS", "CAN_CONFIRM_DOSE"])\n  isActive     Boolean    @default(true)\n  joinedAt     DateTime   @default(now())\n  updatedAt    DateTime   @updatedAt\n\n  @@unique([careCircleId, userId])\n  @@index([careCircleId])\n  @@index([userId])\n}\n\nmodel CareCircleInvitation {\n  id           String           @id @default(uuid())\n  careCircleId String\n  careCircle   CareCircle       @relation(fields: [careCircleId], references: [id], onDelete: Cascade)\n  email        String\n  role         CircleRole       @default(FAMILY_MEMBER)\n  token        String           @unique\n  status       InvitationStatus @default(PENDING)\n  invitedById  String\n  invitedBy    User             @relation("SentInvitations", fields: [invitedById], references: [id], onDelete: Cascade)\n  expiresAt    DateTime\n  acceptedAt   DateTime?\n  createdAt    DateTime         @default(now())\n  updatedAt    DateTime         @updatedAt\n\n  @@index([token])\n  @@index([email])\n  @@index([careCircleId])\n}\n\nmodel Medication {\n  id                 String         @id @default(uuid())\n  elderlyProfileId   String\n  elderlyProfile     ElderlyProfile @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  name               String\n  brandName          String?\n  genericName        String?\n  form               MedicationForm @default(TABLET)\n  strength           String // e.g. "500 mg", "10 ml"\n  dosageInstructions String // e.g. "Take 1 tablet after food with water"\n  prescribingDoctor  String?\n  prescribingClinic  String?\n  rxNumber           String?\n  purpose            String? // e.g. "Hypertension", "Type 2 Diabetes"\n  isArchived         Boolean        @default(false)\n  discontinuedReason String?\n  createdAt          DateTime       @default(now())\n  updatedAt          DateTime       @updatedAt\n\n  schedules      MedicationSchedule[]\n  scheduledDoses ScheduledDose[]\n  stock          MedicationStock?\n\n  @@index([elderlyProfileId])\n  @@index([isArchived])\n}\n\nmodel MedicationSchedule {\n  id             String            @id @default(uuid())\n  medicationId   String\n  medication     Medication        @relation(fields: [medicationId], references: [id], onDelete: Cascade)\n  frequency      ScheduleFrequency @default(DAILY)\n  timesOfDay     String[] // e.g. ["08:00", "20:00"]\n  daysOfWeek     Int[]             @default([0, 1, 2, 3, 4, 5, 6]) // 0=Sunday\n  startDate      DateTime          @default(now())\n  endDate        DateTime?\n  dosageQuantity Float             @default(1.0)\n  instructions   String?\n  isActive       Boolean           @default(true)\n  createdAt      DateTime          @default(now())\n  updatedAt      DateTime          @updatedAt\n\n  scheduledDoses ScheduledDose[]\n\n  @@index([medicationId])\n}\n\nmodel ScheduledDose {\n  id                 String              @id @default(uuid())\n  medicationId       String\n  medication         Medication          @relation(fields: [medicationId], references: [id], onDelete: Cascade)\n  scheduleId         String?\n  schedule           MedicationSchedule? @relation(fields: [scheduleId], references: [id], onDelete: SetNull)\n  elderlyProfileId   String\n  elderlyProfile     ElderlyProfile      @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  scheduledAt        DateTime\n  status             DoseStatus          @default(SCHEDULED)\n  confirmedAt        DateTime?\n  confirmedById      String?\n  confirmedBy        User?               @relation("ConfirmedBy", fields: [confirmedById], references: [id], onDelete: SetNull)\n  confirmationNotes  String?\n  gracePeriodMinutes Int                 @default(45)\n  escalationLevel    Int                 @default(0) // 0: None, 1: Caretaker notified, 2: Family escalation\n  escalatedAt        DateTime?\n  idempotencyKey     String?             @unique\n  createdAt          DateTime            @default(now())\n  updatedAt          DateTime            @updatedAt\n\n  @@index([elderlyProfileId, scheduledAt])\n  @@index([status, scheduledAt])\n  @@index([medicationId])\n}\n\nmodel MedicationStock {\n  id              String     @id @default(uuid())\n  medicationId    String     @unique\n  medication      Medication @relation(fields: [medicationId], references: [id], onDelete: Cascade)\n  currentStock    Float      @default(0)\n  unit            String     @default("tablets") // tablets, capsules, ml, sprays\n  refillThreshold Float      @default(10)\n  packageSize     Float?\n  lastRefillDate  DateTime?\n  notes           String?\n  createdAt       DateTime   @default(now())\n  updatedAt       DateTime   @updatedAt\n\n  @@index([medicationId])\n}\n\nmodel Appointment {\n  id                    String            @id @default(uuid())\n  elderlyProfileId      String\n  elderlyProfile        ElderlyProfile    @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  title                 String\n  doctorName            String\n  specialty             String?\n  clinicName            String\n  locationAddress       String?\n  appointmentDate       DateTime\n  status                AppointmentStatus @default(UPCOMING)\n  reminderMinutesBefore Int               @default(1440) // 24 hours\n  reminderSent          Boolean           @default(false)\n  notes                 String?\n  outcomeSummary        String?\n  createdById           String\n  createdBy             User              @relation("CreatedAppointments", fields: [createdById], references: [id], onDelete: Cascade)\n  createdAt             DateTime          @default(now())\n  updatedAt             DateTime          @updatedAt\n\n  @@index([elderlyProfileId, appointmentDate])\n  @@index([status])\n}\n\nmodel CareTask {\n  id               String         @id @default(uuid())\n  elderlyProfileId String\n  elderlyProfile   ElderlyProfile @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  assignedToId     String?\n  assignedTo       User?          @relation("AssignedTo", fields: [assignedToId], references: [id], onDelete: SetNull)\n  title            String\n  description      String?\n  dueDate          DateTime\n  priority         TaskPriority   @default(MEDIUM)\n  status           TaskStatus     @default(PENDING)\n  completedAt      DateTime?\n  completedById    String?\n  completedBy      User?          @relation("CompletedBy", fields: [completedById], references: [id], onDelete: SetNull)\n  notes            String?\n  createdAt        DateTime       @default(now())\n  updatedAt        DateTime       @updatedAt\n\n  @@index([elderlyProfileId, dueDate])\n  @@index([assignedToId, status])\n}\n\nmodel CareNote {\n  id                String         @id @default(uuid())\n  elderlyProfileId  String\n  elderlyProfile    ElderlyProfile @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  authorId          String\n  author            User           @relation("AuthoredNotes", fields: [authorId], references: [id], onDelete: Cascade)\n  category          NoteCategory   @default(GENERAL)\n  title             String\n  content           String\n  vitalSigns        Json? // { bp: "120/80", pulse: 72, sugar: 110, temp: 98.6 }\n  isPinned          Boolean        @default(false)\n  shiftHandoverToId String?\n  shiftHandoverTo   User?          @relation("HandoverTo", fields: [shiftHandoverToId], references: [id], onDelete: SetNull)\n  createdAt         DateTime       @default(now())\n  updatedAt         DateTime       @updatedAt\n\n  @@index([elderlyProfileId, createdAt])\n  @@index([category])\n}\n\nmodel Notification {\n  id               String           @id @default(uuid())\n  userId           String\n  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)\n  elderlyProfileId String?\n  elderlyProfile   ElderlyProfile?  @relation(fields: [elderlyProfileId], references: [id], onDelete: SetNull)\n  type             NotificationType\n  title            String\n  message          String\n  data             Json?\n  isRead           Boolean          @default(false)\n  readAt           DateTime?\n  deliveryStatus   String           @default("SENT") // SENT, FAILED\n  emailSent        Boolean          @default(false)\n  createdAt        DateTime         @default(now())\n\n  @@index([userId, isRead])\n  @@index([createdAt])\n}\n\nmodel NotificationPreference {\n  id                   String   @id @default(uuid())\n  userId               String   @unique\n  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  emailReminders       Boolean  @default(true)\n  missedDoseAlerts     Boolean  @default(true)\n  escalationAlerts     Boolean  @default(true)\n  appointmentReminders Boolean  @default(true)\n  dailySummaryEmail    Boolean  @default(false)\n  gracePeriodMinutes   Int      @default(45)\n  updatedAt            DateTime @updatedAt\n}\n\nmodel AuditLog {\n  id               String          @id @default(uuid())\n  elderlyProfileId String?\n  elderlyProfile   ElderlyProfile? @relation(fields: [elderlyProfileId], references: [id], onDelete: SetNull)\n  careCircleId     String?\n  careCircle       CareCircle?     @relation(fields: [careCircleId], references: [id], onDelete: SetNull)\n  userId           String?\n  user             User?           @relation(fields: [userId], references: [id], onDelete: SetNull)\n  action           String // e.g. DOSE_CONFIRMED, MEDICATION_CREATED, ACCESS_REVOKED\n  entityType       String // Dose, Medication, CareCircle, Member\n  entityId         String?\n  details          Json?\n  ipAddress        String?\n  createdAt        DateTime        @default(now())\n\n  @@index([elderlyProfileId, createdAt])\n  @@index([action])\n}\n\nmodel EmailVerificationOtp {\n  id         String   @id @default(uuid())\n  email      String   @unique\n  hashedOtp  String\n  expiresAt  DateTime\n  attempts   Int      @default(0)\n  lastSentAt DateTime @default(now())\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n\n  @@index([email])\n}\n\nmodel CaretakerProfile {\n  id                   String             @id @default(uuid())\n  userId               String             @unique\n  user                 User               @relation("CaretakerVerificationProfile", fields: [userId], references: [id], onDelete: Cascade)\n  fullName             String // Full legal name\n  professionalCategory String // e.g. "Registered Nurse (RN)", "Doctor / Physician Assistant", "Certified Caregiver"\n  qualification        String // e.g. "B.Sc Nursing", "GNM", "Diploma in Geriatric Care"\n  registrationNumber   String? // Certificate / license number\n  issuingAuthority     String // e.g. "State Nursing Council", "Medical Council", "Red Cross"\n  state                String? // State / Region\n  documentFileName     String // Original filename\n  documentFilePath     String // Secure storage path (not publicly served)\n  documentMimeType     String // application/pdf, image/jpeg, image/png\n  documentFileSize     Int // Size in bytes\n  status               VerificationStatus @default(PENDING)\n  rejectionReason      String?\n  reviewedById         String?\n  reviewedBy           User?              @relation("ReviewedByAdmin", fields: [reviewedById], references: [id], onDelete: SetNull)\n  reviewedAt           DateTime?\n  createdAt            DateTime           @default(now())\n  updatedAt            DateTime           @updatedAt\n\n  @@index([status])\n  @@index([userId])\n}\n\nmodel PatientAccessRequest {\n  id               String              @id @default(uuid())\n  elderlyProfileId String\n  elderlyProfile   ElderlyProfile      @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  caretakerId      String\n  caretaker        User                @relation("CaretakerAccessRequests", fields: [caretakerId], references: [id], onDelete: Cascade)\n  familyAdminId    String\n  familyAdmin      User                @relation("FamilyAdminAccessRequests", fields: [familyAdminId], references: [id], onDelete: Cascade)\n  status           AccessRequestStatus @default(PENDING)\n  notes            String? // Message from caretaker\n  rejectionReason  String? // Reason if rejected\n  requestedAt      DateTime            @default(now())\n  respondedAt      DateTime?\n  createdAt        DateTime            @default(now())\n  updatedAt        DateTime            @updatedAt\n\n  @@unique([elderlyProfileId, caretakerId])\n  @@index([elderlyProfileId])\n  @@index([caretakerId])\n  @@index([familyAdminId])\n  @@index([status])\n}\n',
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  },
  "parameterizationSchema": {
    "strings": [],
    "graph": ""
  }
};
config.runtimeDataModel = JSON.parse('{"models":{"User":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"passwordHash","kind":"scalar","type":"String"},{"name":"role","kind":"enum","type":"UserRole"},{"name":"phoneNumber","kind":"scalar","type":"String"},{"name":"avatarUrl","kind":"scalar","type":"String"},{"name":"isEmailVerified","kind":"scalar","type":"Boolean"},{"name":"emailVerified","kind":"scalar","type":"DateTime"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"circleMemberships","kind":"object","type":"CareCircleMember","relationName":"CareCircleMemberToUser"},{"name":"createdCircles","kind":"object","type":"CareCircle","relationName":"CreatedCircles"},{"name":"sentInvitations","kind":"object","type":"CareCircleInvitation","relationName":"SentInvitations"},{"name":"elderlyProfilesCreated","kind":"object","type":"ElderlyProfile","relationName":"CreatedProfiles"},{"name":"confirmedDoses","kind":"object","type":"ScheduledDose","relationName":"ConfirmedBy"},{"name":"assignedTasks","kind":"object","type":"CareTask","relationName":"AssignedTo"},{"name":"completedTasks","kind":"object","type":"CareTask","relationName":"CompletedBy"},{"name":"authoredNotes","kind":"object","type":"CareNote","relationName":"AuthoredNotes"},{"name":"handoverNotesReceived","kind":"object","type":"CareNote","relationName":"HandoverTo"},{"name":"createdAppointments","kind":"object","type":"Appointment","relationName":"CreatedAppointments"},{"name":"notifications","kind":"object","type":"Notification","relationName":"NotificationToUser"},{"name":"notificationPref","kind":"object","type":"NotificationPreference","relationName":"NotificationPreferenceToUser"},{"name":"auditLogs","kind":"object","type":"AuditLog","relationName":"AuditLogToUser"},{"name":"caretakerProfile","kind":"object","type":"CaretakerProfile","relationName":"CaretakerVerificationProfile"},{"name":"reviewedCaretakers","kind":"object","type":"CaretakerProfile","relationName":"ReviewedByAdmin"},{"name":"caretakerAccessRequests","kind":"object","type":"PatientAccessRequest","relationName":"CaretakerAccessRequests"},{"name":"familyAdminAccessRequests","kind":"object","type":"PatientAccessRequest","relationName":"FamilyAdminAccessRequests"}],"dbName":null,"schema":null},"ElderlyProfile":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"preferredName","kind":"scalar","type":"String"},{"name":"dateOfBirth","kind":"scalar","type":"DateTime"},{"name":"gender","kind":"scalar","type":"String"},{"name":"bloodGroup","kind":"scalar","type":"String"},{"name":"allergies","kind":"scalar","type":"String"},{"name":"medicalConditions","kind":"scalar","type":"String"},{"name":"emergencyContactName","kind":"scalar","type":"String"},{"name":"emergencyContactPhone","kind":"scalar","type":"String"},{"name":"emergencyContactRelation","kind":"scalar","type":"String"},{"name":"notes","kind":"scalar","type":"String"},{"name":"avatarUrl","kind":"scalar","type":"String"},{"name":"isSeniorModeActive","kind":"scalar","type":"Boolean"},{"name":"seniorPin","kind":"scalar","type":"String"},{"name":"createdById","kind":"scalar","type":"String"},{"name":"createdBy","kind":"object","type":"User","relationName":"CreatedProfiles"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"careCircles","kind":"object","type":"CareCircle","relationName":"CareCircleToElderlyProfile"},{"name":"medications","kind":"object","type":"Medication","relationName":"ElderlyProfileToMedication"},{"name":"scheduledDoses","kind":"object","type":"ScheduledDose","relationName":"ElderlyProfileToScheduledDose"},{"name":"appointments","kind":"object","type":"Appointment","relationName":"AppointmentToElderlyProfile"},{"name":"careTasks","kind":"object","type":"CareTask","relationName":"CareTaskToElderlyProfile"},{"name":"careNotes","kind":"object","type":"CareNote","relationName":"CareNoteToElderlyProfile"},{"name":"auditLogs","kind":"object","type":"AuditLog","relationName":"AuditLogToElderlyProfile"},{"name":"notifications","kind":"object","type":"Notification","relationName":"ElderlyProfileToNotification"},{"name":"caretakerAccessRequests","kind":"object","type":"PatientAccessRequest","relationName":"ElderlyProfileToPatientAccessRequest"}],"dbName":null,"schema":null},"CareCircle":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"CareCircleToElderlyProfile"},{"name":"createdById","kind":"scalar","type":"String"},{"name":"createdBy","kind":"object","type":"User","relationName":"CreatedCircles"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"members","kind":"object","type":"CareCircleMember","relationName":"CareCircleToCareCircleMember"},{"name":"invitations","kind":"object","type":"CareCircleInvitation","relationName":"CareCircleToCareCircleInvitation"},{"name":"auditLogs","kind":"object","type":"AuditLog","relationName":"AuditLogToCareCircle"}],"dbName":null,"schema":null},"CareCircleMember":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"careCircleId","kind":"scalar","type":"String"},{"name":"careCircle","kind":"object","type":"CareCircle","relationName":"CareCircleToCareCircleMember"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"CareCircleMemberToUser"},{"name":"role","kind":"enum","type":"CircleRole"},{"name":"permissions","kind":"scalar","type":"String"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"joinedAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"CareCircleInvitation":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"careCircleId","kind":"scalar","type":"String"},{"name":"careCircle","kind":"object","type":"CareCircle","relationName":"CareCircleToCareCircleInvitation"},{"name":"email","kind":"scalar","type":"String"},{"name":"role","kind":"enum","type":"CircleRole"},{"name":"token","kind":"scalar","type":"String"},{"name":"status","kind":"enum","type":"InvitationStatus"},{"name":"invitedById","kind":"scalar","type":"String"},{"name":"invitedBy","kind":"object","type":"User","relationName":"SentInvitations"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"acceptedAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"Medication":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"ElderlyProfileToMedication"},{"name":"name","kind":"scalar","type":"String"},{"name":"brandName","kind":"scalar","type":"String"},{"name":"genericName","kind":"scalar","type":"String"},{"name":"form","kind":"enum","type":"MedicationForm"},{"name":"strength","kind":"scalar","type":"String"},{"name":"dosageInstructions","kind":"scalar","type":"String"},{"name":"prescribingDoctor","kind":"scalar","type":"String"},{"name":"prescribingClinic","kind":"scalar","type":"String"},{"name":"rxNumber","kind":"scalar","type":"String"},{"name":"purpose","kind":"scalar","type":"String"},{"name":"isArchived","kind":"scalar","type":"Boolean"},{"name":"discontinuedReason","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"schedules","kind":"object","type":"MedicationSchedule","relationName":"MedicationToMedicationSchedule"},{"name":"scheduledDoses","kind":"object","type":"ScheduledDose","relationName":"MedicationToScheduledDose"},{"name":"stock","kind":"object","type":"MedicationStock","relationName":"MedicationToMedicationStock"}],"dbName":null,"schema":null},"MedicationSchedule":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"medicationId","kind":"scalar","type":"String"},{"name":"medication","kind":"object","type":"Medication","relationName":"MedicationToMedicationSchedule"},{"name":"frequency","kind":"enum","type":"ScheduleFrequency"},{"name":"timesOfDay","kind":"scalar","type":"String"},{"name":"daysOfWeek","kind":"scalar","type":"Int"},{"name":"startDate","kind":"scalar","type":"DateTime"},{"name":"endDate","kind":"scalar","type":"DateTime"},{"name":"dosageQuantity","kind":"scalar","type":"Float"},{"name":"instructions","kind":"scalar","type":"String"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"scheduledDoses","kind":"object","type":"ScheduledDose","relationName":"MedicationScheduleToScheduledDose"}],"dbName":null,"schema":null},"ScheduledDose":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"medicationId","kind":"scalar","type":"String"},{"name":"medication","kind":"object","type":"Medication","relationName":"MedicationToScheduledDose"},{"name":"scheduleId","kind":"scalar","type":"String"},{"name":"schedule","kind":"object","type":"MedicationSchedule","relationName":"MedicationScheduleToScheduledDose"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"ElderlyProfileToScheduledDose"},{"name":"scheduledAt","kind":"scalar","type":"DateTime"},{"name":"status","kind":"enum","type":"DoseStatus"},{"name":"confirmedAt","kind":"scalar","type":"DateTime"},{"name":"confirmedById","kind":"scalar","type":"String"},{"name":"confirmedBy","kind":"object","type":"User","relationName":"ConfirmedBy"},{"name":"confirmationNotes","kind":"scalar","type":"String"},{"name":"gracePeriodMinutes","kind":"scalar","type":"Int"},{"name":"escalationLevel","kind":"scalar","type":"Int"},{"name":"escalatedAt","kind":"scalar","type":"DateTime"},{"name":"idempotencyKey","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"MedicationStock":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"medicationId","kind":"scalar","type":"String"},{"name":"medication","kind":"object","type":"Medication","relationName":"MedicationToMedicationStock"},{"name":"currentStock","kind":"scalar","type":"Float"},{"name":"unit","kind":"scalar","type":"String"},{"name":"refillThreshold","kind":"scalar","type":"Float"},{"name":"packageSize","kind":"scalar","type":"Float"},{"name":"lastRefillDate","kind":"scalar","type":"DateTime"},{"name":"notes","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"Appointment":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"AppointmentToElderlyProfile"},{"name":"title","kind":"scalar","type":"String"},{"name":"doctorName","kind":"scalar","type":"String"},{"name":"specialty","kind":"scalar","type":"String"},{"name":"clinicName","kind":"scalar","type":"String"},{"name":"locationAddress","kind":"scalar","type":"String"},{"name":"appointmentDate","kind":"scalar","type":"DateTime"},{"name":"status","kind":"enum","type":"AppointmentStatus"},{"name":"reminderMinutesBefore","kind":"scalar","type":"Int"},{"name":"reminderSent","kind":"scalar","type":"Boolean"},{"name":"notes","kind":"scalar","type":"String"},{"name":"outcomeSummary","kind":"scalar","type":"String"},{"name":"createdById","kind":"scalar","type":"String"},{"name":"createdBy","kind":"object","type":"User","relationName":"CreatedAppointments"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"CareTask":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"CareTaskToElderlyProfile"},{"name":"assignedToId","kind":"scalar","type":"String"},{"name":"assignedTo","kind":"object","type":"User","relationName":"AssignedTo"},{"name":"title","kind":"scalar","type":"String"},{"name":"description","kind":"scalar","type":"String"},{"name":"dueDate","kind":"scalar","type":"DateTime"},{"name":"priority","kind":"enum","type":"TaskPriority"},{"name":"status","kind":"enum","type":"TaskStatus"},{"name":"completedAt","kind":"scalar","type":"DateTime"},{"name":"completedById","kind":"scalar","type":"String"},{"name":"completedBy","kind":"object","type":"User","relationName":"CompletedBy"},{"name":"notes","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"CareNote":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"CareNoteToElderlyProfile"},{"name":"authorId","kind":"scalar","type":"String"},{"name":"author","kind":"object","type":"User","relationName":"AuthoredNotes"},{"name":"category","kind":"enum","type":"NoteCategory"},{"name":"title","kind":"scalar","type":"String"},{"name":"content","kind":"scalar","type":"String"},{"name":"vitalSigns","kind":"scalar","type":"Json"},{"name":"isPinned","kind":"scalar","type":"Boolean"},{"name":"shiftHandoverToId","kind":"scalar","type":"String"},{"name":"shiftHandoverTo","kind":"object","type":"User","relationName":"HandoverTo"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"Notification":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"NotificationToUser"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"ElderlyProfileToNotification"},{"name":"type","kind":"enum","type":"NotificationType"},{"name":"title","kind":"scalar","type":"String"},{"name":"message","kind":"scalar","type":"String"},{"name":"data","kind":"scalar","type":"Json"},{"name":"isRead","kind":"scalar","type":"Boolean"},{"name":"readAt","kind":"scalar","type":"DateTime"},{"name":"deliveryStatus","kind":"scalar","type":"String"},{"name":"emailSent","kind":"scalar","type":"Boolean"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"NotificationPreference":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"NotificationPreferenceToUser"},{"name":"emailReminders","kind":"scalar","type":"Boolean"},{"name":"missedDoseAlerts","kind":"scalar","type":"Boolean"},{"name":"escalationAlerts","kind":"scalar","type":"Boolean"},{"name":"appointmentReminders","kind":"scalar","type":"Boolean"},{"name":"dailySummaryEmail","kind":"scalar","type":"Boolean"},{"name":"gracePeriodMinutes","kind":"scalar","type":"Int"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"AuditLog":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"AuditLogToElderlyProfile"},{"name":"careCircleId","kind":"scalar","type":"String"},{"name":"careCircle","kind":"object","type":"CareCircle","relationName":"AuditLogToCareCircle"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"AuditLogToUser"},{"name":"action","kind":"scalar","type":"String"},{"name":"entityType","kind":"scalar","type":"String"},{"name":"entityId","kind":"scalar","type":"String"},{"name":"details","kind":"scalar","type":"Json"},{"name":"ipAddress","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"EmailVerificationOtp":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"hashedOtp","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"attempts","kind":"scalar","type":"Int"},{"name":"lastSentAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"CaretakerProfile":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"CaretakerVerificationProfile"},{"name":"fullName","kind":"scalar","type":"String"},{"name":"professionalCategory","kind":"scalar","type":"String"},{"name":"qualification","kind":"scalar","type":"String"},{"name":"registrationNumber","kind":"scalar","type":"String"},{"name":"issuingAuthority","kind":"scalar","type":"String"},{"name":"state","kind":"scalar","type":"String"},{"name":"documentFileName","kind":"scalar","type":"String"},{"name":"documentFilePath","kind":"scalar","type":"String"},{"name":"documentMimeType","kind":"scalar","type":"String"},{"name":"documentFileSize","kind":"scalar","type":"Int"},{"name":"status","kind":"enum","type":"VerificationStatus"},{"name":"rejectionReason","kind":"scalar","type":"String"},{"name":"reviewedById","kind":"scalar","type":"String"},{"name":"reviewedBy","kind":"object","type":"User","relationName":"ReviewedByAdmin"},{"name":"reviewedAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"PatientAccessRequest":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"ElderlyProfileToPatientAccessRequest"},{"name":"caretakerId","kind":"scalar","type":"String"},{"name":"caretaker","kind":"object","type":"User","relationName":"CaretakerAccessRequests"},{"name":"familyAdminId","kind":"scalar","type":"String"},{"name":"familyAdmin","kind":"object","type":"User","relationName":"FamilyAdminAccessRequests"},{"name":"status","kind":"enum","type":"AccessRequestStatus"},{"name":"notes","kind":"scalar","type":"String"},{"name":"rejectionReason","kind":"scalar","type":"String"},{"name":"requestedAt","kind":"scalar","type":"DateTime"},{"name":"respondedAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null}},"enums":{},"types":{}}');
config.parameterizationSchema = {
  strings: JSON.parse('["where","orderBy","cursor","createdBy","careCircles","elderlyProfile","medication","schedule","confirmedBy","scheduledDoses","_count","schedules","stock","medications","appointments","assignedTo","completedBy","careTasks","author","shiftHandoverTo","careNotes","careCircle","user","auditLogs","notifications","caretaker","familyAdmin","caretakerAccessRequests","members","invitedBy","invitations","circleMemberships","createdCircles","sentInvitations","elderlyProfilesCreated","confirmedDoses","assignedTasks","completedTasks","authoredNotes","handoverNotesReceived","createdAppointments","notificationPref","reviewedBy","caretakerProfile","reviewedCaretakers","familyAdminAccessRequests","User.findUnique","User.findUniqueOrThrow","User.findFirst","User.findFirstOrThrow","User.findMany","data","User.createOne","User.createMany","User.createManyAndReturn","User.updateOne","User.updateMany","User.updateManyAndReturn","create","update","User.upsertOne","User.deleteOne","User.deleteMany","having","_min","_max","User.groupBy","User.aggregate","ElderlyProfile.findUnique","ElderlyProfile.findUniqueOrThrow","ElderlyProfile.findFirst","ElderlyProfile.findFirstOrThrow","ElderlyProfile.findMany","ElderlyProfile.createOne","ElderlyProfile.createMany","ElderlyProfile.createManyAndReturn","ElderlyProfile.updateOne","ElderlyProfile.updateMany","ElderlyProfile.updateManyAndReturn","ElderlyProfile.upsertOne","ElderlyProfile.deleteOne","ElderlyProfile.deleteMany","ElderlyProfile.groupBy","ElderlyProfile.aggregate","CareCircle.findUnique","CareCircle.findUniqueOrThrow","CareCircle.findFirst","CareCircle.findFirstOrThrow","CareCircle.findMany","CareCircle.createOne","CareCircle.createMany","CareCircle.createManyAndReturn","CareCircle.updateOne","CareCircle.updateMany","CareCircle.updateManyAndReturn","CareCircle.upsertOne","CareCircle.deleteOne","CareCircle.deleteMany","CareCircle.groupBy","CareCircle.aggregate","CareCircleMember.findUnique","CareCircleMember.findUniqueOrThrow","CareCircleMember.findFirst","CareCircleMember.findFirstOrThrow","CareCircleMember.findMany","CareCircleMember.createOne","CareCircleMember.createMany","CareCircleMember.createManyAndReturn","CareCircleMember.updateOne","CareCircleMember.updateMany","CareCircleMember.updateManyAndReturn","CareCircleMember.upsertOne","CareCircleMember.deleteOne","CareCircleMember.deleteMany","CareCircleMember.groupBy","CareCircleMember.aggregate","CareCircleInvitation.findUnique","CareCircleInvitation.findUniqueOrThrow","CareCircleInvitation.findFirst","CareCircleInvitation.findFirstOrThrow","CareCircleInvitation.findMany","CareCircleInvitation.createOne","CareCircleInvitation.createMany","CareCircleInvitation.createManyAndReturn","CareCircleInvitation.updateOne","CareCircleInvitation.updateMany","CareCircleInvitation.updateManyAndReturn","CareCircleInvitation.upsertOne","CareCircleInvitation.deleteOne","CareCircleInvitation.deleteMany","CareCircleInvitation.groupBy","CareCircleInvitation.aggregate","Medication.findUnique","Medication.findUniqueOrThrow","Medication.findFirst","Medication.findFirstOrThrow","Medication.findMany","Medication.createOne","Medication.createMany","Medication.createManyAndReturn","Medication.updateOne","Medication.updateMany","Medication.updateManyAndReturn","Medication.upsertOne","Medication.deleteOne","Medication.deleteMany","Medication.groupBy","Medication.aggregate","MedicationSchedule.findUnique","MedicationSchedule.findUniqueOrThrow","MedicationSchedule.findFirst","MedicationSchedule.findFirstOrThrow","MedicationSchedule.findMany","MedicationSchedule.createOne","MedicationSchedule.createMany","MedicationSchedule.createManyAndReturn","MedicationSchedule.updateOne","MedicationSchedule.updateMany","MedicationSchedule.updateManyAndReturn","MedicationSchedule.upsertOne","MedicationSchedule.deleteOne","MedicationSchedule.deleteMany","_avg","_sum","MedicationSchedule.groupBy","MedicationSchedule.aggregate","ScheduledDose.findUnique","ScheduledDose.findUniqueOrThrow","ScheduledDose.findFirst","ScheduledDose.findFirstOrThrow","ScheduledDose.findMany","ScheduledDose.createOne","ScheduledDose.createMany","ScheduledDose.createManyAndReturn","ScheduledDose.updateOne","ScheduledDose.updateMany","ScheduledDose.updateManyAndReturn","ScheduledDose.upsertOne","ScheduledDose.deleteOne","ScheduledDose.deleteMany","ScheduledDose.groupBy","ScheduledDose.aggregate","MedicationStock.findUnique","MedicationStock.findUniqueOrThrow","MedicationStock.findFirst","MedicationStock.findFirstOrThrow","MedicationStock.findMany","MedicationStock.createOne","MedicationStock.createMany","MedicationStock.createManyAndReturn","MedicationStock.updateOne","MedicationStock.updateMany","MedicationStock.updateManyAndReturn","MedicationStock.upsertOne","MedicationStock.deleteOne","MedicationStock.deleteMany","MedicationStock.groupBy","MedicationStock.aggregate","Appointment.findUnique","Appointment.findUniqueOrThrow","Appointment.findFirst","Appointment.findFirstOrThrow","Appointment.findMany","Appointment.createOne","Appointment.createMany","Appointment.createManyAndReturn","Appointment.updateOne","Appointment.updateMany","Appointment.updateManyAndReturn","Appointment.upsertOne","Appointment.deleteOne","Appointment.deleteMany","Appointment.groupBy","Appointment.aggregate","CareTask.findUnique","CareTask.findUniqueOrThrow","CareTask.findFirst","CareTask.findFirstOrThrow","CareTask.findMany","CareTask.createOne","CareTask.createMany","CareTask.createManyAndReturn","CareTask.updateOne","CareTask.updateMany","CareTask.updateManyAndReturn","CareTask.upsertOne","CareTask.deleteOne","CareTask.deleteMany","CareTask.groupBy","CareTask.aggregate","CareNote.findUnique","CareNote.findUniqueOrThrow","CareNote.findFirst","CareNote.findFirstOrThrow","CareNote.findMany","CareNote.createOne","CareNote.createMany","CareNote.createManyAndReturn","CareNote.updateOne","CareNote.updateMany","CareNote.updateManyAndReturn","CareNote.upsertOne","CareNote.deleteOne","CareNote.deleteMany","CareNote.groupBy","CareNote.aggregate","Notification.findUnique","Notification.findUniqueOrThrow","Notification.findFirst","Notification.findFirstOrThrow","Notification.findMany","Notification.createOne","Notification.createMany","Notification.createManyAndReturn","Notification.updateOne","Notification.updateMany","Notification.updateManyAndReturn","Notification.upsertOne","Notification.deleteOne","Notification.deleteMany","Notification.groupBy","Notification.aggregate","NotificationPreference.findUnique","NotificationPreference.findUniqueOrThrow","NotificationPreference.findFirst","NotificationPreference.findFirstOrThrow","NotificationPreference.findMany","NotificationPreference.createOne","NotificationPreference.createMany","NotificationPreference.createManyAndReturn","NotificationPreference.updateOne","NotificationPreference.updateMany","NotificationPreference.updateManyAndReturn","NotificationPreference.upsertOne","NotificationPreference.deleteOne","NotificationPreference.deleteMany","NotificationPreference.groupBy","NotificationPreference.aggregate","AuditLog.findUnique","AuditLog.findUniqueOrThrow","AuditLog.findFirst","AuditLog.findFirstOrThrow","AuditLog.findMany","AuditLog.createOne","AuditLog.createMany","AuditLog.createManyAndReturn","AuditLog.updateOne","AuditLog.updateMany","AuditLog.updateManyAndReturn","AuditLog.upsertOne","AuditLog.deleteOne","AuditLog.deleteMany","AuditLog.groupBy","AuditLog.aggregate","EmailVerificationOtp.findUnique","EmailVerificationOtp.findUniqueOrThrow","EmailVerificationOtp.findFirst","EmailVerificationOtp.findFirstOrThrow","EmailVerificationOtp.findMany","EmailVerificationOtp.createOne","EmailVerificationOtp.createMany","EmailVerificationOtp.createManyAndReturn","EmailVerificationOtp.updateOne","EmailVerificationOtp.updateMany","EmailVerificationOtp.updateManyAndReturn","EmailVerificationOtp.upsertOne","EmailVerificationOtp.deleteOne","EmailVerificationOtp.deleteMany","EmailVerificationOtp.groupBy","EmailVerificationOtp.aggregate","CaretakerProfile.findUnique","CaretakerProfile.findUniqueOrThrow","CaretakerProfile.findFirst","CaretakerProfile.findFirstOrThrow","CaretakerProfile.findMany","CaretakerProfile.createOne","CaretakerProfile.createMany","CaretakerProfile.createManyAndReturn","CaretakerProfile.updateOne","CaretakerProfile.updateMany","CaretakerProfile.updateManyAndReturn","CaretakerProfile.upsertOne","CaretakerProfile.deleteOne","CaretakerProfile.deleteMany","CaretakerProfile.groupBy","CaretakerProfile.aggregate","PatientAccessRequest.findUnique","PatientAccessRequest.findUniqueOrThrow","PatientAccessRequest.findFirst","PatientAccessRequest.findFirstOrThrow","PatientAccessRequest.findMany","PatientAccessRequest.createOne","PatientAccessRequest.createMany","PatientAccessRequest.createManyAndReturn","PatientAccessRequest.updateOne","PatientAccessRequest.updateMany","PatientAccessRequest.updateManyAndReturn","PatientAccessRequest.upsertOne","PatientAccessRequest.deleteOne","PatientAccessRequest.deleteMany","PatientAccessRequest.groupBy","PatientAccessRequest.aggregate","AND","OR","NOT","id","elderlyProfileId","caretakerId","familyAdminId","AccessRequestStatus","status","notes","rejectionReason","requestedAt","respondedAt","createdAt","updatedAt","equals","in","notIn","lt","lte","gt","gte","not","contains","startsWith","endsWith","userId","fullName","professionalCategory","qualification","registrationNumber","issuingAuthority","state","documentFileName","documentFilePath","documentMimeType","documentFileSize","VerificationStatus","reviewedById","reviewedAt","email","hashedOtp","expiresAt","attempts","lastSentAt","careCircleId","action","entityType","entityId","details","ipAddress","string_contains","string_starts_with","string_ends_with","array_starts_with","array_ends_with","array_contains","emailReminders","missedDoseAlerts","escalationAlerts","appointmentReminders","dailySummaryEmail","gracePeriodMinutes","NotificationType","type","title","message","isRead","readAt","deliveryStatus","emailSent","authorId","NoteCategory","category","content","vitalSigns","isPinned","shiftHandoverToId","assignedToId","description","dueDate","TaskPriority","priority","TaskStatus","completedAt","completedById","doctorName","specialty","clinicName","locationAddress","appointmentDate","AppointmentStatus","reminderMinutesBefore","reminderSent","outcomeSummary","createdById","medicationId","currentStock","unit","refillThreshold","packageSize","lastRefillDate","scheduleId","scheduledAt","DoseStatus","confirmedAt","confirmedById","confirmationNotes","escalationLevel","escalatedAt","idempotencyKey","ScheduleFrequency","frequency","timesOfDay","daysOfWeek","startDate","endDate","dosageQuantity","instructions","isActive","has","hasEvery","hasSome","name","brandName","genericName","MedicationForm","form","strength","dosageInstructions","prescribingDoctor","prescribingClinic","rxNumber","purpose","isArchived","discontinuedReason","CircleRole","role","token","InvitationStatus","invitedById","acceptedAt","permissions","joinedAt","preferredName","dateOfBirth","gender","bloodGroup","allergies","medicalConditions","emergencyContactName","emergencyContactPhone","emergencyContactRelation","avatarUrl","isSeniorModeActive","seniorPin","passwordHash","UserRole","phoneNumber","isEmailVerified","emailVerified","every","some","none","elderlyProfileId_caretakerId","careCircleId_userId","is","isNot","connectOrCreate","upsert","createMany","set","disconnect","delete","connect","updateMany","deleteMany","push","increment","decrement","multiply","divide"]'),
  graph: "wAukAaACIBcAAI0FACAYAACOBQAgGwAAjwUAIB8AAKcFACAgAACHBQAgIQAAqAUAICIAAKkFACAjAACJBQAgJAAAiwUAICUAAIsFACAmAACMBQAgJwAAjAUAICgAAIoFACApAACqBQAgKwAAqwUAICwAAKwFACAtAACPBQAg1gIAAKUFADDXAgAAGAAQ2AIAAKUFADDZAgEAAAAB4wJAALwEACHkAkAAvAQAIf4CAQAAAAHNAyAAxgQAIdEDAQC7BAAh3wMAAKYF9AMi7wMBAOUEACHyAwEAuwQAIfQDAQDlBAAh9QMgAMYEACH2A0AA5AQAIQEAAAABACANFQAAkwUAIBYAAMcEACDWAgAAuAUAMNcCAAADABDYAgAAuAUAMNkCAQC7BAAh5AJAALwEACHwAgEAuwQAIYMDAQC7BAAhzQMgAMYEACHfAwAAkQXfAyLkAwAA7QQAIOUDQAC8BAAhAhUAAPkJACAWAADpBQAgDhUAAJMFACAWAADHBAAg1gIAALgFADDXAgAAAwAQ2AIAALgFADDZAgEAAAAB5AJAALwEACHwAgEAuwQAIYMDAQC7BAAhzQMgAMYEACHfAwAAkQXfAyLkAwAA7QQAIOUDQAC8BAAh-wMAALcFACADAAAAAwAgAQAABAAwAgAABQAgDgMAAMcEACAFAACXBQAgFwAAjQUAIBwAAKcFACAeAACoBQAg1gIAALYFADDXAgAABwAQ2AIAALYFADDZAgEAuwQAIdoCAQC7BAAh4wJAALwEACHkAkAAvAQAIbUDAQC7BAAh0QMBALsEACEFAwAA6QUAIAUAAPoJACAXAAD0CQAgHAAA6gkAIB4AAOwJACAOAwAAxwQAIAUAAJcFACAXAACNBQAgHAAApwUAIB4AAKgFACDWAgAAtgUAMNcCAAAHABDYAgAAtgUAMNkCAQAAAAHaAgEAuwQAIeMCQAC8BAAh5AJAALwEACG1AwEAuwQAIdEDAQC7BAAhAwAAAAcAIAEAAAgAMAIAAAkAIBcFAACXBQAgCQAAiQUAIAsAALQFACAMAAC1BQAg1gIAALIFADDXAgAACwAQ2AIAALIFADDZAgEAuwQAIdoCAQC7BAAh4wJAALwEACHkAkAAvAQAIdEDAQC7BAAh0gMBAOUEACHTAwEA5QQAIdUDAACzBdUDItYDAQC7BAAh1wMBALsEACHYAwEA5QQAIdkDAQDlBAAh2gMBAOUEACHbAwEA5QQAIdwDIADGBAAh3QMBAOUEACELBQAA-gkAIAkAAO4JACALAAD8CQAgDAAA_QkAINIDAAC5BQAg0wMAALkFACDYAwAAuQUAINkDAAC5BQAg2gMAALkFACDbAwAAuQUAIN0DAAC5BQAgFwUAAJcFACAJAACJBQAgCwAAtAUAIAwAALUFACDWAgAAsgUAMNcCAAALABDYAgAAsgUAMNkCAQAAAAHaAgEAuwQAIeMCQAC8BAAh5AJAALwEACHRAwEAuwQAIdIDAQDlBAAh0wMBAOUEACHVAwAAswXVAyLWAwEAuwQAIdcDAQC7BAAh2AMBAOUEACHZAwEA5QQAIdoDAQDlBAAh2wMBAOUEACHcAyAAxgQAId0DAQDlBAAhAwAAAAsAIAEAAAwAMAIAAA0AIBEGAADmBAAgCQAAiQUAINYCAACwBQAw1wIAAA8AENgCAACwBQAw2QIBALsEACHjAkAAvAQAIeQCQAC8BAAhtgMBALsEACHGAwAAsQXGAyLHAwAA7QQAIMgDAADuBAAgyQNAALwEACHKA0AA5AQAIcsDCADiBAAhzAMBAOUEACHNAyAAxgQAIQQGAACaBgAgCQAA7gkAIMoDAAC5BQAgzAMAALkFACARBgAA5gQAIAkAAIkFACDWAgAAsAUAMNcCAAAPABDYAgAAsAUAMNkCAQAAAAHjAkAAvAQAIeQCQAC8BAAhtgMBALsEACHGAwAAsQXGAyLHAwAA7QQAIMgDAADuBAAgyQNAALwEACHKA0AA5AQAIcsDCADiBAAhzAMBAOUEACHNAyAAxgQAIQMAAAAPACABAAAQADACAAARACAWBQAAlwUAIAYAAOYEACAHAACvBQAgCAAAhQUAINYCAACtBQAw1wIAABMAENgCAACtBQAw2QIBALsEACHaAgEAuwQAId4CAACuBb8DIuMCQAC8BAAh5AJAALwEACGUAwIAvQQAIbYDAQC7BAAhvAMBAOUEACG9A0AAvAQAIb8DQADkBAAhwAMBAOUEACHBAwEA5QQAIcIDAgC9BAAhwwNAAOQEACHEAwEA5QQAIQoFAAD6CQAgBgAAmgYAIAcAAPsJACAIAADpBQAgvAMAALkFACC_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_gIBALsEACGAA0AAvAQAIYMDAQC7BAAh3wMAAJEF3wMi4AMBALsEACHiAwEAuwQAIeMDQADkBAAhAxUAAPkJACAdAADpBQAg4wMAALkFACAQFQAAkwUAIB0AAMcEACDWAgAAkAUAMNcCAABLABDYAgAAkAUAMNkCAQAAAAHeAgAAkgXiAyLjAkAAvAQAIeQCQAC8BAAh_gIBALsEACGAA0AAvAQAIYMDAQC7BAAh3wMAAJEF3wMi4AMBAAAAAeIDAQC7BAAh4wNAAOQEACEDAAAASwAgAQAATAAwAgAATQAgAwAAADAAIAEAADEAMAIAADIAIAEAAAADACABAAAASwAgAQAAADAAIAMAAAAHACABAAAIADACAAAJACADAAAASwAgAQAATAAwAgAATQAgEQMAAOkFACAEAADrCQAgCQAA7gkAIA0AAPgJACAOAADxCQAgEQAA7wkAIBQAAPAJACAXAAD0CQAgGAAA8gkAIBsAAPcJACDfAgAAuQUAIOYDAAC5BQAg6AMAALkFACDpAwAAuQUAIO4DAAC5BQAg7wMAALkFACDxAwAAuQUAIB8DAADHBAAgBAAAhwUAIAkAAIkFACANAACIBQAgDgAAigUAIBEAAIsFACAUAACMBQAgFwAAjQUAIBgAAI4FACAbAACPBQAg1gIAAIYFADDXAgAANAAQ2AIAAIYFADDZAgEAAAAB3wIBAOUEACHjAkAAvAQAIeQCQAC8BAAhtQMBALsEACHRAwEAuwQAIeYDAQDlBAAh5wNAALwEACHoAwEA5QQAIekDAQDlBAAh6gMAAO0EACDrAwAA7QQAIOwDAQC7BAAh7QMBALsEACHuAwEA5QQAIe8DAQDlBAAh8AMgAMYEACHxAwEA5QQAIQMAAAA0ACABAABVADACAABWACADAAAAEwAgAQAAFAAwAgAAFQAgAwAAACUAIAEAACYAMAIAACcAIAMAAAAlACABAAAmADACAAAnACADAAAAKwAgAQAALAAwAgAALQAgAwAAACsAIAEAACwAMAIAAC0AIAMAAAAhACABAAAiADACAAAjACADAAAAOAAgAQAAOQAwAgAAOgAgDRYAAMcEACDWAgAAxQQAMNcCAABfABDYAgAAxQQAMNkCAQC7BAAh5AJAALwEACHwAgEAuwQAIY8DIADGBAAhkAMgAMYEACGRAyAAxgQAIZIDIADGBAAhkwMgAMYEACGUAwIAvQQAIQEAAABfACADAAAAMAAgAQAAMQAwAgAAMgAgFxYAAMcEACAqAACFBQAg1gIAAIMFADDXAgAAYgAQ2AIAAIMFADDZAgEAuwQAId4CAACEBfwCIuACAQDlBAAh4wJAALwEACHkAkAAvAQAIfACAQC7BAAh8QIBALsEACHyAgEAuwQAIfMCAQC7BAAh9AIBAOUEACH1AgEAuwQAIfYCAQDlBAAh9wIBALsEACH4AgEAuwQAIfkCAQC7BAAh-gICAL0EACH8AgEA5QQAIf0CQADkBAAhAQAAAGIAIAEAAAAYACAHFgAA6QUAICoAAOkFACDgAgAAuQUAIPQCAAC5BQAg9gIAALkFACD8AgAAuQUAIP0CAAC5BQAgFxYAAMcEACAqAACFBQAg1gIAAIMFADDXAgAAYgAQ2AIAAIMFADDZAgEAAAAB3gIAAIQF_AIi4AIBAOUEACHjAkAAvAQAIeQCQAC8BAAh8AIBAAAAAfECAQC7BAAh8gIBALsEACHzAgEAuwQAIfQCAQDlBAAh9QIBALsEACH2AgEA5QQAIfcCAQC7BAAh-AIBALsEACH5AgEAuwQAIfoCAgC9BAAh_AIBAOUEACH9AkAA5AQAIQMAAABiACABAABlADACAABmACADAAAAPQAgAQAAPgAwAgAAPwAgAwAAAD0AIAEAAD4AMAIAAD8AIAEAAAADACABAAAABwAgAQAAAEsAIAEAAAA0ACABAAAAEwAgAQAAACUAIAEAAAAlACABAAAAKwAgAQAAACsAIAEAAAAhACABAAAAOAAgAQAAADAAIAEAAABiACABAAAAPQAgAQAAAD0AIAEAAAABACAUFwAA9AkAIBgAAPIJACAbAAD3CQAgHwAA6gkAICAAAOsJACAhAADsCQAgIgAA7QkAICMAAO4JACAkAADvCQAgJQAA7wkAICYAAPAJACAnAADwCQAgKAAA8QkAICkAAPMJACArAAD1CQAgLAAA9gkAIC0AAPcJACDvAwAAuQUAIPQDAAC5BQAg9gMAALkFACADAAAAGAAgAQAAegAwAgAAAQAgAwAAABgAIAEAAHoAMAIAAAEAIAMAAAAYACABAAB6ADACAAABACAdFwAA5QkAIBgAAOMJACAbAADoCQAgHwAA2QkAICAAANoJACAhAADbCQAgIgAA3AkAICMAAN0JACAkAADeCQAgJQAA3wkAICYAAOAJACAnAADhCQAgKAAA4gkAICkAAOQJACArAADmCQAgLAAA5wkAIC0AAOkJACDZAgEAAAAB4wJAAAAAAeQCQAAAAAH-AgEAAAABzQMgAAAAAdEDAQAAAAHfAwAAAPQDAu8DAQAAAAHyAwEAAAAB9AMBAAAAAfUDIAAAAAH2A0AAAAABATMAAH4AIAzZAgEAAAAB4wJAAAAAAeQCQAAAAAH-AgEAAAABzQMgAAAAAdEDAQAAAAHfAwAAAPQDAu8DAQAAAAHyAwEAAAAB9AMBAAAAAfUDIAAAAAH2A0AAAAABATMAAIABADABMwAAgAEAMB0XAAC9CAAgGAAAuwgAIBsAAMAIACAfAACxCAAgIAAAsggAICEAALMIACAiAAC0CAAgIwAAtQgAICQAALYIACAlAAC3CAAgJgAAuAgAICcAALkIACAoAAC6CAAgKQAAvAgAICsAAL4IACAsAAC_CAAgLQAAwQgAINkCAQC9BQAh4wJAAMAFACHkAkAAwAUAIf4CAQC9BQAhzQMgAOYFACHRAwEAvQUAId8DAACwCPQDIu8DAQC_BQAh8gMBAL0FACH0AwEAvwUAIfUDIADmBQAh9gNAAMEFACECAAAAAQAgMwAAgwEAIAzZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhAgAAABgAIDMAAIUBACACAAAAGAAgMwAAhQEAIAMAAAABACA6AAB-ACA7AACDAQAgAQAAAAEAIAEAAAAYACAGCgAArQgAIEAAAK8IACBBAACuCAAg7wMAALkFACD0AwAAuQUAIPYDAAC5BQAgD9YCAAD_BAAw1wIAAIwBABDYAgAA_wQAMNkCAQChBAAh4wJAAKQEACHkAkAApAQAIf4CAQChBAAhzQMgAMIEACHRAwEAoQQAId8DAACABfQDIu8DAQCjBAAh8gMBAKEEACH0AwEAowQAIfUDIADCBAAh9gNAAKUEACEDAAAAGAAgAQAAiwEAMD8AAIwBACADAAAAGAAgAQAAegAwAgAAAQAgAQAAAFYAIAEAAABWACADAAAANAAgAQAAVQAwAgAAVgAgAwAAADQAIAEAAFUAMAIAAFYAIAMAAAA0ACABAABVADACAABWACAcAwAAowgAIAQAAKQIACAJAACmCAAgDQAApQgAIA4AAKcIACARAACoCAAgFAAAqQgAIBcAAKoIACAYAACrCAAgGwAArAgAINkCAQAAAAHfAgEAAAAB4wJAAAAAAeQCQAAAAAG1AwEAAAAB0QMBAAAAAeYDAQAAAAHnA0AAAAAB6AMBAAAAAekDAQAAAAHqAwAAoQgAIOsDAACiCAAg7AMBAAAAAe0DAQAAAAHuAwEAAAAB7wMBAAAAAfADIAAAAAHxAwEAAAABATMAAJQBACAS2QIBAAAAAd8CAQAAAAHjAkAAAAAB5AJAAAAAAbUDAQAAAAHRAwEAAAAB5gMBAAAAAecDQAAAAAHoAwEAAAAB6QMBAAAAAeoDAAChCAAg6wMAAKIIACDsAwEAAAAB7QMBAAAAAe4DAQAAAAHvAwEAAAAB8AMgAAAAAfEDAQAAAAEBMwAAlgEAMAEzAACWAQAwHAMAALEHACAEAACyBwAgCQAAtAcAIA0AALMHACAOAAC1BwAgEQAAtgcAIBQAALcHACAXAAC4BwAgGAAAuQcAIBsAALoHACDZAgEAvQUAId8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIbUDAQC9BQAh0QMBAL0FACHmAwEAvwUAIecDQADABQAh6AMBAL8FACHpAwEAvwUAIeoDAACvBwAg6wMAALAHACDsAwEAvQUAIe0DAQC9BQAh7gMBAL8FACHvAwEAvwUAIfADIADmBQAh8QMBAL8FACECAAAAVgAgMwAAmQEAIBLZAgEAvQUAId8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIbUDAQC9BQAh0QMBAL0FACHmAwEAvwUAIecDQADABQAh6AMBAL8FACHpAwEAvwUAIeoDAACvBwAg6wMAALAHACDsAwEAvQUAIe0DAQC9BQAh7gMBAL8FACHvAwEAvwUAIfADIADmBQAh8QMBAL8FACECAAAANAAgMwAAmwEAIAIAAAA0ACAzAACbAQAgAwAAAFYAIDoAAJQBACA7AACZAQAgAQAAAFYAIAEAAAA0ACAKCgAArAcAIEAAAK4HACBBAACtBwAg3wIAALkFACDmAwAAuQUAIOgDAAC5BQAg6QMAALkFACDuAwAAuQUAIO8DAAC5BQAg8QMAALkFACAV1gIAAP4EADDXAgAAogEAENgCAAD-BAAw2QIBAKEEACHfAgEAowQAIeMCQACkBAAh5AJAAKQEACG1AwEAoQQAIdEDAQChBAAh5gMBAKMEACHnA0AApAQAIegDAQCjBAAh6QMBAKMEACHqAwAA7QQAIOsDAADtBAAg7AMBAKEEACHtAwEAoQQAIe4DAQCjBAAh7wMBAKMEACHwAyAAwgQAIfEDAQCjBAAhAwAAADQAIAEAAKEBADA_AACiAQAgAwAAADQAIAEAAFUAMAIAAFYAIAEAAAAJACABAAAACQAgAwAAAAcAIAEAAAgAMAIAAAkAIAMAAAAHACABAAAIADACAAAJACADAAAABwAgAQAACAAwAgAACQAgCwMAAKgHACAFAACnBwAgFwAAqwcAIBwAAKkHACAeAACqBwAg2QIBAAAAAdoCAQAAAAHjAkAAAAAB5AJAAAAAAbUDAQAAAAHRAwEAAAABATMAAKoBACAG2QIBAAAAAdoCAQAAAAHjAkAAAAAB5AJAAAAAAbUDAQAAAAHRAwEAAAABATMAAKwBADABMwAArAEAMAsDAAD_BgAgBQAA_gYAIBcAAIIHACAcAACABwAgHgAAgQcAINkCAQC9BQAh2gIBAL0FACHjAkAAwAUAIeQCQADABQAhtQMBAL0FACHRAwEAvQUAIQIAAAAJACAzAACvAQAgBtkCAQC9BQAh2gIBAL0FACHjAkAAwAUAIeQCQADABQAhtQMBAL0FACHRAwEAvQUAIQIAAAAHACAzAACxAQAgAgAAAAcAIDMAALEBACADAAAACQAgOgAAqgEAIDsAAK8BACABAAAACQAgAQAAAAcAIAMKAAD7BgAgQAAA_QYAIEEAAPwGACAJ1gIAAP0EADDXAgAAuAEAENgCAAD9BAAw2QIBAKEEACHaAgEAoQQAIeMCQACkBAAh5AJAAKQEACG1AwEAoQQAIdEDAQChBAAhAwAAAAcAIAEAALcBADA_AAC4AQAgAwAAAAcAIAEAAAgAMAIAAAkAIAEAAAAFACABAAAABQAgAwAAAAMAIAEAAAQAMAIAAAUAIAMAAAADACABAAAEADACAAAFACADAAAAAwAgAQAABAAwAgAABQAgChUAAPkGACAWAAD6BgAg2QIBAAAAAeQCQAAAAAHwAgEAAAABgwMBAAAAAc0DIAAAAAHfAwAAAN8DAuQDAAD4BgAg5QNAAAAAAQEzAADAAQAgCNkCAQAAAAHkAkAAAAAB8AIBAAAAAYMDAQAAAAHNAyAAAAAB3wMAAADfAwLkAwAA-AYAIOUDQAAAAAEBMwAAwgEAMAEzAADCAQAwChUAAPYGACAWAAD3BgAg2QIBAL0FACHkAkAAwAUAIfACAQC9BQAhgwMBAL0FACHNAyAA5gUAId8DAADsBt8DIuQDAAD1BgAg5QNAAMAFACECAAAABQAgMwAAxQEAIAjZAgEAvQUAIeQCQADABQAh8AIBAL0FACGDAwEAvQUAIc0DIADmBQAh3wMAAOwG3wMi5AMAAPUGACDlA0AAwAUAIQIAAAADACAzAADHAQAgAgAAAAMAIDMAAMcBACADAAAABQAgOgAAwAEAIDsAAMUBACABAAAABQAgAQAAAAMAIAMKAADyBgAgQAAA9AYAIEEAAPMGACAL1gIAAPwEADDXAgAAzgEAENgCAAD8BAAw2QIBAKEEACHkAkAApAQAIfACAQChBAAhgwMBAKEEACHNAyAAwgQAId8DAAD2BN8DIuQDAADtBAAg5QNAAKQEACEDAAAAAwAgAQAAzQEAMD8AAM4BACADAAAAAwAgAQAABAAwAgAABQAgAQAAAE0AIAEAAABNACADAAAASwAgAQAATAAwAgAATQAgAwAAAEsAIAEAAEwAMAIAAE0AIAMAAABLACABAABMADACAABNACANFQAA8AYAIB0AAPEGACDZAgEAAAAB3gIAAADiAwLjAkAAAAAB5AJAAAAAAf4CAQAAAAGAA0AAAAABgwMBAAAAAd8DAAAA3wMC4AMBAAAAAeIDAQAAAAHjA0AAAAABATMAANYBACAL2QIBAAAAAd4CAAAA4gMC4wJAAAAAAeQCQAAAAAH-AgEAAAABgANAAAAAAYMDAQAAAAHfAwAAAN8DAuADAQAAAAHiAwEAAAAB4wNAAAAAAQEzAADYAQAwATMAANgBADANFQAA7gYAIB0AAO8GACDZAgEAvQUAId4CAADtBuIDIuMCQADABQAh5AJAAMAFACH-AgEAvQUAIYADQADABQAhgwMBAL0FACHfAwAA7AbfAyLgAwEAvQUAIeIDAQC9BQAh4wNAAMEFACECAAAATQAgMwAA2wEAIAvZAgEAvQUAId4CAADtBuIDIuMCQADABQAh5AJAAMAFACH-AgEAvQUAIYADQADABQAhgwMBAL0FACHfAwAA7AbfAyLgAwEAvQUAIeIDAQC9BQAh4wNAAMEFACECAAAASwAgMwAA3QEAIAIAAABLACAzAADdAQAgAwAAAE0AIDoAANYBACA7AADbAQAgAQAAAE0AIAEAAABLACAECgAA6QYAIEAAAOsGACBBAADqBgAg4wMAALkFACAO1gIAAPUEADDXAgAA5AEAENgCAAD1BAAw2QIBAKEEACHeAgAA9wTiAyLjAkAApAQAIeQCQACkBAAh_gIBAKEEACGAA0AApAQAIYMDAQChBAAh3wMAAPYE3wMi4AMBAKEEACHiAwEAoQQAIeMDQAClBAAhAwAAAEsAIAEAAOMBADA_AADkAQAgAwAAAEsAIAEAAEwAMAIAAE0AIAEAAAANACABAAAADQAgAwAAAAsAIAEAAAwAMAIAAA0AIAMAAAALACABAAAMADACAAANACADAAAACwAgAQAADAAwAgAADQAgFAUAAOUGACAJAADnBgAgCwAA5gYAIAwAAOgGACDZAgEAAAAB2gIBAAAAAeMCQAAAAAHkAkAAAAAB0QMBAAAAAdIDAQAAAAHTAwEAAAAB1QMAAADVAwLWAwEAAAAB1wMBAAAAAdgDAQAAAAHZAwEAAAAB2gMBAAAAAdsDAQAAAAHcAyAAAAAB3QMBAAAAAQEzAADsAQAgENkCAQAAAAHaAgEAAAAB4wJAAAAAAeQCQAAAAAHRAwEAAAAB0gMBAAAAAdMDAQAAAAHVAwAAANUDAtYDAQAAAAHXAwEAAAAB2AMBAAAAAdkDAQAAAAHaAwEAAAAB2wMBAAAAAdwDIAAAAAHdAwEAAAABATMAAO4BADABMwAA7gEAMBQFAADHBgAgCQAAyQYAIAsAAMgGACAMAADKBgAg2QIBAL0FACHaAgEAvQUAIeMCQADABQAh5AJAAMAFACHRAwEAvQUAIdIDAQC_BQAh0wMBAL8FACHVAwAAxgbVAyLWAwEAvQUAIdcDAQC9BQAh2AMBAL8FACHZAwEAvwUAIdoDAQC_BQAh2wMBAL8FACHcAyAA5gUAId0DAQC_BQAhAgAAAA0AIDMAAPEBACAQ2QIBAL0FACHaAgEAvQUAIeMCQADABQAh5AJAAMAFACHRAwEAvQUAIdIDAQC_BQAh0wMBAL8FACHVAwAAxgbVAyLWAwEAvQUAIdcDAQC9BQAh2AMBAL8FACHZAwEAvwUAIdoDAQC_BQAh2wMBAL8FACHcAyAA5gUAId0DAQC_BQAhAgAAAAsAIDMAAPMBACACAAAACwAgMwAA8wEAIAMAAAANACA6AADsAQAgOwAA8QEAIAEAAAANACABAAAACwAgCgoAAMMGACBAAADFBgAgQQAAxAYAINIDAAC5BQAg0wMAALkFACDYAwAAuQUAINkDAAC5BQAg2gMAALkFACDbAwAAuQUAIN0DAAC5BQAgE9YCAADxBAAw1wIAAPoBABDYAgAA8QQAMNkCAQChBAAh2gIBAKEEACHjAkAApAQAIeQCQACkBAAh0QMBAKEEACHSAwEAowQAIdMDAQCjBAAh1QMAAPIE1QMi1gMBAKEEACHXAwEAoQQAIdgDAQCjBAAh2QMBAKMEACHaAwEAowQAIdsDAQCjBAAh3AMgAMIEACHdAwEAowQAIQMAAAALACABAAD5AQAwPwAA-gEAIAMAAAALACABAAAMADACAAANACABAAAAEQAgAQAAABEAIAMAAAAPACABAAAQADACAAARACADAAAADwAgAQAAEAAwAgAAEQAgAwAAAA8AIAEAABAAMAIAABEAIA4GAADBBgAgCQAAwgYAINkCAQAAAAHjAkAAAAAB5AJAAAAAAbYDAQAAAAHGAwAAAMYDAscDAAC_BgAgyAMAAMAGACDJA0AAAAABygNAAAAAAcsDCAAAAAHMAwEAAAABzQMgAAAAAQEzAACCAgAgDNkCAQAAAAHjAkAAAAAB5AJAAAAAAbYDAQAAAAHGAwAAAMYDAscDAAC_BgAgyAMAAMAGACDJA0AAAAABygNAAAAAAcsDCAAAAAHMAwEAAAABzQMgAAAAAQEzAACEAgAwATMAAIQCADAOBgAAsQYAIAkAALIGACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACG2AwEAvQUAIcYDAACuBsYDIscDAACvBgAgyAMAALAGACDJA0AAwAUAIcoDQADBBQAhywMIAJYGACHMAwEAvwUAIc0DIADmBQAhAgAAABEAIDMAAIcCACAM2QIBAL0FACHjAkAAwAUAIeQCQADABQAhtgMBAL0FACHGAwAArgbGAyLHAwAArwYAIMgDAACwBgAgyQNAAMAFACHKA0AAwQUAIcsDCACWBgAhzAMBAL8FACHNAyAA5gUAIQIAAAAPACAzAACJAgAgAgAAAA8AIDMAAIkCACADAAAAEQAgOgAAggIAIDsAAIcCACABAAAAEQAgAQAAAA8AIAcKAACpBgAgQAAArAYAIEEAAKsGACCiAQAAqgYAIKMBAACtBgAgygMAALkFACDMAwAAuQUAIA_WAgAA6wQAMNcCAACQAgAQ2AIAAOsEADDZAgEAoQQAIeMCQACkBAAh5AJAAKQEACG2AwEAoQQAIcYDAADsBMYDIscDAADtBAAgyAMAAO4EACDJA0AApAQAIcoDQAClBAAhywMIANwEACHMAwEAowQAIc0DIADCBAAhAwAAAA8AIAEAAI8CADA_AACQAgAgAwAAAA8AIAEAABAAMAIAABEAIAEAAAAVACABAAAAFQAgAwAAABMAIAEAABQAMAIAABUAIAMAAAATACABAAAUADACAAAVACADAAAAEwAgAQAAFAAwAgAAFQAgEwUAAKcGACAGAAClBgAgBwAApgYAIAgAAKgGACDZAgEAAAAB2gIBAAAAAd4CAAAAvwMC4wJAAAAAAeQCQAAAAAGUAwIAAAABtgMBAAAAAbwDAQAAAAG9A0AAAAABvwNAAAAAAcADAQAAAAHBAwEAAAABwgMCAAAAAcMDQAAAAAHEAwEAAAABATMAAJgCACAP2QIBAAAAAdoCAQAAAAHeAgAAAL8DAuMCQAAAAAHkAkAAAAABlAMCAAAAAbYDAQAAAAG8AwEAAAABvQNAAAAAAb8DQAAAAAHAAwEAAAABwQMBAAAAAcIDAgAAAAHDA0AAAAABxAMBAAAAAQEzAACaAgAwATMAAJoCADABAAAADwAgAQAAABgAIBMFAACjBgAgBgAAoQYAIAcAAKIGACAIAACkBgAg2QIBAL0FACHaAgEAvQUAId4CAACgBr8DIuMCQADABQAh5AJAAMAFACGUAwIAzQUAIbYDAQC9BQAhvAMBAL8FACG9A0AAwAUAIb8DQADBBQAhwAMBAL8FACHBAwEAvwUAIcIDAgDNBQAhwwNAAMEFACHEAwEAvwUAIQIAAAAVACAzAACfAgAgD9kCAQC9BQAh2gIBAL0FACHeAgAAoAa_AyLjAkAAwAUAIeQCQADABQAhlAMCAM0FACG2AwEAvQUAIbwDAQC_BQAhvQNAAMAFACG_A0AAwQUAIcADAQC_BQAhwQMBAL8FACHCAwIAzQUAIcMDQADBBQAhxAMBAL8FACECAAAAEwAgMwAAoQIAIAIAAAATACAzAAChAgAgAQAAAA8AIAEAAAAYACADAAAAFQAgOgAAmAIAIDsAAJ8CACABAAAAFQAgAQAAABMAIAsKAACbBgAgQAAAngYAIEEAAJ0GACCiAQAAnAYAIKMBAACfBgAgvAMAALkFACC_AwAAuQUAIMADAAC5BQAgwQMAALkFACDDAwAAuQUAIMQDAAC5BQAgEtYCAADnBAAw1wIAAKoCABDYAgAA5wQAMNkCAQChBAAh2gIBAKEEACHeAgAA6AS_AyLjAkAApAQAIeQCQACkBAAhlAMCALMEACG2AwEAoQQAIbwDAQCjBAAhvQNAAKQEACG_A0AApQQAIcADAQCjBAAhwQMBAKMEACHCAwIAswQAIcMDQAClBAAhxAMBAKMEACEDAAAAEwAgAQAAqQIAMD8AAKoCACADAAAAEwAgAQAAFAAwAgAAFQAgDgYAAOYEACDWAgAA4QQAMNcCAAAcABDYAgAA4QQAMNkCAQAAAAHfAgEA5QQAIeMCQAC8BAAh5AJAALwEACG2AwEAAAABtwMIAOIEACG4AwEAuwQAIbkDCADiBAAhugMIAOMEACG7A0AA5AQAIQEAAACtAgAgAQAAAK0CACAEBgAAmgYAIN8CAAC5BQAgugMAALkFACC7AwAAuQUAIAMAAAAcACABAACwAgAwAgAArQIAIAMAAAAcACABAACwAgAwAgAArQIAIAMAAAAcACABAACwAgAwAgAArQIAIAsGAACZBgAg2QIBAAAAAd8CAQAAAAHjAkAAAAAB5AJAAAAAAbYDAQAAAAG3AwgAAAABuAMBAAAAAbkDCAAAAAG6AwgAAAABuwNAAAAAAQEzAAC0AgAgCtkCAQAAAAHfAgEAAAAB4wJAAAAAAeQCQAAAAAG2AwEAAAABtwMIAAAAAbgDAQAAAAG5AwgAAAABugMIAAAAAbsDQAAAAAEBMwAAtgIAMAEzAAC2AgAwCwYAAJgGACDZAgEAvQUAId8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIbYDAQC9BQAhtwMIAJYGACG4AwEAvQUAIbkDCACWBgAhugMIAJcGACG7A0AAwQUAIQIAAACtAgAgMwAAuQIAIArZAgEAvQUAId8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIbYDAQC9BQAhtwMIAJYGACG4AwEAvQUAIbkDCACWBgAhugMIAJcGACG7A0AAwQUAIQIAAAAcACAzAAC7AgAgAgAAABwAIDMAALsCACADAAAArQIAIDoAALQCACA7AAC5AgAgAQAAAK0CACABAAAAHAAgCAoAAJEGACBAAACUBgAgQQAAkwYAIKIBAACSBgAgowEAAJUGACDfAgAAuQUAILoDAAC5BQAguwMAALkFACAN1gIAANsEADDXAgAAwgIAENgCAADbBAAw2QIBAKEEACHfAgEAowQAIeMCQACkBAAh5AJAAKQEACG2AwEAoQQAIbcDCADcBAAhuAMBAKEEACG5AwgA3AQAIboDCADdBAAhuwNAAKUEACEDAAAAHAAgAQAAwQIAMD8AAMICACADAAAAHAAgAQAAsAIAMAIAAK0CACABAAAAIwAgAQAAACMAIAMAAAAhACABAAAiADACAAAjACADAAAAIQAgAQAAIgAwAgAAIwAgAwAAACEAIAEAACIAMAIAACMAIBIDAACQBgAgBQAAjwYAINkCAQAAAAHaAgEAAAAB3gIAAACyAwLfAgEAAAAB4wJAAAAAAeQCQAAAAAGXAwEAAAABrAMBAAAAAa0DAQAAAAGuAwEAAAABrwMBAAAAAbADQAAAAAGyAwIAAAABswMgAAAAAbQDAQAAAAG1AwEAAAABATMAAMoCACAQ2QIBAAAAAdoCAQAAAAHeAgAAALIDAt8CAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGsAwEAAAABrQMBAAAAAa4DAQAAAAGvAwEAAAABsANAAAAAAbIDAgAAAAGzAyAAAAABtAMBAAAAAbUDAQAAAAEBMwAAzAIAMAEzAADMAgAwEgMAAI4GACAFAACNBgAg2QIBAL0FACHaAgEAvQUAId4CAACMBrIDIt8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIZcDAQC9BQAhrAMBAL0FACGtAwEAvwUAIa4DAQC9BQAhrwMBAL8FACGwA0AAwAUAIbIDAgDNBQAhswMgAOYFACG0AwEAvwUAIbUDAQC9BQAhAgAAACMAIDMAAM8CACAQ2QIBAL0FACHaAgEAvQUAId4CAACMBrIDIt8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIZcDAQC9BQAhrAMBAL0FACGtAwEAvwUAIa4DAQC9BQAhrwMBAL8FACGwA0AAwAUAIbIDAgDNBQAhswMgAOYFACG0AwEAvwUAIbUDAQC9BQAhAgAAACEAIDMAANECACACAAAAIQAgMwAA0QIAIAMAAAAjACA6AADKAgAgOwAAzwIAIAEAAAAjACABAAAAIQAgCQoAAIcGACBAAACKBgAgQQAAiQYAIKIBAACIBgAgowEAAIsGACDfAgAAuQUAIK0DAAC5BQAgrwMAALkFACC0AwAAuQUAIBPWAgAA1wQAMNcCAADYAgAQ2AIAANcEADDZAgEAoQQAIdoCAQChBAAh3gIAANgEsgMi3wIBAKMEACHjAkAApAQAIeQCQACkBAAhlwMBAKEEACGsAwEAoQQAIa0DAQCjBAAhrgMBAKEEACGvAwEAowQAIbADQACkBAAhsgMCALMEACGzAyAAwgQAIbQDAQCjBAAhtQMBAKEEACEDAAAAIQAgAQAA1wIAMD8AANgCACADAAAAIQAgAQAAIgAwAgAAIwAgAQAAACcAIAEAAAAnACADAAAAJQAgAQAAJgAwAgAAJwAgAwAAACUAIAEAACYAMAIAACcAIAMAAAAlACABAAAmADACAAAnACAQBQAAhAYAIA8AAIUGACAQAACGBgAg2QIBAAAAAdoCAQAAAAHeAgAAAKoDAt8CAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGkAwEAAAABpQMBAAAAAaYDQAAAAAGoAwAAAKgDAqoDQAAAAAGrAwEAAAABATMAAOACACAN2QIBAAAAAdoCAQAAAAHeAgAAAKoDAt8CAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGkAwEAAAABpQMBAAAAAaYDQAAAAAGoAwAAAKgDAqoDQAAAAAGrAwEAAAABATMAAOICADABMwAA4gIAMAEAAAAYACABAAAAGAAgEAUAAIEGACAPAACCBgAgEAAAgwYAINkCAQC9BQAh2gIBAL0FACHeAgAAgAaqAyLfAgEAvwUAIeMCQADABQAh5AJAAMAFACGXAwEAvQUAIaQDAQC_BQAhpQMBAL8FACGmA0AAwAUAIagDAAD_BagDIqoDQADBBQAhqwMBAL8FACECAAAAJwAgMwAA5wIAIA3ZAgEAvQUAIdoCAQC9BQAh3gIAAIAGqgMi3wIBAL8FACHjAkAAwAUAIeQCQADABQAhlwMBAL0FACGkAwEAvwUAIaUDAQC_BQAhpgNAAMAFACGoAwAA_wWoAyKqA0AAwQUAIasDAQC_BQAhAgAAACUAIDMAAOkCACACAAAAJQAgMwAA6QIAIAEAAAAYACABAAAAGAAgAwAAACcAIDoAAOACACA7AADnAgAgAQAAACcAIAEAAAAlACAICgAA_AUAIEAAAP4FACBBAAD9BQAg3wIAALkFACCkAwAAuQUAIKUDAAC5BQAgqgMAALkFACCrAwAAuQUAIBDWAgAA0AQAMNcCAADyAgAQ2AIAANAEADDZAgEAoQQAIdoCAQChBAAh3gIAANIEqgMi3wIBAKMEACHjAkAApAQAIeQCQACkBAAhlwMBAKEEACGkAwEAowQAIaUDAQCjBAAhpgNAAKQEACGoAwAA0QSoAyKqA0AApQQAIasDAQCjBAAhAwAAACUAIAEAAPECADA_AADyAgAgAwAAACUAIAEAACYAMAIAACcAIAEAAAAtACABAAAALQAgAwAAACsAIAEAACwAMAIAAC0AIAMAAAArACABAAAsADACAAAtACADAAAAKwAgAQAALAAwAgAALQAgDgUAAPkFACASAAD6BQAgEwAA-wUAINkCAQAAAAHaAgEAAAAB4wJAAAAAAeQCQAAAAAGXAwEAAAABnQMBAAAAAZ8DAAAAnwMCoAMBAAAAAaEDgAAAAAGiAyAAAAABowMBAAAAAQEzAAD6AgAgC9kCAQAAAAHaAgEAAAAB4wJAAAAAAeQCQAAAAAGXAwEAAAABnQMBAAAAAZ8DAAAAnwMCoAMBAAAAAaEDgAAAAAGiAyAAAAABowMBAAAAAQEzAAD8AgAwATMAAPwCADABAAAAGAAgDgUAAPYFACASAAD3BQAgEwAA-AUAINkCAQC9BQAh2gIBAL0FACHjAkAAwAUAIeQCQADABQAhlwMBAL0FACGdAwEAvQUAIZ8DAAD1BZ8DIqADAQC9BQAhoQOAAAAAAaIDIADmBQAhowMBAL8FACECAAAALQAgMwAAgAMAIAvZAgEAvQUAIdoCAQC9BQAh4wJAAMAFACHkAkAAwAUAIZcDAQC9BQAhnQMBAL0FACGfAwAA9QWfAyKgAwEAvQUAIaEDgAAAAAGiAyAA5gUAIaMDAQC_BQAhAgAAACsAIDMAAIIDACACAAAAKwAgMwAAggMAIAEAAAAYACADAAAALQAgOgAA-gIAIDsAAIADACABAAAALQAgAQAAACsAIAUKAADyBQAgQAAA9AUAIEEAAPMFACChAwAAuQUAIKMDAAC5BQAgDtYCAADMBAAw1wIAAIoDABDYAgAAzAQAMNkCAQChBAAh2gIBAKEEACHjAkAApAQAIeQCQACkBAAhlwMBAKEEACGdAwEAoQQAIZ8DAADNBJ8DIqADAQChBAAhoQMAAL8EACCiAyAAwgQAIaMDAQCjBAAhAwAAACsAIAEAAIkDADA_AACKAwAgAwAAACsAIAEAACwAMAIAAC0AIAEAAAA6ACABAAAAOgAgAwAAADgAIAEAADkAMAIAADoAIAMAAAA4ACABAAA5ADACAAA6ACADAAAAOAAgAQAAOQAwAgAAOgAgDgUAAPEFACAWAADwBQAgM4AAAAAB2QIBAAAAAdoCAQAAAAHjAkAAAAAB8AIBAAAAAZYDAAAAlgMClwMBAAAAAZgDAQAAAAGZAyAAAAABmgNAAAAAAZsDAQAAAAGcAyAAAAABATMAAJIDACAMM4AAAAAB2QIBAAAAAdoCAQAAAAHjAkAAAAAB8AIBAAAAAZYDAAAAlgMClwMBAAAAAZgDAQAAAAGZAyAAAAABmgNAAAAAAZsDAQAAAAGcAyAAAAABATMAAJQDADABMwAAlAMAMAEAAAA0ACAOBQAA7wUAIBYAAO4FACAzgAAAAAHZAgEAvQUAIdoCAQC_BQAh4wJAAMAFACHwAgEAvQUAIZYDAADtBZYDIpcDAQC9BQAhmAMBAL0FACGZAyAA5gUAIZoDQADBBQAhmwMBAL0FACGcAyAA5gUAIQIAAAA6ACAzAACYAwAgDDOAAAAAAdkCAQC9BQAh2gIBAL8FACHjAkAAwAUAIfACAQC9BQAhlgMAAO0FlgMilwMBAL0FACGYAwEAvQUAIZkDIADmBQAhmgNAAMEFACGbAwEAvQUAIZwDIADmBQAhAgAAADgAIDMAAJoDACACAAAAOAAgMwAAmgMAIAEAAAA0ACADAAAAOgAgOgAAkgMAIDsAAJgDACABAAAAOgAgAQAAADgAIAYKAADqBQAgMwAAuQUAIEAAAOwFACBBAADrBQAg2gIAALkFACCaAwAAuQUAIA8zAAC_BAAg1gIAAMgEADDXAgAAogMAENgCAADIBAAw2QIBAKEEACHaAgEAowQAIeMCQACkBAAh8AIBAKEEACGWAwAAyQSWAyKXAwEAoQQAIZgDAQChBAAhmQMgAMIEACGaA0AApQQAIZsDAQChBAAhnAMgAMIEACEDAAAAOAAgAQAAoQMAMD8AAKIDACADAAAAOAAgAQAAOQAwAgAAOgAgDRYAAMcEACDWAgAAxQQAMNcCAABfABDYAgAAxQQAMNkCAQAAAAHkAkAAvAQAIfACAQAAAAGPAyAAxgQAIZADIADGBAAhkQMgAMYEACGSAyAAxgQAIZMDIADGBAAhlAMCAL0EACEBAAAApQMAIAEAAAClAwAgARYAAOkFACADAAAAXwAgAQAAqAMAMAIAAKUDACADAAAAXwAgAQAAqAMAMAIAAKUDACADAAAAXwAgAQAAqAMAMAIAAKUDACAKFgAA6AUAINkCAQAAAAHkAkAAAAAB8AIBAAAAAY8DIAAAAAGQAyAAAAABkQMgAAAAAZIDIAAAAAGTAyAAAAABlAMCAAAAAQEzAACsAwAgCdkCAQAAAAHkAkAAAAAB8AIBAAAAAY8DIAAAAAGQAyAAAAABkQMgAAAAAZIDIAAAAAGTAyAAAAABlAMCAAAAAQEzAACuAwAwATMAAK4DADAKFgAA5wUAINkCAQC9BQAh5AJAAMAFACHwAgEAvQUAIY8DIADmBQAhkAMgAOYFACGRAyAA5gUAIZIDIADmBQAhkwMgAOYFACGUAwIAzQUAIQIAAAClAwAgMwAAsQMAIAnZAgEAvQUAIeQCQADABQAh8AIBAL0FACGPAyAA5gUAIZADIADmBQAhkQMgAOYFACGSAyAA5gUAIZMDIADmBQAhlAMCAM0FACECAAAAXwAgMwAAswMAIAIAAABfACAzAACzAwAgAwAAAKUDACA6AACsAwAgOwAAsQMAIAEAAAClAwAgAQAAAF8AIAUKAADhBQAgQAAA5AUAIEEAAOMFACCiAQAA4gUAIKMBAADlBQAgDNYCAADBBAAw1wIAALoDABDYAgAAwQQAMNkCAQChBAAh5AJAAKQEACHwAgEAoQQAIY8DIADCBAAhkAMgAMIEACGRAyAAwgQAIZIDIADCBAAhkwMgAMIEACGUAwIAswQAIQMAAABfACABAAC5AwAwPwAAugMAIAMAAABfACABAACoAwAwAgAApQMAIAEAAAAyACABAAAAMgAgAwAAADAAIAEAADEAMAIAADIAIAMAAAAwACABAAAxADACAAAyACADAAAAMAAgAQAAMQAwAgAAMgAgDQUAAN4FACAVAADfBQAgFgAA4AUAINkCAQAAAAHaAgEAAAAB4wJAAAAAAfACAQAAAAGDAwEAAAABhAMBAAAAAYUDAQAAAAGGAwEAAAABhwOAAAAAAYgDAQAAAAEBMwAAwgMAIArZAgEAAAAB2gIBAAAAAeMCQAAAAAHwAgEAAAABgwMBAAAAAYQDAQAAAAGFAwEAAAABhgMBAAAAAYcDgAAAAAGIAwEAAAABATMAAMQDADABMwAAxAMAMAEAAAA0ACABAAAABwAgAQAAABgAIA0FAADbBQAgFQAA3AUAIBYAAN0FACDZAgEAvQUAIdoCAQC_BQAh4wJAAMAFACHwAgEAvwUAIYMDAQC_BQAhhAMBAL0FACGFAwEAvQUAIYYDAQC_BQAhhwOAAAAAAYgDAQC_BQAhAgAAADIAIDMAAMoDACAK2QIBAL0FACHaAgEAvwUAIeMCQADABQAh8AIBAL8FACGDAwEAvwUAIYQDAQC9BQAhhQMBAL0FACGGAwEAvwUAIYcDgAAAAAGIAwEAvwUAIQIAAAAwACAzAADMAwAgAgAAADAAIDMAAMwDACABAAAANAAgAQAAAAcAIAEAAAAYACADAAAAMgAgOgAAwgMAIDsAAMoDACABAAAAMgAgAQAAADAAIAkKAADYBQAgQAAA2gUAIEEAANkFACDaAgAAuQUAIPACAAC5BQAggwMAALkFACCGAwAAuQUAIIcDAAC5BQAgiAMAALkFACAN1gIAAL4EADDXAgAA1gMAENgCAAC-BAAw2QIBAKEEACHaAgEAowQAIeMCQACkBAAh8AIBAKMEACGDAwEAowQAIYQDAQChBAAhhQMBAKEEACGGAwEAowQAIYcDAAC_BAAgiAMBAKMEACEDAAAAMAAgAQAA1QMAMD8AANYDACADAAAAMAAgAQAAMQAwAgAAMgAgC9YCAAC6BAAw1wIAANwDABDYAgAAugQAMNkCAQAAAAHjAkAAvAQAIeQCQAC8BAAh_gIBAAAAAf8CAQC7BAAhgANAALwEACGBAwIAvQQAIYIDQAC8BAAhAQAAANkDACABAAAA2QMAIAvWAgAAugQAMNcCAADcAwAQ2AIAALoEADDZAgEAuwQAIeMCQAC8BAAh5AJAALwEACH-AgEAuwQAIf8CAQC7BAAhgANAALwEACGBAwIAvQQAIYIDQAC8BAAhAAMAAADcAwAgAQAA3QMAMAIAANkDACADAAAA3AMAIAEAAN0DADACAADZAwAgAwAAANwDACABAADdAwAwAgAA2QMAIAjZAgEAAAAB4wJAAAAAAeQCQAAAAAH-AgEAAAAB_wIBAAAAAYADQAAAAAGBAwIAAAABggNAAAAAAQEzAADhAwAgCNkCAQAAAAHjAkAAAAAB5AJAAAAAAf4CAQAAAAH_AgEAAAABgANAAAAAAYEDAgAAAAGCA0AAAAABATMAAOMDADABMwAA4wMAMAjZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIf8CAQC9BQAhgANAAMAFACGBAwIAzQUAIYIDQADABQAhAgAAANkDACAzAADmAwAgCNkCAQC9BQAh4wJAAMAFACHkAkAAwAUAIf4CAQC9BQAh_wIBAL0FACGAA0AAwAUAIYEDAgDNBQAhggNAAMAFACECAAAA3AMAIDMAAOgDACACAAAA3AMAIDMAAOgDACADAAAA2QMAIDoAAOEDACA7AADmAwAgAQAAANkDACABAAAA3AMAIAUKAADTBQAgQAAA1gUAIEEAANUFACCiAQAA1AUAIKMBAADXBQAgC9YCAAC5BAAw1wIAAO8DABDYAgAAuQQAMNkCAQChBAAh4wJAAKQEACHkAkAApAQAIf4CAQChBAAh_wIBAKEEACGAA0AApAQAIYEDAgCzBAAhggNAAKQEACEDAAAA3AMAIAEAAO4DADA_AADvAwAgAwAAANwDACABAADdAwAwAgAA2QMAIAEAAABmACABAAAAZgAgAwAAAGIAIAEAAGUAMAIAAGYAIAMAAABiACABAABlADACAABmACADAAAAYgAgAQAAZQAwAgAAZgAgFBYAANEFACAqAADSBQAg2QIBAAAAAd4CAAAA_AIC4AIBAAAAAeMCQAAAAAHkAkAAAAAB8AIBAAAAAfECAQAAAAHyAgEAAAAB8wIBAAAAAfQCAQAAAAH1AgEAAAAB9gIBAAAAAfcCAQAAAAH4AgEAAAAB-QIBAAAAAfoCAgAAAAH8AgEAAAAB_QJAAAAAAQEzAAD3AwAgEtkCAQAAAAHeAgAAAPwCAuACAQAAAAHjAkAAAAAB5AJAAAAAAfACAQAAAAHxAgEAAAAB8gIBAAAAAfMCAQAAAAH0AgEAAAAB9QIBAAAAAfYCAQAAAAH3AgEAAAAB-AIBAAAAAfkCAQAAAAH6AgIAAAAB_AIBAAAAAf0CQAAAAAEBMwAA-QMAMAEzAAD5AwAwAQAAABgAIBQWAADPBQAgKgAA0AUAINkCAQC9BQAh3gIAAM4F_AIi4AIBAL8FACHjAkAAwAUAIeQCQADABQAh8AIBAL0FACHxAgEAvQUAIfICAQC9BQAh8wIBAL0FACH0AgEAvwUAIfUCAQC9BQAh9gIBAL8FACH3AgEAvQUAIfgCAQC9BQAh-QIBAL0FACH6AgIAzQUAIfwCAQC_BQAh_QJAAMEFACECAAAAZgAgMwAA_QMAIBLZAgEAvQUAId4CAADOBfwCIuACAQC_BQAh4wJAAMAFACHkAkAAwAUAIfACAQC9BQAh8QIBAL0FACHyAgEAvQUAIfMCAQC9BQAh9AIBAL8FACH1AgEAvQUAIfYCAQC_BQAh9wIBAL0FACH4AgEAvQUAIfkCAQC9BQAh-gICAM0FACH8AgEAvwUAIf0CQADBBQAhAgAAAGIAIDMAAP8DACACAAAAYgAgMwAA_wMAIAEAAAAYACADAAAAZgAgOgAA9wMAIDsAAP0DACABAAAAZgAgAQAAAGIAIAoKAADIBQAgQAAAywUAIEEAAMoFACCiAQAAyQUAIKMBAADMBQAg4AIAALkFACD0AgAAuQUAIPYCAAC5BQAg_AIAALkFACD9AgAAuQUAIBXWAgAAsgQAMNcCAACHBAAQ2AIAALIEADDZAgEAoQQAId4CAAC0BPwCIuACAQCjBAAh4wJAAKQEACHkAkAApAQAIfACAQChBAAh8QIBAKEEACHyAgEAoQQAIfMCAQChBAAh9AIBAKMEACH1AgEAoQQAIfYCAQCjBAAh9wIBAKEEACH4AgEAoQQAIfkCAQChBAAh-gICALMEACH8AgEAowQAIf0CQAClBAAhAwAAAGIAIAEAAIYEADA_AACHBAAgAwAAAGIAIAEAAGUAMAIAAGYAIAEAAAA_ACABAAAAPwAgAwAAAD0AIAEAAD4AMAIAAD8AIAMAAAA9ACABAAA-ADACAAA_ACADAAAAPQAgAQAAPgAwAgAAPwAgDgUAAMUFACAZAADGBQAgGgAAxwUAINkCAQAAAAHaAgEAAAAB2wIBAAAAAdwCAQAAAAHeAgAAAN4CAt8CAQAAAAHgAgEAAAAB4QJAAAAAAeICQAAAAAHjAkAAAAAB5AJAAAAAAQEzAACPBAAgC9kCAQAAAAHaAgEAAAAB2wIBAAAAAdwCAQAAAAHeAgAAAN4CAt8CAQAAAAHgAgEAAAAB4QJAAAAAAeICQAAAAAHjAkAAAAAB5AJAAAAAAQEzAACRBAAwATMAAJEEADAOBQAAwgUAIBkAAMMFACAaAADEBQAg2QIBAL0FACHaAgEAvQUAIdsCAQC9BQAh3AIBAL0FACHeAgAAvgXeAiLfAgEAvwUAIeACAQC_BQAh4QJAAMAFACHiAkAAwQUAIeMCQADABQAh5AJAAMAFACECAAAAPwAgMwAAlAQAIAvZAgEAvQUAIdoCAQC9BQAh2wIBAL0FACHcAgEAvQUAId4CAAC-Bd4CIt8CAQC_BQAh4AIBAL8FACHhAkAAwAUAIeICQADBBQAh4wJAAMAFACHkAkAAwAUAIQIAAAA9ACAzAACWBAAgAgAAAD0AIDMAAJYEACADAAAAPwAgOgAAjwQAIDsAAJQEACABAAAAPwAgAQAAAD0AIAYKAAC6BQAgQAAAvAUAIEEAALsFACDfAgAAuQUAIOACAAC5BQAg4gIAALkFACAO1gIAAKAEADDXAgAAnQQAENgCAACgBAAw2QIBAKEEACHaAgEAoQQAIdsCAQChBAAh3AIBAKEEACHeAgAAogTeAiLfAgEAowQAIeACAQCjBAAh4QJAAKQEACHiAkAApQQAIeMCQACkBAAh5AJAAKQEACEDAAAAPQAgAQAAnAQAMD8AAJ0EACADAAAAPQAgAQAAPgAwAgAAPwAgDtYCAACgBAAw1wIAAJ0EABDYAgAAoAQAMNkCAQChBAAh2gIBAKEEACHbAgEAoQQAIdwCAQChBAAh3gIAAKIE3gIi3wIBAKMEACHgAgEAowQAIeECQACkBAAh4gJAAKUEACHjAkAApAQAIeQCQACkBAAhDgoAAKoEACBAAACxBAAgQQAAsQQAIOUCAQAAAAHmAgEAAAAE5wIBAAAABOgCAQAAAAHpAgEAAAAB6gIBAAAAAesCAQAAAAHsAgEAsAQAIe0CAQAAAAHuAgEAAAAB7wIBAAAAAQcKAACqBAAgQAAArwQAIEEAAK8EACDlAgAAAN4CAuYCAAAA3gII5wIAAADeAgjsAgAArgTeAiIOCgAApwQAIEAAAK0EACBBAACtBAAg5QIBAAAAAeYCAQAAAAXnAgEAAAAF6AIBAAAAAekCAQAAAAHqAgEAAAAB6wIBAAAAAewCAQCsBAAh7QIBAAAAAe4CAQAAAAHvAgEAAAABCwoAAKoEACBAAACrBAAgQQAAqwQAIOUCQAAAAAHmAkAAAAAE5wJAAAAABOgCQAAAAAHpAkAAAAAB6gJAAAAAAesCQAAAAAHsAkAAqQQAIQsKAACnBAAgQAAAqAQAIEEAAKgEACDlAkAAAAAB5gJAAAAABecCQAAAAAXoAkAAAAAB6QJAAAAAAeoCQAAAAAHrAkAAAAAB7AJAAKYEACELCgAApwQAIEAAAKgEACBBAACoBAAg5QJAAAAAAeYCQAAAAAXnAkAAAAAF6AJAAAAAAekCQAAAAAHqAkAAAAAB6wJAAAAAAewCQACmBAAhCOUCAgAAAAHmAgIAAAAF5wICAAAABegCAgAAAAHpAgIAAAAB6gICAAAAAesCAgAAAAHsAgIApwQAIQjlAkAAAAAB5gJAAAAABecCQAAAAAXoAkAAAAAB6QJAAAAAAeoCQAAAAAHrAkAAAAAB7AJAAKgEACELCgAAqgQAIEAAAKsEACBBAACrBAAg5QJAAAAAAeYCQAAAAATnAkAAAAAE6AJAAAAAAekCQAAAAAHqAkAAAAAB6wJAAAAAAewCQACpBAAhCOUCAgAAAAHmAgIAAAAE5wICAAAABOgCAgAAAAHpAgIAAAAB6gICAAAAAesCAgAAAAHsAgIAqgQAIQjlAkAAAAAB5gJAAAAABOcCQAAAAAToAkAAAAAB6QJAAAAAAeoCQAAAAAHrAkAAAAAB7AJAAKsEACEOCgAApwQAIEAAAK0EACBBAACtBAAg5QIBAAAAAeYCAQAAAAXnAgEAAAAF6AIBAAAAAekCAQAAAAHqAgEAAAAB6wIBAAAAAewCAQCsBAAh7QIBAAAAAe4CAQAAAAHvAgEAAAABC-UCAQAAAAHmAgEAAAAF5wIBAAAABegCAQAAAAHpAgEAAAAB6gIBAAAAAesCAQAAAAHsAgEArQQAIe0CAQAAAAHuAgEAAAAB7wIBAAAAAQcKAACqBAAgQAAArwQAIEEAAK8EACDlAgAAAN4CAuYCAAAA3gII5wIAAADeAgjsAgAArgTeAiIE5QIAAADeAgLmAgAAAN4CCOcCAAAA3gII7AIAAK8E3gIiDgoAAKoEACBAAACxBAAgQQAAsQQAIOUCAQAAAAHmAgEAAAAE5wIBAAAABOgCAQAAAAHpAgEAAAAB6gIBAAAAAesCAQAAAAHsAgEAsAQAIe0CAQAAAAHuAgEAAAAB7wIBAAAAAQvlAgEAAAAB5gIBAAAABOcCAQAAAAToAgEAAAAB6QIBAAAAAeoCAQAAAAHrAgEAAAAB7AIBALEEACHtAgEAAAAB7gIBAAAAAe8CAQAAAAEV1gIAALIEADDXAgAAhwQAENgCAACyBAAw2QIBAKEEACHeAgAAtAT8AiLgAgEAowQAIeMCQACkBAAh5AJAAKQEACHwAgEAoQQAIfECAQChBAAh8gIBAKEEACHzAgEAoQQAIfQCAQCjBAAh9QIBAKEEACH2AgEAowQAIfcCAQChBAAh-AIBAKEEACH5AgEAoQQAIfoCAgCzBAAh_AIBAKMEACH9AkAApQQAIQ0KAACqBAAgQAAAqgQAIEEAAKoEACCiAQAAuAQAIKMBAACqBAAg5QICAAAAAeYCAgAAAATnAgIAAAAE6AICAAAAAekCAgAAAAHqAgIAAAAB6wICAAAAAewCAgC3BAAhBwoAAKoEACBAAAC2BAAgQQAAtgQAIOUCAAAA_AIC5gIAAAD8AgjnAgAAAPwCCOwCAAC1BPwCIgcKAACqBAAgQAAAtgQAIEEAALYEACDlAgAAAPwCAuYCAAAA_AII5wIAAAD8AgjsAgAAtQT8AiIE5QIAAAD8AgLmAgAAAPwCCOcCAAAA_AII7AIAALYE_AIiDQoAAKoEACBAAACqBAAgQQAAqgQAIKIBAAC4BAAgowEAAKoEACDlAgIAAAAB5gICAAAABOcCAgAAAAToAgIAAAAB6QICAAAAAeoCAgAAAAHrAgIAAAAB7AICALcEACEI5QIIAAAAAeYCCAAAAATnAggAAAAE6AIIAAAAAekCCAAAAAHqAggAAAAB6wIIAAAAAewCCAC4BAAhC9YCAAC5BAAw1wIAAO8DABDYAgAAuQQAMNkCAQChBAAh4wJAAKQEACHkAkAApAQAIf4CAQChBAAh_wIBAKEEACGAA0AApAQAIYEDAgCzBAAhggNAAKQEACEL1gIAALoEADDXAgAA3AMAENgCAAC6BAAw2QIBALsEACHjAkAAvAQAIeQCQAC8BAAh_gIBALsEACH_AgEAuwQAIYADQAC8BAAhgQMCAL0EACGCA0AAvAQAIQvlAgEAAAAB5gIBAAAABOcCAQAAAAToAgEAAAAB6QIBAAAAAeoCAQAAAAHrAgEAAAAB7AIBALEEACHtAgEAAAAB7gIBAAAAAe8CAQAAAAEI5QJAAAAAAeYCQAAAAATnAkAAAAAE6AJAAAAAAekCQAAAAAHqAkAAAAAB6wJAAAAAAewCQACrBAAhCOUCAgAAAAHmAgIAAAAE5wICAAAABOgCAgAAAAHpAgIAAAAB6gICAAAAAesCAgAAAAHsAgIAqgQAIQ3WAgAAvgQAMNcCAADWAwAQ2AIAAL4EADDZAgEAoQQAIdoCAQCjBAAh4wJAAKQEACHwAgEAowQAIYMDAQCjBAAhhAMBAKEEACGFAwEAoQQAIYYDAQCjBAAhhwMAAL8EACCIAwEAowQAIQ8KAACnBAAgQAAAwAQAIEEAAMAEACDlAoAAAAAB6AKAAAAAAekCgAAAAAHqAoAAAAAB6wKAAAAAAewCgAAAAAGJAwEAAAABigMBAAAAAYsDAQAAAAGMA4AAAAABjQOAAAAAAY4DgAAAAAEM5QKAAAAAAegCgAAAAAHpAoAAAAAB6gKAAAAAAesCgAAAAAHsAoAAAAABiQMBAAAAAYoDAQAAAAGLAwEAAAABjAOAAAAAAY0DgAAAAAGOA4AAAAABDNYCAADBBAAw1wIAALoDABDYAgAAwQQAMNkCAQChBAAh5AJAAKQEACHwAgEAoQQAIY8DIADCBAAhkAMgAMIEACGRAyAAwgQAIZIDIADCBAAhkwMgAMIEACGUAwIAswQAIQUKAACqBAAgQAAAxAQAIEEAAMQEACDlAiAAAAAB7AIgAMMEACEFCgAAqgQAIEAAAMQEACBBAADEBAAg5QIgAAAAAewCIADDBAAhAuUCIAAAAAHsAiAAxAQAIQ0WAADHBAAg1gIAAMUEADDXAgAAXwAQ2AIAAMUEADDZAgEAuwQAIeQCQAC8BAAh8AIBALsEACGPAyAAxgQAIZADIADGBAAhkQMgAMYEACGSAyAAxgQAIZMDIADGBAAhlAMCAL0EACEC5QIgAAAAAewCIADEBAAhIhcAAI0FACAYAACOBQAgGwAAjwUAIB8AAKcFACAgAACHBQAgIQAAqAUAICIAAKkFACAjAACJBQAgJAAAiwUAICUAAIsFACAmAACMBQAgJwAAjAUAICgAAIoFACApAACqBQAgKwAAqwUAICwAAKwFACAtAACPBQAg1gIAAKUFADDXAgAAGAAQ2AIAAKUFADDZAgEAuwQAIeMCQAC8BAAh5AJAALwEACH-AgEAuwQAIc0DIADGBAAh0QMBALsEACHfAwAApgX0AyLvAwEA5QQAIfIDAQC7BAAh9AMBAOUEACH1AyAAxgQAIfYDQADkBAAh_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_QMAAAsAIBLWAgAA5wQAMNcCAACqAgAQ2AIAAOcEADDZAgEAoQQAIdoCAQChBAAh3gIAAOgEvwMi4wJAAKQEACHkAkAApAQAIZQDAgCzBAAhtgMBAKEEACG8AwEAowQAIb0DQACkBAAhvwNAAKUEACHAAwEAowQAIcEDAQCjBAAhwgMCALMEACHDA0AApQQAIcQDAQCjBAAhBwoAAKoEACBAAADqBAAgQQAA6gQAIOUCAAAAvwMC5gIAAAC_AwjnAgAAAL8DCOwCAADpBL8DIgcKAACqBAAgQAAA6gQAIEEAAOoEACDlAgAAAL8DAuYCAAAAvwMI5wIAAAC_AwjsAgAA6QS_AyIE5QIAAAC_AwLmAgAAAL8DCOcCAAAAvwMI7AIAAOoEvwMiD9YCAADrBAAw1wIAAJACABDYAgAA6wQAMNkCAQChBAAh4wJAAKQEACHkAkAApAQAIbYDAQChBAAhxgMAAOwExgMixwMAAO0EACDIAwAA7gQAIMkDQACkBAAhygNAAKUEACHLAwgA3AQAIcwDAQCjBAAhzQMgAMIEACEHCgAAqgQAIEAAAPAEACBBAADwBAAg5QIAAADGAwLmAgAAAMYDCOcCAAAAxgMI7AIAAO8ExgMiBOUCAQAAAAXOAwEAAAABzwMBAAAABNADAQAAAAQE5QICAAAABc4DAgAAAAHPAwIAAAAE0AMCAAAABAcKAACqBAAgQAAA8AQAIEEAAPAEACDlAgAAAMYDAuYCAAAAxgMI5wIAAADGAwjsAgAA7wTGAyIE5QIAAADGAwLmAgAAAMYDCOcCAAAAxgMI7AIAAPAExgMiE9YCAADxBAAw1wIAAPoBABDYAgAA8QQAMNkCAQChBAAh2gIBAKEEACHjAkAApAQAIeQCQACkBAAh0QMBAKEEACHSAwEAowQAIdMDAQCjBAAh1QMAAPIE1QMi1gMBAKEEACHXAwEAoQQAIdgDAQCjBAAh2QMBAKMEACHaAwEAowQAIdsDAQCjBAAh3AMgAMIEACHdAwEAowQAIQcKAACqBAAgQAAA9AQAIEEAAPQEACDlAgAAANUDAuYCAAAA1QMI5wIAAADVAwjsAgAA8wTVAyIHCgAAqgQAIEAAAPQEACBBAAD0BAAg5QIAAADVAwLmAgAAANUDCOcCAAAA1QMI7AIAAPME1QMiBOUCAAAA1QMC5gIAAADVAwjnAgAAANUDCOwCAAD0BNUDIg7WAgAA9QQAMNcCAADkAQAQ2AIAAPUEADDZAgEAoQQAId4CAAD3BOIDIuMCQACkBAAh5AJAAKQEACH-AgEAoQQAIYADQACkBAAhgwMBAKEEACHfAwAA9gTfAyLgAwEAoQQAIeIDAQChBAAh4wNAAKUEACEHCgAAqgQAIEAAAPsEACBBAAD7BAAg5QIAAADfAwLmAgAAAN8DCOcCAAAA3wMI7AIAAPoE3wMiBwoAAKoEACBAAAD5BAAgQQAA-QQAIOUCAAAA4gMC5gIAAADiAwjnAgAAAOIDCOwCAAD4BOIDIgcKAACqBAAgQAAA-QQAIEEAAPkEACDlAgAAAOIDAuYCAAAA4gMI5wIAAADiAwjsAgAA-ATiAyIE5QIAAADiAwLmAgAAAOIDCOcCAAAA4gMI7AIAAPkE4gMiBwoAAKoEACBAAAD7BAAgQQAA-wQAIOUCAAAA3wMC5gIAAADfAwjnAgAAAN8DCOwCAAD6BN8DIgTlAgAAAN8DAuYCAAAA3wMI5wIAAADfAwjsAgAA-wTfAyIL1gIAAPwEADDXAgAAzgEAENgCAAD8BAAw2QIBAKEEACHkAkAApAQAIfACAQChBAAhgwMBAKEEACHNAyAAwgQAId8DAAD2BN8DIuQDAADtBAAg5QNAAKQEACEJ1gIAAP0EADDXAgAAuAEAENgCAAD9BAAw2QIBAKEEACHaAgEAoQQAIeMCQACkBAAh5AJAAKQEACG1AwEAoQQAIdEDAQChBAAhFdYCAAD-BAAw1wIAAKIBABDYAgAA_gQAMNkCAQChBAAh3wIBAKMEACHjAkAApAQAIeQCQACkBAAhtQMBAKEEACHRAwEAoQQAIeYDAQCjBAAh5wNAAKQEACHoAwEAowQAIekDAQCjBAAh6gMAAO0EACDrAwAA7QQAIOwDAQChBAAh7QMBAKEEACHuAwEAowQAIe8DAQCjBAAh8AMgAMIEACHxAwEAowQAIQ_WAgAA_wQAMNcCAACMAQAQ2AIAAP8EADDZAgEAoQQAIeMCQACkBAAh5AJAAKQEACH-AgEAoQQAIc0DIADCBAAh0QMBAKEEACHfAwAAgAX0AyLvAwEAowQAIfIDAQChBAAh9AMBAKMEACH1AyAAwgQAIfYDQAClBAAhBwoAAKoEACBAAACCBQAgQQAAggUAIOUCAAAA9AMC5gIAAAD0AwjnAgAAAPQDCOwCAACBBfQDIgcKAACqBAAgQAAAggUAIEEAAIIFACDlAgAAAPQDAuYCAAAA9AMI5wIAAAD0AwjsAgAAgQX0AyIE5QIAAAD0AwLmAgAAAPQDCOcCAAAA9AMI7AIAAIIF9AMiFxYAAMcEACAqAACFBQAg1gIAAIMFADDXAgAAYgAQ2AIAAIMFADDZAgEAuwQAId4CAACEBfwCIuACAQDlBAAh4wJAALwEACHkAkAAvAQAIfACAQC7BAAh8QIBALsEACHyAgEAuwQAIfMCAQC7BAAh9AIBAOUEACH1AgEAuwQAIfYCAQDlBAAh9wIBALsEACH4AgEAuwQAIfkCAQC7BAAh-gICAL0EACH8AgEA5QQAIf0CQADkBAAhBOUCAAAA_AIC5gIAAAD8AgjnAgAAAPwCCOwCAAC2BPwCIiIXAACNBQAgGAAAjgUAIBsAAI8FACAfAACnBQAgIAAAhwUAICEAAKgFACAiAACpBQAgIwAAiQUAICQAAIsFACAlAACLBQAgJgAAjAUAICcAAIwFACAoAACKBQAgKQAAqgUAICsAAKsFACAsAACsBQAgLQAAjwUAINYCAAClBQAw1wIAABgAENgCAAClBQAw2QIBALsEACHjAkAAvAQAIeQCQAC8BAAh_gIBALsEACHNAyAAxgQAIdEDAQC7BAAh3wMAAKYF9AMi7wMBAOUEACHyAwEAuwQAIfQDAQDlBAAh9QMgAMYEACH2A0AA5AQAIfwDAAAYACD9AwAAGAAgHwMAAMcEACAEAACHBQAgCQAAiQUAIA0AAIgFACAOAACKBQAgEQAAiwUAIBQAAIwFACAXAACNBQAgGAAAjgUAIBsAAI8FACDWAgAAhgUAMNcCAAA0ABDYAgAAhgUAMNkCAQC7BAAh3wIBAOUEACHjAkAAvAQAIeQCQAC8BAAhtQMBALsEACHRAwEAuwQAIeYDAQDlBAAh5wNAALwEACHoAwEA5QQAIekDAQDlBAAh6gMAAO0EACDrAwAA7QQAIOwDAQC7BAAh7QMBALsEACHuAwEA5QQAIe8DAQDlBAAh8AMgAMYEACHxAwEA5QQAIQP3AwAABwAg-AMAAAcAIPkDAAAHACAD9wMAAAsAIPgDAAALACD5AwAACwAgA_cDAAATACD4AwAAEwAg-QMAABMAIAP3AwAAIQAg-AMAACEAIPkDAAAhACAD9wMAACUAIPgDAAAlACD5AwAAJQAgA_cDAAArACD4AwAAKwAg-QMAACsAIAP3AwAAMAAg-AMAADAAIPkDAAAwACAD9wMAADgAIPgDAAA4ACD5AwAAOAAgA_cDAAA9ACD4AwAAPQAg-QMAAD0AIBAVAACTBQAgHQAAxwQAINYCAACQBQAw1wIAAEsAENgCAACQBQAw2QIBALsEACHeAgAAkgXiAyLjAkAAvAQAIeQCQAC8BAAh_gIBALsEACGAA0AAvAQAIYMDAQC7BAAh3wMAAJEF3wMi4AMBALsEACHiAwEAuwQAIeMDQADkBAAhBOUCAAAA3wMC5gIAAADfAwjnAgAAAN8DCOwCAAD7BN8DIgTlAgAAAOIDAuYCAAAA4gMI5wIAAADiAwjsAgAA-QTiAyIQAwAAxwQAIAUAAJcFACAXAACNBQAgHAAApwUAIB4AAKgFACDWAgAAtgUAMNcCAAAHABDYAgAAtgUAMNkCAQC7BAAh2gIBALsEACHjAkAAvAQAIeQCQAC8BAAhtQMBALsEACHRAwEAuwQAIfwDAAAHACD9AwAABwAgAtoCAQAAAAHbAgEAAAABEQUAAJcFACAZAADHBAAgGgAAxwQAINYCAACVBQAw1wIAAD0AENgCAACVBQAw2QIBALsEACHaAgEAuwQAIdsCAQC7BAAh3AIBALsEACHeAgAAlgXeAiLfAgEA5QQAIeACAQDlBAAh4QJAALwEACHiAkAA5AQAIeMCQAC8BAAh5AJAALwEACEE5QIAAADeAgLmAgAAAN4CCOcCAAAA3gII7AIAAK8E3gIiIQMAAMcEACAEAACHBQAgCQAAiQUAIA0AAIgFACAOAACKBQAgEQAAiwUAIBQAAIwFACAXAACNBQAgGAAAjgUAIBsAAI8FACDWAgAAhgUAMNcCAAA0ABDYAgAAhgUAMNkCAQC7BAAh3wIBAOUEACHjAkAAvAQAIeQCQAC8BAAhtQMBALsEACHRAwEAuwQAIeYDAQDlBAAh5wNAALwEACHoAwEA5QQAIekDAQDlBAAh6gMAAO0EACDrAwAA7QQAIOwDAQC7BAAh7QMBALsEACHuAwEA5QQAIe8DAQDlBAAh8AMgAMYEACHxAwEA5QQAIfwDAAA0ACD9AwAANAAgEQUAAJsFACAWAADHBAAgMwAAmgUAINYCAACYBQAw1wIAADgAENgCAACYBQAw2QIBALsEACHaAgEA5QQAIeMCQAC8BAAh8AIBALsEACGWAwAAmQWWAyKXAwEAuwQAIZgDAQC7BAAhmQMgAMYEACGaA0AA5AQAIZsDAQC7BAAhnAMgAMYEACEE5QIAAACWAwLmAgAAAJYDCOcCAAAAlgMI7AIAAMsElgMiDOUCgAAAAAHoAoAAAAAB6QKAAAAAAeoCgAAAAAHrAoAAAAAB7AKAAAAAAYkDAQAAAAGKAwEAAAABiwMBAAAAAYwDgAAAAAGNA4AAAAABjgOAAAAAASEDAADHBAAgBAAAhwUAIAkAAIkFACANAACIBQAgDgAAigUAIBEAAIsFACAUAACMBQAgFwAAjQUAIBgAAI4FACAbAACPBQAg1gIAAIYFADDXAgAANAAQ2AIAAIYFADDZAgEAuwQAId8CAQDlBAAh4wJAALwEACHkAkAAvAQAIbUDAQC7BAAh0QMBALsEACHmAwEA5QQAIecDQAC8BAAh6AMBAOUEACHpAwEA5QQAIeoDAADtBAAg6wMAAO0EACDsAwEAuwQAIe0DAQC7BAAh7gMBAOUEACHvAwEA5QQAIfADIADGBAAh8QMBAOUEACH8AwAANAAg_QMAADQAIBAFAACbBQAgFQAAnQUAIBYAAIUFACDWAgAAnAUAMNcCAAAwABDYAgAAnAUAMNkCAQC7BAAh2gIBAOUEACHjAkAAvAQAIfACAQDlBAAhgwMBAOUEACGEAwEAuwQAIYUDAQC7BAAhhgMBAOUEACGHAwAAmgUAIIgDAQDlBAAhEAMAAMcEACAFAACXBQAgFwAAjQUAIBwAAKcFACAeAACoBQAg1gIAALYFADDXAgAABwAQ2AIAALYFADDZAgEAuwQAIdoCAQC7BAAh4wJAALwEACHkAkAAvAQAIbUDAQC7BAAh0QMBALsEACH8AwAABwAg_QMAAAcAIBEFAACXBQAgEgAAxwQAIBMAAIUFACDWAgAAngUAMNcCAAArABDYAgAAngUAMNkCAQC7BAAh2gIBALsEACHjAkAAvAQAIeQCQAC8BAAhlwMBALsEACGdAwEAuwQAIZ8DAACfBZ8DIqADAQC7BAAhoQMAAJoFACCiAyAAxgQAIaMDAQDlBAAhBOUCAAAAnwMC5gIAAACfAwjnAgAAAJ8DCOwCAADPBJ8DIhMFAACXBQAgDwAAhQUAIBAAAIUFACDWAgAAoAUAMNcCAAAlABDYAgAAoAUAMNkCAQC7BAAh2gIBALsEACHeAgAAogWqAyLfAgEA5QQAIeMCQAC8BAAh5AJAALwEACGXAwEAuwQAIaQDAQDlBAAhpQMBAOUEACGmA0AAvAQAIagDAAChBagDIqoDQADkBAAhqwMBAOUEACEE5QIAAACoAwLmAgAAAKgDCOcCAAAAqAMI7AIAANYEqAMiBOUCAAAAqgMC5gIAAACqAwjnAgAAAKoDCOwCAADUBKoDIhUDAADHBAAgBQAAlwUAINYCAACjBQAw1wIAACEAENgCAACjBQAw2QIBALsEACHaAgEAuwQAId4CAACkBbIDIt8CAQDlBAAh4wJAALwEACHkAkAAvAQAIZcDAQC7BAAhrAMBALsEACGtAwEA5QQAIa4DAQC7BAAhrwMBAOUEACGwA0AAvAQAIbIDAgC9BAAhswMgAMYEACG0AwEA5QQAIbUDAQC7BAAhBOUCAAAAsgMC5gIAAACyAwjnAgAAALIDCOwCAADaBLIDIiAXAACNBQAgGAAAjgUAIBsAAI8FACAfAACnBQAgIAAAhwUAICEAAKgFACAiAACpBQAgIwAAiQUAICQAAIsFACAlAACLBQAgJgAAjAUAICcAAIwFACAoAACKBQAgKQAAqgUAICsAAKsFACAsAACsBQAgLQAAjwUAINYCAAClBQAw1wIAABgAENgCAAClBQAw2QIBALsEACHjAkAAvAQAIeQCQAC8BAAh_gIBALsEACHNAyAAxgQAIdEDAQC7BAAh3wMAAKYF9AMi7wMBAOUEACHyAwEAuwQAIfQDAQDlBAAh9QMgAMYEACH2A0AA5AQAIQTlAgAAAPQDAuYCAAAA9AMI5wIAAAD0AwjsAgAAggX0AyID9wMAAAMAIPgDAAADACD5AwAAAwAgA_cDAABLACD4AwAASwAg-QMAAEsAIAP3AwAANAAg-AMAADQAIPkDAAA0ACAPFgAAxwQAINYCAADFBAAw1wIAAF8AENgCAADFBAAw2QIBALsEACHkAkAAvAQAIfACAQC7BAAhjwMgAMYEACGQAyAAxgQAIZEDIADGBAAhkgMgAMYEACGTAyAAxgQAIZQDAgC9BAAh_AMAAF8AIP0DAABfACAZFgAAxwQAICoAAIUFACDWAgAAgwUAMNcCAABiABDYAgAAgwUAMNkCAQC7BAAh3gIAAIQF_AIi4AIBAOUEACHjAkAAvAQAIeQCQAC8BAAh8AIBALsEACHxAgEAuwQAIfICAQC7BAAh8wIBALsEACH0AgEA5QQAIfUCAQC7BAAh9gIBAOUEACH3AgEAuwQAIfgCAQC7BAAh-QIBALsEACH6AgIAvQQAIfwCAQDlBAAh_QJAAOQEACH8AwAAYgAg_QMAAGIAIAP3AwAAYgAg-AMAAGIAIPkDAABiACAWBQAAlwUAIAYAAOYEACAHAACvBQAgCAAAhQUAINYCAACtBQAw1wIAABMAENgCAACtBQAw2QIBALsEACHaAgEAuwQAId4CAACuBb8DIuMCQAC8BAAh5AJAALwEACGUAwIAvQQAIbYDAQC7BAAhvAMBAOUEACG9A0AAvAQAIb8DQADkBAAhwAMBAOUEACHBAwEA5QQAIcIDAgC9BAAhwwNAAOQEACHEAwEA5QQAIQTlAgAAAL8DAuYCAAAAvwMI5wIAAAC_AwjsAgAA6gS_AyITBgAA5gQAIAkAAIkFACDWAgAAsAUAMNcCAAAPABDYAgAAsAUAMNkCAQC7BAAh4wJAALwEACHkAkAAvAQAIbYDAQC7BAAhxgMAALEFxgMixwMAAO0EACDIAwAA7gQAIMkDQAC8BAAhygNAAOQEACHLAwgA4gQAIcwDAQDlBAAhzQMgAMYEACH8AwAADwAg_QMAAA8AIBEGAADmBAAgCQAAiQUAINYCAACwBQAw1wIAAA8AENgCAACwBQAw2QIBALsEACHjAkAAvAQAIeQCQAC8BAAhtgMBALsEACHGAwAAsQXGAyLHAwAA7QQAIMgDAADuBAAgyQNAALwEACHKA0AA5AQAIcsDCADiBAAhzAMBAOUEACHNAyAAxgQAIQTlAgAAAMYDAuYCAAAAxgMI5wIAAADGAwjsAgAA8ATGAyIXBQAAlwUAIAkAAIkFACALAAC0BQAgDAAAtQUAINYCAACyBQAw1wIAAAsAENgCAACyBQAw2QIBALsEACHaAgEAuwQAIeMCQAC8BAAh5AJAALwEACHRAwEAuwQAIdIDAQDlBAAh0wMBAOUEACHVAwAAswXVAyLWAwEAuwQAIdcDAQC7BAAh2AMBAOUEACHZAwEA5QQAIdoDAQDlBAAh2wMBAOUEACHcAyAAxgQAId0DAQDlBAAhBOUCAAAA1QMC5gIAAADVAwjnAgAAANUDCOwCAAD0BNUDIgP3AwAADwAg-AMAAA8AIPkDAAAPACAQBgAA5gQAINYCAADhBAAw1wIAABwAENgCAADhBAAw2QIBALsEACHfAgEA5QQAIeMCQAC8BAAh5AJAALwEACG2AwEAuwQAIbcDCADiBAAhuAMBALsEACG5AwgA4gQAIboDCADjBAAhuwNAAOQEACH8AwAAHAAg_QMAABwAIA4DAADHBAAgBQAAlwUAIBcAAI0FACAcAACnBQAgHgAAqAUAINYCAAC2BQAw1wIAAAcAENgCAAC2BQAw2QIBALsEACHaAgEAuwQAIeMCQAC8BAAh5AJAALwEACG1AwEAuwQAIdEDAQC7BAAhAvACAQAAAAGDAwEAAAABDRUAAJMFACAWAADHBAAg1gIAALgFADDXAgAAAwAQ2AIAALgFADDZAgEAuwQAIeQCQAC8BAAh8AIBALsEACGDAwEAuwQAIc0DIADGBAAh3wMAAJEF3wMi5AMAAO0EACDlA0AAvAQAIQAAAAABgQQBAAAAAQGBBAAAAN4CAgGBBAEAAAABAYEEQAAAAAEBgQRAAAAAAQU6AAC2CwAgOwAAvwsAIP4DAAC3CwAg_wMAAL4LACCEBAAAVgAgBToAALQLACA7AAC8CwAg_gMAALULACD_AwAAuwsAIIQEAAABACAFOgAAsgsAIDsAALkLACD-AwAAswsAIP8DAAC4CwAghAQAAAEAIAM6AAC2CwAg_gMAALcLACCEBAAAVgAgAzoAALQLACD-AwAAtQsAIIQEAAABACADOgAAsgsAIP4DAACzCwAghAQAAAEAIAAAAAAABYEEAgAAAAGIBAIAAAABiQQCAAAAAYoEAgAAAAGLBAIAAAABAYEEAAAA_AICBToAAKoLACA7AACwCwAg_gMAAKsLACD_AwAArwsAIIQEAAABACAHOgAAqAsAIDsAAK0LACD-AwAAqQsAIP8DAACsCwAgggQAABgAIIMEAAAYACCEBAAAAQAgAzoAAKoLACD-AwAAqwsAIIQEAAABACADOgAAqAsAIP4DAACpCwAghAQAAAEAIAAAAAAAAAAABzoAAJ0LACA7AACmCwAg_gMAAJ4LACD_AwAApQsAIIIEAAA0ACCDBAAANAAghAQAAFYAIAc6AACbCwAgOwAAowsAIP4DAACcCwAg_wMAAKILACCCBAAABwAggwQAAAcAIIQEAAAJACAHOgAAmQsAIDsAAKALACD-AwAAmgsAIP8DAACfCwAgggQAABgAIIMEAAAYACCEBAAAAQAgAzoAAJ0LACD-AwAAngsAIIQEAABWACADOgAAmwsAIP4DAACcCwAghAQAAAkAIAM6AACZCwAg_gMAAJoLACCEBAAAAQAgAAAAAAABgQQgAAAAAQU6AACUCwAgOwAAlwsAIP4DAACVCwAg_wMAAJYLACCEBAAAAQAgAzoAAJQLACD-AwAAlQsAIIQEAAABACAUFwAA9AkAIBgAAPIJACAbAAD3CQAgHwAA6gkAICAAAOsJACAhAADsCQAgIgAA7QkAICMAAO4JACAkAADvCQAgJQAA7wkAICYAAPAJACAnAADwCQAgKAAA8QkAICkAAPMJACArAAD1CQAgLAAA9gkAIC0AAPcJACDvAwAAuQUAIPQDAAC5BQAg9gMAALkFACAAAAABgQQAAACWAwIFOgAAjAsAIDsAAJILACD-AwAAjQsAIP8DAACRCwAghAQAAAEAIAc6AACKCwAgOwAAjwsAIP4DAACLCwAg_wMAAI4LACCCBAAANAAggwQAADQAIIQEAABWACADOgAAjAsAIP4DAACNCwAghAQAAAEAIAM6AACKCwAg_gMAAIsLACCEBAAAVgAgAAAAAYEEAAAAnwMCBToAAP8KACA7AACICwAg_gMAAIALACD_AwAAhwsAIIQEAABWACAFOgAA_QoAIDsAAIULACD-AwAA_goAIP8DAACECwAghAQAAAEAIAc6AAD7CgAgOwAAggsAIP4DAAD8CgAg_wMAAIELACCCBAAAGAAggwQAABgAIIQEAAABACADOgAA_woAIP4DAACACwAghAQAAFYAIAM6AAD9CgAg_gMAAP4KACCEBAAAAQAgAzoAAPsKACD-AwAA_AoAIIQEAAABACAAAAABgQQAAACoAwIBgQQAAACqAwIFOgAA8AoAIDsAAPkKACD-AwAA8QoAIP8DAAD4CgAghAQAAFYAIAc6AADuCgAgOwAA9goAIP4DAADvCgAg_wMAAPUKACCCBAAAGAAggwQAABgAIIQEAAABACAHOgAA7AoAIDsAAPMKACD-AwAA7QoAIP8DAADyCgAgggQAABgAIIMEAAAYACCEBAAAAQAgAzoAAPAKACD-AwAA8QoAIIQEAABWACADOgAA7goAIP4DAADvCgAghAQAAAEAIAM6AADsCgAg_gMAAO0KACCEBAAAAQAgAAAAAAABgQQAAACyAwIFOgAA5AoAIDsAAOoKACD-AwAA5QoAIP8DAADpCgAghAQAAFYAIAU6AADiCgAgOwAA5woAIP4DAADjCgAg_wMAAOYKACCEBAAAAQAgAzoAAOQKACD-AwAA5QoAIIQEAABWACADOgAA4goAIP4DAADjCgAghAQAAAEAIAAAAAAABYEECAAAAAGIBAgAAAABiQQIAAAAAYoECAAAAAGLBAgAAAABBYEECAAAAAGIBAgAAAABiQQIAAAAAYoECAAAAAGLBAgAAAABBToAAN0KACA7AADgCgAg_gMAAN4KACD_AwAA3woAIIQEAAANACADOgAA3QoAIP4DAADeCgAghAQAAA0AIAsFAAD6CQAgCQAA7gkAIAsAAPwJACAMAAD9CQAg0gMAALkFACDTAwAAuQUAINgDAAC5BQAg2QMAALkFACDaAwAAuQUAINsDAAC5BQAg3QMAALkFACAAAAAAAAGBBAAAAL8DAgU6AADPCgAgOwAA2woAIP4DAADQCgAg_wMAANoKACCEBAAADQAgBzoAAM0KACA7AADYCgAg_gMAAM4KACD_AwAA1woAIIIEAAAPACCDBAAADwAghAQAABEAIAU6AADLCgAgOwAA1QoAIP4DAADMCgAg_wMAANQKACCEBAAAVgAgBzoAAMkKACA7AADSCgAg_gMAAMoKACD_AwAA0QoAIIIEAAAYACCDBAAAGAAghAQAAAEAIAM6AADPCgAg_gMAANAKACCEBAAADQAgAzoAAM0KACD-AwAAzgoAIIQEAAARACADOgAAywoAIP4DAADMCgAghAQAAFYAIAM6AADJCgAg_gMAAMoKACCEBAAAAQAgAAAAAAABgQQAAADGAwICgQQBAAAABIcEAQAAAAUCgQQCAAAABIcEAgAAAAUFOgAAwwoAIDsAAMcKACD-AwAAxAoAIP8DAADGCgAghAQAAA0AIAs6AACzBgAwOwAAuAYAMP4DAAC0BgAw_wMAALUGADCABAAAtgYAIIEEAAC3BgAwggQAALcGADCDBAAAtwYAMIQEAAC3BgAwhQQAALkGADCGBAAAugYAMBEFAACnBgAgBgAApQYAIAgAAKgGACDZAgEAAAAB2gIBAAAAAd4CAAAAvwMC4wJAAAAAAeQCQAAAAAGUAwIAAAABtgMBAAAAAb0DQAAAAAG_A0AAAAABwAMBAAAAAcEDAQAAAAHCAwIAAAABwwNAAAAAAcQDAQAAAAECAAAAFQAgOgAAvgYAIAMAAAAVACA6AAC-BgAgOwAAvQYAIAEzAADFCgAwFgUAAJcFACAGAADmBAAgBwAArwUAIAgAAIUFACDWAgAArQUAMNcCAAATABDYAgAArQUAMNkCAQAAAAHaAgEAuwQAId4CAACuBb8DIuMCQAC8BAAh5AJAALwEACGUAwIAvQQAIbYDAQC7BAAhvAMBAOUEACG9A0AAvAQAIb8DQADkBAAhwAMBAOUEACHBAwEA5QQAIcIDAgC9BAAhwwNAAOQEACHEAwEAAAABAgAAABUAIDMAAL0GACACAAAAuwYAIDMAALwGACAS1gIAALoGADDXAgAAuwYAENgCAAC6BgAw2QIBALsEACHaAgEAuwQAId4CAACuBb8DIuMCQAC8BAAh5AJAALwEACGUAwIAvQQAIbYDAQC7BAAhvAMBAOUEACG9A0AAvAQAIb8DQADkBAAhwAMBAOUEACHBAwEA5QQAIcIDAgC9BAAhwwNAAOQEACHEAwEA5QQAIRLWAgAAugYAMNcCAAC7BgAQ2AIAALoGADDZAgEAuwQAIdoCAQC7BAAh3gIAAK4FvwMi4wJAALwEACHkAkAAvAQAIZQDAgC9BAAhtgMBALsEACG8AwEA5QQAIb0DQAC8BAAhvwNAAOQEACHAAwEA5QQAIcEDAQDlBAAhwgMCAL0EACHDA0AA5AQAIcQDAQDlBAAhDtkCAQC9BQAh2gIBAL0FACHeAgAAoAa_AyLjAkAAwAUAIeQCQADABQAhlAMCAM0FACG2AwEAvQUAIb0DQADABQAhvwNAAMEFACHAAwEAvwUAIcEDAQC_BQAhwgMCAM0FACHDA0AAwQUAIcQDAQC_BQAhEQUAAKMGACAGAAChBgAgCAAApAYAINkCAQC9BQAh2gIBAL0FACHeAgAAoAa_AyLjAkAAwAUAIeQCQADABQAhlAMCAM0FACG2AwEAvQUAIb0DQADABQAhvwNAAMEFACHAAwEAvwUAIcEDAQC_BQAhwgMCAM0FACHDA0AAwQUAIcQDAQC_BQAhEQUAAKcGACAGAAClBgAgCAAAqAYAINkCAQAAAAHaAgEAAAAB3gIAAAC_AwLjAkAAAAAB5AJAAAAAAZQDAgAAAAG2AwEAAAABvQNAAAAAAb8DQAAAAAHAAwEAAAABwQMBAAAAAcIDAgAAAAHDA0AAAAABxAMBAAAAAQGBBAEAAAAEAYEEAgAAAAQDOgAAwwoAIP4DAADECgAghAQAAA0AIAQ6AACzBgAw_gMAALQGADCABAAAtgYAIIQEAAC3BgAwAAAAAYEEAAAA1QMCBToAALwKACA7AADBCgAg_gMAAL0KACD_AwAAwAoAIIQEAABWACALOgAA2QYAMDsAAN4GADD-AwAA2gYAMP8DAADbBgAwgAQAANwGACCBBAAA3QYAMIIEAADdBgAwgwQAAN0GADCEBAAA3QYAMIUEAADfBgAwhgQAAOAGADALOgAA0AYAMDsAANQGADD-AwAA0QYAMP8DAADSBgAwgAQAANMGACCBBAAAtwYAMIIEAAC3BgAwgwQAALcGADCEBAAAtwYAMIUEAADVBgAwhgQAALoGADAHOgAAywYAIDsAAM4GACD-AwAAzAYAIP8DAADNBgAgggQAABwAIIMEAAAcACCEBAAArQIAIAnZAgEAAAAB3wIBAAAAAeMCQAAAAAHkAkAAAAABtwMIAAAAAbgDAQAAAAG5AwgAAAABugMIAAAAAbsDQAAAAAECAAAArQIAIDoAAMsGACADAAAAHAAgOgAAywYAIDsAAM8GACALAAAAHAAgMwAAzwYAINkCAQC9BQAh3wIBAL8FACHjAkAAwAUAIeQCQADABQAhtwMIAJYGACG4AwEAvQUAIbkDCACWBgAhugMIAJcGACG7A0AAwQUAIQnZAgEAvQUAId8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIbcDCACWBgAhuAMBAL0FACG5AwgAlgYAIboDCACXBgAhuwNAAMEFACERBQAApwYAIAcAAKYGACAIAACoBgAg2QIBAAAAAdoCAQAAAAHeAgAAAL8DAuMCQAAAAAHkAkAAAAABlAMCAAAAAbwDAQAAAAG9A0AAAAABvwNAAAAAAcADAQAAAAHBAwEAAAABwgMCAAAAAcMDQAAAAAHEAwEAAAABAgAAABUAIDoAANgGACADAAAAFQAgOgAA2AYAIDsAANcGACABMwAAvwoAMAIAAAAVACAzAADXBgAgAgAAALsGACAzAADWBgAgDtkCAQC9BQAh2gIBAL0FACHeAgAAoAa_AyLjAkAAwAUAIeQCQADABQAhlAMCAM0FACG8AwEAvwUAIb0DQADABQAhvwNAAMEFACHAAwEAvwUAIcEDAQC_BQAhwgMCAM0FACHDA0AAwQUAIcQDAQC_BQAhEQUAAKMGACAHAACiBgAgCAAApAYAINkCAQC9BQAh2gIBAL0FACHeAgAAoAa_AyLjAkAAwAUAIeQCQADABQAhlAMCAM0FACG8AwEAvwUAIb0DQADABQAhvwNAAMEFACHAAwEAvwUAIcEDAQC_BQAhwgMCAM0FACHDA0AAwQUAIcQDAQC_BQAhEQUAAKcGACAHAACmBgAgCAAAqAYAINkCAQAAAAHaAgEAAAAB3gIAAAC_AwLjAkAAAAAB5AJAAAAAAZQDAgAAAAG8AwEAAAABvQNAAAAAAb8DQAAAAAHAAwEAAAABwQMBAAAAAcIDAgAAAAHDA0AAAAABxAMBAAAAAQwJAADCBgAg2QIBAAAAAeMCQAAAAAHkAkAAAAABxgMAAADGAwLHAwAAvwYAIMgDAADABgAgyQNAAAAAAcoDQAAAAAHLAwgAAAABzAMBAAAAAc0DIAAAAAECAAAAEQAgOgAA5AYAIAMAAAARACA6AADkBgAgOwAA4wYAIAEzAAC-CgAwEQYAAOYEACAJAACJBQAg1gIAALAFADDXAgAADwAQ2AIAALAFADDZAgEAAAAB4wJAALwEACHkAkAAvAQAIbYDAQC7BAAhxgMAALEFxgMixwMAAO0EACDIAwAA7gQAIMkDQAC8BAAhygNAAOQEACHLAwgA4gQAIcwDAQDlBAAhzQMgAMYEACECAAAAEQAgMwAA4wYAIAIAAADhBgAgMwAA4gYAIA_WAgAA4AYAMNcCAADhBgAQ2AIAAOAGADDZAgEAuwQAIeMCQAC8BAAh5AJAALwEACG2AwEAuwQAIcYDAACxBcYDIscDAADtBAAgyAMAAO4EACDJA0AAvAQAIcoDQADkBAAhywMIAOIEACHMAwEA5QQAIc0DIADGBAAhD9YCAADgBgAw1wIAAOEGABDYAgAA4AYAMNkCAQC7BAAh4wJAALwEACHkAkAAvAQAIbYDAQC7BAAhxgMAALEFxgMixwMAAO0EACDIAwAA7gQAIMkDQAC8BAAhygNAAOQEACHLAwgA4gQAIcwDAQDlBAAhzQMgAMYEACEL2QIBAL0FACHjAkAAwAUAIeQCQADABQAhxgMAAK4GxgMixwMAAK8GACDIAwAAsAYAIMkDQADABQAhygNAAMEFACHLAwgAlgYAIcwDAQC_BQAhzQMgAOYFACEMCQAAsgYAINkCAQC9BQAh4wJAAMAFACHkAkAAwAUAIcYDAACuBsYDIscDAACvBgAgyAMAALAGACDJA0AAwAUAIcoDQADBBQAhywMIAJYGACHMAwEAvwUAIc0DIADmBQAhDAkAAMIGACDZAgEAAAAB4wJAAAAAAeQCQAAAAAHGAwAAAMYDAscDAAC_BgAgyAMAAMAGACDJA0AAAAABygNAAAAAAcsDCAAAAAHMAwEAAAABzQMgAAAAAQM6AAC8CgAg_gMAAL0KACCEBAAAVgAgBDoAANkGADD-AwAA2gYAMIAEAADcBgAghAQAAN0GADAEOgAA0AYAMP4DAADRBgAwgAQAANMGACCEBAAAtwYAMAM6AADLBgAg_gMAAMwGACCEBAAArQIAIAAAAAGBBAAAAN8DAgGBBAAAAOIDAgU6AAC0CgAgOwAAugoAIP4DAAC1CgAg_wMAALkKACCEBAAACQAgBToAALIKACA7AAC3CgAg_gMAALMKACD_AwAAtgoAIIQEAAABACADOgAAtAoAIP4DAAC1CgAghAQAAAkAIAM6AACyCgAg_gMAALMKACCEBAAAAQAgAAAAAoEEAQAAAASHBAEAAAAFBToAAKoKACA7AACwCgAg_gMAAKsKACD_AwAArwoAIIQEAAAJACAFOgAAqAoAIDsAAK0KACD-AwAAqQoAIP8DAACsCgAghAQAAAEAIAGBBAEAAAAEAzoAAKoKACD-AwAAqwoAIIQEAAAJACADOgAAqAoAIP4DAACpCgAghAQAAAEAIAAAAAU6AACdCgAgOwAApgoAIP4DAACeCgAg_wMAAKUKACCEBAAAVgAgBToAAJsKACA7AACjCgAg_gMAAJwKACD_AwAAogoAIIQEAAABACALOgAAmwcAMDsAAKAHADD-AwAAnAcAMP8DAACdBwAwgAQAAJ4HACCBBAAAnwcAMIIEAACfBwAwgwQAAJ8HADCEBAAAnwcAMIUEAAChBwAwhgQAAKIHADALOgAAjwcAMDsAAJQHADD-AwAAkAcAMP8DAACRBwAwgAQAAJIHACCBBAAAkwcAMIIEAACTBwAwgwQAAJMHADCEBAAAkwcAMIUEAACVBwAwhgQAAJYHADALOgAAgwcAMDsAAIgHADD-AwAAhAcAMP8DAACFBwAwgAQAAIYHACCBBAAAhwcAMIIEAACHBwAwgwQAAIcHADCEBAAAhwcAMIUEAACJBwAwhgQAAIoHADALBQAA3gUAIBYAAOAFACDZAgEAAAAB2gIBAAAAAeMCQAAAAAHwAgEAAAABhAMBAAAAAYUDAQAAAAGGAwEAAAABhwOAAAAAAYgDAQAAAAECAAAAMgAgOgAAjgcAIAMAAAAyACA6AACOBwAgOwAAjQcAIAEzAAChCgAwEAUAAJsFACAVAACdBQAgFgAAhQUAINYCAACcBQAw1wIAADAAENgCAACcBQAw2QIBAAAAAdoCAQDlBAAh4wJAALwEACHwAgEA5QQAIYMDAQDlBAAhhAMBALsEACGFAwEAuwQAIYYDAQDlBAAhhwMAAJoFACCIAwEA5QQAIQIAAAAyACAzAACNBwAgAgAAAIsHACAzAACMBwAgDdYCAACKBwAw1wIAAIsHABDYAgAAigcAMNkCAQC7BAAh2gIBAOUEACHjAkAAvAQAIfACAQDlBAAhgwMBAOUEACGEAwEAuwQAIYUDAQC7BAAhhgMBAOUEACGHAwAAmgUAIIgDAQDlBAAhDdYCAACKBwAw1wIAAIsHABDYAgAAigcAMNkCAQC7BAAh2gIBAOUEACHjAkAAvAQAIfACAQDlBAAhgwMBAOUEACGEAwEAuwQAIYUDAQC7BAAhhgMBAOUEACGHAwAAmgUAIIgDAQDlBAAhCdkCAQC9BQAh2gIBAL8FACHjAkAAwAUAIfACAQC_BQAhhAMBAL0FACGFAwEAvQUAIYYDAQC_BQAhhwOAAAAAAYgDAQC_BQAhCwUAANsFACAWAADdBQAg2QIBAL0FACHaAgEAvwUAIeMCQADABQAh8AIBAL8FACGEAwEAvQUAIYUDAQC9BQAhhgMBAL8FACGHA4AAAAABiAMBAL8FACELBQAA3gUAIBYAAOAFACDZAgEAAAAB2gIBAAAAAeMCQAAAAAHwAgEAAAABhAMBAAAAAYUDAQAAAAGGAwEAAAABhwOAAAAAAYgDAQAAAAELHQAA8QYAINkCAQAAAAHeAgAAAOIDAuMCQAAAAAHkAkAAAAAB_gIBAAAAAYADQAAAAAHfAwAAAN8DAuADAQAAAAHiAwEAAAAB4wNAAAAAAQIAAABNACA6AACaBwAgAwAAAE0AIDoAAJoHACA7AACZBwAgATMAAKAKADAQFQAAkwUAIB0AAMcEACDWAgAAkAUAMNcCAABLABDYAgAAkAUAMNkCAQAAAAHeAgAAkgXiAyLjAkAAvAQAIeQCQAC8BAAh_gIBALsEACGAA0AAvAQAIYMDAQC7BAAh3wMAAJEF3wMi4AMBAAAAAeIDAQC7BAAh4wNAAOQEACECAAAATQAgMwAAmQcAIAIAAACXBwAgMwAAmAcAIA7WAgAAlgcAMNcCAACXBwAQ2AIAAJYHADDZAgEAuwQAId4CAACSBeIDIuMCQAC8BAAh5AJAALwEACH-AgEAuwQAIYADQAC8BAAhgwMBALsEACHfAwAAkQXfAyLgAwEAuwQAIeIDAQC7BAAh4wNAAOQEACEO1gIAAJYHADDXAgAAlwcAENgCAACWBwAw2QIBALsEACHeAgAAkgXiAyLjAkAAvAQAIeQCQAC8BAAh_gIBALsEACGAA0AAvAQAIYMDAQC7BAAh3wMAAJEF3wMi4AMBALsEACHiAwEAuwQAIeMDQADkBAAhCtkCAQC9BQAh3gIAAO0G4gMi4wJAAMAFACHkAkAAwAUAIf4CAQC9BQAhgANAAMAFACHfAwAA7AbfAyLgAwEAvQUAIeIDAQC9BQAh4wNAAMEFACELHQAA7wYAINkCAQC9BQAh3gIAAO0G4gMi4wJAAMAFACHkAkAAwAUAIf4CAQC9BQAhgANAAMAFACHfAwAA7AbfAyLgAwEAvQUAIeIDAQC9BQAh4wNAAMEFACELHQAA8QYAINkCAQAAAAHeAgAAAOIDAuMCQAAAAAHkAkAAAAAB_gIBAAAAAYADQAAAAAHfAwAAAN8DAuADAQAAAAHiAwEAAAAB4wNAAAAAAQgWAAD6BgAg2QIBAAAAAeQCQAAAAAHwAgEAAAABzQMgAAAAAd8DAAAA3wMC5AMAAPgGACDlA0AAAAABAgAAAAUAIDoAAKYHACADAAAABQAgOgAApgcAIDsAAKUHACABMwAAnwoAMA4VAACTBQAgFgAAxwQAINYCAAC4BQAw1wIAAAMAENgCAAC4BQAw2QIBAAAAAeQCQAC8BAAh8AIBALsEACGDAwEAuwQAIc0DIADGBAAh3wMAAJEF3wMi5AMAAO0EACDlA0AAvAQAIfsDAAC3BQAgAgAAAAUAIDMAAKUHACACAAAAowcAIDMAAKQHACAL1gIAAKIHADDXAgAAowcAENgCAACiBwAw2QIBALsEACHkAkAAvAQAIfACAQC7BAAhgwMBALsEACHNAyAAxgQAId8DAACRBd8DIuQDAADtBAAg5QNAALwEACEL1gIAAKIHADDXAgAAowcAENgCAACiBwAw2QIBALsEACHkAkAAvAQAIfACAQC7BAAhgwMBALsEACHNAyAAxgQAId8DAACRBd8DIuQDAADtBAAg5QNAALwEACEH2QIBAL0FACHkAkAAwAUAIfACAQC9BQAhzQMgAOYFACHfAwAA7AbfAyLkAwAA9QYAIOUDQADABQAhCBYAAPcGACDZAgEAvQUAIeQCQADABQAh8AIBAL0FACHNAyAA5gUAId8DAADsBt8DIuQDAAD1BgAg5QNAAMAFACEIFgAA-gYAINkCAQAAAAHkAkAAAAAB8AIBAAAAAc0DIAAAAAHfAwAAAN8DAuQDAAD4BgAg5QNAAAAAAQM6AACdCgAg_gMAAJ4KACCEBAAAVgAgAzoAAJsKACD-AwAAnAoAIIQEAAABACAEOgAAmwcAMP4DAACcBwAwgAQAAJ4HACCEBAAAnwcAMAQ6AACPBwAw_gMAAJAHADCABAAAkgcAIIQEAACTBwAwBDoAAIMHADD-AwAAhAcAMIAEAACGBwAghAQAAIcHADAAAAACgQQBAAAABIcEAQAAAAUCgQQBAAAABIcEAQAAAAUFOgAAjQoAIDsAAJkKACD-AwAAjgoAIP8DAACYCgAghAQAAAEAIAs6AACVCAAwOwAAmggAMP4DAACWCAAw_wMAAJcIADCABAAAmAgAIIEEAACZCAAwggQAAJkIADCDBAAAmQgAMIQEAACZCAAwhQQAAJsIADCGBAAAnAgAMAs6AACJCAAwOwAAjggAMP4DAACKCAAw_wMAAIsIADCABAAAjAgAIIEEAACNCAAwggQAAI0IADCDBAAAjQgAMIQEAACNCAAwhQQAAI8IADCGBAAAkAgAMAs6AACACAAwOwAAhAgAMP4DAACBCAAw_wMAAIIIADCABAAAgwgAIIEEAAC3BgAwggQAALcGADCDBAAAtwYAMIQEAAC3BgAwhQQAAIUIADCGBAAAugYAMAs6AAD0BwAwOwAA-QcAMP4DAAD1BwAw_wMAAPYHADCABAAA9wcAIIEEAAD4BwAwggQAAPgHADCDBAAA-AcAMIQEAAD4BwAwhQQAAPoHADCGBAAA-wcAMAs6AADoBwAwOwAA7QcAMP4DAADpBwAw_wMAAOoHADCABAAA6wcAIIEEAADsBwAwggQAAOwHADCDBAAA7AcAMIQEAADsBwAwhQQAAO4HADCGBAAA7wcAMAs6AADcBwAwOwAA4QcAMP4DAADdBwAw_wMAAN4HADCABAAA3wcAIIEEAADgBwAwggQAAOAHADCDBAAA4AcAMIQEAADgBwAwhQQAAOIHADCGBAAA4wcAMAs6AADTBwAwOwAA1wcAMP4DAADUBwAw_wMAANUHADCABAAA1gcAIIEEAACHBwAwggQAAIcHADCDBAAAhwcAMIQEAACHBwAwhQQAANgHADCGBAAAigcAMAs6AADHBwAwOwAAzAcAMP4DAADIBwAw_wMAAMkHADCABAAAygcAIIEEAADLBwAwggQAAMsHADCDBAAAywcAMIQEAADLBwAwhQQAAM0HADCGBAAAzgcAMAs6AAC7BwAwOwAAwAcAMP4DAAC8BwAw_wMAAL0HADCABAAAvgcAIIEEAAC_BwAwggQAAL8HADCDBAAAvwcAMIQEAAC_BwAwhQQAAMEHADCGBAAAwgcAMAwZAADGBQAgGgAAxwUAINkCAQAAAAHbAgEAAAAB3AIBAAAAAd4CAAAA3gIC3wIBAAAAAeACAQAAAAHhAkAAAAAB4gJAAAAAAeMCQAAAAAHkAkAAAAABAgAAAD8AIDoAAMYHACADAAAAPwAgOgAAxgcAIDsAAMUHACABMwAAlwoAMBIFAACXBQAgGQAAxwQAIBoAAMcEACDWAgAAlQUAMNcCAAA9ABDYAgAAlQUAMNkCAQAAAAHaAgEAuwQAIdsCAQC7BAAh3AIBALsEACHeAgAAlgXeAiLfAgEA5QQAIeACAQDlBAAh4QJAALwEACHiAkAA5AQAIeMCQAC8BAAh5AJAALwEACH6AwAAlAUAIAIAAAA_ACAzAADFBwAgAgAAAMMHACAzAADEBwAgDtYCAADCBwAw1wIAAMMHABDYAgAAwgcAMNkCAQC7BAAh2gIBALsEACHbAgEAuwQAIdwCAQC7BAAh3gIAAJYF3gIi3wIBAOUEACHgAgEA5QQAIeECQAC8BAAh4gJAAOQEACHjAkAAvAQAIeQCQAC8BAAhDtYCAADCBwAw1wIAAMMHABDYAgAAwgcAMNkCAQC7BAAh2gIBALsEACHbAgEAuwQAIdwCAQC7BAAh3gIAAJYF3gIi3wIBAOUEACHgAgEA5QQAIeECQAC8BAAh4gJAAOQEACHjAkAAvAQAIeQCQAC8BAAhCtkCAQC9BQAh2wIBAL0FACHcAgEAvQUAId4CAAC-Bd4CIt8CAQC_BQAh4AIBAL8FACHhAkAAwAUAIeICQADBBQAh4wJAAMAFACHkAkAAwAUAIQwZAADDBQAgGgAAxAUAINkCAQC9BQAh2wIBAL0FACHcAgEAvQUAId4CAAC-Bd4CIt8CAQC_BQAh4AIBAL8FACHhAkAAwAUAIeICQADBBQAh4wJAAMAFACHkAkAAwAUAIQwZAADGBQAgGgAAxwUAINkCAQAAAAHbAgEAAAAB3AIBAAAAAd4CAAAA3gIC3wIBAAAAAeACAQAAAAHhAkAAAAAB4gJAAAAAAeMCQAAAAAHkAkAAAAABDBYAAPAFACAzgAAAAAHZAgEAAAAB4wJAAAAAAfACAQAAAAGWAwAAAJYDApcDAQAAAAGYAwEAAAABmQMgAAAAAZoDQAAAAAGbAwEAAAABnAMgAAAAAQIAAAA6ACA6AADSBwAgAwAAADoAIDoAANIHACA7AADRBwAgATMAAJYKADARBQAAmwUAIBYAAMcEACAzAACaBQAg1gIAAJgFADDXAgAAOAAQ2AIAAJgFADDZAgEAAAAB2gIBAOUEACHjAkAAvAQAIfACAQC7BAAhlgMAAJkFlgMilwMBALsEACGYAwEAuwQAIZkDIADGBAAhmgNAAOQEACGbAwEAuwQAIZwDIADGBAAhAgAAADoAIDMAANEHACACAAAAzwcAIDMAANAHACAPMwAAmgUAINYCAADOBwAw1wIAAM8HABDYAgAAzgcAMNkCAQC7BAAh2gIBAOUEACHjAkAAvAQAIfACAQC7BAAhlgMAAJkFlgMilwMBALsEACGYAwEAuwQAIZkDIADGBAAhmgNAAOQEACGbAwEAuwQAIZwDIADGBAAhDzMAAJoFACDWAgAAzgcAMNcCAADPBwAQ2AIAAM4HADDZAgEAuwQAIdoCAQDlBAAh4wJAALwEACHwAgEAuwQAIZYDAACZBZYDIpcDAQC7BAAhmAMBALsEACGZAyAAxgQAIZoDQADkBAAhmwMBALsEACGcAyAAxgQAIQszgAAAAAHZAgEAvQUAIeMCQADABQAh8AIBAL0FACGWAwAA7QWWAyKXAwEAvQUAIZgDAQC9BQAhmQMgAOYFACGaA0AAwQUAIZsDAQC9BQAhnAMgAOYFACEMFgAA7gUAIDOAAAAAAdkCAQC9BQAh4wJAAMAFACHwAgEAvQUAIZYDAADtBZYDIpcDAQC9BQAhmAMBAL0FACGZAyAA5gUAIZoDQADBBQAhmwMBAL0FACGcAyAA5gUAIQwWAADwBQAgM4AAAAAB2QIBAAAAAeMCQAAAAAHwAgEAAAABlgMAAACWAwKXAwEAAAABmAMBAAAAAZkDIAAAAAGaA0AAAAABmwMBAAAAAZwDIAAAAAELFQAA3wUAIBYAAOAFACDZAgEAAAAB4wJAAAAAAfACAQAAAAGDAwEAAAABhAMBAAAAAYUDAQAAAAGGAwEAAAABhwOAAAAAAYgDAQAAAAECAAAAMgAgOgAA2wcAIAMAAAAyACA6AADbBwAgOwAA2gcAIAEzAACVCgAwAgAAADIAIDMAANoHACACAAAAiwcAIDMAANkHACAJ2QIBAL0FACHjAkAAwAUAIfACAQC_BQAhgwMBAL8FACGEAwEAvQUAIYUDAQC9BQAhhgMBAL8FACGHA4AAAAABiAMBAL8FACELFQAA3AUAIBYAAN0FACDZAgEAvQUAIeMCQADABQAh8AIBAL8FACGDAwEAvwUAIYQDAQC9BQAhhQMBAL0FACGGAwEAvwUAIYcDgAAAAAGIAwEAvwUAIQsVAADfBQAgFgAA4AUAINkCAQAAAAHjAkAAAAAB8AIBAAAAAYMDAQAAAAGEAwEAAAABhQMBAAAAAYYDAQAAAAGHA4AAAAABiAMBAAAAAQwSAAD6BQAgEwAA-wUAINkCAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGdAwEAAAABnwMAAACfAwKgAwEAAAABoQOAAAAAAaIDIAAAAAGjAwEAAAABAgAAAC0AIDoAAOcHACADAAAALQAgOgAA5wcAIDsAAOYHACABMwAAlAoAMBEFAACXBQAgEgAAxwQAIBMAAIUFACDWAgAAngUAMNcCAAArABDYAgAAngUAMNkCAQAAAAHaAgEAuwQAIeMCQAC8BAAh5AJAALwEACGXAwEAuwQAIZ0DAQC7BAAhnwMAAJ8FnwMioAMBALsEACGhAwAAmgUAIKIDIADGBAAhowMBAOUEACECAAAALQAgMwAA5gcAIAIAAADkBwAgMwAA5QcAIA7WAgAA4wcAMNcCAADkBwAQ2AIAAOMHADDZAgEAuwQAIdoCAQC7BAAh4wJAALwEACHkAkAAvAQAIZcDAQC7BAAhnQMBALsEACGfAwAAnwWfAyKgAwEAuwQAIaEDAACaBQAgogMgAMYEACGjAwEA5QQAIQ7WAgAA4wcAMNcCAADkBwAQ2AIAAOMHADDZAgEAuwQAIdoCAQC7BAAh4wJAALwEACHkAkAAvAQAIZcDAQC7BAAhnQMBALsEACGfAwAAnwWfAyKgAwEAuwQAIaEDAACaBQAgogMgAMYEACGjAwEA5QQAIQrZAgEAvQUAIeMCQADABQAh5AJAAMAFACGXAwEAvQUAIZ0DAQC9BQAhnwMAAPUFnwMioAMBAL0FACGhA4AAAAABogMgAOYFACGjAwEAvwUAIQwSAAD3BQAgEwAA-AUAINkCAQC9BQAh4wJAAMAFACHkAkAAwAUAIZcDAQC9BQAhnQMBAL0FACGfAwAA9QWfAyKgAwEAvQUAIaEDgAAAAAGiAyAA5gUAIaMDAQC_BQAhDBIAAPoFACATAAD7BQAg2QIBAAAAAeMCQAAAAAHkAkAAAAABlwMBAAAAAZ0DAQAAAAGfAwAAAJ8DAqADAQAAAAGhA4AAAAABogMgAAAAAaMDAQAAAAEODwAAhQYAIBAAAIYGACDZAgEAAAAB3gIAAACqAwLfAgEAAAAB4wJAAAAAAeQCQAAAAAGXAwEAAAABpAMBAAAAAaUDAQAAAAGmA0AAAAABqAMAAACoAwKqA0AAAAABqwMBAAAAAQIAAAAnACA6AADzBwAgAwAAACcAIDoAAPMHACA7AADyBwAgATMAAJMKADATBQAAlwUAIA8AAIUFACAQAACFBQAg1gIAAKAFADDXAgAAJQAQ2AIAAKAFADDZAgEAAAAB2gIBALsEACHeAgAAogWqAyLfAgEA5QQAIeMCQAC8BAAh5AJAALwEACGXAwEAuwQAIaQDAQDlBAAhpQMBAOUEACGmA0AAvAQAIagDAAChBagDIqoDQADkBAAhqwMBAOUEACECAAAAJwAgMwAA8gcAIAIAAADwBwAgMwAA8QcAIBDWAgAA7wcAMNcCAADwBwAQ2AIAAO8HADDZAgEAuwQAIdoCAQC7BAAh3gIAAKIFqgMi3wIBAOUEACHjAkAAvAQAIeQCQAC8BAAhlwMBALsEACGkAwEA5QQAIaUDAQDlBAAhpgNAALwEACGoAwAAoQWoAyKqA0AA5AQAIasDAQDlBAAhENYCAADvBwAw1wIAAPAHABDYAgAA7wcAMNkCAQC7BAAh2gIBALsEACHeAgAAogWqAyLfAgEA5QQAIeMCQAC8BAAh5AJAALwEACGXAwEAuwQAIaQDAQDlBAAhpQMBAOUEACGmA0AAvAQAIagDAAChBagDIqoDQADkBAAhqwMBAOUEACEM2QIBAL0FACHeAgAAgAaqAyLfAgEAvwUAIeMCQADABQAh5AJAAMAFACGXAwEAvQUAIaQDAQC_BQAhpQMBAL8FACGmA0AAwAUAIagDAAD_BagDIqoDQADBBQAhqwMBAL8FACEODwAAggYAIBAAAIMGACDZAgEAvQUAId4CAACABqoDIt8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIZcDAQC9BQAhpAMBAL8FACGlAwEAvwUAIaYDQADABQAhqAMAAP8FqAMiqgNAAMEFACGrAwEAvwUAIQ4PAACFBgAgEAAAhgYAINkCAQAAAAHeAgAAAKoDAt8CAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGkAwEAAAABpQMBAAAAAaYDQAAAAAGoAwAAAKgDAqoDQAAAAAGrAwEAAAABEAMAAJAGACDZAgEAAAAB3gIAAACyAwLfAgEAAAAB4wJAAAAAAeQCQAAAAAGXAwEAAAABrAMBAAAAAa0DAQAAAAGuAwEAAAABrwMBAAAAAbADQAAAAAGyAwIAAAABswMgAAAAAbQDAQAAAAG1AwEAAAABAgAAACMAIDoAAP8HACADAAAAIwAgOgAA_wcAIDsAAP4HACABMwAAkgoAMBUDAADHBAAgBQAAlwUAINYCAACjBQAw1wIAACEAENgCAACjBQAw2QIBAAAAAdoCAQC7BAAh3gIAAKQFsgMi3wIBAOUEACHjAkAAvAQAIeQCQAC8BAAhlwMBALsEACGsAwEAuwQAIa0DAQDlBAAhrgMBALsEACGvAwEA5QQAIbADQAC8BAAhsgMCAL0EACGzAyAAxgQAIbQDAQDlBAAhtQMBALsEACECAAAAIwAgMwAA_gcAIAIAAAD8BwAgMwAA_QcAIBPWAgAA-wcAMNcCAAD8BwAQ2AIAAPsHADDZAgEAuwQAIdoCAQC7BAAh3gIAAKQFsgMi3wIBAOUEACHjAkAAvAQAIeQCQAC8BAAhlwMBALsEACGsAwEAuwQAIa0DAQDlBAAhrgMBALsEACGvAwEA5QQAIbADQAC8BAAhsgMCAL0EACGzAyAAxgQAIbQDAQDlBAAhtQMBALsEACET1gIAAPsHADDXAgAA_AcAENgCAAD7BwAw2QIBALsEACHaAgEAuwQAId4CAACkBbIDIt8CAQDlBAAh4wJAALwEACHkAkAAvAQAIZcDAQC7BAAhrAMBALsEACGtAwEA5QQAIa4DAQC7BAAhrwMBAOUEACGwA0AAvAQAIbIDAgC9BAAhswMgAMYEACG0AwEA5QQAIbUDAQC7BAAhD9kCAQC9BQAh3gIAAIwGsgMi3wIBAL8FACHjAkAAwAUAIeQCQADABQAhlwMBAL0FACGsAwEAvQUAIa0DAQC_BQAhrgMBAL0FACGvAwEAvwUAIbADQADABQAhsgMCAM0FACGzAyAA5gUAIbQDAQC_BQAhtQMBAL0FACEQAwAAjgYAINkCAQC9BQAh3gIAAIwGsgMi3wIBAL8FACHjAkAAwAUAIeQCQADABQAhlwMBAL0FACGsAwEAvQUAIa0DAQC_BQAhrgMBAL0FACGvAwEAvwUAIbADQADABQAhsgMCAM0FACGzAyAA5gUAIbQDAQC_BQAhtQMBAL0FACEQAwAAkAYAINkCAQAAAAHeAgAAALIDAt8CAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGsAwEAAAABrQMBAAAAAa4DAQAAAAGvAwEAAAABsANAAAAAAbIDAgAAAAGzAyAAAAABtAMBAAAAAbUDAQAAAAERBgAApQYAIAcAAKYGACAIAACoBgAg2QIBAAAAAd4CAAAAvwMC4wJAAAAAAeQCQAAAAAGUAwIAAAABtgMBAAAAAbwDAQAAAAG9A0AAAAABvwNAAAAAAcADAQAAAAHBAwEAAAABwgMCAAAAAcMDQAAAAAHEAwEAAAABAgAAABUAIDoAAIgIACADAAAAFQAgOgAAiAgAIDsAAIcIACABMwAAkQoAMAIAAAAVACAzAACHCAAgAgAAALsGACAzAACGCAAgDtkCAQC9BQAh3gIAAKAGvwMi4wJAAMAFACHkAkAAwAUAIZQDAgDNBQAhtgMBAL0FACG8AwEAvwUAIb0DQADABQAhvwNAAMEFACHAAwEAvwUAIcEDAQC_BQAhwgMCAM0FACHDA0AAwQUAIcQDAQC_BQAhEQYAAKEGACAHAACiBgAgCAAApAYAINkCAQC9BQAh3gIAAKAGvwMi4wJAAMAFACHkAkAAwAUAIZQDAgDNBQAhtgMBAL0FACG8AwEAvwUAIb0DQADABQAhvwNAAMEFACHAAwEAvwUAIcEDAQC_BQAhwgMCAM0FACHDA0AAwQUAIcQDAQC_BQAhEQYAAKUGACAHAACmBgAgCAAAqAYAINkCAQAAAAHeAgAAAL8DAuMCQAAAAAHkAkAAAAABlAMCAAAAAbYDAQAAAAG8AwEAAAABvQNAAAAAAb8DQAAAAAHAAwEAAAABwQMBAAAAAcIDAgAAAAHDA0AAAAABxAMBAAAAARIJAADnBgAgCwAA5gYAIAwAAOgGACDZAgEAAAAB4wJAAAAAAeQCQAAAAAHRAwEAAAAB0gMBAAAAAdMDAQAAAAHVAwAAANUDAtYDAQAAAAHXAwEAAAAB2AMBAAAAAdkDAQAAAAHaAwEAAAAB2wMBAAAAAdwDIAAAAAHdAwEAAAABAgAAAA0AIDoAAJQIACADAAAADQAgOgAAlAgAIDsAAJMIACABMwAAkAoAMBcFAACXBQAgCQAAiQUAIAsAALQFACAMAAC1BQAg1gIAALIFADDXAgAACwAQ2AIAALIFADDZAgEAAAAB2gIBALsEACHjAkAAvAQAIeQCQAC8BAAh0QMBALsEACHSAwEA5QQAIdMDAQDlBAAh1QMAALMF1QMi1gMBALsEACHXAwEAuwQAIdgDAQDlBAAh2QMBAOUEACHaAwEA5QQAIdsDAQDlBAAh3AMgAMYEACHdAwEA5QQAIQIAAAANACAzAACTCAAgAgAAAJEIACAzAACSCAAgE9YCAACQCAAw1wIAAJEIABDYAgAAkAgAMNkCAQC7BAAh2gIBALsEACHjAkAAvAQAIeQCQAC8BAAh0QMBALsEACHSAwEA5QQAIdMDAQDlBAAh1QMAALMF1QMi1gMBALsEACHXAwEAuwQAIdgDAQDlBAAh2QMBAOUEACHaAwEA5QQAIdsDAQDlBAAh3AMgAMYEACHdAwEA5QQAIRPWAgAAkAgAMNcCAACRCAAQ2AIAAJAIADDZAgEAuwQAIdoCAQC7BAAh4wJAALwEACHkAkAAvAQAIdEDAQC7BAAh0gMBAOUEACHTAwEA5QQAIdUDAACzBdUDItYDAQC7BAAh1wMBALsEACHYAwEA5QQAIdkDAQDlBAAh2gMBAOUEACHbAwEA5QQAIdwDIADGBAAh3QMBAOUEACEP2QIBAL0FACHjAkAAwAUAIeQCQADABQAh0QMBAL0FACHSAwEAvwUAIdMDAQC_BQAh1QMAAMYG1QMi1gMBAL0FACHXAwEAvQUAIdgDAQC_BQAh2QMBAL8FACHaAwEAvwUAIdsDAQC_BQAh3AMgAOYFACHdAwEAvwUAIRIJAADJBgAgCwAAyAYAIAwAAMoGACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACHRAwEAvQUAIdIDAQC_BQAh0wMBAL8FACHVAwAAxgbVAyLWAwEAvQUAIdcDAQC9BQAh2AMBAL8FACHZAwEAvwUAIdoDAQC_BQAh2wMBAL8FACHcAyAA5gUAId0DAQC_BQAhEgkAAOcGACALAADmBgAgDAAA6AYAINkCAQAAAAHjAkAAAAAB5AJAAAAAAdEDAQAAAAHSAwEAAAAB0wMBAAAAAdUDAAAA1QMC1gMBAAAAAdcDAQAAAAHYAwEAAAAB2QMBAAAAAdoDAQAAAAHbAwEAAAAB3AMgAAAAAd0DAQAAAAEJAwAAqAcAIBcAAKsHACAcAACpBwAgHgAAqgcAINkCAQAAAAHjAkAAAAAB5AJAAAAAAbUDAQAAAAHRAwEAAAABAgAAAAkAIDoAAKAIACADAAAACQAgOgAAoAgAIDsAAJ8IACABMwAAjwoAMA4DAADHBAAgBQAAlwUAIBcAAI0FACAcAACnBQAgHgAAqAUAINYCAAC2BQAw1wIAAAcAENgCAAC2BQAw2QIBAAAAAdoCAQC7BAAh4wJAALwEACHkAkAAvAQAIbUDAQC7BAAh0QMBALsEACECAAAACQAgMwAAnwgAIAIAAACdCAAgMwAAnggAIAnWAgAAnAgAMNcCAACdCAAQ2AIAAJwIADDZAgEAuwQAIdoCAQC7BAAh4wJAALwEACHkAkAAvAQAIbUDAQC7BAAh0QMBALsEACEJ1gIAAJwIADDXAgAAnQgAENgCAACcCAAw2QIBALsEACHaAgEAuwQAIeMCQAC8BAAh5AJAALwEACG1AwEAuwQAIdEDAQC7BAAhBdkCAQC9BQAh4wJAAMAFACHkAkAAwAUAIbUDAQC9BQAh0QMBAL0FACEJAwAA_wYAIBcAAIIHACAcAACABwAgHgAAgQcAINkCAQC9BQAh4wJAAMAFACHkAkAAwAUAIbUDAQC9BQAh0QMBAL0FACEJAwAAqAcAIBcAAKsHACAcAACpBwAgHgAAqgcAINkCAQAAAAHjAkAAAAAB5AJAAAAAAbUDAQAAAAHRAwEAAAABAYEEAQAAAAQBgQQBAAAABAM6AACNCgAg_gMAAI4KACCEBAAAAQAgBDoAAJUIADD-AwAAlggAMIAEAACYCAAghAQAAJkIADAEOgAAiQgAMP4DAACKCAAwgAQAAIwIACCEBAAAjQgAMAQ6AACACAAw_gMAAIEIADCABAAAgwgAIIQEAAC3BgAwBDoAAPQHADD-AwAA9QcAMIAEAAD3BwAghAQAAPgHADAEOgAA6AcAMP4DAADpBwAwgAQAAOsHACCEBAAA7AcAMAQ6AADcBwAw_gMAAN0HADCABAAA3wcAIIQEAADgBwAwBDoAANMHADD-AwAA1AcAMIAEAADWBwAghAQAAIcHADAEOgAAxwcAMP4DAADIBwAwgAQAAMoHACCEBAAAywcAMAQ6AAC7BwAw_gMAALwHADCABAAAvgcAIIQEAAC_BwAwAAAAAYEEAAAA9AMCCzoAANAJADA7AADUCQAw_gMAANEJADD_AwAA0gkAMIAEAADTCQAggQQAAJ8HADCCBAAAnwcAMIMEAACfBwAwhAQAAJ8HADCFBAAA1QkAMIYEAACiBwAwCzoAAMcJADA7AADLCQAw_gMAAMgJADD_AwAAyQkAMIAEAADKCQAggQQAAJkIADCCBAAAmQgAMIMEAACZCAAwhAQAAJkIADCFBAAAzAkAMIYEAACcCAAwCzoAAL4JADA7AADCCQAw_gMAAL8JADD_AwAAwAkAMIAEAADBCQAggQQAAJMHADCCBAAAkwcAMIMEAACTBwAwhAQAAJMHADCFBAAAwwkAMIYEAACWBwAwCzoAALIJADA7AAC3CQAw_gMAALMJADD_AwAAtAkAMIAEAAC1CQAggQQAALYJADCCBAAAtgkAMIMEAAC2CQAwhAQAALYJADCFBAAAuAkAMIYEAAC5CQAwCzoAAKkJADA7AACtCQAw_gMAAKoJADD_AwAAqwkAMIAEAACsCQAggQQAALcGADCCBAAAtwYAMIMEAAC3BgAwhAQAALcGADCFBAAArgkAMIYEAAC6BgAwCzoAAKAJADA7AACkCQAw_gMAAKEJADD_AwAAogkAMIAEAACjCQAggQQAAOwHADCCBAAA7AcAMIMEAADsBwAwhAQAAOwHADCFBAAApQkAMIYEAADvBwAwCzoAAJcJADA7AACbCQAw_gMAAJgJADD_AwAAmQkAMIAEAACaCQAggQQAAOwHADCCBAAA7AcAMIMEAADsBwAwhAQAAOwHADCFBAAAnAkAMIYEAADvBwAwCzoAAI4JADA7AACSCQAw_gMAAI8JADD_AwAAkAkAMIAEAACRCQAggQQAAOAHADCCBAAA4AcAMIMEAADgBwAwhAQAAOAHADCFBAAAkwkAMIYEAADjBwAwCzoAAIUJADA7AACJCQAw_gMAAIYJADD_AwAAhwkAMIAEAACICQAggQQAAOAHADCCBAAA4AcAMIMEAADgBwAwhAQAAOAHADCFBAAAigkAMIYEAADjBwAwCzoAAPwIADA7AACACQAw_gMAAP0IADD_AwAA_ggAMIAEAAD_CAAggQQAAPgHADCCBAAA-AcAMIMEAAD4BwAwhAQAAPgHADCFBAAAgQkAMIYEAAD7BwAwCzoAAPMIADA7AAD3CAAw_gMAAPQIADD_AwAA9QgAMIAEAAD2CAAggQQAAMsHADCCBAAAywcAMIMEAADLBwAwhAQAAMsHADCFBAAA-AgAMIYEAADOBwAwBzoAAO4IACA7AADxCAAg_gMAAO8IACD_AwAA8AgAIIIEAABfACCDBAAAXwAghAQAAKUDACALOgAA5QgAMDsAAOkIADD-AwAA5ggAMP8DAADnCAAwgAQAAOgIACCBBAAAhwcAMIIEAACHBwAwgwQAAIcHADCEBAAAhwcAMIUEAADqCAAwhgQAAIoHADAHOgAA4AgAIDsAAOMIACD-AwAA4QgAIP8DAADiCAAgggQAAGIAIIMEAABiACCEBAAAZgAgCzoAANQIADA7AADZCAAw_gMAANUIADD_AwAA1ggAMIAEAADXCAAggQQAANgIADCCBAAA2AgAMIMEAADYCAAwhAQAANgIADCFBAAA2ggAMIYEAADbCAAwCzoAAMsIADA7AADPCAAw_gMAAMwIADD_AwAAzQgAMIAEAADOCAAggQQAAL8HADCCBAAAvwcAMIMEAAC_BwAwhAQAAL8HADCFBAAA0AgAMIYEAADCBwAwCzoAAMIIADA7AADGCAAw_gMAAMMIADD_AwAAxAgAMIAEAADFCAAggQQAAL8HADCCBAAAvwcAMIMEAAC_BwAwhAQAAL8HADCFBAAAxwgAMIYEAADCBwAwDAUAAMUFACAZAADGBQAg2QIBAAAAAdoCAQAAAAHbAgEAAAAB3gIAAADeAgLfAgEAAAAB4AIBAAAAAeECQAAAAAHiAkAAAAAB4wJAAAAAAeQCQAAAAAECAAAAPwAgOgAAyggAIAMAAAA_ACA6AADKCAAgOwAAyQgAIAEzAACMCgAwAgAAAD8AIDMAAMkIACACAAAAwwcAIDMAAMgIACAK2QIBAL0FACHaAgEAvQUAIdsCAQC9BQAh3gIAAL4F3gIi3wIBAL8FACHgAgEAvwUAIeECQADABQAh4gJAAMEFACHjAkAAwAUAIeQCQADABQAhDAUAAMIFACAZAADDBQAg2QIBAL0FACHaAgEAvQUAIdsCAQC9BQAh3gIAAL4F3gIi3wIBAL8FACHgAgEAvwUAIeECQADABQAh4gJAAMEFACHjAkAAwAUAIeQCQADABQAhDAUAAMUFACAZAADGBQAg2QIBAAAAAdoCAQAAAAHbAgEAAAAB3gIAAADeAgLfAgEAAAAB4AIBAAAAAeECQAAAAAHiAkAAAAAB4wJAAAAAAeQCQAAAAAEMBQAAxQUAIBoAAMcFACDZAgEAAAAB2gIBAAAAAdwCAQAAAAHeAgAAAN4CAt8CAQAAAAHgAgEAAAAB4QJAAAAAAeICQAAAAAHjAkAAAAAB5AJAAAAAAQIAAAA_ACA6AADTCAAgAwAAAD8AIDoAANMIACA7AADSCAAgATMAAIsKADACAAAAPwAgMwAA0ggAIAIAAADDBwAgMwAA0QgAIArZAgEAvQUAIdoCAQC9BQAh3AIBAL0FACHeAgAAvgXeAiLfAgEAvwUAIeACAQC_BQAh4QJAAMAFACHiAkAAwQUAIeMCQADABQAh5AJAAMAFACEMBQAAwgUAIBoAAMQFACDZAgEAvQUAIdoCAQC9BQAh3AIBAL0FACHeAgAAvgXeAiLfAgEAvwUAIeACAQC_BQAh4QJAAMAFACHiAkAAwQUAIeMCQADABQAh5AJAAMAFACEMBQAAxQUAIBoAAMcFACDZAgEAAAAB2gIBAAAAAdwCAQAAAAHeAgAAAN4CAt8CAQAAAAHgAgEAAAAB4QJAAAAAAeICQAAAAAHjAkAAAAAB5AJAAAAAARIWAADRBQAg2QIBAAAAAd4CAAAA_AIC4AIBAAAAAeMCQAAAAAHkAkAAAAAB8AIBAAAAAfECAQAAAAHyAgEAAAAB8wIBAAAAAfQCAQAAAAH1AgEAAAAB9gIBAAAAAfcCAQAAAAH4AgEAAAAB-QIBAAAAAfoCAgAAAAH9AkAAAAABAgAAAGYAIDoAAN8IACADAAAAZgAgOgAA3wgAIDsAAN4IACABMwAAigoAMBcWAADHBAAgKgAAhQUAINYCAACDBQAw1wIAAGIAENgCAACDBQAw2QIBAAAAAd4CAACEBfwCIuACAQDlBAAh4wJAALwEACHkAkAAvAQAIfACAQAAAAHxAgEAuwQAIfICAQC7BAAh8wIBALsEACH0AgEA5QQAIfUCAQC7BAAh9gIBAOUEACH3AgEAuwQAIfgCAQC7BAAh-QIBALsEACH6AgIAvQQAIfwCAQDlBAAh_QJAAOQEACECAAAAZgAgMwAA3ggAIAIAAADcCAAgMwAA3QgAIBXWAgAA2wgAMNcCAADcCAAQ2AIAANsIADDZAgEAuwQAId4CAACEBfwCIuACAQDlBAAh4wJAALwEACHkAkAAvAQAIfACAQC7BAAh8QIBALsEACHyAgEAuwQAIfMCAQC7BAAh9AIBAOUEACH1AgEAuwQAIfYCAQDlBAAh9wIBALsEACH4AgEAuwQAIfkCAQC7BAAh-gICAL0EACH8AgEA5QQAIf0CQADkBAAhFdYCAADbCAAw1wIAANwIABDYAgAA2wgAMNkCAQC7BAAh3gIAAIQF_AIi4AIBAOUEACHjAkAAvAQAIeQCQAC8BAAh8AIBALsEACHxAgEAuwQAIfICAQC7BAAh8wIBALsEACH0AgEA5QQAIfUCAQC7BAAh9gIBAOUEACH3AgEAuwQAIfgCAQC7BAAh-QIBALsEACH6AgIAvQQAIfwCAQDlBAAh_QJAAOQEACER2QIBAL0FACHeAgAAzgX8AiLgAgEAvwUAIeMCQADABQAh5AJAAMAFACHwAgEAvQUAIfECAQC9BQAh8gIBAL0FACHzAgEAvQUAIfQCAQC_BQAh9QIBAL0FACH2AgEAvwUAIfcCAQC9BQAh-AIBAL0FACH5AgEAvQUAIfoCAgDNBQAh_QJAAMEFACESFgAAzwUAINkCAQC9BQAh3gIAAM4F_AIi4AIBAL8FACHjAkAAwAUAIeQCQADABQAh8AIBAL0FACHxAgEAvQUAIfICAQC9BQAh8wIBAL0FACH0AgEAvwUAIfUCAQC9BQAh9gIBAL8FACH3AgEAvQUAIfgCAQC9BQAh-QIBAL0FACH6AgIAzQUAIf0CQADBBQAhEhYAANEFACDZAgEAAAAB3gIAAAD8AgLgAgEAAAAB4wJAAAAAAeQCQAAAAAHwAgEAAAAB8QIBAAAAAfICAQAAAAHzAgEAAAAB9AIBAAAAAfUCAQAAAAH2AgEAAAAB9wIBAAAAAfgCAQAAAAH5AgEAAAAB-gICAAAAAf0CQAAAAAESKgAA0gUAINkCAQAAAAHeAgAAAPwCAuACAQAAAAHjAkAAAAAB5AJAAAAAAfECAQAAAAHyAgEAAAAB8wIBAAAAAfQCAQAAAAH1AgEAAAAB9gIBAAAAAfcCAQAAAAH4AgEAAAAB-QIBAAAAAfoCAgAAAAH8AgEAAAAB_QJAAAAAAQIAAABmACA6AADgCAAgAwAAAGIAIDoAAOAIACA7AADkCAAgFAAAAGIAICoAANAFACAzAADkCAAg2QIBAL0FACHeAgAAzgX8AiLgAgEAvwUAIeMCQADABQAh5AJAAMAFACHxAgEAvQUAIfICAQC9BQAh8wIBAL0FACH0AgEAvwUAIfUCAQC9BQAh9gIBAL8FACH3AgEAvQUAIfgCAQC9BQAh-QIBAL0FACH6AgIAzQUAIfwCAQC_BQAh_QJAAMEFACESKgAA0AUAINkCAQC9BQAh3gIAAM4F_AIi4AIBAL8FACHjAkAAwAUAIeQCQADABQAh8QIBAL0FACHyAgEAvQUAIfMCAQC9BQAh9AIBAL8FACH1AgEAvQUAIfYCAQC_BQAh9wIBAL0FACH4AgEAvQUAIfkCAQC9BQAh-gICAM0FACH8AgEAvwUAIf0CQADBBQAhCwUAAN4FACAVAADfBQAg2QIBAAAAAdoCAQAAAAHjAkAAAAABgwMBAAAAAYQDAQAAAAGFAwEAAAABhgMBAAAAAYcDgAAAAAGIAwEAAAABAgAAADIAIDoAAO0IACADAAAAMgAgOgAA7QgAIDsAAOwIACABMwAAiQoAMAIAAAAyACAzAADsCAAgAgAAAIsHACAzAADrCAAgCdkCAQC9BQAh2gIBAL8FACHjAkAAwAUAIYMDAQC_BQAhhAMBAL0FACGFAwEAvQUAIYYDAQC_BQAhhwOAAAAAAYgDAQC_BQAhCwUAANsFACAVAADcBQAg2QIBAL0FACHaAgEAvwUAIeMCQADABQAhgwMBAL8FACGEAwEAvQUAIYUDAQC9BQAhhgMBAL8FACGHA4AAAAABiAMBAL8FACELBQAA3gUAIBUAAN8FACDZAgEAAAAB2gIBAAAAAeMCQAAAAAGDAwEAAAABhAMBAAAAAYUDAQAAAAGGAwEAAAABhwOAAAAAAYgDAQAAAAEI2QIBAAAAAeQCQAAAAAGPAyAAAAABkAMgAAAAAZEDIAAAAAGSAyAAAAABkwMgAAAAAZQDAgAAAAECAAAApQMAIDoAAO4IACADAAAAXwAgOgAA7ggAIDsAAPIIACAKAAAAXwAgMwAA8ggAINkCAQC9BQAh5AJAAMAFACGPAyAA5gUAIZADIADmBQAhkQMgAOYFACGSAyAA5gUAIZMDIADmBQAhlAMCAM0FACEI2QIBAL0FACHkAkAAwAUAIY8DIADmBQAhkAMgAOYFACGRAyAA5gUAIZIDIADmBQAhkwMgAOYFACGUAwIAzQUAIQwFAADxBQAgM4AAAAAB2QIBAAAAAdoCAQAAAAHjAkAAAAABlgMAAACWAwKXAwEAAAABmAMBAAAAAZkDIAAAAAGaA0AAAAABmwMBAAAAAZwDIAAAAAECAAAAOgAgOgAA-wgAIAMAAAA6ACA6AAD7CAAgOwAA-ggAIAEzAACICgAwAgAAADoAIDMAAPoIACACAAAAzwcAIDMAAPkIACALM4AAAAAB2QIBAL0FACHaAgEAvwUAIeMCQADABQAhlgMAAO0FlgMilwMBAL0FACGYAwEAvQUAIZkDIADmBQAhmgNAAMEFACGbAwEAvQUAIZwDIADmBQAhDAUAAO8FACAzgAAAAAHZAgEAvQUAIdoCAQC_BQAh4wJAAMAFACGWAwAA7QWWAyKXAwEAvQUAIZgDAQC9BQAhmQMgAOYFACGaA0AAwQUAIZsDAQC9BQAhnAMgAOYFACEMBQAA8QUAIDOAAAAAAdkCAQAAAAHaAgEAAAAB4wJAAAAAAZYDAAAAlgMClwMBAAAAAZgDAQAAAAGZAyAAAAABmgNAAAAAAZsDAQAAAAGcAyAAAAABEAUAAI8GACDZAgEAAAAB2gIBAAAAAd4CAAAAsgMC3wIBAAAAAeMCQAAAAAHkAkAAAAABlwMBAAAAAawDAQAAAAGtAwEAAAABrgMBAAAAAa8DAQAAAAGwA0AAAAABsgMCAAAAAbMDIAAAAAG0AwEAAAABAgAAACMAIDoAAIQJACADAAAAIwAgOgAAhAkAIDsAAIMJACABMwAAhwoAMAIAAAAjACAzAACDCQAgAgAAAPwHACAzAACCCQAgD9kCAQC9BQAh2gIBAL0FACHeAgAAjAayAyLfAgEAvwUAIeMCQADABQAh5AJAAMAFACGXAwEAvQUAIawDAQC9BQAhrQMBAL8FACGuAwEAvQUAIa8DAQC_BQAhsANAAMAFACGyAwIAzQUAIbMDIADmBQAhtAMBAL8FACEQBQAAjQYAINkCAQC9BQAh2gIBAL0FACHeAgAAjAayAyLfAgEAvwUAIeMCQADABQAh5AJAAMAFACGXAwEAvQUAIawDAQC9BQAhrQMBAL8FACGuAwEAvQUAIa8DAQC_BQAhsANAAMAFACGyAwIAzQUAIbMDIADmBQAhtAMBAL8FACEQBQAAjwYAINkCAQAAAAHaAgEAAAAB3gIAAACyAwLfAgEAAAAB4wJAAAAAAeQCQAAAAAGXAwEAAAABrAMBAAAAAa0DAQAAAAGuAwEAAAABrwMBAAAAAbADQAAAAAGyAwIAAAABswMgAAAAAbQDAQAAAAEMBQAA-QUAIBIAAPoFACDZAgEAAAAB2gIBAAAAAeMCQAAAAAHkAkAAAAABlwMBAAAAAZ0DAQAAAAGfAwAAAJ8DAqADAQAAAAGhA4AAAAABogMgAAAAAQIAAAAtACA6AACNCQAgAwAAAC0AIDoAAI0JACA7AACMCQAgATMAAIYKADACAAAALQAgMwAAjAkAIAIAAADkBwAgMwAAiwkAIArZAgEAvQUAIdoCAQC9BQAh4wJAAMAFACHkAkAAwAUAIZcDAQC9BQAhnQMBAL0FACGfAwAA9QWfAyKgAwEAvQUAIaEDgAAAAAGiAyAA5gUAIQwFAAD2BQAgEgAA9wUAINkCAQC9BQAh2gIBAL0FACHjAkAAwAUAIeQCQADABQAhlwMBAL0FACGdAwEAvQUAIZ8DAAD1BZ8DIqADAQC9BQAhoQOAAAAAAaIDIADmBQAhDAUAAPkFACASAAD6BQAg2QIBAAAAAdoCAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGdAwEAAAABnwMAAACfAwKgAwEAAAABoQOAAAAAAaIDIAAAAAEMBQAA-QUAIBMAAPsFACDZAgEAAAAB2gIBAAAAAeMCQAAAAAHkAkAAAAABlwMBAAAAAZ8DAAAAnwMCoAMBAAAAAaEDgAAAAAGiAyAAAAABowMBAAAAAQIAAAAtACA6AACWCQAgAwAAAC0AIDoAAJYJACA7AACVCQAgATMAAIUKADACAAAALQAgMwAAlQkAIAIAAADkBwAgMwAAlAkAIArZAgEAvQUAIdoCAQC9BQAh4wJAAMAFACHkAkAAwAUAIZcDAQC9BQAhnwMAAPUFnwMioAMBAL0FACGhA4AAAAABogMgAOYFACGjAwEAvwUAIQwFAAD2BQAgEwAA-AUAINkCAQC9BQAh2gIBAL0FACHjAkAAwAUAIeQCQADABQAhlwMBAL0FACGfAwAA9QWfAyKgAwEAvQUAIaEDgAAAAAGiAyAA5gUAIaMDAQC_BQAhDAUAAPkFACATAAD7BQAg2QIBAAAAAdoCAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGfAwAAAJ8DAqADAQAAAAGhA4AAAAABogMgAAAAAaMDAQAAAAEOBQAAhAYAIA8AAIUGACDZAgEAAAAB2gIBAAAAAd4CAAAAqgMC3wIBAAAAAeMCQAAAAAHkAkAAAAABlwMBAAAAAaQDAQAAAAGlAwEAAAABpgNAAAAAAagDAAAAqAMCqgNAAAAAAQIAAAAnACA6AACfCQAgAwAAACcAIDoAAJ8JACA7AACeCQAgATMAAIQKADACAAAAJwAgMwAAngkAIAIAAADwBwAgMwAAnQkAIAzZAgEAvQUAIdoCAQC9BQAh3gIAAIAGqgMi3wIBAL8FACHjAkAAwAUAIeQCQADABQAhlwMBAL0FACGkAwEAvwUAIaUDAQC_BQAhpgNAAMAFACGoAwAA_wWoAyKqA0AAwQUAIQ4FAACBBgAgDwAAggYAINkCAQC9BQAh2gIBAL0FACHeAgAAgAaqAyLfAgEAvwUAIeMCQADABQAh5AJAAMAFACGXAwEAvQUAIaQDAQC_BQAhpQMBAL8FACGmA0AAwAUAIagDAAD_BagDIqoDQADBBQAhDgUAAIQGACAPAACFBgAg2QIBAAAAAdoCAQAAAAHeAgAAAKoDAt8CAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGkAwEAAAABpQMBAAAAAaYDQAAAAAGoAwAAAKgDAqoDQAAAAAEOBQAAhAYAIBAAAIYGACDZAgEAAAAB2gIBAAAAAd4CAAAAqgMC3wIBAAAAAeMCQAAAAAHkAkAAAAABlwMBAAAAAaUDAQAAAAGmA0AAAAABqAMAAACoAwKqA0AAAAABqwMBAAAAAQIAAAAnACA6AACoCQAgAwAAACcAIDoAAKgJACA7AACnCQAgATMAAIMKADACAAAAJwAgMwAApwkAIAIAAADwBwAgMwAApgkAIAzZAgEAvQUAIdoCAQC9BQAh3gIAAIAGqgMi3wIBAL8FACHjAkAAwAUAIeQCQADABQAhlwMBAL0FACGlAwEAvwUAIaYDQADABQAhqAMAAP8FqAMiqgNAAMEFACGrAwEAvwUAIQ4FAACBBgAgEAAAgwYAINkCAQC9BQAh2gIBAL0FACHeAgAAgAaqAyLfAgEAvwUAIeMCQADABQAh5AJAAMAFACGXAwEAvQUAIaUDAQC_BQAhpgNAAMAFACGoAwAA_wWoAyKqA0AAwQUAIasDAQC_BQAhDgUAAIQGACAQAACGBgAg2QIBAAAAAdoCAQAAAAHeAgAAAKoDAt8CAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGlAwEAAAABpgNAAAAAAagDAAAAqAMCqgNAAAAAAasDAQAAAAERBQAApwYAIAYAAKUGACAHAACmBgAg2QIBAAAAAdoCAQAAAAHeAgAAAL8DAuMCQAAAAAHkAkAAAAABlAMCAAAAAbYDAQAAAAG8AwEAAAABvQNAAAAAAb8DQAAAAAHBAwEAAAABwgMCAAAAAcMDQAAAAAHEAwEAAAABAgAAABUAIDoAALEJACADAAAAFQAgOgAAsQkAIDsAALAJACABMwAAggoAMAIAAAAVACAzAACwCQAgAgAAALsGACAzAACvCQAgDtkCAQC9BQAh2gIBAL0FACHeAgAAoAa_AyLjAkAAwAUAIeQCQADABQAhlAMCAM0FACG2AwEAvQUAIbwDAQC_BQAhvQNAAMAFACG_A0AAwQUAIcEDAQC_BQAhwgMCAM0FACHDA0AAwQUAIcQDAQC_BQAhEQUAAKMGACAGAAChBgAgBwAAogYAINkCAQC9BQAh2gIBAL0FACHeAgAAoAa_AyLjAkAAwAUAIeQCQADABQAhlAMCAM0FACG2AwEAvQUAIbwDAQC_BQAhvQNAAMAFACG_A0AAwQUAIcEDAQC_BQAhwgMCAM0FACHDA0AAwQUAIcQDAQC_BQAhEQUAAKcGACAGAAClBgAgBwAApgYAINkCAQAAAAHaAgEAAAAB3gIAAAC_AwLjAkAAAAAB5AJAAAAAAZQDAgAAAAG2AwEAAAABvAMBAAAAAb0DQAAAAAG_A0AAAAABwQMBAAAAAcIDAgAAAAHDA0AAAAABxAMBAAAAARoEAACkCAAgCQAApggAIA0AAKUIACAOAACnCAAgEQAAqAgAIBQAAKkIACAXAACqCAAgGAAAqwgAIBsAAKwIACDZAgEAAAAB3wIBAAAAAeMCQAAAAAHkAkAAAAAB0QMBAAAAAeYDAQAAAAHnA0AAAAAB6AMBAAAAAekDAQAAAAHqAwAAoQgAIOsDAACiCAAg7AMBAAAAAe0DAQAAAAHuAwEAAAAB7wMBAAAAAfADIAAAAAHxAwEAAAABAgAAAFYAIDoAAL0JACADAAAAVgAgOgAAvQkAIDsAALwJACABMwAAgQoAMB8DAADHBAAgBAAAhwUAIAkAAIkFACANAACIBQAgDgAAigUAIBEAAIsFACAUAACMBQAgFwAAjQUAIBgAAI4FACAbAACPBQAg1gIAAIYFADDXAgAANAAQ2AIAAIYFADDZAgEAAAAB3wIBAOUEACHjAkAAvAQAIeQCQAC8BAAhtQMBALsEACHRAwEAuwQAIeYDAQDlBAAh5wNAALwEACHoAwEA5QQAIekDAQDlBAAh6gMAAO0EACDrAwAA7QQAIOwDAQC7BAAh7QMBALsEACHuAwEA5QQAIe8DAQDlBAAh8AMgAMYEACHxAwEA5QQAIQIAAABWACAzAAC8CQAgAgAAALoJACAzAAC7CQAgFdYCAAC5CQAw1wIAALoJABDYAgAAuQkAMNkCAQC7BAAh3wIBAOUEACHjAkAAvAQAIeQCQAC8BAAhtQMBALsEACHRAwEAuwQAIeYDAQDlBAAh5wNAALwEACHoAwEA5QQAIekDAQDlBAAh6gMAAO0EACDrAwAA7QQAIOwDAQC7BAAh7QMBALsEACHuAwEA5QQAIe8DAQDlBAAh8AMgAMYEACHxAwEA5QQAIRXWAgAAuQkAMNcCAAC6CQAQ2AIAALkJADDZAgEAuwQAId8CAQDlBAAh4wJAALwEACHkAkAAvAQAIbUDAQC7BAAh0QMBALsEACHmAwEA5QQAIecDQAC8BAAh6AMBAOUEACHpAwEA5QQAIeoDAADtBAAg6wMAAO0EACDsAwEAuwQAIe0DAQC7BAAh7gMBAOUEACHvAwEA5QQAIfADIADGBAAh8QMBAOUEACER2QIBAL0FACHfAgEAvwUAIeMCQADABQAh5AJAAMAFACHRAwEAvQUAIeYDAQC_BQAh5wNAAMAFACHoAwEAvwUAIekDAQC_BQAh6gMAAK8HACDrAwAAsAcAIOwDAQC9BQAh7QMBAL0FACHuAwEAvwUAIe8DAQC_BQAh8AMgAOYFACHxAwEAvwUAIRoEAACyBwAgCQAAtAcAIA0AALMHACAOAAC1BwAgEQAAtgcAIBQAALcHACAXAAC4BwAgGAAAuQcAIBsAALoHACDZAgEAvQUAId8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIdEDAQC9BQAh5gMBAL8FACHnA0AAwAUAIegDAQC_BQAh6QMBAL8FACHqAwAArwcAIOsDAACwBwAg7AMBAL0FACHtAwEAvQUAIe4DAQC_BQAh7wMBAL8FACHwAyAA5gUAIfEDAQC_BQAhGgQAAKQIACAJAACmCAAgDQAApQgAIA4AAKcIACARAACoCAAgFAAAqQgAIBcAAKoIACAYAACrCAAgGwAArAgAINkCAQAAAAHfAgEAAAAB4wJAAAAAAeQCQAAAAAHRAwEAAAAB5gMBAAAAAecDQAAAAAHoAwEAAAAB6QMBAAAAAeoDAAChCAAg6wMAAKIIACDsAwEAAAAB7QMBAAAAAe4DAQAAAAHvAwEAAAAB8AMgAAAAAfEDAQAAAAELFQAA8AYAINkCAQAAAAHeAgAAAOIDAuMCQAAAAAHkAkAAAAAB_gIBAAAAAYADQAAAAAGDAwEAAAAB3wMAAADfAwLgAwEAAAAB4wNAAAAAAQIAAABNACA6AADGCQAgAwAAAE0AIDoAAMYJACA7AADFCQAgATMAAIAKADACAAAATQAgMwAAxQkAIAIAAACXBwAgMwAAxAkAIArZAgEAvQUAId4CAADtBuIDIuMCQADABQAh5AJAAMAFACH-AgEAvQUAIYADQADABQAhgwMBAL0FACHfAwAA7AbfAyLgAwEAvQUAIeMDQADBBQAhCxUAAO4GACDZAgEAvQUAId4CAADtBuIDIuMCQADABQAh5AJAAMAFACH-AgEAvQUAIYADQADABQAhgwMBAL0FACHfAwAA7AbfAyLgAwEAvQUAIeMDQADBBQAhCxUAAPAGACDZAgEAAAAB3gIAAADiAwLjAkAAAAAB5AJAAAAAAf4CAQAAAAGAA0AAAAABgwMBAAAAAd8DAAAA3wMC4AMBAAAAAeMDQAAAAAEJBQAApwcAIBcAAKsHACAcAACpBwAgHgAAqgcAINkCAQAAAAHaAgEAAAAB4wJAAAAAAeQCQAAAAAHRAwEAAAABAgAAAAkAIDoAAM8JACADAAAACQAgOgAAzwkAIDsAAM4JACABMwAA_wkAMAIAAAAJACAzAADOCQAgAgAAAJ0IACAzAADNCQAgBdkCAQC9BQAh2gIBAL0FACHjAkAAwAUAIeQCQADABQAh0QMBAL0FACEJBQAA_gYAIBcAAIIHACAcAACABwAgHgAAgQcAINkCAQC9BQAh2gIBAL0FACHjAkAAwAUAIeQCQADABQAh0QMBAL0FACEJBQAApwcAIBcAAKsHACAcAACpBwAgHgAAqgcAINkCAQAAAAHaAgEAAAAB4wJAAAAAAeQCQAAAAAHRAwEAAAABCBUAAPkGACDZAgEAAAAB5AJAAAAAAYMDAQAAAAHNAyAAAAAB3wMAAADfAwLkAwAA-AYAIOUDQAAAAAECAAAABQAgOgAA2AkAIAMAAAAFACA6AADYCQAgOwAA1wkAIAEzAAD-CQAwAgAAAAUAIDMAANcJACACAAAAowcAIDMAANYJACAH2QIBAL0FACHkAkAAwAUAIYMDAQC9BQAhzQMgAOYFACHfAwAA7AbfAyLkAwAA9QYAIOUDQADABQAhCBUAAPYGACDZAgEAvQUAIeQCQADABQAhgwMBAL0FACHNAyAA5gUAId8DAADsBt8DIuQDAAD1BgAg5QNAAMAFACEIFQAA-QYAINkCAQAAAAHkAkAAAAABgwMBAAAAAc0DIAAAAAHfAwAAAN8DAuQDAAD4BgAg5QNAAAAAAQQ6AADQCQAw_gMAANEJADCABAAA0wkAIIQEAACfBwAwBDoAAMcJADD-AwAAyAkAMIAEAADKCQAghAQAAJkIADAEOgAAvgkAMP4DAAC_CQAwgAQAAMEJACCEBAAAkwcAMAQ6AACyCQAw_gMAALMJADCABAAAtQkAIIQEAAC2CQAwBDoAAKkJADD-AwAAqgkAMIAEAACsCQAghAQAALcGADAEOgAAoAkAMP4DAAChCQAwgAQAAKMJACCEBAAA7AcAMAQ6AACXCQAw_gMAAJgJADCABAAAmgkAIIQEAADsBwAwBDoAAI4JADD-AwAAjwkAMIAEAACRCQAghAQAAOAHADAEOgAAhQkAMP4DAACGCQAwgAQAAIgJACCEBAAA4AcAMAQ6AAD8CAAw_gMAAP0IADCABAAA_wgAIIQEAAD4BwAwBDoAAPMIADD-AwAA9AgAMIAEAAD2CAAghAQAAMsHADADOgAA7ggAIP4DAADvCAAghAQAAKUDACAEOgAA5QgAMP4DAADmCAAwgAQAAOgIACCEBAAAhwcAMAM6AADgCAAg_gMAAOEIACCEBAAAZgAgBDoAANQIADD-AwAA1QgAMIAEAADXCAAghAQAANgIADAEOgAAywgAMP4DAADMCAAwgAQAAM4IACCEBAAAvwcAMAQ6AADCCAAw_gMAAMMIADCABAAAxQgAIIQEAAC_BwAwAAAAAAAAAAAAARYAAOkFACAABxYAAOkFACAqAADpBQAg4AIAALkFACD0AgAAuQUAIPYCAAC5BQAg_AIAALkFACD9AgAAuQUAIAAAAAUDAADpBQAgBQAA-gkAIBcAAPQJACAcAADqCQAgHgAA7AkAIBEDAADpBQAgBAAA6wkAIAkAAO4JACANAAD4CQAgDgAA8QkAIBEAAO8JACAUAADwCQAgFwAA9AkAIBgAAPIJACAbAAD3CQAg3wIAALkFACDmAwAAuQUAIOgDAAC5BQAg6QMAALkFACDuAwAAuQUAIO8DAAC5BQAg8QMAALkFACAEBgAAmgYAIAkAAO4JACDKAwAAuQUAIMwDAAC5BQAgAAQGAACaBgAg3wIAALkFACC6AwAAuQUAILsDAAC5BQAgB9kCAQAAAAHkAkAAAAABgwMBAAAAAc0DIAAAAAHfAwAAAN8DAuQDAAD4BgAg5QNAAAAAAQXZAgEAAAAB2gIBAAAAAeMCQAAAAAHkAkAAAAAB0QMBAAAAAQrZAgEAAAAB3gIAAADiAwLjAkAAAAAB5AJAAAAAAf4CAQAAAAGAA0AAAAABgwMBAAAAAd8DAAAA3wMC4AMBAAAAAeMDQAAAAAER2QIBAAAAAd8CAQAAAAHjAkAAAAAB5AJAAAAAAdEDAQAAAAHmAwEAAAAB5wNAAAAAAegDAQAAAAHpAwEAAAAB6gMAAKEIACDrAwAAoggAIOwDAQAAAAHtAwEAAAAB7gMBAAAAAe8DAQAAAAHwAyAAAAAB8QMBAAAAAQ7ZAgEAAAAB2gIBAAAAAd4CAAAAvwMC4wJAAAAAAeQCQAAAAAGUAwIAAAABtgMBAAAAAbwDAQAAAAG9A0AAAAABvwNAAAAAAcEDAQAAAAHCAwIAAAABwwNAAAAAAcQDAQAAAAEM2QIBAAAAAdoCAQAAAAHeAgAAAKoDAt8CAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGlAwEAAAABpgNAAAAAAagDAAAAqAMCqgNAAAAAAasDAQAAAAEM2QIBAAAAAdoCAQAAAAHeAgAAAKoDAt8CAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGkAwEAAAABpQMBAAAAAaYDQAAAAAGoAwAAAKgDAqoDQAAAAAEK2QIBAAAAAdoCAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGfAwAAAJ8DAqADAQAAAAGhA4AAAAABogMgAAAAAaMDAQAAAAEK2QIBAAAAAdoCAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGdAwEAAAABnwMAAACfAwKgAwEAAAABoQOAAAAAAaIDIAAAAAEP2QIBAAAAAdoCAQAAAAHeAgAAALIDAt8CAQAAAAHjAkAAAAAB5AJAAAAAAZcDAQAAAAGsAwEAAAABrQMBAAAAAa4DAQAAAAGvAwEAAAABsANAAAAAAbIDAgAAAAGzAyAAAAABtAMBAAAAAQszgAAAAAHZAgEAAAAB2gIBAAAAAeMCQAAAAAGWAwAAAJYDApcDAQAAAAGYAwEAAAABmQMgAAAAAZoDQAAAAAGbAwEAAAABnAMgAAAAAQnZAgEAAAAB2gIBAAAAAeMCQAAAAAGDAwEAAAABhAMBAAAAAYUDAQAAAAGGAwEAAAABhwOAAAAAAYgDAQAAAAER2QIBAAAAAd4CAAAA_AIC4AIBAAAAAeMCQAAAAAHkAkAAAAAB8AIBAAAAAfECAQAAAAHyAgEAAAAB8wIBAAAAAfQCAQAAAAH1AgEAAAAB9gIBAAAAAfcCAQAAAAH4AgEAAAAB-QIBAAAAAfoCAgAAAAH9AkAAAAABCtkCAQAAAAHaAgEAAAAB3AIBAAAAAd4CAAAA3gIC3wIBAAAAAeACAQAAAAHhAkAAAAAB4gJAAAAAAeMCQAAAAAHkAkAAAAABCtkCAQAAAAHaAgEAAAAB2wIBAAAAAd4CAAAA3gIC3wIBAAAAAeACAQAAAAHhAkAAAAAB4gJAAAAAAeMCQAAAAAHkAkAAAAABHBcAAOUJACAYAADjCQAgGwAA6AkAIB8AANkJACAgAADaCQAgIQAA2wkAICMAAN0JACAkAADeCQAgJQAA3wkAICYAAOAJACAnAADhCQAgKAAA4gkAICkAAOQJACArAADmCQAgLAAA5wkAIC0AAOkJACDZAgEAAAAB4wJAAAAAAeQCQAAAAAH-AgEAAAABzQMgAAAAAdEDAQAAAAHfAwAAAPQDAu8DAQAAAAHyAwEAAAAB9AMBAAAAAfUDIAAAAAH2A0AAAAABAgAAAAEAIDoAAI0KACAF2QIBAAAAAeMCQAAAAAHkAkAAAAABtQMBAAAAAdEDAQAAAAEP2QIBAAAAAeMCQAAAAAHkAkAAAAAB0QMBAAAAAdIDAQAAAAHTAwEAAAAB1QMAAADVAwLWAwEAAAAB1wMBAAAAAdgDAQAAAAHZAwEAAAAB2gMBAAAAAdsDAQAAAAHcAyAAAAAB3QMBAAAAAQ7ZAgEAAAAB3gIAAAC_AwLjAkAAAAAB5AJAAAAAAZQDAgAAAAG2AwEAAAABvAMBAAAAAb0DQAAAAAG_A0AAAAABwAMBAAAAAcEDAQAAAAHCAwIAAAABwwNAAAAAAcQDAQAAAAEP2QIBAAAAAd4CAAAAsgMC3wIBAAAAAeMCQAAAAAHkAkAAAAABlwMBAAAAAawDAQAAAAGtAwEAAAABrgMBAAAAAa8DAQAAAAGwA0AAAAABsgMCAAAAAbMDIAAAAAG0AwEAAAABtQMBAAAAAQzZAgEAAAAB3gIAAACqAwLfAgEAAAAB4wJAAAAAAeQCQAAAAAGXAwEAAAABpAMBAAAAAaUDAQAAAAGmA0AAAAABqAMAAACoAwKqA0AAAAABqwMBAAAAAQrZAgEAAAAB4wJAAAAAAeQCQAAAAAGXAwEAAAABnQMBAAAAAZ8DAAAAnwMCoAMBAAAAAaEDgAAAAAGiAyAAAAABowMBAAAAAQnZAgEAAAAB4wJAAAAAAfACAQAAAAGDAwEAAAABhAMBAAAAAYUDAQAAAAGGAwEAAAABhwOAAAAAAYgDAQAAAAELM4AAAAAB2QIBAAAAAeMCQAAAAAHwAgEAAAABlgMAAACWAwKXAwEAAAABmAMBAAAAAZkDIAAAAAGaA0AAAAABmwMBAAAAAZwDIAAAAAEK2QIBAAAAAdsCAQAAAAHcAgEAAAAB3gIAAADeAgLfAgEAAAAB4AIBAAAAAeECQAAAAAHiAkAAAAAB4wJAAAAAAeQCQAAAAAEDAAAAGAAgOgAAjQoAIDsAAJoKACAeAAAAGAAgFwAAvQgAIBgAALsIACAbAADACAAgHwAAsQgAICAAALIIACAhAACzCAAgIwAAtQgAICQAALYIACAlAAC3CAAgJgAAuAgAICcAALkIACAoAAC6CAAgKQAAvAgAICsAAL4IACAsAAC_CAAgLQAAwQgAIDMAAJoKACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhHBcAAL0IACAYAAC7CAAgGwAAwAgAIB8AALEIACAgAACyCAAgIQAAswgAICMAALUIACAkAAC2CAAgJQAAtwgAICYAALgIACAnAAC5CAAgKAAAuggAICkAALwIACArAAC-CAAgLAAAvwgAIC0AAMEIACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhHBcAAOUJACAYAADjCQAgGwAA6AkAIB8AANkJACAhAADbCQAgIgAA3AkAICMAAN0JACAkAADeCQAgJQAA3wkAICYAAOAJACAnAADhCQAgKAAA4gkAICkAAOQJACArAADmCQAgLAAA5wkAIC0AAOkJACDZAgEAAAAB4wJAAAAAAeQCQAAAAAH-AgEAAAABzQMgAAAAAdEDAQAAAAHfAwAAAPQDAu8DAQAAAAHyAwEAAAAB9AMBAAAAAfUDIAAAAAH2A0AAAAABAgAAAAEAIDoAAJsKACAbAwAAowgAIAkAAKYIACANAAClCAAgDgAApwgAIBEAAKgIACAUAACpCAAgFwAAqggAIBgAAKsIACAbAACsCAAg2QIBAAAAAd8CAQAAAAHjAkAAAAAB5AJAAAAAAbUDAQAAAAHRAwEAAAAB5gMBAAAAAecDQAAAAAHoAwEAAAAB6QMBAAAAAeoDAAChCAAg6wMAAKIIACDsAwEAAAAB7QMBAAAAAe4DAQAAAAHvAwEAAAAB8AMgAAAAAfEDAQAAAAECAAAAVgAgOgAAnQoAIAfZAgEAAAAB5AJAAAAAAfACAQAAAAHNAyAAAAAB3wMAAADfAwLkAwAA-AYAIOUDQAAAAAEK2QIBAAAAAd4CAAAA4gMC4wJAAAAAAeQCQAAAAAH-AgEAAAABgANAAAAAAd8DAAAA3wMC4AMBAAAAAeIDAQAAAAHjA0AAAAABCdkCAQAAAAHaAgEAAAAB4wJAAAAAAfACAQAAAAGEAwEAAAABhQMBAAAAAYYDAQAAAAGHA4AAAAABiAMBAAAAAQMAAAAYACA6AACbCgAgOwAApAoAIB4AAAAYACAXAAC9CAAgGAAAuwgAIBsAAMAIACAfAACxCAAgIQAAswgAICIAALQIACAjAAC1CAAgJAAAtggAICUAALcIACAmAAC4CAAgJwAAuQgAICgAALoIACApAAC8CAAgKwAAvggAICwAAL8IACAtAADBCAAgMwAApAoAINkCAQC9BQAh4wJAAMAFACHkAkAAwAUAIf4CAQC9BQAhzQMgAOYFACHRAwEAvQUAId8DAACwCPQDIu8DAQC_BQAh8gMBAL0FACH0AwEAvwUAIfUDIADmBQAh9gNAAMEFACEcFwAAvQgAIBgAALsIACAbAADACAAgHwAAsQgAICEAALMIACAiAAC0CAAgIwAAtQgAICQAALYIACAlAAC3CAAgJgAAuAgAICcAALkIACAoAAC6CAAgKQAAvAgAICsAAL4IACAsAAC_CAAgLQAAwQgAINkCAQC9BQAh4wJAAMAFACHkAkAAwAUAIf4CAQC9BQAhzQMgAOYFACHRAwEAvQUAId8DAACwCPQDIu8DAQC_BQAh8gMBAL0FACH0AwEAvwUAIfUDIADmBQAh9gNAAMEFACEDAAAANAAgOgAAnQoAIDsAAKcKACAdAAAANAAgAwAAsQcAIAkAALQHACANAACzBwAgDgAAtQcAIBEAALYHACAUAAC3BwAgFwAAuAcAIBgAALkHACAbAAC6BwAgMwAApwoAINkCAQC9BQAh3wIBAL8FACHjAkAAwAUAIeQCQADABQAhtQMBAL0FACHRAwEAvQUAIeYDAQC_BQAh5wNAAMAFACHoAwEAvwUAIekDAQC_BQAh6gMAAK8HACDrAwAAsAcAIOwDAQC9BQAh7QMBAL0FACHuAwEAvwUAIe8DAQC_BQAh8AMgAOYFACHxAwEAvwUAIRsDAACxBwAgCQAAtAcAIA0AALMHACAOAAC1BwAgEQAAtgcAIBQAALcHACAXAAC4BwAgGAAAuQcAIBsAALoHACDZAgEAvQUAId8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIbUDAQC9BQAh0QMBAL0FACHmAwEAvwUAIecDQADABQAh6AMBAL8FACHpAwEAvwUAIeoDAACvBwAg6wMAALAHACDsAwEAvQUAIe0DAQC9BQAh7gMBAL8FACHvAwEAvwUAIfADIADmBQAh8QMBAL8FACEcFwAA5QkAIBgAAOMJACAbAADoCQAgIAAA2gkAICEAANsJACAiAADcCQAgIwAA3QkAICQAAN4JACAlAADfCQAgJgAA4AkAICcAAOEJACAoAADiCQAgKQAA5AkAICsAAOYJACAsAADnCQAgLQAA6QkAINkCAQAAAAHjAkAAAAAB5AJAAAAAAf4CAQAAAAHNAyAAAAAB0QMBAAAAAd8DAAAA9AMC7wMBAAAAAfIDAQAAAAH0AwEAAAAB9QMgAAAAAfYDQAAAAAECAAAAAQAgOgAAqAoAIAoDAACoBwAgBQAApwcAIBcAAKsHACAeAACqBwAg2QIBAAAAAdoCAQAAAAHjAkAAAAAB5AJAAAAAAbUDAQAAAAHRAwEAAAABAgAAAAkAIDoAAKoKACADAAAAGAAgOgAAqAoAIDsAAK4KACAeAAAAGAAgFwAAvQgAIBgAALsIACAbAADACAAgIAAAsggAICEAALMIACAiAAC0CAAgIwAAtQgAICQAALYIACAlAAC3CAAgJgAAuAgAICcAALkIACAoAAC6CAAgKQAAvAgAICsAAL4IACAsAAC_CAAgLQAAwQgAIDMAAK4KACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhHBcAAL0IACAYAAC7CAAgGwAAwAgAICAAALIIACAhAACzCAAgIgAAtAgAICMAALUIACAkAAC2CAAgJQAAtwgAICYAALgIACAnAAC5CAAgKAAAuggAICkAALwIACArAAC-CAAgLAAAvwgAIC0AAMEIACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhAwAAAAcAIDoAAKoKACA7AACxCgAgDAAAAAcAIAMAAP8GACAFAAD-BgAgFwAAggcAIB4AAIEHACAzAACxCgAg2QIBAL0FACHaAgEAvQUAIeMCQADABQAh5AJAAMAFACG1AwEAvQUAIdEDAQC9BQAhCgMAAP8GACAFAAD-BgAgFwAAggcAIB4AAIEHACDZAgEAvQUAIdoCAQC9BQAh4wJAAMAFACHkAkAAwAUAIbUDAQC9BQAh0QMBAL0FACEcFwAA5QkAIBgAAOMJACAbAADoCQAgHwAA2QkAICAAANoJACAiAADcCQAgIwAA3QkAICQAAN4JACAlAADfCQAgJgAA4AkAICcAAOEJACAoAADiCQAgKQAA5AkAICsAAOYJACAsAADnCQAgLQAA6QkAINkCAQAAAAHjAkAAAAAB5AJAAAAAAf4CAQAAAAHNAyAAAAAB0QMBAAAAAd8DAAAA9AMC7wMBAAAAAfIDAQAAAAH0AwEAAAAB9QMgAAAAAfYDQAAAAAECAAAAAQAgOgAAsgoAIAoDAACoBwAgBQAApwcAIBcAAKsHACAcAACpBwAg2QIBAAAAAdoCAQAAAAHjAkAAAAAB5AJAAAAAAbUDAQAAAAHRAwEAAAABAgAAAAkAIDoAALQKACADAAAAGAAgOgAAsgoAIDsAALgKACAeAAAAGAAgFwAAvQgAIBgAALsIACAbAADACAAgHwAAsQgAICAAALIIACAiAAC0CAAgIwAAtQgAICQAALYIACAlAAC3CAAgJgAAuAgAICcAALkIACAoAAC6CAAgKQAAvAgAICsAAL4IACAsAAC_CAAgLQAAwQgAIDMAALgKACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhHBcAAL0IACAYAAC7CAAgGwAAwAgAIB8AALEIACAgAACyCAAgIgAAtAgAICMAALUIACAkAAC2CAAgJQAAtwgAICYAALgIACAnAAC5CAAgKAAAuggAICkAALwIACArAAC-CAAgLAAAvwgAIC0AAMEIACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhAwAAAAcAIDoAALQKACA7AAC7CgAgDAAAAAcAIAMAAP8GACAFAAD-BgAgFwAAggcAIBwAAIAHACAzAAC7CgAg2QIBAL0FACHaAgEAvQUAIeMCQADABQAh5AJAAMAFACG1AwEAvQUAIdEDAQC9BQAhCgMAAP8GACAFAAD-BgAgFwAAggcAIBwAAIAHACDZAgEAvQUAIdoCAQC9BQAh4wJAAMAFACHkAkAAwAUAIbUDAQC9BQAh0QMBAL0FACEbAwAAowgAIAQAAKQIACAJAACmCAAgDgAApwgAIBEAAKgIACAUAACpCAAgFwAAqggAIBgAAKsIACAbAACsCAAg2QIBAAAAAd8CAQAAAAHjAkAAAAAB5AJAAAAAAbUDAQAAAAHRAwEAAAAB5gMBAAAAAecDQAAAAAHoAwEAAAAB6QMBAAAAAeoDAAChCAAg6wMAAKIIACDsAwEAAAAB7QMBAAAAAe4DAQAAAAHvAwEAAAAB8AMgAAAAAfEDAQAAAAECAAAAVgAgOgAAvAoAIAvZAgEAAAAB4wJAAAAAAeQCQAAAAAHGAwAAAMYDAscDAAC_BgAgyAMAAMAGACDJA0AAAAABygNAAAAAAcsDCAAAAAHMAwEAAAABzQMgAAAAAQ7ZAgEAAAAB2gIBAAAAAd4CAAAAvwMC4wJAAAAAAeQCQAAAAAGUAwIAAAABvAMBAAAAAb0DQAAAAAG_A0AAAAABwAMBAAAAAcEDAQAAAAHCAwIAAAABwwNAAAAAAcQDAQAAAAEDAAAANAAgOgAAvAoAIDsAAMIKACAdAAAANAAgAwAAsQcAIAQAALIHACAJAAC0BwAgDgAAtQcAIBEAALYHACAUAAC3BwAgFwAAuAcAIBgAALkHACAbAAC6BwAgMwAAwgoAINkCAQC9BQAh3wIBAL8FACHjAkAAwAUAIeQCQADABQAhtQMBAL0FACHRAwEAvQUAIeYDAQC_BQAh5wNAAMAFACHoAwEAvwUAIekDAQC_BQAh6gMAAK8HACDrAwAAsAcAIOwDAQC9BQAh7QMBAL0FACHuAwEAvwUAIe8DAQC_BQAh8AMgAOYFACHxAwEAvwUAIRsDAACxBwAgBAAAsgcAIAkAALQHACAOAAC1BwAgEQAAtgcAIBQAALcHACAXAAC4BwAgGAAAuQcAIBsAALoHACDZAgEAvQUAId8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIbUDAQC9BQAh0QMBAL0FACHmAwEAvwUAIecDQADABQAh6AMBAL8FACHpAwEAvwUAIeoDAACvBwAg6wMAALAHACDsAwEAvQUAIe0DAQC9BQAh7gMBAL8FACHvAwEAvwUAIfADIADmBQAh8QMBAL8FACETBQAA5QYAIAkAAOcGACAMAADoBgAg2QIBAAAAAdoCAQAAAAHjAkAAAAAB5AJAAAAAAdEDAQAAAAHSAwEAAAAB0wMBAAAAAdUDAAAA1QMC1gMBAAAAAdcDAQAAAAHYAwEAAAAB2QMBAAAAAdoDAQAAAAHbAwEAAAAB3AMgAAAAAd0DAQAAAAECAAAADQAgOgAAwwoAIA7ZAgEAAAAB2gIBAAAAAd4CAAAAvwMC4wJAAAAAAeQCQAAAAAGUAwIAAAABtgMBAAAAAb0DQAAAAAG_A0AAAAABwAMBAAAAAcEDAQAAAAHCAwIAAAABwwNAAAAAAcQDAQAAAAEDAAAACwAgOgAAwwoAIDsAAMgKACAVAAAACwAgBQAAxwYAIAkAAMkGACAMAADKBgAgMwAAyAoAINkCAQC9BQAh2gIBAL0FACHjAkAAwAUAIeQCQADABQAh0QMBAL0FACHSAwEAvwUAIdMDAQC_BQAh1QMAAMYG1QMi1gMBAL0FACHXAwEAvQUAIdgDAQC_BQAh2QMBAL8FACHaAwEAvwUAIdsDAQC_BQAh3AMgAOYFACHdAwEAvwUAIRMFAADHBgAgCQAAyQYAIAwAAMoGACDZAgEAvQUAIdoCAQC9BQAh4wJAAMAFACHkAkAAwAUAIdEDAQC9BQAh0gMBAL8FACHTAwEAvwUAIdUDAADGBtUDItYDAQC9BQAh1wMBAL0FACHYAwEAvwUAIdkDAQC_BQAh2gMBAL8FACHbAwEAvwUAIdwDIADmBQAh3QMBAL8FACEcFwAA5QkAIBgAAOMJACAbAADoCQAgHwAA2QkAICAAANoJACAhAADbCQAgIgAA3AkAICQAAN4JACAlAADfCQAgJgAA4AkAICcAAOEJACAoAADiCQAgKQAA5AkAICsAAOYJACAsAADnCQAgLQAA6QkAINkCAQAAAAHjAkAAAAAB5AJAAAAAAf4CAQAAAAHNAyAAAAAB0QMBAAAAAd8DAAAA9AMC7wMBAAAAAfIDAQAAAAH0AwEAAAAB9QMgAAAAAfYDQAAAAAECAAAAAQAgOgAAyQoAIBsDAACjCAAgBAAApAgAIA0AAKUIACAOAACnCAAgEQAAqAgAIBQAAKkIACAXAACqCAAgGAAAqwgAIBsAAKwIACDZAgEAAAAB3wIBAAAAAeMCQAAAAAHkAkAAAAABtQMBAAAAAdEDAQAAAAHmAwEAAAAB5wNAAAAAAegDAQAAAAHpAwEAAAAB6gMAAKEIACDrAwAAoggAIOwDAQAAAAHtAwEAAAAB7gMBAAAAAe8DAQAAAAHwAyAAAAAB8QMBAAAAAQIAAABWACA6AADLCgAgDQYAAMEGACDZAgEAAAAB4wJAAAAAAeQCQAAAAAG2AwEAAAABxgMAAADGAwLHAwAAvwYAIMgDAADABgAgyQNAAAAAAcoDQAAAAAHLAwgAAAABzAMBAAAAAc0DIAAAAAECAAAAEQAgOgAAzQoAIBMFAADlBgAgCwAA5gYAIAwAAOgGACDZAgEAAAAB2gIBAAAAAeMCQAAAAAHkAkAAAAAB0QMBAAAAAdIDAQAAAAHTAwEAAAAB1QMAAADVAwLWAwEAAAAB1wMBAAAAAdgDAQAAAAHZAwEAAAAB2gMBAAAAAdsDAQAAAAHcAyAAAAAB3QMBAAAAAQIAAAANACA6AADPCgAgAwAAABgAIDoAAMkKACA7AADTCgAgHgAAABgAIBcAAL0IACAYAAC7CAAgGwAAwAgAIB8AALEIACAgAACyCAAgIQAAswgAICIAALQIACAkAAC2CAAgJQAAtwgAICYAALgIACAnAAC5CAAgKAAAuggAICkAALwIACArAAC-CAAgLAAAvwgAIC0AAMEIACAzAADTCgAg2QIBAL0FACHjAkAAwAUAIeQCQADABQAh_gIBAL0FACHNAyAA5gUAIdEDAQC9BQAh3wMAALAI9AMi7wMBAL8FACHyAwEAvQUAIfQDAQC_BQAh9QMgAOYFACH2A0AAwQUAIRwXAAC9CAAgGAAAuwgAIBsAAMAIACAfAACxCAAgIAAAsggAICEAALMIACAiAAC0CAAgJAAAtggAICUAALcIACAmAAC4CAAgJwAAuQgAICgAALoIACApAAC8CAAgKwAAvggAICwAAL8IACAtAADBCAAg2QIBAL0FACHjAkAAwAUAIeQCQADABQAh_gIBAL0FACHNAyAA5gUAIdEDAQC9BQAh3wMAALAI9AMi7wMBAL8FACHyAwEAvQUAIfQDAQC_BQAh9QMgAOYFACH2A0AAwQUAIQMAAAA0ACA6AADLCgAgOwAA1goAIB0AAAA0ACADAACxBwAgBAAAsgcAIA0AALMHACAOAAC1BwAgEQAAtgcAIBQAALcHACAXAAC4BwAgGAAAuQcAIBsAALoHACAzAADWCgAg2QIBAL0FACHfAgEAvwUAIeMCQADABQAh5AJAAMAFACG1AwEAvQUAIdEDAQC9BQAh5gMBAL8FACHnA0AAwAUAIegDAQC_BQAh6QMBAL8FACHqAwAArwcAIOsDAACwBwAg7AMBAL0FACHtAwEAvQUAIe4DAQC_BQAh7wMBAL8FACHwAyAA5gUAIfEDAQC_BQAhGwMAALEHACAEAACyBwAgDQAAswcAIA4AALUHACARAAC2BwAgFAAAtwcAIBcAALgHACAYAAC5BwAgGwAAugcAINkCAQC9BQAh3wIBAL8FACHjAkAAwAUAIeQCQADABQAhtQMBAL0FACHRAwEAvQUAIeYDAQC_BQAh5wNAAMAFACHoAwEAvwUAIekDAQC_BQAh6gMAAK8HACDrAwAAsAcAIOwDAQC9BQAh7QMBAL0FACHuAwEAvwUAIe8DAQC_BQAh8AMgAOYFACHxAwEAvwUAIQMAAAAPACA6AADNCgAgOwAA2QoAIA8AAAAPACAGAACxBgAgMwAA2QoAINkCAQC9BQAh4wJAAMAFACHkAkAAwAUAIbYDAQC9BQAhxgMAAK4GxgMixwMAAK8GACDIAwAAsAYAIMkDQADABQAhygNAAMEFACHLAwgAlgYAIcwDAQC_BQAhzQMgAOYFACENBgAAsQYAINkCAQC9BQAh4wJAAMAFACHkAkAAwAUAIbYDAQC9BQAhxgMAAK4GxgMixwMAAK8GACDIAwAAsAYAIMkDQADABQAhygNAAMEFACHLAwgAlgYAIcwDAQC_BQAhzQMgAOYFACEDAAAACwAgOgAAzwoAIDsAANwKACAVAAAACwAgBQAAxwYAIAsAAMgGACAMAADKBgAgMwAA3AoAINkCAQC9BQAh2gIBAL0FACHjAkAAwAUAIeQCQADABQAh0QMBAL0FACHSAwEAvwUAIdMDAQC_BQAh1QMAAMYG1QMi1gMBAL0FACHXAwEAvQUAIdgDAQC_BQAh2QMBAL8FACHaAwEAvwUAIdsDAQC_BQAh3AMgAOYFACHdAwEAvwUAIRMFAADHBgAgCwAAyAYAIAwAAMoGACDZAgEAvQUAIdoCAQC9BQAh4wJAAMAFACHkAkAAwAUAIdEDAQC9BQAh0gMBAL8FACHTAwEAvwUAIdUDAADGBtUDItYDAQC9BQAh1wMBAL0FACHYAwEAvwUAIdkDAQC_BQAh2gMBAL8FACHbAwEAvwUAIdwDIADmBQAh3QMBAL8FACETBQAA5QYAIAkAAOcGACALAADmBgAg2QIBAAAAAdoCAQAAAAHjAkAAAAAB5AJAAAAAAdEDAQAAAAHSAwEAAAAB0wMBAAAAAdUDAAAA1QMC1gMBAAAAAdcDAQAAAAHYAwEAAAAB2QMBAAAAAdoDAQAAAAHbAwEAAAAB3AMgAAAAAd0DAQAAAAECAAAADQAgOgAA3QoAIAMAAAALACA6AADdCgAgOwAA4QoAIBUAAAALACAFAADHBgAgCQAAyQYAIAsAAMgGACAzAADhCgAg2QIBAL0FACHaAgEAvQUAIeMCQADABQAh5AJAAMAFACHRAwEAvQUAIdIDAQC_BQAh0wMBAL8FACHVAwAAxgbVAyLWAwEAvQUAIdcDAQC9BQAh2AMBAL8FACHZAwEAvwUAIdoDAQC_BQAh2wMBAL8FACHcAyAA5gUAId0DAQC_BQAhEwUAAMcGACAJAADJBgAgCwAAyAYAINkCAQC9BQAh2gIBAL0FACHjAkAAwAUAIeQCQADABQAh0QMBAL0FACHSAwEAvwUAIdMDAQC_BQAh1QMAAMYG1QMi1gMBAL0FACHXAwEAvQUAIdgDAQC_BQAh2QMBAL8FACHaAwEAvwUAIdsDAQC_BQAh3AMgAOYFACHdAwEAvwUAIRwXAADlCQAgGAAA4wkAIBsAAOgJACAfAADZCQAgIAAA2gkAICEAANsJACAiAADcCQAgIwAA3QkAICQAAN4JACAlAADfCQAgJgAA4AkAICcAAOEJACApAADkCQAgKwAA5gkAICwAAOcJACAtAADpCQAg2QIBAAAAAeMCQAAAAAHkAkAAAAAB_gIBAAAAAc0DIAAAAAHRAwEAAAAB3wMAAAD0AwLvAwEAAAAB8gMBAAAAAfQDAQAAAAH1AyAAAAAB9gNAAAAAAQIAAAABACA6AADiCgAgGwMAAKMIACAEAACkCAAgCQAApggAIA0AAKUIACARAACoCAAgFAAAqQgAIBcAAKoIACAYAACrCAAgGwAArAgAINkCAQAAAAHfAgEAAAAB4wJAAAAAAeQCQAAAAAG1AwEAAAAB0QMBAAAAAeYDAQAAAAHnA0AAAAAB6AMBAAAAAekDAQAAAAHqAwAAoQgAIOsDAACiCAAg7AMBAAAAAe0DAQAAAAHuAwEAAAAB7wMBAAAAAfADIAAAAAHxAwEAAAABAgAAAFYAIDoAAOQKACADAAAAGAAgOgAA4goAIDsAAOgKACAeAAAAGAAgFwAAvQgAIBgAALsIACAbAADACAAgHwAAsQgAICAAALIIACAhAACzCAAgIgAAtAgAICMAALUIACAkAAC2CAAgJQAAtwgAICYAALgIACAnAAC5CAAgKQAAvAgAICsAAL4IACAsAAC_CAAgLQAAwQgAIDMAAOgKACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhHBcAAL0IACAYAAC7CAAgGwAAwAgAIB8AALEIACAgAACyCAAgIQAAswgAICIAALQIACAjAAC1CAAgJAAAtggAICUAALcIACAmAAC4CAAgJwAAuQgAICkAALwIACArAAC-CAAgLAAAvwgAIC0AAMEIACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhAwAAADQAIDoAAOQKACA7AADrCgAgHQAAADQAIAMAALEHACAEAACyBwAgCQAAtAcAIA0AALMHACARAAC2BwAgFAAAtwcAIBcAALgHACAYAAC5BwAgGwAAugcAIDMAAOsKACDZAgEAvQUAId8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIbUDAQC9BQAh0QMBAL0FACHmAwEAvwUAIecDQADABQAh6AMBAL8FACHpAwEAvwUAIeoDAACvBwAg6wMAALAHACDsAwEAvQUAIe0DAQC9BQAh7gMBAL8FACHvAwEAvwUAIfADIADmBQAh8QMBAL8FACEbAwAAsQcAIAQAALIHACAJAAC0BwAgDQAAswcAIBEAALYHACAUAAC3BwAgFwAAuAcAIBgAALkHACAbAAC6BwAg2QIBAL0FACHfAgEAvwUAIeMCQADABQAh5AJAAMAFACG1AwEAvQUAIdEDAQC9BQAh5gMBAL8FACHnA0AAwAUAIegDAQC_BQAh6QMBAL8FACHqAwAArwcAIOsDAACwBwAg7AMBAL0FACHtAwEAvQUAIe4DAQC_BQAh7wMBAL8FACHwAyAA5gUAIfEDAQC_BQAhHBcAAOUJACAYAADjCQAgGwAA6AkAIB8AANkJACAgAADaCQAgIQAA2wkAICIAANwJACAjAADdCQAgJAAA3gkAICYAAOAJACAnAADhCQAgKAAA4gkAICkAAOQJACArAADmCQAgLAAA5wkAIC0AAOkJACDZAgEAAAAB4wJAAAAAAeQCQAAAAAH-AgEAAAABzQMgAAAAAdEDAQAAAAHfAwAAAPQDAu8DAQAAAAHyAwEAAAAB9AMBAAAAAfUDIAAAAAH2A0AAAAABAgAAAAEAIDoAAOwKACAcFwAA5QkAIBgAAOMJACAbAADoCQAgHwAA2QkAICAAANoJACAhAADbCQAgIgAA3AkAICMAAN0JACAlAADfCQAgJgAA4AkAICcAAOEJACAoAADiCQAgKQAA5AkAICsAAOYJACAsAADnCQAgLQAA6QkAINkCAQAAAAHjAkAAAAAB5AJAAAAAAf4CAQAAAAHNAyAAAAAB0QMBAAAAAd8DAAAA9AMC7wMBAAAAAfIDAQAAAAH0AwEAAAAB9QMgAAAAAfYDQAAAAAECAAAAAQAgOgAA7goAIBsDAACjCAAgBAAApAgAIAkAAKYIACANAAClCAAgDgAApwgAIBQAAKkIACAXAACqCAAgGAAAqwgAIBsAAKwIACDZAgEAAAAB3wIBAAAAAeMCQAAAAAHkAkAAAAABtQMBAAAAAdEDAQAAAAHmAwEAAAAB5wNAAAAAAegDAQAAAAHpAwEAAAAB6gMAAKEIACDrAwAAoggAIOwDAQAAAAHtAwEAAAAB7gMBAAAAAe8DAQAAAAHwAyAAAAAB8QMBAAAAAQIAAABWACA6AADwCgAgAwAAABgAIDoAAOwKACA7AAD0CgAgHgAAABgAIBcAAL0IACAYAAC7CAAgGwAAwAgAIB8AALEIACAgAACyCAAgIQAAswgAICIAALQIACAjAAC1CAAgJAAAtggAICYAALgIACAnAAC5CAAgKAAAuggAICkAALwIACArAAC-CAAgLAAAvwgAIC0AAMEIACAzAAD0CgAg2QIBAL0FACHjAkAAwAUAIeQCQADABQAh_gIBAL0FACHNAyAA5gUAIdEDAQC9BQAh3wMAALAI9AMi7wMBAL8FACHyAwEAvQUAIfQDAQC_BQAh9QMgAOYFACH2A0AAwQUAIRwXAAC9CAAgGAAAuwgAIBsAAMAIACAfAACxCAAgIAAAsggAICEAALMIACAiAAC0CAAgIwAAtQgAICQAALYIACAmAAC4CAAgJwAAuQgAICgAALoIACApAAC8CAAgKwAAvggAICwAAL8IACAtAADBCAAg2QIBAL0FACHjAkAAwAUAIeQCQADABQAh_gIBAL0FACHNAyAA5gUAIdEDAQC9BQAh3wMAALAI9AMi7wMBAL8FACHyAwEAvQUAIfQDAQC_BQAh9QMgAOYFACH2A0AAwQUAIQMAAAAYACA6AADuCgAgOwAA9woAIB4AAAAYACAXAAC9CAAgGAAAuwgAIBsAAMAIACAfAACxCAAgIAAAsggAICEAALMIACAiAAC0CAAgIwAAtQgAICUAALcIACAmAAC4CAAgJwAAuQgAICgAALoIACApAAC8CAAgKwAAvggAICwAAL8IACAtAADBCAAgMwAA9woAINkCAQC9BQAh4wJAAMAFACHkAkAAwAUAIf4CAQC9BQAhzQMgAOYFACHRAwEAvQUAId8DAACwCPQDIu8DAQC_BQAh8gMBAL0FACH0AwEAvwUAIfUDIADmBQAh9gNAAMEFACEcFwAAvQgAIBgAALsIACAbAADACAAgHwAAsQgAICAAALIIACAhAACzCAAgIgAAtAgAICMAALUIACAlAAC3CAAgJgAAuAgAICcAALkIACAoAAC6CAAgKQAAvAgAICsAAL4IACAsAAC_CAAgLQAAwQgAINkCAQC9BQAh4wJAAMAFACHkAkAAwAUAIf4CAQC9BQAhzQMgAOYFACHRAwEAvQUAId8DAACwCPQDIu8DAQC_BQAh8gMBAL0FACH0AwEAvwUAIfUDIADmBQAh9gNAAMEFACEDAAAANAAgOgAA8AoAIDsAAPoKACAdAAAANAAgAwAAsQcAIAQAALIHACAJAAC0BwAgDQAAswcAIA4AALUHACAUAAC3BwAgFwAAuAcAIBgAALkHACAbAAC6BwAgMwAA-goAINkCAQC9BQAh3wIBAL8FACHjAkAAwAUAIeQCQADABQAhtQMBAL0FACHRAwEAvQUAIeYDAQC_BQAh5wNAAMAFACHoAwEAvwUAIekDAQC_BQAh6gMAAK8HACDrAwAAsAcAIOwDAQC9BQAh7QMBAL0FACHuAwEAvwUAIe8DAQC_BQAh8AMgAOYFACHxAwEAvwUAIRsDAACxBwAgBAAAsgcAIAkAALQHACANAACzBwAgDgAAtQcAIBQAALcHACAXAAC4BwAgGAAAuQcAIBsAALoHACDZAgEAvQUAId8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIbUDAQC9BQAh0QMBAL0FACHmAwEAvwUAIecDQADABQAh6AMBAL8FACHpAwEAvwUAIeoDAACvBwAg6wMAALAHACDsAwEAvQUAIe0DAQC9BQAh7gMBAL8FACHvAwEAvwUAIfADIADmBQAh8QMBAL8FACEcFwAA5QkAIBgAAOMJACAbAADoCQAgHwAA2QkAICAAANoJACAhAADbCQAgIgAA3AkAICMAAN0JACAkAADeCQAgJQAA3wkAICYAAOAJACAoAADiCQAgKQAA5AkAICsAAOYJACAsAADnCQAgLQAA6QkAINkCAQAAAAHjAkAAAAAB5AJAAAAAAf4CAQAAAAHNAyAAAAAB0QMBAAAAAd8DAAAA9AMC7wMBAAAAAfIDAQAAAAH0AwEAAAAB9QMgAAAAAfYDQAAAAAECAAAAAQAgOgAA-woAIBwXAADlCQAgGAAA4wkAIBsAAOgJACAfAADZCQAgIAAA2gkAICEAANsJACAiAADcCQAgIwAA3QkAICQAAN4JACAlAADfCQAgJwAA4QkAICgAAOIJACApAADkCQAgKwAA5gkAICwAAOcJACAtAADpCQAg2QIBAAAAAeMCQAAAAAHkAkAAAAAB_gIBAAAAAc0DIAAAAAHRAwEAAAAB3wMAAAD0AwLvAwEAAAAB8gMBAAAAAfQDAQAAAAH1AyAAAAAB9gNAAAAAAQIAAAABACA6AAD9CgAgGwMAAKMIACAEAACkCAAgCQAApggAIA0AAKUIACAOAACnCAAgEQAAqAgAIBcAAKoIACAYAACrCAAgGwAArAgAINkCAQAAAAHfAgEAAAAB4wJAAAAAAeQCQAAAAAG1AwEAAAAB0QMBAAAAAeYDAQAAAAHnA0AAAAAB6AMBAAAAAekDAQAAAAHqAwAAoQgAIOsDAACiCAAg7AMBAAAAAe0DAQAAAAHuAwEAAAAB7wMBAAAAAfADIAAAAAHxAwEAAAABAgAAAFYAIDoAAP8KACADAAAAGAAgOgAA-woAIDsAAIMLACAeAAAAGAAgFwAAvQgAIBgAALsIACAbAADACAAgHwAAsQgAICAAALIIACAhAACzCAAgIgAAtAgAICMAALUIACAkAAC2CAAgJQAAtwgAICYAALgIACAoAAC6CAAgKQAAvAgAICsAAL4IACAsAAC_CAAgLQAAwQgAIDMAAIMLACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhHBcAAL0IACAYAAC7CAAgGwAAwAgAIB8AALEIACAgAACyCAAgIQAAswgAICIAALQIACAjAAC1CAAgJAAAtggAICUAALcIACAmAAC4CAAgKAAAuggAICkAALwIACArAAC-CAAgLAAAvwgAIC0AAMEIACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhAwAAABgAIDoAAP0KACA7AACGCwAgHgAAABgAIBcAAL0IACAYAAC7CAAgGwAAwAgAIB8AALEIACAgAACyCAAgIQAAswgAICIAALQIACAjAAC1CAAgJAAAtggAICUAALcIACAnAAC5CAAgKAAAuggAICkAALwIACArAAC-CAAgLAAAvwgAIC0AAMEIACAzAACGCwAg2QIBAL0FACHjAkAAwAUAIeQCQADABQAh_gIBAL0FACHNAyAA5gUAIdEDAQC9BQAh3wMAALAI9AMi7wMBAL8FACHyAwEAvQUAIfQDAQC_BQAh9QMgAOYFACH2A0AAwQUAIRwXAAC9CAAgGAAAuwgAIBsAAMAIACAfAACxCAAgIAAAsggAICEAALMIACAiAAC0CAAgIwAAtQgAICQAALYIACAlAAC3CAAgJwAAuQgAICgAALoIACApAAC8CAAgKwAAvggAICwAAL8IACAtAADBCAAg2QIBAL0FACHjAkAAwAUAIeQCQADABQAh_gIBAL0FACHNAyAA5gUAIdEDAQC9BQAh3wMAALAI9AMi7wMBAL8FACHyAwEAvQUAIfQDAQC_BQAh9QMgAOYFACH2A0AAwQUAIQMAAAA0ACA6AAD_CgAgOwAAiQsAIB0AAAA0ACADAACxBwAgBAAAsgcAIAkAALQHACANAACzBwAgDgAAtQcAIBEAALYHACAXAAC4BwAgGAAAuQcAIBsAALoHACAzAACJCwAg2QIBAL0FACHfAgEAvwUAIeMCQADABQAh5AJAAMAFACG1AwEAvQUAIdEDAQC9BQAh5gMBAL8FACHnA0AAwAUAIegDAQC_BQAh6QMBAL8FACHqAwAArwcAIOsDAACwBwAg7AMBAL0FACHtAwEAvQUAIe4DAQC_BQAh7wMBAL8FACHwAyAA5gUAIfEDAQC_BQAhGwMAALEHACAEAACyBwAgCQAAtAcAIA0AALMHACAOAAC1BwAgEQAAtgcAIBcAALgHACAYAAC5BwAgGwAAugcAINkCAQC9BQAh3wIBAL8FACHjAkAAwAUAIeQCQADABQAhtQMBAL0FACHRAwEAvQUAIeYDAQC_BQAh5wNAAMAFACHoAwEAvwUAIekDAQC_BQAh6gMAAK8HACDrAwAAsAcAIOwDAQC9BQAh7QMBAL0FACHuAwEAvwUAIe8DAQC_BQAh8AMgAOYFACHxAwEAvwUAIRsDAACjCAAgBAAApAgAIAkAAKYIACANAAClCAAgDgAApwgAIBEAAKgIACAUAACpCAAgFwAAqggAIBsAAKwIACDZAgEAAAAB3wIBAAAAAeMCQAAAAAHkAkAAAAABtQMBAAAAAdEDAQAAAAHmAwEAAAAB5wNAAAAAAegDAQAAAAHpAwEAAAAB6gMAAKEIACDrAwAAoggAIOwDAQAAAAHtAwEAAAAB7gMBAAAAAe8DAQAAAAHwAyAAAAAB8QMBAAAAAQIAAABWACA6AACKCwAgHBcAAOUJACAbAADoCQAgHwAA2QkAICAAANoJACAhAADbCQAgIgAA3AkAICMAAN0JACAkAADeCQAgJQAA3wkAICYAAOAJACAnAADhCQAgKAAA4gkAICkAAOQJACArAADmCQAgLAAA5wkAIC0AAOkJACDZAgEAAAAB4wJAAAAAAeQCQAAAAAH-AgEAAAABzQMgAAAAAdEDAQAAAAHfAwAAAPQDAu8DAQAAAAHyAwEAAAAB9AMBAAAAAfUDIAAAAAH2A0AAAAABAgAAAAEAIDoAAIwLACADAAAANAAgOgAAigsAIDsAAJALACAdAAAANAAgAwAAsQcAIAQAALIHACAJAAC0BwAgDQAAswcAIA4AALUHACARAAC2BwAgFAAAtwcAIBcAALgHACAbAAC6BwAgMwAAkAsAINkCAQC9BQAh3wIBAL8FACHjAkAAwAUAIeQCQADABQAhtQMBAL0FACHRAwEAvQUAIeYDAQC_BQAh5wNAAMAFACHoAwEAvwUAIekDAQC_BQAh6gMAAK8HACDrAwAAsAcAIOwDAQC9BQAh7QMBAL0FACHuAwEAvwUAIe8DAQC_BQAh8AMgAOYFACHxAwEAvwUAIRsDAACxBwAgBAAAsgcAIAkAALQHACANAACzBwAgDgAAtQcAIBEAALYHACAUAAC3BwAgFwAAuAcAIBsAALoHACDZAgEAvQUAId8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIbUDAQC9BQAh0QMBAL0FACHmAwEAvwUAIecDQADABQAh6AMBAL8FACHpAwEAvwUAIeoDAACvBwAg6wMAALAHACDsAwEAvQUAIe0DAQC9BQAh7gMBAL8FACHvAwEAvwUAIfADIADmBQAh8QMBAL8FACEDAAAAGAAgOgAAjAsAIDsAAJMLACAeAAAAGAAgFwAAvQgAIBsAAMAIACAfAACxCAAgIAAAsggAICEAALMIACAiAAC0CAAgIwAAtQgAICQAALYIACAlAAC3CAAgJgAAuAgAICcAALkIACAoAAC6CAAgKQAAvAgAICsAAL4IACAsAAC_CAAgLQAAwQgAIDMAAJMLACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhHBcAAL0IACAbAADACAAgHwAAsQgAICAAALIIACAhAACzCAAgIgAAtAgAICMAALUIACAkAAC2CAAgJQAAtwgAICYAALgIACAnAAC5CAAgKAAAuggAICkAALwIACArAAC-CAAgLAAAvwgAIC0AAMEIACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhHBcAAOUJACAYAADjCQAgGwAA6AkAIB8AANkJACAgAADaCQAgIQAA2wkAICIAANwJACAjAADdCQAgJAAA3gkAICUAAN8JACAmAADgCQAgJwAA4QkAICgAAOIJACArAADmCQAgLAAA5wkAIC0AAOkJACDZAgEAAAAB4wJAAAAAAeQCQAAAAAH-AgEAAAABzQMgAAAAAdEDAQAAAAHfAwAAAPQDAu8DAQAAAAHyAwEAAAAB9AMBAAAAAfUDIAAAAAH2A0AAAAABAgAAAAEAIDoAAJQLACADAAAAGAAgOgAAlAsAIDsAAJgLACAeAAAAGAAgFwAAvQgAIBgAALsIACAbAADACAAgHwAAsQgAICAAALIIACAhAACzCAAgIgAAtAgAICMAALUIACAkAAC2CAAgJQAAtwgAICYAALgIACAnAAC5CAAgKAAAuggAICsAAL4IACAsAAC_CAAgLQAAwQgAIDMAAJgLACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhHBcAAL0IACAYAAC7CAAgGwAAwAgAIB8AALEIACAgAACyCAAgIQAAswgAICIAALQIACAjAAC1CAAgJAAAtggAICUAALcIACAmAAC4CAAgJwAAuQgAICgAALoIACArAAC-CAAgLAAAvwgAIC0AAMEIACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhHBgAAOMJACAbAADoCQAgHwAA2QkAICAAANoJACAhAADbCQAgIgAA3AkAICMAAN0JACAkAADeCQAgJQAA3wkAICYAAOAJACAnAADhCQAgKAAA4gkAICkAAOQJACArAADmCQAgLAAA5wkAIC0AAOkJACDZAgEAAAAB4wJAAAAAAeQCQAAAAAH-AgEAAAABzQMgAAAAAdEDAQAAAAHfAwAAAPQDAu8DAQAAAAHyAwEAAAAB9AMBAAAAAfUDIAAAAAH2A0AAAAABAgAAAAEAIDoAAJkLACAKAwAAqAcAIAUAAKcHACAcAACpBwAgHgAAqgcAINkCAQAAAAHaAgEAAAAB4wJAAAAAAeQCQAAAAAG1AwEAAAAB0QMBAAAAAQIAAAAJACA6AACbCwAgGwMAAKMIACAEAACkCAAgCQAApggAIA0AAKUIACAOAACnCAAgEQAAqAgAIBQAAKkIACAYAACrCAAgGwAArAgAINkCAQAAAAHfAgEAAAAB4wJAAAAAAeQCQAAAAAG1AwEAAAAB0QMBAAAAAeYDAQAAAAHnA0AAAAAB6AMBAAAAAekDAQAAAAHqAwAAoQgAIOsDAACiCAAg7AMBAAAAAe0DAQAAAAHuAwEAAAAB7wMBAAAAAfADIAAAAAHxAwEAAAABAgAAAFYAIDoAAJ0LACADAAAAGAAgOgAAmQsAIDsAAKELACAeAAAAGAAgGAAAuwgAIBsAAMAIACAfAACxCAAgIAAAsggAICEAALMIACAiAAC0CAAgIwAAtQgAICQAALYIACAlAAC3CAAgJgAAuAgAICcAALkIACAoAAC6CAAgKQAAvAgAICsAAL4IACAsAAC_CAAgLQAAwQgAIDMAAKELACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhHBgAALsIACAbAADACAAgHwAAsQgAICAAALIIACAhAACzCAAgIgAAtAgAICMAALUIACAkAAC2CAAgJQAAtwgAICYAALgIACAnAAC5CAAgKAAAuggAICkAALwIACArAAC-CAAgLAAAvwgAIC0AAMEIACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhAwAAAAcAIDoAAJsLACA7AACkCwAgDAAAAAcAIAMAAP8GACAFAAD-BgAgHAAAgAcAIB4AAIEHACAzAACkCwAg2QIBAL0FACHaAgEAvQUAIeMCQADABQAh5AJAAMAFACG1AwEAvQUAIdEDAQC9BQAhCgMAAP8GACAFAAD-BgAgHAAAgAcAIB4AAIEHACDZAgEAvQUAIdoCAQC9BQAh4wJAAMAFACHkAkAAwAUAIbUDAQC9BQAh0QMBAL0FACEDAAAANAAgOgAAnQsAIDsAAKcLACAdAAAANAAgAwAAsQcAIAQAALIHACAJAAC0BwAgDQAAswcAIA4AALUHACARAAC2BwAgFAAAtwcAIBgAALkHACAbAAC6BwAgMwAApwsAINkCAQC9BQAh3wIBAL8FACHjAkAAwAUAIeQCQADABQAhtQMBAL0FACHRAwEAvQUAIeYDAQC_BQAh5wNAAMAFACHoAwEAvwUAIekDAQC_BQAh6gMAAK8HACDrAwAAsAcAIOwDAQC9BQAh7QMBAL0FACHuAwEAvwUAIe8DAQC_BQAh8AMgAOYFACHxAwEAvwUAIRsDAACxBwAgBAAAsgcAIAkAALQHACANAACzBwAgDgAAtQcAIBEAALYHACAUAAC3BwAgGAAAuQcAIBsAALoHACDZAgEAvQUAId8CAQC_BQAh4wJAAMAFACHkAkAAwAUAIbUDAQC9BQAh0QMBAL0FACHmAwEAvwUAIecDQADABQAh6AMBAL8FACHpAwEAvwUAIeoDAACvBwAg6wMAALAHACDsAwEAvQUAIe0DAQC9BQAh7gMBAL8FACHvAwEAvwUAIfADIADmBQAh8QMBAL8FACEcFwAA5QkAIBgAAOMJACAbAADoCQAgHwAA2QkAICAAANoJACAhAADbCQAgIgAA3AkAICMAAN0JACAkAADeCQAgJQAA3wkAICYAAOAJACAnAADhCQAgKAAA4gkAICkAAOQJACArAADmCQAgLQAA6QkAINkCAQAAAAHjAkAAAAAB5AJAAAAAAf4CAQAAAAHNAyAAAAAB0QMBAAAAAd8DAAAA9AMC7wMBAAAAAfIDAQAAAAH0AwEAAAAB9QMgAAAAAfYDQAAAAAECAAAAAQAgOgAAqAsAIBwXAADlCQAgGAAA4wkAIBsAAOgJACAfAADZCQAgIAAA2gkAICEAANsJACAiAADcCQAgIwAA3QkAICQAAN4JACAlAADfCQAgJgAA4AkAICcAAOEJACAoAADiCQAgKQAA5AkAICwAAOcJACAtAADpCQAg2QIBAAAAAeMCQAAAAAHkAkAAAAAB_gIBAAAAAc0DIAAAAAHRAwEAAAAB3wMAAAD0AwLvAwEAAAAB8gMBAAAAAfQDAQAAAAH1AyAAAAAB9gNAAAAAAQIAAAABACA6AACqCwAgAwAAABgAIDoAAKgLACA7AACuCwAgHgAAABgAIBcAAL0IACAYAAC7CAAgGwAAwAgAIB8AALEIACAgAACyCAAgIQAAswgAICIAALQIACAjAAC1CAAgJAAAtggAICUAALcIACAmAAC4CAAgJwAAuQgAICgAALoIACApAAC8CAAgKwAAvggAIC0AAMEIACAzAACuCwAg2QIBAL0FACHjAkAAwAUAIeQCQADABQAh_gIBAL0FACHNAyAA5gUAIdEDAQC9BQAh3wMAALAI9AMi7wMBAL8FACHyAwEAvQUAIfQDAQC_BQAh9QMgAOYFACH2A0AAwQUAIRwXAAC9CAAgGAAAuwgAIBsAAMAIACAfAACxCAAgIAAAsggAICEAALMIACAiAAC0CAAgIwAAtQgAICQAALYIACAlAAC3CAAgJgAAuAgAICcAALkIACAoAAC6CAAgKQAAvAgAICsAAL4IACAtAADBCAAg2QIBAL0FACHjAkAAwAUAIeQCQADABQAh_gIBAL0FACHNAyAA5gUAIdEDAQC9BQAh3wMAALAI9AMi7wMBAL8FACHyAwEAvQUAIfQDAQC_BQAh9QMgAOYFACH2A0AAwQUAIQMAAAAYACA6AACqCwAgOwAAsQsAIB4AAAAYACAXAAC9CAAgGAAAuwgAIBsAAMAIACAfAACxCAAgIAAAsggAICEAALMIACAiAAC0CAAgIwAAtQgAICQAALYIACAlAAC3CAAgJgAAuAgAICcAALkIACAoAAC6CAAgKQAAvAgAICwAAL8IACAtAADBCAAgMwAAsQsAINkCAQC9BQAh4wJAAMAFACHkAkAAwAUAIf4CAQC9BQAhzQMgAOYFACHRAwEAvQUAId8DAACwCPQDIu8DAQC_BQAh8gMBAL0FACH0AwEAvwUAIfUDIADmBQAh9gNAAMEFACEcFwAAvQgAIBgAALsIACAbAADACAAgHwAAsQgAICAAALIIACAhAACzCAAgIgAAtAgAICMAALUIACAkAAC2CAAgJQAAtwgAICYAALgIACAnAAC5CAAgKAAAuggAICkAALwIACAsAAC_CAAgLQAAwQgAINkCAQC9BQAh4wJAAMAFACHkAkAAwAUAIf4CAQC9BQAhzQMgAOYFACHRAwEAvQUAId8DAACwCPQDIu8DAQC_BQAh8gMBAL0FACH0AwEAvwUAIfUDIADmBQAh9gNAAMEFACEcFwAA5QkAIBgAAOMJACAbAADoCQAgHwAA2QkAICAAANoJACAhAADbCQAgIgAA3AkAICMAAN0JACAkAADeCQAgJQAA3wkAICYAAOAJACAnAADhCQAgKAAA4gkAICkAAOQJACArAADmCQAgLAAA5wkAINkCAQAAAAHjAkAAAAAB5AJAAAAAAf4CAQAAAAHNAyAAAAAB0QMBAAAAAd8DAAAA9AMC7wMBAAAAAfIDAQAAAAH0AwEAAAAB9QMgAAAAAfYDQAAAAAECAAAAAQAgOgAAsgsAIBwXAADlCQAgGAAA4wkAIB8AANkJACAgAADaCQAgIQAA2wkAICIAANwJACAjAADdCQAgJAAA3gkAICUAAN8JACAmAADgCQAgJwAA4QkAICgAAOIJACApAADkCQAgKwAA5gkAICwAAOcJACAtAADpCQAg2QIBAAAAAeMCQAAAAAHkAkAAAAAB_gIBAAAAAc0DIAAAAAHRAwEAAAAB3wMAAAD0AwLvAwEAAAAB8gMBAAAAAfQDAQAAAAH1AyAAAAAB9gNAAAAAAQIAAAABACA6AAC0CwAgGwMAAKMIACAEAACkCAAgCQAApggAIA0AAKUIACAOAACnCAAgEQAAqAgAIBQAAKkIACAXAACqCAAgGAAAqwgAINkCAQAAAAHfAgEAAAAB4wJAAAAAAeQCQAAAAAG1AwEAAAAB0QMBAAAAAeYDAQAAAAHnA0AAAAAB6AMBAAAAAekDAQAAAAHqAwAAoQgAIOsDAACiCAAg7AMBAAAAAe0DAQAAAAHuAwEAAAAB7wMBAAAAAfADIAAAAAHxAwEAAAABAgAAAFYAIDoAALYLACADAAAAGAAgOgAAsgsAIDsAALoLACAeAAAAGAAgFwAAvQgAIBgAALsIACAbAADACAAgHwAAsQgAICAAALIIACAhAACzCAAgIgAAtAgAICMAALUIACAkAAC2CAAgJQAAtwgAICYAALgIACAnAAC5CAAgKAAAuggAICkAALwIACArAAC-CAAgLAAAvwgAIDMAALoLACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhHBcAAL0IACAYAAC7CAAgGwAAwAgAIB8AALEIACAgAACyCAAgIQAAswgAICIAALQIACAjAAC1CAAgJAAAtggAICUAALcIACAmAAC4CAAgJwAAuQgAICgAALoIACApAAC8CAAgKwAAvggAICwAAL8IACDZAgEAvQUAIeMCQADABQAh5AJAAMAFACH-AgEAvQUAIc0DIADmBQAh0QMBAL0FACHfAwAAsAj0AyLvAwEAvwUAIfIDAQC9BQAh9AMBAL8FACH1AyAA5gUAIfYDQADBBQAhAwAAABgAIDoAALQLACA7AAC9CwAgHgAAABgAIBcAAL0IACAYAAC7CAAgHwAAsQgAICAAALIIACAhAACzCAAgIgAAtAgAICMAALUIACAkAAC2CAAgJQAAtwgAICYAALgIACAnAAC5CAAgKAAAuggAICkAALwIACArAAC-CAAgLAAAvwgAIC0AAMEIACAzAAC9CwAg2QIBAL0FACHjAkAAwAUAIeQCQADABQAh_gIBAL0FACHNAyAA5gUAIdEDAQC9BQAh3wMAALAI9AMi7wMBAL8FACHyAwEAvQUAIfQDAQC_BQAh9QMgAOYFACH2A0AAwQUAIRwXAAC9CAAgGAAAuwgAIB8AALEIACAgAACyCAAgIQAAswgAICIAALQIACAjAAC1CAAgJAAAtggAICUAALcIACAmAAC4CAAgJwAAuQgAICgAALoIACApAAC8CAAgKwAAvggAICwAAL8IACAtAADBCAAg2QIBAL0FACHjAkAAwAUAIeQCQADABQAh_gIBAL0FACHNAyAA5gUAIdEDAQC9BQAh3wMAALAI9AMi7wMBAL8FACHyAwEAvQUAIfQDAQC_BQAh9QMgAOYFACH2A0AAwQUAIQMAAAA0ACA6AAC2CwAgOwAAwAsAIB0AAAA0ACADAACxBwAgBAAAsgcAIAkAALQHACANAACzBwAgDgAAtQcAIBEAALYHACAUAAC3BwAgFwAAuAcAIBgAALkHACAzAADACwAg2QIBAL0FACHfAgEAvwUAIeMCQADABQAh5AJAAMAFACG1AwEAvQUAIdEDAQC9BQAh5gMBAL8FACHnA0AAwAUAIegDAQC_BQAh6QMBAL8FACHqAwAArwcAIOsDAACwBwAg7AMBAL0FACHtAwEAvQUAIe4DAQC_BQAh7wMBAL8FACHwAyAA5gUAIfEDAQC_BQAhGwMAALEHACAEAACyBwAgCQAAtAcAIA0AALMHACAOAAC1BwAgEQAAtgcAIBQAALcHACAXAAC4BwAgGAAAuQcAINkCAQC9BQAh3wIBAL8FACHjAkAAwAUAIeQCQADABQAhtQMBAL0FACHRAwEAvQUAIeYDAQC_BQAh5wNAAMAFACHoAwEAvwUAIekDAQC_BQAh6gMAAK8HACDrAwAAsAcAIOwDAQC9BQAh7QMBAL0FACHuAwEAvwUAIe8DAQC_BQAh8AMgAOYFACHxAwEAvwUAIRIKABYXYQ4YXg8baBAfBgIgUwMhVBIiVwQjWAckWQwlWgwmWw0nXA0oXQspYBQrYxUsZxUtaRACFQADFgABBgMAAQUABAoAExdPDhxKAh5OEgsDAAEECgMJIAcKABENDgUOJAsRKAwULg0XMw4YOw8bQBAFBQAECRsHCgAKCxIGDB0JAwYABQkWBwoACAQFAAQGAAUHFwYIGQEBCRoAAQYABQIJHwALHgACAwABBQAEAwUABA8pARAqAQMFAAQSAAETLwEDBTUEFTYDFjcBAgU8BBYAAQMFAAQZAAEaAAEJBEEACUMADUIADkQAEUUAFEYAF0cAGEgAG0kAAhUAAx0AAQMXUgAcUAAeUQABFgABAhYAASpkAQ8XdQAYdAAbdwAfagAgawAhbAAibQAjbgAkbwAlcAAmcQAncgAocwAsdgAteAAAAAADCgAbQAAcQQAdAAAAAwoAG0AAHEEAHQEDAAEBAwABAwoAIkAAI0EAJAAAAAMKACJAACNBACQCAwABBQAEAgMAAQUABAMKAClAACpBACsAAAADCgApQAAqQQArAhUAAxYAAQIVAAMWAAEDCgAwQAAxQQAyAAAAAwoAMEAAMUEAMgIVAAMdAAECFQADHQABAwoAN0AAOEEAOQAAAAMKADdAADhBADkBBQAEAQUABAMKAD5AAD9BAEAAAAADCgA-QAA_QQBAAQYABQEGAAUFCgBFQABIQQBJogEARqMBAEcAAAAAAAUKAEVAAEhBAEmiAQBGowEARwQFAAQGAAUHnQIGCJ4CAQQFAAQGAAUHpAIGCKUCAQUKAE5AAFFBAFKiAQBPowEAUAAAAAAABQoATkAAUUEAUqIBAE-jAQBQAQYABQEGAAUFCgBXQABaQQBbogEAWKMBAFkAAAAAAAUKAFdAAFpBAFuiAQBYowEAWQIDAAEFAAQCAwABBQAEBQoAYEAAY0EAZKIBAGGjAQBiAAAAAAAFCgBgQABjQQBkogEAYaMBAGIDBQAED-UCARDmAgEDBQAED-wCARDtAgEDCgBpQABqQQBrAAAAAwoAaUAAakEAawMFAAQSAAET_wIBAwUABBIAAROFAwEDCgBwQABxQQByAAAAAwoAcEAAcUEAcgIFlwMEFgABAgWdAwQWAAEDCgB3QAB4QQB5AAAAAwoAd0AAeEEAeQEWAAEBFgABBQoAfkAAgQFBAIIBogEAf6MBAIABAAAAAAAFCgB-QACBAUEAggGiAQB_owEAgAEDBccDBBXIAwMWyQMBAwXPAwQV0AMDFtEDAQMKAIcBQACIAUEAiQEAAAADCgCHAUAAiAFBAIkBAAAABQoAjwFAAJIBQQCTAaIBAJABowEAkQEAAAAAAAUKAI8BQACSAUEAkwGiAQCQAaMBAJEBAhYAASr8AwECFgABKoIEAQUKAJgBQACbAUEAnAGiAQCZAaMBAJoBAAAAAAAFCgCYAUAAmwFBAJwBogEAmQGjAQCaAQMFAAQZAAEaAAEDBQAEGQABGgABAwoAoQFAAKIBQQCjAQAAAAMKAKEBQACiAUEAowEuAgEveQEwewExfAEyfQE0fwE1gQEXNoIBGDeEAQE4hgEXOYcBGTyIAQE9iQEBPooBF0KNARpDjgEeRI8BBEWQAQRGkQEER5IBBEiTAQRJlQEESpcBF0uYAR9MmgEETZwBF06dASBPngEEUJ8BBFGgARdSowEhU6QBJVSlAQNVpgEDVqcBA1eoAQNYqQEDWasBA1qtARdbrgEmXLABA12yARdeswEnX7QBA2C1AQNhtgEXYrkBKGO6ASxkuwECZbwBAma9AQJnvgECaL8BAmnBAQJqwwEXa8QBLWzGAQJtyAEXbskBLm_KAQJwywECccwBF3LPAS9z0AEzdNEBEnXSARJ20wESd9QBEnjVARJ51wESetkBF3vaATR83AESfd4BF37fATV_4AESgAHhARKBAeIBF4IB5QE2gwHmATqEAecBBYUB6AEFhgHpAQWHAeoBBYgB6wEFiQHtAQWKAe8BF4sB8AE7jAHyAQWNAfQBF44B9QE8jwH2AQWQAfcBBZEB-AEXkgH7AT2TAfwBQZQB_QEGlQH-AQaWAf8BBpcBgAIGmAGBAgaZAYMCBpoBhQIXmwGGAkKcAYgCBp0BigIXngGLAkOfAYwCBqABjQIGoQGOAhekAZECRKUBkgJKpgGTAgenAZQCB6gBlQIHqQGWAgeqAZcCB6sBmQIHrAGbAhetAZwCS64BoAIHrwGiAhewAaMCTLEBpgIHsgGnAgezAagCF7QBqwJNtQGsAlO2Aa4CCbcBrwIJuAGxAgm5AbICCboBswIJuwG1Agm8AbcCF70BuAJUvgG6Agm_AbwCF8ABvQJVwQG-AgnCAb8CCcMBwAIXxAHDAlbFAcQCXMYBxQILxwHGAgvIAccCC8kByAILygHJAgvLAcsCC8wBzQIXzQHOAl3OAdACC88B0gIX0AHTAl7RAdQCC9IB1QIL0wHWAhfUAdkCX9UB2gJl1gHbAgzXAdwCDNgB3QIM2QHeAgzaAd8CDNsB4QIM3AHjAhfdAeQCZt4B6AIM3wHqAhfgAesCZ-EB7gIM4gHvAgzjAfACF-QB8wJo5QH0AmzmAfUCDecB9gIN6AH3Ag3pAfgCDeoB-QIN6wH7Ag3sAf0CF-0B_gJt7gGBAw3vAYMDF_ABhANu8QGGAw3yAYcDDfMBiAMX9AGLA2_1AYwDc_YBjQMP9wGOAw_4AY8DD_kBkAMP-gGRAw_7AZMDD_wBlQMX_QGWA3T-AZkDD_8BmwMXgAKcA3WBAp4DD4ICnwMPgwKgAxeEAqMDdoUCpAN6hgKmAxSHAqcDFIgCqQMUiQKqAxSKAqsDFIsCrQMUjAKvAxeNArADe44CsgMUjwK0AxeQArUDfJECtgMUkgK3AxSTArgDF5QCuwN9lQK8A4MBlgK9Aw6XAr4DDpgCvwMOmQLAAw6aAsEDDpsCwwMOnALFAxedAsYDhAGeAssDDp8CzQMXoALOA4UBoQLSAw6iAtMDDqMC1AMXpALXA4YBpQLYA4oBpgLaA4sBpwLbA4sBqALeA4sBqQLfA4sBqgLgA4sBqwLiA4sBrALkAxetAuUDjAGuAucDiwGvAukDF7AC6gONAbEC6wOLAbIC7AOLAbMC7QMXtALwA44BtQLxA5QBtgLyAxW3AvMDFbgC9AMVuQL1AxW6AvYDFbsC-AMVvAL6Axe9AvsDlQG-Av4DFb8CgAQXwAKBBJYBwQKDBBXCAoQEFcMChQQXxAKIBJcBxQKJBJ0BxgKKBBDHAosEEMgCjAQQyQKNBBDKAo4EEMsCkAQQzAKSBBfNApMEngHOApUEEM8ClwQX0AKYBJ8B0QKZBBDSApoEENMCmwQX1AKeBKAB1QKfBKQB"
};
async function decodeBase64AsWasm(wasmBase64) {
  const { Buffer } = await import("node:buffer");
  const wasmArray = Buffer.from(wasmBase64, "base64");
  return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
  getRuntime: async () => await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs"),
  getQueryCompilerWasmModule: async () => {
    const { wasm } = await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs");
    return await decodeBase64AsWasm(wasm);
  },
  importName: "./query_compiler_fast_bg.js"
};
function getPrismaClientClass() {
  return runtime.getPrismaClient(config);
}

// generated/prisma/internal/prismaNamespace.ts
import * as runtime2 from "@prisma/client/runtime/client";
var getExtensionContext = runtime2.Extensions.getExtensionContext;
var NullTypes2 = {
  DbNull: runtime2.NullTypes.DbNull,
  JsonNull: runtime2.NullTypes.JsonNull,
  AnyNull: runtime2.NullTypes.AnyNull
};
var TransactionIsolationLevel = runtime2.makeStrictEnum({
  ReadUncommitted: "ReadUncommitted",
  ReadCommitted: "ReadCommitted",
  RepeatableRead: "RepeatableRead",
  Serializable: "Serializable"
});
var defineExtension = runtime2.Extensions.defineExtension;

// generated/prisma/client.ts
globalThis["__dirname"] = path.dirname(fileURLToPath(import.meta.url));
var PrismaClient = getPrismaClientClass();

// prisma/seed.ts
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
var adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
});
var prisma = new PrismaClient({ adapter });
async function main() {
  console.log("\u{1F331} Starting CareNest database seeding...");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.careNote.deleteMany();
  await prisma.careTask.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.scheduledDose.deleteMany();
  await prisma.medicationStock.deleteMany();
  await prisma.medicationSchedule.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.patientAccessRequest.deleteMany();
  await prisma.caretakerProfile.deleteMany();
  await prisma.careCircleInvitation.deleteMany();
  await prisma.careCircleMember.deleteMany();
  await prisma.careCircle.deleteMany();
  await prisma.elderlyProfile.deleteMany();
  await prisma.user.deleteMany();
  const passwordHash = await bcrypt.hash("CareNest2026!", 10);
  const pinHash1234 = await bcrypt.hash("1234", 10);
  const pinHash5678 = await bcrypt.hash("5678", 10);
  const nowVerified = /* @__PURE__ */ new Date();
  const sarah = await prisma.user.create({
    data: {
      email: "sarah.vance@carenest.org",
      name: "Sarah Vance",
      passwordHash,
      role: "FAMILY",
      phoneNumber: "+1 (555) 234-5678",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified
    }
  });
  const eleanor = await prisma.user.create({
    data: {
      email: "eleanor.vance@carenest.org",
      name: "Eleanor Vance",
      passwordHash,
      role: "SENIOR",
      phoneNumber: "+1 (555) 345-6789",
      avatarUrl: "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified
    }
  });
  const marcus = await prisma.user.create({
    data: {
      email: "marcus.reed@carenest.org",
      name: "Marcus Reed, RN",
      passwordHash,
      role: "CARETAKER",
      phoneNumber: "+1 (555) 456-7890",
      avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified
    }
  });
  const david = await prisma.user.create({
    data: {
      email: "david.vance@carenest.org",
      name: "David Vance",
      passwordHash,
      role: "FAMILY",
      phoneNumber: "+1 (555) 567-8901",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified
    }
  });
  const admin = await prisma.user.create({
    data: {
      email: "admin@carenest.org",
      name: "Dr. Evelyn Harper",
      passwordHash,
      role: "ADMIN",
      phoneNumber: "+1 (555) 999-0000",
      avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified
    }
  });
  const amit = await prisma.user.create({
    data: {
      email: "amit.kumar@carenest.org",
      name: "Amit Kumar",
      passwordHash,
      role: "FAMILY",
      phoneNumber: "+1 (555) 601-2345",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified
    }
  });
  const priya = await prisma.user.create({
    data: {
      email: "priya.sharma@carenest.org",
      name: "Priya Sharma",
      passwordHash,
      role: "FAMILY",
      phoneNumber: "+1 (555) 602-3456",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified
    }
  });
  const rahul = await prisma.user.create({
    data: {
      email: "rahul.verma@carenest.org",
      name: "Rahul Verma, RN",
      passwordHash,
      role: "CARETAKER",
      phoneNumber: "+1 (555) 701-4567",
      avatarUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified
    }
  });
  const anjali = await prisma.user.create({
    data: {
      email: "anjali.rao@carenest.org",
      name: "Anjali Rao, RN",
      passwordHash,
      role: "CARETAKER",
      phoneNumber: "+1 (555) 702-5678",
      avatarUrl: "https://images.unsplash.com/photo-1594824813511-20925e0b0dbd?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified
    }
  });
  const rameshUser = await prisma.user.create({
    data: {
      email: "ramesh.kumar@carenest.org",
      name: "Ramesh Kumar",
      passwordHash,
      role: "SENIOR",
      phoneNumber: "+1 (555) 801-6789",
      avatarUrl: "https://images.unsplash.com/photo-1545167622-3a6ac756afa4?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified
    }
  });
  const sureshUser = await prisma.user.create({
    data: {
      email: "suresh.kumar@carenest.org",
      name: "Suresh Kumar",
      passwordHash,
      role: "SENIOR",
      phoneNumber: "+1 (555) 802-7890",
      avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified
    }
  });
  const lakshmiUser = await prisma.user.create({
    data: {
      email: "lakshmi.sharma@carenest.org",
      name: "Lakshmi Sharma",
      passwordHash,
      role: "SENIOR",
      phoneNumber: "+1 (555) 803-8901",
      avatarUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified
    }
  });
  const meeraUser = await prisma.user.create({
    data: {
      email: "meera.sharma@carenest.org",
      name: "Meera Sharma",
      passwordHash,
      role: "SENIOR",
      phoneNumber: "+1 (555) 804-9012",
      avatarUrl: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified
    }
  });
  const allUsers = [
    sarah,
    eleanor,
    marcus,
    david,
    admin,
    amit,
    priya,
    rahul,
    anjali,
    rameshUser,
    sureshUser,
    lakshmiUser,
    meeraUser
  ];
  for (const u of allUsers) {
    await prisma.notificationPreference.create({
      data: {
        userId: u.id,
        emailReminders: true,
        missedDoseAlerts: true,
        escalationAlerts: true,
        appointmentReminders: true,
        dailySummaryEmail: u.role === "FAMILY",
        gracePeriodMinutes: 45
      }
    });
  }
  const profileEleanor = await prisma.elderlyProfile.create({
    data: {
      name: "Eleanor Vance",
      preferredName: "Grandma Eleanor",
      dateOfBirth: /* @__PURE__ */ new Date("1948-04-12"),
      gender: "Female",
      bloodGroup: "A+",
      allergies: ["Penicillin", "Sulfa drugs"],
      medicalConditions: ["Hypertension", "Type 2 Diabetes", "Osteoarthritis"],
      emergencyContactName: "Sarah Vance",
      emergencyContactPhone: "+1 (555) 234-5678",
      emergencyContactRelation: "Daughter",
      notes: "Prefers morning doses after warm oatmeal. Uses magnifying reading glasses for small labels.",
      avatarUrl: "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=200&auto=format&fit=crop&q=80",
      isSeniorModeActive: true,
      seniorPin: pinHash1234,
      createdById: sarah.id
    }
  });
  const profileArthur = await prisma.elderlyProfile.create({
    data: {
      name: "Arthur Vance",
      preferredName: "Arthur",
      dateOfBirth: /* @__PURE__ */ new Date("1945-09-20"),
      gender: "Male",
      bloodGroup: "O+",
      allergies: ["Aspirin"],
      medicalConditions: ["Mild Cognitive Impairment", "Coronary Artery Disease"],
      emergencyContactName: "Sarah Vance",
      emergencyContactPhone: "+1 (555) 234-5678",
      emergencyContactRelation: "Daughter",
      notes: "Requires gentle step-by-step assistance with morning routine.",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80",
      isSeniorModeActive: true,
      seniorPin: pinHash5678,
      createdById: sarah.id
    }
  });
  const profileRamesh = await prisma.elderlyProfile.create({
    data: {
      name: "Ramesh Kumar",
      preferredName: "Papa Ramesh",
      dateOfBirth: /* @__PURE__ */ new Date("1949-08-15"),
      gender: "Male",
      bloodGroup: "B+",
      allergies: ["Sulfa drugs"],
      medicalConditions: ["Essential Hypertension", "Type 2 Diabetes Mellitus"],
      emergencyContactName: "Amit Kumar",
      emergencyContactPhone: "+1 (555) 601-2345",
      emergencyContactRelation: "Father",
      notes: "Takes morning stroll in the garden. Prefers warm water with morning pills.",
      avatarUrl: "https://images.unsplash.com/photo-1545167622-3a6ac756afa4?w=200&auto=format&fit=crop&q=80",
      isSeniorModeActive: true,
      seniorPin: pinHash1234,
      createdById: amit.id
    }
  });
  const profileSuresh = await prisma.elderlyProfile.create({
    data: {
      name: "Suresh Kumar",
      preferredName: "Uncle Suresh",
      dateOfBirth: /* @__PURE__ */ new Date("1952-11-04"),
      gender: "Male",
      bloodGroup: "O+",
      allergies: ["Shellfish"],
      medicalConditions: ["Mild Osteoarthritis", "Stage 1 Hypertension"],
      emergencyContactName: "Amit Kumar",
      emergencyContactPhone: "+1 (555) 601-2345",
      emergencyContactRelation: "Uncle",
      notes: "Knee mobility exercises in the morning. Enjoys reading the newspaper after breakfast.",
      avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80",
      isSeniorModeActive: true,
      seniorPin: pinHash1234,
      createdById: amit.id
    }
  });
  const profileLakshmi = await prisma.elderlyProfile.create({
    data: {
      name: "Lakshmi Sharma",
      preferredName: "Maa Lakshmi",
      dateOfBirth: /* @__PURE__ */ new Date("1951-03-22"),
      gender: "Female",
      bloodGroup: "A+",
      allergies: ["Penicillin"],
      medicalConditions: ["Hypothyroidism", "Mild Osteoporosis"],
      emergencyContactName: "Priya Sharma",
      emergencyContactPhone: "+1 (555) 602-3456",
      emergencyContactRelation: "Mother",
      notes: "Thyroid medication strictly 30 minutes before morning tea.",
      avatarUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80",
      isSeniorModeActive: true,
      seniorPin: pinHash1234,
      createdById: priya.id
    }
  });
  const profileMeera = await prisma.elderlyProfile.create({
    data: {
      name: "Meera Sharma",
      preferredName: "Dadi Meera",
      dateOfBirth: /* @__PURE__ */ new Date("1942-07-10"),
      gender: "Female",
      bloodGroup: "B-",
      allergies: ["NSAIDs", "Ibuprofen"],
      medicalConditions: ["Mild Cognitive Impairment", "Chronic Lower Back Pain"],
      emergencyContactName: "Priya Sharma",
      emergencyContactPhone: "+1 (555) 602-3456",
      emergencyContactRelation: "Grandmother",
      notes: "Requires gentle memory cues and evening music therapy.",
      avatarUrl: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80",
      isSeniorModeActive: true,
      seniorPin: pinHash1234,
      createdById: priya.id
    }
  });
  const circleEleanor = await prisma.careCircle.create({
    data: {
      name: "Eleanor Vance Care Circle",
      elderlyProfileId: profileEleanor.id,
      createdById: sarah.id
    }
  });
  await prisma.careCircleMember.createMany({
    data: [
      {
        careCircleId: circleEleanor.id,
        userId: sarah.id,
        role: "ADMIN",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_MANAGE_APPOINTMENTS", "CAN_RECEIVE_ESCALATIONS", "CAN_MANAGE_CIRCLE"]
      },
      {
        careCircleId: circleEleanor.id,
        userId: eleanor.id,
        role: "SENIOR",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS"]
      },
      {
        careCircleId: circleEleanor.id,
        userId: marcus.id,
        role: "CARETAKER",
        permissions: ["CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_LOG_CARE_NOTES", "CAN_COMPLETE_TASKS", "CAN_RECEIVE_ESCALATIONS"]
      },
      {
        careCircleId: circleEleanor.id,
        userId: david.id,
        role: "FAMILY_MEMBER",
        permissions: ["CAN_VIEW_RECORDS", "CAN_CONFIRM_DOSE", "CAN_RECEIVE_ESCALATIONS"]
      }
    ]
  });
  const circleArthur = await prisma.careCircle.create({
    data: {
      name: "Arthur Vance Care Circle",
      elderlyProfileId: profileArthur.id,
      createdById: sarah.id
    }
  });
  await prisma.careCircleMember.createMany({
    data: [
      {
        careCircleId: circleArthur.id,
        userId: sarah.id,
        role: "ADMIN",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_MANAGE_APPOINTMENTS", "CAN_RECEIVE_ESCALATIONS", "CAN_MANAGE_CIRCLE"]
      },
      {
        careCircleId: circleArthur.id,
        userId: marcus.id,
        role: "CARETAKER",
        permissions: ["CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_LOG_CARE_NOTES", "CAN_COMPLETE_TASKS"]
      }
    ]
  });
  const circleRamesh = await prisma.careCircle.create({
    data: {
      name: "Ramesh Kumar Care Circle",
      elderlyProfileId: profileRamesh.id,
      createdById: amit.id
    }
  });
  await prisma.careCircleMember.createMany({
    data: [
      {
        careCircleId: circleRamesh.id,
        userId: amit.id,
        role: "ADMIN",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_MANAGE_APPOINTMENTS", "CAN_RECEIVE_ESCALATIONS", "CAN_MANAGE_CIRCLE"]
      },
      {
        careCircleId: circleRamesh.id,
        userId: rameshUser.id,
        role: "SENIOR",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS"]
      },
      {
        careCircleId: circleRamesh.id,
        userId: rahul.id,
        role: "CARETAKER",
        permissions: ["CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_LOG_CARE_NOTES", "CAN_COMPLETE_TASKS", "CAN_RECEIVE_ESCALATIONS"]
      }
    ]
  });
  const circleSuresh = await prisma.careCircle.create({
    data: {
      name: "Suresh Kumar Care Circle",
      elderlyProfileId: profileSuresh.id,
      createdById: amit.id
    }
  });
  await prisma.careCircleMember.createMany({
    data: [
      {
        careCircleId: circleSuresh.id,
        userId: amit.id,
        role: "ADMIN",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_MANAGE_APPOINTMENTS", "CAN_RECEIVE_ESCALATIONS", "CAN_MANAGE_CIRCLE"]
      },
      {
        careCircleId: circleSuresh.id,
        userId: sureshUser.id,
        role: "SENIOR",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS"]
      },
      {
        careCircleId: circleSuresh.id,
        userId: rahul.id,
        role: "CARETAKER",
        permissions: ["CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_LOG_CARE_NOTES", "CAN_COMPLETE_TASKS", "CAN_RECEIVE_ESCALATIONS"]
      }
    ]
  });
  const circleLakshmi = await prisma.careCircle.create({
    data: {
      name: "Lakshmi Sharma Care Circle",
      elderlyProfileId: profileLakshmi.id,
      createdById: priya.id
    }
  });
  await prisma.careCircleMember.createMany({
    data: [
      {
        careCircleId: circleLakshmi.id,
        userId: priya.id,
        role: "ADMIN",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_MANAGE_APPOINTMENTS", "CAN_RECEIVE_ESCALATIONS", "CAN_MANAGE_CIRCLE"]
      },
      {
        careCircleId: circleLakshmi.id,
        userId: lakshmiUser.id,
        role: "SENIOR",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS"]
      },
      {
        careCircleId: circleLakshmi.id,
        userId: anjali.id,
        role: "CARETAKER",
        permissions: ["CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_LOG_CARE_NOTES", "CAN_COMPLETE_TASKS", "CAN_RECEIVE_ESCALATIONS"]
      }
    ]
  });
  const circleMeera = await prisma.careCircle.create({
    data: {
      name: "Meera Sharma Care Circle",
      elderlyProfileId: profileMeera.id,
      createdById: priya.id
    }
  });
  await prisma.careCircleMember.createMany({
    data: [
      {
        careCircleId: circleMeera.id,
        userId: priya.id,
        role: "ADMIN",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_MANAGE_APPOINTMENTS", "CAN_RECEIVE_ESCALATIONS", "CAN_MANAGE_CIRCLE"]
      },
      {
        careCircleId: circleMeera.id,
        userId: meeraUser.id,
        role: "SENIOR",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS"]
      },
      {
        careCircleId: circleMeera.id,
        userId: anjali.id,
        role: "CARETAKER",
        permissions: ["CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_LOG_CARE_NOTES", "CAN_COMPLETE_TASKS", "CAN_RECEIVE_ESCALATIONS"]
      }
    ]
  });
  async function seedMed(profileId, medData) {
    return prisma.medication.create({
      data: {
        elderlyProfileId: profileId,
        name: medData.name,
        brandName: medData.brandName,
        genericName: medData.genericName,
        form: medData.form,
        strength: medData.strength,
        dosageInstructions: medData.dosageInstructions,
        prescribingDoctor: medData.prescribingDoctor,
        prescribingClinic: medData.prescribingClinic,
        rxNumber: medData.rxNumber,
        purpose: medData.purpose,
        stock: {
          create: {
            currentStock: medData.stock,
            unit: "tablets",
            refillThreshold: medData.refillThreshold,
            packageSize: 30,
            lastRefillDate: new Date(Date.now() - 15 * 864e5)
          }
        },
        schedules: {
          create: {
            frequency: "DAILY",
            timesOfDay: medData.times,
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            dosageQuantity: 1,
            instructions: medData.instructions
          }
        }
      },
      include: { schedules: true, stock: true }
    });
  }
  const elLisinopril = await seedMed(profileEleanor.id, {
    name: "Lisinopril",
    brandName: "Prinivil",
    genericName: "Lisinopril",
    form: "TABLET",
    strength: "10 mg",
    dosageInstructions: "Take 1 tablet every morning with a full glass of water.",
    prescribingDoctor: "Dr. Robert Chen",
    prescribingClinic: "Valley Heart & Vascular Center",
    rxNumber: "RX-448201",
    purpose: "Blood Pressure Regulation",
    stock: 24,
    refillThreshold: 7,
    times: ["08:00"],
    instructions: "Take with water before breakfast."
  });
  const elMetformin = await seedMed(profileEleanor.id, {
    name: "Metformin ER",
    brandName: "Glucophage XR",
    genericName: "Metformin Hydrochloride",
    form: "CAPSULE",
    strength: "500 mg",
    dosageInstructions: "Take 1 capsule twice daily with meals (morning and evening).",
    prescribingDoctor: "Dr. Maya Patel",
    prescribingClinic: "Metro Health Endocrinology",
    rxNumber: "RX-551028",
    purpose: "Glycemic Control & Insulin Sensitivity",
    stock: 42,
    refillThreshold: 14,
    times: ["08:00", "20:00"],
    instructions: "Take with food."
  });
  const elGlipizide = await seedMed(profileEleanor.id, {
    name: "Glipizide",
    brandName: "Glucotrol",
    genericName: "Glipizide",
    form: "TABLET",
    strength: "5 mg",
    dosageInstructions: "Take 1 tablet 30 minutes before morning breakfast.",
    prescribingDoctor: "Dr. Maya Patel",
    prescribingClinic: "Metro Health Endocrinology",
    rxNumber: "RX-551029",
    purpose: "Pancreatic Insulin Secretion Support",
    stock: 5,
    // Low stock alert!
    refillThreshold: 10,
    times: ["08:00"],
    instructions: "Take 30 minutes before first meal."
  });
  const rameshAmlodipine = await seedMed(profileRamesh.id, {
    name: "Amlodipine Besylate",
    brandName: "Norvasc",
    genericName: "Amlodipine",
    form: "TABLET",
    strength: "5 mg",
    dosageInstructions: "Take 1 tablet in the morning after breakfast.",
    prescribingDoctor: "Dr. Arvind Menon",
    prescribingClinic: "Apex Cardiology Center",
    rxNumber: "RX-772001",
    purpose: "Hypertension & Arterial Health",
    stock: 22,
    refillThreshold: 8,
    times: ["08:30"],
    instructions: "Take with morning water."
  });
  const rameshMetformin = await seedMed(profileRamesh.id, {
    name: "Metformin Hydrochloride",
    brandName: "Glycomet",
    genericName: "Metformin",
    form: "TABLET",
    strength: "500 mg",
    dosageInstructions: "Take 1 tablet twice daily after major meals.",
    prescribingDoctor: "Dr. Arvind Menon",
    prescribingClinic: "Apex Cardiology Center",
    rxNumber: "RX-772002",
    purpose: "Type 2 Diabetes Glycemic Control",
    stock: 35,
    refillThreshold: 12,
    times: ["08:30", "20:30"],
    instructions: "Take post meal."
  });
  const rameshAtorvastatin = await seedMed(profileRamesh.id, {
    name: "Atorvastatin Calcium",
    brandName: "Lipitor",
    genericName: "Atorvastatin",
    form: "TABLET",
    strength: "20 mg",
    dosageInstructions: "Take 1 tablet at bedtime.",
    prescribingDoctor: "Dr. Arvind Menon",
    prescribingClinic: "Apex Cardiology Center",
    rxNumber: "RX-772003",
    purpose: "Lipid Panel & Cholesterol Management",
    stock: 6,
    // Low stock demo!
    refillThreshold: 10,
    times: ["21:00"],
    instructions: "Take at bedtime with water."
  });
  const sureshLosartan = await seedMed(profileSuresh.id, {
    name: "Losartan Potassium",
    brandName: "Cozaar",
    genericName: "Losartan",
    form: "TABLET",
    strength: "50 mg",
    dosageInstructions: "Take 1 tablet each morning.",
    prescribingDoctor: "Dr. Sunita Gupta",
    prescribingClinic: "Metro City Nephrology",
    rxNumber: "RX-884001",
    purpose: "Blood Pressure & Renal Support",
    stock: 26,
    refillThreshold: 7,
    times: ["09:00"],
    instructions: "Take with water in the morning."
  });
  const sureshPantoprazole = await seedMed(profileSuresh.id, {
    name: "Pantoprazole Gastro-Resistant",
    brandName: "Protonix",
    genericName: "Pantoprazole",
    form: "TABLET",
    strength: "40 mg",
    dosageInstructions: "Take 1 tablet 30 minutes before morning meal.",
    prescribingDoctor: "Dr. Sunita Gupta",
    prescribingClinic: "Metro City Nephrology",
    rxNumber: "RX-884002",
    purpose: "Gastric Acid Reduction & Reflux Prevention",
    stock: 18,
    refillThreshold: 8,
    times: ["08:00"],
    instructions: "Take on an empty stomach."
  });
  const lakshmiThyroid = await seedMed(profileLakshmi.id, {
    name: "Levothyroxine Sodium",
    brandName: "Synthroid",
    genericName: "Levothyroxine",
    form: "TABLET",
    strength: "50 mcg",
    dosageInstructions: "Take 1 tablet immediately upon waking, 30 minutes before any food or tea.",
    prescribingDoctor: "Dr. Radhika Sen",
    prescribingClinic: "CareFirst Endocrinology",
    rxNumber: "RX-991001",
    purpose: "Thyroid Hormone Replacement",
    stock: 28,
    refillThreshold: 10,
    times: ["07:00"],
    instructions: "Strictly empty stomach."
  });
  const lakshmiTelmisartan = await seedMed(profileLakshmi.id, {
    name: "Telmisartan",
    brandName: "Micardis",
    genericName: "Telmisartan",
    form: "TABLET",
    strength: "40 mg",
    dosageInstructions: "Take 1 tablet daily with morning breakfast.",
    prescribingDoctor: "Dr. Radhika Sen",
    prescribingClinic: "CareFirst Endocrinology",
    rxNumber: "RX-991002",
    purpose: "Cardiovascular Protection & BP",
    stock: 25,
    refillThreshold: 7,
    times: ["09:00"],
    instructions: "Take with breakfast."
  });
  const meeraDonepezil = await seedMed(profileMeera.id, {
    name: "Donepezil Hydrochloride",
    brandName: "Aricept",
    genericName: "Donepezil",
    form: "TABLET",
    strength: "5 mg",
    dosageInstructions: "Take 1 tablet at bedtime with a light snack.",
    prescribingDoctor: "Dr. Rajesh Nair",
    prescribingClinic: "Senior Memory & Neuro Care",
    rxNumber: "RX-663001",
    purpose: "Cognitive Function & Memory Support",
    stock: 20,
    refillThreshold: 7,
    times: ["21:00"],
    instructions: "Take right before sleep."
  });
  const now = /* @__PURE__ */ new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  async function generateDoseHistory(profileId, med, confirmedByUser, caretakerUser) {
    for (let i = 4; i >= 1; i--) {
      const pastDay = new Date(today);
      pastDay.setDate(pastDay.getDate() - i);
      const scheduledTime = new Date(pastDay);
      scheduledTime.setHours(8, 30, 0, 0);
      await prisma.scheduledDose.create({
        data: {
          medicationId: med.id,
          scheduleId: med.schedules[0].id,
          elderlyProfileId: profileId,
          scheduledAt: scheduledTime,
          status: "TAKEN",
          confirmedAt: new Date(scheduledTime.getTime() + 15 * 6e4),
          confirmedById: confirmedByUser.id,
          confirmationNotes: "Dose verified and taken with water.",
          idempotencyKey: `dose-${med.id}-${scheduledTime.toISOString()}`
        }
      });
    }
    const todayMorning = new Date(today);
    todayMorning.setHours(8, 30, 0, 0);
    await prisma.scheduledDose.create({
      data: {
        medicationId: med.id,
        scheduleId: med.schedules[0].id,
        elderlyProfileId: profileId,
        scheduledAt: todayMorning,
        status: "TAKEN",
        confirmedAt: new Date(todayMorning.getTime() + 10 * 6e4),
        confirmedById: caretakerUser.id,
        confirmationNotes: `Administered & confirmed by Caretaker ${caretakerUser.name}`,
        idempotencyKey: `dose-${med.id}-${todayMorning.toISOString()}`
      }
    });
    const todayEvening = new Date(today);
    todayEvening.setHours(20, 30, 0, 0);
    await prisma.scheduledDose.create({
      data: {
        medicationId: med.id,
        scheduleId: med.schedules[0].id,
        elderlyProfileId: profileId,
        scheduledAt: todayEvening,
        status: "SCHEDULED",
        idempotencyKey: `dose-${med.id}-${todayEvening.toISOString()}`
      }
    });
  }
  await generateDoseHistory(profileEleanor.id, elLisinopril, eleanor, marcus);
  await generateDoseHistory(profileEleanor.id, elMetformin, eleanor, marcus);
  await generateDoseHistory(profileRamesh.id, rameshAmlodipine, rameshUser, rahul);
  await generateDoseHistory(profileRamesh.id, rameshMetformin, rameshUser, rahul);
  await generateDoseHistory(profileSuresh.id, sureshLosartan, sureshUser, rahul);
  await generateDoseHistory(profileLakshmi.id, lakshmiTelmisartan, lakshmiUser, anjali);
  await generateDoseHistory(profileMeera.id, meeraDonepezil, meeraUser, anjali);
  async function seedVitals(profileId, author, vitalsList) {
    for (const v of vitalsList) {
      const createdAt = new Date(Date.now() - v.daysAgo * 864e5);
      await prisma.careNote.create({
        data: {
          elderlyProfileId: profileId,
          authorId: author.id,
          category: "HEALTH_UPDATE",
          title: v.title,
          content: v.content,
          createdAt,
          vitalSigns: {
            bloodPressure: v.bp,
            systolic: v.systolic,
            diastolic: v.diastolic,
            heartRate: v.hr,
            bloodGlucose: v.glucose,
            temperature: v.temp,
            oxygenSaturation: v.spo2
          }
        }
      });
    }
  }
  await seedVitals(profileEleanor.id, marcus, [
    {
      daysAgo: 0,
      title: "Morning Shift Vitals & Wellness Check",
      content: "Eleanor is alert, cheerful, and had an appetite for breakfast oatmeal. BP well controlled.",
      bp: "124/82",
      systolic: 124,
      diastolic: 82,
      hr: 72,
      glucose: 114,
      temp: 98.4,
      spo2: 98
    },
    {
      daysAgo: 1,
      title: "Afternoon Telemetry Check",
      content: "Post-lunch mobility walk around the patio completed with steady gait. Hydration logged.",
      bp: "128/84",
      systolic: 128,
      diastolic: 84,
      hr: 76,
      glucose: 132,
      temp: 98.6,
      spo2: 97
    }
  ]);
  await seedVitals(profileRamesh.id, rahul, [
    {
      daysAgo: 0,
      title: "Morning Clinical Assessment - Ramesh",
      content: "Ramesh completed his 20-minute morning garden walk. Blood pressure steady on Amlodipine.",
      bp: "122/80",
      systolic: 122,
      diastolic: 80,
      hr: 70,
      glucose: 112,
      temp: 98.2,
      spo2: 99
    },
    {
      daysAgo: 2,
      title: "Routine Shift Check - Blood Glucose & Vitals",
      content: "Fasting glucose within ideal range. No dizziness or peripheral edema noted.",
      bp: "126/82",
      systolic: 126,
      diastolic: 82,
      hr: 74,
      glucose: 108,
      temp: 98.4,
      spo2: 98
    }
  ]);
  await seedVitals(profileSuresh.id, rahul, [
    {
      daysAgo: 0,
      title: "Joint Mobility & Vitals Review - Suresh",
      content: "Assisted with knee range-of-motion exercises. Heart rate regular, breathing unlabored.",
      bp: "128/84",
      systolic: 128,
      diastolic: 84,
      hr: 75,
      glucose: 106,
      temp: 98.5,
      spo2: 98
    }
  ]);
  await seedVitals(profileLakshmi.id, anjali, [
    {
      daysAgo: 0,
      title: "Morning Endocrine Vitals - Lakshmi",
      content: "Thyroid medication taken on empty stomach at 7:00 AM. Excellent vital signs.",
      bp: "118/76",
      systolic: 118,
      diastolic: 76,
      hr: 68,
      glucose: 96,
      temp: 98.1,
      spo2: 99
    }
  ]);
  await seedVitals(profileMeera.id, anjali, [
    {
      daysAgo: 0,
      title: "Cognitive Orientation & Comfort Log - Meera",
      content: "Oriented to family and date. Enjoys listening to classical ragas. Stable vitals.",
      bp: "120/78",
      systolic: 120,
      diastolic: 78,
      hr: 72,
      glucose: 104,
      temp: 98.3,
      spo2: 98
    }
  ]);
  const apptDates = [3, 7, 14, 21];
  await prisma.appointment.create({
    data: {
      elderlyProfileId: profileEleanor.id,
      title: "Cardiology Follow-Up",
      doctorName: "Dr. Robert Chen",
      specialty: "Cardiology",
      clinicName: "Valley Heart & Vascular Center",
      locationAddress: "Suite 400",
      appointmentDate: new Date(Date.now() + apptDates[0] * 864e5),
      notes: "6-Month Hypertension & Echocardiogram Follow-Up",
      createdById: sarah.id,
      status: "UPCOMING"
    }
  });
  await prisma.appointment.create({
    data: {
      elderlyProfileId: profileRamesh.id,
      title: "Cardiac Review & Holter Monitoring",
      doctorName: "Dr. Arvind Menon",
      specialty: "Cardiology",
      clinicName: "Apex Cardiology Center",
      locationAddress: "2nd Floor, Main Wing",
      appointmentDate: new Date(Date.now() + apptDates[1] * 864e5),
      notes: "Annual Cardiac Holter & Blood Pressure Review",
      createdById: amit.id,
      status: "UPCOMING"
    }
  });
  await prisma.appointment.create({
    data: {
      elderlyProfileId: profileSuresh.id,
      title: "Nephrology & Renal Function Review",
      doctorName: "Dr. Sunita Gupta",
      specialty: "Nephrology & Renal Care",
      clinicName: "Metro City Specialty Hospital",
      locationAddress: "Room 102",
      appointmentDate: new Date(Date.now() + apptDates[2] * 864e5),
      notes: "Kidney Function & Electrolyte Panel Monitoring",
      createdById: amit.id,
      status: "UPCOMING"
    }
  });
  await prisma.appointment.create({
    data: {
      elderlyProfileId: profileLakshmi.id,
      title: "Endocrinology & Thyroid Panel Check",
      doctorName: "Dr. Radhika Sen",
      specialty: "Endocrinology",
      clinicName: "CareFirst Endocrine Clinic",
      locationAddress: "Suite 210",
      appointmentDate: new Date(Date.now() + apptDates[0] * 864e5),
      notes: "TSH / Free T4 Blood Panel Evaluation",
      createdById: priya.id,
      status: "UPCOMING"
    }
  });
  await prisma.appointment.create({
    data: {
      elderlyProfileId: profileMeera.id,
      title: "Geriatric Wellness & Cognitive Exam",
      doctorName: "Dr. Rajesh Nair",
      specialty: "Geriatric Neurology",
      clinicName: "Senior Memory & Neuro Care Center",
      locationAddress: "Building B",
      appointmentDate: new Date(Date.now() + apptDates[3] * 864e5),
      notes: "Annual Mini-Mental State Exam & Wellness Consultation",
      createdById: priya.id,
      status: "UPCOMING"
    }
  });
  const tomorrow = new Date(Date.now() + 864e5);
  await prisma.careTask.create({
    data: {
      elderlyProfileId: profileEleanor.id,
      assignedToId: marcus.id,
      title: "Morning Blood Pressure & Pulse Reading",
      description: "Log seated morning blood pressure before 9:00 AM dose.",
      dueDate: tomorrow,
      priority: "HIGH",
      status: "PENDING"
    }
  });
  await prisma.careTask.create({
    data: {
      elderlyProfileId: profileRamesh.id,
      assignedToId: rahul.id,
      title: "Check Fasting Glucose & Amlodipine Tolerance",
      description: "Measure fasting fingerstick blood sugar and monitor for pedal edema.",
      dueDate: tomorrow,
      priority: "HIGH",
      status: "PENDING"
    }
  });
  await prisma.careTask.create({
    data: {
      elderlyProfileId: profileSuresh.id,
      assignedToId: rahul.id,
      title: "Assist With 15-Minute Joint Mobility Routine",
      description: "Guide gentle leg stretches and log knee pain scale (1-10).",
      dueDate: tomorrow,
      priority: "MEDIUM",
      status: "PENDING"
    }
  });
  await prisma.careTask.create({
    data: {
      elderlyProfileId: profileLakshmi.id,
      assignedToId: anjali.id,
      title: "Verify 30-Minute Fasting After Levothyroxine",
      description: "Ensure patient waits 30 minutes before taking morning breakfast tea.",
      dueDate: tomorrow,
      priority: "URGENT",
      status: "PENDING"
    }
  });
  await prisma.careTask.create({
    data: {
      elderlyProfileId: profileMeera.id,
      assignedToId: anjali.id,
      title: "Afternoon Memory & Hydration Check-In",
      description: "Encourage 250ml warm water or chamomile tea with memory flashcards.",
      dueDate: tomorrow,
      priority: "MEDIUM",
      status: "PENDING"
    }
  });
  await prisma.notification.createMany({
    data: [
      {
        userId: sarah.id,
        elderlyProfileId: profileEleanor.id,
        type: "REFILL_ALERT",
        title: "Low Medication Stock: Glipizide 5mg",
        message: "Only 5 tablets remaining for Eleanor Vance. Refill threshold is 10 tablets.",
        deliveryStatus: "SENT",
        emailSent: true
      },
      {
        userId: amit.id,
        elderlyProfileId: profileRamesh.id,
        type: "REFILL_ALERT",
        title: "Low Medication Stock: Atorvastatin 20mg",
        message: "Only 6 tablets remaining for Ramesh Kumar. Please request pharmacy refill.",
        deliveryStatus: "SENT",
        emailSent: true
      },
      {
        userId: amit.id,
        elderlyProfileId: profileRamesh.id,
        type: "APPOINTMENT_REMINDER",
        title: "Upcoming Cardiology Appointment",
        message: "Dr. Arvind Menon scheduled in 7 days for Ramesh Kumar.",
        deliveryStatus: "SENT",
        emailSent: false
      }
    ]
  });
  await prisma.auditLog.createMany({
    data: [
      {
        elderlyProfileId: profileRamesh.id,
        careCircleId: circleRamesh.id,
        userId: amit.id,
        action: "CARE_CIRCLE_CREATED",
        entityType: "CareCircle",
        entityId: circleRamesh.id,
        details: { circleName: circleRamesh.name }
      },
      {
        elderlyProfileId: profileRamesh.id,
        careCircleId: circleRamesh.id,
        userId: rahul.id,
        action: "CARETAKER_ASSIGNED",
        entityType: "CareCircleMember",
        entityId: rahul.id,
        details: { caretakerName: rahul.name }
      },
      {
        elderlyProfileId: profileSuresh.id,
        careCircleId: circleSuresh.id,
        userId: amit.id,
        action: "CARE_CIRCLE_CREATED",
        entityType: "CareCircle",
        entityId: circleSuresh.id,
        details: { circleName: circleSuresh.name }
      }
    ]
  });
  await prisma.caretakerProfile.create({
    data: {
      userId: marcus.id,
      fullName: "Marcus Reed",
      professionalCategory: "Registered Nurse (RN)",
      qualification: "B.Sc. Nursing, Post-Grad Diploma in Geriatric Care",
      registrationNumber: "RN-894721-CA",
      issuingAuthority: "California Board of Registered Nursing",
      state: "California",
      documentFileName: "marcus_reed_nursing_license.pdf",
      documentFilePath: "storage/secure_documents/sample_nursing_license.pdf",
      documentMimeType: "application/pdf",
      documentFileSize: 245800,
      status: "APPROVED",
      reviewedById: admin.id,
      reviewedAt: nowVerified
    }
  });
  await prisma.caretakerProfile.create({
    data: {
      userId: rahul.id,
      fullName: "Rahul Verma",
      professionalCategory: "Registered Nurse (RN)",
      qualification: "B.Sc. Nursing",
      registrationNumber: "RN-552190-DL",
      issuingAuthority: "Delhi Nursing Council",
      state: "Delhi",
      documentFileName: "rahul_verma_rn_credential.pdf",
      documentFilePath: "storage/secure_documents/sample_nursing_license.pdf",
      documentMimeType: "application/pdf",
      documentFileSize: 198400,
      status: "APPROVED",
      reviewedById: admin.id,
      reviewedAt: nowVerified
    }
  });
  await prisma.caretakerProfile.create({
    data: {
      userId: anjali.id,
      fullName: "Anjali Rao",
      professionalCategory: "Certified Caregiver",
      qualification: "Advanced Certificate in Geriatric Patient Support",
      registrationNumber: "CG-410928-MH",
      issuingAuthority: "National Healthcare Caregiver Guild",
      state: "Maharashtra",
      documentFileName: "anjali_rao_caregiver_cert.pdf",
      documentFilePath: "storage/secure_documents/sample_caregiver_cert.pdf",
      documentMimeType: "application/pdf",
      documentFileSize: 182300,
      status: "PENDING"
      // Ready for Administrator review demonstration
    }
  });
  await prisma.patientAccessRequest.createMany({
    data: [
      {
        elderlyProfileId: profileEleanor.id,
        caretakerId: marcus.id,
        familyAdminId: sarah.id,
        status: "APPROVED",
        notes: "Assigned primary nurse for morning vitals and medication supervision.",
        respondedAt: nowVerified
      },
      {
        elderlyProfileId: profileRamesh.id,
        caretakerId: rahul.id,
        familyAdminId: amit.id,
        status: "APPROVED",
        notes: "Experienced geriatric nurse for daily BP and Lisinopril administration.",
        respondedAt: nowVerified
      },
      {
        elderlyProfileId: profileSuresh.id,
        caretakerId: rahul.id,
        familyAdminId: amit.id,
        status: "APPROVED",
        notes: "Post-stroke mobility support and Metformin schedule monitoring.",
        respondedAt: nowVerified
      },
      {
        elderlyProfileId: profileLakshmi.id,
        caretakerId: anjali.id,
        familyAdminId: priya.id,
        status: "PENDING",
        notes: "Certified caregiver offering morning medication check and vital logging."
      }
    ]
  });
  console.log("\u2705 CareNest database seeded successfully with all demo accounts and multi-patient profiles!");
}
if (process.env.VITEST !== "true") {
  main().catch((e) => {
    console.error("\u274C Seed error:", e);
    process.exit(1);
  }).finally(async () => {
    await prisma.$disconnect();
  });
}
export {
  main
};
