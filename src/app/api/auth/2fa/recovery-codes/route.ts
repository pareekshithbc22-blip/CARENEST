import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateRecoveryCodes, decryptSecret, verifyTotp } from "@/lib/totp";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const password = typeof body.password === "string" ? body.password : "";
    const totpCode = typeof body.totpCode === "string" ? body.totpCode : "";

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        passwordHash: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    });

    if (!dbUser || !dbUser.twoFactorEnabled) {
      return NextResponse.json(
        { error: "Two-factor authentication is not active on this account." },
        { status: 400 }
      );
    }

    // Authenticate identity via password OR current TOTP code
    let identityConfirmed = false;
    if (password && dbUser.passwordHash) {
      identityConfirmed = await bcrypt.compare(password, dbUser.passwordHash);
    } else if (totpCode && dbUser.twoFactorSecret) {
      const plainSecret = decryptSecret(dbUser.twoFactorSecret);
      identityConfirmed = verifyTotp(plainSecret, totpCode, 1);
    }

    if (!identityConfirmed) {
      return NextResponse.json(
        { error: "Identity confirmation failed. Please provide your current password or current authenticator code." },
        { status: 403 }
      );
    }

    // Generate fresh set of 8 recovery codes
    const { plaintextCodes, hashedCodes } = generateRecoveryCodes(8);

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorRecoveryCodes: hashedCodes },
    });

    return NextResponse.json({
      success: true,
      recoveryCodes: plaintextCodes,
      message: "New recovery codes generated. Please store them securely.",
    });
  } catch (error: any) {
    console.error("[2FA Recovery Codes POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error while regenerating recovery codes" },
      { status: 500 }
    );
  }
}
