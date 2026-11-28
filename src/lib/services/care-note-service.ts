import { prisma } from "@/lib/prisma";

export interface PublishCareNoteInput {
  elderlyProfileId: string;
  overallCondition: "STABLE" | "IMPROVING" | "NEEDS_ATTENTION" | "CRITICAL" | "Stable" | "Improving" | "Needs attention" | "Critical";
  observations: string;
  quickFields?: {
    appetite?: string;
    mood?: string;
    sleepQuality?: string;
    painLevel?: number;
    mobility?: string;
  };
}

export async function publishCareNote(
  authorUserId: string,
  input: PublishCareNoteInput
) {
  if (!input.overallCondition) {
    throw new Error("Overall condition is required.");
  }
  if (!input.observations || input.observations.trim().length === 0) {
    throw new Error("Clinical observations are required.");
  }

  // Normalize condition
  const condMap: Record<string, string> = {
    STABLE: "Stable",
    IMPROVING: "Improving",
    NEEDS_ATTENTION: "Needs attention",
    CRITICAL: "Critical",
    Stable: "Stable",
    Improving: "Improving",
    "Needs attention": "Needs attention",
    Critical: "Critical",
  };
  const normalizedCondition = condMap[input.overallCondition] || "Stable";

  return await prisma.$transaction(async (tx) => {
    const patient = await tx.elderlyProfile.findUnique({
      where: { id: input.elderlyProfileId },
      include: { createdBy: true },
    });

    if (!patient) {
      throw new Error("Patient profile not found.");
    }

    const author = await tx.user.findUnique({
      where: { id: authorUserId },
      include: { caretakerProfile: true },
    });

    const note = await tx.careNote.create({
      data: {
        elderlyProfileId: input.elderlyProfileId,
        authorId: authorUserId,
        category: "HEALTH_UPDATE",
        title: `Condition Update: ${normalizedCondition}`,
        content: input.observations.trim(),
        condition: normalizedCondition,
        observations: input.observations.trim(),
        appetite: input.quickFields?.appetite || null,
        mood: input.quickFields?.mood || null,
        sleepQuality: input.quickFields?.sleepQuality || null,
        painLevel: input.quickFields?.painLevel !== undefined ? input.quickFields.painLevel : null,
        mobility: input.quickFields?.mobility || null,
      },
    });

    // Notify Family Administrator
    const authorName = author?.caretakerProfile?.fullName || author?.name || "Caretaker";
    await tx.notification.create({
      data: {
        userId: patient.createdById,
        elderlyProfileId: patient.id,
        type: "SYSTEM",
        title: "Care Note & Condition Update",
        message: `${authorName} published care note for ${patient.name}: ${normalizedCondition}.`,
        dedupKey: `note-new-${note.id}`,
        data: {
          noteId: note.id,
          condition: normalizedCondition,
          observations: input.observations,
        },
      },
    });

    return note;
  });
}
