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

    // Check if account already exists and is already verified
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser && existingUser.isEmailVerified) {
      return NextResponse.json(
        {
          error: "An account with this email address is already verified. Please sign in instead.",
        },
        { status: 409 }
      );
    }

    // Request and dispatch OTP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;
    const result = await requestEmailOtp(
      normalizedEmail,
      name || existingUser?.name || "Care Member",
      ip
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "We could not send the email. Please try again.",
          cooldownSeconds: result.cooldownSeconds,
        },
        { status: result.cooldownSeconds ? 429 : 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message || `Verification code sent to ${normalizedEmail}.`,
        devNotice: result.devNotice,
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
