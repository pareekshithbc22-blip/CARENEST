import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";

  const configured = Boolean(
    clientId.length > 5 &&
      clientSecret.length > 5 &&
      !clientId.includes("unconfigured") &&
      !clientId.includes("your-google-client-id") &&
      !clientSecret.includes("your-google-client-secret")
  );

  return NextResponse.json({
    configured,
    provider: "google",
  });
}
