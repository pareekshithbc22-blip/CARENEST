/**
 * CareNest Transactional Email Infrastructure
 * Provides resilient email delivery with Resend provider support
 * and local development fallback with audit tracking.
 */

export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider: "RESEND" | "LOCAL_FALLBACK";
  isSimulated: boolean;
  error?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: "MEDICATION" | "MISSED_DOSE" | "ESCALATION" | "APPOINTMENT" | "INVITATION";
}

/**
 * Base email sending dispatcher
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  type = "MEDICATION",
}: SendEmailOptions): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || "CareNest <notifications@carenest.health>";

  // If Resend API Key is provided, attempt delivery through Resend HTTP API
  if (apiKey && apiKey.trim().length > 0 && !apiKey.includes("your-resend-api-key")) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
        return {
          success: true,
          messageId: data.id,
          provider: "RESEND",
          isSimulated: false,
        };
      } else {
        const errData = await response.json();
        console.warn(`[CareNest Email] Resend API error:`, errData);
        // Fall back to logged audit
        return {
          success: false,
          error: errData.message || "Resend API rejected message",
          provider: "RESEND",
          isSimulated: false,
        };
      }
    } catch (err: any) {
      console.error(`[CareNest Email] Delivery exception:`, err);
      return {
        success: false,
        error: err.message || "Network exception during email dispatch",
        provider: "RESEND",
        isSimulated: false,
      };
    }
  }

  // Development & Evaluation Fallback
  // Resend API Key is not configured: log transparently and do not pretend it reached the inbox
  const divider = "========================================================";
  console.log(`\n${divider}`);
  console.log(`📧 [CareNest Proactive Email Fallback]`);
  console.log(`Type:       ${type}`);
  console.log(`To:         ${to}`);
  console.log(`Subject:    ${subject}`);
  console.log(`Status:     Logged locally (RESEND_API_KEY not configured)`);
  console.log(`${divider}\n`);

  return {
    success: true,
    messageId: `sim-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    provider: "LOCAL_FALLBACK",
    isSimulated: true,
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
  strength,
  scheduledTime,
  dosageInstructions,
}: {
  to: string;
  seniorName: string;
  medicationName: string;
  strength: string;
  scheduledTime: string;
  dosageInstructions: string;
}): Promise<EmailResult> {
  const subject = `Medication Reminder: ${medicationName} (${strength}) for ${seniorName}`;
  const html = generateBaseEmailWrapper(
    subject,
    `
      <span class="badge badge-info">Scheduled Medication Dose</span>
      <h2 style="margin-top: 0; font-size: 20px; color: #0f172a;">Upcoming Medication Reminder</h2>
      <p style="color: #334155;">This is a scheduled reminder for <strong>${seniorName}</strong> to take their prescribed medication.</p>
      
      <div class="info-card">
        <div class="info-row"><span class="info-label">Medication:</span><span class="info-value">${medicationName}</span></div>
        <div class="info-row"><span class="info-label">Strength:</span><span class="info-value">${strength}</span></div>
        <div class="info-row"><span class="info-label">Scheduled Time:</span><span class="info-value">${scheduledTime}</span></div>
        <div class="info-row"><span class="info-label">Instructions:</span><span class="info-value">${dosageInstructions}</span></div>
      </div>

      <p style="color: #64748b; font-size: 13px;">Please log into the CareNest Senior Dashboard or Family Dashboard once the dose is administered.</p>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard" class="btn">Confirm Dose Administration</a>
    `
  );

  return sendEmail({ to, subject, html, type: "MEDICATION" });
}

/**
 * Missed dose alert email template
 */
export async function sendMissedDoseAlertEmail({
  to,
  seniorName,
  medicationName,
  strength,
  scheduledTime,
  gracePeriodMinutes,
}: {
  to: string;
  seniorName: string;
  medicationName: string;
  strength: string;
  scheduledTime: string;
  gracePeriodMinutes: number;
}): Promise<EmailResult> {
  const subject = `⚠️ Alert: Unconfirmed Dose for ${seniorName} - ${medicationName}`;
  const html = generateBaseEmailWrapper(
    subject,
    `
      <span class="badge badge-warning">Grace Period Elapsed</span>
      <h2 style="margin-top: 0; font-size: 20px; color: #92400e;">Unconfirmed Medication Dose</h2>
      <p style="color: #334155;">The scheduled dose for <strong>${seniorName}</strong> has not been confirmed after the <strong>${gracePeriodMinutes}-minute</strong> grace window.</p>
      
      <div class="info-card">
        <div class="info-row"><span class="info-label">Patient:</span><span class="info-value">${seniorName}</span></div>
        <div class="info-row"><span class="info-label">Medication:</span><span class="info-value">${medicationName} (${strength})</span></div>
        <div class="info-row"><span class="info-label">Scheduled For:</span><span class="info-value">${scheduledTime}</span></div>
        <div class="info-row"><span class="info-label">Status:</span><span class="info-value" style="color: #b45309;">UNCONFIRMED / ATTENTION NEEDED</span></div>
      </div>

      <p style="color: #334155; font-size: 14px;">Please check in with ${seniorName} or contact their primary caretaker to verify that the dose is taken safely.</p>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/family" class="btn">View Care Dashboard</a>
    `
  );

  return sendEmail({ to, subject, html, type: "MISSED_DOSE" });
}

/**
 * Urgent caregiver escalation email template
 */
export async function sendCaregiverEscalationEmail({
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
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/family" class="btn" style="background-color: #b91c1c;">Open Emergency Care Circle</a>
    `
  );

  return sendEmail({ to, subject, html, type: "ESCALATION" });
}

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

      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/family" class="btn">View Appointment Details</a>
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
