import { NextResponse } from "next/server";
import { generateUploadToken } from "@/lib/security";

/**
 * Issues short-lived HMAC-signed upload token for certificate document uploads.
 * Valid for 15 minutes. Prevents open drop-box abuse of /api/caretakers/upload-document.
 */
export async function GET() {
  const token = generateUploadToken("CARETAKER_REGISTRATION");
  return NextResponse.json({
    success: true,
    token,
    expiresInSeconds: 900,
  });
}

export async function POST() {
  const token = generateUploadToken("CARETAKER_REGISTRATION");
  return NextResponse.json({
    success: true,
    token,
    expiresInSeconds: 900,
  });
}
