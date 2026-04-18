import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

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

export type WalletRechargeMeta = { paymentProvider?: string; paymentIntentId?: string };

/** Apply RECHARGE inside an existing transaction (payment gateway completion). */
export async function applyWalletRechargeInTransaction(
  tx: Db,
  userId: string,
  amount: number,
  meta?: WalletRechargeMeta
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid recharge amount");
  }
  const inc = new Prisma.Decimal(String(amount));
  await ensureWallet(tx, userId);
  const w = await tx.wallet.update({
    where: { userId },
    data: { balance: { increment: inc } },
    select: { balance: true },
  });
  await syncAdvertiserProfileBalance(tx, userId, w.balance);
  await tx.walletTransaction.create({
    data: {
      userId,
      type: "RECHARGE",
      amount: inc,
      paymentProvider: meta?.paymentProvider ?? null,
      paymentIntentId: meta?.paymentIntentId ?? null,
    },
  });
  return w;
}

/** Direct studio recharge (legacy / admin). Gateway flows use applyWalletRechargeInTransaction. */
export async function rechargeWallet(userId: string, amount: number, meta?: WalletRechargeMeta) {
  return prisma.$transaction(async (tx) => applyWalletRechargeInTransaction(tx, userId, amount, meta));
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
          status: "DRAFT",
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

/**
 * Deducts a small amount from the campaign budget for a served USER ad impression.
 * Wallet balance is unchanged (funds were moved into `campaign.budget` at allocation).
 * Cost per impression defaults to `AD_IMPRESSION_COST` env (decimal string), fallback 0.01.
 */
export async function chargeForAdImpression(adId: string) {
  const raw = process.env.AD_IMPRESSION_COST ?? "0.01";
  const amount = new Prisma.Decimal(String(raw));
  if (amount.lte(ZERO)) return;

  await prisma.$transaction(
    async (tx) => {
      const ad = await tx.ad.findUnique({
        where: { id: adId },
        select: { id: true, publisher: true, campaignId: true, active: true },
      });
      if (!ad?.active || ad.publisher !== "USER" || !ad.campaignId) return;

      const campaign = await tx.campaign.findUnique({
        where: { id: ad.campaignId },
        select: {
          status: true,
          spent: true,
          budget: true,
          advertiser: { select: { userId: true } },
        },
      });
      if (!campaign || campaign.status !== "ACTIVE") return;

      const rem = campaign.budget.sub(campaign.spent);
      if (rem.lt(amount)) return;

      await tx.campaign.update({
        where: { id: ad.campaignId },
        data: { spent: { increment: amount } },
      });
      await tx.walletTransaction.create({
        data: {
          userId: campaign.advertiser.userId,
          type: "IMPRESSION",
          amount,
          adId,
        },
      });
      await pauseCampaignIfDepleted(tx, ad.campaignId);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
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
