import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";

function canSelfServeVideoAds(role: string) {
  return role === "AGENT" || role === "AGENCY";
}

export async function GET() {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile || !canSelfServeVideoAds(auth.user.role)) {
    return NextResponse.json({
      success: true,
      rows: [],
      summary: {
        impressions: 0,
        views: 0,
        clicks: 0,
        leads: 0,
        spend: 0,
        ctr: 0,
        costPerLead: 0,
        conversionRate: 0,
        watchRetention: 0,
      },
    });
  }

  const ads = await prisma.ad.findMany({
    where: { publisher: "USER", ownerId: auth.user.id },
    select: {
      id: true,
      campaignId: true,
      performance: {
        select: {
          impressions: true,
          views: true,
          clicks: true,
          leads: true,
          spend: true,
          watchTime: true,
        },
      },
    },
  });

  let impressions = 0;
  let views = 0;
  let clicks = 0;
  let leads = 0;
  let spend = new Prisma.Decimal(0);
  let watchTime = 0;

  const rows = ads.map((a) => {
    const p = a.performance;
    const impr = p?.impressions ?? 0;
    const v = p?.views ?? 0;
    const c = p?.clicks ?? 0;
    const l = p?.leads ?? 0;
    const wt = p?.watchTime ?? 0;
    const sp = p?.spend ?? new Prisma.Decimal(0);
    impressions += impr;
    views += v;
    clicks += c;
    leads += l;
    spend = spend.add(sp);
    watchTime += wt;
    const ctr = impr > 0 ? (c / impr) * 100 : 0;
    const costPerLead = l > 0 ? Number(sp.toString()) / l : 0;
    const conversionRate = impr > 0 ? (l / impr) * 100 : 0;
    const watchRetention = impr > 0 ? wt / impr : 0;
    return {
      adId: a.id,
      campaignId: a.campaignId,
      impressions: impr,
      views: v,
      clicks: c,
      leads: l,
      spend: sp.toString(),
      watchTime: wt,
      ctr,
      costPerLead,
      conversionRate,
      watchRetention,
    };
  });

  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const costPerLead = leads > 0 ? Number(spend.toString()) / leads : 0;
  const conversionRate = impressions > 0 ? (leads / impressions) * 100 : 0;
  const watchRetention = impressions > 0 ? watchTime / impressions : 0;

  return NextResponse.json({
    success: true,
    rows,
    summary: {
      impressions,
      views,
      clicks,
      leads,
      spend: spend.toString(),
      ctr,
      costPerLead,
      conversionRate,
      watchRetention,
    },
  });
}
