import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmailOtp } from "@/lib/otp";

const VerifyOtpSchema = z.object({
  email: z.string().email("A valid email address is required"),
  otp: z.string().min(6, "Code must be 6 digits").max(6, "Code must be 6 digits"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = VerifyOtpSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { email, otp } = validated.data;
    const result = await verifyEmailOtp(email, otp);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || "Verification failed.",
          attemptsRemaining: result.attemptsRemaining,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: result.message || "Email address verified successfully.",
        verificationToken: result.verificationToken,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[OTP Verify API Error]:", error);
    return NextResponse.json(
      { error: "Internal server error while verifying code" },
      { status: 500 }
    );
  }
}
