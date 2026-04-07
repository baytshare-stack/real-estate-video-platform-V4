import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/** Charged against campaign budget (not wallet) per impression / click. */
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

async function pauseCampaignIfDepleted(tx: Db, campaignId: string) {
  const c = await tx.campaign.findUnique({
    where: { id: campaignId },
    select: { spent: true, budget: true },
  });
  if (!c) return;
  if (c.budget.sub(c.spent).lte(ZERO)) {
    await tx.campaign.update({ where: { id: campaignId }, data: { status: "PAUSED" } });
  }
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

/**
 * Allocate lifetime campaign budget from the advertiser wallet (single source of money).
 * Wallet balance decreases; campaign.budget stores the allocated cap; spend is tracked in campaign.spent.
 */
export async function createCampaignWithWalletAllocation(params: {
  userId: string;
  advertiserProfileId: string;
  name: string;
  budget: Prisma.Decimal;
  dailyBudget: Prisma.Decimal;
  startDate: Date;
  endDate: Date;
}) {
  const { userId, advertiserProfileId, name, budget, dailyBudget, startDate, endDate } = params;
  if (budget.lte(ZERO)) {
    throw new Error("budget must be > 0");
  }
  if (dailyBudget.lt(ZERO)) {
    throw new Error("invalid dailyBudget");
  }

  return prisma.$transaction(
    async (tx) => {
      await ensureWallet(tx, userId);
      const before = await tx.wallet.findUnique({
        where: { userId },
        select: { balance: true },
      });
      if (!before || before.balance.lt(budget)) {
        throw new Error("INSUFFICIENT_WALLET");
      }

      const w = await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: budget } },
        select: { balance: true },
      });
      await syncAdvertiserProfileBalance(tx, userId, w.balance);
      await tx.walletTransaction.create({
        data: { userId, type: "CAMPAIGN_ALLOC", amount: budget, adId: null },
      });

      const campaign = await tx.campaign.create({
        data: {
          advertiserId: advertiserProfileId,
          name,
          budget,
          dailyBudget,
          spent: ZERO,
          startDate,
          endDate,
          status: "PAUSED",
        },
      });

      return { campaign, walletBalance: w.balance };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/** When studio PATCH changes campaign budget, move the delta to/from wallet. */
