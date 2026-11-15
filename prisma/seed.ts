import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { MedicationForm } from "../generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting CareNest database seeding...");

  // Clean existing tables in proper dependency order
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

  // ========================================================
  // 1. ORIGINAL CORE USERS (PRESERVED FOR TEST SUITES)
  // ========================================================
  const nowVerified = new Date();
  const sarah = await prisma.user.create({
    data: {
      email: "sarah.vance@carenest.org",
      name: "Sarah Vance",
      passwordHash,
      role: "FAMILY",
      phoneNumber: "+1 (555) 234-5678",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified,
    },
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
      emailVerified: nowVerified,
    },
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
      emailVerified: nowVerified,
    },
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
      emailVerified: nowVerified,
    },
  });

  // ========================================================
  // 2. JUDGE DEMO ACCOUNTS (FAMILY, CARETAKER, SENIOR)
  // ========================================================

  // Family Administrators
  const amit = await prisma.user.create({
    data: {
      email: "amit.kumar@carenest.org",
      name: "Amit Kumar",
      passwordHash,
      role: "FAMILY",
      phoneNumber: "+1 (555) 601-2345",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified,
    },
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
      emailVerified: nowVerified,
    },
  });

  // Licensed Caretakers / Nurses
  const rahul = await prisma.user.create({
    data: {
      email: "rahul.verma@carenest.org",
      name: "Rahul Verma, RN",
      passwordHash,
      role: "CARETAKER",
      phoneNumber: "+1 (555) 701-4567",
      avatarUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified,
    },
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
      emailVerified: nowVerified,
    },
  });

  // Senior Patients (Users for direct login)
  const rameshUser = await prisma.user.create({
    data: {
      email: "ramesh.kumar@carenest.org",
      name: "Ramesh Kumar",
      passwordHash,
      role: "SENIOR",
      phoneNumber: "+1 (555) 801-6789",
      avatarUrl: "https://images.unsplash.com/photo-1545167622-3a6ac756afa4?w=150&auto=format&fit=crop&q=80",
      isEmailVerified: true,
      emailVerified: nowVerified,
    },
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
      emailVerified: nowVerified,
    },
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
      emailVerified: nowVerified,
    },
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
      emailVerified: nowVerified,
    },
  });

  // Notification Preferences for All Users
  const allUsers = [
    sarah, eleanor, marcus, david,
    amit, priya, rahul, anjali,
    rameshUser, sureshUser, lakshmiUser, meeraUser,
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
        gracePeriodMinutes: 45,
      },
    });
  }

  // ========================================================
  // 3. ELDERLY PROFILES
  // ========================================================

  // Eleanor Vance (Managed by Sarah Vance, Caretaker Marcus Reed)
  const profileEleanor = await prisma.elderlyProfile.create({
    data: {
      name: "Eleanor Vance",
      preferredName: "Grandma Eleanor",
      dateOfBirth: new Date("1948-04-12"),
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
      createdById: sarah.id,
    },
  });

  // Arthur Vance (Managed by Sarah Vance, Caretaker Marcus Reed)
  const profileArthur = await prisma.elderlyProfile.create({
    data: {
      name: "Arthur Vance",
      preferredName: "Arthur",
      dateOfBirth: new Date("1945-09-20"),
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
      createdById: sarah.id,
    },
  });

  // Ramesh Kumar (Managed by Amit Kumar, Caretaker Rahul Verma)
  const profileRamesh = await prisma.elderlyProfile.create({
    data: {
      name: "Ramesh Kumar",
      preferredName: "Papa Ramesh",
      dateOfBirth: new Date("1949-08-15"),
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
      createdById: amit.id,
    },
  });

  // Suresh Kumar (Managed by Amit Kumar, Caretaker Rahul Verma)
  const profileSuresh = await prisma.elderlyProfile.create({
    data: {
      name: "Suresh Kumar",
      preferredName: "Uncle Suresh",
      dateOfBirth: new Date("1952-11-04"),
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
      createdById: amit.id,
    },
  });

  // Lakshmi Sharma (Managed by Priya Sharma, Caretaker Anjali Rao)
  const profileLakshmi = await prisma.elderlyProfile.create({
    data: {
      name: "Lakshmi Sharma",
      preferredName: "Maa Lakshmi",
      dateOfBirth: new Date("1951-03-22"),
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
      createdById: priya.id,
    },
  });

  // Meera Sharma (Managed by Priya Sharma, Caretaker Anjali Rao)
  const profileMeera = await prisma.elderlyProfile.create({
    data: {
      name: "Meera Sharma",
      preferredName: "Dadi Meera",
      dateOfBirth: new Date("1942-07-10"),
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
      createdById: priya.id,
    },
  });

  // ========================================================
  // 4. CARE CIRCLES & PERMISSIONS
  // ========================================================

  // Eleanor Care Circle
  const circleEleanor = await prisma.careCircle.create({
    data: {
      name: "Eleanor Vance Care Circle",
      elderlyProfileId: profileEleanor.id,
      createdById: sarah.id,
    },
  });

  await prisma.careCircleMember.createMany({
    data: [
      {
        careCircleId: circleEleanor.id,
        userId: sarah.id,
        role: "ADMIN",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_MANAGE_APPOINTMENTS", "CAN_RECEIVE_ESCALATIONS", "CAN_MANAGE_CIRCLE"],
      },
      {
        careCircleId: circleEleanor.id,
        userId: eleanor.id,
        role: "SENIOR",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS"],
      },
      {
        careCircleId: circleEleanor.id,
        userId: marcus.id,
        role: "CARETAKER",
        permissions: ["CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_LOG_CARE_NOTES", "CAN_COMPLETE_TASKS", "CAN_RECEIVE_ESCALATIONS"],
      },
      {
        careCircleId: circleEleanor.id,
        userId: david.id,
        role: "FAMILY_MEMBER",
        permissions: ["CAN_VIEW_RECORDS", "CAN_CONFIRM_DOSE", "CAN_RECEIVE_ESCALATIONS"],
      },
    ],
  });

  // Arthur Care Circle
  const circleArthur = await prisma.careCircle.create({
    data: {
      name: "Arthur Vance Care Circle",
      elderlyProfileId: profileArthur.id,
      createdById: sarah.id,
    },
  });

  await prisma.careCircleMember.createMany({
    data: [
      {
        careCircleId: circleArthur.id,
        userId: sarah.id,
        role: "ADMIN",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_MANAGE_APPOINTMENTS", "CAN_RECEIVE_ESCALATIONS", "CAN_MANAGE_CIRCLE"],
      },
      {
        careCircleId: circleArthur.id,
        userId: marcus.id,
        role: "CARETAKER",
        permissions: ["CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_LOG_CARE_NOTES", "CAN_COMPLETE_TASKS"],
      },
    ],
  });

  // Ramesh Care Circle (Amit Admin + Rahul Caretaker)
  const circleRamesh = await prisma.careCircle.create({
    data: {
      name: "Ramesh Kumar Care Circle",
      elderlyProfileId: profileRamesh.id,
      createdById: amit.id,
    },
  });

  await prisma.careCircleMember.createMany({
    data: [
      {
        careCircleId: circleRamesh.id,
        userId: amit.id,
        role: "ADMIN",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_MANAGE_APPOINTMENTS", "CAN_RECEIVE_ESCALATIONS", "CAN_MANAGE_CIRCLE"],
      },
      {
        careCircleId: circleRamesh.id,
        userId: rameshUser.id,
        role: "SENIOR",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS"],
      },
      {
        careCircleId: circleRamesh.id,
        userId: rahul.id,
        role: "CARETAKER",
        permissions: ["CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_LOG_CARE_NOTES", "CAN_COMPLETE_TASKS", "CAN_RECEIVE_ESCALATIONS"],
      },
    ],
  });

  // Suresh Care Circle (Amit Admin + Rahul Caretaker -> Demonstrates Multi-Patient for both Amit & Rahul!)
  const circleSuresh = await prisma.careCircle.create({
    data: {
      name: "Suresh Kumar Care Circle",
      elderlyProfileId: profileSuresh.id,
      createdById: amit.id,
    },
  });

  await prisma.careCircleMember.createMany({
    data: [
      {
        careCircleId: circleSuresh.id,
        userId: amit.id,
        role: "ADMIN",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_MANAGE_APPOINTMENTS", "CAN_RECEIVE_ESCALATIONS", "CAN_MANAGE_CIRCLE"],
      },
      {
        careCircleId: circleSuresh.id,
        userId: sureshUser.id,
        role: "SENIOR",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS"],
      },
      {
        careCircleId: circleSuresh.id,
        userId: rahul.id,
        role: "CARETAKER",
        permissions: ["CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_LOG_CARE_NOTES", "CAN_COMPLETE_TASKS", "CAN_RECEIVE_ESCALATIONS"],
      },
    ],
  });

  // Lakshmi Care Circle (Priya Admin + Anjali Caretaker)
  const circleLakshmi = await prisma.careCircle.create({
    data: {
      name: "Lakshmi Sharma Care Circle",
      elderlyProfileId: profileLakshmi.id,
      createdById: priya.id,
    },
  });

  await prisma.careCircleMember.createMany({
    data: [
      {
        careCircleId: circleLakshmi.id,
        userId: priya.id,
        role: "ADMIN",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_MANAGE_APPOINTMENTS", "CAN_RECEIVE_ESCALATIONS", "CAN_MANAGE_CIRCLE"],
      },
      {
        careCircleId: circleLakshmi.id,
        userId: lakshmiUser.id,
        role: "SENIOR",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS"],
      },
      {
        careCircleId: circleLakshmi.id,
        userId: anjali.id,
        role: "CARETAKER",
        permissions: ["CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_LOG_CARE_NOTES", "CAN_COMPLETE_TASKS", "CAN_RECEIVE_ESCALATIONS"],
      },
    ],
  });

  // Meera Care Circle (Priya Admin + Anjali Caretaker -> Demonstrates Multi-Patient for both Priya & Anjali!)
  const circleMeera = await prisma.careCircle.create({
    data: {
      name: "Meera Sharma Care Circle",
      elderlyProfileId: profileMeera.id,
      createdById: priya.id,
    },
  });

  await prisma.careCircleMember.createMany({
    data: [
      {
        careCircleId: circleMeera.id,
        userId: priya.id,
        role: "ADMIN",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_MANAGE_APPOINTMENTS", "CAN_RECEIVE_ESCALATIONS", "CAN_MANAGE_CIRCLE"],
      },
      {
        careCircleId: circleMeera.id,
        userId: meeraUser.id,
        role: "SENIOR",
        permissions: ["CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS"],
      },
      {
        careCircleId: circleMeera.id,
        userId: anjali.id,
        role: "CARETAKER",
        permissions: ["CAN_MANAGE_MEDS", "CAN_CONFIRM_DOSE", "CAN_VIEW_RECORDS", "CAN_LOG_CARE_NOTES", "CAN_COMPLETE_TASKS", "CAN_RECEIVE_ESCALATIONS"],
      },
    ],
  });

  // ========================================================
  // 5. MEDICATIONS & SCHEDULES
  // ========================================================

  // Function to helper seed medications
  async function seedMed(
    profileId: string,
    medData: {
      name: string;
      brandName: string;
      genericName: string;
      form: MedicationForm;
      strength: string;
      dosageInstructions: string;
      prescribingDoctor: string;
      prescribingClinic: string;
      rxNumber: string;
      purpose: string;
      stock: number;
      refillThreshold: number;
      times: string[];
      instructions: string;
    }
  ) {
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
            lastRefillDate: new Date(Date.now() - 15 * 86400000),
          },
        },
        schedules: {
          create: {
            frequency: "DAILY",
            timesOfDay: medData.times,
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            dosageQuantity: 1.0,
            instructions: medData.instructions,
          },
        },
      },
      include: { schedules: true, stock: true },
    });
  }

  // --- Eleanor Medications ---
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
    instructions: "Take with water before breakfast.",
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
    instructions: "Take with food.",
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
    stock: 5, // Low stock alert!
    refillThreshold: 10,
    times: ["08:00"],
    instructions: "Take 30 minutes before first meal.",
  });

  // --- Ramesh Kumar Medications ---
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
    instructions: "Take with morning water.",
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
    instructions: "Take post meal.",
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
    stock: 6, // Low stock demo!
    refillThreshold: 10,
    times: ["21:00"],
    instructions: "Take at bedtime with water.",
  });

  // --- Suresh Kumar Medications ---
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
    instructions: "Take with water in the morning.",
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
    instructions: "Take on an empty stomach.",
  });

  // --- Lakshmi Sharma Medications ---
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
    instructions: "Strictly empty stomach.",
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
    instructions: "Take with breakfast.",
  });

  // --- Meera Sharma Medications ---
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
    instructions: "Take right before sleep.",
  });

  // ========================================================
  // 6. SCHEDULED DOSES & ADHERENCE HISTORIES
  // ========================================================
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  async function generateDoseHistory(
    profileId: string,
    med: any,
    confirmedByUser: any,
    caretakerUser: any
  ) {
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
          confirmedAt: new Date(scheduledTime.getTime() + 15 * 60000),
          confirmedById: confirmedByUser.id,
          confirmationNotes: "Dose verified and taken with water.",
          idempotencyKey: `dose-${med.id}-${scheduledTime.toISOString()}`,
        },
      });
    }

    // Today's Scheduled Dose (Morning: TAKEN, Evening: SCHEDULED)
    const todayMorning = new Date(today);
    todayMorning.setHours(8, 30, 0, 0);

    await prisma.scheduledDose.create({
      data: {
        medicationId: med.id,
        scheduleId: med.schedules[0].id,
        elderlyProfileId: profileId,
        scheduledAt: todayMorning,
        status: "TAKEN",
        confirmedAt: new Date(todayMorning.getTime() + 10 * 60000),
        confirmedById: caretakerUser.id,
        confirmationNotes: `Administered & confirmed by Caretaker ${caretakerUser.name}`,
        idempotencyKey: `dose-${med.id}-${todayMorning.toISOString()}`,
      },
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
        idempotencyKey: `dose-${med.id}-${todayEvening.toISOString()}`,
      },
    });
  }

  // Generate historical doses for all profiles
  await generateDoseHistory(profileEleanor.id, elLisinopril, eleanor, marcus);
  await generateDoseHistory(profileEleanor.id, elMetformin, eleanor, marcus);
  await generateDoseHistory(profileRamesh.id, rameshAmlodipine, rameshUser, rahul);
  await generateDoseHistory(profileRamesh.id, rameshMetformin, rameshUser, rahul);
  await generateDoseHistory(profileSuresh.id, sureshLosartan, sureshUser, rahul);
  await generateDoseHistory(profileLakshmi.id, lakshmiTelmisartan, lakshmiUser, anjali);
  await generateDoseHistory(profileMeera.id, meeraDonepezil, meeraUser, anjali);

  // ========================================================
  // 7. CLINICAL VITALS READINGS & CARE NOTES
  // ========================================================
  async function seedVitals(
    profileId: string,
    author: any,
    vitalsList: Array<{
      daysAgo: number;
      title: string;
      content: string;
      bp: string;
      systolic: number;
      diastolic: number;
      hr: number;
      glucose: number;
      temp: number;
      spo2: number;
    }>
  ) {
    for (const v of vitalsList) {
      const createdAt = new Date(Date.now() - v.daysAgo * 86400000);
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
            oxygenSaturation: v.spo2,
          },
        },
      });
    }
  }

  // Eleanor Vitals
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
      spo2: 98,
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
      spo2: 97,
    },
  ]);

  // Ramesh Vitals (Rahul Caretaker)
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
      spo2: 99,
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
      spo2: 98,
    },
  ]);

  // Suresh Vitals (Rahul Caretaker)
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
      spo2: 98,
    },
  ]);

  // Lakshmi Vitals (Anjali Caretaker)
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
      spo2: 99,
    },
  ]);

  // Meera Vitals (Anjali Caretaker)
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
      spo2: 98,
    },
  ]);

  // ========================================================
  // 8. DOCTOR APPOINTMENTS
  // ========================================================
  const apptDates = [3, 7, 14, 21];

  await prisma.appointment.create({
    data: {
      elderlyProfileId: profileEleanor.id,
      title: "Cardiology Follow-Up",
      doctorName: "Dr. Robert Chen",
      specialty: "Cardiology",
      clinicName: "Valley Heart & Vascular Center",
      locationAddress: "Suite 400",
      appointmentDate: new Date(Date.now() + apptDates[0] * 86400000),
      notes: "6-Month Hypertension & Echocardiogram Follow-Up",
      createdById: sarah.id,
      status: "UPCOMING",
    },
  });

  await prisma.appointment.create({
    data: {
      elderlyProfileId: profileRamesh.id,
      title: "Cardiac Review & Holter Monitoring",
      doctorName: "Dr. Arvind Menon",
      specialty: "Cardiology",
      clinicName: "Apex Cardiology Center",
      locationAddress: "2nd Floor, Main Wing",
      appointmentDate: new Date(Date.now() + apptDates[1] * 86400000),
      notes: "Annual Cardiac Holter & Blood Pressure Review",
      createdById: amit.id,
      status: "UPCOMING",
    },
  });

  await prisma.appointment.create({
    data: {
      elderlyProfileId: profileSuresh.id,
      title: "Nephrology & Renal Function Review",
      doctorName: "Dr. Sunita Gupta",
      specialty: "Nephrology & Renal Care",
      clinicName: "Metro City Specialty Hospital",
      locationAddress: "Room 102",
      appointmentDate: new Date(Date.now() + apptDates[2] * 86400000),
      notes: "Kidney Function & Electrolyte Panel Monitoring",
      createdById: amit.id,
      status: "UPCOMING",
    },
  });

  await prisma.appointment.create({
    data: {
      elderlyProfileId: profileLakshmi.id,
      title: "Endocrinology & Thyroid Panel Check",
      doctorName: "Dr. Radhika Sen",
      specialty: "Endocrinology",
      clinicName: "CareFirst Endocrine Clinic",
      locationAddress: "Suite 210",
      appointmentDate: new Date(Date.now() + apptDates[0] * 86400000),
      notes: "TSH / Free T4 Blood Panel Evaluation",
      createdById: priya.id,
      status: "UPCOMING",
    },
  });

  await prisma.appointment.create({
    data: {
      elderlyProfileId: profileMeera.id,
      title: "Geriatric Wellness & Cognitive Exam",
      doctorName: "Dr. Rajesh Nair",
      specialty: "Geriatric Neurology",
      clinicName: "Senior Memory & Neuro Care Center",
      locationAddress: "Building B",
      appointmentDate: new Date(Date.now() + apptDates[3] * 86400000),
      notes: "Annual Mini-Mental State Exam & Wellness Consultation",
      createdById: priya.id,
      status: "UPCOMING",
    },
  });

  // ========================================================
  // 9. CLINICAL TASKS (SHIFT RESPONSIBILITIES)
  // ========================================================
  const tomorrow = new Date(Date.now() + 86400000);

  await prisma.careTask.create({
    data: {
      elderlyProfileId: profileEleanor.id,
      assignedToId: marcus.id,
      title: "Morning Blood Pressure & Pulse Reading",
      description: "Log seated morning blood pressure before 9:00 AM dose.",
      dueDate: tomorrow,
      priority: "HIGH",
      status: "PENDING",
    },
  });

  await prisma.careTask.create({
    data: {
      elderlyProfileId: profileRamesh.id,
      assignedToId: rahul.id,
      title: "Check Fasting Glucose & Amlodipine Tolerance",
      description: "Measure fasting fingerstick blood sugar and monitor for pedal edema.",
      dueDate: tomorrow,
      priority: "HIGH",
      status: "PENDING",
    },
  });

  await prisma.careTask.create({
    data: {
      elderlyProfileId: profileSuresh.id,
      assignedToId: rahul.id,
      title: "Assist With 15-Minute Joint Mobility Routine",
      description: "Guide gentle leg stretches and log knee pain scale (1-10).",
      dueDate: tomorrow,
      priority: "MEDIUM",
      status: "PENDING",
    },
  });

  await prisma.careTask.create({
    data: {
      elderlyProfileId: profileLakshmi.id,
      assignedToId: anjali.id,
      title: "Verify 30-Minute Fasting After Levothyroxine",
      description: "Ensure patient waits 30 minutes before taking morning breakfast tea.",
      dueDate: tomorrow,
      priority: "URGENT",
      status: "PENDING",
    },
  });

  await prisma.careTask.create({
    data: {
      elderlyProfileId: profileMeera.id,
      assignedToId: anjali.id,
      title: "Afternoon Memory & Hydration Check-In",
      description: "Encourage 250ml warm water or chamomile tea with memory flashcards.",
      dueDate: tomorrow,
      priority: "MEDIUM",
      status: "PENDING",
    },
  });

  // ========================================================
  // 10. SYSTEM NOTIFICATIONS & AUDIT LOGS
  // ========================================================
  await prisma.notification.createMany({
    data: [
      {
        userId: sarah.id,
        elderlyProfileId: profileEleanor.id,
        type: "REFILL_ALERT",
        title: "Low Medication Stock: Glipizide 5mg",
        message: "Only 5 tablets remaining for Eleanor Vance. Refill threshold is 10 tablets.",
        deliveryStatus: "SENT",
        emailSent: true,
      },
      {
        userId: amit.id,
        elderlyProfileId: profileRamesh.id,
        type: "REFILL_ALERT",
        title: "Low Medication Stock: Atorvastatin 20mg",
        message: "Only 6 tablets remaining for Ramesh Kumar. Please request pharmacy refill.",
        deliveryStatus: "SENT",
        emailSent: true,
      },
      {
        userId: amit.id,
        elderlyProfileId: profileRamesh.id,
        type: "APPOINTMENT_REMINDER",
        title: "Upcoming Cardiology Appointment",
        message: "Dr. Arvind Menon scheduled in 7 days for Ramesh Kumar.",
        deliveryStatus: "SENT",
        emailSent: false,
      },
    ],
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
        details: { circleName: circleRamesh.name },
      },
      {
        elderlyProfileId: profileRamesh.id,
        careCircleId: circleRamesh.id,
        userId: rahul.id,
        action: "CARETAKER_ASSIGNED",
        entityType: "CareCircleMember",
        entityId: rahul.id,
        details: { caretakerName: rahul.name },
      },
      {
        elderlyProfileId: profileSuresh.id,
        careCircleId: circleSuresh.id,
        userId: amit.id,
        action: "CARE_CIRCLE_CREATED",
        entityType: "CareCircle",
        entityId: circleSuresh.id,
        details: { circleName: circleSuresh.name },
      },
    ],
  });

  console.log("✅ CareNest database seeded successfully with all demo accounts and multi-patient profiles!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
