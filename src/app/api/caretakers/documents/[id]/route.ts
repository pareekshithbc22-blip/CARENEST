import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getFileStorage } from "@/lib/verification/storage";

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

    const storage = getFileStorage();

    // If S3, redirect directly to temporary signed URL
    if (profile.documentFilePath.startsWith("s3://")) {
      const signedUrl = await storage.getSignedUrl(profile.documentFilePath, 300);
      return NextResponse.redirect(signedUrl);
    }

    // Local storage
    const fileBuffer = await storage.getFile(profile.documentFilePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": profile.documentMimeType || "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(profile.documentFileName)}"`,
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
