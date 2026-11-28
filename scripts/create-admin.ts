/**
 * Create Platform Administrator CLI Script.
 * Promotes an existing registered user to platform ADMIN.
 *
 * Requirements:
 * 1. The target user must already exist in the database.
 * 2. The target user must have completed 2-Factor Authentication (2FA) setup.
 * 3. Supports --dry-run flag for safe inspection.
 * 4. Prints zero secrets or passwords.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts <email> [--dry-run]
 */

import { prisma } from "../src/lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const emailArg = args.find((a) => !a.startsWith("--"));

  if (!emailArg) {
    console.error("Usage: npx tsx scripts/create-admin.ts <email> [--dry-run]");
    process.exit(1);
  }

  const normalizedEmail = emailArg.trim().toLowerCase();

  console.log("================ CARENEST ADMIN PROMOTION ================");
  console.log(`Target Email   : ${normalizedEmail}`);
  console.log(`Execution Mode : ${isDryRun ? "DRY-RUN (Simulated, no changes)" : "LIVE (Applying changes)"}`);
  console.log("----------------------------------------------------------");

  // 1. Locate user
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      twoFactorEnabled: true,
      isEmailVerified: true,
      createdAt: true,
    },
  });

  if (!user) {
    console.error(`[ERROR] User with email '${normalizedEmail}' does not exist.`);
    console.error("The account must first register via /register before it can be promoted to ADMIN.");
    process.exit(1);
  }

  console.log(`Found Account  : ${user.name} (ID: ${user.id})`);
  console.log(`Current Role   : ${user.role}`);
  console.log(`Email Verified : ${user.isEmailVerified ? "YES" : "NO"}`);
  console.log(`2FA Configured : ${user.twoFactorEnabled ? "YES" : "NO"}`);

  // 2. Security validation: 2FA must be configured for all platform administrators
  if (!user.twoFactorEnabled) {
    console.error("\n[SECURITY REQUIREMENT UNMET]");
    console.error("Platform administrators MUST have 2-Factor Authentication (2FA) configured.");
    console.error(`Please log in as ${normalizedEmail}, complete 2FA setup in settings, and re-run this command.`);
    process.exit(1);
  }

  if (user.role === "ADMIN") {
    console.log(`\n[INFO] User '${normalizedEmail}' is already a platform ADMIN. No action required.`);
    process.exit(0);
  }

  // 3. Promote to ADMIN
  if (isDryRun) {
    console.log(`\n[DRY-RUN SUCCESS] Account '${normalizedEmail}' meets all criteria and would be promoted to role 'ADMIN'.`);
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });

    console.log(`\n[LIVE SUCCESS] Account '${normalizedEmail}' successfully promoted to role 'ADMIN'.`);
    console.log("The user can now access /dashboard/admin and /dashboard/admin/verifications.");
  }

  console.log("==========================================================");
}

main()
  .catch((e) => {
    console.error("[FATAL ERROR]:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
