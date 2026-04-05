import { NextResponse } from "next/server";
import type { PlatformAdPosition } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-api-auth";

export const runtime = "nodejs";

const POSITIONS: PlatformAdPosition[] = ["PRE_ROLL", "MID_ROLL", "OVERLAY"];

function isPosition(v: unknown): v is PlatformAdPosition {
  return typeof v === "string" && (POSITIONS as string[]).includes(v);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await context.params;
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

    const data: {
      title?: string;
      description?: string | null;
      mediaUrl?: string;
      clickUrl?: string | null;
      targetCategory?: string;
      targetLocation?: string;
      position?: PlatformAdPosition;
      priority?: number;
      isActive?: boolean;
    } = {};

    if (typeof body.title === "string") {
      const t = body.title.trim();
      if (!t) return NextResponse.json({ error: "title cannot be empty." }, { status: 400 });
      data.title = t;
    }
    if (body.description !== undefined) {
      data.description = body.description === null ? null : String(body.description).trim() || null;
    }
    if (typeof body.mediaUrl === "string") {
      const m = body.mediaUrl.trim();
      if (!m) return NextResponse.json({ error: "mediaUrl cannot be empty." }, { status: 400 });
      data.mediaUrl = m;
    }
    if (body.clickUrl !== undefined) {
      data.clickUrl = body.clickUrl === null || !String(body.clickUrl).trim() ? null : String(body.clickUrl).trim();
    }
    if (typeof body.targetCategory === "string") data.targetCategory = body.targetCategory.trim();
    if (typeof body.targetLocation === "string") data.targetLocation = body.targetLocation.trim();
    if (body.position !== undefined) {
      if (!isPosition(body.position)) {
        return NextResponse.json({ error: "Invalid position." }, { status: 400 });
      }
      data.position = body.position;
    }
    if (body.priority !== undefined) {
      if (typeof body.priority !== "number" || !Number.isFinite(body.priority)) {
        return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
      }
      data.priority = Math.trunc(body.priority);
    }
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    if (!Object.keys(data).length) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    await prisma.ad.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? (e as { code?: string }).code : "";
    if (code === "P2025") {
      return NextResponse.json({ error: "Ad not found." }, { status: 404 });
    }
    console.error("admin ads put", e);
    return NextResponse.json({ error: "Failed to update ad." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    const { id } = await context.params;
    await prisma.ad.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code = typeof e === "object" && e && "code" in e ? (e as { code?: string }).code : "";
    if (code === "P2025") {
      return NextResponse.json({ error: "Ad not found." }, { status: 404 });
    }
    console.error("admin ads delete", e);
    return NextResponse.json({ error: "Failed to delete ad." }, { status: 500 });
  }
}
