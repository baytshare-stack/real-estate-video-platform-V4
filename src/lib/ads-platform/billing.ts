import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/** Minimum wallet balance required to be eligible for an impression serve. */
export const ADS_WALLET_IMPRESSION_COST = new Prisma.Decimal("0.02");
export const ADS_WALLET_CLICK_COST = new Prisma.Decimal("0.25");

const ZERO = new Prisma.Decimal(0);

type Db = Prisma.TransactionClient | typeof prisma;

export async function getOrCreateWallet(userId: string) {
  return prisma.$transaction(async (tx) => ensureWallet(tx, userId));
}

export async function ensureWallet(tx: Db, userId: string) {
  const existing = await tx.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  const profile = await tx.advertiserProfile.findUnique({
    where: { userId },
    select: { balance: true },
  });
  const seed = profile?.balance ?? ZERO;
  return tx.wallet.create({
    data: { userId, balance: seed, totalSpent: ZERO },
  });
}

async function syncAdvertiserProfileBalance(tx: Db, userId: string, balance: Prisma.Decimal) {
  await tx.advertiserProfile.updateMany({
    where: { userId },
    data: { balance },
  });
}

async function pauseAllCampaignsForAdvertiserUser(tx: Db, userId: string) {
  await tx.campaign.updateMany({
    where: { advertiser: { userId } },
    data: { status: "PAUSED" },
  });
}

export async function rechargeWallet(userId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid recharge amount");
  }
  const inc = new Prisma.Decimal(String(amount));
  return prisma.$transaction(async (tx) => {
    await ensureWallet(tx, userId);
    const w = await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: inc } },
      select: { balance: true },
    });
    await syncAdvertiserProfileBalance(tx, userId, w.balance);
    await tx.walletTransaction.create({
      data: { userId, type: "RECHARGE", amount: inc },
    });
    return w;
  });
}

export async function deductWalletForImpression(userId: string, adId: string) {
  return prisma.$transaction(async (tx) => {
    await ensureWallet(tx, userId);
    const before = await tx.wallet.findUnique({
      where: { userId },
      select: { balance: true },
    });
    if (!before || before.balance.lt(ADS_WALLET_IMPRESSION_COST)) {
      return { ok: false as const, reason: "insufficient_balance" };
    }
    const w = await tx.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: ADS_WALLET_IMPRESSION_COST },
        totalSpent: { increment: ADS_WALLET_IMPRESSION_COST },
      },
      select: { balance: true },
    });
    await syncAdvertiserProfileBalance(tx, userId, w.balance);
    await tx.walletTransaction.create({
      data: {
        userId,
        type: "IMPRESSION",
        amount: ADS_WALLET_IMPRESSION_COST,
        adId,
      },
    });
    if (w.balance.lte(ZERO)) {
      await pauseAllCampaignsForAdvertiserUser(tx, userId);
    }
    return { ok: true as const, balance: w.balance };
  });
}

export async function deductWalletForClick(userId: string, adId: string) {
  return prisma.$transaction(async (tx) => {
    await ensureWallet(tx, userId);
    const before = await tx.wallet.findUnique({
      where: { userId },
      select: { balance: true },
    });
    if (!before || before.balance.lt(ADS_WALLET_CLICK_COST)) {
      return { ok: false as const, reason: "insufficient_balance" };
    }
    const w = await tx.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: ADS_WALLET_CLICK_COST },
        totalSpent: { increment: ADS_WALLET_CLICK_COST },
      },
      select: { balance: true },
    });
    await syncAdvertiserProfileBalance(tx, userId, w.balance);
    await tx.walletTransaction.create({
      data: {
        userId,
        type: "CLICK",
        amount: ADS_WALLET_CLICK_COST,
        adId,
      },
    });
    if (w.balance.lte(ZERO)) {
      await pauseAllCampaignsForAdvertiserUser(tx, userId);
    }
    return { ok: true as const, balance: w.balance };
  });
}

/** Legacy helper: charge campaign spend + wallet (e.g. leads). Uses wallet when present. */
export async function chargeForLead(campaignId: string, cost = 3) {
  const amount = new Prisma.Decimal(String(cost));
  await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUnique({
      where: { id: campaignId },
      select: { advertiser: { select: { userId: true } } },
    });
    const userId = campaign?.advertiser?.userId;
    if (!userId) return;
    await ensureWallet(tx, userId);
    const before = await tx.wallet.findUnique({
      where: { userId },
      select: { balance: true },
    });
    if (!before || before.balance.lt(amount)) return;
    await tx.campaign.update({
      where: { id: campaignId },
      data: { spent: { increment: amount } },
    });
    const w = await tx.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: amount },
        totalSpent: { increment: amount },
      },
      select: { balance: true },
    });
    await syncAdvertiserProfileBalance(tx, userId, w.balance);
    await tx.walletTransaction.create({
      data: { userId, type: "LEAD", amount, adId: null },
    });
    if (w.balance.lte(ZERO)) {
      await pauseAllCampaignsForAdvertiserUser(tx, userId);
    }
  });
}

/** Effective balance per advertiser user for ad delivery gating (wallet row or profile fallback). */
export async function getEffectiveAdvertiserBalances(userIds: string[]): Promise<Map<string, Prisma.Decimal>> {
  const map = new Map<string, Prisma.Decimal>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return map;

  const [wallets, profiles] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId: { in: unique } },
      select: { userId: true, balance: true },
    }),
    prisma.advertiserProfile.findMany({
      where: { userId: { in: unique } },
      select: { userId: true, balance: true },
    }),
  ]);

  const walletByUser = new Map(wallets.map((w) => [w.userId, w.balance]));
  const profileByUser = new Map(profiles.map((p) => [p.userId, p.balance]));

  for (const uid of unique) {
    const b = walletByUser.get(uid) ?? profileByUser.get(uid) ?? ZERO;
    map.set(uid, b);
  }
  return map;
}
