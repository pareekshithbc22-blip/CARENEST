import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: profileId } = await params;

    const profile = await prisma.caretakerProfile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Access Control: Only Platform Admins or the Caretaker owner can access this document
    const isOwner = profile.userId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Access denied. Only CARENEST administrators and the document owner can view this credential." },
        { status: 403 }
      );
    }

    // Resolve secure file path and prevent directory traversal
    const baseSecureDir = path.resolve(process.cwd(), "storage", "secure_documents");
    const targetFilePath = path.resolve(process.cwd(), profile.documentFilePath);

    if (!targetFilePath.startsWith(baseSecureDir)) {
      return NextResponse.json(
        { error: "Security violation: Invalid storage path reference" },
        { status: 403 }
      );
    }

    if (!fs.existsSync(targetFilePath)) {
      return NextResponse.json({ error: "Document file missing from secure storage" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(targetFilePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": profile.documentMimeType || "application/pdf",
        "Content-Disposition": `inline; filename="${profile.documentFileName}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[Caretaker Document Fetch Error]:", error);
    return NextResponse.json(
      { error: "Internal server error while retrieving document" },
      { status: 500 }
    );
  }
}
