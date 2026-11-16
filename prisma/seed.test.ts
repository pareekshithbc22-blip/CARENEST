import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma";

describe("Database Seed & Domain Verification", () => {
  it("verifies full CareNest healthcare ecosystem and domain constraints", async () => {
    // 1. Core Users & Platform Administrator Verification
    const admin = await prisma.user.findFirst({
      where: { email: "admin@carenest.org" },
    });
    expect(admin).toBeDefined();
    expect(admin?.role).toBe("ADMIN");

    const sarah = await prisma.user.findFirst({
      where: { email: "sarah.vance@carenest.org" },
    });
    expect(sarah).toBeDefined();
    expect(sarah?.role).toBe("FAMILY");

    const eleanor = await prisma.user.findFirst({
      where: { email: "eleanor.vance@carenest.org" },
    });
    expect(eleanor).toBeDefined();
    expect(eleanor?.role).toBe("SENIOR");

    const marcus = await prisma.user.findFirst({
      where: { email: "marcus.reed@carenest.org" },
      include: { caretakerProfile: true },
    });
    expect(marcus).toBeDefined();
    expect(marcus?.role).toBe("CARETAKER");
    expect(marcus?.caretakerProfile?.status).toBe("APPROVED");

    // 2. Multi-family Caretakers & Pending Application Verification
    const rahul = await prisma.user.findFirst({
      where: { email: "rahul.verma@carenest.org" },
      include: { caretakerProfile: true },
    });
    expect(rahul).toBeDefined();
    expect(rahul?.caretakerProfile?.status).toBe("APPROVED");

    const anjali = await prisma.user.findFirst({
      where: { email: "anjali.rao@carenest.org" },
      include: { caretakerProfile: true },
    });
    expect(anjali).toBeDefined();
    expect(anjali?.caretakerProfile?.status).toBe("PENDING");

    // 3. Patient Access Requests
    const requests = await prisma.patientAccessRequest.findMany();
    expect(requests.length).toBeGreaterThanOrEqual(3);

    const approvedReq = requests.find((r) => r.status === "APPROVED");
    expect(approvedReq).toBeDefined();

    const pendingReq = requests.find((r) => r.status === "PENDING");
    expect(pendingReq).toBeDefined();

    // 4. Clinical Telemetry, Meds & Circles
    const profiles = await prisma.elderlyProfile.findMany();
    expect(profiles.length).toBeGreaterThanOrEqual(4);

    const medications = await prisma.medication.findMany();
    expect(medications.length).toBeGreaterThanOrEqual(5);

    const scheduledDoses = await prisma.scheduledDose.findMany();
    expect(scheduledDoses.length).toBeGreaterThan(0);
  });
});
