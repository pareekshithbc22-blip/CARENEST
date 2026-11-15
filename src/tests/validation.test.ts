import { describe, it, expect } from "vitest";
import {
  RegisterSchema,
  ProfileCreateSchema,
  MedicationCreateSchema,
  DoseSkipSchema,
  CareNoteCreateSchema,
} from "@/lib/validations";

describe("CareNest Zod Validation Schemas", () => {
  it("validates valid user registration data", () => {
    const input = {
      name: "Sarah Vance",
      email: "sarah.vance@example.com",
      password: "SuperSecretPassword123!",
      role: "FAMILY",
      phoneNumber: "+15552345678",
    };

    const res = RegisterSchema.safeParse(input);
    expect(res.success).toBe(true);
  });

  it("rejects weak or short passwords during registration", () => {
    const input = {
      name: "Sarah",
      email: "sarah@example.com",
      password: "short",
    };

    const res = RegisterSchema.safeParse(input);
    expect(res.success).toBe(false);
  });

  it("validates elderly profile creation with emergency contact", () => {
    const input = {
      name: "Eleanor Vance",
      preferredName: "Grandma Eleanor",
      dateOfBirth: "1948-04-12",
      gender: "Female",
      bloodGroup: "A+",
      allergies: ["Penicillin"],
      medicalConditions: ["Hypertension", "Diabetes"],
      emergencyContactName: "Sarah Vance",
      emergencyContactPhone: "+15552345678",
      emergencyContactRelation: "Daughter",
      isSeniorModeActive: true,
      seniorPin: "1234",
    };

    const res = ProfileCreateSchema.safeParse(input);
    expect(res.success).toBe(true);
  });

  it("validates medication creation with dosage instructions and schedule", () => {
    const input = {
      elderlyProfileId: "123e4567-e89b-12d3-a456-426614174000",
      name: "Lisinopril",
      form: "TABLET",
      strength: "10 mg",
      dosageInstructions: "Take 1 tablet every morning with water",
      frequency: "DAILY",
      timesOfDay: ["08:00"],
      dosageQuantity: 1.0,
      initialStock: 30,
      refillThreshold: 10,
    };

    const res = MedicationCreateSchema.safeParse(input);
    expect(res.success).toBe(true);
  });

  it("enforces clinical reason when skipping a dose", () => {
    const emptyReason = { reason: "" };
    const validReason = { reason: "Patient experiencing mild nausea; nurse advised to defer" };

    expect(DoseSkipSchema.safeParse(emptyReason).success).toBe(false);
    expect(DoseSkipSchema.safeParse(validReason).success).toBe(true);
  });

  it("validates clinical care note with vital signs", () => {
    const note = {
      elderlyProfileId: "123e4567-e89b-12d3-a456-426614174000",
      category: "HEALTH_UPDATE",
      title: "Morning Routine Vitals",
      content: "Patient alert, resting comfortably post breakfast.",
      vitalSigns: {
        bloodPressure: "122/80",
        heartRate: 72,
        bloodGlucose: 110,
        temperature: 98.6,
      },
      isPinned: true,
    };

    const res = CareNoteCreateSchema.safeParse(note);
    expect(res.success).toBe(true);
  });
});
