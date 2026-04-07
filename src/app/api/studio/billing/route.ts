import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdvertiserProfile } from "@/lib/ads-platform/auth";
import { getOrCreateWallet, rechargeWallet } from "@/lib/ads-platform/billing";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdvertiserProfile();
  if (!auth?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.profile) return NextResponse.json({ profile: null, campaigns: [], wallet: null, transactions: [] });

  const wallet = await getOrCreateWallet(auth.user.id);
  const [campaigns, transactions] = await Promise.all([
    prisma.campaign.findMany({
      where: { advertiserId: auth.profile.id },
      select: { id: true, name: true, budget: true, spent: true, dailyBudget: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.walletTransaction.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, type: true, amount: true, adId: true, createdAt: true },
    }),
  ]);

  const profile = { ...auth.profile, balance: wallet.balance };
  let totalCampaignSpend = 0;
  for (const c of campaigns) {
    totalCampaignSpend += Number(c.spent);
  }

  return NextResponse.json({
    profile,
    wallet: {
      balance: wallet.balance,
      totalSpent: wallet.totalSpent,
      createdAt: wallet.createdAt,
    },
    totalCampaignSpend,
    campaigns,
    transactions,
  });
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

  try {
    await rechargeWallet(auth.user.id, amount);
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId: auth.user.id },
      select: { balance: true, totalSpent: true },
    });
    const profile = await prisma.advertiserProfile.findUniqueOrThrow({
      where: { id: auth.profile.id },
    });
    return NextResponse.json({ profile, wallet });
  } catch {
    return NextResponse.json({ error: "Recharge failed" }, { status: 500 });
  }
}
