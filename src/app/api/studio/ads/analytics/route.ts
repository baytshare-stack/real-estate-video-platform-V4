import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";

export async function GET() {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ rows: [], summary: null });

  const ads = await prisma.ad.findMany({
    where: { campaign: { advertiserId: auth.profile.id } },
    include: { campaign: true, performance: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = ads.map((ad) => {
    const perf = ad.performance;
    const impressions = perf?.impressions ?? 0;
    const views = perf?.views ?? 0;
    const clicks = perf?.clicks ?? 0;
    const leads = perf?.leads ?? 0;
    const spend = Number(perf?.spend ?? 0);
    return {
      adId: ad.id,
      campaignName: ad.campaign.name,
      placement: ad.placement,
      impressions,
      views,
      clicks,
      leads,
      ctr: impressions ? (clicks / impressions) * 100 : 0,
      costPerLead: leads ? spend / leads : 0,
      spend,
    };
  });

  const summary = rows.reduce(
    (acc, row) => {
      acc.impressions += row.impressions;
      acc.views += row.views;
      acc.clicks += row.clicks;
      acc.leads += row.leads;
      acc.spend += row.spend;
      return acc;
    },
    { impressions: 0, views: 0, clicks: 0, leads: 0, spend: 0 }
  );

  return NextResponse.json({
    rows,
    summary: {
      ...summary,
      ctr: summary.impressions ? (summary.clicks / summary.impressions) * 100 : 0,
      costPerLead: summary.leads ? summary.spend / summary.leads : 0,
    },
  });
}

