import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(_req: Request) {
  // Allow only if in non-production or if authenticated as ADMIN in production
  if (process.env.NODE_ENV === "production") {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Administrator privileges required in production." },
        { status: 403 }
      );
    }
  }

  try {
    const count = await prisma.user.count();
    if (count > 0) {
      return NextResponse.json({ message: "Database already populated", userCount: count });
    }

    // Otherwise seed initial user
    const passwordHash = await bcrypt.hash("CareNest2026!", 10);
    await prisma.user.create({
      data: {
        email: "sarah.vance@carenest.org",
        name: "Sarah Vance",
        passwordHash,
        role: "FAMILY",
      },
    });

    return NextResponse.json({ message: "Initial user created" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Administrator privileges required in production." },
        { status: 403 }
      );
    }
  }
  return NextResponse.json({ error: "Method not allowed. Use POST to seed." }, { status: 405 });
}
