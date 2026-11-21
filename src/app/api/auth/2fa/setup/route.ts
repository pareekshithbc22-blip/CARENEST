import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  generateTotpSetup,
  encryptSecret,
  decryptSecret,
  verifyTotp,
  generateRecoveryCodes,
} from "@/lib/totp";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate fresh TOTP secret & QR code
    const setup = await generateTotpSetup(dbUser.email);
    const { plaintextCodes, hashedCodes } = generateRecoveryCodes(8);

    // Temporarily save encrypted pending secret and pending recovery hashes
    const encryptedSecret = encryptSecret(setup.secret);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorPendingSecret: encryptedSecret,
        twoFactorRecoveryCodes: hashedCodes,
      },
    });

    return NextResponse.json({
      secret: setup.secret,
      qrCodeDataUrl: setup.qrCodeDataUrl,
      otpauthUrl: setup.otpauthUrl,
      recoveryCodes: plaintextCodes,
    });
  } catch (error: any) {
    console.error("[2FA Setup GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error while initializing 2FA setup" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit verification code from your authenticator application." },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { twoFactorPendingSecret: true, twoFactorRecoveryCodes: true },
    });

    if (!dbUser?.twoFactorPendingSecret) {
      return NextResponse.json(
        { error: "No pending 2FA setup session found. Please refresh and try again." },
        { status: 400 }
      );
    }

    const plainSecret = decryptSecret(dbUser.twoFactorPendingSecret);
    const isValid = verifyTotp(plainSecret, code, 1);

    if (!isValid) {
      return NextResponse.json(
        {
          error: "Invalid 6-digit code. Ensure your device time is synchronized and try entering the current code.",
        },
        { status: 400 }
      );
    }

    // Success: activate 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: dbUser.twoFactorPendingSecret,
        twoFactorPendingSecret: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Authenticator 2FA successfully configured and verified.",
    });
  } catch (error: any) {
    console.error("[2FA Setup POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error while confirming 2FA setup" },
      { status: 500 }
    );
  }
}
