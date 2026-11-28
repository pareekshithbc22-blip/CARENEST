import { prisma } from "@/lib/prisma";
import { deriveTaskStatusForDay } from "@/lib/domain/task-status";

export interface CreateDailyTaskInput {
  elderlyProfileId: string;
  taskType: string;
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  startDate: string; // YYYY-MM-DD
  durationDays?: number | null;
  untilStopped?: boolean;
  timesOfDay?: string[];
  details?: any;
}

export async function createDailyTask(
  caretakerUserId: string,
  input: CreateDailyTaskInput
) {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error("Task title is required.");
  }
  if (!input.taskType) {
    throw new Error("Task type is required.");
  }

  const now = new Date();
  const start = new Date(input.startDate || now.toISOString().split("T")[0]);
  const duration = input.durationDays && input.durationDays > 0 ? input.durationDays : null;
  const untilStopped = input.untilStopped ?? (duration === null);
  const end = duration ? new Date(start.getTime() + duration * 86400000) : null;

  return await prisma.$transaction(async (tx) => {
    // 1. Verify caretaker access
    const patient = await tx.elderlyProfile.findUnique({
      where: { id: input.elderlyProfileId },
      include: { createdBy: true },
    });

    if (!patient) {
      throw new Error("Patient record not found.");
    }

    const membership = await tx.careCircleMember.findFirst({
      where: {
        careCircle: { elderlyProfileId: input.elderlyProfileId },
        userId: caretakerUserId,
        role: "CARETAKER",
        isActive: true,
      },
    });

    if (!membership) {
      throw new Error("You are not an authorized caretaker for this patient.");
    }

    // 2. Create CareTask
    const task = await tx.careTask.create({
      data: {
        elderlyProfileId: input.elderlyProfileId,
        title: input.title.trim(),
        description: input.description || null,
        taskType: input.taskType,
        priority: input.priority || "MEDIUM",
        startDate: start,
        endDate: end,
        untilStopped,
        timesOfDay: input.timesOfDay || [],
        details: input.details || null,
        dueDate: start,
        assignedById: caretakerUserId,
        assignedAt: now,
        status: "PENDING",
      },
    });

    // 3. Notify Family Administrator
    const caretaker = await tx.user.findUnique({
      where: { id: caretakerUserId },
      include: { caretakerProfile: true },
    });
    const cName = caretaker?.caretakerProfile?.fullName || caretaker?.name || "Caretaker";

    await tx.notification.create({
      data: {
        userId: patient.createdById,
        elderlyProfileId: patient.id,
        type: "CARE_TASK_ASSIGNED",
        title: "Daily Task Assigned",
        message: `${cName} assigned daily task "${task.title}" for ${patient.name}.`,
        dedupKey: `task-new-${task.id}`,
        data: {
          taskId: task.id,
          taskType: task.taskType,
          title: task.title,
        },
      },
    });

    return task;
  });
}

