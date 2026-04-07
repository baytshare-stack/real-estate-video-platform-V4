import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";

export async function GET() {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ profile: null, campaigns: [] });

  const campaigns = await prisma.campaign.findMany({
    where: { advertiserId: auth.profile.id },
    select: { id: true, name: true, budget: true, spent: true, dailyBudget: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ profile: auth.profile, campaigns });
}

export async function POST(req: Request) {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ error: "Advertiser onboarding required" }, { status: 400 });

  const body = (await req.json()) as { amount?: number };
  const amount = Number(body.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
  }

  const profile = await prisma.advertiserProfile.update({
    where: { id: auth.profile.id },
    data: { balance: { increment: amount } },
  });
  return NextResponse.json({ profile });
}

