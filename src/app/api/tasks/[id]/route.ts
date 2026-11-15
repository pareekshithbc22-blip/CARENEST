import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

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

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.careTask.update({
        where: { id },
        data: {
          status: body.status ?? task.status,
          notes: body.notes !== undefined ? body.notes : task.notes,
          completedAt: isCompleting ? new Date() : (body.status === "PENDING" ? null : task.completedAt),
          completedById: isCompleting ? user.id : (body.status === "PENDING" ? null : task.completedById),
        },
        include: {
          assignedTo: { select: { id: true, name: true, role: true } },
          completedBy: { select: { id: true, name: true, role: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          elderlyProfileId: task.elderlyProfileId,
          userId: user.id,
          action: isCompleting ? "CARE_TASK_COMPLETED" : "CARE_TASK_UPDATED",
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
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
