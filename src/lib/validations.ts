import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email("Valid email address is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["SENIOR", "FAMILY", "CARETAKER", "ADMIN"]).default("FAMILY"),
  phoneNumber: z
    .string()
    .trim()
    .min(7, "Phone number must be at least 7 digits")
    .max(20, "Phone number cannot exceed 20 characters")
    .regex(
      /^\+?[0-9\s\-()]{7,20}$/,
      "Invalid phone number format. Only numbers, +, -, () and spaces are permitted"
    ),
  verificationToken: z.string().optional(),
});

export const ProfileCreateSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  preferredName: z.string().optional(),
  dateOfBirth: z.string().min(4, "Date of birth is required"),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.array(z.string()).default([]),
  medicalConditions: z.array(z.string()).default([]),
  emergencyContactName: z.string().min(2, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(7, "Emergency contact phone is required"),
  emergencyContactRelation: z.string().optional(),
  notes: z.string().optional(),
  isSeniorModeActive: z.boolean().default(true),
  seniorPin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 numeric digits").optional().nullable(),
  confirmPin: z.string().optional().nullable(),
});

export const MedicationCreateSchema = z.object({
  elderlyProfileId: z.string().uuid("Valid profile ID is required"),
  name: z.string().min(2, "Medication name is required"),
  brandName: z.string().optional(),
  genericName: z.string().optional(),
  form: z.enum([
    "TABLET",
    "CAPSULE",
    "SYRUP",
    "INJECTION",
    "DROPS",
    "INHALER",
    "TOPICAL",
    "OTHER",
  ]).default("TABLET"),
  strength: z.string().min(1, "Strength (e.g. 500mg) is required"),
  dosageInstructions: z.string().min(3, "Prescribed instructions are required"),
  prescribingDoctor: z.string().optional(),
  prescribingClinic: z.string().optional(),
  rxNumber: z.string().optional(),
  purpose: z.string().optional(),
  // Schedule
  frequency: z.enum(["DAILY", "SPECIFIC_DAYS", "AS_NEEDED", "WEEKLY"]).default("DAILY"),
  timesOfDay: z.array(z.string()).min(1, "At least one scheduled dose time is required"),
  dosageQuantity: z.number().min(0.25).default(1.0),
  instructions: z.string().optional(),
  // Stock
  initialStock: z.number().min(0).default(30),
  unit: z.string().default("tablets"),
  refillThreshold: z.number().min(1).default(10),
});

export const DoseConfirmSchema = z.object({
  confirmationNotes: z.string().optional(),
  decrementStock: z.boolean().default(true),
});

export const DoseSkipSchema = z.object({
  reason: z.string().min(3, "Clinical or practical reason is required to skip a dose"),
});

export const AppointmentCreateSchema = z.object({
  elderlyProfileId: z.string().uuid("Valid profile ID is required"),
  title: z.string().min(2, "Appointment title is required"),
  doctorName: z.string().min(2, "Doctor name is required"),
  specialty: z.string().optional(),
  clinicName: z.string().min(2, "Clinic / Hospital name is required"),
  locationAddress: z.string().optional(),
  appointmentDate: z.string().min(10, "Valid appointment date and time is required"),
  reminderMinutesBefore: z.number().default(1440),
  notes: z.string().optional(),
});

export const CareTaskCreateSchema = z.object({
  elderlyProfileId: z.string().uuid("Valid profile ID is required"),
  assignedToId: z.string().uuid().optional().nullable(),
  title: z.string().min(2, "Task title is required"),
  description: z.string().optional(),
  dueDate: z.string().min(10, "Due date is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export const CareNoteCreateSchema = z.object({
  elderlyProfileId: z.string().uuid("Valid profile ID is required"),
  category: z.enum([
    "GENERAL",
    "OBSERVATION",
    "MOOD",
    "HEALTH_UPDATE",
    "HANDOVER",
    "INCIDENT",
  ]).default("GENERAL"),
  title: z.string().min(2, "Note title is required"),
  content: z.string().min(3, "Note content is required"),
  vitalSigns: z
    .object({
      bloodPressure: z.string().optional(),
      heartRate: z.number().optional(),
      bloodGlucose: z.number().optional(),
      temperature: z.number().optional(),
      oxygenSaturation: z.number().optional(),
    })
    .optional(),
  isPinned: z.boolean().default(false),
  shiftHandoverToId: z.string().uuid().optional().nullable(),
});

export const CareCircleInviteSchema = z.object({
  careCircleId: z.string().uuid(),
  email: z.string().email("Valid recipient email is required"),
  role: z.enum(["ADMIN", "FAMILY_MEMBER", "CARETAKER", "SENIOR"]).default("FAMILY_MEMBER"),
});

export const HealthMeasurementCreateSchema = z.object({
  elderlyProfileId: z.string().uuid("Valid profile ID is required"),
  heartRate: z.number().min(30).max(250).optional().nullable(),
  bloodGlucose: z.number().min(20).max(800).optional().nullable(),
  systolic: z.number().min(50).max(300).optional().nullable(),
  diastolic: z.number().min(30).max(200).optional().nullable(),
  bloodPressure: z.string().optional().nullable(),
  temperature: z.number().min(30).max(45).optional().nullable(),
  oxygenSaturation: z.number().min(50).max(100).optional().nullable(),
  weight: z.number().min(10).max(400).optional().nullable(),
  source: z.string().default("Senior Patient (Self-Reported)"),
  notes: z.string().optional().nullable(),
  recordedAt: z.string().optional(),
});

