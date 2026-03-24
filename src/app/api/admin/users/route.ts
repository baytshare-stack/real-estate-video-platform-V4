import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function asString(v: string | null) {
  return (v || "").trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = asString(searchParams.get("search"));
    const role = asString(searchParams.get("role"));

    const where: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      params.push(`%${search}%`);
      where.push(`("fullName" ILIKE $${params.length - 1} OR email ILIKE $${params.length})`);
    }

    if (role) {
      params.push(role);
      where.push(`role = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const users = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        fullName: string;
        email: string;
        role: "USER" | "AGENT" | "AGENCY" | "ADMIN";
        createdAt: Date;
        isBlocked: boolean;
      }>
    >(
      `
      SELECT id, "fullName", email, role, "createdAt", "isBlocked"
      FROM "User"
      ${whereSql}
      ORDER BY "createdAt" DESC
      LIMIT 200
      `,
      ...params
    );

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 });
  }
}

