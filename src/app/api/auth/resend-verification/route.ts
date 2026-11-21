import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAccountVerificationEmail } from "@/lib/email-verification";

// In-memory rate limiting to prevent spamming resend requests
const resendRateLimitMap = new Map<string, number>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check 60s cooldown
    const lastSent = resendRateLimitMap.get(normalizedEmail);
    const now = Date.now();
    if (lastSent && now - lastSent < 60 * 1000) {
      const waitSeconds = Math.ceil((60 * 1000 - (now - lastSent)) / 1000);
      return NextResponse.json(
        {
          error: `Please wait ${waitSeconds} seconds before requesting another verification email.`,
          cooldownSeconds: waitSeconds,
        },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Safe response to prevent account enumeration
      return NextResponse.json({
        success: true,
        message: "If an account with this email exists, a verification link has been sent.",
      });
    }

    if (user.isEmailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: "This email address is already verified. You can sign in immediately.",
      });
    }

    resendRateLimitMap.set(normalizedEmail, now);

    let emailResult: any = { success: false, diagnosticCode: "EMAIL_NOT_CONFIGURED" };
    try {
      emailResult = await sendAccountVerificationEmail(user.email, user.name);
    } catch (err: any) {
      console.error("[Resend Email Dispatch Error]:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Verification link sent. Please check your inbox and spam folder.",
      emailDelivery: {
        success: Boolean(emailResult.success),
        provider: emailResult.provider || "NONE",
        diagnosticCode: emailResult.diagnosticCode || "EMAIL_NOT_CONFIGURED",
        error: emailResult.error,
      },
    });
  } catch (error: any) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch verification email." },
      { status: 500 }
    );
  }
}
