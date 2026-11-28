import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { completeTaskBySenior } from "@/lib/services/task-service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const task = await prisma.careTask.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const access = await verifyProfileAccess(user.id, task.elderlyProfileId, "CAN_VIEW_RECORDS");
  if (!access.authorized) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const isCompleting = body.status === "COMPLETED";

    // F9: Task completion belongs to Senior only
    if (isCompleting) {
      if (user.role !== "SENIOR") {
        return NextResponse.json(
          { error: "Task completion is restricted to Senior Patients only. Caretakers and Family Administrators have read-only access." },
          { status: 403 }
        );
      }

      const result = await completeTaskBySenior(user.id, user.role, id, body.targetDateStr);
      return NextResponse.json({ task: result.task, completion: result.completion });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.careTask.update({
        where: { id },
        data: {
          status: body.status ?? task.status,
          notes: body.notes !== undefined ? body.notes : task.notes,
        },
        include: {
          assignedTo: { select: { id: true, name: true, role: true } },
          assignedBy: { select: { id: true, name: true, role: true } },
          completedBy: { select: { id: true, name: true, role: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          elderlyProfileId: task.elderlyProfileId,
          userId: user.id,
          action: "CARE_TASK_UPDATED",
          entityType: "CareTask",
          entityId: id,
          details: { status: res.status, title: res.title },
        },
      });

      return res;
    });

    return NextResponse.json({ task: updated });
  } catch (err: any) {
    console.error("[Task PATCH Error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update task" },
      { status: err.statusCode || 500 }
    );
  }
}
