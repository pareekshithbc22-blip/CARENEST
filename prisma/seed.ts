import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting CareNest database seeding...");

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
  const pinHash = await bcrypt.hash("1234", 10);
  const pinHashArthur = await bcrypt.hash("5678", 10);

  // 1. Create Core Users
  const sarah = await prisma.user.create({
    data: {
      email: "sarah.vance@carenest.org",
      name: "Sarah Vance",
      passwordHash,
      role: "FAMILY",
      phoneNumber: "+1 (555) 234-5678",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
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
    },
  });

  // Notification Preferences
  for (const user of [sarah, eleanor, marcus, david]) {
    await prisma.notificationPreference.create({
      data: {
        userId: user.id,
        emailReminders: true,
        missedDoseAlerts: true,
        escalationAlerts: true,
        appointmentReminders: true,
        dailySummaryEmail: user.role === "FAMILY",
        gracePeriodMinutes: 45,
      },
    });
  }

  // 2. Create Elderly Profiles (Supporting Multiple Profiles)
  const profileEleanor = await prisma.elderlyProfile.create({
    data: {
      name: "Eleanor Vance",
      preferredName: "Grandma Eleanor",
      dateOfBirth: new Date("1948-04-12"),
      gender: "Female",
      bloodGroup: "A+",
      allergies: ["Penicillin", "Sulfa drugs"],
      medicalConditions: ["Hypertension", "Type 2 Diabetes", "Osteoarthritis"],
      emergencyContactName: "Sarah Vance (Daughter)",
      emergencyContactPhone: "+1 (555) 234-5678",
      emergencyContactRelation: "Daughter",
      notes: "Prefers morning doses after warm oatmeal. Uses magnifying reading glasses for small labels.",
      avatarUrl: "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=200&auto=format&fit=crop&q=80",
      isSeniorModeActive: true,
      seniorPin: pinHash,
      createdById: sarah.id,
    },
  });

  const profileArthur = await prisma.elderlyProfile.create({
    data: {
      name: "Arthur Vance",
      preferredName: "Arthur",
      dateOfBirth: new Date("1945-09-20"),
      gender: "Male",
      bloodGroup: "O+",
      allergies: ["Aspirin"],
      medicalConditions: ["Mild Cognitive Impairment", "Coronary Artery Disease"],
      emergencyContactName: "Sarah Vance (Daughter)",
      emergencyContactPhone: "+1 (555) 234-5678",
      emergencyContactRelation: "Daughter",
      notes: "Requires gentle step-by-step assistance with morning routine.",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80",
      isSeniorModeActive: true,
      seniorPin: pinHashArthur,
      createdById: sarah.id,
    },
  });

  // 3. Create Care Circles
  const circleEleanor = await prisma.careCircle.create({
    data: {
      name: "Eleanor Vance Care Circle",
      elderlyProfileId: profileEleanor.id,
      createdById: sarah.id,
    },
  });

  const circleArthur = await prisma.careCircle.create({
    data: {
      name: "Arthur Vance Care Circle",
      elderlyProfileId: profileArthur.id,
      createdById: sarah.id,
    },
  });

  // Add Members to Eleanor's Circle
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

  // Add Members to Arthur's Circle
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

  // 4. Create Medications for Eleanor
  const lisinopril = await prisma.medication.create({
    data: {
      elderlyProfileId: profileEleanor.id,
      name: "Lisinopril",
      brandName: "Prinivil",
      genericName: "Lisinopril",
      form: "TABLET",
      strength: "10 mg",
      dosageInstructions: "Take 1 tablet every morning with a full glass of water.",
      prescribingDoctor: "Dr. Robert Chen",
      prescribingClinic: "St. Jude Heart Institute",
      rxNumber: "RX-884210",
      purpose: "Hypertension / Blood Pressure Control",
      stock: {
        create: {
          currentStock: 38,
          unit: "tablets",
          refillThreshold: 14,
          packageSize: 60,
          lastRefillDate: new Date(Date.now() - 14 * 86400000),
          notes: "Filled at Walgreens Pharmacy #4102",
        },
      },
      schedules: {
        create: {
          frequency: "DAILY",
          timesOfDay: ["08:00"],
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          dosageQuantity: 1.0,
          instructions: "Take with breakfast.",
        },
      },
    },
    include: { schedules: true },
  });

  const metformin = await prisma.medication.create({
    data: {
      elderlyProfileId: profileEleanor.id,
      name: "Metformin ER",
      brandName: "Glucophage XR",
      genericName: "Metformin Hydrochloride",
      form: "TABLET",
      strength: "500 mg",
      dosageInstructions: "Take 1 tablet twice daily with meals (breakfast & dinner).",
      prescribingDoctor: "Dr. Maya Patel",
      prescribingClinic: "Metro Health Endocrinology",
      rxNumber: "RX-991204",
      purpose: "Type 2 Diabetes Glycemic Management",
      stock: {
        create: {
          currentStock: 44,
          unit: "tablets",
          refillThreshold: 14,
          packageSize: 60,
          lastRefillDate: new Date(Date.now() - 10 * 86400000),
        },
      },
      schedules: {
        create: {
          frequency: "DAILY",
          timesOfDay: ["08:00", "20:00"],
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          dosageQuantity: 1.0,
          instructions: "Do not crush or chew extended-release tablets.",
        },
      },
    },
    include: { schedules: true },
  });

  const atorvastatin = await prisma.medication.create({
    data: {
      elderlyProfileId: profileEleanor.id,
      name: "Atorvastatin",
      brandName: "Lipitor",
      genericName: "Atorvastatin Calcium",
      form: "TABLET",
      strength: "20 mg",
      dosageInstructions: "Take 1 tablet in the evening before bedtime.",
      prescribingDoctor: "Dr. Robert Chen",
      prescribingClinic: "St. Jude Heart Institute",
      rxNumber: "RX-773192",
      purpose: "Cholesterol & Cardiovascular Protection",
      stock: {
        create: {
          currentStock: 25,
          unit: "tablets",
          refillThreshold: 10,
          packageSize: 30,
          lastRefillDate: new Date(Date.now() - 20 * 86400000),
        },
      },
      schedules: {
        create: {
          frequency: "DAILY",
          timesOfDay: ["20:00"],
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          dosageQuantity: 1.0,
          instructions: "Take with or without evening meal.",
        },
      },
    },
    include: { schedules: true },
  });

  const glipizide = await prisma.medication.create({
    data: {
      elderlyProfileId: profileEleanor.id,
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
      stock: {
        create: {
          currentStock: 5, // LOW STOCK DEMONSTRATION
          unit: "tablets",
          refillThreshold: 10,
          packageSize: 30,
          lastRefillDate: new Date(Date.now() - 25 * 86400000),
          notes: "Urgent: Refill requested from pharmacy.",
        },
      },
      schedules: {
        create: {
          frequency: "DAILY",
          timesOfDay: ["08:00"],
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          dosageQuantity: 1.0,
          instructions: "Take 30 minutes before first meal of day.",
        },
      },
    },
    include: { schedules: true },
  });

  // 5. Generate Past & Today's Scheduled Doses
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 5; i >= 1; i--) {
    const dayDate = new Date(today);
    dayDate.setDate(dayDate.getDate() - i);

    const morningDoseTime = new Date(dayDate);
    morningDoseTime.setHours(8, 0, 0, 0);

    await prisma.scheduledDose.create({
      data: {
        medicationId: lisinopril.id,
        scheduleId: lisinopril.schedules[0].id,
        elderlyProfileId: profileEleanor.id,
        scheduledAt: morningDoseTime,
        status: "TAKEN",
        confirmedAt: new Date(morningDoseTime.getTime() + 12 * 60000),
        confirmedById: eleanor.id,
        confirmationNotes: "Taken with breakfast oats.",
        idempotencyKey: `dose-${lisinopril.id}-${morningDoseTime.toISOString()}`,
      },
    });

    await prisma.scheduledDose.create({
      data: {
        medicationId: metformin.id,
        scheduleId: metformin.schedules[0].id,
        elderlyProfileId: profileEleanor.id,
        scheduledAt: morningDoseTime,
        status: "TAKEN",
        confirmedAt: new Date(morningDoseTime.getTime() + 15 * 60000),
        confirmedById: eleanor.id,
        confirmationNotes: "Taken as scheduled.",
        idempotencyKey: `dose-${metformin.id}-m-${morningDoseTime.toISOString()}`,
      },
    });

    const eveningDoseTime = new Date(dayDate);
    eveningDoseTime.setHours(20, 0, 0, 0);

    const isMissedDay = i === 2;
    await prisma.scheduledDose.create({
      data: {
        medicationId: metformin.id,
        scheduleId: metformin.schedules[0].id,
        elderlyProfileId: profileEleanor.id,
        scheduledAt: eveningDoseTime,
        status: isMissedDay ? "MISSED" : "TAKEN",
        confirmedAt: isMissedDay ? null : new Date(eveningDoseTime.getTime() + 20 * 60000),
        confirmedById: isMissedDay ? null : marcus.id,
        confirmationNotes: isMissedDay ? "Unconfirmed after grace period and escalation." : "Assisted by Marcus RN.",
        escalationLevel: isMissedDay ? 2 : 0,
        escalatedAt: isMissedDay ? new Date(eveningDoseTime.getTime() + 60 * 60000) : null,
        idempotencyKey: `dose-${metformin.id}-e-${eveningDoseTime.toISOString()}`,
      },
    });

    await prisma.scheduledDose.create({
      data: {
        medicationId: atorvastatin.id,
        scheduleId: atorvastatin.schedules[0].id,
        elderlyProfileId: profileEleanor.id,
        scheduledAt: eveningDoseTime,
        status: isMissedDay ? "SKIPPED" : "TAKEN",
        confirmedAt: isMissedDay ? new Date(eveningDoseTime.getTime() + 40 * 60000) : new Date(eveningDoseTime.getTime() + 20 * 60000),
        confirmedById: isMissedDay ? marcus.id : marcus.id,
        confirmationNotes: isMissedDay ? "Skipped due to mild gastric discomfort per nurse assessment." : "Taken before sleep.",
        idempotencyKey: `dose-${atorvastatin.id}-${eveningDoseTime.toISOString()}`,
      },
    });
  }

  // Today's Doses
  const todayMorning = new Date(today);
  todayMorning.setHours(8, 0, 0, 0);

  const todayEvening = new Date(today);
  todayEvening.setHours(20, 0, 0, 0);

  await prisma.scheduledDose.create({
    data: {
      medicationId: lisinopril.id,
      scheduleId: lisinopril.schedules[0].id,
      elderlyProfileId: profileEleanor.id,
      scheduledAt: todayMorning,
      status: "TAKEN",
      confirmedAt: new Date(todayMorning.getTime() + 10 * 60000),
      confirmedById: eleanor.id,
      confirmationNotes: "Self-confirmed via Senior Mode.",
      idempotencyKey: `dose-${lisinopril.id}-${todayMorning.toISOString()}`,
    },
  });

  await prisma.scheduledDose.create({
    data: {
      medicationId: glipizide.id,
      scheduleId: glipizide.schedules[0].id,
      elderlyProfileId: profileEleanor.id,
      scheduledAt: todayMorning,
      status: "TAKEN",
      confirmedAt: new Date(todayMorning.getTime() + 8 * 60000),
      confirmedById: eleanor.id,
      confirmationNotes: "Taken with breakfast.",
      idempotencyKey: `dose-${glipizide.id}-${todayMorning.toISOString()}`,
    },
  });

  await prisma.scheduledDose.create({
    data: {
      medicationId: metformin.id,
      scheduleId: metformin.schedules[0].id,
      elderlyProfileId: profileEleanor.id,
      scheduledAt: todayEvening,
      status: "SCHEDULED",
      idempotencyKey: `dose-${metformin.id}-today-e`,
    },
  });

  await prisma.scheduledDose.create({
    data: {
      medicationId: atorvastatin.id,
      scheduleId: atorvastatin.schedules[0].id,
      elderlyProfileId: profileEleanor.id,
      scheduledAt: todayEvening,
      status: "SCHEDULED",
      idempotencyKey: `dose-${atorvastatin.id}-today-e`,
    },
  });

  // 6. Appointments
  const inThreeDays = new Date();
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  inThreeDays.setHours(10, 30, 0, 0);

  const inTenDays = new Date();
  inTenDays.setDate(inTenDays.getDate() + 10);
  inTenDays.setHours(14, 0, 0, 0);

  const lastMonth = new Date();
  lastMonth.setDate(lastMonth.getDate() - 28);
  lastMonth.setHours(9, 15, 0, 0);

  await prisma.appointment.createMany({
    data: [
      {
        elderlyProfileId: profileEleanor.id,
        title: "Cardiology Follow-Up & ECG Review",
        doctorName: "Dr. Robert Chen, FACC",
        specialty: "Cardiology",
        clinicName: "St. Jude Heart Institute - Suite 402",
        locationAddress: "742 Evergreen Medical Parkway, Floor 4",
        appointmentDate: inThreeDays,
        status: "UPCOMING",
        reminderMinutesBefore: 1440,
        notes: "Bring current blood pressure logs from past 3 weeks. Fasting not required.",
        createdById: sarah.id,
      },
      {
        elderlyProfileId: profileEleanor.id,
        title: "HbA1c & Diabetes Quarterly Review",
        doctorName: "Dr. Maya Patel",
        specialty: "Endocrinology",
        clinicName: "Metro Health Endocrinology Center",
        locationAddress: "1200 Beacon Health Way, Pavilion B",
        appointmentDate: inTenDays,
        status: "UPCOMING",
        reminderMinutesBefore: 2880,
        notes: "Fasting blood draw 2 hours prior to consultation.",
        createdById: sarah.id,
      },
      {
        elderlyProfileId: profileEleanor.id,
        title: "Annual Comprehensive Geriatric Assessment",
        doctorName: "Dr. Evelyn Ward, MD",
        specialty: "Geriatric Medicine",
        clinicName: "Beacon Senior Care Center",
        locationAddress: "500 Wellness Blvd",
        appointmentDate: lastMonth,
        status: "COMPLETED",
        notes: "Routine cognitive and mobility evaluation.",
        outcomeSummary: "Overall stability confirmed. Joint flexibility exercises recommended. Blood pressure targets well maintained.",
        createdById: sarah.id,
      },
    ],
  });

  // 7. Care Tasks
  const taskDueToday = new Date();
  taskDueToday.setHours(18, 0, 0, 0);

  const taskTomorrow = new Date();
  taskTomorrow.setDate(taskTomorrow.getDate() + 1);
  taskTomorrow.setHours(11, 0, 0, 0);

  await prisma.careTask.createMany({
    data: [
      {
        elderlyProfileId: profileEleanor.id,
        assignedToId: marcus.id,
        title: "Morning Vitals Check & Blood Glucose",
        description: "Log resting systolic/diastolic BP and fasting fingerstick glucose.",
        dueDate: new Date(todayMorning),
        priority: "HIGH",
        status: "COMPLETED",
        completedAt: new Date(todayMorning.getTime() + 30 * 60000),
        completedById: marcus.id,
        notes: "BP 124/80 mmHg, Glucose 112 mg/dL. Eleanor felt energetic and cheerful.",
      },
      {
        elderlyProfileId: profileEleanor.id,
        assignedToId: marcus.id,
        title: "Gentle Assisted Mobility & Walking (15 min)",
        description: "Indoor or garden stroll with walking cane support.",
        dueDate: taskDueToday,
        priority: "MEDIUM",
        status: "PENDING",
        notes: "Scheduled for post-afternoon tea.",
      },
      {
        elderlyProfileId: profileEleanor.id,
        assignedToId: david.id,
        title: "Pharmacy Refill Pickup (Glipizide 5mg)",
        description: "Pick up remaining 30-day supply from Walgreens Pharmacy #4102.",
        dueDate: taskTomorrow,
        priority: "URGENT",
        status: "PENDING",
        notes: "Prescription RX-551029 is ready for pickup.",
      },
    ],
  });

  // 8. Care Notes
  await prisma.careNote.create({
    data: {
      elderlyProfileId: profileEleanor.id,
      authorId: marcus.id,
      category: "HEALTH_UPDATE",
      title: "Morning Shift Vitals & Wellness Observation",
      content: "Eleanor had a restful 8-hour sleep. Fasting blood glucose registered at 112 mg/dL, which is well within our 100-130 target. Morning Lisinopril and Glipizide confirmed. Mild knee stiffness eased after 10 minutes of gentle range-of-motion leg raises.",
      vitalSigns: {
        bloodPressure: "124/80",
        heartRate: 72,
        bloodGlucose: 112,
        temperature: 98.4,
        oxygenSaturation: 98,
      },
      isPinned: true,
    },
  });

  await prisma.careNote.create({
    data: {
      elderlyProfileId: profileEleanor.id,
      authorId: marcus.id,
      category: "HANDOVER",
      title: "Shift Handover - Evening Prep & Fluid Balance",
      content: "Hydration target achieved (1.6L water and chamomile tea). Eleanor prefers taking her evening Metformin with her stew around 7:45 PM. David is scheduled to pick up the Glipizide refill tomorrow.",
      shiftHandoverToId: sarah.id,
    },
  });

  // 9. Notifications
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
        userId: sarah.id,
        elderlyProfileId: profileEleanor.id,
        type: "APPOINTMENT_REMINDER",
        title: "Upcoming Appointment: Cardiology Follow-Up",
        message: "Cardiology follow-up with Dr. Robert Chen scheduled in 3 days (10:30 AM).",
        deliveryStatus: "SENT",
        emailSent: false,
      },
      {
        userId: eleanor.id,
        elderlyProfileId: profileEleanor.id,
        type: "MEDICATION_REMINDER",
        title: "Evening Medication Reminder",
        message: "Upcoming evening dose: Metformin ER 500mg & Atorvastatin 20mg at 8:00 PM.",
        deliveryStatus: "SENT",
        emailSent: false,
      },
    ],
  });

  // 10. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        elderlyProfileId: profileEleanor.id,
        careCircleId: circleEleanor.id,
        userId: sarah.id,
        action: "CARE_CIRCLE_CREATED",
        entityType: "CareCircle",
        entityId: circleEleanor.id,
        details: { circleName: circleEleanor.name },
      },
      {
        elderlyProfileId: profileEleanor.id,
        careCircleId: circleEleanor.id,
        userId: eleanor.id,
        action: "DOSE_CONFIRMED",
        entityType: "ScheduledDose",
        entityId: lisinopril.id,
        details: { medication: "Lisinopril 10mg", method: "Senior Mode One-Tap" },
      },
      {
        elderlyProfileId: profileEleanor.id,
        careCircleId: circleEleanor.id,
        userId: marcus.id,
        action: "CARE_NOTE_LOGGED",
        entityType: "CareNote",
        details: { category: "HEALTH_UPDATE" },
      },
    ],
  });

  console.log("✅ CareNest database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
