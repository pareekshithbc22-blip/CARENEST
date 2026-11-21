import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CaretakerProfileCreateSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: "You must be signed in to complete profile configuration." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { role, phoneNumber, caretakerProfile } = body;

    if (!role || !["FAMILY", "CARETAKER"].includes(role)) {
      return NextResponse.json(
        { error: "Please select a valid account type: Family Guardian or Licensed Caretaker." },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    if (role === "CARETAKER") {
      const validatedProfile = CaretakerProfileCreateSchema.safeParse(caretakerProfile);
      if (!validatedProfile.success) {
        return NextResponse.json(
          {
            error: "Clinical qualification details and a valid certificate upload are required for Caretaker accounts.",
            details: validatedProfile.error.flatten(),
          },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            role: "CARETAKER",
            phoneNumber: phoneNumber ? String(phoneNumber).trim() : undefined,
          },
        });

        // Upsert caretaker profile in PENDING status
        await tx.caretakerProfile.upsert({
          where: { userId },
          create: {
            userId,
            fullName: validatedProfile.data.fullName.trim(),
            professionalCategory: validatedProfile.data.professionalCategory.trim(),
            qualification: validatedProfile.data.qualification.trim(),
            registrationNumber: validatedProfile.data.registrationNumber?.trim() || null,
            issuingAuthority: validatedProfile.data.issuingAuthority.trim(),
            state: validatedProfile.data.state?.trim() || null,
            documentFileName: validatedProfile.data.documentFileName,
            documentFilePath: validatedProfile.data.documentFilePath,
            documentMimeType: validatedProfile.data.documentMimeType,
            documentFileSize: validatedProfile.data.documentFileSize,
            status: "PENDING",
          },
          update: {
            fullName: validatedProfile.data.fullName.trim(),
            professionalCategory: validatedProfile.data.professionalCategory.trim(),
            qualification: validatedProfile.data.qualification.trim(),
            registrationNumber: validatedProfile.data.registrationNumber?.trim() || null,
            issuingAuthority: validatedProfile.data.issuingAuthority.trim(),
            state: validatedProfile.data.state?.trim() || null,
            documentFileName: validatedProfile.data.documentFileName,
            documentFilePath: validatedProfile.data.documentFilePath,
            documentMimeType: validatedProfile.data.documentMimeType,
            documentFileSize: validatedProfile.data.documentFileSize,
            status: "PENDING",
          },
        });
      });
    } else {
      // Family Guardian role
      await prisma.user.update({
        where: { id: userId },
        data: {
          role: "FAMILY",
          phoneNumber: phoneNumber ? String(phoneNumber).trim() : undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Profile configured successfully.",
      role,
    });
  } catch (error: any) {
    console.error("Complete profile error:", error);
    return NextResponse.json(
      { error: "Failed to complete account profile." },
      { status: 500 }
    );
  }
}
