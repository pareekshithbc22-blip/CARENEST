/**
 * CareNest Transactional Email Infrastructure
 * Provides resilient, production-ready email delivery with:
 * 1) Universal SMTP transport (e.g. Gmail App Password, Brevo, SendGrid, Postmark)
 * 2) Resend HTTP API provider
 * 3) Strict delivery verification & error transparency (never claiming success when dispatch fails)
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getAppUrl } from "@/lib/config";

export type EmailDiagnosticCode =
  | "EMAIL_NOT_CONFIGURED"
  | "SMTP_CONNECTION_FAILED"
  | "SMTP_AUTH_FAILED"
  | "SMTP_RECIPIENT_REJECTED"
  | "SMTP_DELIVERY_FAILED"
  | "SMTP_ACCEPTED"
  | "RESEND_REJECTED"
  | "RESEND_ACCEPTED"
  | "TEST_MOCK_ACCEPTED";

export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider: "SMTP" | "RESEND" | "LOCAL_FALLBACK" | "NONE";
  isSimulated: boolean;
  error?: string;
  diagnosticCode?: EmailDiagnosticCode;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?:
    | "MEDICATION"
    | "MISSED_DOSE"
    | "ESCALATION"
    | "APPOINTMENT"
    | "INVITATION"
    | "OTP_VERIFICATION";
}

export interface SmtpConfigStatus {
  isConfigured: boolean;
  host: string;
  port: number;
  secure: boolean;
  hasUser: boolean;
  hasPass: boolean;
  user?: string;
  from?: string;
  missingFields: string[];
}

export function getSmtpConfigStatus(): SmtpConfigStatus {
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD)?.trim() || "";
  const host =
    process.env.SMTP_HOST?.trim() ||
    (user.includes("@gmail.com") ? "smtp.gmail.com" : "smtp.gmail.com");

  const rawPort = process.env.SMTP_PORT?.trim();
  const port = rawPort ? parseInt(rawPort, 10) : 465;
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === "true"
      : port === 465;

  const from = process.env.SMTP_FROM?.trim() || process.env.EMAIL_FROM?.trim() || "";

  const missingFields: string[] = [];

  const isUserValid =
    user.length > 0 &&
    !user.includes("your-email@gmail.com") &&
    !user.includes("<my Gmail") &&
    !user.startsWith("<");
  const isPassValid =
    pass.length > 0 &&
    !pass.includes("xxxx xxxx") &&
    !pass.includes("<my Gmail") &&
    !pass.startsWith("<");

  if (!isUserValid) missingFields.push("SMTP_USER");
  if (!isPassValid) missingFields.push("SMTP_PASS");

  return {
    isConfigured: missingFields.length === 0,
    host,
    port,
    secure,
    hasUser: isUserValid,
    hasPass: isPassValid,
    user: isUserValid ? user : undefined,
    from: from || undefined,
    missingFields,
  };
}

let cachedTransporter: Transporter | null = null;
let lastSmtpConfigKey: string | null = null;

function getSmtpTransporter(): Transporter | null {
  const status = getSmtpConfigStatus();
  if (!status.isConfigured || !status.user) {
    return null;
  }

  const pass = (process.env.SMTP_PASS || process.env.SMTP_PASSWORD)!.replace(/\s+/g, "");
  const configKey = `${status.host}:${status.port}:${status.secure}:${status.user}:${pass}`;

  if (!cachedTransporter || lastSmtpConfigKey !== configKey) {
    lastSmtpConfigKey = configKey;
    cachedTransporter = nodemailer.createTransport({
      host: status.host,
      port: status.port,
      secure: status.secure,
      auth: {
        user: status.user,
        pass, // Cleaned 16-character Google App Password
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  return cachedTransporter;
}

/**
 * Base email sending dispatcher with production diagnostics
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  type = "MEDICATION",
}: SendEmailOptions): Promise<EmailResult> {
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

  // -----------------------------------------------------------
  // Provider Option 1: Universal SMTP (Gmail App Password, Brevo, SendGrid, etc.)
  // -----------------------------------------------------------
  const smtpStatus = getSmtpConfigStatus();
  const smtpTransporter = getSmtpTransporter();

  if (smtpTransporter && smtpStatus.isConfigured && smtpStatus.user) {
    const fromAddress =
      process.env.SMTP_FROM ||
      process.env.EMAIL_FROM ||
      `"CareNest Health" <${smtpStatus.user}>`;

    try {
      const info = await smtpTransporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        text: text || subject,
      });

      const accepted = (info.accepted || []).map((addr: unknown) => String(addr).toLowerCase());
      const isAccepted = accepted.length > 0 && accepted.includes(to.toLowerCase());

      if (isAccepted || info.messageId) {
        console.log(
          `[CareNest Email Diagnostics] Status: SMTP_ACCEPTED | Provider: SMTP | Recipient: ${to} | MessageId: ${info.messageId || "N/A"} | Response: ${info.response || "250 OK"}`
        );
        return {
          success: true,
          messageId: info.messageId,
          provider: "SMTP",
          isSimulated: false,
          diagnosticCode: "SMTP_ACCEPTED",
        };
      } else {
        const errMsg = `The SMTP server did not accept recipient '${to}'.`;
        console.error(`[CareNest Email Diagnostics] Status: SMTP_RECIPIENT_REJECTED | Recipient: ${to}`);
        return {
          success: false,
          error: errMsg,
          provider: "SMTP",
          isSimulated: false,
          diagnosticCode: "SMTP_RECIPIENT_REJECTED",
        };
      }
    } catch (err: any) {
      const errCode = err.code || "";
      const errResponse = String(err.response || "");
      const errMessage = String(err.message || "");

      const isAuthError =
        errCode === "EAUTH" ||
        err.responseCode === 535 ||
        errResponse.includes("535") ||
        errMessage.includes("535") ||
        errMessage.includes("Invalid login") ||
        errMessage.includes("BadCredentials");

      const isConnError =
        errCode === "ECONNREFUSED" ||
        errCode === "ETIMEDOUT" ||
        errCode === "ENOTFOUND" ||
        errCode === "ESOCKETTIMEDOUT" ||
        errCode === "ECONNRESET";

      let diagnosticCode: EmailDiagnosticCode = "SMTP_DELIVERY_FAILED";
      let userFriendlyMessage = errMessage || "Failed to deliver email via SMTP.";

      if (isAuthError) {
        diagnosticCode = "SMTP_AUTH_FAILED";
        userFriendlyMessage =
          "Gmail SMTP authentication failed. Please verify that 2-Step Verification is enabled on your Google Account and that you are using a 16-character App Password generated at https://myaccount.google.com/apppasswords without typos.";
        console.error(
          `[CareNest Email Diagnostics] Status: SMTP_AUTH_FAILED | Provider: SMTP | Recipient: ${to} | Detail: Google rejected credentials (535 Bad Credentials)`
        );
      } else if (isConnError) {
        diagnosticCode = "SMTP_CONNECTION_FAILED";
        userFriendlyMessage = `SMTP connection failed: Unable to connect to ${smtpStatus.host}:${smtpStatus.port}. Please check network connectivity and firewall rules.`;
        console.error(
          `[CareNest Email Diagnostics] Status: SMTP_CONNECTION_FAILED | Provider: SMTP | Recipient: ${to} | ErrorCode: ${errCode}`
        );
      } else {
        console.error(
          `[CareNest Email Diagnostics] Status: SMTP_DELIVERY_FAILED | Provider: SMTP | Recipient: ${to} | Error: ${errMessage}`
        );
      }

      return {
        success: false,
        error: userFriendlyMessage,
        provider: "SMTP",
        isSimulated: false,
        diagnosticCode,
      };
    }
  }

  // -----------------------------------------------------------
  // Provider Option 2: Resend HTTP API
  // -----------------------------------------------------------
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && apiKey.trim().length > 0 && !apiKey.includes("your-resend-api-key")) {
    const fromAddress =
      process.env.EMAIL_FROM || "CareNest <onboarding@resend.dev>";

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject,
          html,
          text: text || subject,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(
          `[CareNest Email Diagnostics] Status: RESEND_ACCEPTED | Provider: RESEND | Recipient: ${to} | MessageId: ${data.id}`
        );
        return {
          success: true,
          messageId: data.id,
          provider: "RESEND",
          isSimulated: false,
          diagnosticCode: "RESEND_ACCEPTED",
        };
      } else {
        const errData = await response.json().catch(() => ({}));
        console.warn(`[CareNest Email Diagnostics] Status: RESEND_REJECTED | Recipient: ${to} | Error:`, errData);

        let errMsg = errData.message || "Resend API rejected message";
        if (
          errData.name === "validation_error" &&
          typeof errData.message === "string" &&
          errData.message.includes("You can only send testing emails to your own email address")
        ) {
          errMsg = `Resend free tier restriction: 'onboarding@resend.dev' can only send to your own registered account email. To deliver to '${to}', configure Gmail SMTP credentials in .env.local or verify your domain at resend.com.`;
        }

        return {
          success: false,
          error: errMsg,
          provider: "RESEND",
          isSimulated: false,
          diagnosticCode: "RESEND_REJECTED",
        };
      }
    } catch (err: any) {
      console.error(`[CareNest Email Diagnostics] Status: RESEND_REJECTED | Recipient: ${to} | Exception:`, err);
      return {
        success: false,
        error: err.message || "Network exception during email dispatch",
        provider: "RESEND",
        isSimulated: false,
        diagnosticCode: "RESEND_REJECTED",
      };
    }
  }

  // -----------------------------------------------------------
  // Offline Automated Test Environment (Vitest Mock)
  // -----------------------------------------------------------
  if (isTest) {
    return {
      success: true,
      messageId: `test-mock-${Date.now()}`,
      provider: "LOCAL_FALLBACK",
      isSimulated: true,
      diagnosticCode: "TEST_MOCK_ACCEPTED",
    };
  }

  // -----------------------------------------------------------
  // Unconfigured State (Development or Production)
  // Transparently inform the user and abort — NEVER pretend success!
  // -----------------------------------------------------------
  let unconfiguredMessage =
    "Email delivery service is not configured. Please configure Gmail SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) or RESEND_API_KEY in .env or .env.local to deliver real verification codes.";

  if (smtpStatus.missingFields.length === 1 && smtpStatus.missingFields[0] === "SMTP_PASS") {
    unconfiguredMessage =
      "Gmail SMTP username (SMTP_USER) is configured, but SMTP_PASS (Google 16-character App Password) is missing in .env or .env.local.";
  } else if (smtpStatus.missingFields.length === 1 && smtpStatus.missingFields[0] === "SMTP_USER") {
    unconfiguredMessage =
      "Gmail SMTP password (SMTP_PASS) is configured, but SMTP_USER (your Gmail address) is missing in .env or .env.local.";
  }

  const divider = "========================================================";
  console.warn(`\n${divider}`);
  console.warn(`⚠️ [CareNest Email Provider Warning]`);
  console.warn(`Status: EMAIL_NOT_CONFIGURED`);
  console.warn(`Missing: ${smtpStatus.missingFields.join(", ") || "SMTP_USER, SMTP_PASS"}`);
  console.warn(`Recipient: ${to}`);
  console.warn(`Action Required: Enter your Gmail address and 16-character App Password in .env.local or .env.`);
  console.warn(`${divider}\n`);

  return {
    success: false,
    error: unconfiguredMessage,
    provider: "NONE",
    isSimulated: false,
    diagnosticCode: "EMAIL_NOT_CONFIGURED",
  };
}

// -------------------------------------------------------------
// Specialized Healthcare Email Templates
// -------------------------------------------------------------

export function generateBaseEmailWrapper(title: string, bodyContent: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; line-height: 1.5; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #0f766e; color: #ffffff; padding: 24px 32px; text-align: left; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
        .tagline { font-size: 13px; color: #ccfbf1; margin-top: 4px; }
        .content { padding: 32px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
        .badge-warning { background-color: #fef3c7; color: #92400e; }
        .badge-urgent { background-color: #fee2e2; color: #991b1b; }
        .badge-info { background-color: #e0f2fe; color: #075985; }
        .badge-success { background-color: #dcfce7; color: #166534; }
        .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .info-row:last-child { margin-bottom: 0; }
        .info-label { color: #64748b; font-weight: 500; }
        .info-value { color: #0f172a; font-weight: 600; }
        .btn { display: inline-block; background-color: #0f766e; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 20px; }
        .footer { background: #f1f5f9; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>CareNest</h1>
          <div class="tagline">One connected circle of care. Every dose. Every appointment. Everyone informed.</div>
        </div>
        <div class="content">
          ${bodyContent}
        </div>
        <div class="footer">
          CareNest Healthcare Coordination • Confidential Patient Information<br />
          This automated reminder is sent in accordance with care circle notification preferences.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Medication reminder email template
 */
