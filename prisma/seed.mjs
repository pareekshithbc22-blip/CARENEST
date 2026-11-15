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
  "inlineSchema": 'generator client {\n  provider = "prisma-client"\n  output   = "../generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\nenum UserRole {\n  SENIOR\n  FAMILY\n  CARETAKER\n  ADMIN\n}\n\nenum CircleRole {\n  ADMIN\n  FAMILY_MEMBER\n  CARETAKER\n  SENIOR\n}\n\nenum InvitationStatus {\n  PENDING\n  ACCEPTED\n  EXPIRED\n  REVOKED\n}\n\nenum DoseStatus {\n  SCHEDULED\n  TAKEN\n  MISSED\n  SKIPPED\n  UNCONFIRMED\n}\n\nenum ScheduleFrequency {\n  DAILY\n  SPECIFIC_DAYS\n  AS_NEEDED\n  WEEKLY\n}\n\nenum MedicationForm {\n  TABLET\n  CAPSULE\n  SYRUP\n  INJECTION\n  DROPS\n  INHALER\n  TOPICAL\n  OTHER\n}\n\nenum AppointmentStatus {\n  UPCOMING\n  COMPLETED\n  CANCELLED\n  RESCHEDULED\n}\n\nenum TaskPriority {\n  LOW\n  MEDIUM\n  HIGH\n  URGENT\n}\n\nenum TaskStatus {\n  PENDING\n  IN_PROGRESS\n  COMPLETED\n  CANCELLED\n}\n\nenum NoteCategory {\n  GENERAL\n  OBSERVATION\n  MOOD\n  HEALTH_UPDATE\n  HANDOVER\n  INCIDENT\n}\n\nenum NotificationType {\n  MEDICATION_REMINDER\n  MISSED_DOSE_ALERT\n  ESCALATION_WARNING\n  APPOINTMENT_REMINDER\n  CARE_TASK_ASSIGNED\n  REFILL_ALERT\n  SYSTEM\n}\n\nmodel User {\n  id              String    @id @default(uuid())\n  email           String    @unique\n  name            String\n  passwordHash    String\n  role            UserRole  @default(FAMILY)\n  phoneNumber     String?\n  avatarUrl       String?\n  isEmailVerified Boolean   @default(false)\n  emailVerified   DateTime?\n  isActive        Boolean   @default(true)\n  createdAt       DateTime  @default(now())\n  updatedAt       DateTime  @updatedAt\n\n  // Relationships\n  circleMemberships      CareCircleMember[]\n  createdCircles         CareCircle[]            @relation("CreatedCircles")\n  sentInvitations        CareCircleInvitation[]  @relation("SentInvitations")\n  elderlyProfilesCreated ElderlyProfile[]        @relation("CreatedProfiles")\n  confirmedDoses         ScheduledDose[]         @relation("ConfirmedBy")\n  assignedTasks          CareTask[]              @relation("AssignedTo")\n  completedTasks         CareTask[]              @relation("CompletedBy")\n  authoredNotes          CareNote[]              @relation("AuthoredNotes")\n  handoverNotesReceived  CareNote[]              @relation("HandoverTo")\n  createdAppointments    Appointment[]           @relation("CreatedAppointments")\n  notifications          Notification[]\n  notificationPref       NotificationPreference?\n  auditLogs              AuditLog[]\n\n  @@index([email])\n}\n\nmodel ElderlyProfile {\n  id                       String   @id @default(uuid())\n  name                     String\n  preferredName            String?\n  dateOfBirth              DateTime\n  gender                   String?\n  bloodGroup               String?\n  allergies                String[] @default([])\n  medicalConditions        String[] @default([])\n  emergencyContactName     String\n  emergencyContactPhone    String\n  emergencyContactRelation String?\n  notes                    String?\n  avatarUrl                String?\n  isSeniorModeActive       Boolean  @default(false)\n  seniorPin                String? // Hashed 4-digit PIN for rapid simplified senior check-in\n  createdById              String\n  createdBy                User     @relation("CreatedProfiles", fields: [createdById], references: [id], onDelete: Cascade)\n  createdAt                DateTime @default(now())\n  updatedAt                DateTime @updatedAt\n\n  careCircles    CareCircle[]\n  medications    Medication[]\n  scheduledDoses ScheduledDose[]\n  appointments   Appointment[]\n  careTasks      CareTask[]\n  careNotes      CareNote[]\n  auditLogs      AuditLog[]\n  notifications  Notification[]\n\n  @@index([createdById])\n}\n\nmodel CareCircle {\n  id               String         @id @default(uuid())\n  name             String\n  elderlyProfileId String\n  elderlyProfile   ElderlyProfile @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  createdById      String\n  createdBy        User           @relation("CreatedCircles", fields: [createdById], references: [id], onDelete: Cascade)\n  createdAt        DateTime       @default(now())\n  updatedAt        DateTime       @updatedAt\n\n  members     CareCircleMember[]\n  invitations CareCircleInvitation[]\n  auditLogs   AuditLog[]\n\n  @@index([elderlyProfileId])\n  @@index([createdById])\n}\n\nmodel CareCircleMember {\n  id           String     @id @default(uuid())\n  careCircleId String\n  careCircle   CareCircle @relation(fields: [careCircleId], references: [id], onDelete: Cascade)\n  userId       String\n  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)\n  role         CircleRole @default(FAMILY_MEMBER)\n  permissions  String[]   @default(["CAN_VIEW_RECORDS", "CAN_CONFIRM_DOSE"])\n  isActive     Boolean    @default(true)\n  joinedAt     DateTime   @default(now())\n  updatedAt    DateTime   @updatedAt\n\n  @@unique([careCircleId, userId])\n  @@index([careCircleId])\n  @@index([userId])\n}\n\nmodel CareCircleInvitation {\n  id           String           @id @default(uuid())\n  careCircleId String\n  careCircle   CareCircle       @relation(fields: [careCircleId], references: [id], onDelete: Cascade)\n  email        String\n  role         CircleRole       @default(FAMILY_MEMBER)\n  token        String           @unique\n  status       InvitationStatus @default(PENDING)\n  invitedById  String\n  invitedBy    User             @relation("SentInvitations", fields: [invitedById], references: [id], onDelete: Cascade)\n  expiresAt    DateTime\n  acceptedAt   DateTime?\n  createdAt    DateTime         @default(now())\n  updatedAt    DateTime         @updatedAt\n\n  @@index([token])\n  @@index([email])\n  @@index([careCircleId])\n}\n\nmodel Medication {\n  id                 String         @id @default(uuid())\n  elderlyProfileId   String\n  elderlyProfile     ElderlyProfile @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  name               String\n  brandName          String?\n  genericName        String?\n  form               MedicationForm @default(TABLET)\n  strength           String // e.g. "500 mg", "10 ml"\n  dosageInstructions String // e.g. "Take 1 tablet after food with water"\n  prescribingDoctor  String?\n  prescribingClinic  String?\n  rxNumber           String?\n  purpose            String? // e.g. "Hypertension", "Type 2 Diabetes"\n  isArchived         Boolean        @default(false)\n  discontinuedReason String?\n  createdAt          DateTime       @default(now())\n  updatedAt          DateTime       @updatedAt\n\n  schedules      MedicationSchedule[]\n  scheduledDoses ScheduledDose[]\n  stock          MedicationStock?\n\n  @@index([elderlyProfileId])\n  @@index([isArchived])\n}\n\nmodel MedicationSchedule {\n  id             String            @id @default(uuid())\n  medicationId   String\n  medication     Medication        @relation(fields: [medicationId], references: [id], onDelete: Cascade)\n  frequency      ScheduleFrequency @default(DAILY)\n  timesOfDay     String[] // e.g. ["08:00", "20:00"]\n  daysOfWeek     Int[]             @default([0, 1, 2, 3, 4, 5, 6]) // 0=Sunday\n  startDate      DateTime          @default(now())\n  endDate        DateTime?\n  dosageQuantity Float             @default(1.0)\n  instructions   String?\n  isActive       Boolean           @default(true)\n  createdAt      DateTime          @default(now())\n  updatedAt      DateTime          @updatedAt\n\n  scheduledDoses ScheduledDose[]\n\n  @@index([medicationId])\n}\n\nmodel ScheduledDose {\n  id                 String              @id @default(uuid())\n  medicationId       String\n  medication         Medication          @relation(fields: [medicationId], references: [id], onDelete: Cascade)\n  scheduleId         String?\n  schedule           MedicationSchedule? @relation(fields: [scheduleId], references: [id], onDelete: SetNull)\n  elderlyProfileId   String\n  elderlyProfile     ElderlyProfile      @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  scheduledAt        DateTime\n  status             DoseStatus          @default(SCHEDULED)\n  confirmedAt        DateTime?\n  confirmedById      String?\n  confirmedBy        User?               @relation("ConfirmedBy", fields: [confirmedById], references: [id], onDelete: SetNull)\n  confirmationNotes  String?\n  gracePeriodMinutes Int                 @default(45)\n  escalationLevel    Int                 @default(0) // 0: None, 1: Caretaker notified, 2: Family escalation\n  escalatedAt        DateTime?\n  idempotencyKey     String?             @unique\n  createdAt          DateTime            @default(now())\n  updatedAt          DateTime            @updatedAt\n\n  @@index([elderlyProfileId, scheduledAt])\n  @@index([status, scheduledAt])\n  @@index([medicationId])\n}\n\nmodel MedicationStock {\n  id              String     @id @default(uuid())\n  medicationId    String     @unique\n  medication      Medication @relation(fields: [medicationId], references: [id], onDelete: Cascade)\n  currentStock    Float      @default(0)\n  unit            String     @default("tablets") // tablets, capsules, ml, sprays\n  refillThreshold Float      @default(10)\n  packageSize     Float?\n  lastRefillDate  DateTime?\n  notes           String?\n  createdAt       DateTime   @default(now())\n  updatedAt       DateTime   @updatedAt\n\n  @@index([medicationId])\n}\n\nmodel Appointment {\n  id                    String            @id @default(uuid())\n  elderlyProfileId      String\n  elderlyProfile        ElderlyProfile    @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  title                 String\n  doctorName            String\n  specialty             String?\n  clinicName            String\n  locationAddress       String?\n  appointmentDate       DateTime\n  status                AppointmentStatus @default(UPCOMING)\n  reminderMinutesBefore Int               @default(1440) // 24 hours\n  reminderSent          Boolean           @default(false)\n  notes                 String?\n  outcomeSummary        String?\n  createdById           String\n  createdBy             User              @relation("CreatedAppointments", fields: [createdById], references: [id], onDelete: Cascade)\n  createdAt             DateTime          @default(now())\n  updatedAt             DateTime          @updatedAt\n\n  @@index([elderlyProfileId, appointmentDate])\n  @@index([status])\n}\n\nmodel CareTask {\n  id               String         @id @default(uuid())\n  elderlyProfileId String\n  elderlyProfile   ElderlyProfile @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  assignedToId     String?\n  assignedTo       User?          @relation("AssignedTo", fields: [assignedToId], references: [id], onDelete: SetNull)\n  title            String\n  description      String?\n  dueDate          DateTime\n  priority         TaskPriority   @default(MEDIUM)\n  status           TaskStatus     @default(PENDING)\n  completedAt      DateTime?\n  completedById    String?\n  completedBy      User?          @relation("CompletedBy", fields: [completedById], references: [id], onDelete: SetNull)\n  notes            String?\n  createdAt        DateTime       @default(now())\n  updatedAt        DateTime       @updatedAt\n\n  @@index([elderlyProfileId, dueDate])\n  @@index([assignedToId, status])\n}\n\nmodel CareNote {\n  id                String         @id @default(uuid())\n  elderlyProfileId  String\n  elderlyProfile    ElderlyProfile @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  authorId          String\n  author            User           @relation("AuthoredNotes", fields: [authorId], references: [id], onDelete: Cascade)\n  category          NoteCategory   @default(GENERAL)\n  title             String\n  content           String\n  vitalSigns        Json? // { bp: "120/80", pulse: 72, sugar: 110, temp: 98.6 }\n  isPinned          Boolean        @default(false)\n  shiftHandoverToId String?\n  shiftHandoverTo   User?          @relation("HandoverTo", fields: [shiftHandoverToId], references: [id], onDelete: SetNull)\n  createdAt         DateTime       @default(now())\n  updatedAt         DateTime       @updatedAt\n\n  @@index([elderlyProfileId, createdAt])\n  @@index([category])\n}\n\nmodel Notification {\n  id               String           @id @default(uuid())\n  userId           String\n  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)\n  elderlyProfileId String?\n  elderlyProfile   ElderlyProfile?  @relation(fields: [elderlyProfileId], references: [id], onDelete: SetNull)\n  type             NotificationType\n  title            String\n  message          String\n  data             Json?\n  isRead           Boolean          @default(false)\n  readAt           DateTime?\n  deliveryStatus   String           @default("SENT") // SENT, FAILED\n  emailSent        Boolean          @default(false)\n  createdAt        DateTime         @default(now())\n\n  @@index([userId, isRead])\n  @@index([createdAt])\n}\n\nmodel NotificationPreference {\n  id                   String   @id @default(uuid())\n  userId               String   @unique\n  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  emailReminders       Boolean  @default(true)\n  missedDoseAlerts     Boolean  @default(true)\n  escalationAlerts     Boolean  @default(true)\n  appointmentReminders Boolean  @default(true)\n  dailySummaryEmail    Boolean  @default(false)\n  gracePeriodMinutes   Int      @default(45)\n  updatedAt            DateTime @updatedAt\n}\n\nmodel AuditLog {\n  id               String          @id @default(uuid())\n  elderlyProfileId String?\n  elderlyProfile   ElderlyProfile? @relation(fields: [elderlyProfileId], references: [id], onDelete: SetNull)\n  careCircleId     String?\n  careCircle       CareCircle?     @relation(fields: [careCircleId], references: [id], onDelete: SetNull)\n  userId           String?\n  user             User?           @relation(fields: [userId], references: [id], onDelete: SetNull)\n  action           String // e.g. DOSE_CONFIRMED, MEDICATION_CREATED, ACCESS_REVOKED\n  entityType       String // Dose, Medication, CareCircle, Member\n  entityId         String?\n  details          Json?\n  ipAddress        String?\n  createdAt        DateTime        @default(now())\n\n  @@index([elderlyProfileId, createdAt])\n  @@index([action])\n}\n\nmodel EmailVerificationOtp {\n  id         String   @id @default(uuid())\n  email      String   @unique\n  hashedOtp  String\n  expiresAt  DateTime\n  attempts   Int      @default(0)\n  lastSentAt DateTime @default(now())\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n\n  @@index([email])\n}\n',
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
config.runtimeDataModel = JSON.parse('{"models":{"User":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"passwordHash","kind":"scalar","type":"String"},{"name":"role","kind":"enum","type":"UserRole"},{"name":"phoneNumber","kind":"scalar","type":"String"},{"name":"avatarUrl","kind":"scalar","type":"String"},{"name":"isEmailVerified","kind":"scalar","type":"Boolean"},{"name":"emailVerified","kind":"scalar","type":"DateTime"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"circleMemberships","kind":"object","type":"CareCircleMember","relationName":"CareCircleMemberToUser"},{"name":"createdCircles","kind":"object","type":"CareCircle","relationName":"CreatedCircles"},{"name":"sentInvitations","kind":"object","type":"CareCircleInvitation","relationName":"SentInvitations"},{"name":"elderlyProfilesCreated","kind":"object","type":"ElderlyProfile","relationName":"CreatedProfiles"},{"name":"confirmedDoses","kind":"object","type":"ScheduledDose","relationName":"ConfirmedBy"},{"name":"assignedTasks","kind":"object","type":"CareTask","relationName":"AssignedTo"},{"name":"completedTasks","kind":"object","type":"CareTask","relationName":"CompletedBy"},{"name":"authoredNotes","kind":"object","type":"CareNote","relationName":"AuthoredNotes"},{"name":"handoverNotesReceived","kind":"object","type":"CareNote","relationName":"HandoverTo"},{"name":"createdAppointments","kind":"object","type":"Appointment","relationName":"CreatedAppointments"},{"name":"notifications","kind":"object","type":"Notification","relationName":"NotificationToUser"},{"name":"notificationPref","kind":"object","type":"NotificationPreference","relationName":"NotificationPreferenceToUser"},{"name":"auditLogs","kind":"object","type":"AuditLog","relationName":"AuditLogToUser"}],"dbName":null,"schema":null},"ElderlyProfile":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"preferredName","kind":"scalar","type":"String"},{"name":"dateOfBirth","kind":"scalar","type":"DateTime"},{"name":"gender","kind":"scalar","type":"String"},{"name":"bloodGroup","kind":"scalar","type":"String"},{"name":"allergies","kind":"scalar","type":"String"},{"name":"medicalConditions","kind":"scalar","type":"String"},{"name":"emergencyContactName","kind":"scalar","type":"String"},{"name":"emergencyContactPhone","kind":"scalar","type":"String"},{"name":"emergencyContactRelation","kind":"scalar","type":"String"},{"name":"notes","kind":"scalar","type":"String"},{"name":"avatarUrl","kind":"scalar","type":"String"},{"name":"isSeniorModeActive","kind":"scalar","type":"Boolean"},{"name":"seniorPin","kind":"scalar","type":"String"},{"name":"createdById","kind":"scalar","type":"String"},{"name":"createdBy","kind":"object","type":"User","relationName":"CreatedProfiles"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"careCircles","kind":"object","type":"CareCircle","relationName":"CareCircleToElderlyProfile"},{"name":"medications","kind":"object","type":"Medication","relationName":"ElderlyProfileToMedication"},{"name":"scheduledDoses","kind":"object","type":"ScheduledDose","relationName":"ElderlyProfileToScheduledDose"},{"name":"appointments","kind":"object","type":"Appointment","relationName":"AppointmentToElderlyProfile"},{"name":"careTasks","kind":"object","type":"CareTask","relationName":"CareTaskToElderlyProfile"},{"name":"careNotes","kind":"object","type":"CareNote","relationName":"CareNoteToElderlyProfile"},{"name":"auditLogs","kind":"object","type":"AuditLog","relationName":"AuditLogToElderlyProfile"},{"name":"notifications","kind":"object","type":"Notification","relationName":"ElderlyProfileToNotification"}],"dbName":null,"schema":null},"CareCircle":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"CareCircleToElderlyProfile"},{"name":"createdById","kind":"scalar","type":"String"},{"name":"createdBy","kind":"object","type":"User","relationName":"CreatedCircles"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"members","kind":"object","type":"CareCircleMember","relationName":"CareCircleToCareCircleMember"},{"name":"invitations","kind":"object","type":"CareCircleInvitation","relationName":"CareCircleToCareCircleInvitation"},{"name":"auditLogs","kind":"object","type":"AuditLog","relationName":"AuditLogToCareCircle"}],"dbName":null,"schema":null},"CareCircleMember":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"careCircleId","kind":"scalar","type":"String"},{"name":"careCircle","kind":"object","type":"CareCircle","relationName":"CareCircleToCareCircleMember"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"CareCircleMemberToUser"},{"name":"role","kind":"enum","type":"CircleRole"},{"name":"permissions","kind":"scalar","type":"String"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"joinedAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"CareCircleInvitation":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"careCircleId","kind":"scalar","type":"String"},{"name":"careCircle","kind":"object","type":"CareCircle","relationName":"CareCircleToCareCircleInvitation"},{"name":"email","kind":"scalar","type":"String"},{"name":"role","kind":"enum","type":"CircleRole"},{"name":"token","kind":"scalar","type":"String"},{"name":"status","kind":"enum","type":"InvitationStatus"},{"name":"invitedById","kind":"scalar","type":"String"},{"name":"invitedBy","kind":"object","type":"User","relationName":"SentInvitations"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"acceptedAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"Medication":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"ElderlyProfileToMedication"},{"name":"name","kind":"scalar","type":"String"},{"name":"brandName","kind":"scalar","type":"String"},{"name":"genericName","kind":"scalar","type":"String"},{"name":"form","kind":"enum","type":"MedicationForm"},{"name":"strength","kind":"scalar","type":"String"},{"name":"dosageInstructions","kind":"scalar","type":"String"},{"name":"prescribingDoctor","kind":"scalar","type":"String"},{"name":"prescribingClinic","kind":"scalar","type":"String"},{"name":"rxNumber","kind":"scalar","type":"String"},{"name":"purpose","kind":"scalar","type":"String"},{"name":"isArchived","kind":"scalar","type":"Boolean"},{"name":"discontinuedReason","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"schedules","kind":"object","type":"MedicationSchedule","relationName":"MedicationToMedicationSchedule"},{"name":"scheduledDoses","kind":"object","type":"ScheduledDose","relationName":"MedicationToScheduledDose"},{"name":"stock","kind":"object","type":"MedicationStock","relationName":"MedicationToMedicationStock"}],"dbName":null,"schema":null},"MedicationSchedule":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"medicationId","kind":"scalar","type":"String"},{"name":"medication","kind":"object","type":"Medication","relationName":"MedicationToMedicationSchedule"},{"name":"frequency","kind":"enum","type":"ScheduleFrequency"},{"name":"timesOfDay","kind":"scalar","type":"String"},{"name":"daysOfWeek","kind":"scalar","type":"Int"},{"name":"startDate","kind":"scalar","type":"DateTime"},{"name":"endDate","kind":"scalar","type":"DateTime"},{"name":"dosageQuantity","kind":"scalar","type":"Float"},{"name":"instructions","kind":"scalar","type":"String"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"scheduledDoses","kind":"object","type":"ScheduledDose","relationName":"MedicationScheduleToScheduledDose"}],"dbName":null,"schema":null},"ScheduledDose":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"medicationId","kind":"scalar","type":"String"},{"name":"medication","kind":"object","type":"Medication","relationName":"MedicationToScheduledDose"},{"name":"scheduleId","kind":"scalar","type":"String"},{"name":"schedule","kind":"object","type":"MedicationSchedule","relationName":"MedicationScheduleToScheduledDose"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"ElderlyProfileToScheduledDose"},{"name":"scheduledAt","kind":"scalar","type":"DateTime"},{"name":"status","kind":"enum","type":"DoseStatus"},{"name":"confirmedAt","kind":"scalar","type":"DateTime"},{"name":"confirmedById","kind":"scalar","type":"String"},{"name":"confirmedBy","kind":"object","type":"User","relationName":"ConfirmedBy"},{"name":"confirmationNotes","kind":"scalar","type":"String"},{"name":"gracePeriodMinutes","kind":"scalar","type":"Int"},{"name":"escalationLevel","kind":"scalar","type":"Int"},{"name":"escalatedAt","kind":"scalar","type":"DateTime"},{"name":"idempotencyKey","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"MedicationStock":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"medicationId","kind":"scalar","type":"String"},{"name":"medication","kind":"object","type":"Medication","relationName":"MedicationToMedicationStock"},{"name":"currentStock","kind":"scalar","type":"Float"},{"name":"unit","kind":"scalar","type":"String"},{"name":"refillThreshold","kind":"scalar","type":"Float"},{"name":"packageSize","kind":"scalar","type":"Float"},{"name":"lastRefillDate","kind":"scalar","type":"DateTime"},{"name":"notes","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"Appointment":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"AppointmentToElderlyProfile"},{"name":"title","kind":"scalar","type":"String"},{"name":"doctorName","kind":"scalar","type":"String"},{"name":"specialty","kind":"scalar","type":"String"},{"name":"clinicName","kind":"scalar","type":"String"},{"name":"locationAddress","kind":"scalar","type":"String"},{"name":"appointmentDate","kind":"scalar","type":"DateTime"},{"name":"status","kind":"enum","type":"AppointmentStatus"},{"name":"reminderMinutesBefore","kind":"scalar","type":"Int"},{"name":"reminderSent","kind":"scalar","type":"Boolean"},{"name":"notes","kind":"scalar","type":"String"},{"name":"outcomeSummary","kind":"scalar","type":"String"},{"name":"createdById","kind":"scalar","type":"String"},{"name":"createdBy","kind":"object","type":"User","relationName":"CreatedAppointments"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"CareTask":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"CareTaskToElderlyProfile"},{"name":"assignedToId","kind":"scalar","type":"String"},{"name":"assignedTo","kind":"object","type":"User","relationName":"AssignedTo"},{"name":"title","kind":"scalar","type":"String"},{"name":"description","kind":"scalar","type":"String"},{"name":"dueDate","kind":"scalar","type":"DateTime"},{"name":"priority","kind":"enum","type":"TaskPriority"},{"name":"status","kind":"enum","type":"TaskStatus"},{"name":"completedAt","kind":"scalar","type":"DateTime"},{"name":"completedById","kind":"scalar","type":"String"},{"name":"completedBy","kind":"object","type":"User","relationName":"CompletedBy"},{"name":"notes","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"CareNote":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"CareNoteToElderlyProfile"},{"name":"authorId","kind":"scalar","type":"String"},{"name":"author","kind":"object","type":"User","relationName":"AuthoredNotes"},{"name":"category","kind":"enum","type":"NoteCategory"},{"name":"title","kind":"scalar","type":"String"},{"name":"content","kind":"scalar","type":"String"},{"name":"vitalSigns","kind":"scalar","type":"Json"},{"name":"isPinned","kind":"scalar","type":"Boolean"},{"name":"shiftHandoverToId","kind":"scalar","type":"String"},{"name":"shiftHandoverTo","kind":"object","type":"User","relationName":"HandoverTo"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"Notification":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"NotificationToUser"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"ElderlyProfileToNotification"},{"name":"type","kind":"enum","type":"NotificationType"},{"name":"title","kind":"scalar","type":"String"},{"name":"message","kind":"scalar","type":"String"},{"name":"data","kind":"scalar","type":"Json"},{"name":"isRead","kind":"scalar","type":"Boolean"},{"name":"readAt","kind":"scalar","type":"DateTime"},{"name":"deliveryStatus","kind":"scalar","type":"String"},{"name":"emailSent","kind":"scalar","type":"Boolean"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"NotificationPreference":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"NotificationPreferenceToUser"},{"name":"emailReminders","kind":"scalar","type":"Boolean"},{"name":"missedDoseAlerts","kind":"scalar","type":"Boolean"},{"name":"escalationAlerts","kind":"scalar","type":"Boolean"},{"name":"appointmentReminders","kind":"scalar","type":"Boolean"},{"name":"dailySummaryEmail","kind":"scalar","type":"Boolean"},{"name":"gracePeriodMinutes","kind":"scalar","type":"Int"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"AuditLog":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"AuditLogToElderlyProfile"},{"name":"careCircleId","kind":"scalar","type":"String"},{"name":"careCircle","kind":"object","type":"CareCircle","relationName":"AuditLogToCareCircle"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"AuditLogToUser"},{"name":"action","kind":"scalar","type":"String"},{"name":"entityType","kind":"scalar","type":"String"},{"name":"entityId","kind":"scalar","type":"String"},{"name":"details","kind":"scalar","type":"Json"},{"name":"ipAddress","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"EmailVerificationOtp":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"hashedOtp","kind":"scalar","type":"String"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"attempts","kind":"scalar","type":"Int"},{"name":"lastSentAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null}},"enums":{},"types":{}}');
config.parameterizationSchema = {
  strings: JSON.parse('["where","orderBy","cursor","createdBy","careCircles","elderlyProfile","medication","schedule","confirmedBy","scheduledDoses","_count","schedules","stock","medications","appointments","assignedTo","completedBy","careTasks","author","shiftHandoverTo","careNotes","careCircle","user","auditLogs","notifications","members","invitedBy","invitations","circleMemberships","createdCircles","sentInvitations","elderlyProfilesCreated","confirmedDoses","assignedTasks","completedTasks","authoredNotes","handoverNotesReceived","createdAppointments","notificationPref","User.findUnique","User.findUniqueOrThrow","User.findFirst","User.findFirstOrThrow","User.findMany","data","User.createOne","User.createMany","User.createManyAndReturn","User.updateOne","User.updateMany","User.updateManyAndReturn","create","update","User.upsertOne","User.deleteOne","User.deleteMany","having","_min","_max","User.groupBy","User.aggregate","ElderlyProfile.findUnique","ElderlyProfile.findUniqueOrThrow","ElderlyProfile.findFirst","ElderlyProfile.findFirstOrThrow","ElderlyProfile.findMany","ElderlyProfile.createOne","ElderlyProfile.createMany","ElderlyProfile.createManyAndReturn","ElderlyProfile.updateOne","ElderlyProfile.updateMany","ElderlyProfile.updateManyAndReturn","ElderlyProfile.upsertOne","ElderlyProfile.deleteOne","ElderlyProfile.deleteMany","ElderlyProfile.groupBy","ElderlyProfile.aggregate","CareCircle.findUnique","CareCircle.findUniqueOrThrow","CareCircle.findFirst","CareCircle.findFirstOrThrow","CareCircle.findMany","CareCircle.createOne","CareCircle.createMany","CareCircle.createManyAndReturn","CareCircle.updateOne","CareCircle.updateMany","CareCircle.updateManyAndReturn","CareCircle.upsertOne","CareCircle.deleteOne","CareCircle.deleteMany","CareCircle.groupBy","CareCircle.aggregate","CareCircleMember.findUnique","CareCircleMember.findUniqueOrThrow","CareCircleMember.findFirst","CareCircleMember.findFirstOrThrow","CareCircleMember.findMany","CareCircleMember.createOne","CareCircleMember.createMany","CareCircleMember.createManyAndReturn","CareCircleMember.updateOne","CareCircleMember.updateMany","CareCircleMember.updateManyAndReturn","CareCircleMember.upsertOne","CareCircleMember.deleteOne","CareCircleMember.deleteMany","CareCircleMember.groupBy","CareCircleMember.aggregate","CareCircleInvitation.findUnique","CareCircleInvitation.findUniqueOrThrow","CareCircleInvitation.findFirst","CareCircleInvitation.findFirstOrThrow","CareCircleInvitation.findMany","CareCircleInvitation.createOne","CareCircleInvitation.createMany","CareCircleInvitation.createManyAndReturn","CareCircleInvitation.updateOne","CareCircleInvitation.updateMany","CareCircleInvitation.updateManyAndReturn","CareCircleInvitation.upsertOne","CareCircleInvitation.deleteOne","CareCircleInvitation.deleteMany","CareCircleInvitation.groupBy","CareCircleInvitation.aggregate","Medication.findUnique","Medication.findUniqueOrThrow","Medication.findFirst","Medication.findFirstOrThrow","Medication.findMany","Medication.createOne","Medication.createMany","Medication.createManyAndReturn","Medication.updateOne","Medication.updateMany","Medication.updateManyAndReturn","Medication.upsertOne","Medication.deleteOne","Medication.deleteMany","Medication.groupBy","Medication.aggregate","MedicationSchedule.findUnique","MedicationSchedule.findUniqueOrThrow","MedicationSchedule.findFirst","MedicationSchedule.findFirstOrThrow","MedicationSchedule.findMany","MedicationSchedule.createOne","MedicationSchedule.createMany","MedicationSchedule.createManyAndReturn","MedicationSchedule.updateOne","MedicationSchedule.updateMany","MedicationSchedule.updateManyAndReturn","MedicationSchedule.upsertOne","MedicationSchedule.deleteOne","MedicationSchedule.deleteMany","_avg","_sum","MedicationSchedule.groupBy","MedicationSchedule.aggregate","ScheduledDose.findUnique","ScheduledDose.findUniqueOrThrow","ScheduledDose.findFirst","ScheduledDose.findFirstOrThrow","ScheduledDose.findMany","ScheduledDose.createOne","ScheduledDose.createMany","ScheduledDose.createManyAndReturn","ScheduledDose.updateOne","ScheduledDose.updateMany","ScheduledDose.updateManyAndReturn","ScheduledDose.upsertOne","ScheduledDose.deleteOne","ScheduledDose.deleteMany","ScheduledDose.groupBy","ScheduledDose.aggregate","MedicationStock.findUnique","MedicationStock.findUniqueOrThrow","MedicationStock.findFirst","MedicationStock.findFirstOrThrow","MedicationStock.findMany","MedicationStock.createOne","MedicationStock.createMany","MedicationStock.createManyAndReturn","MedicationStock.updateOne","MedicationStock.updateMany","MedicationStock.updateManyAndReturn","MedicationStock.upsertOne","MedicationStock.deleteOne","MedicationStock.deleteMany","MedicationStock.groupBy","MedicationStock.aggregate","Appointment.findUnique","Appointment.findUniqueOrThrow","Appointment.findFirst","Appointment.findFirstOrThrow","Appointment.findMany","Appointment.createOne","Appointment.createMany","Appointment.createManyAndReturn","Appointment.updateOne","Appointment.updateMany","Appointment.updateManyAndReturn","Appointment.upsertOne","Appointment.deleteOne","Appointment.deleteMany","Appointment.groupBy","Appointment.aggregate","CareTask.findUnique","CareTask.findUniqueOrThrow","CareTask.findFirst","CareTask.findFirstOrThrow","CareTask.findMany","CareTask.createOne","CareTask.createMany","CareTask.createManyAndReturn","CareTask.updateOne","CareTask.updateMany","CareTask.updateManyAndReturn","CareTask.upsertOne","CareTask.deleteOne","CareTask.deleteMany","CareTask.groupBy","CareTask.aggregate","CareNote.findUnique","CareNote.findUniqueOrThrow","CareNote.findFirst","CareNote.findFirstOrThrow","CareNote.findMany","CareNote.createOne","CareNote.createMany","CareNote.createManyAndReturn","CareNote.updateOne","CareNote.updateMany","CareNote.updateManyAndReturn","CareNote.upsertOne","CareNote.deleteOne","CareNote.deleteMany","CareNote.groupBy","CareNote.aggregate","Notification.findUnique","Notification.findUniqueOrThrow","Notification.findFirst","Notification.findFirstOrThrow","Notification.findMany","Notification.createOne","Notification.createMany","Notification.createManyAndReturn","Notification.updateOne","Notification.updateMany","Notification.updateManyAndReturn","Notification.upsertOne","Notification.deleteOne","Notification.deleteMany","Notification.groupBy","Notification.aggregate","NotificationPreference.findUnique","NotificationPreference.findUniqueOrThrow","NotificationPreference.findFirst","NotificationPreference.findFirstOrThrow","NotificationPreference.findMany","NotificationPreference.createOne","NotificationPreference.createMany","NotificationPreference.createManyAndReturn","NotificationPreference.updateOne","NotificationPreference.updateMany","NotificationPreference.updateManyAndReturn","NotificationPreference.upsertOne","NotificationPreference.deleteOne","NotificationPreference.deleteMany","NotificationPreference.groupBy","NotificationPreference.aggregate","AuditLog.findUnique","AuditLog.findUniqueOrThrow","AuditLog.findFirst","AuditLog.findFirstOrThrow","AuditLog.findMany","AuditLog.createOne","AuditLog.createMany","AuditLog.createManyAndReturn","AuditLog.updateOne","AuditLog.updateMany","AuditLog.updateManyAndReturn","AuditLog.upsertOne","AuditLog.deleteOne","AuditLog.deleteMany","AuditLog.groupBy","AuditLog.aggregate","EmailVerificationOtp.findUnique","EmailVerificationOtp.findUniqueOrThrow","EmailVerificationOtp.findFirst","EmailVerificationOtp.findFirstOrThrow","EmailVerificationOtp.findMany","EmailVerificationOtp.createOne","EmailVerificationOtp.createMany","EmailVerificationOtp.createManyAndReturn","EmailVerificationOtp.updateOne","EmailVerificationOtp.updateMany","EmailVerificationOtp.updateManyAndReturn","EmailVerificationOtp.upsertOne","EmailVerificationOtp.deleteOne","EmailVerificationOtp.deleteMany","EmailVerificationOtp.groupBy","EmailVerificationOtp.aggregate","AND","OR","NOT","id","email","hashedOtp","expiresAt","attempts","lastSentAt","createdAt","updatedAt","equals","in","notIn","lt","lte","gt","gte","not","contains","startsWith","endsWith","elderlyProfileId","careCircleId","userId","action","entityType","entityId","details","ipAddress","string_contains","string_starts_with","string_ends_with","array_starts_with","array_ends_with","array_contains","emailReminders","missedDoseAlerts","escalationAlerts","appointmentReminders","dailySummaryEmail","gracePeriodMinutes","NotificationType","type","title","message","isRead","readAt","deliveryStatus","emailSent","authorId","NoteCategory","category","content","vitalSigns","isPinned","shiftHandoverToId","assignedToId","description","dueDate","TaskPriority","priority","TaskStatus","status","completedAt","completedById","notes","doctorName","specialty","clinicName","locationAddress","appointmentDate","AppointmentStatus","reminderMinutesBefore","reminderSent","outcomeSummary","createdById","medicationId","currentStock","unit","refillThreshold","packageSize","lastRefillDate","scheduleId","scheduledAt","DoseStatus","confirmedAt","confirmedById","confirmationNotes","escalationLevel","escalatedAt","idempotencyKey","ScheduleFrequency","frequency","timesOfDay","daysOfWeek","startDate","endDate","dosageQuantity","instructions","isActive","has","hasEvery","hasSome","name","brandName","genericName","MedicationForm","form","strength","dosageInstructions","prescribingDoctor","prescribingClinic","rxNumber","purpose","isArchived","discontinuedReason","CircleRole","role","token","InvitationStatus","invitedById","acceptedAt","permissions","joinedAt","preferredName","dateOfBirth","gender","bloodGroup","allergies","medicalConditions","emergencyContactName","emergencyContactPhone","emergencyContactRelation","avatarUrl","isSeniorModeActive","seniorPin","passwordHash","UserRole","phoneNumber","isEmailVerified","emailVerified","every","some","none","careCircleId_userId","is","isNot","connectOrCreate","upsert","createMany","set","disconnect","delete","connect","updateMany","deleteMany","push","increment","decrement","multiply","divide"]'),
  graph: "hQqSAYACHBcAAMQEACAYAADFBAAgHAAA2wQAIB0AAL4EACAeAADcBAAgHwAA3QQAICAAAMAEACAhAADCBAAgIgAAwgQAICMAAMMEACAkAADDBAAgJQAAwQQAICYAAN4EACCvAgAA2QQAMLACAAAYABCxAgAA2QQAMLICAQAAAAGzAgEAAAABuAJAAO8DACG5AkAA7wMAIZMDIAD9AwAhlwMBAO4DACGlAwAA2gS6AyK1AwEAnwQAIbgDAQDuAwAhugMBAJ8EACG7AyAA_QMAIbwDQACeBAAhAQAAAAEAIA0VAADJBAAgFgAA_gMAIK8CAADqBAAwsAIAAAMAELECAADqBAAwsgIBAO4DACG5AkAA7wMAIcYCAQDuAwAhxwIBAO4DACGTAyAA_QMAIaUDAADHBKUDIqoDAACnBAAgqwNAAO8DACECFQAA2wgAIBYAAIYFACAOFQAAyQQAIBYAAP4DACCvAgAA6gQAMLACAAADABCxAgAA6gQAMLICAQAAAAG5AkAA7wMAIcYCAQDuAwAhxwIBAO4DACGTAyAA_QMAIaUDAADHBKUDIqoDAACnBAAgqwNAAO8DACHAAwAA6QQAIAMAAAADACABAAAEADACAAAFACAOAwAA_gMAIAUAANMEACAXAADEBAAgGQAA2wQAIBsAANwEACCvAgAA6AQAMLACAAAHABCxAgAA6AQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIcUCAQDuAwAh-wIBAO4DACGXAwEA7gMAIQUDAACGBQAgBQAA3AgAIBcAANkIACAZAADPCAAgGwAA0QgAIA4DAAD-AwAgBQAA0wQAIBcAAMQEACAZAADbBAAgGwAA3AQAIK8CAADoBAAwsAIAAAcAELECAADoBAAwsgIBAAAAAbgCQADvAwAhuQJAAO8DACHFAgEA7gMAIfsCAQDuAwAhlwMBAO4DACEDAAAABwAgAQAACAAwAgAACQAgFwUAANMEACAJAADABAAgCwAA5gQAIAwAAOcEACCvAgAA5AQAMLACAAALABCxAgAA5AQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIcUCAQDuAwAhlwMBAO4DACGYAwEAnwQAIZkDAQCfBAAhmwMAAOUEmwMinAMBAO4DACGdAwEA7gMAIZ4DAQCfBAAhnwMBAJ8EACGgAwEAnwQAIaEDAQCfBAAhogMgAP0DACGjAwEAnwQAIQsFAADcCAAgCQAA0wgAIAsAAN4IACAMAADfCAAgmAMAAPMEACCZAwAA8wQAIJ4DAADzBAAgnwMAAPMEACCgAwAA8wQAIKEDAADzBAAgowMAAPMEACAXBQAA0wQAIAkAAMAEACALAADmBAAgDAAA5wQAIK8CAADkBAAwsAIAAAsAELECAADkBAAwsgIBAAAAAbgCQADvAwAhuQJAAO8DACHFAgEA7gMAIZcDAQDuAwAhmAMBAJ8EACGZAwEAnwQAIZsDAADlBJsDIpwDAQDuAwAhnQMBAO4DACGeAwEAnwQAIZ8DAQCfBAAhoAMBAJ8EACGhAwEAnwQAIaIDIAD9AwAhowMBAJ8EACEDAAAACwAgAQAADAAwAgAADQAgEQYAAKAEACAJAADABAAgrwIAAOIEADCwAgAADwAQsQIAAOIEADCyAgEA7gMAIbgCQADvAwAhuQJAAO8DACH8AgEA7gMAIYwDAADjBIwDIo0DAACnBAAgjgMAAKgEACCPA0AA7wMAIZADQACeBAAhkQMIAJwEACGSAwEAnwQAIZMDIAD9AwAhBAYAALgFACAJAADTCAAgkAMAAPMEACCSAwAA8wQAIBEGAACgBAAgCQAAwAQAIK8CAADiBAAwsAIAAA8AELECAADiBAAwsgIBAAAAAbgCQADvAwAhuQJAAO8DACH8AgEA7gMAIYwDAADjBIwDIo0DAACnBAAgjgMAAKgEACCPA0AA7wMAIZADQACeBAAhkQMIAJwEACGSAwEAnwQAIZMDIAD9AwAhAwAAAA8AIAEAABAAMAIAABEAIBYFAADTBAAgBgAAoAQAIAcAAOEEACAIAADQBAAgrwIAAN8EADCwAgAAEwAQsQIAAN8EADCyAgEA7gMAIbgCQADvAwAhuQJAAO8DACHFAgEA7gMAIdgCAgDwAwAh7gIAAOAEhQMi_AIBAO4DACGCAwEAnwQAIYMDQADvAwAhhQNAAJ4EACGGAwEAnwQAIYcDAQCfBAAhiAMCAPADACGJA0AAngQAIYoDAQCfBAAhCgUAANwIACAGAAC4BQAgBwAA3QgAIAgAAIYFACCCAwAA8wQAIIUDAADzBAAghgMAAPMEACCHAwAA8wQAIIkDAADzBAAgigMAAPMEACAWBQAA0wQAIAYAAKAEACAHAADhBAAgCAAA0AQAIK8CAADfBAAwsAIAABMAELECAADfBAAwsgIBAAAAAbgCQADvAwAhuQJAAO8DACHFAgEA7gMAIdgCAgDwAwAh7gIAAOAEhQMi_AIBAO4DACGCAwEAnwQAIYMDQADvAwAhhQNAAJ4EACGGAwEAnwQAIYcDAQCfBAAhiAMCAPADACGJA0AAngQAIYoDAQAAAAEDAAAAEwAgAQAAFAAwAgAAFQAgAQAAAA8AIBwXAADEBAAgGAAAxQQAIBwAANsEACAdAAC-BAAgHgAA3AQAIB8AAN0EACAgAADABAAgIQAAwgQAICIAAMIEACAjAADDBAAgJAAAwwQAICUAAMEEACAmAADeBAAgrwIAANkEADCwAgAAGAAQsQIAANkEADCyAgEA7gMAIbMCAQDuAwAhuAJAAO8DACG5AkAA7wMAIZMDIAD9AwAhlwMBAO4DACGlAwAA2gS6AyK1AwEAnwQAIbgDAQDuAwAhugMBAJ8EACG7AyAA_QMAIbwDQACeBAAhAQAAABgAIAEAAAATACADAAAAEwAgAQAAFAAwAgAAFQAgDgYAAKAEACCvAgAAmwQAMLACAAAcABCxAgAAmwQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIfECAQCfBAAh_AIBAO4DACH9AggAnAQAIf4CAQDuAwAh_wIIAJwEACGAAwgAnQQAIYEDQACeBAAhAQAAABwAIAEAAAAPACABAAAAEwAgAwAAABMAIAEAABQAMAIAABUAIBUDAAD-AwAgBQAA0wQAIK8CAADXBAAwsAIAACEAELECAADXBAAwsgIBAO4DACG4AkAA7wMAIbkCQADvAwAhxQIBAO4DACHbAgEA7gMAIe4CAADYBPgCIvECAQCfBAAh8gIBAO4DACHzAgEAnwQAIfQCAQDuAwAh9QIBAJ8EACH2AkAA7wMAIfgCAgDwAwAh-QIgAP0DACH6AgEAnwQAIfsCAQDuAwAhBgMAAIYFACAFAADcCAAg8QIAAPMEACDzAgAA8wQAIPUCAADzBAAg-gIAAPMEACAVAwAA_gMAIAUAANMEACCvAgAA1wQAMLACAAAhABCxAgAA1wQAMLICAQAAAAG4AkAA7wMAIbkCQADvAwAhxQIBAO4DACHbAgEA7gMAIe4CAADYBPgCIvECAQCfBAAh8gIBAO4DACHzAgEAnwQAIfQCAQDuAwAh9QIBAJ8EACH2AkAA7wMAIfgCAgDwAwAh-QIgAP0DACH6AgEAnwQAIfsCAQDuAwAhAwAAACEAIAEAACIAMAIAACMAIBMFAADTBAAgDwAA0AQAIBAAANAEACCvAgAA1AQAMLACAAAlABCxAgAA1AQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIcUCAQDuAwAh2wIBAO4DACHoAgEAnwQAIekCAQCfBAAh6gJAAO8DACHsAgAA1QTsAiLuAgAA1gTuAiLvAkAAngQAIfACAQCfBAAh8QIBAJ8EACEIBQAA3AgAIA8AAIYFACAQAACGBQAg6AIAAPMEACDpAgAA8wQAIO8CAADzBAAg8AIAAPMEACDxAgAA8wQAIBMFAADTBAAgDwAA0AQAIBAAANAEACCvAgAA1AQAMLACAAAlABCxAgAA1AQAMLICAQAAAAG4AkAA7wMAIbkCQADvAwAhxQIBAO4DACHbAgEA7gMAIegCAQCfBAAh6QIBAJ8EACHqAkAA7wMAIewCAADVBOwCIu4CAADWBO4CIu8CQACeBAAh8AIBAJ8EACHxAgEAnwQAIQMAAAAlACABAAAmADACAAAnACABAAAAGAAgAQAAABgAIBEFAADTBAAgEgAA_gMAIBMAANAEACCvAgAA0QQAMLACAAArABCxAgAA0QQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIcUCAQDuAwAh2wIBAO4DACHhAgEA7gMAIeMCAADSBOMCIuQCAQDuAwAh5QIAAMwEACDmAiAA_QMAIecCAQCfBAAhBQUAANwIACASAACGBQAgEwAAhgUAIOUCAADzBAAg5wIAAPMEACARBQAA0wQAIBIAAP4DACATAADQBAAgrwIAANEEADCwAgAAKwAQsQIAANEEADCyAgEAAAABuAJAAO8DACG5AkAA7wMAIcUCAQDuAwAh2wIBAO4DACHhAgEA7gMAIeMCAADSBOMCIuQCAQDuAwAh5QIAAMwEACDmAiAA_QMAIecCAQCfBAAhAwAAACsAIAEAACwAMAIAAC0AIAEAAAAYACAQBQAAzQQAIBUAAM8EACAWAADQBAAgrwIAAM4EADCwAgAAMAAQsQIAAM4EADCyAgEA7gMAIbgCQADvAwAhxQIBAJ8EACHGAgEAnwQAIccCAQCfBAAhyAIBAO4DACHJAgEA7gMAIcoCAQCfBAAhywIAAMwEACDMAgEAnwQAIQkFAADcCAAgFQAA2wgAIBYAAIYFACDFAgAA8wQAIMYCAADzBAAgxwIAAPMEACDKAgAA8wQAIMsCAADzBAAgzAIAAPMEACAQBQAAzQQAIBUAAM8EACAWAADQBAAgrwIAAM4EADCwAgAAMAAQsQIAAM4EADCyAgEAAAABuAJAAO8DACHFAgEAnwQAIcYCAQCfBAAhxwIBAJ8EACHIAgEA7gMAIckCAQDuAwAhygIBAJ8EACHLAgAAzAQAIMwCAQCfBAAhAwAAADAAIAEAADEAMAIAADIAIB4DAAD-AwAgBAAAvgQAIAkAAMAEACANAAC_BAAgDgAAwQQAIBEAAMIEACAUAADDBAAgFwAAxAQAIBgAAMUEACCvAgAAvQQAMLACAAA0ABCxAgAAvQQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIfECAQCfBAAh-wIBAO4DACGXAwEA7gMAIawDAQCfBAAhrQNAAO8DACGuAwEAnwQAIa8DAQCfBAAhsAMAAKcEACCxAwAApwQAILIDAQDuAwAhswMBAO4DACG0AwEAnwQAIbUDAQCfBAAhtgMgAP0DACG3AwEAnwQAIQEAAAA0ACABAAAABwAgAQAAABgAIBEFAADNBAAgFgAA_gMAICwAAMwEACCvAgAAygQAMLACAAA4ABCxAgAAygQAMLICAQDuAwAhuAJAAO8DACHFAgEAnwQAIccCAQDuAwAh2gIAAMsE2gIi2wIBAO4DACHcAgEA7gMAId0CIAD9AwAh3gJAAJ4EACHfAgEA7gMAIeACIAD9AwAhBQUAANwIACAWAACGBQAgLAAA8wQAIMUCAADzBAAg3gIAAPMEACARBQAAzQQAIBYAAP4DACAsAADMBAAgrwIAAMoEADCwAgAAOAAQsQIAAMoEADCyAgEAAAABuAJAAO8DACHFAgEAnwQAIccCAQDuAwAh2gIAAMsE2gIi2wIBAO4DACHcAgEA7gMAId0CIAD9AwAh3gJAAJ4EACHfAgEA7gMAIeACIAD9AwAhAwAAADgAIAEAADkAMAIAADoAIAEAAAA0ACABAAAABwAgAQAAAAsAIAEAAAATACABAAAAIQAgAQAAACUAIAEAAAArACABAAAAMAAgAQAAADgAIAMAAAADACABAAAEADACAAAFACAQFQAAyQQAIBoAAP4DACCvAgAAxgQAMLACAABGABCxAgAAxgQAMLICAQDuAwAhswIBAO4DACG1AkAA7wMAIbgCQADvAwAhuQJAAO8DACHGAgEA7gMAIe4CAADIBKgDIqUDAADHBKUDIqYDAQDuAwAhqAMBAO4DACGpA0AAngQAIQMVAADbCAAgGgAAhgUAIKkDAADzBAAgEBUAAMkEACAaAAD-AwAgrwIAAMYEADCwAgAARgAQsQIAAMYEADCyAgEAAAABswIBAO4DACG1AkAA7wMAIbgCQADvAwAhuQJAAO8DACHGAgEA7gMAIe4CAADIBKgDIqUDAADHBKUDIqYDAQAAAAGoAwEA7gMAIakDQACeBAAhAwAAAEYAIAEAAEcAMAIAAEgAIAMAAAAwACABAAAxADACAAAyACABAAAAAwAgAQAAAEYAIAEAAAAwACADAAAABwAgAQAACAAwAgAACQAgAwAAAEYAIAEAAEcAMAIAAEgAIBADAACGBQAgBAAA0AgAIAkAANMIACANAADaCAAgDgAA1ggAIBEAANQIACAUAADVCAAgFwAA2QgAIBgAANcIACDxAgAA8wQAIKwDAADzBAAgrgMAAPMEACCvAwAA8wQAILQDAADzBAAgtQMAAPMEACC3AwAA8wQAIB4DAAD-AwAgBAAAvgQAIAkAAMAEACANAAC_BAAgDgAAwQQAIBEAAMIEACAUAADDBAAgFwAAxAQAIBgAAMUEACCvAgAAvQQAMLACAAA0ABCxAgAAvQQAMLICAQAAAAG4AkAA7wMAIbkCQADvAwAh8QIBAJ8EACH7AgEA7gMAIZcDAQDuAwAhrAMBAJ8EACGtA0AA7wMAIa4DAQCfBAAhrwMBAJ8EACGwAwAApwQAILEDAACnBAAgsgMBAO4DACGzAwEA7gMAIbQDAQCfBAAhtQMBAJ8EACG2AyAA_QMAIbcDAQCfBAAhAwAAADQAIAEAAFAAMAIAAFEAIAMAAAATACABAAAUADACAAAVACADAAAAJQAgAQAAJgAwAgAAJwAgAwAAACUAIAEAACYAMAIAACcAIAMAAAArACABAAAsADACAAAtACADAAAAKwAgAQAALAAwAgAALQAgAwAAACEAIAEAACIAMAIAACMAIAMAAAA4ACABAAA5ADACAAA6ACANFgAA_gMAIK8CAAD8AwAwsAIAAFoAELECAAD8AwAwsgIBAO4DACG5AkAA7wMAIccCAQDuAwAh0wIgAP0DACHUAiAA_QMAIdUCIAD9AwAh1gIgAP0DACHXAiAA_QMAIdgCAgDwAwAhAQAAAFoAIAMAAAAwACABAAAxADACAAAyACABAAAAAwAgAQAAAAcAIAEAAABGACABAAAANAAgAQAAABMAIAEAAAAlACABAAAAJQAgAQAAACsAIAEAAAArACABAAAAIQAgAQAAADgAIAEAAAAwACABAAAAAQAgEBcAANkIACAYAADXCAAgHAAAzwgAIB0AANAIACAeAADRCAAgHwAA0ggAICAAANMIACAhAADUCAAgIgAA1AgAICMAANUIACAkAADVCAAgJQAA1ggAICYAANgIACC1AwAA8wQAILoDAADzBAAgvAMAAPMEACADAAAAGAAgAQAAagAwAgAAAQAgAwAAABgAIAEAAGoAMAIAAAEAIAMAAAAYACABAABqADACAAABACAZFwAAzggAIBgAAMwIACAcAADCCAAgHQAAwwgAIB4AAMQIACAfAADFCAAgIAAAxggAICEAAMcIACAiAADICAAgIwAAyQgAICQAAMoIACAlAADLCAAgJgAAzQgAILICAQAAAAGzAgEAAAABuAJAAAAAAbkCQAAAAAGTAyAAAAABlwMBAAAAAaUDAAAAugMCtQMBAAAAAbgDAQAAAAG6AwEAAAABuwMgAAAAAbwDQAAAAAEBLAAAbgAgDLICAQAAAAGzAgEAAAABuAJAAAAAAbkCQAAAAAGTAyAAAAABlwMBAAAAAaUDAAAAugMCtQMBAAAAAbgDAQAAAAG6AwEAAAABuwMgAAAAAbwDQAAAAAEBLAAAcAAwASwAAHAAMBkXAADNBwAgGAAAywcAIBwAAMEHACAdAADCBwAgHgAAwwcAIB8AAMQHACAgAADFBwAgIQAAxgcAICIAAMcHACAjAADIBwAgJAAAyQcAICUAAMoHACAmAADMBwAgsgIBAPAEACGzAgEA8AQAIbgCQADxBAAhuQJAAPEEACGTAyAAgwUAIZcDAQDwBAAhpQMAAMAHugMitQMBAPcEACG4AwEA8AQAIboDAQD3BAAhuwMgAIMFACG8A0AAiwUAIQIAAAABACAsAABzACAMsgIBAPAEACGzAgEA8AQAIbgCQADxBAAhuQJAAPEEACGTAyAAgwUAIZcDAQDwBAAhpQMAAMAHugMitQMBAPcEACG4AwEA8AQAIboDAQD3BAAhuwMgAIMFACG8A0AAiwUAIQIAAAAYACAsAAB1ACACAAAAGAAgLAAAdQAgAwAAAAEAIDMAAG4AIDQAAHMAIAEAAAABACABAAAAGAAgBgoAAL0HACA5AAC_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_AIBAAAAAYwDAAAAjAMCjQMAAN0FACCOAwAA3gUAII8DQAAAAAGQA0AAAAABkQMIAAAAAZIDAQAAAAGTAyAAAAABASwAAPIBACAMsgIBAAAAAbgCQAAAAAG5AkAAAAAB_AIBAAAAAYwDAAAAjAMCjQMAAN0FACCOAwAA3gUAII8DQAAAAAGQA0AAAAABkQMIAAAAAZIDAQAAAAGTAyAAAAABASwAAPQBADABLAAA9AEAMA4GAADPBQAgCQAA0AUAILICAQDwBAAhuAJAAPEEACG5AkAA8QQAIfwCAQDwBAAhjAMAAMwFjAMijQMAAM0FACCOAwAAzgUAII8DQADxBAAhkANAAIsFACGRAwgAtAUAIZIDAQD3BAAhkwMgAIMFACECAAAAEQAgLAAA9wEAIAyyAgEA8AQAIbgCQADxBAAhuQJAAPEEACH8AgEA8AQAIYwDAADMBYwDIo0DAADNBQAgjgMAAM4FACCPA0AA8QQAIZADQACLBQAhkQMIALQFACGSAwEA9wQAIZMDIACDBQAhAgAAAA8AICwAAPkBACACAAAADwAgLAAA-QEAIAMAAAARACAzAADyAQAgNAAA9wEAIAEAAAARACABAAAADwAgBwoAAMcFACA5AADKBQAgOgAAyQUAIJsBAADIBQAgnAEAAMsFACCQAwAA8wQAIJIDAADzBAAgD68CAAClBAAwsAIAAIACABCxAgAApQQAMLICAQDjAwAhuAJAAOQDACG5AkAA5AMAIfwCAQDjAwAhjAMAAKYEjAMijQMAAKcEACCOAwAAqAQAII8DQADkAwAhkANAAIEEACGRAwgAlgQAIZIDAQDyAwAhkwMgAPkDACEDAAAADwAgAQAA_wEAMDgAAIACACADAAAADwAgAQAAEAAwAgAAEQAgAQAAABUAIAEAAAAVACADAAAAEwAgAQAAFAAwAgAAFQAgAwAAABMAIAEAABQAMAIAABUAIAMAAAATACABAAAUADACAAAVACATBQAAxQUAIAYAAMMFACAHAADEBQAgCAAAxgUAILICAQAAAAG4AkAAAAABuQJAAAAAAcUCAQAAAAHYAgIAAAAB7gIAAACFAwL8AgEAAAABggMBAAAAAYMDQAAAAAGFA0AAAAABhgMBAAAAAYcDAQAAAAGIAwIAAAABiQNAAAAAAYoDAQAAAAEBLAAAiAIAIA-yAgEAAAABuAJAAAAAAbkCQAAAAAHFAgEAAAAB2AICAAAAAe4CAAAAhQMC_AIBAAAAAYIDAQAAAAGDA0AAAAABhQNAAAAAAYYDAQAAAAGHAwEAAAABiAMCAAAAAYkDQAAAAAGKAwEAAAABASwAAIoCADABLAAAigIAMAEAAAAPACABAAAAGAAgEwUAAMEFACAGAAC_BQAgBwAAwAUAIAgAAMIFACCyAgEA8AQAIbgCQADxBAAhuQJAAPEEACHFAgEA8AQAIdgCAgDyBAAh7gIAAL4FhQMi_AIBAPAEACGCAwEA9wQAIYMDQADxBAAhhQNAAIsFACGGAwEA9wQAIYcDAQD3BAAhiAMCAPIEACGJA0AAiwUAIYoDAQD3BAAhAgAAABUAICwAAI8CACAPsgIBAPAEACG4AkAA8QQAIbkCQADxBAAhxQIBAPAEACHYAgIA8gQAIe4CAAC-BYUDIvwCAQDwBAAhggMBAPcEACGDA0AA8QQAIYUDQACLBQAhhgMBAPcEACGHAwEA9wQAIYgDAgDyBAAhiQNAAIsFACGKAwEA9wQAIQIAAAATACAsAACRAgAgAgAAABMAICwAAJECACABAAAADwAgAQAAABgAIAMAAAAVACAzAACIAgAgNAAAjwIAIAEAAAAVACABAAAAEwAgCwoAALkFACA5AAC8BQAgOgAAuwUAIJsBAAC6BQAgnAEAAL0FACCCAwAA8wQAIIUDAADzBAAghgMAAPMEACCHAwAA8wQAIIkDAADzBAAgigMAAPMEACASrwIAAKEEADCwAgAAmgIAELECAAChBAAwsgIBAOMDACG4AkAA5AMAIbkCQADkAwAhxQIBAOMDACHYAgIA5QMAIe4CAACiBIUDIvwCAQDjAwAhggMBAPIDACGDA0AA5AMAIYUDQACBBAAhhgMBAPIDACGHAwEA8gMAIYgDAgDlAwAhiQNAAIEEACGKAwEA8gMAIQMAAAATACABAACZAgAwOAAAmgIAIAMAAAATACABAAAUADACAAAVACAOBgAAoAQAIK8CAACbBAAwsAIAABwAELECAACbBAAwsgIBAAAAAbgCQADvAwAhuQJAAO8DACHxAgEAnwQAIfwCAQAAAAH9AggAnAQAIf4CAQDuAwAh_wIIAJwEACGAAwgAnQQAIYEDQACeBAAhAQAAAJ0CACABAAAAnQIAIAQGAAC4BQAg8QIAAPMEACCAAwAA8wQAIIEDAADzBAAgAwAAABwAIAEAAKACADACAACdAgAgAwAAABwAIAEAAKACADACAACdAgAgAwAAABwAIAEAAKACADACAACdAgAgCwYAALcFACCyAgEAAAABuAJAAAAAAbkCQAAAAAHxAgEAAAAB_AIBAAAAAf0CCAAAAAH-AgEAAAAB_wIIAAAAAYADCAAAAAGBA0AAAAABASwAAKQCACAKsgIBAAAAAbgCQAAAAAG5AkAAAAAB8QIBAAAAAfwCAQAAAAH9AggAAAAB_gIBAAAAAf8CCAAAAAGAAwgAAAABgQNAAAAAAQEsAACmAgAwASwAAKYCADALBgAAtgUAILICAQDwBAAhuAJAAPEEACG5AkAA8QQAIfECAQD3BAAh_AIBAPAEACH9AggAtAUAIf4CAQDwBAAh_wIIALQFACGAAwgAtQUAIYEDQACLBQAhAgAAAJ0CACAsAACpAgAgCrICAQDwBAAhuAJAAPEEACG5AkAA8QQAIfECAQD3BAAh_AIBAPAEACH9AggAtAUAIf4CAQDwBAAh_wIIALQFACGAAwgAtQUAIYEDQACLBQAhAgAAABwAICwAAKsCACACAAAAHAAgLAAAqwIAIAMAAACdAgAgMwAApAIAIDQAAKkCACABAAAAnQIAIAEAAAAcACAICgAArwUAIDkAALIFACA6AACxBQAgmwEAALAFACCcAQAAswUAIPECAADzBAAggAMAAPMEACCBAwAA8wQAIA2vAgAAlQQAMLACAACyAgAQsQIAAJUEADCyAgEA4wMAIbgCQADkAwAhuQJAAOQDACHxAgEA8gMAIfwCAQDjAwAh_QIIAJYEACH-AgEA4wMAIf8CCACWBAAhgAMIAJcEACGBA0AAgQQAIQMAAAAcACABAACxAgAwOAAAsgIAIAMAAAAcACABAACgAgAwAgAAnQIAIAEAAAAjACABAAAAIwAgAwAAACEAIAEAACIAMAIAACMAIAMAAAAhACABAAAiADACAAAjACADAAAAIQAgAQAAIgAwAgAAIwAgEgMAAK4FACAFAACtBQAgsgIBAAAAAbgCQAAAAAG5AkAAAAABxQIBAAAAAdsCAQAAAAHuAgAAAPgCAvECAQAAAAHyAgEAAAAB8wIBAAAAAfQCAQAAAAH1AgEAAAAB9gJAAAAAAfgCAgAAAAH5AiAAAAAB-gIBAAAAAfsCAQAAAAEBLAAAugIAIBCyAgEAAAABuAJAAAAAAbkCQAAAAAHFAgEAAAAB2wIBAAAAAe4CAAAA-AIC8QIBAAAAAfICAQAAAAHzAgEAAAAB9AIBAAAAAfUCAQAAAAH2AkAAAAAB-AICAAAAAfkCIAAAAAH6AgEAAAAB-wIBAAAAAQEsAAC8AgAwASwAALwCADASAwAArAUAIAUAAKsFACCyAgEA8AQAIbgCQADxBAAhuQJAAPEEACHFAgEA8AQAIdsCAQDwBAAh7gIAAKoF-AIi8QIBAPcEACHyAgEA8AQAIfMCAQD3BAAh9AIBAPAEACH1AgEA9wQAIfYCQADxBAAh-AICAPIEACH5AiAAgwUAIfoCAQD3BAAh-wIBAPAEACECAAAAIwAgLAAAvwIAIBCyAgEA8AQAIbgCQADxBAAhuQJAAPEEACHFAgEA8AQAIdsCAQDwBAAh7gIAAKoF-AIi8QIBAPcEACHyAgEA8AQAIfMCAQD3BAAh9AIBAPAEACH1AgEA9wQAIfYCQADxBAAh-AICAPIEACH5AiAAgwUAIfoCAQD3BAAh-wIBAPAEACECAAAAIQAgLAAAwQIAIAIAAAAhACAsAADBAgAgAwAAACMAIDMAALoCACA0AAC_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_wMAMLACAACSAwAQsQIAAP8DADCyAgEA4wMAIbgCQADkAwAhxQIBAPIDACHHAgEA4wMAIdoCAACABNoCItsCAQDjAwAh3AIBAOMDACHdAiAA-QMAId4CQACBBAAh3wIBAOMDACHgAiAA-QMAIQMAAAA4ACABAACRAwAwOAAAkgMAIAMAAAA4ACABAAA5ADACAAA6ACANFgAA_gMAIK8CAAD8AwAwsAIAAFoAELECAAD8AwAwsgIBAAAAAbkCQADvAwAhxwIBAAAAAdMCIAD9AwAh1AIgAP0DACHVAiAA_QMAIdYCIAD9AwAh1wIgAP0DACHYAgIA8AMAIQEAAACVAwAgAQAAAJUDACABFgAAhgUAIAMAAABaACABAACYAwAwAgAAlQMAIAMAAABaACABAACYAwAwAgAAlQMAIAMAAABaACABAACYAwAwAgAAlQMAIAoWAACFBQAgsgIBAAAAAbkCQAAAAAHHAgEAAAAB0wIgAAAAAdQCIAAAAAHVAiAAAAAB1gIgAAAAAdcCIAAAAAHYAgIAAAABASwAAJwDACAJsgIBAAAAAbkCQAAAAAHHAgEAAAAB0wIgAAAAAdQCIAAAAAHVAiAAAAAB1gIgAAAAAdcCIAAAAAHYAgIAAAABASwAAJ4DADABLAAAngMAMAoWAACEBQAgsgIBAPAEACG5AkAA8QQAIccCAQDwBAAh0wIgAIMFACHUAiAAgwUAIdUCIACDBQAh1gIgAIMFACHXAiAAgwUAIdgCAgDyBAAhAgAAAJUDACAsAAChAwAgCbICAQDwBAAhuQJAAPEEACHHAgEA8AQAIdMCIACDBQAh1AIgAIMFACHVAiAAgwUAIdYCIACDBQAh1wIgAIMFACHYAgIA8gQAIQIAAABaACAsAACjAwAgAgAAAFoAICwAAKMDACADAAAAlQMAIDMAAJwDACA0AAChAwAgAQAAAJUDACABAAAAWgAgBQoAAP4EACA5AACBBQAgOgAAgAUAIJsBAAD_BAAgnAEAAIIFACAMrwIAAPgDADCwAgAAqgMAELECAAD4AwAwsgIBAOMDACG5AkAA5AMAIccCAQDjAwAh0wIgAPkDACHUAiAA-QMAIdUCIAD5AwAh1gIgAPkDACHXAiAA-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_AgEAAAABwAIBAAAAAcECAQDrAwAhwgIBAAAAAcMCAQAAAAHEAgEAAAABCwoAAOcDACA5AADqAwAgOgAA6gMAILoCQAAAAAG7AkAAAAAEvAJAAAAABL0CQAAAAAG-AkAAAAABvwJAAAAAAcACQAAAAAHBAkAA6QMAIQ0KAADnAwAgOQAA5wMAIDoAAOcDACCbAQAA6AMAIJwBAADnAwAgugICAAAAAbsCAgAAAAS8AgIAAAAEvQICAAAAAb4CAgAAAAG_AgIAAAABwAICAAAAAcECAgDmAwAhDQoAAOcDACA5AADnAwAgOgAA5wMAIJsBAADoAwAgnAEAAOcDACC6AgIAAAABuwICAAAABLwCAgAAAAS9AgIAAAABvgICAAAAAb8CAgAAAAHAAgIAAAABwQICAOYDACEIugICAAAAAbsCAgAAAAS8AgIAAAAEvQICAAAAAb4CAgAAAAG_AgIAAAABwAICAAAAAcECAgDnAwAhCLoCCAAAAAG7AggAAAAEvAIIAAAABL0CCAAAAAG-AggAAAABvwIIAAAAAcACCAAAAAHBAggA6AMAIQsKAADnAwAgOQAA6gMAIDoAAOoDACC6AkAAAAABuwJAAAAABLwCQAAAAAS9AkAAAAABvgJAAAAAAb8CQAAAAAHAAkAAAAABwQJAAOkDACEIugJAAAAAAbsCQAAAAAS8AkAAAAAEvQJAAAAAAb4CQAAAAAG_AkAAAAABwAJAAAAAAcECQADqAwAhDgoAAOcDACA5AADsAwAgOgAA7AMAILoCAQAAAAG7AgEAAAAEvAIBAAAABL0CAQAAAAG-AgEAAAABvwIBAAAAAcACAQAAAAHBAgEA6wMAIcICAQAAAAHDAgEAAAABxAIBAAAAAQu6AgEAAAABuwIBAAAABLwCAQAAAAS9AgEAAAABvgIBAAAAAb8CAQAAAAHAAgEAAAABwQIBAOwDACHCAgEAAAABwwIBAAAAAcQCAQAAAAELrwIAAO0DADCwAgAAzAMAELECAADtAwAwsgIBAO4DACGzAgEA7gMAIbQCAQDuAwAhtQJAAO8DACG2AgIA8AMAIbcCQADvAwAhuAJAAO8DACG5AkAA7wMAIQu6AgEAAAABuwIBAAAABLwCAQAAAAS9AgEAAAABvgIBAAAAAb8CAQAAAAHAAgEAAAABwQIBAOwDACHCAgEAAAABwwIBAAAAAcQCAQAAAAEIugJAAAAAAbsCQAAAAAS8AkAAAAAEvQJAAAAAAb4CQAAAAAG_AkAAAAABwAJAAAAAAcECQADqAwAhCLoCAgAAAAG7AgIAAAAEvAICAAAABL0CAgAAAAG-AgIAAAABvwICAAAAAcACAgAAAAHBAgIA5wMAIQ2vAgAA8QMAMLACAADGAwAQsQIAAPEDADCyAgEA4wMAIbgCQADkAwAhxQIBAPIDACHGAgEA8gMAIccCAQDyAwAhyAIBAOMDACHJAgEA4wMAIcoCAQDyAwAhywIAAPMDACDMAgEA8gMAIQ4KAAD0AwAgOQAA9wMAIDoAAPcDACC6AgEAAAABuwIBAAAABbwCAQAAAAW9AgEAAAABvgIBAAAAAb8CAQAAAAHAAgEAAAABwQIBAPYDACHCAgEAAAABwwIBAAAAAcQCAQAAAAEPCgAA9AMAIDkAAPUDACA6AAD1AwAgugKAAAAAAb0CgAAAAAG-AoAAAAABvwKAAAAAAcACgAAAAAHBAoAAAAABzQIBAAAAAc4CAQAAAAHPAgEAAAAB0AKAAAAAAdECgAAAAAHSAoAAAAABCLoCAgAAAAG7AgIAAAAFvAICAAAABb0CAgAAAAG-AgIAAAABvwICAAAAAcACAgAAAAHBAgIA9AMAIQy6AoAAAAABvQKAAAAAAb4CgAAAAAG_AoAAAAABwAKAAAAAAcECgAAAAAHNAgEAAAABzgIBAAAAAc8CAQAAAAHQAoAAAAAB0QKAAAAAAdICgAAAAAEOCgAA9AMAIDkAAPcDACA6AAD3AwAgugIBAAAAAbsCAQAAAAW8AgEAAAAFvQIBAAAAAb4CAQAAAAG_AgEAAAABwAIBAAAAAcECAQD2AwAhwgIBAAAAAcMCAQAAAAHEAgEAAAABC7oCAQAAAAG7AgEAAAAFvAIBAAAABb0CAQAAAAG-AgEAAAABvwIBAAAAAcACAQAAAAHBAgEA9wMAIcICAQAAAAHDAgEAAAABxAIBAAAAAQyvAgAA-AMAMLACAACqAwAQsQIAAPgDADCyAgEA4wMAIbkCQADkAwAhxwIBAOMDACHTAiAA-QMAIdQCIAD5AwAh1QIgAPkDACHWAiAA-QMAIdcCIAD5AwAh2AICAOUDACEFCgAA5wMAIDkAAPsDACA6AAD7AwAgugIgAAAAAcECIAD6AwAhBQoAAOcDACA5AAD7AwAgOgAA-wMAILoCIAAAAAHBAiAA-gMAIQK6AiAAAAABwQIgAPsDACENFgAA_gMAIK8CAAD8AwAwsAIAAFoAELECAAD8AwAwsgIBAO4DACG5AkAA7wMAIccCAQDuAwAh0wIgAP0DACHUAiAA_QMAIdUCIAD9AwAh1gIgAP0DACHXAiAA_QMAIdgCAgDwAwAhAroCIAAAAAHBAiAA-wMAIR4XAADEBAAgGAAAxQQAIBwAANsEACAdAAC-BAAgHgAA3AQAIB8AAN0EACAgAADABAAgIQAAwgQAICIAAMIEACAjAADDBAAgJAAAwwQAICUAAMEEACAmAADeBAAgrwIAANkEADCwAgAAGAAQsQIAANkEADCyAgEA7gMAIbMCAQDuAwAhuAJAAO8DACG5AkAA7wMAIZMDIAD9AwAhlwMBAO4DACGlAwAA2gS6AyK1AwEAnwQAIbgDAQDuAwAhugMBAJ8EACG7AyAA_QMAIbwDQACeBAAhwQMAABgAIMIDAAAYACAPLAAA8wMAIK8CAAD_AwAwsAIAAJIDABCxAgAA_wMAMLICAQDjAwAhuAJAAOQDACHFAgEA8gMAIccCAQDjAwAh2gIAAIAE2gIi2wIBAOMDACHcAgEA4wMAId0CIAD5AwAh3gJAAIEEACHfAgEA4wMAIeACIAD5AwAhBwoAAOcDACA5AACFBAAgOgAAhQQAILoCAAAA2gICuwIAAADaAgi8AgAAANoCCMECAACEBNoCIgsKAAD0AwAgOQAAgwQAIDoAAIMEACC6AkAAAAABuwJAAAAABbwCQAAAAAW9AkAAAAABvgJAAAAAAb8CQAAAAAHAAkAAAAABwQJAAIIEACELCgAA9AMAIDkAAIMEACA6AACDBAAgugJAAAAAAbsCQAAAAAW8AkAAAAAFvQJAAAAAAb4CQAAAAAG_AkAAAAABwAJAAAAAAcECQACCBAAhCLoCQAAAAAG7AkAAAAAFvAJAAAAABb0CQAAAAAG-AkAAAAABvwJAAAAAAcACQAAAAAHBAkAAgwQAIQcKAADnAwAgOQAAhQQAIDoAAIUEACC6AgAAANoCArsCAAAA2gIIvAIAAADaAgjBAgAAhATaAiIEugIAAADaAgK7AgAAANoCCLwCAAAA2gIIwQIAAIUE2gIiDq8CAACGBAAwsAIAAPoCABCxAgAAhgQAMLICAQDjAwAhuAJAAOQDACG5AkAA5AMAIcUCAQDjAwAh2wIBAOMDACHhAgEA4wMAIeMCAACHBOMCIuQCAQDjAwAh5QIAAPMDACDmAiAA-QMAIecCAQDyAwAhBwoAAOcDACA5AACJBAAgOgAAiQQAILoCAAAA4wICuwIAAADjAgi8AgAAAOMCCMECAACIBOMCIgcKAADnAwAgOQAAiQQAIDoAAIkEACC6AgAAAOMCArsCAAAA4wIIvAIAAADjAgjBAgAAiATjAiIEugIAAADjAgK7AgAAAOMCCLwCAAAA4wIIwQIAAIkE4wIiEK8CAACKBAAwsAIAAOICABCxAgAAigQAMLICAQDjAwAhuAJAAOQDACG5AkAA5AMAIcUCAQDjAwAh2wIBAOMDACHoAgEA8gMAIekCAQDyAwAh6gJAAOQDACHsAgAAiwTsAiLuAgAAjATuAiLvAkAAgQQAIfACAQDyAwAh8QIBAPIDACEHCgAA5wMAIDkAAJAEACA6AACQBAAgugIAAADsAgK7AgAAAOwCCLwCAAAA7AIIwQIAAI8E7AIiBwoAAOcDACA5AACOBAAgOgAAjgQAILoCAAAA7gICuwIAAADuAgi8AgAAAO4CCMECAACNBO4CIgcKAADnAwAgOQAAjgQAIDoAAI4EACC6AgAAAO4CArsCAAAA7gIIvAIAAADuAgjBAgAAjQTuAiIEugIAAADuAgK7AgAAAO4CCLwCAAAA7gIIwQIAAI4E7gIiBwoAAOcDACA5AACQBAAgOgAAkAQAILoCAAAA7AICuwIAAADsAgi8AgAAAOwCCMECAACPBOwCIgS6AgAAAOwCArsCAAAA7AIIvAIAAADsAgjBAgAAkATsAiITrwIAAJEEADCwAgAAyAIAELECAACRBAAwsgIBAOMDACG4AkAA5AMAIbkCQADkAwAhxQIBAOMDACHbAgEA4wMAIe4CAACSBPgCIvECAQDyAwAh8gIBAOMDACHzAgEA8gMAIfQCAQDjAwAh9QIBAPIDACH2AkAA5AMAIfgCAgDlAwAh-QIgAPkDACH6AgEA8gMAIfsCAQDjAwAhBwoAAOcDACA5AACUBAAgOgAAlAQAILoCAAAA-AICuwIAAAD4Agi8AgAAAPgCCMECAACTBPgCIgcKAADnAwAgOQAAlAQAIDoAAJQEACC6AgAAAPgCArsCAAAA-AIIvAIAAAD4AgjBAgAAkwT4AiIEugIAAAD4AgK7AgAAAPgCCLwCAAAA-AIIwQIAAJQE-AIiDa8CAACVBAAwsAIAALICABCxAgAAlQQAMLICAQDjAwAhuAJAAOQDACG5AkAA5AMAIfECAQDyAwAh_AIBAOMDACH9AggAlgQAIf4CAQDjAwAh_wIIAJYEACGAAwgAlwQAIYEDQACBBAAhDQoAAOcDACA5AADoAwAgOgAA6AMAIJsBAADoAwAgnAEAAOgDACC6AggAAAABuwIIAAAABLwCCAAAAAS9AggAAAABvgIIAAAAAb8CCAAAAAHAAggAAAABwQIIAJoEACENCgAA9AMAIDkAAJkEACA6AACZBAAgmwEAAJkEACCcAQAAmQQAILoCCAAAAAG7AggAAAAFvAIIAAAABb0CCAAAAAG-AggAAAABvwIIAAAAAcACCAAAAAHBAggAmAQAIQ0KAAD0AwAgOQAAmQQAIDoAAJkEACCbAQAAmQQAIJwBAACZBAAgugIIAAAAAbsCCAAAAAW8AggAAAAFvQIIAAAAAb4CCAAAAAG_AggAAAABwAIIAAAAAcECCACYBAAhCLoCCAAAAAG7AggAAAAFvAIIAAAABb0CCAAAAAG-AggAAAABvwIIAAAAAcACCAAAAAHBAggAmQQAIQ0KAADnAwAgOQAA6AMAIDoAAOgDACCbAQAA6AMAIJwBAADoAwAgugIIAAAAAbsCCAAAAAS8AggAAAAEvQIIAAAAAb4CCAAAAAG_AggAAAABwAIIAAAAAcECCACaBAAhDgYAAKAEACCvAgAAmwQAMLACAAAcABCxAgAAmwQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIfECAQCfBAAh_AIBAO4DACH9AggAnAQAIf4CAQDuAwAh_wIIAJwEACGAAwgAnQQAIYEDQACeBAAhCLoCCAAAAAG7AggAAAAEvAIIAAAABL0CCAAAAAG-AggAAAABvwIIAAAAAcACCAAAAAHBAggA6AMAIQi6AggAAAABuwIIAAAABbwCCAAAAAW9AggAAAABvgIIAAAAAb8CCAAAAAHAAggAAAABwQIIAJkEACEIugJAAAAAAbsCQAAAAAW8AkAAAAAFvQJAAAAAAb4CQAAAAAG_AkAAAAABwAJAAAAAAcECQACDBAAhC7oCAQAAAAG7AgEAAAAFvAIBAAAABb0CAQAAAAG-AgEAAAABvwIBAAAAAcACAQAAAAHBAgEA9wMAIcICAQAAAAHDAgEAAAABxAIBAAAAARkFAADTBAAgCQAAwAQAIAsAAOYEACAMAADnBAAgrwIAAOQEADCwAgAACwAQsQIAAOQEADCyAgEA7gMAIbgCQADvAwAhuQJAAO8DACHFAgEA7gMAIZcDAQDuAwAhmAMBAJ8EACGZAwEAnwQAIZsDAADlBJsDIpwDAQDuAwAhnQMBAO4DACGeAwEAnwQAIZ8DAQCfBAAhoAMBAJ8EACGhAwEAnwQAIaIDIAD9AwAhowMBAJ8EACHBAwAACwAgwgMAAAsAIBKvAgAAoQQAMLACAACaAgAQsQIAAKEEADCyAgEA4wMAIbgCQADkAwAhuQJAAOQDACHFAgEA4wMAIdgCAgDlAwAh7gIAAKIEhQMi_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_gMAIAQAAL4EACAJAADABAAgDQAAvwQAIA4AAMEEACARAADCBAAgFAAAwwQAIBcAAMQEACAYAADFBAAgrwIAAL0EADCwAgAANAAQsQIAAL0EADCyAgEA7gMAIbgCQADvAwAhuQJAAO8DACHxAgEAnwQAIfsCAQDuAwAhlwMBAO4DACGsAwEAnwQAIa0DQADvAwAhrgMBAJ8EACGvAwEAnwQAIbADAACnBAAgsQMAAKcEACCyAwEA7gMAIbMDAQDuAwAhtAMBAJ8EACG1AwEAnwQAIbYDIAD9AwAhtwMBAJ8EACEDvQMAAAcAIL4DAAAHACC_AwAABwAgA70DAAALACC-AwAACwAgvwMAAAsAIAO9AwAAEwAgvgMAABMAIL8DAAATACADvQMAACEAIL4DAAAhACC_AwAAIQAgA70DAAAlACC-AwAAJQAgvwMAACUAIAO9AwAAKwAgvgMAACsAIL8DAAArACADvQMAADAAIL4DAAAwACC_AwAAMAAgA70DAAA4ACC-AwAAOAAgvwMAADgAIBAVAADJBAAgGgAA_gMAIK8CAADGBAAwsAIAAEYAELECAADGBAAwsgIBAO4DACGzAgEA7gMAIbUCQADvAwAhuAJAAO8DACG5AkAA7wMAIcYCAQDuAwAh7gIAAMgEqAMipQMAAMcEpQMipgMBAO4DACGoAwEA7gMAIakDQACeBAAhBLoCAAAApQMCuwIAAAClAwi8AgAAAKUDCMECAAC1BKUDIgS6AgAAAKgDArsCAAAAqAMIvAIAAACoAwjBAgAAswSoAyIQAwAA_gMAIAUAANMEACAXAADEBAAgGQAA2wQAIBsAANwEACCvAgAA6AQAMLACAAAHABCxAgAA6AQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIcUCAQDuAwAh-wIBAO4DACGXAwEA7gMAIcEDAAAHACDCAwAABwAgEQUAAM0EACAWAAD-AwAgLAAAzAQAIK8CAADKBAAwsAIAADgAELECAADKBAAwsgIBAO4DACG4AkAA7wMAIcUCAQCfBAAhxwIBAO4DACHaAgAAywTaAiLbAgEA7gMAIdwCAQDuAwAh3QIgAP0DACHeAkAAngQAId8CAQDuAwAh4AIgAP0DACEEugIAAADaAgK7AgAAANoCCLwCAAAA2gIIwQIAAIUE2gIiDLoCgAAAAAG9AoAAAAABvgKAAAAAAb8CgAAAAAHAAoAAAAABwQKAAAAAAc0CAQAAAAHOAgEAAAABzwIBAAAAAdACgAAAAAHRAoAAAAAB0gKAAAAAASADAAD-AwAgBAAAvgQAIAkAAMAEACANAAC_BAAgDgAAwQQAIBEAAMIEACAUAADDBAAgFwAAxAQAIBgAAMUEACCvAgAAvQQAMLACAAA0ABCxAgAAvQQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIfECAQCfBAAh-wIBAO4DACGXAwEA7gMAIawDAQCfBAAhrQNAAO8DACGuAwEAnwQAIa8DAQCfBAAhsAMAAKcEACCxAwAApwQAILIDAQDuAwAhswMBAO4DACG0AwEAnwQAIbUDAQCfBAAhtgMgAP0DACG3AwEAnwQAIcEDAAA0ACDCAwAANAAgEAUAAM0EACAVAADPBAAgFgAA0AQAIK8CAADOBAAwsAIAADAAELECAADOBAAwsgIBAO4DACG4AkAA7wMAIcUCAQCfBAAhxgIBAJ8EACHHAgEAnwQAIcgCAQDuAwAhyQIBAO4DACHKAgEAnwQAIcsCAADMBAAgzAIBAJ8EACEQAwAA_gMAIAUAANMEACAXAADEBAAgGQAA2wQAIBsAANwEACCvAgAA6AQAMLACAAAHABCxAgAA6AQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIcUCAQDuAwAh-wIBAO4DACGXAwEA7gMAIcEDAAAHACDCAwAABwAgHhcAAMQEACAYAADFBAAgHAAA2wQAIB0AAL4EACAeAADcBAAgHwAA3QQAICAAAMAEACAhAADCBAAgIgAAwgQAICMAAMMEACAkAADDBAAgJQAAwQQAICYAAN4EACCvAgAA2QQAMLACAAAYABCxAgAA2QQAMLICAQDuAwAhswIBAO4DACG4AkAA7wMAIbkCQADvAwAhkwMgAP0DACGXAwEA7gMAIaUDAADaBLoDIrUDAQCfBAAhuAMBAO4DACG6AwEAnwQAIbsDIAD9AwAhvANAAJ4EACHBAwAAGAAgwgMAABgAIBEFAADTBAAgEgAA_gMAIBMAANAEACCvAgAA0QQAMLACAAArABCxAgAA0QQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIcUCAQDuAwAh2wIBAO4DACHhAgEA7gMAIeMCAADSBOMCIuQCAQDuAwAh5QIAAMwEACDmAiAA_QMAIecCAQCfBAAhBLoCAAAA4wICuwIAAADjAgi8AgAAAOMCCMECAACJBOMCIiADAAD-AwAgBAAAvgQAIAkAAMAEACANAAC_BAAgDgAAwQQAIBEAAMIEACAUAADDBAAgFwAAxAQAIBgAAMUEACCvAgAAvQQAMLACAAA0ABCxAgAAvQQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIfECAQCfBAAh-wIBAO4DACGXAwEA7gMAIawDAQCfBAAhrQNAAO8DACGuAwEAnwQAIa8DAQCfBAAhsAMAAKcEACCxAwAApwQAILIDAQDuAwAhswMBAO4DACG0AwEAnwQAIbUDAQCfBAAhtgMgAP0DACG3AwEAnwQAIcEDAAA0ACDCAwAANAAgEwUAANMEACAPAADQBAAgEAAA0AQAIK8CAADUBAAwsAIAACUAELECAADUBAAwsgIBAO4DACG4AkAA7wMAIbkCQADvAwAhxQIBAO4DACHbAgEA7gMAIegCAQCfBAAh6QIBAJ8EACHqAkAA7wMAIewCAADVBOwCIu4CAADWBO4CIu8CQACeBAAh8AIBAJ8EACHxAgEAnwQAIQS6AgAAAOwCArsCAAAA7AIIvAIAAADsAgjBAgAAkATsAiIEugIAAADuAgK7AgAAAO4CCLwCAAAA7gIIwQIAAI4E7gIiFQMAAP4DACAFAADTBAAgrwIAANcEADCwAgAAIQAQsQIAANcEADCyAgEA7gMAIbgCQADvAwAhuQJAAO8DACHFAgEA7gMAIdsCAQDuAwAh7gIAANgE-AIi8QIBAJ8EACHyAgEA7gMAIfMCAQCfBAAh9AIBAO4DACH1AgEAnwQAIfYCQADvAwAh-AICAPADACH5AiAA_QMAIfoCAQCfBAAh-wIBAO4DACEEugIAAAD4AgK7AgAAAPgCCLwCAAAA-AIIwQIAAJQE-AIiHBcAAMQEACAYAADFBAAgHAAA2wQAIB0AAL4EACAeAADcBAAgHwAA3QQAICAAAMAEACAhAADCBAAgIgAAwgQAICMAAMMEACAkAADDBAAgJQAAwQQAICYAAN4EACCvAgAA2QQAMLACAAAYABCxAgAA2QQAMLICAQDuAwAhswIBAO4DACG4AkAA7wMAIbkCQADvAwAhkwMgAP0DACGXAwEA7gMAIaUDAADaBLoDIrUDAQCfBAAhuAMBAO4DACG6AwEAnwQAIbsDIAD9AwAhvANAAJ4EACEEugIAAAC6AwK7AgAAALoDCLwCAAAAugMIwQIAALwEugMiA70DAAADACC-AwAAAwAgvwMAAAMAIAO9AwAARgAgvgMAAEYAIL8DAABGACADvQMAADQAIL4DAAA0ACC_AwAANAAgDxYAAP4DACCvAgAA_AMAMLACAABaABCxAgAA_AMAMLICAQDuAwAhuQJAAO8DACHHAgEA7gMAIdMCIAD9AwAh1AIgAP0DACHVAiAA_QMAIdYCIAD9AwAh1wIgAP0DACHYAgIA8AMAIcEDAABaACDCAwAAWgAgFgUAANMEACAGAACgBAAgBwAA4QQAIAgAANAEACCvAgAA3wQAMLACAAATABCxAgAA3wQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIcUCAQDuAwAh2AICAPADACHuAgAA4ASFAyL8AgEA7gMAIYIDAQCfBAAhgwNAAO8DACGFA0AAngQAIYYDAQCfBAAhhwMBAJ8EACGIAwIA8AMAIYkDQACeBAAhigMBAJ8EACEEugIAAACFAwK7AgAAAIUDCLwCAAAAhQMIwQIAAKQEhQMiEwYAAKAEACAJAADABAAgrwIAAOIEADCwAgAADwAQsQIAAOIEADCyAgEA7gMAIbgCQADvAwAhuQJAAO8DACH8AgEA7gMAIYwDAADjBIwDIo0DAACnBAAgjgMAAKgEACCPA0AA7wMAIZADQACeBAAhkQMIAJwEACGSAwEAnwQAIZMDIAD9AwAhwQMAAA8AIMIDAAAPACARBgAAoAQAIAkAAMAEACCvAgAA4gQAMLACAAAPABCxAgAA4gQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIfwCAQDuAwAhjAMAAOMEjAMijQMAAKcEACCOAwAAqAQAII8DQADvAwAhkANAAJ4EACGRAwgAnAQAIZIDAQCfBAAhkwMgAP0DACEEugIAAACMAwK7AgAAAIwDCLwCAAAAjAMIwQIAAKoEjAMiFwUAANMEACAJAADABAAgCwAA5gQAIAwAAOcEACCvAgAA5AQAMLACAAALABCxAgAA5AQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIcUCAQDuAwAhlwMBAO4DACGYAwEAnwQAIZkDAQCfBAAhmwMAAOUEmwMinAMBAO4DACGdAwEA7gMAIZ4DAQCfBAAhnwMBAJ8EACGgAwEAnwQAIaEDAQCfBAAhogMgAP0DACGjAwEAnwQAIQS6AgAAAJsDArsCAAAAmwMIvAIAAACbAwjBAgAArgSbAyIDvQMAAA8AIL4DAAAPACC_AwAADwAgEAYAAKAEACCvAgAAmwQAMLACAAAcABCxAgAAmwQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIfECAQCfBAAh_AIBAO4DACH9AggAnAQAIf4CAQDuAwAh_wIIAJwEACGAAwgAnQQAIYEDQACeBAAhwQMAABwAIMIDAAAcACAOAwAA_gMAIAUAANMEACAXAADEBAAgGQAA2wQAIBsAANwEACCvAgAA6AQAMLACAAAHABCxAgAA6AQAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIcUCAQDuAwAh-wIBAO4DACGXAwEA7gMAIQLGAgEAAAABxwIBAAAAAQ0VAADJBAAgFgAA_gMAIK8CAADqBAAwsAIAAAMAELECAADqBAAwsgIBAO4DACG5AkAA7wMAIcYCAQDuAwAhxwIBAO4DACGTAyAA_QMAIaUDAADHBKUDIqoDAACnBAAgqwNAAO8DACEAAAAAAAHGAwEAAAABAcYDQAAAAAEFxgMCAAAAAc0DAgAAAAHOAwIAAAABzwMCAAAAAdADAgAAAAEAAAAAAcYDAQAAAAEHMwAA-wkAIDQAAIQKACDDAwAA_AkAIMQDAACDCgAgxwMAADQAIMgDAAA0ACDJAwAAUQAgBzMAAPkJACA0AACBCgAgwwMAAPoJACDEAwAAgAoAIMcDAAAHACDIAwAABwAgyQMAAAkAIAczAAD3CQAgNAAA_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_AIBAAAAAYMDQAAAAAGFA0AAAAABhgMBAAAAAYcDAQAAAAGIAwIAAAABiQNAAAAAAYoDAQAAAAECAAAAFQAgMwAA3AUAIAMAAAAVACAzAADcBQAgNAAA2wUAIAEsAACjCQAwFgUAANMEACAGAACgBAAgBwAA4QQAIAgAANAEACCvAgAA3wQAMLACAAATABCxAgAA3wQAMLICAQAAAAG4AkAA7wMAIbkCQADvAwAhxQIBAO4DACHYAgIA8AMAIe4CAADgBIUDIvwCAQDuAwAhggMBAJ8EACGDA0AA7wMAIYUDQACeBAAhhgMBAJ8EACGHAwEAnwQAIYgDAgDwAwAhiQNAAJ4EACGKAwEAAAABAgAAABUAICwAANsFACACAAAA2QUAICwAANoFACASrwIAANgFADCwAgAA2QUAELECAADYBQAwsgIBAO4DACG4AkAA7wMAIbkCQADvAwAhxQIBAO4DACHYAgIA8AMAIe4CAADgBIUDIvwCAQDuAwAhggMBAJ8EACGDA0AA7wMAIYUDQACeBAAhhgMBAJ8EACGHAwEAnwQAIYgDAgDwAwAhiQNAAJ4EACGKAwEAnwQAIRKvAgAA2AUAMLACAADZBQAQsQIAANgFADCyAgEA7gMAIbgCQADvAwAhuQJAAO8DACHFAgEA7gMAIdgCAgDwAwAh7gIAAOAEhQMi_AIBAO4DACGCAwEAnwQAIYMDQADvAwAhhQNAAJ4EACGGAwEAnwQAIYcDAQCfBAAhiAMCAPADACGJA0AAngQAIYoDAQCfBAAhDrICAQDwBAAhuAJAAPEEACG5AkAA8QQAIcUCAQDwBAAh2AICAPIEACHuAgAAvgWFAyL8AgEA8AQAIYMDQADxBAAhhQNAAIsFACGGAwEA9wQAIYcDAQD3BAAhiAMCAPIEACGJA0AAiwUAIYoDAQD3BAAhEQUAAMEFACAGAAC_BQAgCAAAwgUAILICAQDwBAAhuAJAAPEEACG5AkAA8QQAIcUCAQDwBAAh2AICAPIEACHuAgAAvgWFAyL8AgEA8AQAIYMDQADxBAAhhQNAAIsFACGGAwEA9wQAIYcDAQD3BAAhiAMCAPIEACGJA0AAiwUAIYoDAQD3BAAhEQUAAMUFACAGAADDBQAgCAAAxgUAILICAQAAAAG4AkAAAAABuQJAAAAAAcUCAQAAAAHYAgIAAAAB7gIAAACFAwL8AgEAAAABgwNAAAAAAYUDQAAAAAGGAwEAAAABhwMBAAAAAYgDAgAAAAGJA0AAAAABigMBAAAAAQHGAwEAAAAEAcYDAgAAAAQDMwAAoQkAIMMDAACiCQAgyQMAAA0AIAQzAADRBQAwwwMAANIFADDFAwAA1AUAIMkDAADVBQAwAAAAAcYDAAAAmwMCBTMAAJoJACA0AACfCQAgwwMAAJsJACDEAwAAngkAIMkDAABRACALMwAA9wUAMDQAAPwFADDDAwAA-AUAMMQDAAD5BQAwxQMAAPoFACDGAwAA-wUAMMcDAAD7BQAwyAMAAPsFADDJAwAA-wUAMMoDAAD9BQAwywMAAP4FADALMwAA7gUAMDQAAPIFADDDAwAA7wUAMMQDAADwBQAwxQMAAPEFACDGAwAA1QUAMMcDAADVBQAwyAMAANUFADDJAwAA1QUAMMoDAADzBQAwywMAANgFADAHMwAA6QUAIDQAAOwFACDDAwAA6gUAIMQDAADrBQAgxwMAABwAIMgDAAAcACDJAwAAnQIAIAmyAgEAAAABuAJAAAAAAbkCQAAAAAHxAgEAAAAB_QIIAAAAAf4CAQAAAAH_AggAAAABgAMIAAAAAYEDQAAAAAECAAAAnQIAIDMAAOkFACADAAAAHAAgMwAA6QUAIDQAAO0FACALAAAAHAAgLAAA7QUAILICAQDwBAAhuAJAAPEEACG5AkAA8QQAIfECAQD3BAAh_QIIALQFACH-AgEA8AQAIf8CCAC0BQAhgAMIALUFACGBA0AAiwUAIQmyAgEA8AQAIbgCQADxBAAhuQJAAPEEACHxAgEA9wQAIf0CCAC0BQAh_gIBAPAEACH_AggAtAUAIYADCAC1BQAhgQNAAIsFACERBQAAxQUAIAcAAMQFACAIAADGBQAgsgIBAAAAAbgCQAAAAAG5AkAAAAABxQIBAAAAAdgCAgAAAAHuAgAAAIUDAoIDAQAAAAGDA0AAAAABhQNAAAAAAYYDAQAAAAGHAwEAAAABiAMCAAAAAYkDQAAAAAGKAwEAAAABAgAAABUAIDMAAPYFACADAAAAFQAgMwAA9gUAIDQAAPUFACABLAAAnQkAMAIAAAAVACAsAAD1BQAgAgAAANkFACAsAAD0BQAgDrICAQDwBAAhuAJAAPEEACG5AkAA8QQAIcUCAQDwBAAh2AICAPIEACHuAgAAvgWFAyKCAwEA9wQAIYMDQADxBAAhhQNAAIsFACGGAwEA9wQAIYcDAQD3BAAhiAMCAPIEACGJA0AAiwUAIYoDAQD3BAAhEQUAAMEFACAHAADABQAgCAAAwgUAILICAQDwBAAhuAJAAPEEACG5AkAA8QQAIcUCAQDwBAAh2AICAPIEACHuAgAAvgWFAyKCAwEA9wQAIYMDQADxBAAhhQNAAIsFACGGAwEA9wQAIYcDAQD3BAAhiAMCAPIEACGJA0AAiwUAIYoDAQD3BAAhEQUAAMUFACAHAADEBQAgCAAAxgUAILICAQAAAAG4AkAAAAABuQJAAAAAAcUCAQAAAAHYAgIAAAAB7gIAAACFAwKCAwEAAAABgwNAAAAAAYUDQAAAAAGGAwEAAAABhwMBAAAAAYgDAgAAAAGJA0AAAAABigMBAAAAAQwJAADgBQAgsgIBAAAAAbgCQAAAAAG5AkAAAAABjAMAAACMAwKNAwAA3QUAII4DAADeBQAgjwNAAAAAAZADQAAAAAGRAwgAAAABkgMBAAAAAZMDIAAAAAECAAAAEQAgMwAAggYAIAMAAAARACAzAACCBgAgNAAAgQYAIAEsAACcCQAwEQYAAKAEACAJAADABAAgrwIAAOIEADCwAgAADwAQsQIAAOIEADCyAgEAAAABuAJAAO8DACG5AkAA7wMAIfwCAQDuAwAhjAMAAOMEjAMijQMAAKcEACCOAwAAqAQAII8DQADvAwAhkANAAJ4EACGRAwgAnAQAIZIDAQCfBAAhkwMgAP0DACECAAAAEQAgLAAAgQYAIAIAAAD_BQAgLAAAgAYAIA-vAgAA_gUAMLACAAD_BQAQsQIAAP4FADCyAgEA7gMAIbgCQADvAwAhuQJAAO8DACH8AgEA7gMAIYwDAADjBIwDIo0DAACnBAAgjgMAAKgEACCPA0AA7wMAIZADQACeBAAhkQMIAJwEACGSAwEAnwQAIZMDIAD9AwAhD68CAAD-BQAwsAIAAP8FABCxAgAA_gUAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIfwCAQDuAwAhjAMAAOMEjAMijQMAAKcEACCOAwAAqAQAII8DQADvAwAhkANAAJ4EACGRAwgAnAQAIZIDAQCfBAAhkwMgAP0DACELsgIBAPAEACG4AkAA8QQAIbkCQADxBAAhjAMAAMwFjAMijQMAAM0FACCOAwAAzgUAII8DQADxBAAhkANAAIsFACGRAwgAtAUAIZIDAQD3BAAhkwMgAIMFACEMCQAA0AUAILICAQDwBAAhuAJAAPEEACG5AkAA8QQAIYwDAADMBYwDIo0DAADNBQAgjgMAAM4FACCPA0AA8QQAIZADQACLBQAhkQMIALQFACGSAwEA9wQAIZMDIACDBQAhDAkAAOAFACCyAgEAAAABuAJAAAAAAbkCQAAAAAGMAwAAAIwDAo0DAADdBQAgjgMAAN4FACCPA0AAAAABkANAAAAAAZEDCAAAAAGSAwEAAAABkwMgAAAAAQMzAACaCQAgwwMAAJsJACDJAwAAUQAgBDMAAPcFADDDAwAA-AUAMMUDAAD6BQAgyQMAAPsFADAEMwAA7gUAMMMDAADvBQAwxQMAAPEFACDJAwAA1QUAMAMzAADpBQAgwwMAAOoFACDJAwAAnQIAIAAAAAHGAwAAAKUDAgHGAwAAAKgDAgUzAACSCQAgNAAAmAkAIMMDAACTCQAgxAMAAJcJACDJAwAACQAgBTMAAJAJACA0AACVCQAgwwMAAJEJACDEAwAAlAkAIMkDAAABACADMwAAkgkAIMMDAACTCQAgyQMAAAkAIAMzAACQCQAgwwMAAJEJACDJAwAAAQAgAAAAAsYDAQAAAATMAwEAAAAFBTMAAIgJACA0AACOCQAgwwMAAIkJACDEAwAAjQkAIMkDAAAJACAFMwAAhgkAIDQAAIsJACDDAwAAhwkAIMQDAACKCQAgyQMAAAEAIAHGAwEAAAAEAzMAAIgJACDDAwAAiQkAIMkDAAAJACADMwAAhgkAIMMDAACHCQAgyQMAAAEAIAAAAAUzAAD7CAAgNAAAhAkAIMMDAAD8CAAgxAMAAIMJACDJAwAAUQAgBTMAAPkIACA0AACBCQAgwwMAAPoIACDEAwAAgAkAIMkDAAABACALMwAAuQYAMDQAAL4GADDDAwAAugYAMMQDAAC7BgAwxQMAALwGACDGAwAAvQYAMMcDAAC9BgAwyAMAAL0GADDJAwAAvQYAMMoDAAC_BgAwywMAAMAGADALMwAArQYAMDQAALIGADDDAwAArgYAMMQDAACvBgAwxQMAALAGACDGAwAAsQYAMMcDAACxBgAwyAMAALEGADDJAwAAsQYAMMoDAACzBgAwywMAALQGADALMwAAoQYAMDQAAKYGADDDAwAAogYAMMQDAACjBgAwxQMAAKQGACDGAwAApQYAMMcDAAClBgAwyAMAAKUGADDJAwAApQYAMMoDAACnBgAwywMAAKgGADALBQAA-wQAIBYAAP0EACCyAgEAAAABuAJAAAAAAcUCAQAAAAHHAgEAAAAByAIBAAAAAckCAQAAAAHKAgEAAAABywKAAAAAAcwCAQAAAAECAAAAMgAgMwAArAYAIAMAAAAyACAzAACsBgAgNAAAqwYAIAEsAAD_CAAwEAUAAM0EACAVAADPBAAgFgAA0AQAIK8CAADOBAAwsAIAADAAELECAADOBAAwsgIBAAAAAbgCQADvAwAhxQIBAJ8EACHGAgEAnwQAIccCAQCfBAAhyAIBAO4DACHJAgEA7gMAIcoCAQCfBAAhywIAAMwEACDMAgEAnwQAIQIAAAAyACAsAACrBgAgAgAAAKkGACAsAACqBgAgDa8CAACoBgAwsAIAAKkGABCxAgAAqAYAMLICAQDuAwAhuAJAAO8DACHFAgEAnwQAIcYCAQCfBAAhxwIBAJ8EACHIAgEA7gMAIckCAQDuAwAhygIBAJ8EACHLAgAAzAQAIMwCAQCfBAAhDa8CAACoBgAwsAIAAKkGABCxAgAAqAYAMLICAQDuAwAhuAJAAO8DACHFAgEAnwQAIcYCAQCfBAAhxwIBAJ8EACHIAgEA7gMAIckCAQDuAwAhygIBAJ8EACHLAgAAzAQAIMwCAQCfBAAhCbICAQDwBAAhuAJAAPEEACHFAgEA9wQAIccCAQD3BAAhyAIBAPAEACHJAgEA8AQAIcoCAQD3BAAhywKAAAAAAcwCAQD3BAAhCwUAAPgEACAWAAD6BAAgsgIBAPAEACG4AkAA8QQAIcUCAQD3BAAhxwIBAPcEACHIAgEA8AQAIckCAQDwBAAhygIBAPcEACHLAoAAAAABzAIBAPcEACELBQAA-wQAIBYAAP0EACCyAgEAAAABuAJAAAAAAcUCAQAAAAHHAgEAAAAByAIBAAAAAckCAQAAAAHKAgEAAAABywKAAAAAAcwCAQAAAAELGgAAjwYAILICAQAAAAGzAgEAAAABtQJAAAAAAbgCQAAAAAG5AkAAAAAB7gIAAACoAwKlAwAAAKUDAqYDAQAAAAGoAwEAAAABqQNAAAAAAQIAAABIACAzAAC4BgAgAwAAAEgAIDMAALgGACA0AAC3BgAgASwAAP4IADAQFQAAyQQAIBoAAP4DACCvAgAAxgQAMLACAABGABCxAgAAxgQAMLICAQAAAAGzAgEA7gMAIbUCQADvAwAhuAJAAO8DACG5AkAA7wMAIcYCAQDuAwAh7gIAAMgEqAMipQMAAMcEpQMipgMBAAAAAagDAQDuAwAhqQNAAJ4EACECAAAASAAgLAAAtwYAIAIAAAC1BgAgLAAAtgYAIA6vAgAAtAYAMLACAAC1BgAQsQIAALQGADCyAgEA7gMAIbMCAQDuAwAhtQJAAO8DACG4AkAA7wMAIbkCQADvAwAhxgIBAO4DACHuAgAAyASoAyKlAwAAxwSlAyKmAwEA7gMAIagDAQDuAwAhqQNAAJ4EACEOrwIAALQGADCwAgAAtQYAELECAAC0BgAwsgIBAO4DACGzAgEA7gMAIbUCQADvAwAhuAJAAO8DACG5AkAA7wMAIcYCAQDuAwAh7gIAAMgEqAMipQMAAMcEpQMipgMBAO4DACGoAwEA7gMAIakDQACeBAAhCrICAQDwBAAhswIBAPAEACG1AkAA8QQAIbgCQADxBAAhuQJAAPEEACHuAgAAiwaoAyKlAwAAigalAyKmAwEA8AQAIagDAQDwBAAhqQNAAIsFACELGgAAjQYAILICAQDwBAAhswIBAPAEACG1AkAA8QQAIbgCQADxBAAhuQJAAPEEACHuAgAAiwaoAyKlAwAAigalAyKmAwEA8AQAIagDAQDwBAAhqQNAAIsFACELGgAAjwYAILICAQAAAAGzAgEAAAABtQJAAAAAAbgCQAAAAAG5AkAAAAAB7gIAAACoAwKlAwAAAKUDAqYDAQAAAAGoAwEAAAABqQNAAAAAAQgWAACYBgAgsgIBAAAAAbkCQAAAAAHHAgEAAAABkwMgAAAAAaUDAAAApQMCqgMAAJYGACCrA0AAAAABAgAAAAUAIDMAAMQGACADAAAABQAgMwAAxAYAIDQAAMMGACABLAAA_QgAMA4VAADJBAAgFgAA_gMAIK8CAADqBAAwsAIAAAMAELECAADqBAAwsgIBAAAAAbkCQADvAwAhxgIBAO4DACHHAgEA7gMAIZMDIAD9AwAhpQMAAMcEpQMiqgMAAKcEACCrA0AA7wMAIcADAADpBAAgAgAAAAUAICwAAMMGACACAAAAwQYAICwAAMIGACALrwIAAMAGADCwAgAAwQYAELECAADABgAwsgIBAO4DACG5AkAA7wMAIcYCAQDuAwAhxwIBAO4DACGTAyAA_QMAIaUDAADHBKUDIqoDAACnBAAgqwNAAO8DACELrwIAAMAGADCwAgAAwQYAELECAADABgAwsgIBAO4DACG5AkAA7wMAIcYCAQDuAwAhxwIBAO4DACGTAyAA_QMAIaUDAADHBKUDIqoDAACnBAAgqwNAAO8DACEHsgIBAPAEACG5AkAA8QQAIccCAQDwBAAhkwMgAIMFACGlAwAAigalAyKqAwAAkwYAIKsDQADxBAAhCBYAAJUGACCyAgEA8AQAIbkCQADxBAAhxwIBAPAEACGTAyAAgwUAIaUDAACKBqUDIqoDAACTBgAgqwNAAPEEACEIFgAAmAYAILICAQAAAAG5AkAAAAABxwIBAAAAAZMDIAAAAAGlAwAAAKUDAqoDAACWBgAgqwNAAAAAAQMzAAD7CAAgwwMAAPwIACDJAwAAUQAgAzMAAPkIACDDAwAA-ggAIMkDAAABACAEMwAAuQYAMMMDAAC6BgAwxQMAALwGACDJAwAAvQYAMAQzAACtBgAwwwMAAK4GADDFAwAAsAYAIMkDAACxBgAwBDMAAKEGADDDAwAAogYAMMUDAACkBgAgyQMAAKUGADAAAAACxgMBAAAABMwDAQAAAAUCxgMBAAAABMwDAQAAAAUFMwAA7AgAIDQAAPcIACDDAwAA7QgAIMQDAAD2CAAgyQMAAAEAIAszAACmBwAwNAAAqwcAMMMDAACnBwAwxAMAAKgHADDFAwAAqQcAIMYDAACqBwAwxwMAAKoHADDIAwAAqgcAMMkDAACqBwAwygMAAKwHADDLAwAArQcAMAszAACaBwAwNAAAnwcAMMMDAACbBwAwxAMAAJwHADDFAwAAnQcAIMYDAACeBwAwxwMAAJ4HADDIAwAAngcAMMkDAACeBwAwygMAAKAHADDLAwAAoQcAMAszAACRBwAwNAAAlQcAMMMDAACSBwAwxAMAAJMHADDFAwAAlAcAIMYDAADVBQAwxwMAANUFADDIAwAA1QUAMMkDAADVBQAwygMAAJYHADDLAwAA2AUAMAszAACFBwAwNAAAigcAMMMDAACGBwAwxAMAAIcHADDFAwAAiAcAIMYDAACJBwAwxwMAAIkHADDIAwAAiQcAMMkDAACJBwAwygMAAIsHADDLAwAAjAcAMAszAAD5BgAwNAAA_gYAMMMDAAD6BgAwxAMAAPsGADDFAwAA_AYAIMYDAAD9BgAwxwMAAP0GADDIAwAA_QYAMMkDAAD9BgAwygMAAP8GADDLAwAAgAcAMAszAADtBgAwNAAA8gYAMMMDAADuBgAwxAMAAO8GADDFAwAA8AYAIMYDAADxBgAwxwMAAPEGADDIAwAA8QYAMMkDAADxBgAwygMAAPMGADDLAwAA9AYAMAszAADkBgAwNAAA6AYAMMMDAADlBgAwxAMAAOYGADDFAwAA5wYAIMYDAAClBgAwxwMAAKUGADDIAwAApQYAMMkDAAClBgAwygMAAOkGADDLAwAAqAYAMAszAADYBgAwNAAA3QYAMMMDAADZBgAwxAMAANoGADDFAwAA2wYAIMYDAADcBgAwxwMAANwGADDIAwAA3AYAMMkDAADcBgAwygMAAN4GADDLAwAA3wYAMAwWAACOBQAgLIAAAAABsgIBAAAAAbgCQAAAAAHHAgEAAAAB2gIAAADaAgLbAgEAAAAB3AIBAAAAAd0CIAAAAAHeAkAAAAAB3wIBAAAAAeACIAAAAAECAAAAOgAgMwAA4wYAIAMAAAA6ACAzAADjBgAgNAAA4gYAIAEsAAD1CAAwEQUAAM0EACAWAAD-AwAgLAAAzAQAIK8CAADKBAAwsAIAADgAELECAADKBAAwsgIBAAAAAbgCQADvAwAhxQIBAJ8EACHHAgEA7gMAIdoCAADLBNoCItsCAQDuAwAh3AIBAO4DACHdAiAA_QMAId4CQACeBAAh3wIBAO4DACHgAiAA_QMAIQIAAAA6ACAsAADiBgAgAgAAAOAGACAsAADhBgAgDywAAMwEACCvAgAA3wYAMLACAADgBgAQsQIAAN8GADCyAgEA7gMAIbgCQADvAwAhxQIBAJ8EACHHAgEA7gMAIdoCAADLBNoCItsCAQDuAwAh3AIBAO4DACHdAiAA_QMAId4CQACeBAAh3wIBAO4DACHgAiAA_QMAIQ8sAADMBAAgrwIAAN8GADCwAgAA4AYAELECAADfBgAwsgIBAO4DACG4AkAA7wMAIcUCAQCfBAAhxwIBAO4DACHaAgAAywTaAiLbAgEA7gMAIdwCAQDuAwAh3QIgAP0DACHeAkAAngQAId8CAQDuAwAh4AIgAP0DACELLIAAAAABsgIBAPAEACG4AkAA8QQAIccCAQDwBAAh2gIAAIoF2gIi2wIBAPAEACHcAgEA8AQAId0CIACDBQAh3gJAAIsFACHfAgEA8AQAIeACIACDBQAhDBYAAIwFACAsgAAAAAGyAgEA8AQAIbgCQADxBAAhxwIBAPAEACHaAgAAigXaAiLbAgEA8AQAIdwCAQDwBAAh3QIgAIMFACHeAkAAiwUAId8CAQDwBAAh4AIgAIMFACEMFgAAjgUAICyAAAAAAbICAQAAAAG4AkAAAAABxwIBAAAAAdoCAAAA2gIC2wIBAAAAAdwCAQAAAAHdAiAAAAAB3gJAAAAAAd8CAQAAAAHgAiAAAAABCxUAAPwEACAWAAD9BAAgsgIBAAAAAbgCQAAAAAHGAgEAAAABxwIBAAAAAcgCAQAAAAHJAgEAAAABygIBAAAAAcsCgAAAAAHMAgEAAAABAgAAADIAIDMAAOwGACADAAAAMgAgMwAA7AYAIDQAAOsGACABLAAA9AgAMAIAAAAyACAsAADrBgAgAgAAAKkGACAsAADqBgAgCbICAQDwBAAhuAJAAPEEACHGAgEA9wQAIccCAQD3BAAhyAIBAPAEACHJAgEA8AQAIcoCAQD3BAAhywKAAAAAAcwCAQD3BAAhCxUAAPkEACAWAAD6BAAgsgIBAPAEACG4AkAA8QQAIcYCAQD3BAAhxwIBAPcEACHIAgEA8AQAIckCAQDwBAAhygIBAPcEACHLAoAAAAABzAIBAPcEACELFQAA_AQAIBYAAP0EACCyAgEAAAABuAJAAAAAAcYCAQAAAAHHAgEAAAAByAIBAAAAAckCAQAAAAHKAgEAAAABywKAAAAAAcwCAQAAAAEMEgAAmAUAIBMAAJkFACCyAgEAAAABuAJAAAAAAbkCQAAAAAHbAgEAAAAB4QIBAAAAAeMCAAAA4wIC5AIBAAAAAeUCgAAAAAHmAiAAAAAB5wIBAAAAAQIAAAAtACAzAAD4BgAgAwAAAC0AIDMAAPgGACA0AAD3BgAgASwAAPMIADARBQAA0wQAIBIAAP4DACATAADQBAAgrwIAANEEADCwAgAAKwAQsQIAANEEADCyAgEAAAABuAJAAO8DACG5AkAA7wMAIcUCAQDuAwAh2wIBAO4DACHhAgEA7gMAIeMCAADSBOMCIuQCAQDuAwAh5QIAAMwEACDmAiAA_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-AICAAAAAfkCIAAAAAH6AgEAAAAB-wIBAAAAAQIAAAAjACAzAACQBwAgAwAAACMAIDMAAJAHACA0AACPBwAgASwAAPEIADAVAwAA_gMAIAUAANMEACCvAgAA1wQAMLACAAAhABCxAgAA1wQAMLICAQAAAAG4AkAA7wMAIbkCQADvAwAhxQIBAO4DACHbAgEA7gMAIe4CAADYBPgCIvECAQCfBAAh8gIBAO4DACHzAgEAnwQAIfQCAQDuAwAh9QIBAJ8EACH2AkAA7wMAIfgCAgDwAwAh-QIgAP0DACH6AgEAnwQAIfsCAQDuAwAhAgAAACMAICwAAI8HACACAAAAjQcAICwAAI4HACATrwIAAIwHADCwAgAAjQcAELECAACMBwAwsgIBAO4DACG4AkAA7wMAIbkCQADvAwAhxQIBAO4DACHbAgEA7gMAIe4CAADYBPgCIvECAQCfBAAh8gIBAO4DACHzAgEAnwQAIfQCAQDuAwAh9QIBAJ8EACH2AkAA7wMAIfgCAgDwAwAh-QIgAP0DACH6AgEAnwQAIfsCAQDuAwAhE68CAACMBwAwsAIAAI0HABCxAgAAjAcAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIcUCAQDuAwAh2wIBAO4DACHuAgAA2AT4AiLxAgEAnwQAIfICAQDuAwAh8wIBAJ8EACH0AgEA7gMAIfUCAQCfBAAh9gJAAO8DACH4AgIA8AMAIfkCIAD9AwAh-gIBAJ8EACH7AgEA7gMAIQ-yAgEA8AQAIbgCQADxBAAhuQJAAPEEACHbAgEA8AQAIe4CAACqBfgCIvECAQD3BAAh8gIBAPAEACHzAgEA9wQAIfQCAQDwBAAh9QIBAPcEACH2AkAA8QQAIfgCAgDyBAAh-QIgAIMFACH6AgEA9wQAIfsCAQDwBAAhEAMAAKwFACCyAgEA8AQAIbgCQADxBAAhuQJAAPEEACHbAgEA8AQAIe4CAACqBfgCIvECAQD3BAAh8gIBAPAEACHzAgEA9wQAIfQCAQDwBAAh9QIBAPcEACH2AkAA8QQAIfgCAgDyBAAh-QIgAIMFACH6AgEA9wQAIfsCAQDwBAAhEAMAAK4FACCyAgEAAAABuAJAAAAAAbkCQAAAAAHbAgEAAAAB7gIAAAD4AgLxAgEAAAAB8gIBAAAAAfMCAQAAAAH0AgEAAAAB9QIBAAAAAfYCQAAAAAH4AgIAAAAB-QIgAAAAAfoCAQAAAAH7AgEAAAABEQYAAMMFACAHAADEBQAgCAAAxgUAILICAQAAAAG4AkAAAAABuQJAAAAAAdgCAgAAAAHuAgAAAIUDAvwCAQAAAAGCAwEAAAABgwNAAAAAAYUDQAAAAAGGAwEAAAABhwMBAAAAAYgDAgAAAAGJA0AAAAABigMBAAAAAQIAAAAVACAzAACZBwAgAwAAABUAIDMAAJkHACA0AACYBwAgASwAAPAIADACAAAAFQAgLAAAmAcAIAIAAADZBQAgLAAAlwcAIA6yAgEA8AQAIbgCQADxBAAhuQJAAPEEACHYAgIA8gQAIe4CAAC-BYUDIvwCAQDwBAAhggMBAPcEACGDA0AA8QQAIYUDQACLBQAhhgMBAPcEACGHAwEA9wQAIYgDAgDyBAAhiQNAAIsFACGKAwEA9wQAIREGAAC_BQAgBwAAwAUAIAgAAMIFACCyAgEA8AQAIbgCQADxBAAhuQJAAPEEACHYAgIA8gQAIe4CAAC-BYUDIvwCAQDwBAAhggMBAPcEACGDA0AA8QQAIYUDQACLBQAhhgMBAPcEACGHAwEA9wQAIYgDAgDyBAAhiQNAAIsFACGKAwEA9wQAIREGAADDBQAgBwAAxAUAIAgAAMYFACCyAgEAAAABuAJAAAAAAbkCQAAAAAHYAgIAAAAB7gIAAACFAwL8AgEAAAABggMBAAAAAYMDQAAAAAGFA0AAAAABhgMBAAAAAYcDAQAAAAGIAwIAAAABiQNAAAAAAYoDAQAAAAESCQAAhQYAIAsAAIQGACAMAACGBgAgsgIBAAAAAbgCQAAAAAG5AkAAAAABlwMBAAAAAZgDAQAAAAGZAwEAAAABmwMAAACbAwKcAwEAAAABnQMBAAAAAZ4DAQAAAAGfAwEAAAABoAMBAAAAAaEDAQAAAAGiAyAAAAABowMBAAAAAQIAAAANACAzAAClBwAgAwAAAA0AIDMAAKUHACA0AACkBwAgASwAAO8IADAXBQAA0wQAIAkAAMAEACALAADmBAAgDAAA5wQAIK8CAADkBAAwsAIAAAsAELECAADkBAAwsgIBAAAAAbgCQADvAwAhuQJAAO8DACHFAgEA7gMAIZcDAQDuAwAhmAMBAJ8EACGZAwEAnwQAIZsDAADlBJsDIpwDAQDuAwAhnQMBAO4DACGeAwEAnwQAIZ8DAQCfBAAhoAMBAJ8EACGhAwEAnwQAIaIDIAD9AwAhowMBAJ8EACECAAAADQAgLAAApAcAIAIAAACiBwAgLAAAowcAIBOvAgAAoQcAMLACAACiBwAQsQIAAKEHADCyAgEA7gMAIbgCQADvAwAhuQJAAO8DACHFAgEA7gMAIZcDAQDuAwAhmAMBAJ8EACGZAwEAnwQAIZsDAADlBJsDIpwDAQDuAwAhnQMBAO4DACGeAwEAnwQAIZ8DAQCfBAAhoAMBAJ8EACGhAwEAnwQAIaIDIAD9AwAhowMBAJ8EACETrwIAAKEHADCwAgAAogcAELECAAChBwAwsgIBAO4DACG4AkAA7wMAIbkCQADvAwAhxQIBAO4DACGXAwEA7gMAIZgDAQCfBAAhmQMBAJ8EACGbAwAA5QSbAyKcAwEA7gMAIZ0DAQDuAwAhngMBAJ8EACGfAwEAnwQAIaADAQCfBAAhoQMBAJ8EACGiAyAA_QMAIaMDAQCfBAAhD7ICAQDwBAAhuAJAAPEEACG5AkAA8QQAIZcDAQDwBAAhmAMBAPcEACGZAwEA9wQAIZsDAADkBZsDIpwDAQDwBAAhnQMBAPAEACGeAwEA9wQAIZ8DAQD3BAAhoAMBAPcEACGhAwEA9wQAIaIDIACDBQAhowMBAPcEACESCQAA5wUAIAsAAOYFACAMAADoBQAgsgIBAPAEACG4AkAA8QQAIbkCQADxBAAhlwMBAPAEACGYAwEA9wQAIZkDAQD3BAAhmwMAAOQFmwMinAMBAPAEACGdAwEA8AQAIZ4DAQD3BAAhnwMBAPcEACGgAwEA9wQAIaEDAQD3BAAhogMgAIMFACGjAwEA9wQAIRIJAACFBgAgCwAAhAYAIAwAAIYGACCyAgEAAAABuAJAAAAAAbkCQAAAAAGXAwEAAAABmAMBAAAAAZkDAQAAAAGbAwAAAJsDApwDAQAAAAGdAwEAAAABngMBAAAAAZ8DAQAAAAGgAwEAAAABoQMBAAAAAaIDIAAAAAGjAwEAAAABCQMAAMYGACAXAADJBgAgGQAAxwYAIBsAAMgGACCyAgEAAAABuAJAAAAAAbkCQAAAAAH7AgEAAAABlwMBAAAAAQIAAAAJACAzAACxBwAgAwAAAAkAIDMAALEHACA0AACwBwAgASwAAO4IADAOAwAA_gMAIAUAANMEACAXAADEBAAgGQAA2wQAIBsAANwEACCvAgAA6AQAMLACAAAHABCxAgAA6AQAMLICAQAAAAG4AkAA7wMAIbkCQADvAwAhxQIBAO4DACH7AgEA7gMAIZcDAQDuAwAhAgAAAAkAICwAALAHACACAAAArgcAICwAAK8HACAJrwIAAK0HADCwAgAArgcAELECAACtBwAwsgIBAO4DACG4AkAA7wMAIbkCQADvAwAhxQIBAO4DACH7AgEA7gMAIZcDAQDuAwAhCa8CAACtBwAwsAIAAK4HABCxAgAArQcAMLICAQDuAwAhuAJAAO8DACG5AkAA7wMAIcUCAQDuAwAh-wIBAO4DACGXAwEA7gMAIQWyAgEA8AQAIbgCQADxBAAhuQJAAPEEACH7AgEA8AQAIZcDAQDwBAAhCQMAAJ0GACAXAACgBgAgGQAAngYAIBsAAJ8GACCyAgEA8AQAIbgCQADxBAAhuQJAAPEEACH7AgEA8AQAIZcDAQDwBAAhCQMAAMYGACAXAADJBgAgGQAAxwYAIBsAAMgGACCyAgEAAAABuAJAAAAAAbkCQAAAAAH7AgEAAAABlwMBAAAAAQHGAwEAAAAEAcYDAQAAAAQDMwAA7AgAIMMDAADtCAAgyQMAAAEAIAQzAACmBwAwwwMAAKcHADDFAwAAqQcAIMkDAACqBwAwBDMAAJoHADDDAwAAmwcAMMUDAACdBwAgyQMAAJ4HADAEMwAAkQcAMMMDAACSBwAwxQMAAJQHACDJAwAA1QUAMAQzAACFBwAwwwMAAIYHADDFAwAAiAcAIMkDAACJBwAwBDMAAPkGADDDAwAA-gYAMMUDAAD8BgAgyQMAAP0GADAEMwAA7QYAMMMDAADuBgAwxQMAAPAGACDJAwAA8QYAMAQzAADkBgAwwwMAAOUGADDFAwAA5wYAIMkDAAClBgAwBDMAANgGADDDAwAA2QYAMMUDAADbBgAgyQMAANwGADAAAAABxgMAAAC6AwILMwAAuQgAMDQAAL0IADDDAwAAuggAMMQDAAC7CAAwxQMAALwIACDGAwAAvQYAMMcDAAC9BgAwyAMAAL0GADDJAwAAvQYAMMoDAAC-CAAwywMAAMAGADALMwAAsAgAMDQAALQIADDDAwAAsQgAMMQDAACyCAAwxQMAALMIACDGAwAAqgcAMMcDAACqBwAwyAMAAKoHADDJAwAAqgcAMMoDAAC1CAAwywMAAK0HADALMwAApwgAMDQAAKsIADDDAwAAqAgAMMQDAACpCAAwxQMAAKoIACDGAwAAsQYAMMcDAACxBgAwyAMAALEGADDJAwAAsQYAMMoDAACsCAAwywMAALQGADALMwAAmwgAMDQAAKAIADDDAwAAnAgAMMQDAACdCAAwxQMAAJ4IACDGAwAAnwgAMMcDAACfCAAwyAMAAJ8IADDJAwAAnwgAMMoDAAChCAAwywMAAKIIADALMwAAkggAMDQAAJYIADDDAwAAkwgAMMQDAACUCAAwxQMAAJUIACDGAwAA1QUAMMcDAADVBQAwyAMAANUFADDJAwAA1QUAMMoDAACXCAAwywMAANgFADALMwAAiQgAMDQAAI0IADDDAwAAiggAMMQDAACLCAAwxQMAAIwIACDGAwAA_QYAMMcDAAD9BgAwyAMAAP0GADDJAwAA_QYAMMoDAACOCAAwywMAAIAHADALMwAAgAgAMDQAAIQIADDDAwAAgQgAMMQDAACCCAAwxQMAAIMIACDGAwAA_QYAMMcDAAD9BgAwyAMAAP0GADDJAwAA_QYAMMoDAACFCAAwywMAAIAHADALMwAA9wcAMDQAAPsHADDDAwAA-AcAMMQDAAD5BwAwxQMAAPoHACDGAwAA8QYAMMcDAADxBgAwyAMAAPEGADDJAwAA8QYAMMoDAAD8BwAwywMAAPQGADALMwAA7gcAMDQAAPIHADDDAwAA7wcAMMQDAADwBwAwxQMAAPEHACDGAwAA8QYAMMcDAADxBgAwyAMAAPEGADDJAwAA8QYAMMoDAADzBwAwywMAAPQGADALMwAA5QcAMDQAAOkHADDDAwAA5gcAMMQDAADnBwAwxQMAAOgHACDGAwAAiQcAMMcDAACJBwAwyAMAAIkHADDJAwAAiQcAMMoDAADqBwAwywMAAIwHADALMwAA3AcAMDQAAOAHADDDAwAA3QcAMMQDAADeBwAwxQMAAN8HACDGAwAA3AYAMMcDAADcBgAwyAMAANwGADDJAwAA3AYAMMoDAADhBwAwywMAAN8GADAHMwAA1wcAIDQAANoHACDDAwAA2AcAIMQDAADZBwAgxwMAAFoAIMgDAABaACDJAwAAlQMAIAszAADOBwAwNAAA0gcAMMMDAADPBwAwxAMAANAHADDFAwAA0QcAIMYDAAClBgAwxwMAAKUGADDIAwAApQYAMMkDAAClBgAwygMAANMHADDLAwAAqAYAMAsFAAD7BAAgFQAA_AQAILICAQAAAAG4AkAAAAABxQIBAAAAAcYCAQAAAAHIAgEAAAAByQIBAAAAAcoCAQAAAAHLAoAAAAABzAIBAAAAAQIAAAAyACAzAADWBwAgAwAAADIAIDMAANYHACA0AADVBwAgASwAAOsIADACAAAAMgAgLAAA1QcAIAIAAACpBgAgLAAA1AcAIAmyAgEA8AQAIbgCQADxBAAhxQIBAPcEACHGAgEA9wQAIcgCAQDwBAAhyQIBAPAEACHKAgEA9wQAIcsCgAAAAAHMAgEA9wQAIQsFAAD4BAAgFQAA-QQAILICAQDwBAAhuAJAAPEEACHFAgEA9wQAIcYCAQD3BAAhyAIBAPAEACHJAgEA8AQAIcoCAQD3BAAhywKAAAAAAcwCAQD3BAAhCwUAAPsEACAVAAD8BAAgsgIBAAAAAbgCQAAAAAHFAgEAAAABxgIBAAAAAcgCAQAAAAHJAgEAAAABygIBAAAAAcsCgAAAAAHMAgEAAAABCLICAQAAAAG5AkAAAAAB0wIgAAAAAdQCIAAAAAHVAiAAAAAB1gIgAAAAAdcCIAAAAAHYAgIAAAABAgAAAJUDACAzAADXBwAgAwAAAFoAIDMAANcHACA0AADbBwAgCgAAAFoAICwAANsHACCyAgEA8AQAIbkCQADxBAAh0wIgAIMFACHUAiAAgwUAIdUCIACDBQAh1gIgAIMFACHXAiAAgwUAIdgCAgDyBAAhCLICAQDwBAAhuQJAAPEEACHTAiAAgwUAIdQCIACDBQAh1QIgAIMFACHWAiAAgwUAIdcCIACDBQAh2AICAPIEACEMBQAAjwUAICyAAAAAAbICAQAAAAG4AkAAAAABxQIBAAAAAdoCAAAA2gIC2wIBAAAAAdwCAQAAAAHdAiAAAAAB3gJAAAAAAd8CAQAAAAHgAiAAAAABAgAAADoAIDMAAOQHACADAAAAOgAgMwAA5AcAIDQAAOMHACABLAAA6ggAMAIAAAA6ACAsAADjBwAgAgAAAOAGACAsAADiBwAgCyyAAAAAAbICAQDwBAAhuAJAAPEEACHFAgEA9wQAIdoCAACKBdoCItsCAQDwBAAh3AIBAPAEACHdAiAAgwUAId4CQACLBQAh3wIBAPAEACHgAiAAgwUAIQwFAACNBQAgLIAAAAABsgIBAPAEACG4AkAA8QQAIcUCAQD3BAAh2gIAAIoF2gIi2wIBAPAEACHcAgEA8AQAId0CIACDBQAh3gJAAIsFACHfAgEA8AQAIeACIACDBQAhDAUAAI8FACAsgAAAAAGyAgEAAAABuAJAAAAAAcUCAQAAAAHaAgAAANoCAtsCAQAAAAHcAgEAAAAB3QIgAAAAAd4CQAAAAAHfAgEAAAAB4AIgAAAAARAFAACtBQAgsgIBAAAAAbgCQAAAAAG5AkAAAAABxQIBAAAAAdsCAQAAAAHuAgAAAPgCAvECAQAAAAHyAgEAAAAB8wIBAAAAAfQCAQAAAAH1AgEAAAAB9gJAAAAAAfgCAgAAAAH5AiAAAAAB-gIBAAAAAQIAAAAjACAzAADtBwAgAwAAACMAIDMAAO0HACA0AADsBwAgASwAAOkIADACAAAAIwAgLAAA7AcAIAIAAACNBwAgLAAA6wcAIA-yAgEA8AQAIbgCQADxBAAhuQJAAPEEACHFAgEA8AQAIdsCAQDwBAAh7gIAAKoF-AIi8QIBAPcEACHyAgEA8AQAIfMCAQD3BAAh9AIBAPAEACH1AgEA9wQAIfYCQADxBAAh-AICAPIEACH5AiAAgwUAIfoCAQD3BAAhEAUAAKsFACCyAgEA8AQAIbgCQADxBAAhuQJAAPEEACHFAgEA8AQAIdsCAQDwBAAh7gIAAKoF-AIi8QIBAPcEACHyAgEA8AQAIfMCAQD3BAAh9AIBAPAEACH1AgEA9wQAIfYCQADxBAAh-AICAPIEACH5AiAAgwUAIfoCAQD3BAAhEAUAAK0FACCyAgEAAAABuAJAAAAAAbkCQAAAAAHFAgEAAAAB2wIBAAAAAe4CAAAA-AIC8QIBAAAAAfICAQAAAAHzAgEAAAAB9AIBAAAAAfUCAQAAAAH2AkAAAAAB-AICAAAAAfkCIAAAAAH6AgEAAAABDAUAAJcFACASAACYBQAgsgIBAAAAAbgCQAAAAAG5AkAAAAABxQIBAAAAAdsCAQAAAAHhAgEAAAAB4wIAAADjAgLkAgEAAAAB5QKAAAAAAeYCIAAAAAECAAAALQAgMwAA9gcAIAMAAAAtACAzAAD2BwAgNAAA9QcAIAEsAADoCAAwAgAAAC0AICwAAPUHACACAAAA9QYAICwAAPQHACAKsgIBAPAEACG4AkAA8QQAIbkCQADxBAAhxQIBAPAEACHbAgEA8AQAIeECAQDwBAAh4wIAAJMF4wIi5AIBAPAEACHlAoAAAAAB5gIgAIMFACEMBQAAlAUAIBIAAJUFACCyAgEA8AQAIbgCQADxBAAhuQJAAPEEACHFAgEA8AQAIdsCAQDwBAAh4QIBAPAEACHjAgAAkwXjAiLkAgEA8AQAIeUCgAAAAAHmAiAAgwUAIQwFAACXBQAgEgAAmAUAILICAQAAAAG4AkAAAAABuQJAAAAAAcUCAQAAAAHbAgEAAAAB4QIBAAAAAeMCAAAA4wIC5AIBAAAAAeUCgAAAAAHmAiAAAAABDAUAAJcFACATAACZBQAgsgIBAAAAAbgCQAAAAAG5AkAAAAABxQIBAAAAAdsCAQAAAAHjAgAAAOMCAuQCAQAAAAHlAoAAAAAB5gIgAAAAAecCAQAAAAECAAAALQAgMwAA_wcAIAMAAAAtACAzAAD_BwAgNAAA_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_AIBAPAEACGCAwEA9wQAIYMDQADxBAAhhQNAAIsFACGHAwEA9wQAIYgDAgDyBAAhiQNAAIsFACGKAwEA9wQAIREFAADBBQAgBgAAvwUAIAcAAMAFACCyAgEA8AQAIbgCQADxBAAhuQJAAPEEACHFAgEA8AQAIdgCAgDyBAAh7gIAAL4FhQMi_AIBAPAEACGCAwEA9wQAIYMDQADxBAAhhQNAAIsFACGHAwEA9wQAIYgDAgDyBAAhiQNAAIsFACGKAwEA9wQAIREFAADFBQAgBgAAwwUAIAcAAMQFACCyAgEAAAABuAJAAAAAAbkCQAAAAAHFAgEAAAAB2AICAAAAAe4CAAAAhQMC_AIBAAAAAYIDAQAAAAGDA0AAAAABhQNAAAAAAYcDAQAAAAGIAwIAAAABiQNAAAAAAYoDAQAAAAEZBAAAtQcAIAkAALcHACANAAC2BwAgDgAAuAcAIBEAALkHACAUAAC6BwAgFwAAuwcAIBgAALwHACCyAgEAAAABuAJAAAAAAbkCQAAAAAHxAgEAAAABlwMBAAAAAawDAQAAAAGtA0AAAAABrgMBAAAAAa8DAQAAAAGwAwAAsgcAILEDAACzBwAgsgMBAAAAAbMDAQAAAAG0AwEAAAABtQMBAAAAAbYDIAAAAAG3AwEAAAABAgAAAFEAIDMAAKYIACADAAAAUQAgMwAApggAIDQAAKUIACABLAAA4wgAMB4DAAD-AwAgBAAAvgQAIAkAAMAEACANAAC_BAAgDgAAwQQAIBEAAMIEACAUAADDBAAgFwAAxAQAIBgAAMUEACCvAgAAvQQAMLACAAA0ABCxAgAAvQQAMLICAQAAAAG4AkAA7wMAIbkCQADvAwAh8QIBAJ8EACH7AgEA7gMAIZcDAQDuAwAhrAMBAJ8EACGtA0AA7wMAIa4DAQCfBAAhrwMBAJ8EACGwAwAApwQAILEDAACnBAAgsgMBAO4DACGzAwEA7gMAIbQDAQCfBAAhtQMBAJ8EACG2AyAA_QMAIbcDAQCfBAAhAgAAAFEAICwAAKUIACACAAAAowgAICwAAKQIACAVrwIAAKIIADCwAgAAowgAELECAACiCAAwsgIBAO4DACG4AkAA7wMAIbkCQADvAwAh8QIBAJ8EACH7AgEA7gMAIZcDAQDuAwAhrAMBAJ8EACGtA0AA7wMAIa4DAQCfBAAhrwMBAJ8EACGwAwAApwQAILEDAACnBAAgsgMBAO4DACGzAwEA7gMAIbQDAQCfBAAhtQMBAJ8EACG2AyAA_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_QYAMAQzAACACAAwwwMAAIEIADDFAwAAgwgAIMkDAAD9BgAwBDMAAPcHADDDAwAA-AcAMMUDAAD6BwAgyQMAAPEGADAEMwAA7gcAMMMDAADvBwAwxQMAAPEHACDJAwAA8QYAMAQzAADlBwAwwwMAAOYHADDFAwAA6AcAIMkDAACJBwAwBDMAANwHADDDAwAA3QcAMMUDAADfBwAgyQMAANwGADADMwAA1wcAIMMDAADYBwAgyQMAAJUDACAEMwAAzgcAMMMDAADPBwAwxQMAANEHACDJAwAApQYAMAAAAAAAAAAAAAEWAACGBQAgAAAFAwAAhgUAIAUAANwIACAXAADZCAAgGQAAzwgAIBsAANEIACAQAwAAhgUAIAQAANAIACAJAADTCAAgDQAA2ggAIA4AANYIACARAADUCAAgFAAA1QgAIBcAANkIACAYAADXCAAg8QIAAPMEACCsAwAA8wQAIK4DAADzBAAgrwMAAPMEACC0AwAA8wQAILUDAADzBAAgtwMAAPMEACAEBgAAuAUAIAkAANMIACCQAwAA8wQAIJIDAADzBAAgAAQGAAC4BQAg8QIAAPMEACCAAwAA8wQAIIEDAADzBAAgB7ICAQAAAAG5AkAAAAABxgIBAAAAAZMDIAAAAAGlAwAAAKUDAqoDAACWBgAgqwNAAAAAAQWyAgEAAAABuAJAAAAAAbkCQAAAAAHFAgEAAAABlwMBAAAAAQqyAgEAAAABswIBAAAAAbUCQAAAAAG4AkAAAAABuQJAAAAAAcYCAQAAAAHuAgAAAKgDAqUDAAAApQMCpgMBAAAAAakDQAAAAAERsgIBAAAAAbgCQAAAAAG5AkAAAAAB8QIBAAAAAZcDAQAAAAGsAwEAAAABrQNAAAAAAa4DAQAAAAGvAwEAAAABsAMAALIHACCxAwAAswcAILIDAQAAAAGzAwEAAAABtAMBAAAAAbUDAQAAAAG2AyAAAAABtwMBAAAAAQ6yAgEAAAABuAJAAAAAAbkCQAAAAAHFAgEAAAAB2AICAAAAAe4CAAAAhQMC_AIBAAAAAYIDAQAAAAGDA0AAAAABhQNAAAAAAYcDAQAAAAGIAwIAAAABiQNAAAAAAYoDAQAAAAEMsgIBAAAAAbgCQAAAAAG5AkAAAAABxQIBAAAAAdsCAQAAAAHpAgEAAAAB6gJAAAAAAewCAAAA7AIC7gIAAADuAgLvAkAAAAAB8AIBAAAAAfECAQAAAAEMsgIBAAAAAbgCQAAAAAG5AkAAAAABxQIBAAAAAdsCAQAAAAHoAgEAAAAB6QIBAAAAAeoCQAAAAAHsAgAAAOwCAu4CAAAA7gIC7wJAAAAAAfECAQAAAAEKsgIBAAAAAbgCQAAAAAG5AkAAAAABxQIBAAAAAdsCAQAAAAHjAgAAAOMCAuQCAQAAAAHlAoAAAAAB5gIgAAAAAecCAQAAAAEKsgIBAAAAAbgCQAAAAAG5AkAAAAABxQIBAAAAAdsCAQAAAAHhAgEAAAAB4wIAAADjAgLkAgEAAAAB5QKAAAAAAeYCIAAAAAEPsgIBAAAAAbgCQAAAAAG5AkAAAAABxQIBAAAAAdsCAQAAAAHuAgAAAPgCAvECAQAAAAHyAgEAAAAB8wIBAAAAAfQCAQAAAAH1AgEAAAAB9gJAAAAAAfgCAgAAAAH5AiAAAAAB-gIBAAAAAQssgAAAAAGyAgEAAAABuAJAAAAAAcUCAQAAAAHaAgAAANoCAtsCAQAAAAHcAgEAAAAB3QIgAAAAAd4CQAAAAAHfAgEAAAAB4AIgAAAAAQmyAgEAAAABuAJAAAAAAcUCAQAAAAHGAgEAAAAByAIBAAAAAckCAQAAAAHKAgEAAAABywKAAAAAAcwCAQAAAAEYFwAAzggAIBgAAMwIACAcAADCCAAgHQAAwwgAIB4AAMQIACAgAADGCAAgIQAAxwgAICIAAMgIACAjAADJCAAgJAAAyggAICUAAMsIACAmAADNCAAgsgIBAAAAAbMCAQAAAAG4AkAAAAABuQJAAAAAAZMDIAAAAAGXAwEAAAABpQMAAAC6AwK1AwEAAAABuAMBAAAAAboDAQAAAAG7AyAAAAABvANAAAAAAQIAAAABACAzAADsCAAgBbICAQAAAAG4AkAAAAABuQJAAAAAAfsCAQAAAAGXAwEAAAABD7ICAQAAAAG4AkAAAAABuQJAAAAAAZcDAQAAAAGYAwEAAAABmQMBAAAAAZsDAAAAmwMCnAMBAAAAAZ0DAQAAAAGeAwEAAAABnwMBAAAAAaADAQAAAAGhAwEAAAABogMgAAAAAaMDAQAAAAEOsgIBAAAAAbgCQAAAAAG5AkAAAAAB2AICAAAAAe4CAAAAhQMC_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_AIBAPAEACGMAwAAzAWMAyKNAwAAzQUAII4DAADOBQAgjwNAAPEEACGQA0AAiwUAIZEDCAC0BQAhkgMBAPcEACGTAyAAgwUAIQ0GAADPBQAgsgIBAPAEACG4AkAA8QQAIbkCQADxBAAh_AIBAPAEACGMAwAAzAWMAyKNAwAAzQUAII4DAADOBQAgjwNAAPEEACGQA0AAiwUAIZEDCAC0BQAhkgMBAPcEACGTAyAAgwUAIQMAAAALACAzAACtCQAgNAAAugkAIBUAAAALACAFAADlBQAgCwAA5gUAIAwAAOgFACAsAAC6CQAgsgIBAPAEACG4AkAA8QQAIbkCQADxBAAhxQIBAPAEACGXAwEA8AQAIZgDAQD3BAAhmQMBAPcEACGbAwAA5AWbAyKcAwEA8AQAIZ0DAQDwBAAhngMBAPcEACGfAwEA9wQAIaADAQD3BAAhoQMBAPcEACGiAyAAgwUAIaMDAQD3BAAhEwUAAOUFACALAADmBQAgDAAA6AUAILICAQDwBAAhuAJAAPEEACG5AkAA8QQAIcUCAQDwBAAhlwMBAPAEACGYAwEA9wQAIZkDAQD3BAAhmwMAAOQFmwMinAMBAPAEACGdAwEA8AQAIZ4DAQD3BAAhnwMBAPcEACGgAwEA9wQAIaEDAQD3BAAhogMgAIMFACGjAwEA9wQAIRMFAACDBgAgCQAAhQYAIAsAAIQGACCyAgEAAAABuAJAAAAAAbkCQAAAAAHFAgEAAAABlwMBAAAAAZgDAQAAAAGZAwEAAAABmwMAAACbAwKcAwEAAAABnQMBAAAAAZ4DAQAAAAGfAwEAAAABoAMBAAAAAaEDAQAAAAGiAyAAAAABowMBAAAAAQIAAAANACAzAAC7CQAgAwAAAAsAIDMAALsJACA0AAC_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-wIBAAAAAZcDAQAAAAECAAAACQAgMwAA-QkAIBoDAAC0BwAgBAAAtQcAIAkAALcHACANAAC2BwAgDgAAuAcAIBEAALkHACAUAAC6BwAgGAAAvAcAILICAQAAAAG4AkAAAAABuQJAAAAAAfECAQAAAAH7AgEAAAABlwMBAAAAAawDAQAAAAGtA0AAAAABrgMBAAAAAa8DAQAAAAGwAwAAsgcAILEDAACzBwAgsgMBAAAAAbMDAQAAAAG0AwEAAAABtQMBAAAAAbYDIAAAAAG3AwEAAAABAgAAAFEAIDMAAPsJACADAAAAGAAgMwAA9wkAIDQAAP8JACAaAAAAGAAgGAAAywcAIBwAAMEHACAdAADCBwAgHgAAwwcAIB8AAMQHACAgAADFBwAgIQAAxgcAICIAAMcHACAjAADIBwAgJAAAyQcAICUAAMoHACAmAADMBwAgLAAA_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-cAQBgAwUABA_VAgEQ1gIBAwUABA_cAgEQ3QIBAwoAZzkAaDoAaQAAAAMKAGc5AGg6AGkDBQAEEgABE-8CAQMFAAQSAAET9QIBAwoAbjkAbzoAcAAAAAMKAG45AG86AHACBYcDBBYAAQIFjQMEFgABAwoAdTkAdjoAdwAAAAMKAHU5AHY6AHcBFgABARYAAQUKAHw5AH86AIABmwEAfZwBAH4AAAAAAAUKAHw5AH86AIABmwEAfZwBAH4DBbcDBBW4AwMWuQMBAwW_AwQVwAMDFsEDAQMKAIUBOQCGAToAhwEAAAADCgCFATkAhgE6AIcBAAAABQoAjQE5AJABOgCRAZsBAI4BnAEAjwEAAAAAAAUKAI0BOQCQAToAkQGbAQCOAZwBAI8BJwIBKGkBKWsBKmwBK20BLW8BLnEVL3IWMHQBMXYVMncXNXgBNnkBN3oVO30YPH4cPX8EPoABBD-BAQRAggEEQYMBBEKFAQRDhwEVRIgBHUWKAQRGjAEVR40BHkiOAQRJjwEESpABFUuTAR9MlAEjTZUBA06WAQNPlwEDUJgBA1GZAQNSmwEDU50BFVSeASRVoAEDVqIBFVejASVYpAEDWaUBA1qmARVbqQEmXKoBKl2rAQJerAECX60BAmCuAQJhrwECYrEBAmOzARVktAErZbYBAma4ARVnuQEsaLoBAmm7AQJqvAEVa78BLWzAATFtwQERbsIBEW_DARFwxAERccUBEXLHARFzyQEVdMoBMnXMARF2zgEVd88BM3jQARF50QERetIBFXvVATR81gE4fdcBBX7YAQV_2QEFgAHaAQWBAdsBBYIB3QEFgwHfARWEAeABOYUB4gEFhgHkARWHAeUBOogB5gEFiQHnAQWKAegBFYsB6wE7jAHsAT-NAe0BBo4B7gEGjwHvAQaQAfABBpEB8QEGkgHzAQaTAfUBFZQB9gFAlQH4AQaWAfoBFZcB-wFBmAH8AQaZAf0BBpoB_gEVnQGBAkKeAYICSJ8BgwIHoAGEAgehAYUCB6IBhgIHowGHAgekAYkCB6UBiwIVpgGMAkmnAZACB6gBkgIVqQGTAkqqAZYCB6sBlwIHrAGYAhWtAZsCS64BnAJRrwGeAgmwAZ8CCbEBoQIJsgGiAgmzAaMCCbQBpQIJtQGnAhW2AagCUrcBqgIJuAGsAhW5Aa0CU7oBrgIJuwGvAgm8AbACFb0BswJUvgG0Alq_AbUCC8ABtgILwQG3AgvCAbgCC8MBuQILxAG7AgvFAb0CFcYBvgJbxwHAAgvIAcICFckBwwJcygHEAgvLAcUCC8wBxgIVzQHJAl3OAcoCY88BywIM0AHMAgzRAc0CDNIBzgIM0wHPAgzUAdECDNUB0wIV1gHUAmTXAdgCDNgB2gIV2QHbAmXaAd4CDNsB3wIM3AHgAhXdAeMCZt4B5AJq3wHlAg3gAeYCDeEB5wIN4gHoAg3jAekCDeQB6wIN5QHtAhXmAe4Ca-cB8QIN6AHzAhXpAfQCbOoB9gIN6wH3Ag3sAfgCFe0B-wJt7gH8AnHvAf0CD_AB_gIP8QH_Ag_yAYADD_MBgQMP9AGDAw_1AYUDFfYBhgNy9wGJAw_4AYsDFfkBjANz-gGOAw_7AY8DD_wBkAMV_QGTA3T-AZQDeP8BlgMTgAKXAxOBApkDE4ICmgMTgwKbAxOEAp0DE4UCnwMVhgKgA3mHAqIDE4gCpAMViQKlA3qKAqYDE4sCpwMTjAKoAxWNAqsDe44CrAOBAY8CrQMOkAKuAw6RAq8DDpICsAMOkwKxAw6UArMDDpUCtQMVlgK2A4IBlwK7Aw6YAr0DFZkCvgODAZoCwgMOmwLDAw6cAsQDFZ0CxwOEAZ4CyAOIAZ8CygOJAaACywOJAaECzgOJAaICzwOJAaMC0AOJAaQC0gOJAaUC1AMVpgLVA4oBpwLXA4kBqALZAxWpAtoDiwGqAtsDiQGrAtwDiQGsAt0DFa0C4AOMAa4C4QOSAQ"
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
  console.log("\u2705 CareNest database seeded successfully with all demo accounts and multi-patient profiles!");
}
main().catch((e) => {
  console.error("\u274C Seed error:", e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
