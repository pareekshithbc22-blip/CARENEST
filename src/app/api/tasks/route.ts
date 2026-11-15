import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { CareTaskCreateSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");

  if (!profileId) {
    // If no profileId provided, fetch all tasks assigned to current caretaker
    const tasks = await prisma.careTask.findMany({
      where: { assignedToId: user.id },
      include: {
        elderlyProfile: { select: { id: true, name: true, preferredName: true, avatarUrl: true } },
        completedBy: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
    });
    return NextResponse.json({ tasks });
  }

  const access = await verifyProfileAccess(user.id, profileId, "CAN_VIEW_RECORDS");
  if (!access.authorized) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const tasks = await prisma.careTask.findMany({
      where: { elderlyProfileId: profileId },
      include: {
        assignedTo: { select: { id: true, name: true, role: true, avatarUrl: true } },
        completedBy: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json({ tasks });
  } catch (err: any) {
    console.error("[Tasks GET Error]:", err);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = CareTaskCreateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const data = validated.data;
    const access = await verifyProfileAccess(user.id, data.elderlyProfileId, "CAN_VIEW_RECORDS");
    if (!access.authorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const task = await prisma.$transaction(async (tx) => {
      const newTask = await tx.careTask.create({
        data: {
          elderlyProfileId: data.elderlyProfileId,
          assignedToId: data.assignedToId || null,
          title: data.title,
          description: data.description,
          dueDate: new Date(data.dueDate),
          priority: data.priority,
          status: "PENDING",
        },
        include: {
          assignedTo: { select: { id: true, name: true, role: true } },
        },
      });

      // Notification if assigned to someone else
      if (data.assignedToId && data.assignedToId !== user.id) {
        await tx.notification.create({
          data: {
            userId: data.assignedToId,
            elderlyProfileId: data.elderlyProfileId,
            type: "CARE_TASK_ASSIGNED",
            title: `New Care Task: ${data.title}`,
            message: `You have been assigned a new task: ${data.title} (Priority: ${data.priority}).`,
            data: { taskId: newTask.id },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          elderlyProfileId: data.elderlyProfileId,
          userId: user.id,
          action: "CARE_TASK_CREATED",
          entityType: "CareTask",
          entityId: newTask.id,
          details: { title: newTask.title, priority: newTask.priority },
        },
      });

      return newTask;
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err: any) {
    console.error("[Task POST Error]:", err);
    return NextResponse.json({ error: "Failed to create care task" }, { status: 500 });
  }
}