export async function sendMedicationReminderEmail({
  to,
  seniorName,
  medicationName,
  dosage,
  instructions,
  scheduledTime,
}: {
  to: string;
  seniorName: string;
  medicationName: string;
  dosage: string;
  instructions: string;
  scheduledTime: string;
}): Promise<EmailResult> {
  const subject = `Medication Reminder: ${medicationName} for ${seniorName}`;
  const html = generateBaseEmailWrapper(
    subject,
    `
      <span class="badge badge-info">Scheduled Medication Dose</span>
      <h2 style="margin-top: 0; font-size: 20px; color: #0f172a;">Upcoming Dose Reminder</h2>
      <p style="color: #334155;">This is a scheduled reminder that <strong>${seniorName}</strong> is due for medication.</p>
      
      <div class="info-card">
        <div class="info-row"><span class="info-label">Patient:</span><span class="info-value">${seniorName}</span></div>
        <div class="info-row"><span class="info-label">Medication:</span><span class="info-value">${medicationName}</span></div>
        <div class="info-row"><span class="info-label">Dosage:</span><span class="info-value">${dosage}</span></div>
        <div class="info-row"><span class="info-label">Instructions:</span><span class="info-value">${instructions}</span></div>
        <div class="info-row"><span class="info-label">Scheduled For:</span><span class="info-value">${scheduledTime}</span></div>
      </div>

      <a href="${getAppUrl()}/dashboard/senior" class="btn">View Schedule on CareNest</a>
    `
  );

  return sendEmail({ to, subject, html, type: "MEDICATION" });
}

