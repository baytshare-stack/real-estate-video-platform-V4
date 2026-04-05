import { NextResponse } from "next/server";
import type { PlatformAdPosition } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-api-auth";
import { ensureDemoSmartAd } from "@/lib/ensure-demo-smart-ad";

export const runtime = "nodejs";

const POSITIONS: PlatformAdPosition[] = ["PRE_ROLL", "MID_ROLL", "OVERLAY"];

function isPosition(v: unknown): v is PlatformAdPosition {
  return typeof v === "string" && (POSITIONS as string[]).includes(v);
}

function ctr(impressions: number, clicks: number): number {
  if (impressions <= 0) return 0;
  return (clicks / impressions) * 100;
}

export async function GET() {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    await ensureDemoSmartAd(prisma);
    const rows = await prisma.ad.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      ads: rows.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        mediaUrl: a.mediaUrl,
        clickUrl: a.clickUrl,
        targetCategory: a.targetCategory,
        targetLocation: a.targetLocation,
        position: a.position,
        priority: a.priority,
        isActive: a.isActive,
        impressions: a.impressions,
        clicks: a.clicks,
        ctr: ctr(a.impressions, a.clicks),
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("admin ads list", e);
    return NextResponse.json({ error: "Failed to load ads." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string | null;
      mediaUrl?: string;
      clickUrl?: string | null;
      targetCategory?: string;
      targetLocation?: string;
      position?: string;
      priority?: number;
      isActive?: boolean;
    };

    const title = (body.title || "").trim();
    const mediaUrl = (body.mediaUrl || "").trim();
    if (!title || !mediaUrl) {
      return NextResponse.json({ error: "title and mediaUrl are required." }, { status: 400 });
    }

    const position: PlatformAdPosition = isPosition(body.position) ? body.position : "OVERLAY";
    const priority = typeof body.priority === "number" && Number.isFinite(body.priority) ? Math.trunc(body.priority) : 0;

    const row = await prisma.ad.create({
      data: {
        title,
        description: body.description != null ? String(body.description).trim() || null : null,
        mediaUrl,
        clickUrl: body.clickUrl != null && String(body.clickUrl).trim() ? String(body.clickUrl).trim() : null,
        targetCategory: typeof body.targetCategory === "string" ? body.targetCategory.trim() : "",
        targetLocation: typeof body.targetLocation === "string" ? body.targetLocation.trim() : "",
        position,
        priority,
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      },
    });

    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (e) {
    console.error("admin ads create", e);
    return NextResponse.json({ error: "Failed to create ad." }, { status: 500 });
  }
}
