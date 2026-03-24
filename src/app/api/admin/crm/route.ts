import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type CrmStatus = "LEAD" | "ACTIVE" | "INACTIVE";
type UserRole = "USER" | "AGENT" | "AGENCY";

function asString(v: string | null) {
  return (v || "").trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = asString(searchParams.get("role")) as UserRole | "";

    // Default to USERs if nothing is provided.
    const whereSql = role ? `WHERE u.role = $1::"Role"` : "";
    const params = role ? [role] : [];

    const users = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        fullName: string;
        email: string;
        role: UserRole;
        createdAt: Date;
        crmStatus: CrmStatus;
        crmNotes: string | null;
      }>
    >(
      `
      SELECT
        u.id,
        u."fullName" as "fullName",
        u.email,
        u.role,
        u."createdAt" as "createdAt",
        u."crmStatus" as "crmStatus",
        u."crmNotes" as "crmNotes"
      FROM "User" u
      ${whereSql}
      ORDER BY u."createdAt" DESC
      LIMIT 300
      `,
      ...params
    );

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    console.error("CRM GET failed:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load CRM users." },
      { status: 500 }
    );
  }
}