/**
 * Missed dose warning email template (Tier 1)
 */
export async function sendMissedDoseAlertEmail({
  to,
  seniorName,
  medicationName,
  scheduledTime,
  caretakerName,
  strength,
  gracePeriodMinutes,
}: {
  to: string;
  seniorName: string;
  medicationName: string;
  scheduledTime: string;
  caretakerName?: string;
  strength?: string;
  gracePeriodMinutes?: number;
}): Promise<EmailResult> {
  const subject = `⚠️ Alert: Missed Dose for ${seniorName} - ${medicationName}`;
  const html = generateBaseEmailWrapper(
    subject,
    `
      <span class="badge badge-warning">Tier 1 Missed Dose Alert</span>
      <h2 style="margin-top: 0; font-size: 20px; color: #92400e;">Unconfirmed Medication Dose</h2>
      <p style="color: #334155;">Hello ${caretakerName || "Care Coordinator"},</p>
      <p style="color: #334155;">The scheduled dose of <strong>${medicationName}</strong> for <strong>${seniorName}</strong> at <strong>${scheduledTime}</strong> has passed its grace window and remains unconfirmed.</p>
      
      <div class="info-card">
        <div class="info-row"><span class="info-label">Patient:</span><span class="info-value">${seniorName}</span></div>
        <div class="info-row"><span class="info-label">Medication:</span><span class="info-value">${medicationName}${strength ? ` (${strength})` : ""}</span></div>
        <div class="info-row"><span class="info-label">Scheduled Time:</span><span class="info-value">${scheduledTime}</span></div>
        ${gracePeriodMinutes ? `<div class="info-row"><span class="info-label">Grace Window:</span><span class="info-value">${gracePeriodMinutes} mins elapsed</span></div>` : ""}
        <div class="info-row"><span class="info-label">Status:</span><span class="info-value" style="color: #d97706;">Pending Confirmation</span></div>
      </div>

      <a href="${getAppUrl()}/dashboard/caretaker" class="btn">Confirm Dose Administration</a>
    `
  );

  return sendEmail({ to, subject, html, type: "MISSED_DOSE" });
}

