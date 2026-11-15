import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegisterSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = RegisterSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, name, role, phoneNumber } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name,
          role,
          phoneNumber,
        },
      });

      // Default notification preferences
      await tx.notificationPreference.create({
        data: {
          userId: newUser.id,
          emailReminders: true,
          missedDoseAlerts: true,
          escalationAlerts: true,
          appointmentReminders: true,
          dailySummaryEmail: role === "FAMILY",
          gracePeriodMinutes: 45,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: "USER_REGISTERED",
          entityType: "User",
          entityId: newUser.id,
          details: { role, email: normalizedEmail },
        },
      });

      return newUser;
    });

    return NextResponse.json(
      {
        message: "Account registered successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[Register API Error]:", err);
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 }
    );
  }
}