export async function adjustCampaignBudgetAllocation(params: {
  userId: string;
  advertiserProfileId: string;
  campaignId: string;
  newBudget: Prisma.Decimal;
}) {
  const { userId, advertiserProfileId, campaignId, newBudget } = params;
  if (newBudget.lte(ZERO)) throw new Error("INVALID_BUDGET");

  return prisma.$transaction(
    async (tx) => {
      const camp = await tx.campaign.findFirst({
        where: { id: campaignId, advertiserId: advertiserProfileId },
        select: { budget: true, spent: true },
      });
      if (!camp) throw new Error("NOT_FOUND");
      if (newBudget.lt(camp.spent)) throw new Error("BUDGET_BELOW_SPENT");

      const delta = newBudget.sub(camp.budget);
      if (delta.eq(ZERO)) {
        return tx.campaign.findUniqueOrThrow({ where: { id: campaignId } });
      }

      await ensureWallet(tx, userId);

      if (delta.gt(ZERO)) {
        const w = await tx.wallet.findUnique({ where: { userId }, select: { balance: true } });
        if (!w || w.balance.lt(delta)) throw new Error("INSUFFICIENT_WALLET");
        const w2 = await tx.wallet.update({
          where: { userId },
          data: { balance: { decrement: delta } },
          select: { balance: true },
        });
        await syncAdvertiserProfileBalance(tx, userId, w2.balance);
        await tx.walletTransaction.create({
          data: { userId, type: "CAMPAIGN_ALLOC", amount: delta, adId: null },
        });
      } else {
        const refund = delta.neg();
        const w2 = await tx.wallet.update({
          where: { userId },
          data: { balance: { increment: refund } },
          select: { balance: true },
        });
        await syncAdvertiserProfileBalance(tx, userId, w2.balance);
        await tx.walletTransaction.create({
          data: { userId, type: "CAMPAIGN_ALLOC", amount: delta, adId: null },
        });
      }

      return tx.campaign.update({ where: { id: campaignId }, data: { budget: newBudget } });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export type CampaignSpendResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "campaign_inactive" | "campaign_exhausted" };

export async function applyCampaignSpendForImpression(adId: string): Promise<CampaignSpendResult> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const ad = await tx.ad.findUnique({
          where: { id: adId },
          select: {
            id: true,
            campaign: {
              select: { id: true, spent: true, budget: true, status: true },
            },
          },
        });
        if (!ad?.campaign) return { ok: false as const, reason: "not_found" as const };
        const camp = ad.campaign;
        if (camp.status !== "ACTIVE") return { ok: false as const, reason: "campaign_inactive" as const };
        const rem = camp.budget.sub(camp.spent);
        if (rem.lt(ADS_WALLET_IMPRESSION_COST)) {
          return { ok: false as const, reason: "campaign_exhausted" as const };
        }
        await tx.campaign.update({
          where: { id: camp.id },
          data: { spent: { increment: ADS_WALLET_IMPRESSION_COST } },
        });
        await pauseCampaignIfDepleted(tx, camp.id);
        return { ok: true as const };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch {
    return { ok: false, reason: "not_found" };
  }
}

export async function applyCampaignSpendForClick(adId: string): Promise<CampaignSpendResult> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const ad = await tx.ad.findUnique({
          where: { id: adId },
          select: {
            id: true,
            campaign: {
              select: { id: true, spent: true, budget: true, status: true },
            },
          },
        });
        if (!ad?.campaign) return { ok: false as const, reason: "not_found" as const };
        const camp = ad.campaign;
        if (camp.status !== "ACTIVE") return { ok: false as const, reason: "campaign_inactive" as const };
        const rem = camp.budget.sub(camp.spent);
        if (rem.lt(ADS_WALLET_CLICK_COST)) {
          return { ok: false as const, reason: "campaign_exhausted" as const };
        }
        await tx.campaign.update({
          where: { id: camp.id },
          data: { spent: { increment: ADS_WALLET_CLICK_COST } },
        });
        await pauseCampaignIfDepleted(tx, camp.id);
        return { ok: true as const };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch {
    return { ok: false, reason: "not_found" };
  }
}

/** Lead cost comes from the campaign budget pool only (wallet was already debited at allocation). */
export async function chargeForLead(campaignId: string, cost = 3) {
  const amount = new Prisma.Decimal(String(cost));
  await prisma.$transaction(
    async (tx) => {
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId },
        select: { spent: true, budget: true },
      });
      if (!campaign) return;
      const rem = campaign.budget.sub(campaign.spent);
      if (rem.lt(amount)) return;
      await tx.campaign.update({
        where: { id: campaignId },
        data: { spent: { increment: amount } },
      });
      await pauseCampaignIfDepleted(tx, campaignId);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/**
 * Delivery liquidity: unallocated wallet + remaining budget across all campaigns.
 * Ads stop when this is zero (no money left anywhere for this advertiser).
 */
export async function getAdvertiserDeliveryLiquidityMap(userIds: string[]): Promise<Map<string, Prisma.Decimal>> {
  const map = new Map<string, Prisma.Decimal>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return map;

  const [wallets, campaigns] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId: { in: unique } },
      select: { userId: true, balance: true },
    }),
    prisma.campaign.findMany({
      where: { advertiser: { userId: { in: unique } } },
      select: {
        budget: true,
        spent: true,
        advertiser: { select: { userId: true } },
      },
    }),
  ]);

  for (const uid of unique) map.set(uid, ZERO);
  for (const w of wallets) {
    map.set(w.userId, w.balance);
  }
  for (const c of campaigns) {
    const uid = c.advertiser.userId;
    const rem = c.budget.sub(c.spent);
    if (rem.gt(ZERO)) {
      map.set(uid, (map.get(uid) ?? ZERO).add(rem));
    }
  }
  return map;
}

/** @deprecated Prefer getAdvertiserDeliveryLiquidityMap for ad serving. */
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
