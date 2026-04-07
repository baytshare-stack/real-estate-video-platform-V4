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
    const [wallets, revenueAgg, transactions] = await Promise.all([
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
    ]);

    return NextResponse.json({
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