export async function completeTaskBySenior(
  seniorUserId: string,
  userRole: string,
  taskId: string,
  targetDateStr?: string
) {
  // Enforce server-side authorization: Senior patient login ONLY
  if (userRole !== "SENIOR") {
    const error: any = new Error("Task completion is restricted to Senior Patients only. Caretakers and Family Administrators have read-only access.");
    error.statusCode = 403;
    throw error;
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const completionDateStr = targetDateStr || todayStr;

  // Senior can only complete today's instance
  if (completionDateStr !== todayStr) {
    const error: any = new Error("Senior patient can only complete today's task instance.");
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const task = await tx.careTask.findUnique({
      where: { id: taskId },
      include: {
        elderlyProfile: {
          include: {
            careCircles: {
              include: {
                members: {
                  where: { isActive: true },
                  include: { user: true },
                },
              },
            },
            createdBy: true,
          },
        },
      },
    });

    if (!task) {
      const error: any = new Error("Task record not found.");
      error.statusCode = 404;
      throw error;
    }

    const seniorUser = await tx.user.findUnique({ where: { id: seniorUserId } });
    const seniorName = seniorUser?.name || task.elderlyProfile.name;

    // 1. Record / upsert daily task completion
    const completion = await tx.dailyTaskCompletion.upsert({
      where: {
        taskId_localDate: {
          taskId,
          localDate: completionDateStr,
        },
      },
      update: {
        completedAt: now,
        completedByUserId: seniorUserId,
      },
      create: {
        taskId,
        localDate: completionDateStr,
        completedAt: now,
        completedByUserId: seniorUserId,
      },
    });

    // 2. Update task status
    const updatedTask = await tx.careTask.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        completedAt: now,
        completedById: seniorUserId,
      },
    });

    // 3. Notify Caretaker and Family Administrator
    const notifMessage = `${seniorName} completed ${task.title}`;
    const patientId = task.elderlyProfileId;

    // Notify Family Administrator
    await tx.notification.create({
      data: {
        userId: task.elderlyProfile.createdById,
        elderlyProfileId: patientId,
        type: "SYSTEM",
        title: "Task Completed",
        message: notifMessage,
        dedupKey: `notif-task-f-${taskId}-${completionDateStr}`,
        data: { taskId, date: completionDateStr },
      },
    });

    // Notify Caretaker(s) in the care circle
    const caretakers = task.elderlyProfile.careCircles.flatMap((c) =>
      c.members.filter((m) => m.role === "CARETAKER")
    );

    for (const cm of caretakers) {
      await tx.notification.create({
        data: {
          userId: cm.userId,
          elderlyProfileId: patientId,
          type: "SYSTEM",
          title: "Task Completed",
          message: notifMessage,
          dedupKey: `notif-task-c-${cm.userId}-${taskId}-${completionDateStr}`,
          data: { taskId, date: completionDateStr },
        },
      });
    }

    return { success: true, task: updatedTask, completion };
  });
}

export async function getPatientTasksWithHistory(patientId: string, referenceDate?: Date) {
  const ref = referenceDate || new Date();
  const todayStr = ref.toISOString().split("T")[0];

  const tasks = await prisma.careTask.findMany({
    where: { elderlyProfileId: patientId },
    include: {
      completions: {
        orderBy: { localDate: "desc" },
        take: 14,
        include: { completedByUser: { select: { id: true, name: true } } },
      },
      assignedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const last7Days: string[] = [];
  for (let i = 0; i <= 7; i++) {
    const d = new Date(ref);
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split("T")[0]);
  }

  return tasks.map((t) => {
    const todayComp = t.completions.find((c) => c.localDate === todayStr);
    const todayStatus = deriveTaskStatusForDay(
      t,
      todayStr,
      todayStr,
      todayComp
        ? {
            completed: true,
            completedAt: todayComp.completedAt,
            completedByName: todayComp.completedByUser?.name,
            completedById: todayComp.completedByUserId,
          }
        : null
    );

    const history = last7Days.map((dStr) => {
      const dObj = new Date(dStr + "T00:00:00");
      const dateFormatted = dObj.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      const comp = t.completions.find((c) => c.localDate === dStr);
      const st = deriveTaskStatusForDay(
        t,
        dStr,
        todayStr,
        comp
          ? {
              completed: true,
              completedAt: comp.completedAt,
              completedByName: comp.completedByUser?.name,
              completedById: comp.completedByUserId,
            }
          : null
      );
      return {
        date: dStr,
        dateFormatted,
        status: st.status,
        label: st.label,
        completedAt: st.completedAt,
        completedByName: st.completedByName,
      };
    });

    return {
      ...t,
      isCompleted: todayStatus.status === "COMPLETED",
      completedAt: todayStatus.completedAt || t.completedAt,
      completedByName: todayStatus.completedByName,
      todayStatusLabel: todayStatus.label,
      history,
    };
  });
}
