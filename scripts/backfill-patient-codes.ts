/**
 * Backfill Patient Codes Script
 *
 * Assigns sequential PT-0001, PT-0002... patient codes to any existing
 * ElderlyProfile records that are missing a patientCode.
 *
 * Idempotent: safe to run multiple times.
 *
 * Usage:
 *   npx tsx scripts/backfill-patient-codes.ts --dry-run
 *   npx tsx scripts/backfill-patient-codes.ts
 *
 * Note: Never logs personal data (names, emails, phones) to stdout.
 */

import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const isDryRun = process.argv.includes("--dry-run") || process.argv.includes("-d");

async function main() {
  console.log(`[Backfill] Starting patient code backfill... Mode: ${isDryRun ? "DRY-RUN (No database writes)" : "LIVE"}`);

  if (!process.env.DATABASE_URL) {
    console.error("[Backfill Error] DATABASE_URL is not defined in environment.");
    process.exit(1);
  }

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Fetch all elderly profiles ordered by createdAt asc
    const profiles = await prisma.elderlyProfile.findMany({
      select: {
        id: true,
        patientCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(`[Backfill] Total ElderlyProfile records found: ${profiles.length}`);

    // 2. Identify highest existing sequential code
    let highestSeq = 0;
    const existingCodes = new Set<string>();

    for (const p of profiles) {
      if (p.patientCode) {
        existingCodes.add(p.patientCode);
        const match = p.patientCode.match(/^PT-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > highestSeq) {
            highestSeq = num;
          }
        }
      }
    }

    // 3. Query existing sequence counter
    const counter = await prisma.patientCodeCounter.findUnique({
      where: { id: "singleton" },
    });
    if (counter && counter.seq > highestSeq) {
      highestSeq = counter.seq;
    }

    console.log(`[Backfill] Current highest sequence number: ${highestSeq}`);

    let assignedCount = 0;
    let currentSeq = highestSeq;

    // 4. Backfill missing codes
    for (const p of profiles) {
      if (!p.patientCode) {
        // Allocate next available sequence
        do {
          currentSeq += 1;
        } while (existingCodes.has(`PT-${String(currentSeq).padStart(4, "0")}`));

        const newCode = `PT-${String(currentSeq).padStart(4, "0")}`;
        existingCodes.add(newCode);
        assignedCount += 1;

        if (isDryRun) {
          console.log(`[DRY-RUN] Profile ID ${p.id} -> would assign ${newCode}`);
        } else {
          await prisma.elderlyProfile.update({
            where: { id: p.id },
            data: { patientCode: newCode },
          });
          console.log(`[LIVE] Profile ID ${p.id} -> assigned ${newCode}`);
        }
      }
    }

    // 5. Synchronize PatientCodeCounter
    if (!isDryRun && assignedCount > 0) {
      await prisma.patientCodeCounter.upsert({
        where: { id: "singleton" },
        update: { seq: currentSeq },
        create: { id: "singleton", seq: currentSeq },
      });
      console.log(`[LIVE] Synchronized PatientCodeCounter to ${currentSeq}`);
    } else if (isDryRun) {
      console.log(`[DRY-RUN] Would synchronize PatientCodeCounter to ${currentSeq}`);
    }

    console.log("\n================ BACKFILL SUMMARY ================");
    console.log(`Total Profiles Evaluated : ${profiles.length}`);
    console.log(`Already Had Patient Code : ${profiles.length - assignedCount}`);
    console.log(`Backfilled Codes         : ${assignedCount}`);
    console.log(`Final Sequence Number    : ${currentSeq}`);
    console.log(`Mode                     : ${isDryRun ? "DRY-RUN (Safe)" : "LIVE (Committed)"}`);
    console.log("==================================================\n");
  } catch (err: any) {
    console.error("[Backfill Error]:", err.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
