#!/usr/bin/env node
/**
 * CareNest SMTP & Email Delivery Diagnostic CLI
 * Usage:
 *   node scripts/diagnose-smtp.mjs                # Test configuration & SMTP connection/auth
 *   node scripts/diagnose-smtp.mjs recipient@gmail.com  # Send a live test email
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

// Priority: .env.local overrides .env
const appDir = process.cwd();
const envLocalPath = path.join(appDir, ".env.local");
const envPath = path.join(appDir, ".env");

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log(`[Config] Loaded environment variables from: .env.local`);
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`[Config] Loaded environment variables from: .env (.env.local not found)`);
}

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const rawPort = process.env.SMTP_PORT;
const port = rawPort ? parseInt(rawPort, 10) : 465;
const secure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === "true" : port === 465;
const user = process.env.SMTP_USER?.trim() || "";
const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD)?.trim() || "";
const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || (user ? `"CareNest Health" <${user}>` : "");

console.log("\n========================================================");
console.log("🏥 CARENEST — Email Delivery & SMTP Diagnostics");
console.log("========================================================");

console.log(`SMTP Host:       ${host}`);
console.log(`SMTP Port:       ${port}`);
console.log(`Secure (SSL):    ${secure}`);
console.log(`SMTP User:       ${user ? user : "(NOT CONFIGURED)"}`);
console.log(`SMTP Pass:       ${pass ? "●●●●●●●●●●●●●●●● (Configured)" : "(NOT CONFIGURED)"}`);
console.log(`Sender (From):   ${from ? from : "(Auto-default)"}`);

const isUserConfigured = user.length > 0 && !user.includes("your-email@gmail.com") && !user.includes("<my Gmail");
const isPassConfigured = pass.length > 0 && !pass.includes("xxxx xxxx") && !pass.includes("<my Gmail");

if (!isUserConfigured || !isPassConfigured) {
  console.log("\n⚠️  [DIAGNOSTIC RESULT: EMAIL_NOT_CONFIGURED]");
  console.log("--------------------------------------------------------");
  if (!isUserConfigured && !isPassConfigured) {
    console.log("Neither SMTP_USER nor SMTP_PASS are configured.");
  } else if (!isUserConfigured) {
    console.log("SMTP_PASS is present, but SMTP_USER (your Gmail address) is missing.");
  } else {
    console.log("SMTP_USER is set, but SMTP_PASS (16-character Google App Password) is missing.");
  }
  console.log("\nTo configure real Gmail SMTP delivery:");
  console.log("1. Enable 2-Step Verification: https://myaccount.google.com/security");
  console.log("2. Generate a 16-character App Password: https://myaccount.google.com/apppasswords");
  console.log("3. Add the following to .env.local (or .env):");
  console.log('   SMTP_HOST="smtp.gmail.com"');
  console.log('   SMTP_PORT="465"');
  console.log('   SMTP_SECURE="true"');
  console.log('   SMTP_USER="your-actual-email@gmail.com"');
  console.log('   SMTP_PASS="xxxx xxxx xxxx xxxx"');
  console.log('   SMTP_FROM="CareNest Health <your-actual-email@gmail.com>"');
  console.log("========================================================\n");
  process.exit(0);
}

// Create transporter
const cleanPass = pass.replace(/\s+/g, "");
const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user,
    pass: cleanPass,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

console.log("\n⏳ Verifying connection and authentication with smtp.gmail.com:465...");

try {
  await transporter.verify();
  console.log("\n✅ [DIAGNOSTIC RESULT: SMTP_ACCEPTED & AUTH_VERIFIED]");
  console.log("--------------------------------------------------------");
  console.log("Successfully connected to Google SMTP and authenticated!");
  console.log(`Authenticated Account: ${user}`);

  const recipientArg = process.argv[2];
  if (recipientArg && recipientArg.includes("@")) {
    console.log(`\n⏳ Dispatching live test email to: ${recipientArg}...`);
    const info = await transporter.sendMail({
      from,
      to: recipientArg,
      subject: "CARENEST — Real SMTP Verification Test",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; background: #f8fafc;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f766e; margin-top: 0;">CareNest Email Verification Test</h2>
            <p style="color: #334155;">This is a live test email confirming that CareNest is successfully communicating with Google SMTP.</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px; margin: 16px 0;">
              <strong>Status:</strong> Live SMTP Delivery Verified
            </div>
            <p style="color: #64748b; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        </div>
      `,
    });

    console.log("\n🎉 [LIVE EMAIL DISPATCH SUCCESSFUL]");
    console.log(`Message ID: ${info.messageId}`);
    console.log(`Accepted:   ${JSON.stringify(info.accepted)}`);
    console.log(`Response:   ${info.response}`);
  } else {
    console.log("\n💡 Tip: To send a live test email, run:");
    console.log("   node scripts/diagnose-smtp.mjs your-email@gmail.com");
  }
  console.log("========================================================\n");
} catch (err) {
  const errCode = err.code || "";
  const errMessage = String(err.message || "");

  if (errCode === "EAUTH" || err.responseCode === 535 || errMessage.includes("535")) {
    console.log("\n❌ [DIAGNOSTIC RESULT: SMTP_AUTH_FAILED]");
    console.log("--------------------------------------------------------");
    console.log("Google SMTP rejected the provided credentials (535 Bad Credentials).");
    console.log("Checklist to fix:");
    console.log("1. Ensure 2-Step Verification is turned ON for your Google account.");
    console.log("2. Use a 16-character App Password generated at: https://myaccount.google.com/apppasswords");
    console.log("3. Do NOT use your standard personal Google account password.");
    console.log("4. Ensure there are no typos in SMTP_USER or SMTP_PASS.");
  } else if (errCode === "ECONNREFUSED" || errCode === "ETIMEDOUT" || errCode === "ENOTFOUND") {
    console.log("\n❌ [DIAGNOSTIC RESULT: SMTP_CONNECTION_FAILED]");
    console.log("--------------------------------------------------------");
    console.log(`Could not connect to ${host}:${port}. Error code: ${errCode}`);
    console.log("Please check your internet connection and local firewall settings.");
  } else {
    console.log("\n❌ [DIAGNOSTIC RESULT: SMTP_DELIVERY_FAILED]");
    console.log("--------------------------------------------------------");
    console.log(`Error: ${errMessage}`);
  }
  console.log("========================================================\n");
}
