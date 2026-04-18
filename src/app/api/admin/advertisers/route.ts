import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-api-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const blockedOnly = searchParams.get("blocked") === "1";

    const where: Prisma.AdvertiserProfileWhereInput = {};
    if (q) {
      where.OR = [
        { businessName: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        { user: { fullName: { contains: q, mode: "insensitive" } } },
      ];
    }
    if (blockedOnly) {
      where.user = { isBlocked: true };
    }

    const rows = await prisma.advertiserProfile.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 300,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            isBlocked: true,
            createdAt: true,
          },
        },
        _count: { select: { campaigns: true } },
      },
    });

    const userIds = rows.map((r) => r.userId);
    const [wallets, adGroups] = await Promise.all([
      prisma.wallet.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, balance: true },
      }),
      userIds.length
        ? prisma.ad.groupBy({
            by: ["ownerId"],
            where: { publisher: "USER", ownerId: { in: userIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);
    const walletByUser = new Map(wallets.map((w) => [w.userId, w.balance]));
    const adsByOwner = new Map(
      adGroups.filter((g) => g.ownerId != null).map((g) => [g.ownerId as string, g._count._all])
    );

    const advertisers = rows.map((r) => ({
      id: r.id,
      businessName: r.businessName,
      isVerified: r.isVerified,
      balance: r.balance.toString(),
      userId: r.userId,
      user: r.user,
      campaignsCount: r._count.campaigns,
      adsCount: adsByOwner.get(r.userId) ?? 0,
      walletBalance: walletByUser.get(r.userId)?.toString() ?? "0",
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return NextResponse.json({ advertisers });
  } catch (e) {
    console.error("admin advertisers GET", e);
    return NextResponse.json({ error: "Failed to load advertisers." }, { status: 500 });
  }
}
