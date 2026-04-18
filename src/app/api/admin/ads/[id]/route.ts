import type { Prisma } from "@prisma/client";
import type { VideoAdSlot } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeAdMediaUrl } from "@/lib/ads-platform/media-url";

type PatchBody = {
  videoUrl?: string | null;
  type?: VideoAdSlot;
  skippable?: boolean;
  skipAfterSeconds?: number;
  active?: boolean;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }

    const existing = await prisma.ad.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Ad not found." }, { status: 404 });
    }

    const body = (await req.json()) as PatchBody;

    const adData: Prisma.AdUpdateInput = {};
    if (body.videoUrl !== undefined) adData.videoUrl = normalizeAdMediaUrl(body.videoUrl) || existing.videoUrl;
    if (body.type === "PRE_ROLL" || body.type === "MID_ROLL") adData.type = body.type;
    if (typeof body.skippable === "boolean") adData.skippable = body.skippable;
    if (typeof body.skipAfterSeconds === "number" && Number.isFinite(body.skipAfterSeconds)) {
      adData.skipAfterSeconds = Math.max(0, body.skipAfterSeconds);
    }
    if (typeof body.active === "boolean") adData.active = body.active;

    await prisma.ad.update({ where: { id }, data: adData });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin ads PATCH", e);
    return NextResponse.json({ error: "Failed to update ad." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Invalid id." }, { status: 400 });
    }

    const existing = await prisma.ad.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Ad not found." }, { status: 404 });
    }

    await prisma.ad.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin ads DELETE", e);
    return NextResponse.json({ error: "Failed to delete ad." }, { status: 500 });
  }
}
