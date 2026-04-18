import type { Prisma, VideoAdSlot } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { normalizeAdMediaUrl } from "@/lib/ads-platform/media-url";
import { userCanTargetVideoForAd } from "@/lib/video-ads/targeting";

function canSelfServeVideoAds(role: string) {
  return role === "AGENT" || role === "AGENCY";
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ error: "Advertiser onboarding required" }, { status: 400 });
  if (!canSelfServeVideoAds(auth.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.ad.findFirst({
    where: { id, publisher: "USER", ownerId: auth.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as {
    videoUrl?: string | null;
    type?: VideoAdSlot;
    targetVideoId?: string | null;
    skippable?: boolean;
    skipAfterSeconds?: number;
    active?: boolean;
    campaignId?: string | null;
  };

  let nextTarget = existing.targetVideoId;
  if (body.targetVideoId !== undefined) {
    const t = (body.targetVideoId || "").trim() || null;
    if (t) {
      const ok = await userCanTargetVideoForAd(auth.user.id, auth.user.role, t);
      if (!ok) return NextResponse.json({ error: "Invalid target video." }, { status: 403 });
    }
    nextTarget = t;
  }

  const data: Prisma.AdUpdateInput = {};
  if (body.videoUrl !== undefined) data.videoUrl = normalizeAdMediaUrl(body.videoUrl) || existing.videoUrl;
  if (body.type === "PRE_ROLL" || body.type === "MID_ROLL") data.type = body.type;
  if (typeof body.skippable === "boolean") data.skippable = body.skippable;
  if (typeof body.skipAfterSeconds === "number" && Number.isFinite(body.skipAfterSeconds)) {
    data.skipAfterSeconds = Math.max(0, body.skipAfterSeconds);
  }
  if (typeof body.active === "boolean") data.active = body.active;
  if (body.targetVideoId !== undefined) data.targetVideoId = nextTarget;
  if (body.campaignId !== undefined) {
    const cid = (body.campaignId || "").trim();
    if (!cid) {
      data.campaignId = null;
    } else {
      const camp = await prisma.campaign.findFirst({
        where: { id: cid, advertiserId: auth.profile.id },
      });
      if (!camp) return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
      data.campaignId = cid;
    }
  }

  const ad = await prisma.ad.update({ where: { id }, data });
  return NextResponse.json({ ad });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.ad.findFirst({
    where: { id, publisher: "USER", ownerId: auth.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.ad.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
