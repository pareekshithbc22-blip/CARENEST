import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requestEmailOtp } from "@/lib/otp";

const SendOtpSchema = z.object({
  email: z.string().email("A valid email address is required"),
  name: z.string().optional(),
  role: z.enum(["SENIOR", "FAMILY", "CARETAKER", "ADMIN"]).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = SendOtpSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { email, name } = validated.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if account already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "An account with this email address already exists. Please sign in instead.",
        },
        { status: 409 }
      );
    }

    // Request and dispatch OTP
    const result = await requestEmailOtp(normalizedEmail, name || "Family Administrator");

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Failed to send verification code.",
          cooldownSeconds: result.cooldownSeconds,
        },
        { status: result.cooldownSeconds ? 429 : 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message,
        cooldownSeconds: result.cooldownSeconds ?? 60,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[OTP Send API Error]:", error);
    return NextResponse.json(
      { error: "Internal server error while sending verification code" },
      { status: 500 }
    );
  }
}
