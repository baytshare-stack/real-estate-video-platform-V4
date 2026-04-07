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

    let adLeads: Array<{
      id: string;
      adId: string;
      videoId: string;
      video: { id: string; title: string };
      agentId: string;
      agent: { id: string; fullName: string; email: string };
      name: string;
      phone: string;
      source: "AD" | "VIDEO";
      createdAt: Date;
    }> = [];
    try {
      adLeads = await prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          ad: { select: { id: true } },
          video: { select: { id: true, title: true } },
          agent: { select: { id: true, fullName: true, email: true } },
        },
      });
    } catch (err: unknown) {
      // Graceful fallback before DB migration is applied (Lead.agentId missing).
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("Lead.agentId")) {
        throw err;
      }
    }

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
      adLeads: adLeads.map((l) => ({
        id: l.id,
        adId: l.adId,
        videoId: l.videoId,
        videoTitle: l.video.title,
        agentId: l.agentId,
        agentName: l.agent.fullName,
        agentEmail: l.agent.email,
        name: l.name,
        phone: l.phone,
        source: l.source,
        createdAt: l.createdAt.toISOString(),
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

