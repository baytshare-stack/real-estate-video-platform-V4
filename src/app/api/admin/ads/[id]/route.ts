import type { Prisma } from "@prisma/client";
import type { AdCreativeKind, AdTextDisplayMode, VideoAdSlot } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { normalizeAdMediaUrl, normalizeAdTextBody } from "@/lib/ads-platform/media-url";

type PatchBody = {
  creativeKind?: AdCreativeKind;
  videoUrl?: string | null;
  textBody?: string | null;
  textDisplayMode?: AdTextDisplayMode | null;
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
    if (existing.publisher !== "ADMIN") {
      return NextResponse.json({ error: "Only platform (admin) ads can be edited here." }, { status: 403 });
    }

    const body = (await req.json()) as PatchBody;

    const adData: Prisma.AdUpdateInput = {};
    if (body.type === "PRE_ROLL" || body.type === "MID_ROLL") adData.type = body.type;
    if (typeof body.skippable === "boolean") adData.skippable = body.skippable;
    if (typeof body.skipAfterSeconds === "number" && Number.isFinite(body.skipAfterSeconds)) {
      adData.skipAfterSeconds = Math.max(0, body.skipAfterSeconds);
    }
    if (typeof body.active === "boolean") adData.active = body.active;

    const nextKind: AdCreativeKind = body.creativeKind ?? existing.creativeKind;
    adData.creativeKind = nextKind;

    if (nextKind === "VIDEO") {
      const mergedUrl =
        body.videoUrl !== undefined ? normalizeAdMediaUrl(body.videoUrl) ?? existing.videoUrl : existing.videoUrl;
      if (!mergedUrl?.trim()) {
        return NextResponse.json({ error: "videoUrl is required for video ads." }, { status: 400 });
      }
      adData.videoUrl = mergedUrl;
      adData.textBody = null;
      adData.textDisplayMode = null;
    } else {
      const mergedText =
        body.textBody !== undefined ? normalizeAdTextBody(body.textBody) : normalizeAdTextBody(existing.textBody);
      if (!mergedText?.trim()) {
        return NextResponse.json({ error: "textBody is required for text ads." }, { status: 400 });
      }
      adData.textBody = mergedText;
      adData.textDisplayMode =
        body.textDisplayMode === "CARD" || body.textDisplayMode === "OVERLAY"
          ? body.textDisplayMode
          : (existing.textDisplayMode ?? "OVERLAY");
      adData.videoUrl = null;
    }

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
    if (existing.publisher !== "ADMIN") {
      return NextResponse.json({ error: "Only platform ads can be deleted here." }, { status: 403 });
    }

    await prisma.ad.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin ads DELETE", e);
    return NextResponse.json({ error: "Failed to delete ad." }, { status: 500 });
  }
}
