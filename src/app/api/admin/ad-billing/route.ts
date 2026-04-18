import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAdminSessionFromCookies } from "@/lib/admin-session-server";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const [wallets, revenueAgg, transactions, campaignAgg, activeCampaigns, walletBalanceAgg, perfAgg] =
      await Promise.all([
        prisma.wallet.findMany({
          orderBy: { updatedAt: "desc" },
          take: 200,
          include: {
            user: { select: { email: true, fullName: true } },
          },
        }),
        prisma.wallet.aggregate({ _sum: { totalSpent: true } }),
        prisma.walletTransaction.findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
          include: {
            user: { select: { email: true, fullName: true } },
          },
        }),
        prisma.campaign.aggregate({
          where: { NOT: { status: "DELETED" } },
          _sum: { budget: true, spent: true },
        }),
        prisma.campaign.count({
          where: {
            status: "ACTIVE",
            startDate: { lte: now },
            endDate: { gte: now },
          },
        }),
        prisma.wallet.aggregate({ _sum: { balance: true } }),
        prisma.adPerformance.aggregate({
          _sum: { impressions: true, clicks: true, leads: true, spend: true },
        }),
      ]);

    return NextResponse.json({
      overview: {
        totalCampaignBudget: Number(campaignAgg._sum.budget ?? 0),
        totalCampaignSpent: Number(campaignAgg._sum.spent ?? 0),
        activeCampaignsWindow: activeCampaigns,
        totalWalletBalance: Number(walletBalanceAgg._sum.balance ?? 0),
        platformWalletSpendTotal: Number(revenueAgg._sum.totalSpent ?? 0),
        adImpressionsAllTime: perfAgg._sum.impressions ?? 0,
        adClicksAllTime: perfAgg._sum.clicks ?? 0,
        adLeadsAllTime: perfAgg._sum.leads ?? 0,
        adSpendTracked: Number(perfAgg._sum.spend ?? 0),
      },
      wallets: wallets.map((w) => ({
        id: w.id,
        userId: w.userId,
        email: w.user.email,
        fullName: w.user.fullName,
        balance: Number(w.balance),
        totalSpent: Number(w.totalSpent),
        updatedAt: w.updatedAt.toISOString(),
      })),
      totalRevenue: Number(revenueAgg._sum.totalSpent ?? 0),
      transactions: transactions.map((t) => ({
        id: t.id,
        userId: t.userId,
        email: t.user.email,
        type: t.type,
        amount: Number(t.amount),
        adId: t.adId,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("admin ad-billing", e);
    return NextResponse.json({ error: "Failed to load billing data." }, { status: 500 });
  }
}
