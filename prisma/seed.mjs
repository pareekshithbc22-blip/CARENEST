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
  "inlineSchema": 'generator client {\n  provider = "prisma-client"\n  output   = "../generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\nenum UserRole {\n  SENIOR\n  FAMILY\n  CARETAKER\n  ADMIN\n}\n\nenum CircleRole {\n  ADMIN\n  FAMILY_MEMBER\n  CARETAKER\n  SENIOR\n}\n\nenum InvitationStatus {\n  PENDING\n  ACCEPTED\n  EXPIRED\n  REVOKED\n}\n\nenum DoseStatus {\n  SCHEDULED\n  TAKEN\n  MISSED\n  SKIPPED\n  UNCONFIRMED\n}\n\nenum ScheduleFrequency {\n  DAILY\n  SPECIFIC_DAYS\n  AS_NEEDED\n  WEEKLY\n}\n\nenum MedicationForm {\n  TABLET\n  CAPSULE\n  SYRUP\n  INJECTION\n  DROPS\n  INHALER\n  TOPICAL\n  OTHER\n}\n\nenum AppointmentStatus {\n  UPCOMING\n  COMPLETED\n  CANCELLED\n  RESCHEDULED\n}\n\nenum TaskPriority {\n  LOW\n  MEDIUM\n  HIGH\n  URGENT\n}\n\nenum TaskStatus {\n  PENDING\n  IN_PROGRESS\n  COMPLETED\n  CANCELLED\n}\n\nenum NoteCategory {\n  GENERAL\n  OBSERVATION\n  MOOD\n  HEALTH_UPDATE\n  HANDOVER\n  INCIDENT\n}\n\nenum NotificationType {\n  MEDICATION_REMINDER\n  MISSED_DOSE_ALERT\n  ESCALATION_WARNING\n  APPOINTMENT_REMINDER\n  CARE_TASK_ASSIGNED\n  REFILL_ALERT\n  SYSTEM\n}\n\nmodel User {\n  id           String   @id @default(uuid())\n  email        String   @unique\n  name         String\n  passwordHash String\n  role         UserRole @default(FAMILY)\n  phoneNumber  String?\n  avatarUrl    String?\n  isActive     Boolean  @default(true)\n  createdAt    DateTime @default(now())\n  updatedAt    DateTime @updatedAt\n\n  // Relationships\n  circleMemberships      CareCircleMember[]\n  createdCircles         CareCircle[]            @relation("CreatedCircles")\n  sentInvitations        CareCircleInvitation[]  @relation("SentInvitations")\n  elderlyProfilesCreated ElderlyProfile[]        @relation("CreatedProfiles")\n  confirmedDoses         ScheduledDose[]         @relation("ConfirmedBy")\n  assignedTasks          CareTask[]              @relation("AssignedTo")\n  completedTasks         CareTask[]              @relation("CompletedBy")\n  authoredNotes          CareNote[]              @relation("AuthoredNotes")\n  handoverNotesReceived  CareNote[]              @relation("HandoverTo")\n  createdAppointments    Appointment[]           @relation("CreatedAppointments")\n  notifications          Notification[]\n  notificationPref       NotificationPreference?\n  auditLogs              AuditLog[]\n\n  @@index([email])\n}\n\nmodel ElderlyProfile {\n  id                       String   @id @default(uuid())\n  name                     String\n  preferredName            String?\n  dateOfBirth              DateTime\n  gender                   String?\n  bloodGroup               String?\n  allergies                String[] @default([])\n  medicalConditions        String[] @default([])\n  emergencyContactName     String\n  emergencyContactPhone    String\n  emergencyContactRelation String?\n  notes                    String?\n  avatarUrl                String?\n  isSeniorModeActive       Boolean  @default(false)\n  seniorPin                String? // Hashed 4-digit PIN for rapid simplified senior check-in\n  createdById              String\n  createdBy                User     @relation("CreatedProfiles", fields: [createdById], references: [id], onDelete: Cascade)\n  createdAt                DateTime @default(now())\n  updatedAt                DateTime @updatedAt\n\n  careCircles    CareCircle[]\n  medications    Medication[]\n  scheduledDoses ScheduledDose[]\n  appointments   Appointment[]\n  careTasks      CareTask[]\n  careNotes      CareNote[]\n  auditLogs      AuditLog[]\n  notifications  Notification[]\n\n  @@index([createdById])\n}\n\nmodel CareCircle {\n  id               String         @id @default(uuid())\n  name             String\n  elderlyProfileId String\n  elderlyProfile   ElderlyProfile @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  createdById      String\n  createdBy        User           @relation("CreatedCircles", fields: [createdById], references: [id], onDelete: Cascade)\n  createdAt        DateTime       @default(now())\n  updatedAt        DateTime       @updatedAt\n\n  members     CareCircleMember[]\n  invitations CareCircleInvitation[]\n  auditLogs   AuditLog[]\n\n  @@index([elderlyProfileId])\n  @@index([createdById])\n}\n\nmodel CareCircleMember {\n  id           String     @id @default(uuid())\n  careCircleId String\n  careCircle   CareCircle @relation(fields: [careCircleId], references: [id], onDelete: Cascade)\n  userId       String\n  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)\n  role         CircleRole @default(FAMILY_MEMBER)\n  permissions  String[]   @default(["CAN_VIEW_RECORDS", "CAN_CONFIRM_DOSE"])\n  isActive     Boolean    @default(true)\n  joinedAt     DateTime   @default(now())\n  updatedAt    DateTime   @updatedAt\n\n  @@unique([careCircleId, userId])\n  @@index([careCircleId])\n  @@index([userId])\n}\n\nmodel CareCircleInvitation {\n  id           String           @id @default(uuid())\n  careCircleId String\n  careCircle   CareCircle       @relation(fields: [careCircleId], references: [id], onDelete: Cascade)\n  email        String\n  role         CircleRole       @default(FAMILY_MEMBER)\n  token        String           @unique\n  status       InvitationStatus @default(PENDING)\n  invitedById  String\n  invitedBy    User             @relation("SentInvitations", fields: [invitedById], references: [id], onDelete: Cascade)\n  expiresAt    DateTime\n  acceptedAt   DateTime?\n  createdAt    DateTime         @default(now())\n  updatedAt    DateTime         @updatedAt\n\n  @@index([token])\n  @@index([email])\n  @@index([careCircleId])\n}\n\nmodel Medication {\n  id                 String         @id @default(uuid())\n  elderlyProfileId   String\n  elderlyProfile     ElderlyProfile @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  name               String\n  brandName          String?\n  genericName        String?\n  form               MedicationForm @default(TABLET)\n  strength           String // e.g. "500 mg", "10 ml"\n  dosageInstructions String // e.g. "Take 1 tablet after food with water"\n  prescribingDoctor  String?\n  prescribingClinic  String?\n  rxNumber           String?\n  purpose            String? // e.g. "Hypertension", "Type 2 Diabetes"\n  isArchived         Boolean        @default(false)\n  discontinuedReason String?\n  createdAt          DateTime       @default(now())\n  updatedAt          DateTime       @updatedAt\n\n  schedules      MedicationSchedule[]\n  scheduledDoses ScheduledDose[]\n  stock          MedicationStock?\n\n  @@index([elderlyProfileId])\n  @@index([isArchived])\n}\n\nmodel MedicationSchedule {\n  id             String            @id @default(uuid())\n  medicationId   String\n  medication     Medication        @relation(fields: [medicationId], references: [id], onDelete: Cascade)\n  frequency      ScheduleFrequency @default(DAILY)\n  timesOfDay     String[] // e.g. ["08:00", "20:00"]\n  daysOfWeek     Int[]             @default([0, 1, 2, 3, 4, 5, 6]) // 0=Sunday\n  startDate      DateTime          @default(now())\n  endDate        DateTime?\n  dosageQuantity Float             @default(1.0)\n  instructions   String?\n  isActive       Boolean           @default(true)\n  createdAt      DateTime          @default(now())\n  updatedAt      DateTime          @updatedAt\n\n  scheduledDoses ScheduledDose[]\n\n  @@index([medicationId])\n}\n\nmodel ScheduledDose {\n  id                 String              @id @default(uuid())\n  medicationId       String\n  medication         Medication          @relation(fields: [medicationId], references: [id], onDelete: Cascade)\n  scheduleId         String?\n  schedule           MedicationSchedule? @relation(fields: [scheduleId], references: [id], onDelete: SetNull)\n  elderlyProfileId   String\n  elderlyProfile     ElderlyProfile      @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  scheduledAt        DateTime\n  status             DoseStatus          @default(SCHEDULED)\n  confirmedAt        DateTime?\n  confirmedById      String?\n  confirmedBy        User?               @relation("ConfirmedBy", fields: [confirmedById], references: [id], onDelete: SetNull)\n  confirmationNotes  String?\n  gracePeriodMinutes Int                 @default(45)\n  escalationLevel    Int                 @default(0) // 0: None, 1: Caretaker notified, 2: Family escalation\n  escalatedAt        DateTime?\n  idempotencyKey     String?             @unique\n  createdAt          DateTime            @default(now())\n  updatedAt          DateTime            @updatedAt\n\n  @@index([elderlyProfileId, scheduledAt])\n  @@index([status, scheduledAt])\n  @@index([medicationId])\n}\n\nmodel MedicationStock {\n  id              String     @id @default(uuid())\n  medicationId    String     @unique\n  medication      Medication @relation(fields: [medicationId], references: [id], onDelete: Cascade)\n  currentStock    Float      @default(0)\n  unit            String     @default("tablets") // tablets, capsules, ml, sprays\n  refillThreshold Float      @default(10)\n  packageSize     Float?\n  lastRefillDate  DateTime?\n  notes           String?\n  createdAt       DateTime   @default(now())\n  updatedAt       DateTime   @updatedAt\n\n  @@index([medicationId])\n}\n\nmodel Appointment {\n  id                    String            @id @default(uuid())\n  elderlyProfileId      String\n  elderlyProfile        ElderlyProfile    @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  title                 String\n  doctorName            String\n  specialty             String?\n  clinicName            String\n  locationAddress       String?\n  appointmentDate       DateTime\n  status                AppointmentStatus @default(UPCOMING)\n  reminderMinutesBefore Int               @default(1440) // 24 hours\n  reminderSent          Boolean           @default(false)\n  notes                 String?\n  outcomeSummary        String?\n  createdById           String\n  createdBy             User              @relation("CreatedAppointments", fields: [createdById], references: [id], onDelete: Cascade)\n  createdAt             DateTime          @default(now())\n  updatedAt             DateTime          @updatedAt\n\n  @@index([elderlyProfileId, appointmentDate])\n  @@index([status])\n}\n\nmodel CareTask {\n  id               String         @id @default(uuid())\n  elderlyProfileId String\n  elderlyProfile   ElderlyProfile @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  assignedToId     String?\n  assignedTo       User?          @relation("AssignedTo", fields: [assignedToId], references: [id], onDelete: SetNull)\n  title            String\n  description      String?\n  dueDate          DateTime\n  priority         TaskPriority   @default(MEDIUM)\n  status           TaskStatus     @default(PENDING)\n  completedAt      DateTime?\n  completedById    String?\n  completedBy      User?          @relation("CompletedBy", fields: [completedById], references: [id], onDelete: SetNull)\n  notes            String?\n  createdAt        DateTime       @default(now())\n  updatedAt        DateTime       @updatedAt\n\n  @@index([elderlyProfileId, dueDate])\n  @@index([assignedToId, status])\n}\n\nmodel CareNote {\n  id                String         @id @default(uuid())\n  elderlyProfileId  String\n  elderlyProfile    ElderlyProfile @relation(fields: [elderlyProfileId], references: [id], onDelete: Cascade)\n  authorId          String\n  author            User           @relation("AuthoredNotes", fields: [authorId], references: [id], onDelete: Cascade)\n  category          NoteCategory   @default(GENERAL)\n  title             String\n  content           String\n  vitalSigns        Json? // { bp: "120/80", pulse: 72, sugar: 110, temp: 98.6 }\n  isPinned          Boolean        @default(false)\n  shiftHandoverToId String?\n  shiftHandoverTo   User?          @relation("HandoverTo", fields: [shiftHandoverToId], references: [id], onDelete: SetNull)\n  createdAt         DateTime       @default(now())\n  updatedAt         DateTime       @updatedAt\n\n  @@index([elderlyProfileId, createdAt])\n  @@index([category])\n}\n\nmodel Notification {\n  id               String           @id @default(uuid())\n  userId           String\n  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)\n  elderlyProfileId String?\n  elderlyProfile   ElderlyProfile?  @relation(fields: [elderlyProfileId], references: [id], onDelete: SetNull)\n  type             NotificationType\n  title            String\n  message          String\n  data             Json?\n  isRead           Boolean          @default(false)\n  readAt           DateTime?\n  deliveryStatus   String           @default("SENT") // SENT, FAILED\n  emailSent        Boolean          @default(false)\n  createdAt        DateTime         @default(now())\n\n  @@index([userId, isRead])\n  @@index([createdAt])\n}\n\nmodel NotificationPreference {\n  id                   String   @id @default(uuid())\n  userId               String   @unique\n  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  emailReminders       Boolean  @default(true)\n  missedDoseAlerts     Boolean  @default(true)\n  escalationAlerts     Boolean  @default(true)\n  appointmentReminders Boolean  @default(true)\n  dailySummaryEmail    Boolean  @default(false)\n  gracePeriodMinutes   Int      @default(45)\n  updatedAt            DateTime @updatedAt\n}\n\nmodel AuditLog {\n  id               String          @id @default(uuid())\n  elderlyProfileId String?\n  elderlyProfile   ElderlyProfile? @relation(fields: [elderlyProfileId], references: [id], onDelete: SetNull)\n  careCircleId     String?\n  careCircle       CareCircle?     @relation(fields: [careCircleId], references: [id], onDelete: SetNull)\n  userId           String?\n  user             User?           @relation(fields: [userId], references: [id], onDelete: SetNull)\n  action           String // e.g. DOSE_CONFIRMED, MEDICATION_CREATED, ACCESS_REVOKED\n  entityType       String // Dose, Medication, CareCircle, Member\n  entityId         String?\n  details          Json?\n  ipAddress        String?\n  createdAt        DateTime        @default(now())\n\n  @@index([elderlyProfileId, createdAt])\n  @@index([action])\n}\n',
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
config.runtimeDataModel = JSON.parse('{"models":{"User":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"passwordHash","kind":"scalar","type":"String"},{"name":"role","kind":"enum","type":"UserRole"},{"name":"phoneNumber","kind":"scalar","type":"String"},{"name":"avatarUrl","kind":"scalar","type":"String"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"circleMemberships","kind":"object","type":"CareCircleMember","relationName":"CareCircleMemberToUser"},{"name":"createdCircles","kind":"object","type":"CareCircle","relationName":"CreatedCircles"},{"name":"sentInvitations","kind":"object","type":"CareCircleInvitation","relationName":"SentInvitations"},{"name":"elderlyProfilesCreated","kind":"object","type":"ElderlyProfile","relationName":"CreatedProfiles"},{"name":"confirmedDoses","kind":"object","type":"ScheduledDose","relationName":"ConfirmedBy"},{"name":"assignedTasks","kind":"object","type":"CareTask","relationName":"AssignedTo"},{"name":"completedTasks","kind":"object","type":"CareTask","relationName":"CompletedBy"},{"name":"authoredNotes","kind":"object","type":"CareNote","relationName":"AuthoredNotes"},{"name":"handoverNotesReceived","kind":"object","type":"CareNote","relationName":"HandoverTo"},{"name":"createdAppointments","kind":"object","type":"Appointment","relationName":"CreatedAppointments"},{"name":"notifications","kind":"object","type":"Notification","relationName":"NotificationToUser"},{"name":"notificationPref","kind":"object","type":"NotificationPreference","relationName":"NotificationPreferenceToUser"},{"name":"auditLogs","kind":"object","type":"AuditLog","relationName":"AuditLogToUser"}],"dbName":null,"schema":null},"ElderlyProfile":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"preferredName","kind":"scalar","type":"String"},{"name":"dateOfBirth","kind":"scalar","type":"DateTime"},{"name":"gender","kind":"scalar","type":"String"},{"name":"bloodGroup","kind":"scalar","type":"String"},{"name":"allergies","kind":"scalar","type":"String"},{"name":"medicalConditions","kind":"scalar","type":"String"},{"name":"emergencyContactName","kind":"scalar","type":"String"},{"name":"emergencyContactPhone","kind":"scalar","type":"String"},{"name":"emergencyContactRelation","kind":"scalar","type":"String"},{"name":"notes","kind":"scalar","type":"String"},{"name":"avatarUrl","kind":"scalar","type":"String"},{"name":"isSeniorModeActive","kind":"scalar","type":"Boolean"},{"name":"seniorPin","kind":"scalar","type":"String"},{"name":"createdById","kind":"scalar","type":"String"},{"name":"createdBy","kind":"object","type":"User","relationName":"CreatedProfiles"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"careCircles","kind":"object","type":"CareCircle","relationName":"CareCircleToElderlyProfile"},{"name":"medications","kind":"object","type":"Medication","relationName":"ElderlyProfileToMedication"},{"name":"scheduledDoses","kind":"object","type":"ScheduledDose","relationName":"ElderlyProfileToScheduledDose"},{"name":"appointments","kind":"object","type":"Appointment","relationName":"AppointmentToElderlyProfile"},{"name":"careTasks","kind":"object","type":"CareTask","relationName":"CareTaskToElderlyProfile"},{"name":"careNotes","kind":"object","type":"CareNote","relationName":"CareNoteToElderlyProfile"},{"name":"auditLogs","kind":"object","type":"AuditLog","relationName":"AuditLogToElderlyProfile"},{"name":"notifications","kind":"object","type":"Notification","relationName":"ElderlyProfileToNotification"}],"dbName":null,"schema":null},"CareCircle":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"CareCircleToElderlyProfile"},{"name":"createdById","kind":"scalar","type":"String"},{"name":"createdBy","kind":"object","type":"User","relationName":"CreatedCircles"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"members","kind":"object","type":"CareCircleMember","relationName":"CareCircleToCareCircleMember"},{"name":"invitations","kind":"object","type":"CareCircleInvitation","relationName":"CareCircleToCareCircleInvitation"},{"name":"auditLogs","kind":"object","type":"AuditLog","relationName":"AuditLogToCareCircle"}],"dbName":null,"schema":null},"CareCircleMember":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"careCircleId","kind":"scalar","type":"String"},{"name":"careCircle","kind":"object","type":"CareCircle","relationName":"CareCircleToCareCircleMember"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"CareCircleMemberToUser"},{"name":"role","kind":"enum","type":"CircleRole"},{"name":"permissions","kind":"scalar","type":"String"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"joinedAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"CareCircleInvitation":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"careCircleId","kind":"scalar","type":"String"},{"name":"careCircle","kind":"object","type":"CareCircle","relationName":"CareCircleToCareCircleInvitation"},{"name":"email","kind":"scalar","type":"String"},{"name":"role","kind":"enum","type":"CircleRole"},{"name":"token","kind":"scalar","type":"String"},{"name":"status","kind":"enum","type":"InvitationStatus"},{"name":"invitedById","kind":"scalar","type":"String"},{"name":"invitedBy","kind":"object","type":"User","relationName":"SentInvitations"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"acceptedAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"Medication":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"ElderlyProfileToMedication"},{"name":"name","kind":"scalar","type":"String"},{"name":"brandName","kind":"scalar","type":"String"},{"name":"genericName","kind":"scalar","type":"String"},{"name":"form","kind":"enum","type":"MedicationForm"},{"name":"strength","kind":"scalar","type":"String"},{"name":"dosageInstructions","kind":"scalar","type":"String"},{"name":"prescribingDoctor","kind":"scalar","type":"String"},{"name":"prescribingClinic","kind":"scalar","type":"String"},{"name":"rxNumber","kind":"scalar","type":"String"},{"name":"purpose","kind":"scalar","type":"String"},{"name":"isArchived","kind":"scalar","type":"Boolean"},{"name":"discontinuedReason","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"schedules","kind":"object","type":"MedicationSchedule","relationName":"MedicationToMedicationSchedule"},{"name":"scheduledDoses","kind":"object","type":"ScheduledDose","relationName":"MedicationToScheduledDose"},{"name":"stock","kind":"object","type":"MedicationStock","relationName":"MedicationToMedicationStock"}],"dbName":null,"schema":null},"MedicationSchedule":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"medicationId","kind":"scalar","type":"String"},{"name":"medication","kind":"object","type":"Medication","relationName":"MedicationToMedicationSchedule"},{"name":"frequency","kind":"enum","type":"ScheduleFrequency"},{"name":"timesOfDay","kind":"scalar","type":"String"},{"name":"daysOfWeek","kind":"scalar","type":"Int"},{"name":"startDate","kind":"scalar","type":"DateTime"},{"name":"endDate","kind":"scalar","type":"DateTime"},{"name":"dosageQuantity","kind":"scalar","type":"Float"},{"name":"instructions","kind":"scalar","type":"String"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"},{"name":"scheduledDoses","kind":"object","type":"ScheduledDose","relationName":"MedicationScheduleToScheduledDose"}],"dbName":null,"schema":null},"ScheduledDose":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"medicationId","kind":"scalar","type":"String"},{"name":"medication","kind":"object","type":"Medication","relationName":"MedicationToScheduledDose"},{"name":"scheduleId","kind":"scalar","type":"String"},{"name":"schedule","kind":"object","type":"MedicationSchedule","relationName":"MedicationScheduleToScheduledDose"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"ElderlyProfileToScheduledDose"},{"name":"scheduledAt","kind":"scalar","type":"DateTime"},{"name":"status","kind":"enum","type":"DoseStatus"},{"name":"confirmedAt","kind":"scalar","type":"DateTime"},{"name":"confirmedById","kind":"scalar","type":"String"},{"name":"confirmedBy","kind":"object","type":"User","relationName":"ConfirmedBy"},{"name":"confirmationNotes","kind":"scalar","type":"String"},{"name":"gracePeriodMinutes","kind":"scalar","type":"Int"},{"name":"escalationLevel","kind":"scalar","type":"Int"},{"name":"escalatedAt","kind":"scalar","type":"DateTime"},{"name":"idempotencyKey","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"MedicationStock":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"medicationId","kind":"scalar","type":"String"},{"name":"medication","kind":"object","type":"Medication","relationName":"MedicationToMedicationStock"},{"name":"currentStock","kind":"scalar","type":"Float"},{"name":"unit","kind":"scalar","type":"String"},{"name":"refillThreshold","kind":"scalar","type":"Float"},{"name":"packageSize","kind":"scalar","type":"Float"},{"name":"lastRefillDate","kind":"scalar","type":"DateTime"},{"name":"notes","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"Appointment":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"AppointmentToElderlyProfile"},{"name":"title","kind":"scalar","type":"String"},{"name":"doctorName","kind":"scalar","type":"String"},{"name":"specialty","kind":"scalar","type":"String"},{"name":"clinicName","kind":"scalar","type":"String"},{"name":"locationAddress","kind":"scalar","type":"String"},{"name":"appointmentDate","kind":"scalar","type":"DateTime"},{"name":"status","kind":"enum","type":"AppointmentStatus"},{"name":"reminderMinutesBefore","kind":"scalar","type":"Int"},{"name":"reminderSent","kind":"scalar","type":"Boolean"},{"name":"notes","kind":"scalar","type":"String"},{"name":"outcomeSummary","kind":"scalar","type":"String"},{"name":"createdById","kind":"scalar","type":"String"},{"name":"createdBy","kind":"object","type":"User","relationName":"CreatedAppointments"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"CareTask":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"CareTaskToElderlyProfile"},{"name":"assignedToId","kind":"scalar","type":"String"},{"name":"assignedTo","kind":"object","type":"User","relationName":"AssignedTo"},{"name":"title","kind":"scalar","type":"String"},{"name":"description","kind":"scalar","type":"String"},{"name":"dueDate","kind":"scalar","type":"DateTime"},{"name":"priority","kind":"enum","type":"TaskPriority"},{"name":"status","kind":"enum","type":"TaskStatus"},{"name":"completedAt","kind":"scalar","type":"DateTime"},{"name":"completedById","kind":"scalar","type":"String"},{"name":"completedBy","kind":"object","type":"User","relationName":"CompletedBy"},{"name":"notes","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"CareNote":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"CareNoteToElderlyProfile"},{"name":"authorId","kind":"scalar","type":"String"},{"name":"author","kind":"object","type":"User","relationName":"AuthoredNotes"},{"name":"category","kind":"enum","type":"NoteCategory"},{"name":"title","kind":"scalar","type":"String"},{"name":"content","kind":"scalar","type":"String"},{"name":"vitalSigns","kind":"scalar","type":"Json"},{"name":"isPinned","kind":"scalar","type":"Boolean"},{"name":"shiftHandoverToId","kind":"scalar","type":"String"},{"name":"shiftHandoverTo","kind":"object","type":"User","relationName":"HandoverTo"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"Notification":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"NotificationToUser"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"ElderlyProfileToNotification"},{"name":"type","kind":"enum","type":"NotificationType"},{"name":"title","kind":"scalar","type":"String"},{"name":"message","kind":"scalar","type":"String"},{"name":"data","kind":"scalar","type":"Json"},{"name":"isRead","kind":"scalar","type":"Boolean"},{"name":"readAt","kind":"scalar","type":"DateTime"},{"name":"deliveryStatus","kind":"scalar","type":"String"},{"name":"emailSent","kind":"scalar","type":"Boolean"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"NotificationPreference":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"NotificationPreferenceToUser"},{"name":"emailReminders","kind":"scalar","type":"Boolean"},{"name":"missedDoseAlerts","kind":"scalar","type":"Boolean"},{"name":"escalationAlerts","kind":"scalar","type":"Boolean"},{"name":"appointmentReminders","kind":"scalar","type":"Boolean"},{"name":"dailySummaryEmail","kind":"scalar","type":"Boolean"},{"name":"gracePeriodMinutes","kind":"scalar","type":"Int"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null},"AuditLog":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"elderlyProfileId","kind":"scalar","type":"String"},{"name":"elderlyProfile","kind":"object","type":"ElderlyProfile","relationName":"AuditLogToElderlyProfile"},{"name":"careCircleId","kind":"scalar","type":"String"},{"name":"careCircle","kind":"object","type":"CareCircle","relationName":"AuditLogToCareCircle"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"AuditLogToUser"},{"name":"action","kind":"scalar","type":"String"},{"name":"entityType","kind":"scalar","type":"String"},{"name":"entityId","kind":"scalar","type":"String"},{"name":"details","kind":"scalar","type":"Json"},{"name":"ipAddress","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":null,"schema":null}},"enums":{},"types":{}}');
config.parameterizationSchema = {
  strings: JSON.parse('["where","orderBy","cursor","createdBy","careCircles","elderlyProfile","medication","schedule","confirmedBy","scheduledDoses","_count","schedules","stock","medications","appointments","assignedTo","completedBy","careTasks","author","shiftHandoverTo","careNotes","careCircle","user","auditLogs","notifications","members","invitedBy","invitations","circleMemberships","createdCircles","sentInvitations","elderlyProfilesCreated","confirmedDoses","assignedTasks","completedTasks","authoredNotes","handoverNotesReceived","createdAppointments","notificationPref","User.findUnique","User.findUniqueOrThrow","User.findFirst","User.findFirstOrThrow","User.findMany","data","User.createOne","User.createMany","User.createManyAndReturn","User.updateOne","User.updateMany","User.updateManyAndReturn","create","update","User.upsertOne","User.deleteOne","User.deleteMany","having","_min","_max","User.groupBy","User.aggregate","ElderlyProfile.findUnique","ElderlyProfile.findUniqueOrThrow","ElderlyProfile.findFirst","ElderlyProfile.findFirstOrThrow","ElderlyProfile.findMany","ElderlyProfile.createOne","ElderlyProfile.createMany","ElderlyProfile.createManyAndReturn","ElderlyProfile.updateOne","ElderlyProfile.updateMany","ElderlyProfile.updateManyAndReturn","ElderlyProfile.upsertOne","ElderlyProfile.deleteOne","ElderlyProfile.deleteMany","ElderlyProfile.groupBy","ElderlyProfile.aggregate","CareCircle.findUnique","CareCircle.findUniqueOrThrow","CareCircle.findFirst","CareCircle.findFirstOrThrow","CareCircle.findMany","CareCircle.createOne","CareCircle.createMany","CareCircle.createManyAndReturn","CareCircle.updateOne","CareCircle.updateMany","CareCircle.updateManyAndReturn","CareCircle.upsertOne","CareCircle.deleteOne","CareCircle.deleteMany","CareCircle.groupBy","CareCircle.aggregate","CareCircleMember.findUnique","CareCircleMember.findUniqueOrThrow","CareCircleMember.findFirst","CareCircleMember.findFirstOrThrow","CareCircleMember.findMany","CareCircleMember.createOne","CareCircleMember.createMany","CareCircleMember.createManyAndReturn","CareCircleMember.updateOne","CareCircleMember.updateMany","CareCircleMember.updateManyAndReturn","CareCircleMember.upsertOne","CareCircleMember.deleteOne","CareCircleMember.deleteMany","CareCircleMember.groupBy","CareCircleMember.aggregate","CareCircleInvitation.findUnique","CareCircleInvitation.findUniqueOrThrow","CareCircleInvitation.findFirst","CareCircleInvitation.findFirstOrThrow","CareCircleInvitation.findMany","CareCircleInvitation.createOne","CareCircleInvitation.createMany","CareCircleInvitation.createManyAndReturn","CareCircleInvitation.updateOne","CareCircleInvitation.updateMany","CareCircleInvitation.updateManyAndReturn","CareCircleInvitation.upsertOne","CareCircleInvitation.deleteOne","CareCircleInvitation.deleteMany","CareCircleInvitation.groupBy","CareCircleInvitation.aggregate","Medication.findUnique","Medication.findUniqueOrThrow","Medication.findFirst","Medication.findFirstOrThrow","Medication.findMany","Medication.createOne","Medication.createMany","Medication.createManyAndReturn","Medication.updateOne","Medication.updateMany","Medication.updateManyAndReturn","Medication.upsertOne","Medication.deleteOne","Medication.deleteMany","Medication.groupBy","Medication.aggregate","MedicationSchedule.findUnique","MedicationSchedule.findUniqueOrThrow","MedicationSchedule.findFirst","MedicationSchedule.findFirstOrThrow","MedicationSchedule.findMany","MedicationSchedule.createOne","MedicationSchedule.createMany","MedicationSchedule.createManyAndReturn","MedicationSchedule.updateOne","MedicationSchedule.updateMany","MedicationSchedule.updateManyAndReturn","MedicationSchedule.upsertOne","MedicationSchedule.deleteOne","MedicationSchedule.deleteMany","_avg","_sum","MedicationSchedule.groupBy","MedicationSchedule.aggregate","ScheduledDose.findUnique","ScheduledDose.findUniqueOrThrow","ScheduledDose.findFirst","ScheduledDose.findFirstOrThrow","ScheduledDose.findMany","ScheduledDose.createOne","ScheduledDose.createMany","ScheduledDose.createManyAndReturn","ScheduledDose.updateOne","ScheduledDose.updateMany","ScheduledDose.updateManyAndReturn","ScheduledDose.upsertOne","ScheduledDose.deleteOne","ScheduledDose.deleteMany","ScheduledDose.groupBy","ScheduledDose.aggregate","MedicationStock.findUnique","MedicationStock.findUniqueOrThrow","MedicationStock.findFirst","MedicationStock.findFirstOrThrow","MedicationStock.findMany","MedicationStock.createOne","MedicationStock.createMany","MedicationStock.createManyAndReturn","MedicationStock.updateOne","MedicationStock.updateMany","MedicationStock.updateManyAndReturn","MedicationStock.upsertOne","MedicationStock.deleteOne","MedicationStock.deleteMany","MedicationStock.groupBy","MedicationStock.aggregate","Appointment.findUnique","Appointment.findUniqueOrThrow","Appointment.findFirst","Appointment.findFirstOrThrow","Appointment.findMany","Appointment.createOne","Appointment.createMany","Appointment.createManyAndReturn","Appointment.updateOne","Appointment.updateMany","Appointment.updateManyAndReturn","Appointment.upsertOne","Appointment.deleteOne","Appointment.deleteMany","Appointment.groupBy","Appointment.aggregate","CareTask.findUnique","CareTask.findUniqueOrThrow","CareTask.findFirst","CareTask.findFirstOrThrow","CareTask.findMany","CareTask.createOne","CareTask.createMany","CareTask.createManyAndReturn","CareTask.updateOne","CareTask.updateMany","CareTask.updateManyAndReturn","CareTask.upsertOne","CareTask.deleteOne","CareTask.deleteMany","CareTask.groupBy","CareTask.aggregate","CareNote.findUnique","CareNote.findUniqueOrThrow","CareNote.findFirst","CareNote.findFirstOrThrow","CareNote.findMany","CareNote.createOne","CareNote.createMany","CareNote.createManyAndReturn","CareNote.updateOne","CareNote.updateMany","CareNote.updateManyAndReturn","CareNote.upsertOne","CareNote.deleteOne","CareNote.deleteMany","CareNote.groupBy","CareNote.aggregate","Notification.findUnique","Notification.findUniqueOrThrow","Notification.findFirst","Notification.findFirstOrThrow","Notification.findMany","Notification.createOne","Notification.createMany","Notification.createManyAndReturn","Notification.updateOne","Notification.updateMany","Notification.updateManyAndReturn","Notification.upsertOne","Notification.deleteOne","Notification.deleteMany","Notification.groupBy","Notification.aggregate","NotificationPreference.findUnique","NotificationPreference.findUniqueOrThrow","NotificationPreference.findFirst","NotificationPreference.findFirstOrThrow","NotificationPreference.findMany","NotificationPreference.createOne","NotificationPreference.createMany","NotificationPreference.createManyAndReturn","NotificationPreference.updateOne","NotificationPreference.updateMany","NotificationPreference.updateManyAndReturn","NotificationPreference.upsertOne","NotificationPreference.deleteOne","NotificationPreference.deleteMany","NotificationPreference.groupBy","NotificationPreference.aggregate","AuditLog.findUnique","AuditLog.findUniqueOrThrow","AuditLog.findFirst","AuditLog.findFirstOrThrow","AuditLog.findMany","AuditLog.createOne","AuditLog.createMany","AuditLog.createManyAndReturn","AuditLog.updateOne","AuditLog.updateMany","AuditLog.updateManyAndReturn","AuditLog.upsertOne","AuditLog.deleteOne","AuditLog.deleteMany","AuditLog.groupBy","AuditLog.aggregate","AND","OR","NOT","id","elderlyProfileId","careCircleId","userId","action","entityType","entityId","details","ipAddress","createdAt","equals","in","notIn","lt","lte","gt","gte","not","string_contains","string_starts_with","string_ends_with","array_starts_with","array_ends_with","array_contains","contains","startsWith","endsWith","emailReminders","missedDoseAlerts","escalationAlerts","appointmentReminders","dailySummaryEmail","gracePeriodMinutes","updatedAt","NotificationType","type","title","message","isRead","readAt","deliveryStatus","emailSent","authorId","NoteCategory","category","content","vitalSigns","isPinned","shiftHandoverToId","assignedToId","description","dueDate","TaskPriority","priority","TaskStatus","status","completedAt","completedById","notes","doctorName","specialty","clinicName","locationAddress","appointmentDate","AppointmentStatus","reminderMinutesBefore","reminderSent","outcomeSummary","createdById","medicationId","currentStock","unit","refillThreshold","packageSize","lastRefillDate","scheduleId","scheduledAt","DoseStatus","confirmedAt","confirmedById","confirmationNotes","escalationLevel","escalatedAt","idempotencyKey","ScheduleFrequency","frequency","timesOfDay","daysOfWeek","startDate","endDate","dosageQuantity","instructions","isActive","has","hasEvery","hasSome","name","brandName","genericName","MedicationForm","form","strength","dosageInstructions","prescribingDoctor","prescribingClinic","rxNumber","purpose","isArchived","discontinuedReason","email","CircleRole","role","token","InvitationStatus","invitedById","expiresAt","acceptedAt","permissions","joinedAt","preferredName","dateOfBirth","gender","bloodGroup","allergies","medicalConditions","emergencyContactName","emergencyContactPhone","emergencyContactRelation","avatarUrl","isSeniorModeActive","seniorPin","passwordHash","UserRole","phoneNumber","every","some","none","careCircleId_userId","is","isNot","connectOrCreate","upsert","createMany","set","disconnect","delete","connect","updateMany","deleteMany","push","increment","decrement","multiply","divide"]'),
  graph: "5QmIAfABGhcAAKkEACAYAACqBAAgHAAAwAQAIB0AAKMEACAeAADBBAAgHwAAwgQAICAAAKUEACAhAACnBAAgIgAApwQAICMAAKgEACAkAACoBAAgJQAApgQAICYAAMMEACCfAgAAvgQAMKACAAAYABChAgAAvgQAMKICAQAAAAGrAkAA4QMAIcMCQADhAwAh_gIgAN8DACGCAwEAgQQAIY8DAQAAAAGRAwAAvwSnAyKiAwEAhAQAIaUDAQCBBAAhpwMBAIQEACEBAAAAAQAgDRUAAK4EACAWAADiAwAgnwIAAM8EADCgAgAAAwAQoQIAAM8EADCiAgEAgQQAIaQCAQCBBAAhpQIBAIEEACHDAkAA4QMAIf4CIADfAwAhkQMAAKwEkQMilwMAAIwEACCYA0AA4QMAIQIVAAC7CAAgFgAA5gQAIA4VAACuBAAgFgAA4gMAIJ8CAADPBAAwoAIAAAMAEKECAADPBAAwogIBAAAAAaQCAQCBBAAhpQIBAIEEACHDAkAA4QMAIf4CIADfAwAhkQMAAKwEkQMilwMAAIwEACCYA0AA4QMAIasDAADOBAAgAwAAAAMAIAEAAAQAMAIAAAUAIA4DAADiAwAgBQAAuAQAIBcAAKkEACAZAADABAAgGwAAwQQAIJ8CAADNBAAwoAIAAAcAEKECAADNBAAwogIBAIEEACGjAgEAgQQAIasCQADhAwAhwwJAAOEDACHmAgEAgQQAIYIDAQCBBAAhBQMAAOYEACAFAAC8CAAgFwAAuQgAIBkAAK8IACAbAACxCAAgDgMAAOIDACAFAAC4BAAgFwAAqQQAIBkAAMAEACAbAADBBAAgnwIAAM0EADCgAgAABwAQoQIAAM0EADCiAgEAAAABowIBAIEEACGrAkAA4QMAIcMCQADhAwAh5gIBAIEEACGCAwEAgQQAIQMAAAAHACABAAAIADACAAAJACAXBQAAuAQAIAkAAKUEACALAADLBAAgDAAAzAQAIJ8CAADJBAAwoAIAAAsAEKECAADJBAAwogIBAIEEACGjAgEAgQQAIasCQADhAwAhwwJAAOEDACGCAwEAgQQAIYMDAQCEBAAhhAMBAIQEACGGAwAAygSGAyKHAwEAgQQAIYgDAQCBBAAhiQMBAIQEACGKAwEAhAQAIYsDAQCEBAAhjAMBAIQEACGNAyAA3wMAIY4DAQCEBAAhCwUAALwIACAJAACzCAAgCwAAvggAIAwAAL8IACCDAwAA0AQAIIQDAADQBAAgiQMAANAEACCKAwAA0AQAIIsDAADQBAAgjAMAANAEACCOAwAA0AQAIBcFAAC4BAAgCQAApQQAIAsAAMsEACAMAADMBAAgnwIAAMkEADCgAgAACwAQoQIAAMkEADCiAgEAAAABowIBAIEEACGrAkAA4QMAIcMCQADhAwAhggMBAIEEACGDAwEAhAQAIYQDAQCEBAAhhgMAAMoEhgMihwMBAIEEACGIAwEAgQQAIYkDAQCEBAAhigMBAIQEACGLAwEAhAQAIYwDAQCEBAAhjQMgAN8DACGOAwEAhAQAIQMAAAALACABAAAMADACAAANACARBgAAhQQAIAkAAKUEACCfAgAAxwQAMKACAAAPABChAgAAxwQAMKICAQCBBAAhqwJAAOEDACHDAkAA4QMAIecCAQCBBAAh9wIAAMgE9wIi-AIAAIwEACD5AgAAjQQAIPoCQADhAwAh-wJAAIMEACH8AggAgAQAIf0CAQCEBAAh_gIgAN8DACEEBgAAmAUAIAkAALMIACD7AgAA0AQAIP0CAADQBAAgEQYAAIUEACAJAAClBAAgnwIAAMcEADCgAgAADwAQoQIAAMcEADCiAgEAAAABqwJAAOEDACHDAkAA4QMAIecCAQCBBAAh9wIAAMgE9wIi-AIAAIwEACD5AgAAjQQAIPoCQADhAwAh-wJAAIMEACH8AggAgAQAIf0CAQCEBAAh_gIgAN8DACEDAAAADwAgAQAAEAAwAgAAEQAgFgUAALgEACAGAACFBAAgBwAAxgQAIAgAALUEACCfAgAAxAQAMKACAAATABChAgAAxAQAMKICAQCBBAAhowIBAIEEACGrAkAA4QMAIcICAgDgAwAhwwJAAOEDACHZAgAAxQTwAiLnAgEAgQQAIe0CAQCEBAAh7gJAAOEDACHwAkAAgwQAIfECAQCEBAAh8gIBAIQEACHzAgIA4AMAIfQCQACDBAAh9QIBAIQEACEKBQAAvAgAIAYAAJgFACAHAAC9CAAgCAAA5gQAIO0CAADQBAAg8AIAANAEACDxAgAA0AQAIPICAADQBAAg9AIAANAEACD1AgAA0AQAIBYFAAC4BAAgBgAAhQQAIAcAAMYEACAIAAC1BAAgnwIAAMQEADCgAgAAEwAQoQIAAMQEADCiAgEAAAABowIBAIEEACGrAkAA4QMAIcICAgDgAwAhwwJAAOEDACHZAgAAxQTwAiLnAgEAgQQAIe0CAQCEBAAh7gJAAOEDACHwAkAAgwQAIfECAQCEBAAh8gIBAIQEACHzAgIA4AMAIfQCQACDBAAh9QIBAAAAAQMAAAATACABAAAUADACAAAVACABAAAADwAgGhcAAKkEACAYAACqBAAgHAAAwAQAIB0AAKMEACAeAADBBAAgHwAAwgQAICAAAKUEACAhAACnBAAgIgAApwQAICMAAKgEACAkAACoBAAgJQAApgQAICYAAMMEACCfAgAAvgQAMKACAAAYABChAgAAvgQAMKICAQCBBAAhqwJAAOEDACHDAkAA4QMAIf4CIADfAwAhggMBAIEEACGPAwEAgQQAIZEDAAC_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ADACAABIACAQAwAA5gQAIAQAALAIACAJAACzCAAgDQAAuggAIA4AALYIACARAAC0CAAgFAAAtQgAIBcAALkIACAYAAC3CAAg3AIAANAEACCZAwAA0AQAIJsDAADQBAAgnAMAANAEACChAwAA0AQAIKIDAADQBAAgpAMAANAEACAeAwAA4gMAIAQAAKMEACAJAAClBAAgDQAApAQAIA4AAKYEACARAACnBAAgFAAAqAQAIBcAAKkEACAYAACqBAAgnwIAAKIEADCgAgAANAAQoQIAAKIEADCiAgEAAAABqwJAAOEDACHDAkAA4QMAIdwCAQCEBAAh5gIBAIEEACGCAwEAgQQAIZkDAQCEBAAhmgNAAOEDACGbAwEAhAQAIZwDAQCEBAAhnQMAAIwEACCeAwAAjAQAIJ8DAQCBBAAhoAMBAIEEACGhAwEAhAQAIaIDAQCEBAAhowMgAN8DACGkAwEAhAQAIQMAAAA0ACABAABQADACAABRACADAAAAEwAgAQAAFAAwAgAAFQAgAwAAACUAIAEAACYAMAIAACcAIAMAAAAlACABAAAmADACAAAnACADAAAAKwAgAQAALAAwAgAALQAgAwAAACsAIAEAACwAMAIAAC0AIAMAAAAhACABAAAiADACAAAjACADAAAAOAAgAQAAOQAwAgAAOgAgDRYAAOIDACCfAgAA3gMAMKACAABaABChAgAA3gMAMKICAQCBBAAhpQIBAIEEACG9AiAA3wMAIb4CIADfAwAhvwIgAN8DACHAAiAA3wMAIcECIADfAwAhwgICAOADACHDAkAA4QMAIQEAAABaACADAAAAMAAgAQAAMQAwAgAAMgAgAQAAAAMAIAEAAAAHACABAAAARgAgAQAAADQAIAEAAAATACABAAAAJQAgAQAAACUAIAEAAAArACABAAAAKwAgAQAAACEAIAEAAAA4ACABAAAAMAAgAQAAAAEAIA8XAAC5CAAgGAAAtwgAIBwAAK8IACAdAACwCAAgHgAAsQgAIB8AALIIACAgAACzCAAgIQAAtAgAICIAALQIACAjAAC1CAAgJAAAtQgAICUAALYIACAmAAC4CAAgogMAANAEACCnAwAA0AQAIAMAAAAYACABAABqADACAAABACADAAAAGAAgAQAAagAwAgAAAQAgAwAAABgAIAEAAGoAMAIAAAEAIBcXAACuCAAgGAAArAgAIBwAAKIIACAdAACjCAAgHgAApAgAIB8AAKUIACAgAACmCAAgIQAApwgAICIAAKgIACAjAACpCAAgJAAAqggAICUAAKsIACAmAACtCAAgogIBAAAAAasCQAAAAAHDAkAAAAAB_gIgAAAAAYIDAQAAAAGPAwEAAAABkQMAAACnAwKiAwEAAAABpQMBAAAAAacDAQAAAAEBLAAAbgAgCqICAQAAAAGrAkAAAAABwwJAAAAAAf4CIAAAAAGCAwEAAAABjwMBAAAAAZEDAAAApwMCogMBAAAAAaUDAQAAAAGnAwEAAAABASwAAHAAMAEsAABwADAXFwAArQcAIBgAAKsHACAcAAChBwAgHQAAogcAIB4AAKMHACAfAACkBwAgIAAApQcAICEAAKYHACAiAACnBwAgIwAAqAcAICQAAKkHACAlAACqBwAgJgAArAcAIKICAQDUBAAhqwJAANYEACHDAkAA1gQAIf4CIADiBAAhggMBANQEACGPAwEA1AQAIZEDAACgB6cDIqIDAQDVBAAhpQMBANQEACGnAwEA1QQAIQIAAAABACAsAABzACAKogIBANQEACGrAkAA1gQAIcMCQADWBAAh_gIgAOIEACGCAwEA1AQAIY8DAQDUBAAhkQMAAKAHpwMiogMBANUEACGlAwEA1AQAIacDAQDVBAAhAgAAABgAICwAAHUAIAIAAAAYACAsAAB1ACADAAAAAQAgMwAAbgAgNAAAcwAgAQAAAAEAIAEAAAAYACAFCgAAnQcAIDkAAJ8HACA6AACeBwAgogMAANAEACCnAwAA0AQAIA2fAgAAngQAMKACAAB8ABChAgAAngQAMKICAQDKAwAhqwJAAM0DACHDAkAAzQMAIf4CIADYAwAhggMBAMoDACGPAwEAygMAIZEDAACfBKcDIqIDAQDLAwAhpQMBAMoDACGnAwEAywMAIQMAAAAYACABAAB7ADA4AAB8ACADAAAAGAAgAQAAagAwAgAAAQAgAQAAAFEAIAEAAABRACADAAAANAAgAQAAUAAwAgAAUQAgAwAAADQAIAEAAFAAMAIAAFEAIAMAAAA0ACABAABQADACAABRACAbAwAAlAcAIAQAAJUHACAJAACXBwAgDQAAlgcAIA4AAJgHACARAACZBwAgFAAAmgcAIBcAAJsHACAYAACcBwAgogIBAAAAAasCQAAAAAHDAkAAAAAB3AIBAAAAAeYCAQAAAAGCAwEAAAABmQMBAAAAAZoDQAAAAAGbAwEAAAABnAMBAAAAAZ0DAACSBwAgngMAAJMHACCfAwEAAAABoAMBAAAAAaEDAQAAAAGiAwEAAAABowMgAAAAAaQDAQAAAAEBLAAAhAEAIBKiAgEAAAABqwJAAAAAAcMCQAAAAAHcAgEAAAAB5gIBAAAAAYIDAQAAAAGZAwEAAAABmgNAAAAAAZsDAQAAAAGcAwEAAAABnQMAAJIHACCeAwAAkwcAIJ8DAQAAAAGgAwEAAAABoQMBAAAAAaIDAQAAAAGjAyAAAAABpAMBAAAAAQEsAACGAQAwASwAAIYBADAbAwAArwYAIAQAALAGACAJAACyBgAgDQAAsQYAIA4AALMGACARAAC0BgAgFAAAtQYAIBcAALYGACAYAAC3BgAgogIBANQEACGrAkAA1gQAIcMCQADWBAAh3AIBANUEACHmAgEA1AQAIYIDAQDUBAAhmQMBANUEACGaA0AA1gQAIZsDAQDVBAAhnAMBANUEACGdAwAArQYAIJ4DAACuBgAgnwMBANQEACGgAwEA1AQAIaEDAQDVBAAhogMBANUEACGjAyAA4gQAIaQDAQDVBAAhAgAAAFEAICwAAIkBACASogIBANQEACGrAkAA1gQAIcMCQADWBAAh3AIBANUEACHmAgEA1AQAIYIDAQDUBAAhmQMBANUEACGaA0AA1gQAIZsDAQDVBAAhnAMBANUEACGdAwAArQYAIJ4DAACuBgAgnwMBANQEACGgAwEA1AQAIaEDAQDVBAAhogMBANUEACGjAyAA4gQAIaQDAQDVBAAhAgAAADQAICwAAIsBACACAAAANAAgLAAAiwEAIAMAAABRACAzAACEAQAgNAAAiQEAIAEAAABRACABAAAANAAgCgoAAKoGACA5AACsBgAgOgAAqwYAINwCAADQBAAgmQMAANAEACCbAwAA0AQAIJwDAADQBAAgoQMAANAEACCiAwAA0AQAIKQDAADQBAAgFZ8CAACdBAAwoAIAAJIBABChAgAAnQQAMKICAQDKAwAhqwJAAM0DACHDAkAAzQMAIdwCAQDLAwAh5gIBAMoDACGCAwEAygMAIZkDAQDLAwAhmgNAAM0DACGbAwEAywMAIZwDAQDLAwAhnQMAAIwEACCeAwAAjAQAIJ8DAQDKAwAhoAMBAMoDACGhAwEAywMAIaIDAQDLAwAhowMgANgDACGkAwEAywMAIQMAAAA0ACABAACRAQAwOAAAkgEAIAMAAAA0ACABAABQADACAABRACABAAAACQAgAQAAAAkAIAMAAAAHACABAAAIADACAAAJACADAAAABwAgAQAACAAwAgAACQAgAwAAAAcAIAEAAAgAMAIAAAkAIAsDAACmBgAgBQAApQYAIBcAAKkGACAZAACnBgAgGwAAqAYAIKICAQAAAAGjAgEAAAABqwJAAAAAAcMCQAAAAAHmAgEAAAABggMBAAAAAQEsAACaAQAgBqICAQAAAAGjAgEAAAABqwJAAAAAAcMCQAAAAAHmAgEAAAABggMBAAAAAQEsAACcAQAwASwAAJwBADALAwAA_QUAIAUAAPwFACAXAACABgAgGQAA_gUAIBsAAP8FACCiAgEA1AQAIaMCAQDUBAAhqwJAANYEACHDAkAA1gQAIeYCAQDUBAAhggMBANQEACECAAAACQAgLAAAnwEAIAaiAgEA1AQAIaMCAQDUBAAhqwJAANYEACHDAkAA1gQAIeYCAQDUBAAhggMBANQEACECAAAABwAgLAAAoQEAIAIAAAAHACAsAAChAQAgAwAAAAkAIDMAAJoBACA0AACfAQAgAQAAAAkAIAEAAAAHACADCgAA-QUAIDkAAPsFACA6AAD6BQAgCZ8CAACcBAAwoAIAAKgBABChAgAAnAQAMKICAQDKAwAhowIBAMoDACGrAkAAzQMAIcMCQADNAwAh5gIBAMoDACGCAwEAygMAIQMAAAAHACABAACnAQAwOAAAqAEAIAMAAAAHACABAAAIADACAAAJACABAAAABQAgAQAAAAUAIAMAAAADACABAAAEADACAAAFACADAAAAAwAgAQAABAAwAgAABQAgAwAAAAMAIAEAAAQAMAIAAAUAIAoVAAD3BQAgFgAA-AUAIKICAQAAAAGkAgEAAAABpQIBAAAAAcMCQAAAAAH-AiAAAAABkQMAAACRAwKXAwAA9gUAIJgDQAAAAAEBLAAAsAEAIAiiAgEAAAABpAIBAAAAAaUCAQAAAAHDAkAAAAAB_gIgAAAAAZEDAAAAkQMClwMAAPYFACCYA0AAAAABASwAALIBADABLAAAsgEAMAoVAAD0BQAgFgAA9QUAIKICAQDUBAAhpAIBANQEACGlAgEA1AQAIcMCQADWBAAh_gIgAOIEACGRAwAA6gWRAyKXAwAA8wUAIJgDQADWBAAhAgAAAAUAICwAALUBACAIogIBANQEACGkAgEA1AQAIaUCAQDUBAAhwwJAANYEACH-AiAA4gQAIZEDAADqBZEDIpcDAADzBQAgmANAANYEACECAAAAAwAgLAAAtwEAIAIAAAADACAsAAC3AQAgAwAAAAUAIDMAALABACA0AAC1AQAgAQAAAAUAIAEAAAADACADCgAA8AUAIDkAAPIFACA6AADxBQAgC58CAACbBAAwoAIAAL4BABChAgAAmwQAMKICAQDKAwAhpAIBAMoDACGlAgEAygMAIcMCQADNAwAh_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-BQAg-gJAAAAAAfsCQAAAAAH8AggAAAAB_QIBAAAAAf4CIAAAAAEBLAAA8gEAIAyiAgEAAAABqwJAAAAAAcMCQAAAAAHnAgEAAAAB9wIAAAD3AgL4AgAAvQUAIPkCAAC-BQAg-gJAAAAAAfsCQAAAAAH8AggAAAAB_QIBAAAAAf4CIAAAAAEBLAAA9AEAMAEsAAD0AQAwDgYAAK8FACAJAACwBQAgogIBANQEACGrAkAA1gQAIcMCQADWBAAh5wIBANQEACH3AgAArAX3AiL4AgAArQUAIPkCAACuBQAg-gJAANYEACH7AkAA6wQAIfwCCACUBQAh_QIBANUEACH-AiAA4gQAIQIAAAARACAsAAD3AQAgDKICAQDUBAAhqwJAANYEACHDAkAA1gQAIecCAQDUBAAh9wIAAKwF9wIi-AIAAK0FACD5AgAArgUAIPoCQADWBAAh-wJAAOsEACH8AggAlAUAIf0CAQDVBAAh_gIgAOIEACECAAAADwAgLAAA-QEAIAIAAAAPACAsAAD5AQAgAwAAABEAIDMAAPIBACA0AAD3AQAgAQAAABEAIAEAAAAPACAHCgAApwUAIDkAAKoFACA6AACpBQAgmwEAAKgFACCcAQAAqwUAIPsCAADQBAAg_QIAANAEACAPnwIAAIoEADCgAgAAgAIAEKECAACKBAAwogIBAMoDACGrAkAAzQMAIcMCQADNAwAh5wIBAMoDACH3AgAAiwT3AiL4AgAAjAQAIPkCAACNBAAg-gJAAM0DACH7AkAA5QMAIfwCCAD6AwAh_QIBAMsDACH-AiAA2AMAIQMAAAAPACABAAD_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-gMAIekCAQDKAwAh6gIIAPoDACHrAggA-wMAIewCQADlAwAhAwAAABwAIAEAALECADA4AACyAgAgAwAAABwAIAEAAKACADACAACdAgAgAQAAACMAIAEAAAAjACADAAAAIQAgAQAAIgAwAgAAIwAgAwAAACEAIAEAACIAMAIAACMAIAMAAAAhACABAAAiADACAAAjACASAwAAjgUAIAUAAI0FACCiAgEAAAABowIBAAAAAasCQAAAAAHDAkAAAAABxgIBAAAAAdkCAAAA4wIC3AIBAAAAAd0CAQAAAAHeAgEAAAAB3wIBAAAAAeACAQAAAAHhAkAAAAAB4wICAAAAAeQCIAAAAAHlAgEAAAAB5gIBAAAAAQEsAAC6AgAgEKICAQAAAAGjAgEAAAABqwJAAAAAAcMCQAAAAAHGAgEAAAAB2QIAAADjAgLcAgEAAAAB3QIBAAAAAd4CAQAAAAHfAgEAAAAB4AIBAAAAAeECQAAAAAHjAgIAAAAB5AIgAAAAAeUCAQAAAAHmAgEAAAABASwAALwCADABLAAAvAIAMBIDAACMBQAgBQAAiwUAIKICAQDUBAAhowIBANQEACGrAkAA1gQAIcMCQADWBAAhxgIBANQEACHZAgAAigXjAiLcAgEA1QQAId0CAQDUBAAh3gIBANUEACHfAgEA1AQAIeACAQDVBAAh4QJAANYEACHjAgIA4wQAIeQCIADiBAAh5QIBANUEACHmAgEA1AQAIQIAAAAjACAsAAC_AgAgEKICAQDUBAAhowIBANQEACGrAkAA1gQAIcMCQADWBAAhxgIBANQEACHZAgAAigXjAiLcAgEA1QQAId0CAQDUBAAh3gIBANUEACHfAgEA1AQAIeACAQDVBAAh4QJAANYEACHjAgIA4wQAIeQCIADiBAAh5QIBANUEACHmAgEA1AQAIQIAAAAhACAsAADBAgAgAgAAACEAICwAAMECACADAAAAIwAgMwAAugIAIDQAAL8CACABAAAAIwAgAQAAACEAIAkKAACFBQAgOQAAiAUAIDoAAIcFACCbAQAAhgUAIJwBAACJBQAg3AIAANAEACDeAgAA0AQAIOACAADQBAAg5QIAANAEACATnwIAAPUDADCgAgAAyAIAEKECAAD1AwAwogIBAMoDACGjAgEAygMAIasCQADNAwAhwwJAAM0DACHGAgEAygMAIdkCAAD2A-MCItwCAQDLAwAh3QIBAMoDACHeAgEAywMAId8CAQDKAwAh4AIBAMsDACHhAkAAzQMAIeMCAgDZAwAh5AIgANgDACHlAgEAywMAIeYCAQDKAwAhAwAAACEAIAEAAMcCADA4AADIAgAgAwAAACEAIAEAACIAMAIAACMAIAEAAAAnACABAAAAJwAgAwAAACUAIAEAACYAMAIAACcAIAMAAAAlACABAAAmADACAAAnACADAAAAJQAgAQAAJgAwAgAAJwAgEAUAAIIFACAPAACDBQAgEAAAhAUAIKICAQAAAAGjAgEAAAABqwJAAAAAAcMCQAAAAAHGAgEAAAAB0wIBAAAAAdQCAQAAAAHVAkAAAAAB1wIAAADXAgLZAgAAANkCAtoCQAAAAAHbAgEAAAAB3AIBAAAAAQEsAADQAgAgDaICAQAAAAGjAgEAAAABqwJAAAAAAcMCQAAAAAHGAgEAAAAB0wIBAAAAAdQCAQAAAAHVAkAAAAAB1wIAAADXAgLZAgAAANkCAtoCQAAAAAHbAgEAAAAB3AIBAAAAAQEsAADSAgAwASwAANICADABAAAAGAAgAQAAABgAIBAFAAD_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_AiAA3wMAIcACIADfAwAhwQIgAN8DACHCAgIA4AMAIcMCQADhAwAhAQAAAJUDACABAAAAlQMAIAEWAADmBAAgAwAAAFoAIAEAAJgDADACAACVAwAgAwAAAFoAIAEAAJgDADACAACVAwAgAwAAAFoAIAEAAJgDADACAACVAwAgChYAAOUEACCiAgEAAAABpQIBAAAAAb0CIAAAAAG-AiAAAAABvwIgAAAAAcACIAAAAAHBAiAAAAABwgICAAAAAcMCQAAAAAEBLAAAnAMAIAmiAgEAAAABpQIBAAAAAb0CIAAAAAG-AiAAAAABvwIgAAAAAcACIAAAAAHBAiAAAAABwgICAAAAAcMCQAAAAAEBLAAAngMAMAEsAACeAwAwChYAAOQEACCiAgEA1AQAIaUCAQDUBAAhvQIgAOIEACG-AiAA4gQAIb8CIADiBAAhwAIgAOIEACHBAiAA4gQAIcICAgDjBAAhwwJAANYEACECAAAAlQMAICwAAKEDACAJogIBANQEACGlAgEA1AQAIb0CIADiBAAhvgIgAOIEACG_AiAA4gQAIcACIADiBAAhwQIgAOIEACHCAgIA4wQAIcMCQADWBAAhAgAAAFoAICwAAKMDACACAAAAWgAgLAAAowMAIAMAAACVAwAgMwAAnAMAIDQAAKEDACABAAAAlQMAIAEAAABaACAFCgAA3QQAIDkAAOAEACA6AADfBAAgmwEAAN4EACCcAQAA4QQAIAyfAgAA1wMAMKACAACqAwAQoQIAANcDADCiAgEAygMAIaUCAQDKAwAhvQIgANgDACG-AiAA2AMAIb8CIADYAwAhwAIgANgDACHBAiAA2AMAIcICAgDZAwAhwwJAAM0DACEDAAAAWgAgAQAAqQMAMDgAAKoDACADAAAAWgAgAQAAmAMAMAIAAJUDACABAAAAMgAgAQAAADIAIAMAAAAwACABAAAxADACAAAyACADAAAAMAAgAQAAMQAwAgAAMgAgAwAAADAAIAEAADEAMAIAADIAIA0FAADaBAAgFQAA2wQAIBYAANwEACCiAgEAAAABowIBAAAAAaQCAQAAAAGlAgEAAAABpgIBAAAAAacCAQAAAAGoAgEAAAABqQKAAAAAAaoCAQAAAAGrAkAAAAABASwAALIDACAKogIBAAAAAaMCAQAAAAGkAgEAAAABpQIBAAAAAaYCAQAAAAGnAgEAAAABqAIBAAAAAakCgAAAAAGqAgEAAAABqwJAAAAAAQEsAAC0AwAwASwAALQDADABAAAANAAgAQAAAAcAIAEAAAAYACANBQAA1wQAIBUAANgEACAWAADZBAAgogIBANQEACGjAgEA1QQAIaQCAQDVBAAhpQIBANUEACGmAgEA1AQAIacCAQDUBAAhqAIBANUEACGpAoAAAAABqgIBANUEACGrAkAA1gQAIQIAAAAyACAsAAC6AwAgCqICAQDUBAAhowIBANUEACGkAgEA1QQAIaUCAQDVBAAhpgIBANQEACGnAgEA1AQAIagCAQDVBAAhqQKAAAAAAaoCAQDVBAAhqwJAANYEACECAAAAMAAgLAAAvAMAIAIAAAAwACAsAAC8AwAgAQAAADQAIAEAAAAHACABAAAAGAAgAwAAADIAIDMAALIDACA0AAC6AwAgAQAAADIAIAEAAAAwACAJCgAA0QQAIDkAANMEACA6AADSBAAgowIAANAEACCkAgAA0AQAIKUCAADQBAAgqAIAANAEACCpAgAA0AQAIKoCAADQBAAgDZ8CAADJAwAwoAIAAMYDABChAgAAyQMAMKICAQDKAwAhowIBAMsDACGkAgEAywMAIaUCAQDLAwAhpgIBAMoDACGnAgEAygMAIagCAQDLAwAhqQIAAMwDACCqAgEAywMAIasCQADNAwAhAwAAADAAIAEAAMUDADA4AADGAwAgAwAAADAAIAEAADEAMAIAADIAIA2fAgAAyQMAMKACAADGAwAQoQIAAMkDADCiAgEAygMAIaMCAQDLAwAhpAIBAMsDACGlAgEAywMAIaYCAQDKAwAhpwIBAMoDACGoAgEAywMAIakCAADMAwAgqgIBAMsDACGrAkAAzQMAIQ4KAADPAwAgOQAA1gMAIDoAANYDACCsAgEAAAABrQIBAAAABK4CAQAAAASvAgEAAAABsAIBAAAAAbECAQAAAAGyAgEAAAABswIBANUDACG6AgEAAAABuwIBAAAAAbwCAQAAAAEOCgAA0QMAIDkAANQDACA6AADUAwAgrAIBAAAAAa0CAQAAAAWuAgEAAAAFrwIBAAAAAbACAQAAAAGxAgEAAAABsgIBAAAAAbMCAQDTAwAhugIBAAAAAbsCAQAAAAG8AgEAAAABDwoAANEDACA5AADSAwAgOgAA0gMAIKwCgAAAAAGvAoAAAAABsAKAAAAAAbECgAAAAAGyAoAAAAABswKAAAAAAbQCAQAAAAG1AgEAAAABtgIBAAAAAbcCgAAAAAG4AoAAAAABuQKAAAAAAQsKAADPAwAgOQAA0AMAIDoAANADACCsAkAAAAABrQJAAAAABK4CQAAAAASvAkAAAAABsAJAAAAAAbECQAAAAAGyAkAAAAABswJAAM4DACELCgAAzwMAIDkAANADACA6AADQAwAgrAJAAAAAAa0CQAAAAASuAkAAAAAErwJAAAAAAbACQAAAAAGxAkAAAAABsgJAAAAAAbMCQADOAwAhCKwCAgAAAAGtAgIAAAAErgICAAAABK8CAgAAAAGwAgIAAAABsQICAAAAAbICAgAAAAGzAgIAzwMAIQisAkAAAAABrQJAAAAABK4CQAAAAASvAkAAAAABsAJAAAAAAbECQAAAAAGyAkAAAAABswJAANADACEIrAICAAAAAa0CAgAAAAWuAgIAAAAFrwICAAAAAbACAgAAAAGxAgIAAAABsgICAAAAAbMCAgDRAwAhDKwCgAAAAAGvAoAAAAABsAKAAAAAAbECgAAAAAGyAoAAAAABswKAAAAAAbQCAQAAAAG1AgEAAAABtgIBAAAAAbcCgAAAAAG4AoAAAAABuQKAAAAAAQ4KAADRAwAgOQAA1AMAIDoAANQDACCsAgEAAAABrQIBAAAABa4CAQAAAAWvAgEAAAABsAIBAAAAAbECAQAAAAGyAgEAAAABswIBANMDACG6AgEAAAABuwIBAAAAAbwCAQAAAAELrAIBAAAAAa0CAQAAAAWuAgEAAAAFrwIBAAAAAbACAQAAAAGxAgEAAAABsgIBAAAAAbMCAQDUAwAhugIBAAAAAbsCAQAAAAG8AgEAAAABDgoAAM8DACA5AADWAwAgOgAA1gMAIKwCAQAAAAGtAgEAAAAErgIBAAAABK8CAQAAAAGwAgEAAAABsQIBAAAAAbICAQAAAAGzAgEA1QMAIboCAQAAAAG7AgEAAAABvAIBAAAAAQusAgEAAAABrQIBAAAABK4CAQAAAASvAgEAAAABsAIBAAAAAbECAQAAAAGyAgEAAAABswIBANYDACG6AgEAAAABuwIBAAAAAbwCAQAAAAEMnwIAANcDADCgAgAAqgMAEKECAADXAwAwogIBAMoDACGlAgEAygMAIb0CIADYAwAhvgIgANgDACG_AiAA2AMAIcACIADYAwAhwQIgANgDACHCAgIA2QMAIcMCQADNAwAhBQoAAM8DACA5AADdAwAgOgAA3QMAIKwCIAAAAAGzAiAA3AMAIQ0KAADPAwAgOQAAzwMAIDoAAM8DACCbAQAA2wMAIJwBAADPAwAgrAICAAAAAa0CAgAAAASuAgIAAAAErwICAAAAAbACAgAAAAGxAgIAAAABsgICAAAAAbMCAgDaAwAhDQoAAM8DACA5AADPAwAgOgAAzwMAIJsBAADbAwAgnAEAAM8DACCsAgIAAAABrQICAAAABK4CAgAAAASvAgIAAAABsAICAAAAAbECAgAAAAGyAgIAAAABswICANoDACEIrAIIAAAAAa0CCAAAAASuAggAAAAErwIIAAAAAbACCAAAAAGxAggAAAABsgIIAAAAAbMCCADbAwAhBQoAAM8DACA5AADdAwAgOgAA3QMAIKwCIAAAAAGzAiAA3AMAIQKsAiAAAAABswIgAN0DACENFgAA4gMAIJ8CAADeAwAwoAIAAFoAEKECAADeAwAwogIBAIEEACGlAgEAgQQAIb0CIADfAwAhvgIgAN8DACG_AiAA3wMAIcACIADfAwAhwQIgAN8DACHCAgIA4AMAIcMCQADhAwAhAqwCIAAAAAGzAiAA3QMAIQisAgIAAAABrQICAAAABK4CAgAAAASvAgIAAAABsAICAAAAAbECAgAAAAGyAgIAAAABswICAM8DACEIrAJAAAAAAa0CQAAAAASuAkAAAAAErwJAAAAAAbACQAAAAAGxAkAAAAABsgJAAAAAAbMCQADQAwAhHBcAAKkEACAYAACqBAAgHAAAwAQAIB0AAKMEACAeAADBBAAgHwAAwgQAICAAAKUEACAhAACnBAAgIgAApwQAICMAAKgEACAkAACoBAAgJQAApgQAICYAAMMEACCfAgAAvgQAMKACAAAYABChAgAAvgQAMKICAQCBBAAhqwJAAOEDACHDAkAA4QMAIf4CIADfAwAhggMBAIEEACGPAwEAgQQAIZEDAAC_BKcDIqIDAQCEBAAhpQMBAIEEACGnAwEAhAQAIawDAAAYACCtAwAAGAAgDywAAMwDACCfAgAA4wMAMKACAACSAwAQoQIAAOMDADCiAgEAygMAIaMCAQDLAwAhpQIBAMoDACGrAkAAzQMAIcUCAADkA8UCIsYCAQDKAwAhxwIBAMoDACHIAiAA2AMAIckCQADlAwAhygIBAMoDACHLAiAA2AMAIQcKAADPAwAgOQAA6QMAIDoAAOkDACCsAgAAAMUCAq0CAAAAxQIIrgIAAADFAgizAgAA6APFAiILCgAA0QMAIDkAAOcDACA6AADnAwAgrAJAAAAAAa0CQAAAAAWuAkAAAAAFrwJAAAAAAbACQAAAAAGxAkAAAAABsgJAAAAAAbMCQADmAwAhCwoAANEDACA5AADnAwAgOgAA5wMAIKwCQAAAAAGtAkAAAAAFrgJAAAAABa8CQAAAAAGwAkAAAAABsQJAAAAAAbICQAAAAAGzAkAA5gMAIQisAkAAAAABrQJAAAAABa4CQAAAAAWvAkAAAAABsAJAAAAAAbECQAAAAAGyAkAAAAABswJAAOcDACEHCgAAzwMAIDkAAOkDACA6AADpAwAgrAIAAADFAgKtAgAAAMUCCK4CAAAAxQIIswIAAOgDxQIiBKwCAAAAxQICrQIAAADFAgiuAgAAAMUCCLMCAADpA8UCIg6fAgAA6gMAMKACAAD6AgAQoQIAAOoDADCiAgEAygMAIaMCAQDKAwAhqwJAAM0DACHDAkAAzQMAIcYCAQDKAwAhzAIBAMoDACHOAgAA6wPOAiLPAgEAygMAIdACAADMAwAg0QIgANgDACHSAgEAywMAIQcKAADPAwAgOQAA7QMAIDoAAO0DACCsAgAAAM4CAq0CAAAAzgIIrgIAAADOAgizAgAA7APOAiIHCgAAzwMAIDkAAO0DACA6AADtAwAgrAIAAADOAgKtAgAAAM4CCK4CAAAAzgIIswIAAOwDzgIiBKwCAAAAzgICrQIAAADOAgiuAgAAAM4CCLMCAADtA84CIhCfAgAA7gMAMKACAADiAgAQoQIAAO4DADCiAgEAygMAIaMCAQDKAwAhqwJAAM0DACHDAkAAzQMAIcYCAQDKAwAh0wIBAMsDACHUAgEAywMAIdUCQADNAwAh1wIAAO8D1wIi2QIAAPAD2QIi2gJAAOUDACHbAgEAywMAIdwCAQDLAwAhBwoAAM8DACA5AAD0AwAgOgAA9AMAIKwCAAAA1wICrQIAAADXAgiuAgAAANcCCLMCAADzA9cCIgcKAADPAwAgOQAA8gMAIDoAAPIDACCsAgAAANkCAq0CAAAA2QIIrgIAAADZAgizAgAA8QPZAiIHCgAAzwMAIDkAAPIDACA6AADyAwAgrAIAAADZAgKtAgAAANkCCK4CAAAA2QIIswIAAPED2QIiBKwCAAAA2QICrQIAAADZAgiuAgAAANkCCLMCAADyA9kCIgcKAADPAwAgOQAA9AMAIDoAAPQDACCsAgAAANcCAq0CAAAA1wIIrgIAAADXAgizAgAA8wPXAiIErAIAAADXAgKtAgAAANcCCK4CAAAA1wIIswIAAPQD1wIiE58CAAD1AwAwoAIAAMgCABChAgAA9QMAMKICAQDKAwAhowIBAMoDACGrAkAAzQMAIcMCQADNAwAhxgIBAMoDACHZAgAA9gPjAiLcAgEAywMAId0CAQDKAwAh3gIBAMsDACHfAgEAygMAIeACAQDLAwAh4QJAAM0DACHjAgIA2QMAIeQCIADYAwAh5QIBAMsDACHmAgEAygMAIQcKAADPAwAgOQAA-AMAIDoAAPgDACCsAgAAAOMCAq0CAAAA4wIIrgIAAADjAgizAgAA9wPjAiIHCgAAzwMAIDkAAPgDACA6AAD4AwAgrAIAAADjAgKtAgAAAOMCCK4CAAAA4wIIswIAAPcD4wIiBKwCAAAA4wICrQIAAADjAgiuAgAAAOMCCLMCAAD4A-MCIg2fAgAA-QMAMKACAACyAgAQoQIAAPkDADCiAgEAygMAIasCQADNAwAhwwJAAM0DACHcAgEAywMAIecCAQDKAwAh6AIIAPoDACHpAgEAygMAIeoCCAD6AwAh6wIIAPsDACHsAkAA5QMAIQ0KAADPAwAgOQAA2wMAIDoAANsDACCbAQAA2wMAIJwBAADbAwAgrAIIAAAAAa0CCAAAAASuAggAAAAErwIIAAAAAbACCAAAAAGxAggAAAABsgIIAAAAAbMCCAD-AwAhDQoAANEDACA5AAD9AwAgOgAA_QMAIJsBAAD9AwAgnAEAAP0DACCsAggAAAABrQIIAAAABa4CCAAAAAWvAggAAAABsAIIAAAAAbECCAAAAAGyAggAAAABswIIAPwDACENCgAA0QMAIDkAAP0DACA6AAD9AwAgmwEAAP0DACCcAQAA_QMAIKwCCAAAAAGtAggAAAAFrgIIAAAABa8CCAAAAAGwAggAAAABsQIIAAAAAbICCAAAAAGzAggA_AMAIQisAggAAAABrQIIAAAABa4CCAAAAAWvAggAAAABsAIIAAAAAbECCAAAAAGyAggAAAABswIIAP0DACENCgAAzwMAIDkAANsDACA6AADbAwAgmwEAANsDACCcAQAA2wMAIKwCCAAAAAGtAggAAAAErgIIAAAABK8CCAAAAAGwAggAAAABsQIIAAAAAbICCAAAAAGzAggA_gMAIQ4GAACFBAAgnwIAAP8DADCgAgAAHAAQoQIAAP8DADCiAgEAgQQAIasCQADhAwAhwwJAAOEDACHcAgEAhAQAIecCAQCBBAAh6AIIAIAEACHpAgEAgQQAIeoCCACABAAh6wIIAIIEACHsAkAAgwQAIQisAggAAAABrQIIAAAABK4CCAAAAASvAggAAAABsAIIAAAAAbECCAAAAAGyAggAAAABswIIANsDACELrAIBAAAAAa0CAQAAAASuAgEAAAAErwIBAAAAAbACAQAAAAGxAgEAAAABsgIBAAAAAbMCAQDWAwAhugIBAAAAAbsCAQAAAAG8AgEAAAABCKwCCAAAAAGtAggAAAAFrgIIAAAABa8CCAAAAAGwAggAAAABsQIIAAAAAbICCAAAAAGzAggA_QMAIQisAkAAAAABrQJAAAAABa4CQAAAAAWvAkAAAAABsAJAAAAAAbECQAAAAAGyAkAAAAABswJAAOcDACELrAIBAAAAAa0CAQAAAAWuAgEAAAAFrwIBAAAAAbACAQAAAAGxAgEAAAABsgIBAAAAAbMCAQDUAwAhugIBAAAAAbsCAQAAAAG8AgEAAAABGQUAALgEACAJAAClBAAgCwAAywQAIAwAAMwEACCfAgAAyQQAMKACAAALABChAgAAyQQAMKICAQCBBAAhowIBAIEEACGrAkAA4QMAIcMCQADhAwAhggMBAIEEACGDAwEAhAQAIYQDAQCEBAAhhgMAAMoEhgMihwMBAIEEACGIAwEAgQQAIYkDAQCEBAAhigMBAIQEACGLAwEAhAQAIYwDAQCEBAAhjQMgAN8DACGOAwEAhAQAIawDAAALACCtAwAACwAgEp8CAACGBAAwoAIAAJoCABChAgAAhgQAMKICAQDKAwAhowIBAMoDACGrAkAAzQMAIcICAgDZAwAhwwJAAM0DACHZAgAAhwTwAiLnAgEAygMAIe0CAQDLAwAh7gJAAM0DACHwAkAA5QMAIfECAQDLAwAh8gIBAMsDACHzAgIA2QMAIfQCQADlAwAh9QIBAMsDACEHCgAAzwMAIDkAAIkEACA6AACJBAAgrAIAAADwAgKtAgAAAPACCK4CAAAA8AIIswIAAIgE8AIiBwoAAM8DACA5AACJBAAgOgAAiQQAIKwCAAAA8AICrQIAAADwAgiuAgAAAPACCLMCAACIBPACIgSsAgAAAPACAq0CAAAA8AIIrgIAAADwAgizAgAAiQTwAiIPnwIAAIoEADCgAgAAgAIAEKECAACKBAAwogIBAMoDACGrAkAAzQMAIcMCQADNAwAh5wIBAMoDACH3AgAAiwT3AiL4AgAAjAQAIPkCAACNBAAg-gJAAM0DACH7AkAA5QMAIfwCCAD6AwAh_QIBAMsDACH-AiAA2AMAIQcKAADPAwAgOQAAjwQAIDoAAI8EACCsAgAAAPcCAq0CAAAA9wIIrgIAAAD3AgizAgAAjgT3AiIErAIBAAAABf8CAQAAAAGAAwEAAAAEgQMBAAAABASsAgIAAAAF_wICAAAAAYADAgAAAASBAwIAAAAEBwoAAM8DACA5AACPBAAgOgAAjwQAIKwCAAAA9wICrQIAAAD3AgiuAgAAAPcCCLMCAACOBPcCIgSsAgAAAPcCAq0CAAAA9wIIrgIAAAD3AgizAgAAjwT3AiITnwIAAJAEADCgAgAA6gEAEKECAACQBAAwogIBAMoDACGjAgEAygMAIasCQADNAwAhwwJAAM0DACGCAwEAygMAIYMDAQDLAwAhhAMBAMsDACGGAwAAkQSGAyKHAwEAygMAIYgDAQDKAwAhiQMBAMsDACGKAwEAywMAIYsDAQDLAwAhjAMBAMsDACGNAyAA2AMAIY4DAQDLAwAhBwoAAM8DACA5AACTBAAgOgAAkwQAIKwCAAAAhgMCrQIAAACGAwiuAgAAAIYDCLMCAACSBIYDIgcKAADPAwAgOQAAkwQAIDoAAJMEACCsAgAAAIYDAq0CAAAAhgMIrgIAAACGAwizAgAAkgSGAyIErAIAAACGAwKtAgAAAIYDCK4CAAAAhgMIswIAAJMEhgMiDp8CAACUBAAwoAIAANQBABChAgAAlAQAMKICAQDKAwAhpAIBAMoDACGrAkAAzQMAIcMCQADNAwAh2QIAAJYElAMijwMBAMoDACGRAwAAlQSRAyKSAwEAygMAIZQDAQDKAwAhlQNAAM0DACGWA0AA5QMAIQcKAADPAwAgOQAAmgQAIDoAAJoEACCsAgAAAJEDAq0CAAAAkQMIrgIAAACRAwizAgAAmQSRAyIHCgAAzwMAIDkAAJgEACA6AACYBAAgrAIAAACUAwKtAgAAAJQDCK4CAAAAlAMIswIAAJcElAMiBwoAAM8DACA5AACYBAAgOgAAmAQAIKwCAAAAlAMCrQIAAACUAwiuAgAAAJQDCLMCAACXBJQDIgSsAgAAAJQDAq0CAAAAlAMIrgIAAACUAwizAgAAmASUAyIHCgAAzwMAIDkAAJoEACA6AACaBAAgrAIAAACRAwKtAgAAAJEDCK4CAAAAkQMIswIAAJkEkQMiBKwCAAAAkQMCrQIAAACRAwiuAgAAAJEDCLMCAACaBJEDIgufAgAAmwQAMKACAAC-AQAQoQIAAJsEADCiAgEAygMAIaQCAQDKAwAhpQIBAMoDACHDAkAAzQMAIf4CIADYAwAhkQMAAJUEkQMilwMAAIwEACCYA0AAzQMAIQmfAgAAnAQAMKACAACoAQAQoQIAAJwEADCiAgEAygMAIaMCAQDKAwAhqwJAAM0DACHDAkAAzQMAIeYCAQDKAwAhggMBAMoDACEVnwIAAJ0EADCgAgAAkgEAEKECAACdBAAwogIBAMoDACGrAkAAzQMAIcMCQADNAwAh3AIBAMsDACHmAgEAygMAIYIDAQDKAwAhmQMBAMsDACGaA0AAzQMAIZsDAQDLAwAhnAMBAMsDACGdAwAAjAQAIJ4DAACMBAAgnwMBAMoDACGgAwEAygMAIaEDAQDLAwAhogMBAMsDACGjAyAA2AMAIaQDAQDLAwAhDZ8CAACeBAAwoAIAAHwAEKECAACeBAAwogIBAMoDACGrAkAAzQMAIcMCQADNAwAh_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_BKcDIqIDAQCEBAAhpQMBAIEEACGnAwEAhAQAIQSsAgAAAKcDAq0CAAAApwMIrgIAAACnAwizAgAAoQSnAyIDqAMAAAMAIKkDAAADACCqAwAAAwAgA6gDAABGACCpAwAARgAgqgMAAEYAIAOoAwAANAAgqQMAADQAIKoDAAA0ACAPFgAA4gMAIJ8CAADeAwAwoAIAAFoAEKECAADeAwAwogIBAIEEACGlAgEAgQQAIb0CIADfAwAhvgIgAN8DACG_AiAA3wMAIcACIADfAwAhwQIgAN8DACHCAgIA4AMAIcMCQADhAwAhrAMAAFoAIK0DAABaACAWBQAAuAQAIAYAAIUEACAHAADGBAAgCAAAtQQAIJ8CAADEBAAwoAIAABMAEKECAADEBAAwogIBAIEEACGjAgEAgQQAIasCQADhAwAhwgICAOADACHDAkAA4QMAIdkCAADFBPACIucCAQCBBAAh7QIBAIQEACHuAkAA4QMAIfACQACDBAAh8QIBAIQEACHyAgEAhAQAIfMCAgDgAwAh9AJAAIMEACH1AgEAhAQAIQSsAgAAAPACAq0CAAAA8AIIrgIAAADwAgizAgAAiQTwAiITBgAAhQQAIAkAAKUEACCfAgAAxwQAMKACAAAPABChAgAAxwQAMKICAQCBBAAhqwJAAOEDACHDAkAA4QMAIecCAQCBBAAh9wIAAMgE9wIi-AIAAIwEACD5AgAAjQQAIPoCQADhAwAh-wJAAIMEACH8AggAgAQAIf0CAQCEBAAh_gIgAN8DACGsAwAADwAgrQMAAA8AIBEGAACFBAAgCQAApQQAIJ8CAADHBAAwoAIAAA8AEKECAADHBAAwogIBAIEEACGrAkAA4QMAIcMCQADhAwAh5wIBAIEEACH3AgAAyAT3AiL4AgAAjAQAIPkCAACNBAAg-gJAAOEDACH7AkAAgwQAIfwCCACABAAh_QIBAIQEACH-AiAA3wMAIQSsAgAAAPcCAq0CAAAA9wIIrgIAAAD3AgizAgAAjwT3AiIXBQAAuAQAIAkAAKUEACALAADLBAAgDAAAzAQAIJ8CAADJBAAwoAIAAAsAEKECAADJBAAwogIBAIEEACGjAgEAgQQAIasCQADhAwAhwwJAAOEDACGCAwEAgQQAIYMDAQCEBAAhhAMBAIQEACGGAwAAygSGAyKHAwEAgQQAIYgDAQCBBAAhiQMBAIQEACGKAwEAhAQAIYsDAQCEBAAhjAMBAIQEACGNAyAA3wMAIY4DAQCEBAAhBKwCAAAAhgMCrQIAAACGAwiuAgAAAIYDCLMCAACTBIYDIgOoAwAADwAgqQMAAA8AIKoDAAAPACAQBgAAhQQAIJ8CAAD_AwAwoAIAABwAEKECAAD_AwAwogIBAIEEACGrAkAA4QMAIcMCQADhAwAh3AIBAIQEACHnAgEAgQQAIegCCACABAAh6QIBAIEEACHqAggAgAQAIesCCACCBAAh7AJAAIMEACGsAwAAHAAgrQMAABwAIA4DAADiAwAgBQAAuAQAIBcAAKkEACAZAADABAAgGwAAwQQAIJ8CAADNBAAwoAIAAAcAEKECAADNBAAwogIBAIEEACGjAgEAgQQAIasCQADhAwAhwwJAAOEDACHmAgEAgQQAIYIDAQCBBAAhAqQCAQAAAAGlAgEAAAABDRUAAK4EACAWAADiAwAgnwIAAM8EADCgAgAAAwAQoQIAAM8EADCiAgEAgQQAIaQCAQCBBAAhpQIBAIEEACHDAkAA4QMAIf4CIADfAwAhkQMAAKwEkQMilwMAAIwEACCYA0AA4QMAIQAAAAABsQMBAAAAAQGxAwEAAAABAbEDQAAAAAEHMwAA2wkAIDQAAOQJACCuAwAA3AkAIK8DAADjCQAgsgMAADQAILMDAAA0ACC0AwAAUQAgBzMAANkJACA0AADhCQAgrgMAANoJACCvAwAA4AkAILIDAAAHACCzAwAABwAgtAMAAAkAIAczAADXCQAgNAAA3gkAIK4DAADYCQAgrwMAAN0JACCyAwAAGAAgswMAABgAILQDAAABACADMwAA2wkAIK4DAADcCQAgtAMAAFEAIAMzAADZCQAgrgMAANoJACC0AwAACQAgAzMAANcJACCuAwAA2AkAILQDAAABACAAAAAAAAGxAyAAAAABBbEDAgAAAAG4AwIAAAABuQMCAAAAAboDAgAAAAG7AwIAAAABBTMAANIJACA0AADVCQAgrgMAANMJACCvAwAA1AkAILQDAAABACADMwAA0gkAIK4DAADTCQAgtAMAAAEAIA8XAAC5CAAgGAAAtwgAIBwAAK8IACAdAACwCAAgHgAAsQgAIB8AALIIACAgAACzCAAgIQAAtAgAICIAALQIACAjAAC1CAAgJAAAtQgAICUAALYIACAmAAC4CAAgogMAANAEACCnAwAA0AQAIAAAAAGxAwAAAMUCAgGxA0AAAAABBTMAAMoJACA0AADQCQAgrgMAAMsJACCvAwAAzwkAILQDAAABACAHMwAAyAkAIDQAAM0JACCuAwAAyQkAIK8DAADMCQAgsgMAADQAILMDAAA0ACC0AwAAUQAgAzMAAMoJACCuAwAAywkAILQDAAABACADMwAAyAkAIK4DAADJCQAgtAMAAFEAIAAAAAGxAwAAAM4CAgUzAAC9CQAgNAAAxgkAIK4DAAC-CQAgrwMAAMUJACC0AwAAUQAgBTMAALsJACA0AADDCQAgrgMAALwJACCvAwAAwgkAILQDAAABACAHMwAAuQkAIDQAAMAJACCuAwAAugkAIK8DAAC_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_wgAIK4DAAD7CAAgrwMAAP4IACC0AwAAUQAgCzMAANcFADA0AADcBQAwrgMAANgFADCvAwAA2QUAMLADAADaBQAgsQMAANsFADCyAwAA2wUAMLMDAADbBQAwtAMAANsFADC1AwAA3QUAMLYDAADeBQAwCzMAAM4FADA0AADSBQAwrgMAAM8FADCvAwAA0AUAMLADAADRBQAgsQMAALUFADCyAwAAtQUAMLMDAAC1BQAwtAMAALUFADC1AwAA0wUAMLYDAAC4BQAwBzMAAMkFACA0AADMBQAgrgMAAMoFACCvAwAAywUAILIDAAAcACCzAwAAHAAgtAMAAJ0CACAJogIBAAAAAasCQAAAAAHDAkAAAAAB3AIBAAAAAegCCAAAAAHpAgEAAAAB6gIIAAAAAesCCAAAAAHsAkAAAAABAgAAAJ0CACAzAADJBQAgAwAAABwAIDMAAMkFACA0AADNBQAgCwAAABwAICwAAM0FACCiAgEA1AQAIasCQADWBAAhwwJAANYEACHcAgEA1QQAIegCCACUBQAh6QIBANQEACHqAggAlAUAIesCCACVBQAh7AJAAOsEACEJogIBANQEACGrAkAA1gQAIcMCQADWBAAh3AIBANUEACHoAggAlAUAIekCAQDUBAAh6gIIAJQFACHrAggAlQUAIewCQADrBAAhEQUAAKUFACAHAACkBQAgCAAApgUAIKICAQAAAAGjAgEAAAABqwJAAAAAAcICAgAAAAHDAkAAAAAB2QIAAADwAgLtAgEAAAAB7gJAAAAAAfACQAAAAAHxAgEAAAAB8gIBAAAAAfMCAgAAAAH0AkAAAAAB9QIBAAAAAQIAAAAVACAzAADWBQAgAwAAABUAIDMAANYFACA0AADVBQAgASwAAP0IADACAAAAFQAgLAAA1QUAIAIAAAC5BQAgLAAA1AUAIA6iAgEA1AQAIaMCAQDUBAAhqwJAANYEACHCAgIA4wQAIcMCQADWBAAh2QIAAJ4F8AIi7QIBANUEACHuAkAA1gQAIfACQADrBAAh8QIBANUEACHyAgEA1QQAIfMCAgDjBAAh9AJAAOsEACH1AgEA1QQAIREFAAChBQAgBwAAoAUAIAgAAKIFACCiAgEA1AQAIaMCAQDUBAAhqwJAANYEACHCAgIA4wQAIcMCQADWBAAh2QIAAJ4F8AIi7QIBANUEACHuAkAA1gQAIfACQADrBAAh8QIBANUEACHyAgEA1QQAIfMCAgDjBAAh9AJAAOsEACH1AgEA1QQAIREFAAClBQAgBwAApAUAIAgAAKYFACCiAgEAAAABowIBAAAAAasCQAAAAAHCAgIAAAABwwJAAAAAAdkCAAAA8AIC7QIBAAAAAe4CQAAAAAHwAkAAAAAB8QIBAAAAAfICAQAAAAHzAgIAAAAB9AJAAAAAAfUCAQAAAAEMCQAAwAUAIKICAQAAAAGrAkAAAAABwwJAAAAAAfcCAAAA9wIC-AIAAL0FACD5AgAAvgUAIPoCQAAAAAH7AkAAAAAB_AIIAAAAAf0CAQAAAAH-AiAAAAABAgAAABEAIDMAAOIFACADAAAAEQAgMwAA4gUAIDQAAOEFACABLAAA_AgAMBEGAACFBAAgCQAApQQAIJ8CAADHBAAwoAIAAA8AEKECAADHBAAwogIBAAAAAasCQADhAwAhwwJAAOEDACHnAgEAgQQAIfcCAADIBPcCIvgCAACMBAAg-QIAAI0EACD6AkAA4QMAIfsCQACDBAAh_AIIAIAEACH9AgEAhAQAIf4CIADfAwAhAgAAABEAICwAAOEFACACAAAA3wUAICwAAOAFACAPnwIAAN4FADCgAgAA3wUAEKECAADeBQAwogIBAIEEACGrAkAA4QMAIcMCQADhAwAh5wIBAIEEACH3AgAAyAT3AiL4AgAAjAQAIPkCAACNBAAg-gJAAOEDACH7AkAAgwQAIfwCCACABAAh_QIBAIQEACH-AiAA3wMAIQ-fAgAA3gUAMKACAADfBQAQoQIAAN4FADCiAgEAgQQAIasCQADhAwAhwwJAAOEDACHnAgEAgQQAIfcCAADIBPcCIvgCAACMBAAg-QIAAI0EACD6AkAA4QMAIfsCQACDBAAh_AIIAIAEACH9AgEAhAQAIf4CIADfAwAhC6ICAQDUBAAhqwJAANYEACHDAkAA1gQAIfcCAACsBfcCIvgCAACtBQAg-QIAAK4FACD6AkAA1gQAIfsCQADrBAAh_AIIAJQFACH9AgEA1QQAIf4CIADiBAAhDAkAALAFACCiAgEA1AQAIasCQADWBAAhwwJAANYEACH3AgAArAX3AiL4AgAArQUAIPkCAACuBQAg-gJAANYEACH7AkAA6wQAIfwCCACUBQAh_QIBANUEACH-AiAA4gQAIQwJAADABQAgogIBAAAAAasCQAAAAAHDAkAAAAAB9wIAAAD3AgL4AgAAvQUAIPkCAAC-BQAg-gJAAAAAAfsCQAAAAAH8AggAAAAB_QIBAAAAAf4CIAAAAAEDMwAA-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_gIgAN8DACGRAwAArASRAyKXAwAAjAQAIJgDQADhAwAhC58CAACgBgAwoAIAAKEGABChAgAAoAYAMKICAQCBBAAhpAIBAIEEACGlAgEAgQQAIcMCQADhAwAh_gIgAN8DACGRAwAArASRAyKXAwAAjAQAIJgDQADhAwAhB6ICAQDUBAAhpQIBANQEACHDAkAA1gQAIf4CIADiBAAhkQMAAOoFkQMilwMAAPMFACCYA0AA1gQAIQgWAAD1BQAgogIBANQEACGlAgEA1AQAIcMCQADWBAAh_gIgAOIEACGRAwAA6gWRAyKXAwAA8wUAIJgDQADWBAAhCBYAAPgFACCiAgEAAAABpQIBAAAAAcMCQAAAAAH-AiAAAAABkQMAAACRAwKXAwAA9gUAIJgDQAAAAAEDMwAA2wgAIK4DAADcCAAgtAMAAFEAIAMzAADZCAAgrgMAANoIACC0AwAAAQAgBDMAAJkGADCuAwAAmgYAMLADAACcBgAgtAMAAJ0GADAEMwAAjQYAMK4DAACOBgAwsAMAAJAGACC0AwAAkQYAMAQzAACBBgAwrgMAAIIGADCwAwAAhAYAILQDAACFBgAwAAAAArEDAQAAAAS3AwEAAAAFArEDAQAAAAS3AwEAAAAFBTMAAMwIACA0AADXCAAgrgMAAM0IACCvAwAA1ggAILQDAAABACALMwAAhgcAMDQAAIsHADCuAwAAhwcAMK8DAACIBwAwsAMAAIkHACCxAwAAigcAMLIDAACKBwAwswMAAIoHADC0AwAAigcAMLUDAACMBwAwtgMAAI0HADALMwAA-gYAMDQAAP8GADCuAwAA-wYAMK8DAAD8BgAwsAMAAP0GACCxAwAA_gYAMLIDAAD-BgAwswMAAP4GADC0AwAA_gYAMLUDAACABwAwtgMAAIEHADALMwAA8QYAMDQAAPUGADCuAwAA8gYAMK8DAADzBgAwsAMAAPQGACCxAwAAtQUAMLIDAAC1BQAwswMAALUFADC0AwAAtQUAMLUDAAD2BgAwtgMAALgFADALMwAA5QYAMDQAAOoGADCuAwAA5gYAMK8DAADnBgAwsAMAAOgGACCxAwAA6QYAMLIDAADpBgAwswMAAOkGADC0AwAA6QYAMLUDAADrBgAwtgMAAOwGADALMwAA2QYAMDQAAN4GADCuAwAA2gYAMK8DAADbBgAwsAMAANwGACCxAwAA3QYAMLIDAADdBgAwswMAAN0GADC0AwAA3QYAMLUDAADfBgAwtgMAAOAGADALMwAAzQYAMDQAANIGADCuAwAAzgYAMK8DAADPBgAwsAMAANAGACCxAwAA0QYAMLIDAADRBgAwswMAANEGADC0AwAA0QYAMLUDAADTBgAwtgMAANQGADALMwAAxAYAMDQAAMgGADCuAwAAxQYAMK8DAADGBgAwsAMAAMcGACCxAwAAhQYAMLIDAACFBgAwswMAAIUGADC0AwAAhQYAMLUDAADJBgAwtgMAAIgGADALMwAAuAYAMDQAAL0GADCuAwAAuQYAMK8DAAC6BgAwsAMAALsGACCxAwAAvAYAMLIDAAC8BgAwswMAALwGADC0AwAAvAYAMLUDAAC-BgAwtgMAAL8GADAMFgAA7gQAICyAAAAAAaICAQAAAAGlAgEAAAABqwJAAAAAAcUCAAAAxQICxgIBAAAAAccCAQAAAAHIAiAAAAAByQJAAAAAAcoCAQAAAAHLAiAAAAABAgAAADoAIDMAAMMGACADAAAAOgAgMwAAwwYAIDQAAMIGACABLAAA1QgAMBEFAACyBAAgFgAA4gMAICwAALEEACCfAgAArwQAMKACAAA4ABChAgAArwQAMKICAQAAAAGjAgEAhAQAIaUCAQCBBAAhqwJAAOEDACHFAgAAsATFAiLGAgEAgQQAIccCAQCBBAAhyAIgAN8DACHJAkAAgwQAIcoCAQCBBAAhywIgAN8DACECAAAAOgAgLAAAwgYAIAIAAADABgAgLAAAwQYAIA8sAACxBAAgnwIAAL8GADCgAgAAwAYAEKECAAC_BgAwogIBAIEEACGjAgEAhAQAIaUCAQCBBAAhqwJAAOEDACHFAgAAsATFAiLGAgEAgQQAIccCAQCBBAAhyAIgAN8DACHJAkAAgwQAIcoCAQCBBAAhywIgAN8DACEPLAAAsQQAIJ8CAAC_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-QYAIAMAAAAVACAzAAD5BgAgNAAA-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_BQAgogIBANQEACGrAkAA1gQAIcMCQADWBAAh5gIBANQEACGCAwEA1AQAIQkDAACmBgAgFwAAqQYAIBkAAKcGACAbAACoBgAgogIBAAAAAasCQAAAAAHDAkAAAAAB5gIBAAAAAYIDAQAAAAEBsQMBAAAABAGxAwEAAAAEAzMAAMwIACCuAwAAzQgAILQDAAABACAEMwAAhgcAMK4DAACHBwAwsAMAAIkHACC0AwAAigcAMAQzAAD6BgAwrgMAAPsGADCwAwAA_QYAILQDAAD-BgAwBDMAAPEGADCuAwAA8gYAMLADAAD0BgAgtAMAALUFADAEMwAA5QYAMK4DAADmBgAwsAMAAOgGACC0AwAA6QYAMAQzAADZBgAwrgMAANoGADCwAwAA3AYAILQDAADdBgAwBDMAAM0GADCuAwAAzgYAMLADAADQBgAgtAMAANEGADAEMwAAxAYAMK4DAADFBgAwsAMAAMcGACC0AwAAhQYAMAQzAAC4BgAwrgMAALkGADCwAwAAuwYAILQDAAC8BgAwAAAAAbEDAAAApwMCCzMAAJkIADA0AACdCAAwrgMAAJoIADCvAwAAmwgAMLADAACcCAAgsQMAAJ0GADCyAwAAnQYAMLMDAACdBgAwtAMAAJ0GADC1AwAAnggAMLYDAACgBgAwCzMAAJAIADA0AACUCAAwrgMAAJEIADCvAwAAkggAMLADAACTCAAgsQMAAIoHADCyAwAAigcAMLMDAACKBwAwtAMAAIoHADC1AwAAlQgAMLYDAACNBwAwCzMAAIcIADA0AACLCAAwrgMAAIgIADCvAwAAiQgAMLADAACKCAAgsQMAAJEGADCyAwAAkQYAMLMDAACRBgAwtAMAAJEGADC1AwAAjAgAMLYDAACUBgAwCzMAAPsHADA0AACACAAwrgMAAPwHADCvAwAA_QcAMLADAAD-BwAgsQMAAP8HADCyAwAA_wcAMLMDAAD_BwAwtAMAAP8HADC1AwAAgQgAMLYDAACCCAAwCzMAAPIHADA0AAD2BwAwrgMAAPMHADCvAwAA9AcAMLADAAD1BwAgsQMAALUFADCyAwAAtQUAMLMDAAC1BQAwtAMAALUFADC1AwAA9wcAMLYDAAC4BQAwCzMAAOkHADA0AADtBwAwrgMAAOoHADCvAwAA6wcAMLADAADsBwAgsQMAAN0GADCyAwAA3QYAMLMDAADdBgAwtAMAAN0GADC1AwAA7gcAMLYDAADgBgAwCzMAAOAHADA0AADkBwAwrgMAAOEHADCvAwAA4gcAMLADAADjBwAgsQMAAN0GADCyAwAA3QYAMLMDAADdBgAwtAMAAN0GADC1AwAA5QcAMLYDAADgBgAwCzMAANcHADA0AADbBwAwrgMAANgHADCvAwAA2QcAMLADAADaBwAgsQMAANEGADCyAwAA0QYAMLMDAADRBgAwtAMAANEGADC1AwAA3AcAMLYDAADUBgAwCzMAAM4HADA0AADSBwAwrgMAAM8HADCvAwAA0AcAMLADAADRBwAgsQMAANEGADCyAwAA0QYAMLMDAADRBgAwtAMAANEGADC1AwAA0wcAMLYDAADUBgAwCzMAAMUHADA0AADJBwAwrgMAAMYHADCvAwAAxwcAMLADAADIBwAgsQMAAOkGADCyAwAA6QYAMLMDAADpBgAwtAMAAOkGADC1AwAAygcAMLYDAADsBgAwCzMAALwHADA0AADABwAwrgMAAL0HADCvAwAAvgcAMLADAAC_BwAgsQMAALwGADCyAwAAvAYAMLMDAAC8BgAwtAMAALwGADC1AwAAwQcAMLYDAAC_BgAwBzMAALcHACA0AAC6BwAgrgMAALgHACCvAwAAuQcAILIDAABaACCzAwAAWgAgtAMAAJUDACALMwAArgcAMDQAALIHADCuAwAArwcAMK8DAACwBwAwsAMAALEHACCxAwAAhQYAMLIDAACFBgAwswMAAIUGADC0AwAAhQYAMLUDAACzBwAwtgMAAIgGADALBQAA2gQAIBUAANsEACCiAgEAAAABowIBAAAAAaQCAQAAAAGmAgEAAAABpwIBAAAAAagCAQAAAAGpAoAAAAABqgIBAAAAAasCQAAAAAECAAAAMgAgMwAAtgcAIAMAAAAyACAzAAC2BwAgNAAAtQcAIAEsAADLCAAwAgAAADIAICwAALUHACACAAAAiQYAICwAALQHACAJogIBANQEACGjAgEA1QQAIaQCAQDVBAAhpgIBANQEACGnAgEA1AQAIagCAQDVBAAhqQKAAAAAAaoCAQDVBAAhqwJAANYEACELBQAA1wQAIBUAANgEACCiAgEA1AQAIaMCAQDVBAAhpAIBANUEACGmAgEA1AQAIacCAQDUBAAhqAIBANUEACGpAoAAAAABqgIBANUEACGrAkAA1gQAIQsFAADaBAAgFQAA2wQAIKICAQAAAAGjAgEAAAABpAIBAAAAAaYCAQAAAAGnAgEAAAABqAIBAAAAAakCgAAAAAGqAgEAAAABqwJAAAAAAQiiAgEAAAABvQIgAAAAAb4CIAAAAAG_AiAAAAABwAIgAAAAAcECIAAAAAHCAgIAAAABwwJAAAAAAQIAAACVAwAgMwAAtwcAIAMAAABaACAzAAC3BwAgNAAAuwcAIAoAAABaACAsAAC7BwAgogIBANQEACG9AiAA4gQAIb4CIADiBAAhvwIgAOIEACHAAiAA4gQAIcECIADiBAAhwgICAOMEACHDAkAA1gQAIQiiAgEA1AQAIb0CIADiBAAhvgIgAOIEACG_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_QTXAiLZAgAA_gTZAiLaAkAA6wQAIdwCAQDVBAAhDgUAAP8EACAPAACABQAgogIBANQEACGjAgEA1AQAIasCQADWBAAhwwJAANYEACHGAgEA1AQAIdMCAQDVBAAh1AIBANUEACHVAkAA1gQAIdcCAAD9BNcCItkCAAD-BNkCItoCQADrBAAh3AIBANUEACEOBQAAggUAIA8AAIMFACCiAgEAAAABowIBAAAAAasCQAAAAAHDAkAAAAABxgIBAAAAAdMCAQAAAAHUAgEAAAAB1QJAAAAAAdcCAAAA1wIC2QIAAADZAgLaAkAAAAAB3AIBAAAAAQ4FAACCBQAgEAAAhAUAIKICAQAAAAGjAgEAAAABqwJAAAAAAcMCQAAAAAHGAgEAAAAB1AIBAAAAAdUCQAAAAAHXAgAAANcCAtkCAAAA2QIC2gJAAAAAAdsCAQAAAAHcAgEAAAABAgAAACcAIDMAAPEHACADAAAAJwAgMwAA8QcAIDQAAPAHACABLAAAxQgAMAIAAAAnACAsAADwBwAgAgAAAOEGACAsAADvBwAgDKICAQDUBAAhowIBANQEACGrAkAA1gQAIcMCQADWBAAhxgIBANQEACHUAgEA1QQAIdUCQADWBAAh1wIAAP0E1wIi2QIAAP4E2QIi2gJAAOsEACHbAgEA1QQAIdwCAQDVBAAhDgUAAP8EACAQAACBBQAgogIBANQEACGjAgEA1AQAIasCQADWBAAhwwJAANYEACHGAgEA1AQAIdQCAQDVBAAh1QJAANYEACHXAgAA_QTXAiLZAgAA_gTZAiLaAkAA6wQAIdsCAQDVBAAh3AIBANUEACEOBQAAggUAIBAAAIQFACCiAgEAAAABowIBAAAAAasCQAAAAAHDAkAAAAABxgIBAAAAAdQCAQAAAAHVAkAAAAAB1wIAAADXAgLZAgAAANkCAtoCQAAAAAHbAgEAAAAB3AIBAAAAAREFAAClBQAgBgAAowUAIAcAAKQFACCiAgEAAAABowIBAAAAAasCQAAAAAHCAgIAAAABwwJAAAAAAdkCAAAA8AIC5wIBAAAAAe0CAQAAAAHuAkAAAAAB8AJAAAAAAfICAQAAAAHzAgIAAAAB9AJAAAAAAfUCAQAAAAECAAAAFQAgMwAA-gcAIAMAAAAVACAzAAD6BwAgNAAA-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_gUAIBsAAP8FACCiAgEA1AQAIaMCAQDUBAAhqwJAANYEACHDAkAA1gQAIYIDAQDUBAAhCQUAAKUGACAXAACpBgAgGQAApwYAIBsAAKgGACCiAgEAAAABowIBAAAAAasCQAAAAAHDAkAAAAABggMBAAAAAQgVAAD3BQAgogIBAAAAAaQCAQAAAAHDAkAAAAAB_gIgAAAAAZEDAAAAkQMClwMAAPYFACCYA0AAAAABAgAAAAUAIDMAAKEIACADAAAABQAgMwAAoQgAIDQAAKAIACABLAAAwAgAMAIAAAAFACAsAACgCAAgAgAAAKEGACAsAACfCAAgB6ICAQDUBAAhpAIBANQEACHDAkAA1gQAIf4CIADiBAAhkQMAAOoFkQMilwMAAPMFACCYA0AA1gQAIQgVAAD0BQAgogIBANQEACGkAgEA1AQAIcMCQADWBAAh_gIgAOIEACGRAwAA6gWRAyKXAwAA8wUAIJgDQADWBAAhCBUAAPcFACCiAgEAAAABpAIBAAAAAcMCQAAAAAH-AiAAAAABkQMAAACRAwKXAwAA9gUAIJgDQAAAAAEEMwAAmQgAMK4DAACaCAAwsAMAAJwIACC0AwAAnQYAMAQzAACQCAAwrgMAAJEIADCwAwAAkwgAILQDAACKBwAwBDMAAIcIADCuAwAAiAgAMLADAACKCAAgtAMAAJEGADAEMwAA-wcAMK4DAAD8BwAwsAMAAP4HACC0AwAA_wcAMAQzAADyBwAwrgMAAPMHADCwAwAA9QcAILQDAAC1BQAwBDMAAOkHADCuAwAA6gcAMLADAADsBwAgtAMAAN0GADAEMwAA4AcAMK4DAADhBwAwsAMAAOMHACC0AwAA3QYAMAQzAADXBwAwrgMAANgHADCwAwAA2gcAILQDAADRBgAwBDMAAM4HADCuAwAAzwcAMLADAADRBwAgtAMAANEGADAEMwAAxQcAMK4DAADGBwAwsAMAAMgHACC0AwAA6QYAMAQzAAC8BwAwrgMAAL0HADCwAwAAvwcAILQDAAC8BgAwAzMAALcHACCuAwAAuAcAILQDAACVAwAgBDMAAK4HADCuAwAArwcAMLADAACxBwAgtAMAAIUGADAAAAAAAAAAAAABFgAA5gQAIAAABQMAAOYEACAFAAC8CAAgFwAAuQgAIBkAAK8IACAbAACxCAAgEAMAAOYEACAEAACwCAAgCQAAswgAIA0AALoIACAOAAC2CAAgEQAAtAgAIBQAALUIACAXAAC5CAAgGAAAtwgAINwCAADQBAAgmQMAANAEACCbAwAA0AQAIJwDAADQBAAgoQMAANAEACCiAwAA0AQAIKQDAADQBAAgBAYAAJgFACAJAACzCAAg-wIAANAEACD9AgAA0AQAIAAEBgAAmAUAINwCAADQBAAg6wIAANAEACDsAgAA0AQAIAeiAgEAAAABpAIBAAAAAcMCQAAAAAH-AiAAAAABkQMAAACRAwKXAwAA9gUAIJgDQAAAAAEFogIBAAAAAaMCAQAAAAGrAkAAAAABwwJAAAAAAYIDAQAAAAEKogIBAAAAAaQCAQAAAAGrAkAAAAABwwJAAAAAAdkCAAAAlAMCjwMBAAAAAZEDAAAAkQMCkgMBAAAAAZUDQAAAAAGWA0AAAAABEaICAQAAAAGrAkAAAAABwwJAAAAAAdwCAQAAAAGCAwEAAAABmQMBAAAAAZoDQAAAAAGbAwEAAAABnAMBAAAAAZ0DAACSBwAgngMAAJMHACCfAwEAAAABoAMBAAAAAaEDAQAAAAGiAwEAAAABowMgAAAAAaQDAQAAAAEOogIBAAAAAaMCAQAAAAGrAkAAAAABwgICAAAAAcMCQAAAAAHZAgAAAPACAucCAQAAAAHtAgEAAAAB7gJAAAAAAfACQAAAAAHyAgEAAAAB8wICAAAAAfQCQAAAAAH1AgEAAAABDKICAQAAAAGjAgEAAAABqwJAAAAAAcMCQAAAAAHGAgEAAAAB1AIBAAAAAdUCQAAAAAHXAgAAANcCAtkCAAAA2QIC2gJAAAAAAdsCAQAAAAHcAgEAAAABDKICAQAAAAGjAgEAAAABqwJAAAAAAcMCQAAAAAHGAgEAAAAB0wIBAAAAAdQCAQAAAAHVAkAAAAAB1wIAAADXAgLZAgAAANkCAtoCQAAAAAHcAgEAAAABCqICAQAAAAGjAgEAAAABqwJAAAAAAcMCQAAAAAHGAgEAAAABzgIAAADOAgLPAgEAAAAB0AKAAAAAAdECIAAAAAHSAgEAAAABCqICAQAAAAGjAgEAAAABqwJAAAAAAcMCQAAAAAHGAgEAAAABzAIBAAAAAc4CAAAAzgICzwIBAAAAAdACgAAAAAHRAiAAAAABD6ICAQAAAAGjAgEAAAABqwJAAAAAAcMCQAAAAAHGAgEAAAAB2QIAAADjAgLcAgEAAAAB3QIBAAAAAd4CAQAAAAHfAgEAAAAB4AIBAAAAAeECQAAAAAHjAgIAAAAB5AIgAAAAAeUCAQAAAAELLIAAAAABogIBAAAAAaMCAQAAAAGrAkAAAAABxQIAAADFAgLGAgEAAAABxwIBAAAAAcgCIAAAAAHJAkAAAAABygIBAAAAAcsCIAAAAAEJogIBAAAAAaMCAQAAAAGkAgEAAAABpgIBAAAAAacCAQAAAAGoAgEAAAABqQKAAAAAAaoCAQAAAAGrAkAAAAABFhcAAK4IACAYAACsCAAgHAAAoggAIB0AAKMIACAeAACkCAAgIAAApggAICEAAKcIACAiAACoCAAgIwAAqQgAICQAAKoIACAlAACrCAAgJgAArQgAIKICAQAAAAGrAkAAAAABwwJAAAAAAf4CIAAAAAGCAwEAAAABjwMBAAAAAZEDAAAApwMCogMBAAAAAaUDAQAAAAGnAwEAAAABAgAAAAEAIDMAAMwIACAFogIBAAAAAasCQAAAAAHDAkAAAAAB5gIBAAAAAYIDAQAAAAEPogIBAAAAAasCQAAAAAHDAkAAAAABggMBAAAAAYMDAQAAAAGEAwEAAAABhgMAAACGAwKHAwEAAAABiAMBAAAAAYkDAQAAAAGKAwEAAAABiwMBAAAAAYwDAQAAAAGNAyAAAAABjgMBAAAAAQ6iAgEAAAABqwJAAAAAAcICAgAAAAHDAkAAAAAB2QIAAADwAgLnAgEAAAAB7QIBAAAAAe4CQAAAAAHwAkAAAAAB8QIBAAAAAfICAQAAAAHzAgIAAAAB9AJAAAAAAfUCAQAAAAEPogIBAAAAAasCQAAAAAHDAkAAAAABxgIBAAAAAdkCAAAA4wIC3AIBAAAAAd0CAQAAAAHeAgEAAAAB3wIBAAAAAeACAQAAAAHhAkAAAAAB4wICAAAAAeQCIAAAAAHlAgEAAAAB5gIBAAAAAQyiAgEAAAABqwJAAAAAAcMCQAAAAAHGAgEAAAAB0wIBAAAAAdQCAQAAAAHVAkAAAAAB1wIAAADXAgLZAgAAANkCAtoCQAAAAAHbAgEAAAAB3AIBAAAAAQqiAgEAAAABqwJAAAAAAcMCQAAAAAHGAgEAAAABzAIBAAAAAc4CAAAAzgICzwIBAAAAAdACgAAAAAHRAiAAAAAB0gIBAAAAAQmiAgEAAAABpAIBAAAAAaUCAQAAAAGmAgEAAAABpwIBAAAAAagCAQAAAAGpAoAAAAABqgIBAAAAAasCQAAAAAELLIAAAAABogIBAAAAAaUCAQAAAAGrAkAAAAABxQIAAADFAgLGAgEAAAABxwIBAAAAAcgCIAAAAAHJAkAAAAABygIBAAAAAcsCIAAAAAEDAAAAGAAgMwAAzAgAIDQAANgIACAYAAAAGAAgFwAArQcAIBgAAKsHACAcAAChBwAgHQAAogcAIB4AAKMHACAgAAClBwAgIQAApgcAICIAAKcHACAjAACoBwAgJAAAqQcAICUAAKoHACAmAACsBwAgLAAA2AgAIKICAQDUBAAhqwJAANYEACHDAkAA1gQAIf4CIADiBAAhggMBANQEACGPAwEA1AQAIZEDAACgB6cDIqIDAQDVBAAhpQMBANQEACGnAwEA1QQAIRYXAACtBwAgGAAAqwcAIBwAAKEHACAdAACiBwAgHgAAowcAICAAAKUHACAhAACmBwAgIgAApwcAICMAAKgHACAkAACpBwAgJQAAqgcAICYAAKwHACCiAgEA1AQAIasCQADWBAAhwwJAANYEACH-AiAA4gQAIYIDAQDUBAAhjwMBANQEACGRAwAAoAenAyKiAwEA1QQAIaUDAQDUBAAhpwMBANUEACEWFwAArggAIBgAAKwIACAcAACiCAAgHgAApAgAIB8AAKUIACAgAACmCAAgIQAApwgAICIAAKgIACAjAACpCAAgJAAAqggAICUAAKsIACAmAACtCAAgogIBAAAAAasCQAAAAAHDAkAAAAAB_gIgAAAAAYIDAQAAAAGPAwEAAAABkQMAAACnAwKiAwEAAAABpQMBAAAAAacDAQAAAAECAAAAAQAgMwAA2QgAIBoDAACUBwAgCQAAlwcAIA0AAJYHACAOAACYBwAgEQAAmQcAIBQAAJoHACAXAACbBwAgGAAAnAcAIKICAQAAAAGrAkAAAAABwwJAAAAAAdwCAQAAAAHmAgEAAAABggMBAAAAAZkDAQAAAAGaA0AAAAABmwMBAAAAAZwDAQAAAAGdAwAAkgcAIJ4DAACTBwAgnwMBAAAAAaADAQAAAAGhAwEAAAABogMBAAAAAaMDIAAAAAGkAwEAAAABAgAAAFEAIDMAANsIACAHogIBAAAAAaUCAQAAAAHDAkAAAAAB_gIgAAAAAZEDAAAAkQMClwMAAPYFACCYA0AAAAABCqICAQAAAAGrAkAAAAABwwJAAAAAAdkCAAAAlAMCjwMBAAAAAZEDAAAAkQMCkgMBAAAAAZQDAQAAAAGVA0AAAAABlgNAAAAAAQmiAgEAAAABowIBAAAAAaUCAQAAAAGmAgEAAAABpwIBAAAAAagCAQAAAAGpAoAAAAABqgIBAAAAAasCQAAAAAEDAAAAGAAgMwAA2QgAIDQAAOIIACAYAAAAGAAgFwAArQcAIBgAAKsHACAcAAChBwAgHgAAowcAIB8AAKQHACAgAAClBwAgIQAApgcAICIAAKcHACAjAACoBwAgJAAAqQcAICUAAKoHACAmAACsBwAgLAAA4ggAIKICAQDUBAAhqwJAANYEACHDAkAA1gQAIf4CIADiBAAhggMBANQEACGPAwEA1AQAIZEDAACgB6cDIqIDAQDVBAAhpQMBANQEACGnAwEA1QQAIRYXAACtBwAgGAAAqwcAIBwAAKEHACAeAACjBwAgHwAApAcAICAAAKUHACAhAACmBwAgIgAApwcAICMAAKgHACAkAACpBwAgJQAAqgcAICYAAKwHACCiAgEA1AQAIasCQADWBAAhwwJAANYEACH-AiAA4gQAIYIDAQDUBAAhjwMBANQEACGRAwAAoAenAyKiAwEA1QQAIaUDAQDUBAAhpwMBANUEACEDAAAANAAgMwAA2wgAIDQAAOUIACAcAAAANAAgAwAArwYAIAkAALIGACANAACxBgAgDgAAswYAIBEAALQGACAUAAC1BgAgFwAAtgYAIBgAALcGACAsAADlCAAgogIBANQEACGrAkAA1gQAIcMCQADWBAAh3AIBANUEACHmAgEA1AQAIYIDAQDUBAAhmQMBANUEACGaA0AA1gQAIZsDAQDVBAAhnAMBANUEACGdAwAArQYAIJ4DAACuBgAgnwMBANQEACGgAwEA1AQAIaEDAQDVBAAhogMBANUEACGjAyAA4gQAIaQDAQDVBAAhGgMAAK8GACAJAACyBgAgDQAAsQYAIA4AALMGACARAAC0BgAgFAAAtQYAIBcAALYGACAYAAC3BgAgogIBANQEACGrAkAA1gQAIcMCQADWBAAh3AIBANUEACHmAgEA1AQAIYIDAQDUBAAhmQMBANUEACGaA0AA1gQAIZsDAQDVBAAhnAMBANUEACGdAwAArQYAIJ4DAACuBgAgnwMBANQEACGgAwEA1AQAIaEDAQDVBAAhogMBANUEACGjAyAA4gQAIaQDAQDVBAAhFhcAAK4IACAYAACsCAAgHQAAowgAIB4AAKQIACAfAAClCAAgIAAApggAICEAAKcIACAiAACoCAAgIwAAqQgAICQAAKoIACAlAACrCAAgJgAArQgAIKICAQAAAAGrAkAAAAABwwJAAAAAAf4CIAAAAAGCAwEAAAABjwMBAAAAAZEDAAAApwMCogMBAAAAAaUDAQAAAAGnAwEAAAABAgAAAAEAIDMAAOYIACAKAwAApgYAIAUAAKUGACAXAACpBgAgGwAAqAYAIKICAQAAAAGjAgEAAAABqwJAAAAAAcMCQAAAAAHmAgEAAAABggMBAAAAAQIAAAAJACAzAADoCAAgAwAAABgAIDMAAOYIACA0AADsCAAgGAAAABgAIBcAAK0HACAYAACrBwAgHQAAogcAIB4AAKMHACAfAACkBwAgIAAApQcAICEAAKYHACAiAACnBwAgIwAAqAcAICQAAKkHACAlAACqBwAgJgAArAcAICwAAOwIACCiAgEA1AQAIasCQADWBAAhwwJAANYEACH-AiAA4gQAIYIDAQDUBAAhjwMBANQEACGRAwAAoAenAyKiAwEA1QQAIaUDAQDUBAAhpwMBANUEACEWFwAArQcAIBgAAKsHACAdAACiBwAgHgAAowcAIB8AAKQHACAgAAClBwAgIQAApgcAICIAAKcHACAjAACoBwAgJAAAqQcAICUAAKoHACAmAACsBwAgogIBANQEACGrAkAA1gQAIcMCQADWBAAh_gIgAOIEACGCAwEA1AQAIY8DAQDUBAAhkQMAAKAHpwMiogMBANUEACGlAwEA1AQAIacDAQDVBAAhAwAAAAcAIDMAAOgIACA0AADvCAAgDAAAAAcAIAMAAP0FACAFAAD8BQAgFwAAgAYAIBsAAP8FACAsAADvCAAgogIBANQEACGjAgEA1AQAIasCQADWBAAhwwJAANYEACHmAgEA1AQAIYIDAQDUBAAhCgMAAP0FACAFAAD8BQAgFwAAgAYAIBsAAP8FACCiAgEA1AQAIaMCAQDUBAAhqwJAANYEACHDAkAA1gQAIeYCAQDUBAAhggMBANQEACEWFwAArggAIBgAAKwIACAcAACiCAAgHQAAowgAIB8AAKUIACAgAACmCAAgIQAApwgAICIAAKgIACAjAACpCAAgJAAAqggAICUAAKsIACAmAACtCAAgogIBAAAAAasCQAAAAAHDAkAAAAAB_gIgAAAAAYIDAQAAAAGPAwEAAAABkQMAAACnAwKiAwEAAAABpQMBAAAAAacDAQAAAAECAAAAAQAgMwAA8AgAIAoDAACmBgAgBQAApQYAIBcAAKkGACAZAACnBgAgogIBAAAAAaMCAQAAAAGrAkAAAAABwwJAAAAAAeYCAQAAAAGCAwEAAAABAgAAAAkAIDMAAPIIACADAAAAGAAgMwAA8AgAIDQAAPYIACAYAAAAGAAgFwAArQcAIBgAAKsHACAcAAChBwAgHQAAogcAIB8AAKQHACAgAAClBwAgIQAApgcAICIAAKcHACAjAACoBwAgJAAAqQcAICUAAKoHACAmAACsBwAgLAAA9ggAIKICAQDUBAAhqwJAANYEACHDAkAA1gQAIf4CIADiBAAhggMBANQEACGPAwEA1AQAIZEDAACgB6cDIqIDAQDVBAAhpQMBANQEACGnAwEA1QQAIRYXAACtBwAgGAAAqwcAIBwAAKEHACAdAACiBwAgHwAApAcAICAAAKUHACAhAACmBwAgIgAApwcAICMAAKgHACAkAACpBwAgJQAAqgcAICYAAKwHACCiAgEA1AQAIasCQADWBAAhwwJAANYEACH-AiAA4gQAIYIDAQDUBAAhjwMBANQEACGRAwAAoAenAyKiAwEA1QQAIaUDAQDUBAAhpwMBANUEACEDAAAABwAgMwAA8ggAIDQAAPkIACAMAAAABwAgAwAA_QUAIAUAAPwFACAXAACABgAgGQAA_gUAICwAAPkIACCiAgEA1AQAIaMCAQDUBAAhqwJAANYEACHDAkAA1gQAIeYCAQDUBAAhggMBANQEACEKAwAA_QUAIAUAAPwFACAXAACABgAgGQAA_gUAIKICAQDUBAAhowIBANQEACGrAkAA1gQAIcMCQADWBAAh5gIBANQEACGCAwEA1AQAIRoDAACUBwAgBAAAlQcAIAkAAJcHACAOAACYBwAgEQAAmQcAIBQAAJoHACAXAACbBwAgGAAAnAcAIKICAQAAAAGrAkAAAAABwwJAAAAAAdwCAQAAAAHmAgEAAAABggMBAAAAAZkDAQAAAAGaA0AAAAABmwMBAAAAAZwDAQAAAAGdAwAAkgcAIJ4DAACTBwAgnwMBAAAAAaADAQAAAAGhAwEAAAABogMBAAAAAaMDIAAAAAGkAwEAAAABAgAAAFEAIDMAAPoIACALogIBAAAAAasCQAAAAAHDAkAAAAAB9wIAAAD3AgL4AgAAvQUAIPkCAAC-BQAg-gJAAAAAAfsCQAAAAAH8AggAAAAB_QIBAAAAAf4CIAAAAAEOogIBAAAAAaMCAQAAAAGrAkAAAAABwgICAAAAAcMCQAAAAAHZAgAAAPACAu0CAQAAAAHuAkAAAAAB8AJAAAAAAfECAQAAAAHyAgEAAAAB8wICAAAAAfQCQAAAAAH1AgEAAAABAwAAADQAIDMAAPoIACA0AACACQAgHAAAADQAIAMAAK8GACAEAACwBgAgCQAAsgYAIA4AALMGACARAAC0BgAgFAAAtQYAIBcAALYGACAYAAC3BgAgLAAAgAkAIKICAQDUBAAhqwJAANYEACHDAkAA1gQAIdwCAQDVBAAh5gIBANQEACGCAwEA1AQAIZkDAQDVBAAhmgNAANYEACGbAwEA1QQAIZwDAQDVBAAhnQMAAK0GACCeAwAArgYAIJ8DAQDUBAAhoAMBANQEACGhAwEA1QQAIaIDAQDVBAAhowMgAOIEACGkAwEA1QQAIRoDAACvBgAgBAAAsAYAIAkAALIGACAOAACzBgAgEQAAtAYAIBQAALUGACAXAAC2BgAgGAAAtwYAIKICAQDUBAAhqwJAANYEACHDAkAA1gQAIdwCAQDVBAAh5gIBANQEACGCAwEA1AQAIZkDAQDVBAAhmgNAANYEACGbAwEA1QQAIZwDAQDVBAAhnQMAAK0GACCeAwAArgYAIJ8DAQDUBAAhoAMBANQEACGhAwEA1QQAIaIDAQDVBAAhowMgAOIEACGkAwEA1QQAIRMFAADjBQAgCQAA5QUAIAwAAOYFACCiAgEAAAABowIBAAAAAasCQAAAAAHDAkAAAAABggMBAAAAAYMDAQAAAAGEAwEAAAABhgMAAACGAwKHAwEAAAABiAMBAAAAAYkDAQAAAAGKAwEAAAABiwMBAAAAAYwDAQAAAAGNAyAAAAABjgMBAAAAAQIAAAANACAzAACBCQAgDqICAQAAAAGjAgEAAAABqwJAAAAAAcICAgAAAAHDAkAAAAAB2QIAAADwAgLnAgEAAAAB7gJAAAAAAfACQAAAAAHxAgEAAAAB8gIBAAAAAfMCAgAAAAH0AkAAAAAB9QIBAAAAAQMAAAALACAzAACBCQAgNAAAhgkAIBUAAAALACAFAADFBQAgCQAAxwUAIAwAAMgFACAsAACGCQAgogIBANQEACGjAgEA1AQAIasCQADWBAAhwwJAANYEACGCAwEA1AQAIYMDAQDVBAAhhAMBANUEACGGAwAAxAWGAyKHAwEA1AQAIYgDAQDUBAAhiQMBANUEACGKAwEA1QQAIYsDAQDVBAAhjAMBANUEACGNAyAA4gQAIY4DAQDVBAAhEwUAAMUFACAJAADHBQAgDAAAyAUAIKICAQDUBAAhowIBANQEACGrAkAA1gQAIcMCQADWBAAhggMBANQEACGDAwEA1QQAIYQDAQDVBAAhhgMAAMQFhgMihwMBANQEACGIAwEA1AQAIYkDAQDVBAAhigMBANUEACGLAwEA1QQAIYwDAQDVBAAhjQMgAOIEACGOAwEA1QQAIRYXAACuCAAgGAAArAgAIBwAAKIIACAdAACjCAAgHgAApAgAIB8AAKUIACAhAACnCAAgIgAAqAgAICMAAKkIACAkAACqCAAgJQAAqwgAICYAAK0IACCiAgEAAAABqwJAAAAAAcMCQAAAAAH-AiAAAAABggMBAAAAAY8DAQAAAAGRAwAAAKcDAqIDAQAAAAGlAwEAAAABpwMBAAAAAQIAAAABACAzAACHCQAgGgMAAJQHACAEAACVBwAgDQAAlgcAIA4AAJgHACARAACZBwAgFAAAmgcAIBcAAJsHACAYAACcBwAgogIBAAAAAasCQAAAAAHDAkAAAAAB3AIBAAAAAeYCAQAAAAGCAwEAAAABmQMBAAAAAZoDQAAAAAGbAwEAAAABnAMBAAAAAZ0DAACSBwAgngMAAJMHACCfAwEAAAABoAMBAAAAAaEDAQAAAAGiAwEAAAABowMgAAAAAaQDAQAAAAECAAAAUQAgMwAAiQkAIA0GAAC_BQAgogIBAAAAAasCQAAAAAHDAkAAAAAB5wIBAAAAAfcCAAAA9wIC-AIAAL0FACD5AgAAvgUAIPoCQAAAAAH7AkAAAAAB_AIIAAAAAf0CAQAAAAH-AiAAAAABAgAAABEAIDMAAIsJACATBQAA4wUAIAsAAOQFACAMAADmBQAgogIBAAAAAaMCAQAAAAGrAkAAAAABwwJAAAAAAYIDAQAAAAGDAwEAAAABhAMBAAAAAYYDAAAAhgMChwMBAAAAAYgDAQAAAAGJAwEAAAABigMBAAAAAYsDAQAAAAGMAwEAAAABjQMgAAAAAY4DAQAAAAECAAAADQAgMwAAjQkAIAMAAAAYACAzAACHCQAgNAAAkQkAIBgAAAAYACAXAACtBwAgGAAAqwcAIBwAAKEHACAdAACiBwAgHgAAowcAIB8AAKQHACAhAACmBwAgIgAApwcAICMAAKgHACAkAACpBwAgJQAAqgcAICYAAKwHACAsAACRCQAgogIBANQEACGrAkAA1gQAIcMCQADWBAAh_gIgAOIEACGCAwEA1AQAIY8DAQDUBAAhkQMAAKAHpwMiogMBANUEACGlAwEA1AQAIacDAQDVBAAhFhcAAK0HACAYAACrBwAgHAAAoQcAIB0AAKIHACAeAACjBwAgHwAApAcAICEAAKYHACAiAACnBwAgIwAAqAcAICQAAKkHACAlAACqBwAgJgAArAcAIKICAQDUBAAhqwJAANYEACHDAkAA1gQAIf4CIADiBAAhggMBANQEACGPAwEA1AQAIZEDAACgB6cDIqIDAQDVBAAhpQMBANQEACGnAwEA1QQAIQMAAAA0ACAzAACJCQAgNAAAlAkAIBwAAAA0ACADAACvBgAgBAAAsAYAIA0AALEGACAOAACzBgAgEQAAtAYAIBQAALUGACAXAAC2BgAgGAAAtwYAICwAAJQJACCiAgEA1AQAIasCQADWBAAhwwJAANYEACHcAgEA1QQAIeYCAQDUBAAhggMBANQEACGZAwEA1QQAIZoDQADWBAAhmwMBANUEACGcAwEA1QQAIZ0DAACtBgAgngMAAK4GACCfAwEA1AQAIaADAQDUBAAhoQMBANUEACGiAwEA1QQAIaMDIADiBAAhpAMBANUEACEaAwAArwYAIAQAALAGACANAACxBgAgDgAAswYAIBEAALQGACAUAAC1BgAgFwAAtgYAIBgAALcGACCiAgEA1AQAIasCQADWBAAhwwJAANYEACHcAgEA1QQAIeYCAQDUBAAhggMBANQEACGZAwEA1QQAIZoDQADWBAAhmwMBANUEACGcAwEA1QQAIZ0DAACtBgAgngMAAK4GACCfAwEA1AQAIaADAQDUBAAhoQMBANUEACGiAwEA1QQAIaMDIADiBAAhpAMBANUEACEDAAAADwAgMwAAiwkAIDQAAJcJACAPAAAADwAgBgAArwUAICwAAJcJACCiAgEA1AQAIasCQADWBAAhwwJAANYEACHnAgEA1AQAIfcCAACsBfcCIvgCAACtBQAg-QIAAK4FACD6AkAA1gQAIfsCQADrBAAh_AIIAJQFACH9AgEA1QQAIf4CIADiBAAhDQYAAK8FACCiAgEA1AQAIasCQADWBAAhwwJAANYEACHnAgEA1AQAIfcCAACsBfcCIvgCAACtBQAg-QIAAK4FACD6AkAA1gQAIfsCQADrBAAh_AIIAJQFACH9AgEA1QQAIf4CIADiBAAhAwAAAAsAIDMAAI0JACA0AACaCQAgFQAAAAsAIAUAAMUFACALAADGBQAgDAAAyAUAICwAAJoJACCiAgEA1AQAIaMCAQDUBAAhqwJAANYEACHDAkAA1gQAIYIDAQDUBAAhgwMBANUEACGEAwEA1QQAIYYDAADEBYYDIocDAQDUBAAhiAMBANQEACGJAwEA1QQAIYoDAQDVBAAhiwMBANUEACGMAwEA1QQAIY0DIADiBAAhjgMBANUEACETBQAAxQUAIAsAAMYFACAMAADIBQAgogIBANQEACGjAgEA1AQAIasCQADWBAAhwwJAANYEACGCAwEA1AQAIYMDAQDVBAAhhAMBANUEACGGAwAAxAWGAyKHAwEA1AQAIYgDAQDUBAAhiQMBANUEACGKAwEA1QQAIYsDAQDVBAAhjAMBANUEACGNAyAA4gQAIY4DAQDVBAAhEwUAAOMFACAJAADlBQAgCwAA5AUAIKICAQAAAAGjAgEAAAABqwJAAAAAAcMCQAAAAAGCAwEAAAABgwMBAAAAAYQDAQAAAAGGAwAAAIYDAocDAQAAAAGIAwEAAAABiQMBAAAAAYoDAQAAAAGLAwEAAAABjAMBAAAAAY0DIAAAAAGOAwEAAAABAgAAAA0AIDMAAJsJACADAAAACwAgMwAAmwkAIDQAAJ8JACAVAAAACwAgBQAAxQUAIAkAAMcFACALAADGBQAgLAAAnwkAIKICAQDUBAAhowIBANQEACGrAkAA1gQAIcMCQADWBAAhggMBANQEACGDAwEA1QQAIYQDAQDVBAAhhgMAAMQFhgMihwMBANQEACGIAwEA1AQAIYkDAQDVBAAhigMBANUEACGLAwEA1QQAIYwDAQDVBAAhjQMgAOIEACGOAwEA1QQAIRMFAADFBQAgCQAAxwUAIAsAAMYFACCiAgEA1AQAIaMCAQDUBAAhqwJAANYEACHDAkAA1gQAIYIDAQDUBAAhgwMBANUEACGEAwEA1QQAIYYDAADEBYYDIocDAQDUBAAhiAMBANQEACGJAwEA1QQAIYoDAQDVBAAhiwMBANUEACGMAwEA1QQAIY0DIADiBAAhjgMBANUEACEWFwAArggAIBgAAKwIACAcAACiCAAgHQAAowgAIB4AAKQIACAfAAClCAAgIAAApggAICEAAKcIACAiAACoCAAgIwAAqQgAICQAAKoIACAmAACtCAAgogIBAAAAAasCQAAAAAHDAkAAAAAB_gIgAAAAAYIDAQAAAAGPAwEAAAABkQMAAACnAwKiAwEAAAABpQMBAAAAAacDAQAAAAECAAAAAQAgMwAAoAkAIBoDAACUBwAgBAAAlQcAIAkAAJcHACANAACWBwAgEQAAmQcAIBQAAJoHACAXAACbBwAgGAAAnAcAIKICAQAAAAGrAkAAAAABwwJAAAAAAdwCAQAAAAHmAgEAAAABggMBAAAAAZkDAQAAAAGaA0AAAAABmwMBAAAAAZwDAQAAAAGdAwAAkgcAIJ4DAACTBwAgnwMBAAAAAaADAQAAAAGhAwEAAAABogMBAAAAAaMDIAAAAAGkAwEAAAABAgAAAFEAIDMAAKIJACADAAAAGAAgMwAAoAkAIDQAAKYJACAYAAAAGAAgFwAArQcAIBgAAKsHACAcAAChBwAgHQAAogcAIB4AAKMHACAfAACkBwAgIAAApQcAICEAAKYHACAiAACnBwAgIwAAqAcAICQAAKkHACAmAACsBwAgLAAApgkAIKICAQDUBAAhqwJAANYEACHDAkAA1gQAIf4CIADiBAAhggMBANQEACGPAwEA1AQAIZEDAACgB6cDIqIDAQDVBAAhpQMBANQEACGnAwEA1QQAIRYXAACtBwAgGAAAqwcAIBwAAKEHACAdAACiBwAgHgAAowcAIB8AAKQHACAgAAClBwAgIQAApgcAICIAAKcHACAjAACoBwAgJAAAqQcAICYAAKwHACCiAgEA1AQAIasCQADWBAAhwwJAANYEACH-AiAA4gQAIYIDAQDUBAAhjwMBANQEACGRAwAAoAenAyKiAwEA1QQAIaUDAQDUBAAhpwMBANUEACEDAAAANAAgMwAAogkAIDQAAKkJACAcAAAANAAgAwAArwYAIAQAALAGACAJAACyBgAgDQAAsQYAIBEAALQGACAUAAC1BgAgFwAAtgYAIBgAALcGACAsAACpCQAgogIBANQEACGrAkAA1gQAIcMCQADWBAAh3AIBANUEACHmAgEA1AQAIYIDAQDUBAAhmQMBANUEACGaA0AA1gQAIZsDAQDVBAAhnAMBANUEACGdAwAArQYAIJ4DAACuBgAgnwMBANQEACGgAwEA1AQAIaEDAQDVBAAhogMBANUEACGjAyAA4gQAIaQDAQDVBAAhGgMAAK8GACAEAACwBgAgCQAAsgYAIA0AALEGACARAAC0BgAgFAAAtQYAIBcAALYGACAYAAC3BgAgogIBANQEACGrAkAA1gQAIcMCQADWBAAh3AIBANUEACHmAgEA1AQAIYIDAQDUBAAhmQMBANUEACGaA0AA1gQAIZsDAQDVBAAhnAMBANUEACGdAwAArQYAIJ4DAACuBgAgnwMBANQEACGgAwEA1AQAIaEDAQDVBAAhogMBANUEACGjAyAA4gQAIaQDAQDVBAAhFhcAAK4IACAYAACsCAAgHAAAoggAIB0AAKMIACAeAACkCAAgHwAApQgAICAAAKYIACAhAACnCAAgIwAAqQgAICQAAKoIACAlAACrCAAgJgAArQgAIKICAQAAAAGrAkAAAAABwwJAAAAAAf4CIAAAAAGCAwEAAAABjwMBAAAAAZEDAAAApwMCogMBAAAAAaUDAQAAAAGnAwEAAAABAgAAAAEAIDMAAKoJACAWFwAArggAIBgAAKwIACAcAACiCAAgHQAAowgAIB4AAKQIACAfAAClCAAgIAAApggAICIAAKgIACAjAACpCAAgJAAAqggAICUAAKsIACAmAACtCAAgogIBAAAAAasCQAAAAAHDAkAAAAAB_gIgAAAAAYIDAQAAAAGPAwEAAAABkQMAAACnAwKiAwEAAAABpQMBAAAAAacDAQAAAAECAAAAAQAgMwAArAkAIBoDAACUBwAgBAAAlQcAIAkAAJcHACANAACWBwAgDgAAmAcAIBQAAJoHACAXAACbBwAgGAAAnAcAIKICAQAAAAGrAkAAAAABwwJAAAAAAdwCAQAAAAHmAgEAAAABggMBAAAAAZkDAQAAAAGaA0AAAAABmwMBAAAAAZwDAQAAAAGdAwAAkgcAIJ4DAACTBwAgnwMBAAAAAaADAQAAAAGhAwEAAAABogMBAAAAAaMDIAAAAAGkAwEAAAABAgAAAFEAIDMAAK4JACADAAAAGAAgMwAAqgkAIDQAALIJACAYAAAAGAAgFwAArQcAIBgAAKsHACAcAAChBwAgHQAAogcAIB4AAKMHACAfAACkBwAgIAAApQcAICEAAKYHACAjAACoBwAgJAAAqQcAICUAAKoHACAmAACsBwAgLAAAsgkAIKICAQDUBAAhqwJAANYEACHDAkAA1gQAIf4CIADiBAAhggMBANQEACGPAwEA1AQAIZEDAACgB6cDIqIDAQDVBAAhpQMBANQEACGnAwEA1QQAIRYXAACtBwAgGAAAqwcAIBwAAKEHACAdAACiBwAgHgAAowcAIB8AAKQHACAgAAClBwAgIQAApgcAICMAAKgHACAkAACpBwAgJQAAqgcAICYAAKwHACCiAgEA1AQAIasCQADWBAAhwwJAANYEACH-AiAA4gQAIYIDAQDUBAAhjwMBANQEACGRAwAAoAenAyKiAwEA1QQAIaUDAQDUBAAhpwMBANUEACEDAAAAGAAgMwAArAkAIDQAALUJACAYAAAAGAAgFwAArQcAIBgAAKsHACAcAAChBwAgHQAAogcAIB4AAKMHACAfAACkBwAgIAAApQcAICIAAKcHACAjAACoBwAgJAAAqQcAICUAAKoHACAmAACsBwAgLAAAtQkAIKICAQDUBAAhqwJAANYEACHDAkAA1gQAIf4CIADiBAAhggMBANQEACGPAwEA1AQAIZEDAACgB6cDIqIDAQDVBAAhpQMBANQEACGnAwEA1QQAIRYXAACtBwAgGAAAqwcAIBwAAKEHACAdAACiBwAgHgAAowcAIB8AAKQHACAgAAClBwAgIgAApwcAICMAAKgHACAkAACpBwAgJQAAqgcAICYAAKwHACCiAgEA1AQAIasCQADWBAAhwwJAANYEACH-AiAA4gQAIYIDAQDUBAAhjwMBANQEACGRAwAAoAenAyKiAwEA1QQAIaUDAQDUBAAhpwMBANUEACEDAAAANAAgMwAArgkAIDQAALgJACAcAAAANAAgAwAArwYAIAQAALAGACAJAACyBgAgDQAAsQYAIA4AALMGACAUAAC1BgAgFwAAtgYAIBgAALcGACAsAAC4CQAgogIBANQEACGrAkAA1gQAIcMCQADWBAAh3AIBANUEACHmAgEA1AQAIYIDAQDUBAAhmQMBANUEACGaA0AA1gQAIZsDAQDVBAAhnAMBANUEACGdAwAArQYAIJ4DAACuBgAgnwMBANQEACGgAwEA1AQAIaEDAQDVBAAhogMBANUEACGjAyAA4gQAIaQDAQDVBAAhGgMAAK8GACAEAACwBgAgCQAAsgYAIA0AALEGACAOAACzBgAgFAAAtQYAIBcAALYGACAYAAC3BgAgogIBANQEACGrAkAA1gQAIcMCQADWBAAh3AIBANUEACHmAgEA1AQAIYIDAQDUBAAhmQMBANUEACGaA0AA1gQAIZsDAQDVBAAhnAMBANUEACGdAwAArQYAIJ4DAACuBgAgnwMBANQEACGgAwEA1AQAIaEDAQDVBAAhogMBANUEACGjAyAA4gQAIaQDAQDVBAAhFhcAAK4IACAYAACsCAAgHAAAoggAIB0AAKMIACAeAACkCAAgHwAApQgAICAAAKYIACAhAACnCAAgIgAAqAgAICMAAKkIACAlAACrCAAgJgAArQgAIKICAQAAAAGrAkAAAAABwwJAAAAAAf4CIAAAAAGCAwEAAAABjwMBAAAAAZEDAAAApwMCogMBAAAAAaUDAQAAAAGnAwEAAAABAgAAAAEAIDMAALkJACAWFwAArggAIBgAAKwIACAcAACiCAAgHQAAowgAIB4AAKQIACAfAAClCAAgIAAApggAICEAAKcIACAiAACoCAAgJAAAqggAICUAAKsIACAmAACtCAAgogIBAAAAAasCQAAAAAHDAkAAAAAB_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_gIgAOIEACGCAwEA1AQAIY8DAQDUBAAhkQMAAKAHpwMiogMBANUEACGlAwEA1AQAIacDAQDVBAAhFhcAAK0HACAcAAChBwAgHQAAogcAIB4AAKMHACAfAACkBwAgIAAApQcAICEAAKYHACAiAACnBwAgIwAAqAcAICQAAKkHACAlAACqBwAgJgAArAcAIKICAQDUBAAhqwJAANYEACHDAkAA1gQAIf4CIADiBAAhggMBANQEACGPAwEA1AQAIZEDAACgB6cDIqIDAQDVBAAhpQMBANQEACGnAwEA1QQAIRYXAACuCAAgGAAArAgAIBwAAKIIACAdAACjCAAgHgAApAgAIB8AAKUIACAgAACmCAAgIQAApwgAICIAAKgIACAjAACpCAAgJAAAqggAICUAAKsIACCiAgEAAAABqwJAAAAAAcMCQAAAAAH-AiAAAAABggMBAAAAAY8DAQAAAAGRAwAAAKcDAqIDAQAAAAGlAwEAAAABpwMBAAAAAQIAAAABACAzAADSCQAgAwAAABgAIDMAANIJACA0AADWCQAgGAAAABgAIBcAAK0HACAYAACrBwAgHAAAoQcAIB0AAKIHACAeAACjBwAgHwAApAcAICAAAKUHACAhAACmBwAgIgAApwcAICMAAKgHACAkAACpBwAgJQAAqgcAICwAANYJACCiAgEA1AQAIasCQADWBAAhwwJAANYEACH-AiAA4gQAIYIDAQDUBAAhjwMBANQEACGRAwAAoAenAyKiAwEA1QQAIaUDAQDUBAAhpwMBANUEACEWFwAArQcAIBgAAKsHACAcAAChBwAgHQAAogcAIB4AAKMHACAfAACkBwAgIAAApQcAICEAAKYHACAiAACnBwAgIwAAqAcAICQAAKkHACAlAACqBwAgogIBANQEACGrAkAA1gQAIcMCQADWBAAh_gIgAOIEACGCAwEA1AQAIY8DAQDUBAAhkQMAAKAHpwMiogMBANUEACGlAwEA1AQAIacDAQDVBAAhFhgAAKwIACAcAACiCAAgHQAAowgAIB4AAKQIACAfAAClCAAgIAAApggAICEAAKcIACAiAACoCAAgIwAAqQgAICQAAKoIACAlAACrCAAgJgAArQgAIKICAQAAAAGrAkAAAAABwwJAAAAAAf4CIAAAAAGCAwEAAAABjwMBAAAAAZEDAAAApwMCogMBAAAAAaUDAQAAAAGnAwEAAAABAgAAAAEAIDMAANcJACAKAwAApgYAIAUAAKUGACAZAACnBgAgGwAAqAYAIKICAQAAAAGjAgEAAAABqwJAAAAAAcMCQAAAAAHmAgEAAAABggMBAAAAAQIAAAAJACAzAADZCQAgGgMAAJQHACAEAACVBwAgCQAAlwcAIA0AAJYHACAOAACYBwAgEQAAmQcAIBQAAJoHACAYAACcBwAgogIBAAAAAasCQAAAAAHDAkAAAAAB3AIBAAAAAeYCAQAAAAGCAwEAAAABmQMBAAAAAZoDQAAAAAGbAwEAAAABnAMBAAAAAZ0DAACSBwAgngMAAJMHACCfAwEAAAABoAMBAAAAAaEDAQAAAAGiAwEAAAABowMgAAAAAaQDAQAAAAECAAAAUQAgMwAA2wkAIAMAAAAYACAzAADXCQAgNAAA3wkAIBgAAAAYACAYAACrBwAgHAAAoQcAIB0AAKIHACAeAACjBwAgHwAApAcAICAAAKUHACAhAACmBwAgIgAApwcAICMAAKgHACAkAACpBwAgJQAAqgcAICYAAKwHACAsAADfCQAgogIBANQEACGrAkAA1gQAIcMCQADWBAAh_gIgAOIEACGCAwEA1AQAIY8DAQDUBAAhkQMAAKAHpwMiogMBANUEACGlAwEA1AQAIacDAQDVBAAhFhgAAKsHACAcAAChBwAgHQAAogcAIB4AAKMHACAfAACkBwAgIAAApQcAICEAAKYHACAiAACnBwAgIwAAqAcAICQAAKkHACAlAACqBwAgJgAArAcAIKICAQDUBAAhqwJAANYEACHDAkAA1gQAIf4CIADiBAAhggMBANQEACGPAwEA1AQAIZEDAACgB6cDIqIDAQDVBAAhpQMBANQEACGnAwEA1QQAIQMAAAAHACAzAADZCQAgNAAA4gkAIAwAAAAHACADAAD9BQAgBQAA_AUAIBkAAP4FACAbAAD_BQAgLAAA4gkAIKICAQDUBAAhowIBANQEACGrAkAA1gQAIcMCQADWBAAh5gIBANQEACGCAwEA1AQAIQoDAAD9BQAgBQAA_AUAIBkAAP4FACAbAAD_BQAgogIBANQEACGjAgEA1AQAIasCQADWBAAhwwJAANYEACHmAgEA1AQAIYIDAQDUBAAhAwAAADQAIDMAANsJACA0AADlCQAgHAAAADQAIAMAAK8GACAEAACwBgAgCQAAsgYAIA0AALEGACAOAACzBgAgEQAAtAYAIBQAALUGACAYAAC3BgAgLAAA5QkAIKICAQDUBAAhqwJAANYEACHDAkAA1gQAIdwCAQDVBAAh5gIBANQEACGCAwEA1AQAIZkDAQDVBAAhmgNAANYEACGbAwEA1QQAIZwDAQDVBAAhnQMAAK0GACCeAwAArgYAIJ8DAQDUBAAhoAMBANQEACGhAwEA1QQAIaIDAQDVBAAhowMgAOIEACGkAwEA1QQAIRoDAACvBgAgBAAAsAYAIAkAALIGACANAACxBgAgDgAAswYAIBEAALQGACAUAAC1BgAgGAAAtwYAIKICAQDUBAAhqwJAANYEACHDAkAA1gQAIdwCAQDVBAAh5gIBANQEACGCAwEA1AQAIZkDAQDVBAAhmgNAANYEACGbAwEA1QQAIZwDAQDVBAAhnQMAAK0GACCeAwAArgYAIJ8DAQDUBAAhoAMBANQEACGhAwEA1QQAIaIDAQDVBAAhowMgAOIEACGkAwEA1QQAIQ4KABQXXA4YWQ8cBgIdTgMeTxEfUgQgUwchVAwiVQwjVg0kVw0lWAsmWxMCFQADFgABBgMAAQUABAoAEhdKDhlFAhtJEQoDAAEECgMJIAcKABANDgUOJAsRKAwULg0XMw4YOw8FBQAECRsHCgAKCxIGDB0JAwYABQkWBwoACAQFAAQGAAUHFwYIGQEBCRoAAQYABQIJHwALHgACAwABBQAEAwUABA8pARAqAQMFAAQSAAETLwEDBTUEFTYDFjcBAgU8BBYAAQgEPQAJPwANPgAOQAARQQAUQgAXQwAYRAACFQADGgABAxdNABlLABtMAAEWAAEMF2gAGGcAHF0AHV4AHl8AH2AAIGEAIWIAImMAI2QAJGUAJWYAAAAAAwoAGTkAGjoAGwAAAAMKABk5ABo6ABsBAwABAQMAAQMKACA5ACE6ACIAAAADCgAgOQAhOgAiAgMAAQUABAIDAAEFAAQDCgAnOQAoOgApAAAAAwoAJzkAKDoAKQIVAAMWAAECFQADFgABAwoALjkALzoAMAAAAAMKAC45AC86ADACFQADGgABAhUAAxoAAQMKADU5ADY6ADcAAAADCgA1OQA2OgA3AQUABAEFAAQDCgA8OQA9OgA-AAAAAwoAPDkAPToAPgEGAAUBBgAFBQoAQzkARjoAR5sBAEScAQBFAAAAAAAFCgBDOQBGOgBHmwEARJwBAEUEBQAEBgAFB40CBgiOAgEEBQAEBgAFB5QCBgiVAgEFCgBMOQBPOgBQmwEATZwBAE4AAAAAAAUKAEw5AE86AFCbAQBNnAEATgEGAAUBBgAFBQoAVTkAWDoAWZsBAFacAQBXAAAAAAAFCgBVOQBYOgBZmwEAVpwBAFcCAwABBQAEAgMAAQUABAUKAF45AGE6AGKbAQBfnAEAYAAAAAAABQoAXjkAYToAYpsBAF-cAQBgAwUABA_VAgEQ1gIBAwUABA_cAgEQ3QIBAwoAZzkAaDoAaQAAAAMKAGc5AGg6AGkDBQAEEgABE-8CAQMFAAQSAAET9QIBAwoAbjkAbzoAcAAAAAMKAG45AG86AHACBYcDBBYAAQIFjQMEFgABAwoAdTkAdjoAdwAAAAMKAHU5AHY6AHcBFgABARYAAQUKAHw5AH86AIABmwEAfZwBAH4AAAAAAAUKAHw5AH86AIABmwEAfZwBAH4DBbcDBBW4AwMWuQMBAwW_AwQVwAMDFsEDAQMKAIUBOQCGAToAhwEAAAADCgCFATkAhgE6AIcBJwIBKGkBKWsBKmwBK20BLW8BLnEVL3IWMHQBMXYVMncXNXgBNnkBN3oVO30YPH4cPX8EPoABBD-BAQRAggEEQYMBBEKFAQRDhwEVRIgBHUWKAQRGjAEVR40BHkiOAQRJjwEESpABFUuTAR9MlAEjTZUBA06WAQNPlwEDUJgBA1GZAQNSmwEDU50BFVSeASRVoAEDVqIBFVejASVYpAEDWaUBA1qmARVbqQEmXKoBKl2rAQJerAECX60BAmCuAQJhrwECYrEBAmOzARVktAErZbYBAma4ARVnuQEsaLoBAmm7AQJqvAEVa78BLWzAATFtwQERbsIBEW_DARFwxAERccUBEXLHARFzyQEVdMoBMnXMARF2zgEVd88BM3jQARF50QERetIBFXvVATR81gE4fdcBBX7YAQV_2QEFgAHaAQWBAdsBBYIB3QEFgwHfARWEAeABOYUB4gEFhgHkARWHAeUBOogB5gEFiQHnAQWKAegBFYsB6wE7jAHsAT-NAe0BBo4B7gEGjwHvAQaQAfABBpEB8QEGkgHzAQaTAfUBFZQB9gFAlQH4AQaWAfoBFZcB-wFBmAH8AQaZAf0BBpoB_gEVnQGBAkKeAYICSJ8BgwIHoAGEAgehAYUCB6IBhgIHowGHAgekAYkCB6UBiwIVpgGMAkmnAZACB6gBkgIVqQGTAkqqAZYCB6sBlwIHrAGYAhWtAZsCS64BnAJRrwGeAgmwAZ8CCbEBoQIJsgGiAgmzAaMCCbQBpQIJtQGnAhW2AagCUrcBqgIJuAGsAhW5Aa0CU7oBrgIJuwGvAgm8AbACFb0BswJUvgG0Alq_AbUCC8ABtgILwQG3AgvCAbgCC8MBuQILxAG7AgvFAb0CFcYBvgJbxwHAAgvIAcICFckBwwJcygHEAgvLAcUCC8wBxgIVzQHJAl3OAcoCY88BywIM0AHMAgzRAc0CDNIBzgIM0wHPAgzUAdECDNUB0wIV1gHUAmTXAdgCDNgB2gIV2QHbAmXaAd4CDNsB3wIM3AHgAhXdAeMCZt4B5AJq3wHlAg3gAeYCDeEB5wIN4gHoAg3jAekCDeQB6wIN5QHtAhXmAe4Ca-cB8QIN6AHzAhXpAfQCbOoB9gIN6wH3Ag3sAfgCFe0B-wJt7gH8AnHvAf0CD_AB_gIP8QH_Ag_yAYADD_MBgQMP9AGDAw_1AYUDFfYBhgNy9wGJAw_4AYsDFfkBjANz-gGOAw_7AY8DD_wBkAMV_QGTA3T-AZQDeP8BlgMTgAKXAxOBApkDE4ICmgMTgwKbAxOEAp0DE4UCnwMVhgKgA3mHAqIDE4gCpAMViQKlA3qKAqYDE4sCpwMTjAKoAxWNAqsDe44CrAOBAY8CrQMOkAKuAw6RAq8DDpICsAMOkwKxAw6UArMDDpUCtQMVlgK2A4IBlwK7Aw6YAr0DFZkCvgODAZoCwgMOmwLDAw6cAsQDFZ0CxwOEAZ4CyAOIAQ"
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
  const sarah = await prisma.user.create({
    data: {
      email: "sarah.vance@carenest.org",
      name: "Sarah Vance",
      passwordHash,
      role: "FAMILY",
      phoneNumber: "+1 (555) 234-5678",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
    }
  });
  const eleanor = await prisma.user.create({
    data: {
      email: "eleanor.vance@carenest.org",
      name: "Eleanor Vance",
      passwordHash,
      role: "SENIOR",
      phoneNumber: "+1 (555) 345-6789",
      avatarUrl: "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=150&auto=format&fit=crop&q=80"
    }
  });
  const marcus = await prisma.user.create({
    data: {
      email: "marcus.reed@carenest.org",
      name: "Marcus Reed, RN",
      passwordHash,
      role: "CARETAKER",
      phoneNumber: "+1 (555) 456-7890",
      avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80"
    }
  });
  const david = await prisma.user.create({
    data: {
      email: "david.vance@carenest.org",
      name: "David Vance",
      passwordHash,
      role: "FAMILY",
      phoneNumber: "+1 (555) 567-8901",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
    }
  });
  const amit = await prisma.user.create({
    data: {
      email: "amit.kumar@carenest.org",
      name: "Amit Kumar",
      passwordHash,
      role: "FAMILY",
      phoneNumber: "+1 (555) 601-2345",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
    }
  });
  const priya = await prisma.user.create({
    data: {
      email: "priya.sharma@carenest.org",
      name: "Priya Sharma",
      passwordHash,
      role: "FAMILY",
      phoneNumber: "+1 (555) 602-3456",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    }
  });
  const rahul = await prisma.user.create({
    data: {
      email: "rahul.verma@carenest.org",
      name: "Rahul Verma, RN",
      passwordHash,
      role: "CARETAKER",
      phoneNumber: "+1 (555) 701-4567",
      avatarUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80"
    }
  });
  const anjali = await prisma.user.create({
    data: {
      email: "anjali.rao@carenest.org",
      name: "Anjali Rao, RN",
      passwordHash,
      role: "CARETAKER",
      phoneNumber: "+1 (555) 702-5678",
      avatarUrl: "https://images.unsplash.com/photo-1594824813511-20925e0b0dbd?w=150&auto=format&fit=crop&q=80"
    }
  });
  const rameshUser = await prisma.user.create({
    data: {
      email: "ramesh.kumar@carenest.org",
      name: "Ramesh Kumar",
      passwordHash,
      role: "SENIOR",
      phoneNumber: "+1 (555) 801-6789",
      avatarUrl: "https://images.unsplash.com/photo-1545167622-3a6ac756afa4?w=150&auto=format&fit=crop&q=80"
    }
  });
  const sureshUser = await prisma.user.create({
    data: {
      email: "suresh.kumar@carenest.org",
      name: "Suresh Kumar",
      passwordHash,
      role: "SENIOR",
      phoneNumber: "+1 (555) 802-7890",
      avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80"
    }
  });
  const lakshmiUser = await prisma.user.create({
    data: {
      email: "lakshmi.sharma@carenest.org",
      name: "Lakshmi Sharma",
      passwordHash,
      role: "SENIOR",
      phoneNumber: "+1 (555) 803-8901",
      avatarUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80"
    }
  });
  const meeraUser = await prisma.user.create({
    data: {
      email: "meera.sharma@carenest.org",
      name: "Meera Sharma",
      passwordHash,
      role: "SENIOR",
      phoneNumber: "+1 (555) 804-9012",
      avatarUrl: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80"
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
