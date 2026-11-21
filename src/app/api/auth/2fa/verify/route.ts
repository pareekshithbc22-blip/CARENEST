import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  decryptSecret,
  verifyTotp,
  checkTwoFactorRateLimit,
  recordFailedTwoFactorAttempt,
  resetTwoFactorRateLimit,
  verifyAndConsumeRecoveryCode,
} from "@/lib/totp";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized session" }, { status: 401 });
    }

    // Rate-limiting check
    const rateStatus = checkTwoFactorRateLimit(user.id);
    if (rateStatus.locked) {
      return NextResponse.json(
        {
          error: `Too many failed 2FA attempts. For your security, this account is temporarily locked. Please try again in ${rateStatus.remainingMinutes || 5} minutes.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const isRecoveryCode = Boolean(body.isRecoveryCode);

    if (!code) {
      return NextResponse.json(
        { error: "Verification code is required." },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        role: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorRecoveryCodes: true,
      },
    });

    if (!dbUser || !dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
      return NextResponse.json(
        { error: "Two-factor authentication is not active on this account." },
        { status: 400 }
      );
    }

    if (isRecoveryCode) {
      // Validate emergency recovery code
      const { valid, remainingHashes } = verifyAndConsumeRecoveryCode(
        code,
        dbUser.twoFactorRecoveryCodes
      );

      if (!valid) {
        const attemptResult = recordFailedTwoFactorAttempt(user.id);
        const attemptsLeft = attemptResult.attemptsRemaining;
        return NextResponse.json(
          {
            error: `Invalid recovery code. ${attemptsLeft} ${attemptsLeft === 1 ? "attempt" : "attempts"} remaining before temporary lockout.`,
            attemptsRemaining: attemptsLeft,
          },
          { status: 400 }
        );
      }

      // Update remaining recovery codes in database
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorRecoveryCodes: remainingHashes },
      });

      resetTwoFactorRateLimit(user.id);

      return NextResponse.json({
        success: true,
        usedRecoveryCode: true,
        recoveryCodesRemaining: remainingHashes.length,
        message: "Recovery code accepted. Session verified.",
      });
    }

    // Standard 6-digit TOTP validation
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Authenticator code must be exactly 6 digits." },
        { status: 400 }
      );
    }

    const plainSecret = decryptSecret(dbUser.twoFactorSecret);
    const isValid = verifyTotp(plainSecret, code, 1);

    if (!isValid) {
      const attemptResult = recordFailedTwoFactorAttempt(user.id);
      const attemptsLeft = attemptResult.attemptsRemaining;
      return NextResponse.json(
        {
          error: `Incorrect 6-digit code. ${attemptsLeft} ${attemptsLeft === 1 ? "attempt" : "attempts"} remaining before temporary lockout.`,
          attemptsRemaining: attemptsLeft,
        },
        { status: 400 }
      );
    }

    // Verification succeeded
    resetTwoFactorRateLimit(user.id);

    return NextResponse.json({
      success: true,
      message: "Two-factor verification successful.",
    });
  } catch (error: any) {
    console.error("[2FA Verify POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error during 2FA verification" },
      { status: 500 }
    );
  }
}
