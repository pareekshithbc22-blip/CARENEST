import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyProfileAccess } from "@/lib/permissions";
import { CareNoteCreateSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get("profileId");

  if (!profileId) {
    return NextResponse.json({ error: "profileId is required" }, { status: 400 });
  }

  const access = await verifyProfileAccess(user.id, profileId, "CAN_VIEW_RECORDS");
  if (!access.authorized) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const notes = await prisma.careNote.findMany({
      where: { elderlyProfileId: profileId },
      include: {
        author: { select: { id: true, name: true, role: true, avatarUrl: true } },
        shiftHandoverTo: { select: { id: true, name: true, role: true } },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ notes });
  } catch (err: any) {
    console.error("[Notes GET Error]:", err);
    return NextResponse.json({ error: "Failed to load care notes" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = CareNoteCreateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const data = validated.data;
    const access = await verifyProfileAccess(user.id, data.elderlyProfileId, "CAN_LOG_CARE_NOTES");
    if (!access.authorized) {
      return NextResponse.json({ error: "Access denied to record care notes" }, { status: 403 });
    }

    const note = await prisma.$transaction(async (tx) => {
      const newNote = await tx.careNote.create({
        data: {
          elderlyProfileId: data.elderlyProfileId,
          authorId: user.id,
          category: data.category,
          title: data.title,
          content: data.content,
          vitalSigns: data.vitalSigns ?? undefined,
          isPinned: data.isPinned,
          shiftHandoverToId: data.shiftHandoverToId || null,
        },
        include: {
          author: { select: { id: true, name: true, role: true, avatarUrl: true } },
          shiftHandoverTo: { select: { id: true, name: true, role: true } },
        },
      });

      // If handover note to someone, send notification
      if (data.shiftHandoverToId && data.shiftHandoverToId !== user.id) {
        await tx.notification.create({
          data: {
            userId: data.shiftHandoverToId,
            elderlyProfileId: data.elderlyProfileId,
            type: "SYSTEM",
            title: `Shift Handover: ${data.title}`,
            message: `${user.name} logged a shift handover note for your attention.`,
            data: { noteId: newNote.id },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          elderlyProfileId: data.elderlyProfileId,
          userId: user.id,
          action: "CARE_NOTE_LOGGED",
          entityType: "CareNote",
          entityId: newNote.id,
          details: { category: newNote.category, title: newNote.title },
        },
      });

      return newNote;
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err: any) {
    console.error("[Note POST Error]:", err);
    return NextResponse.json({ error: "Failed to record care note" }, { status: 500 });
  }
}
