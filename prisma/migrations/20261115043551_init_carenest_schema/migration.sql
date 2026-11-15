-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SENIOR', 'FAMILY', 'CARETAKER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CircleRole" AS ENUM ('ADMIN', 'FAMILY_MEMBER', 'CARETAKER', 'SENIOR');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "DoseStatus" AS ENUM ('SCHEDULED', 'TAKEN', 'MISSED', 'SKIPPED', 'UNCONFIRMED');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('DAILY', 'SPECIFIC_DAYS', 'AS_NEEDED', 'WEEKLY');

-- CreateEnum
CREATE TYPE "MedicationForm" AS ENUM ('TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'DROPS', 'INHALER', 'TOPICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('UPCOMING', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NoteCategory" AS ENUM ('GENERAL', 'OBSERVATION', 'MOOD', 'HEALTH_UPDATE', 'HANDOVER', 'INCIDENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MEDICATION_REMINDER', 'MISSED_DOSE_ALERT', 'ESCALATION_WARNING', 'APPOINTMENT_REMINDER', 'CARE_TASK_ASSIGNED', 'REFILL_ALERT', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FAMILY',
    "phoneNumber" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElderlyProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preferredName" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT,
    "bloodGroup" TEXT,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medicalConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "emergencyContactRelation" TEXT,
    "notes" TEXT,
    "avatarUrl" TEXT,
    "isSeniorModeActive" BOOLEAN NOT NULL DEFAULT false,
    "seniorPin" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElderlyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareCircle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "elderlyProfileId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareCircle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareCircleMember" (
    "id" TEXT NOT NULL,
    "careCircleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CircleRole" NOT NULL DEFAULT 'FAMILY_MEMBER',
    "permissions" TEXT[] DEFAULT ARRAY['CAN_VIEW_RECORDS', 'CAN_CONFIRM_DOSE']::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareCircleMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareCircleInvitation" (
    "id" TEXT NOT NULL,
    "careCircleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "CircleRole" NOT NULL DEFAULT 'FAMILY_MEMBER',
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareCircleInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "elderlyProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandName" TEXT,
    "genericName" TEXT,
    "form" "MedicationForm" NOT NULL DEFAULT 'TABLET',
    "strength" TEXT NOT NULL,
    "dosageInstructions" TEXT NOT NULL,
    "prescribingDoctor" TEXT,
    "prescribingClinic" TEXT,
    "rxNumber" TEXT,
    "purpose" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "discontinuedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationSchedule" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "frequency" "ScheduleFrequency" NOT NULL DEFAULT 'DAILY',
    "timesOfDay" TEXT[],
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6]::INTEGER[],
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "dosageQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledDose" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "elderlyProfileId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "DoseStatus" NOT NULL DEFAULT 'SCHEDULED',
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "confirmationNotes" TEXT,
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 45,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "escalatedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledDose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationStock" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'tablets',
    "refillThreshold" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "packageSize" DOUBLE PRECISION,
    "lastRefillDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "elderlyProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "doctorName" TEXT NOT NULL,
    "specialty" TEXT,
    "clinicName" TEXT NOT NULL,
    "locationAddress" TEXT,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'UPCOMING',
    "reminderMinutesBefore" INTEGER NOT NULL DEFAULT 1440,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "outcomeSummary" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareTask" (
    "id" TEXT NOT NULL,
    "elderlyProfileId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareNote" (
    "id" TEXT NOT NULL,
    "elderlyProfileId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "category" "NoteCategory" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "vitalSigns" JSONB,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "shiftHandoverToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "elderlyProfileId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "deliveryStatus" TEXT NOT NULL DEFAULT 'SENT',
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailReminders" BOOLEAN NOT NULL DEFAULT true,
    "missedDoseAlerts" BOOLEAN NOT NULL DEFAULT true,
    "escalationAlerts" BOOLEAN NOT NULL DEFAULT true,
    "appointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "dailySummaryEmail" BOOLEAN NOT NULL DEFAULT false,
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 45,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "elderlyProfileId" TEXT,
    "careCircleId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "ElderlyProfile_createdById_idx" ON "ElderlyProfile"("createdById");

-- CreateIndex
CREATE INDEX "CareCircle_elderlyProfileId_idx" ON "CareCircle"("elderlyProfileId");

-- CreateIndex
CREATE INDEX "CareCircle_createdById_idx" ON "CareCircle"("createdById");

-- CreateIndex
CREATE INDEX "CareCircleMember_careCircleId_idx" ON "CareCircleMember"("careCircleId");

-- CreateIndex
CREATE INDEX "CareCircleMember_userId_idx" ON "CareCircleMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CareCircleMember_careCircleId_userId_key" ON "CareCircleMember"("careCircleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CareCircleInvitation_token_key" ON "CareCircleInvitation"("token");

-- CreateIndex
CREATE INDEX "CareCircleInvitation_token_idx" ON "CareCircleInvitation"("token");

-- CreateIndex
CREATE INDEX "CareCircleInvitation_email_idx" ON "CareCircleInvitation"("email");

-- CreateIndex
CREATE INDEX "CareCircleInvitation_careCircleId_idx" ON "CareCircleInvitation"("careCircleId");

-- CreateIndex
CREATE INDEX "Medication_elderlyProfileId_idx" ON "Medication"("elderlyProfileId");

-- CreateIndex
CREATE INDEX "Medication_isArchived_idx" ON "Medication"("isArchived");

-- CreateIndex
CREATE INDEX "MedicationSchedule_medicationId_idx" ON "MedicationSchedule"("medicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledDose_idempotencyKey_key" ON "ScheduledDose"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ScheduledDose_elderlyProfileId_scheduledAt_idx" ON "ScheduledDose"("elderlyProfileId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduledDose_status_scheduledAt_idx" ON "ScheduledDose"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduledDose_medicationId_idx" ON "ScheduledDose"("medicationId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationStock_medicationId_key" ON "MedicationStock"("medicationId");

-- CreateIndex
CREATE INDEX "MedicationStock_medicationId_idx" ON "MedicationStock"("medicationId");

-- CreateIndex
CREATE INDEX "Appointment_elderlyProfileId_appointmentDate_idx" ON "Appointment"("elderlyProfileId", "appointmentDate");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "CareTask_elderlyProfileId_dueDate_idx" ON "CareTask"("elderlyProfileId", "dueDate");

-- CreateIndex
CREATE INDEX "CareTask_assignedToId_status_idx" ON "CareTask"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "CareNote_elderlyProfileId_createdAt_idx" ON "CareNote"("elderlyProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "CareNote_category_idx" ON "CareNote"("category");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_elderlyProfileId_createdAt_idx" ON "AuditLog"("elderlyProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- AddForeignKey
ALTER TABLE "ElderlyProfile" ADD CONSTRAINT "ElderlyProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareCircle" ADD CONSTRAINT "CareCircle_elderlyProfileId_fkey" FOREIGN KEY ("elderlyProfileId") REFERENCES "ElderlyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareCircle" ADD CONSTRAINT "CareCircle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareCircleMember" ADD CONSTRAINT "CareCircleMember_careCircleId_fkey" FOREIGN KEY ("careCircleId") REFERENCES "CareCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareCircleMember" ADD CONSTRAINT "CareCircleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareCircleInvitation" ADD CONSTRAINT "CareCircleInvitation_careCircleId_fkey" FOREIGN KEY ("careCircleId") REFERENCES "CareCircle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareCircleInvitation" ADD CONSTRAINT "CareCircleInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_elderlyProfileId_fkey" FOREIGN KEY ("elderlyProfileId") REFERENCES "ElderlyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationSchedule" ADD CONSTRAINT "MedicationSchedule_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledDose" ADD CONSTRAINT "ScheduledDose_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledDose" ADD CONSTRAINT "ScheduledDose_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "MedicationSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledDose" ADD CONSTRAINT "ScheduledDose_elderlyProfileId_fkey" FOREIGN KEY ("elderlyProfileId") REFERENCES "ElderlyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledDose" ADD CONSTRAINT "ScheduledDose_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationStock" ADD CONSTRAINT "MedicationStock_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_elderlyProfileId_fkey" FOREIGN KEY ("elderlyProfileId") REFERENCES "ElderlyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_elderlyProfileId_fkey" FOREIGN KEY ("elderlyProfileId") REFERENCES "ElderlyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTask" ADD CONSTRAINT "CareTask_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_elderlyProfileId_fkey" FOREIGN KEY ("elderlyProfileId") REFERENCES "ElderlyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareNote" ADD CONSTRAINT "CareNote_shiftHandoverToId_fkey" FOREIGN KEY ("shiftHandoverToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_elderlyProfileId_fkey" FOREIGN KEY ("elderlyProfileId") REFERENCES "ElderlyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_elderlyProfileId_fkey" FOREIGN KEY ("elderlyProfileId") REFERENCES "ElderlyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_careCircleId_fkey" FOREIGN KEY ("careCircleId") REFERENCES "CareCircle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
