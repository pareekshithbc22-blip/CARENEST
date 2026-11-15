import { prisma } from "../prisma";
import {
  sendMissedDoseAlertEmail,
  sendCaregiverEscalationEmail,
} from "../email/service";

export interface EscalationRunSummary {
  processedDoses: number;
  tier1CaretakerAlerts: number;
  tier2FamilyEscalations: number;
  errors: string[];
}

/**
 * Executes the database-backed Missed-Dose Escalation Workflow.
 * Completely decoupled from client browsers; runs securely in background / cron.
 */
export async function processDoseEscalations(): Promise<EscalationRunSummary> {
  const summary: EscalationRunSummary = {
    processedDoses: 0,
    tier1CaretakerAlerts: 0,
    tier2FamilyEscalations: 0,
    errors: [],
  };

  const now = new Date();

  try {
    // 1. Fetch doses that are unconfirmed and whose scheduled time + grace period has passed
    const pendingDoses = await prisma.scheduledDose.findMany({
      where: {
        status: { in: ["SCHEDULED", "UNCONFIRMED"] },
        confirmedAt: null,
        escalationLevel: { in: [0, 1] },
      },
      include: {
        medication: true,
        elderlyProfile: {
          include: {
            careCircles: {
              include: {
                members: {
                  where: { isActive: true },
                  include: {
                    user: {
                      include: {
                        notificationPref: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const dose of pendingDoses) {
      const scheduledTime = new Date(dose.scheduledAt).getTime();
      const gracePeriodMs = (dose.gracePeriodMinutes || 45) * 60 * 1000;
      const graceDeadline = scheduledTime + gracePeriodMs;

      // Check if grace period has elapsed
      if (now.getTime() < graceDeadline) {
        continue;
      }

      summary.processedDoses++;
      const profile = dose.elderlyProfile;
      const med = dose.medication;
      const primaryCircle = profile.careCircles[0];

      // TIER 1 ESCALATION: Grace period has elapsed, alert Caretaker
      if (dose.escalationLevel === 0) {
        await prisma.$transaction(async (tx) => {
          // Update dose state
          await tx.scheduledDose.update({
            where: { id: dose.id },
            data: {
              status: "UNCONFIRMED",
              escalationLevel: 1,
              escalatedAt: now,
            },
          });

          // Audit log
          await tx.auditLog.create({
            data: {
              elderlyProfileId: profile.id,
              careCircleId: primaryCircle?.id,
              action: "DOSE_ESCALATED_TIER_1",
              entityType: "ScheduledDose",
              entityId: dose.id,
              details: {
                medication: med.name,
                scheduledAt: dose.scheduledAt,
                gracePeriodMinutes: dose.gracePeriodMinutes,
                stage: "CARETAKER_NOTIFICATION",
              },
            },
          });
        });

        // Notify Caretakers & Circle Admins
        if (primaryCircle) {
          const caretakers = primaryCircle.members.filter(
            (m) =>
              m.role === "CARETAKER" ||
              m.permissions.includes("CAN_RECEIVE_ESCALATIONS")
          );

          for (const member of caretakers) {
            const user = member.user;
            await prisma.notification.create({
              data: {
                userId: user.id,
                elderlyProfileId: profile.id,
                type: "MISSED_DOSE_ALERT",
                title: `Unconfirmed Dose: ${med.name} (${med.strength})`,
                message: `The scheduled dose for ${profile.name} at ${new Date(
                  dose.scheduledAt
                ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} was not confirmed within the ${dose.gracePeriodMinutes}-minute grace window.`,
                data: { doseId: dose.id, medicationId: med.id },
              },
            });

            if (user.notificationPref?.missedDoseAlerts) {
              await sendMissedDoseAlertEmail({
                to: user.email,
                seniorName: profile.name,
                medicationName: med.name,
                strength: med.strength,
                scheduledTime: new Date(dose.scheduledAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                gracePeriodMinutes: dose.gracePeriodMinutes,
              });
            }
          }
        }

        summary.tier1CaretakerAlerts++;
      }
      // TIER 2 ESCALATION: 30 minutes after Tier 1 alert without confirmation -> Escalate to Family
      else if (dose.escalationLevel === 1 && dose.escalatedAt) {
        const timeSinceTier1Ms = now.getTime() - new Date(dose.escalatedAt).getTime();
        const tier2ThresholdMs = 30 * 60 * 1000; // 30 minutes

        if (timeSinceTier1Ms >= tier2ThresholdMs) {
          await prisma.$transaction(async (tx) => {
            await tx.scheduledDose.update({
              where: { id: dose.id },
              data: {
                status: "MISSED",
                escalationLevel: 2,
                escalatedAt: now,
              },
            });

            await tx.auditLog.create({
              data: {
                elderlyProfileId: profile.id,
                careCircleId: primaryCircle?.id,
                action: "DOSE_ESCALATED_TIER_2_FAMILY",
                entityType: "ScheduledDose",
                entityId: dose.id,
                details: {
                  medication: med.name,
                  scheduledAt: dose.scheduledAt,
                  stage: "FAMILY_URGENT_ESCALATION",
                  durationWithoutConfirmationMinutes: Math.round(
                    (now.getTime() - scheduledTime) / 60000
                  ),
                },
              },
            });
          });

          // Notify ALL Family Members and Circle Admins
          if (primaryCircle) {
            const familyMembers = primaryCircle.members.filter(
              (m) =>
                m.role === "ADMIN" ||
                m.role === "FAMILY_MEMBER" ||
                m.permissions.includes("CAN_RECEIVE_ESCALATIONS")
            );

            for (const member of familyMembers) {
              const user = member.user;
              await prisma.notification.create({
                data: {
                  userId: user.id,
                  elderlyProfileId: profile.id,
                  type: "ESCALATION_WARNING",
                  title: `🚨 Urgent: Missed Dose for ${profile.name}`,
                  message: `${profile.name} has missed taking ${med.name} (${med.strength}). Caretaker notice was unconfirmed. Please check on them immediately.`,
                  data: {
                    doseId: dose.id,
                    medicationId: med.id,
                    emergencyPhone: profile.emergencyContactPhone,
                  },
                },
              });

              if (user.notificationPref?.escalationAlerts) {
                await sendCaregiverEscalationEmail({
                  to: user.email,
                  seniorName: profile.name,
                  medicationName: med.name,
                  strength: med.strength,
                  scheduledTime: new Date(dose.scheduledAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  emergencyPhone: profile.emergencyContactPhone,
                });
              }
            }
          }

          summary.tier2FamilyEscalations++;
        }
      }
    }
  } catch (err: any) {
    console.error("[CareNest Escalation] Runner failed:", err);
    summary.errors.push(err.message || String(err));
  }

  return summary;
}
