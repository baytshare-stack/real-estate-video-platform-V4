import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";

export async function GET() {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ campaigns: [] });

  const campaigns = await prisma.campaign.findMany({
    where: { advertiserId: auth.profile.id },
    include: { _count: { select: { ads: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ error: "Advertiser onboarding required" }, { status: 400 });

  const body = (await req.json()) as {
    name?: string;
    budget?: number;
    dailyBudget?: number;
    startDate?: string;
    endDate?: string;
  };

  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const budget = Number(body.budget || 0);
  const dailyBudget = Number(body.dailyBudget || 0);
  const startDate = body.startDate ? new Date(body.startDate) : new Date();
  const endDate = body.endDate ? new Date(body.endDate) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  const campaign = await prisma.campaign.create({
    data: {
      advertiserId: auth.profile.id,
      name,
      budget,
      dailyBudget,
      startDate,
      endDate,
      status: "PAUSED",
    },
  });

  return NextResponse.json({ campaign });
}