/**
 * Family escalation email template (Tier 2)
 */
export async function sendEscalationAlertEmail({
  to,
  seniorName,
  medicationName,
  strength,
  scheduledTime,
  emergencyPhone,
}: {
  to: string;
  seniorName: string;
  medicationName: string;
  strength: string;
  scheduledTime: string;
  emergencyPhone: string;
}): Promise<EmailResult> {
  const subject = `🚨 URGENT ESCALATION: Missed Dose for ${seniorName} Requires Action`;
  const html = generateBaseEmailWrapper(
    subject,
    `
      <span class="badge badge-urgent">Tier 2 Escalation Alert</span>
      <h2 style="margin-top: 0; font-size: 20px; color: #991b1b;">Immediate Care Circle Escalation</h2>
      <p style="color: #334155;">This is an automated escalation. <strong>${seniorName}</strong> has missed their scheduled dose and no confirmation has been recorded despite previous caregiver alerts.</p>
      
      <div class="info-card" style="border-left: 4px solid #dc2626;">
        <div class="info-row"><span class="info-label">Elderly Profile:</span><span class="info-value">${seniorName}</span></div>
        <div class="info-row"><span class="info-label">Medication:</span><span class="info-value">${medicationName} (${strength})</span></div>
        <div class="info-row"><span class="info-label">Scheduled Time:</span><span class="info-value">${scheduledTime}</span></div>
        <div class="info-row"><span class="info-label">Emergency Contact:</span><span class="info-value">${emergencyPhone}</span></div>
      </div>

      <p style="color: #991b1b; font-weight: 600; font-size: 14px;">Action Required: Please phone the senior or dispatch a caregiver check immediately.</p>
      <a href="${getAppUrl()}/dashboard/family" class="btn" style="background-color: #b91c1c;">Open Emergency Care Circle</a>
    `
  );

  return sendEmail({ to, subject, html, type: "ESCALATION" });
}

