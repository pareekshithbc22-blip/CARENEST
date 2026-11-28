import { prisma } from "@/lib/prisma";

export async function getUnreadTabsForUser(
  userId: string,
  elderlyProfileId: string
): Promise<{ tasks: boolean; medications: boolean; notes: boolean }> {
  const markers = await prisma.unreadMarker.findMany({
    where: {
      userId,
      elderlyProfileId,
    },
  });

  const markerMap: Record<string, Date> = {};
  markers.forEach((m) => {
    markerMap[m.tab] = m.lastSeenAt;
  });

  // Check latest tasks updated by caretaker
  const latestTask = await prisma.careTask.findFirst({
    where: {
      elderlyProfileId,
      assignedById: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  // Check latest medications assigned by caretaker
  const latestMed = await prisma.medication.findFirst({
    where: {
      elderlyProfileId,
      assignedById: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  // Check latest care notes from caretaker
  const latestNote = await prisma.careNote.findFirst({
    where: {
      elderlyProfileId,
      category: "HEALTH_UPDATE",
    },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  const tasksUnread = Boolean(
    latestTask && (!markerMap["tasks"] || latestTask.updatedAt > markerMap["tasks"])
  );
  const medsUnread = Boolean(
    latestMed && (!markerMap["medications"] || latestMed.updatedAt > markerMap["medications"])
  );
  const notesUnread = Boolean(
    latestNote && (!markerMap["notes"] || latestNote.updatedAt > markerMap["notes"])
  );

  return {
    tasks: tasksUnread,
    medications: medsUnread,
    notes: notesUnread,
  };
}

export async function markTabAsRead(
  userId: string,
  elderlyProfileId: string,
  tab: "tasks" | "medications" | "notes"
) {
  const now = new Date();
  return await prisma.unreadMarker.upsert({
    where: {
      userId_elderlyProfileId_tab: {
        userId,
        elderlyProfileId,
        tab,
      },
    },
    update: {
      lastSeenAt: now,
    },
    create: {
      userId,
      elderlyProfileId,
      tab,
      lastSeenAt: now,
    },
  });
}
