import { describe, it, expect } from "vitest";
import { prisma } from "../lib/prisma";

describe("CareNest Schema and Domain Integrity", () => {
  it("verifies Prisma Client is configured and database models are properly initialized", async () => {
    expect(prisma).toBeDefined();
    expect(prisma.user).toBeDefined();
    expect(prisma.elderlyProfile).toBeDefined();
    expect(prisma.medication).toBeDefined();
    expect(prisma.scheduledDose).toBeDefined();
    expect(prisma.careTask).toBeDefined();
    expect(prisma.careNote).toBeDefined();
    expect(prisma.notification).toBeDefined();
    expect(prisma.caretakerProfile).toBeDefined();
    expect(prisma.patientAccessRequest).toBeDefined();
    // Security hardening additive models
    expect(prisma.userSession).toBeDefined();
    expect(prisma.rateLimitBucket).toBeDefined();
  });
});