export const sendCaregiverEscalationEmail = sendEscalationAlertEmail;

/**
 * Appointment reminder email template
 */
export async function sendAppointmentReminderEmail({
  to,
  seniorName,
  title,
  doctorName,
  clinicName,
  appointmentDate,
  locationAddress,
  notes,
}: {
  to: string;
  seniorName: string;
  title: string;
  doctorName: string;
  clinicName: string;
  appointmentDate: string;
  locationAddress?: string | null;
  notes?: string | null;
}): Promise<EmailResult> {
  const subject = `Healthcare Appointment Reminder: ${title} for ${seniorName}`;
  const html = generateBaseEmailWrapper(
    subject,
    `
      <span class="badge badge-info">Upcoming Appointment</span>
      <h2 style="margin-top: 0; font-size: 20px; color: #0f172a;">Healthcare Appointment Reminder</h2>
      <p style="color: #334155;">Upcoming doctor appointment scheduled for <strong>${seniorName}</strong>.</p>
      
      <div class="info-card">
        <div class="info-row"><span class="info-label">Appointment:</span><span class="info-value">${title}</span></div>
        <div class="info-row"><span class="info-label">Doctor:</span><span class="info-value">${doctorName}</span></div>
        <div class="info-row"><span class="info-label">Clinic:</span><span class="info-value">${clinicName}</span></div>
        <div class="info-row"><span class="info-label">Date & Time:</span><span class="info-value">${appointmentDate}</span></div>
        ${locationAddress ? `<div class="info-row"><span class="info-label">Address:</span><span class="info-value">${locationAddress}</span></div>` : ''}
        ${notes ? `<div class="info-row"><span class="info-label">Preparation Notes:</span><span class="info-value">${notes}</span></div>` : ''}
      </div>

      <a href="${getAppUrl()}/dashboard/family" class="btn">View Appointment Details</a>
    `
  );

  return sendEmail({ to, subject, html, type: "APPOINTMENT" });
}

