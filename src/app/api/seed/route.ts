import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(_req: Request) {
  // Allow if in dev or if admin
  if (process.env.NODE_ENV === "production") {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
