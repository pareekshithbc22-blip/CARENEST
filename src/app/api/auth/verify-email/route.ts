import { NextResponse } from "next/server";
import { verifyEmailToken, generateEmailLoginExchangeToken } from "@/lib/email-verification";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Verification token is required." },
        { status: 400 }
      );
    }

    const result = await verifyEmailToken(token);

    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.error || "Failed to verify email address." },
        { status: 400 }
      );
    }

    // Generate single-use exchange token for instantaneous auto-login in CredentialsProvider
    const verificationExchangeToken = generateEmailLoginExchangeToken(
      result.user.id,
      result.user.email
    );

    return NextResponse.json({
      success: true,
      message: "Email address verified successfully.",
      verificationExchangeToken,
      user: result.user,
    });
  } catch (error: any) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Internal server error during email verification." },
      { status: 500 }
    );
  }
}