/**
 * Care circle member invitation email template
 */
export async function sendCareCircleInvitationEmail({
  to,
  inviterName,
  seniorName,
  circleName,
  role,
  invitationUrl,
}: {
  to: string;
  inviterName: string;
  seniorName: string;
  circleName: string;
  role: string;
  invitationUrl: string;
}): Promise<EmailResult> {
  const subject = `Join ${circleName} for ${seniorName} on CareNest`;
  const html = generateBaseEmailWrapper(
    subject,
    `
      <span class="badge badge-success">Care Circle Invitation</span>
      <h2 style="margin-top: 0; font-size: 20px; color: #0f172a;">You've Been Invited to a Care Circle</h2>
      <p style="color: #334155;"><strong>${inviterName}</strong> has invited you to join the Care Circle for <strong>${seniorName}</strong> as a <strong>${role}</strong>.</p>
      
      <div class="info-card">
        <div class="info-row"><span class="info-label">Care Circle:</span><span class="info-value">${circleName}</span></div>
        <div class="info-row"><span class="info-label">Elderly Patient:</span><span class="info-value">${seniorName}</span></div>
        <div class="info-row"><span class="info-label">Your Role:</span><span class="info-value">${role}</span></div>
      </div>

      <p style="color: #64748b; font-size: 13px;">This invitation link is single-use and will expire in 7 days for security.</p>
      <a href="${invitationUrl}" class="btn">Accept Care Circle Invitation</a>
    `
  );

  return sendEmail({ to, subject, html, type: "INVITATION" });
}

/**
 * Email OTP Verification template
 */
export async function sendOtpVerificationEmail({
  to,
  name,
  otp,
}: {
  to: string;
  name: string;
  otp: string;
}): Promise<EmailResult> {
  const subject = `Your CARENEST Verification Code: ${otp}`;
  const html = generateBaseEmailWrapper(
    subject,
    `
      <span class="badge badge-info">Identity Verification</span>
      <h2 style="margin-top: 0; font-size: 20px; color: #0f172a;">Verify Your Email Address</h2>
      <p style="color: #334155;">Hello <strong>${name || "Care Coordinator"}</strong>,</p>
      <p style="color: #334155;">Welcome to CARENEST. Please use the following 6-digit verification code to complete your registration:</p>
      
      <div style="background: #f0fdf4; border: 2px dashed #0f766e; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f766e;">
          ${otp}
        </span>
      </div>

      <div class="info-card">
        <div class="info-row"><span class="info-label">Security Notice:</span><span class="info-value">This code expires in 5 minutes.</span></div>
        <div class="info-row"><span class="info-label">Intended Recipient:</span><span class="info-value">${to}</span></div>
        <div class="info-row"><span class="info-label">Action:</span><span class="info-value">Enter this code on the registration page</span></div>
      </div>

      <p style="color: #64748b; font-size: 13px;">If you did not request this verification code, please ignore this email. No account will be activated without code verification.</p>
    `
  );

  return sendEmail({ to, subject, html, type: "OTP_VERIFICATION" });
}
