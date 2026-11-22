import { prisma } from "../prisma";
import { DOSE_GRACE_MINUTES } from "../config";
import { sendMissedDoseAlertEmail } from "../email/service";

export interface EscalationRunSummary {
  processedDoses: number;
  missedDosesMarked: number;
  notificationsCreated: number;
  forgotToAssignAlerts: number;
  errors: string[];
}

/**
 * CareNest Background Missed-Dose and Care Schedule Escalation Engine
 * Atomic row claiming, deduplicated notifications, and idempotent batch processing.
 */
export async function processDoseEscalations(): Promise<EscalationRunSummary> {
  const summary: EscalationRunSummary = {
    processedDoses: 0,
    missedDosesMarked: 0,
    notificationsCreated: 0,
    forgotToAssignAlerts: 0,
    errors: [],
  };

  const now = new Date();
  const graceWindowMs = DOSE_GRACE_MINUTES * 60 * 1000;
  const overdueCutoff = new Date(now.getTime() - graceWindowMs);

  try {
    // -------------------------------------------------------------
    // PART 1: MISSED DOSE DETECTION & ATOMIC CLAIMING
    // -------------------------------------------------------------
    // Find doses still in SCHEDULED status whose scheduledAt + 15 min grace window has passed
    const candidateDoses = await prisma.scheduledDose.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: overdueCutoff },
        confirmedAt: null,
      },
      include: {
        medication: {
          select: {
            id: true,
            name: true,
            strength: true,
            form: true,
          },
        },
        elderlyProfile: {
          select: {
            id: true,
            name: true,
            createdById: true,
            careCircles: {
              take: 1,
              include: {
                members: {
                  where: { isActive: true },
                  include: { user: true },
                },
              },
            },
          },
        },
      },
      take: 50,
      orderBy: { scheduledAt: "asc" },
    });

    summary.processedDoses = candidateDoses.length;

    for (const dose of candidateDoses) {
      try {
        // Atomic row claim: Transition from SCHEDULED -> MISSED
        const updateResult = await prisma.scheduledDose.updateMany({
          where: {
            id: dose.id,
            status: "SCHEDULED",
          },
          data: {
            status: "MISSED",
            escalationLevel: 1,
            escalatedAt: now,
          },
        });

        // If another concurrent scheduler invocation claimed it, skip
        if (updateResult.count === 0) {
          continue;
        }

        summary.missedDosesMarked++;
        const profile = dose.elderlyProfile;
        const med = dose.medication;

        // Find assigned Caretakers & Family Admins
        const primaryCircle = profile.careCircles[0];
        const recipientsMap = new Map<string, { id: string; email: string; name: string; role: string }>();

        if (primaryCircle) {
          for (const member of primaryCircle.members) {
            if (member.role === "CARETAKER" || member.role === "ADMIN" || member.role === "FAMILY_MEMBER") {
              recipientsMap.set(member.user.id, member.user);
            }
          }
        }

        // Also include approved PatientAccessRequest caretakers & family admins
        const accessRequests = await prisma.patientAccessRequest.findMany({
          where: {
            elderlyProfileId: profile.id,
            status: "APPROVED",
          },
          include: {
            caretaker: true,
            familyAdmin: true,
          },
        });

        for (const req of accessRequests) {
          if (req.caretaker) recipientsMap.set(req.caretaker.id, req.caretaker);
          if (req.familyAdmin) recipientsMap.set(req.familyAdmin.id, req.familyAdmin);
        }

        // Also ensure profile creator is included
        if (profile.createdById && !recipientsMap.has(profile.createdById)) {
          const creator = await prisma.user.findUnique({ where: { id: profile.createdById } });
          if (creator) recipientsMap.set(creator.id, creator);
        }

        // Check 30-minute email rate limit for missed dose
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
        const recentMissedEmailCount = await prisma.notification.count({
          where: {
            elderlyProfileId: profile.id,
            type: "MISSED_DOSE_ALERT",
            emailSent: true,
            createdAt: { gte: thirtyMinutesAgo },
          },
        });
        const canSendEmail = recentMissedEmailCount === 0;

        const scheduledTimeStr = new Date(dose.scheduledAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        for (const recipient of recipientsMap.values()) {
          const dedupKey = `missed-dose-${dose.id}-${recipient.id}`;
          let emailSentStatus = false;

          if (canSendEmail) {
            try {
              await sendMissedDoseAlertEmail({
                to: recipient.email,
                seniorName: profile.name,
                medicationName: med.name,
                strength: med.strength,
                scheduledTime: scheduledTimeStr,
                gracePeriodMinutes: DOSE_GRACE_MINUTES,
              });
              emailSentStatus = true;
            } catch (mailErr) {
              console.error("[Missed Dose Email Dispatch Error]:", mailErr);
            }
          }

          try {
            await prisma.notification.upsert({
              where: { dedupKey },
              create: {
                userId: recipient.id,
                elderlyProfileId: profile.id,
                type: "MISSED_DOSE_ALERT",
                title: `🚨 Missed Dose: ${med.name} (${med.strength})`,
                message: `${profile.name} did not confirm or skip their scheduled dose at ${scheduledTimeStr} within the ${DOSE_GRACE_MINUTES}-minute grace period.`,
                dedupKey,
                emailSent: emailSentStatus,
                data: {
                  doseId: dose.id,
                  medicationId: med.id,
                  scheduledAt: dose.scheduledAt.toISOString(),
                },
              },
              update: {},
            });
            summary.notificationsCreated++;
          } catch (notifErr) {
            console.error("[Missed Dose Notification Creation Error]:", notifErr);
          }
        }

        // Record Audit Log
        await prisma.auditLog.create({
          data: {
            elderlyProfileId: profile.id,
            action: "DOSE_MARKED_MISSED",
            entityType: "ScheduledDose",
            entityId: dose.id,
            details: {
              medication: med.name,
              scheduledAt: dose.scheduledAt,
              gracePeriodMinutes: DOSE_GRACE_MINUTES,
            },
          },
        });
      } catch (doseErr: any) {
        summary.errors.push(`Dose ${dose.id}: ${doseErr.message}`);
      }
    }

    // -------------------------------------------------------------
    // PART 2: CARETAKER "FORGOT TO ASSIGN" DAILY CHECK
    // -------------------------------------------------------------
    // Check if an assigned patient has 0 active medications/tasks or a medication has no schedule times
    const activeProfiles = await prisma.elderlyProfile.findMany({
      include: {
        medications: {
          where: { isArchived: false },
          include: {
            schedules: { where: { isActive: true } },
          },
        },
        careTasks: {
          where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
        },
        careCircles: {
          take: 1,
          include: {
            members: {
              where: { role: "CARETAKER", isActive: true },
              include: { user: true },
            },
          },
        },
        caretakerAccessRequests: {
          where: { status: "APPROVED" },
          include: { caretaker: true },
        },
      },
    });

    const todayDateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    for (const patient of activeProfiles) {
      // Find assigned caretakers
      const assignedCaretakers = new Map<string, { id: string; name: string }>();
      const circleCaretakers = patient.careCircles[0]?.members || [];
      for (const cm of circleCaretakers) {
        assignedCaretakers.set(cm.user.id, cm.user);
      }
      for (const req of patient.caretakerAccessRequests) {
        if (req.caretaker) {
          assignedCaretakers.set(req.caretaker.id, req.caretaker);
        }
      }

      if (assignedCaretakers.size === 0) {
        continue;
      }

      const activeMeds = patient.medications;
      const activeTasks = patient.careTasks;
      const hasMedWithoutTimes = activeMeds.some(
        (m) => m.schedules.length === 0 || m.schedules.every((s) => s.timesOfDay.length === 0)
      );

      const isMissingPlan = (activeMeds.length === 0 && activeTasks.length === 0) || hasMedWithoutTimes;

      if (isMissingPlan) {
        const warningReason = activeMeds.length === 0 && activeTasks.length === 0
          ? `${patient.name} has no active medications or care tasks assigned.`
          : `${patient.name} has medications assigned without scheduled intake times.`;

        for (const caretaker of assignedCaretakers.values()) {
          const dedupKey = `forgot-to-assign-${patient.id}-${caretaker.id}-${todayDateStr}`;

          try {
            await prisma.notification.upsert({
              where: { dedupKey },
              create: {
                userId: caretaker.id,
                elderlyProfileId: patient.id,
                type: "CARE_TASK_ASSIGNED",
                title: `Care Plan Incomplete: ${patient.name}`,
                message: `${warningReason} Please set up their medication schedule or daily tasks.`,
                dedupKey,
                data: {
                  patientId: patient.id,
                  action: "ASSIGN_MEDICATION",
                  link: `/dashboard/caretaker?patientId=${patient.id}&tab=medications`,
                },
              },
              update: {},
            });
            summary.forgotToAssignAlerts++;
          } catch (assignErr) {
            console.error("[Forgot To Assign Notification Error]:", assignErr);
          }
        }
      }
    }
  } catch (err: any) {
    console.error("[Process Escalations Error]:", err);
    summary.errors.push(err.message);
  }

  return summary;
}
