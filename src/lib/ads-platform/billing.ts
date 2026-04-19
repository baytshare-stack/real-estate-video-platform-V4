import { Prisma, type CampaignBidMode, type CampaignBillingType, type WalletTransactionType } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  clickUnitCost,
  dailyBudgetAllowsCharge,
  impressionUnitCost,
  leadUnitCost,
  shouldChargeClick,
  shouldChargeImpression,
  shouldChargeLead,
  utcSpendDayString,
} from "@/lib/ads-platform/monetization-engine";

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

const campaignSpendSelect = {
  status: true,
  spent: true,
  budget: true,
  dailyBudget: true,
  spentToday: true,
  spendDayUtc: true,
  billingType: true,
  bidAmount: true,
  bidMode: true,
  cpmBid: true,
  cpcBid: true,
  cplBid: true,
  advertiser: { select: { userId: true } },
} as const;

type CampaignSpendRow = Prisma.CampaignGetPayload<{ select: typeof campaignSpendSelect }>;

function bidFieldSync(billingType: CampaignBillingType, bidAmount: Prisma.Decimal) {
  if (bidAmount.lte(ZERO)) {
    return {
      billingType,
      bidAmount: ZERO,
      bidMode: "WEIGHTED" as CampaignBidMode,
      cpmBid: null as Prisma.Decimal | null,
      cpcBid: null as Prisma.Decimal | null,
      cplBid: null as Prisma.Decimal | null,
    };
  }
  const mode = billingType as unknown as CampaignBidMode;
  return {
    billingType,
    bidAmount,
    bidMode: mode,
    cpmBid: billingType === "CPM" ? bidAmount : null,
    cpcBid: billingType === "CPC" ? bidAmount : null,
    cplBid: billingType === "CPL" ? bidAmount : null,
  };
}

async function applyUserCampaignSpend(
  tx: Db,
  params: {
    campaignId: string;
    adId: string;
    amount: Prisma.Decimal;
    ledgerType: WalletTransactionType;
    now: Date;
  }
) {
  const { campaignId, adId, amount, ledgerType, now } = params;
  if (amount.lte(ZERO)) return;

  let camp = (await tx.campaign.findUnique({
    where: { id: campaignId },
    select: campaignSpendSelect,
  })) as CampaignSpendRow | null;
  if (!camp || camp.status !== "ACTIVE") return;

  const today = utcSpendDayString(now);
  if (camp.spendDayUtc !== today) {
    await tx.campaign.update({
      where: { id: campaignId },
      data: { spentToday: ZERO, spendDayUtc: today },
    });
    camp = { ...camp, spentToday: ZERO, spendDayUtc: today };
  }

  if (
    !dailyBudgetAllowsCharge({
      dailyBudget: camp.dailyBudget,
      spendDayUtc: camp.spendDayUtc,
      spentToday: camp.spentToday,
      amount,
      now,
    })
  ) {
    return;
  }

  const rem = camp.budget.sub(camp.spent);
  if (rem.lt(amount)) return;

  await tx.campaign.update({
    where: { id: campaignId },
    data: {
      spent: { increment: amount },
      spentToday: { increment: amount },
      spendDayUtc: today,
    },
  });
  await tx.walletTransaction.create({
    data: {
      userId: camp.advertiser.userId,
      type: ledgerType,
      amount,
      adId,
    },
  });
  await tx.adPerformance.upsert({
    where: { adId },
    create: { adId, spend: amount },
    update: { spend: { increment: amount } },
  });
  await pauseCampaignIfDepleted(tx, campaignId);
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
  const before = await tx.wallet.findUniqueOrThrow({
    where: { userId },
    select: { balance: true },
  });
  // Explicit current + added (avoids any mis-read of top-up as absolute balance).
  const w = await tx.wallet.update({
    where: { userId },
    data: { balance: before.balance.add(inc) },
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
  billingType?: CampaignBillingType;
  bidAmount?: Prisma.Decimal;
}) {
  const {
    userId,
    advertiserProfileId,
    name,
    budget,
    dailyBudget,
    startDate,
    endDate,
    billingType = "CPM",
    bidAmount = ZERO,
  } = params;
  if (budget.lte(ZERO)) {
    throw new Error("budget must be > 0");
  }
  if (dailyBudget.lt(ZERO)) {
    throw new Error("invalid dailyBudget");
  }

  const bidSync = bidFieldSync(billingType, bidAmount);

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
          status: "ACTIVE",
          spentToday: ZERO,
          spendDayUtc: "",
          ...bidSync,
        },
      });

      return { campaign, walletBalance: w.balance };
    }
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
 * USER campaign: impression billing for CPM (and legacy flat CPM when bidAmount = 0).
 * CPC/CPL with explicit bidAmount skip impression charges (pay on click/lead).
 */
export async function chargeForAdImpression(adId: string) {
  const now = new Date();
  await prisma.$transaction(
    async (tx) => {
      const ad = await tx.ad.findUnique({
        where: { id: adId },
        select: { id: true, publisher: true, campaignId: true, active: true },
      });
      if (!ad?.active || ad.publisher !== "USER" || !ad.campaignId) return;

      const camp = await tx.campaign.findUnique({
        where: { id: ad.campaignId },
        select: campaignSpendSelect,
      });
      if (!camp || camp.status !== "ACTIVE") return;

      if (!shouldChargeImpression({ billingType: camp.billingType, bidAmount: camp.bidAmount })) return;

      const amount = impressionUnitCost({
        billingType: camp.billingType,
        bidAmount: camp.bidAmount,
        cpmBid: camp.cpmBid,
      });
      await applyUserCampaignSpend(tx, {
        campaignId: ad.campaignId,
        adId,
        amount,
        ledgerType: "IMPRESSION",
        now,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/** USER campaign: CPC billing on tracked clicks (optional legacy when cpcBid set). */
export async function chargeForAdClick(adId: string) {
  const now = new Date();
  await prisma.$transaction(
    async (tx) => {
      const ad = await tx.ad.findUnique({
        where: { id: adId },
        select: { id: true, publisher: true, campaignId: true, active: true },
      });
      if (!ad?.active || ad.publisher !== "USER" || !ad.campaignId) return;

      const camp = await tx.campaign.findUnique({
        where: { id: ad.campaignId },
        select: campaignSpendSelect,
      });
      if (!camp || camp.status !== "ACTIVE") return;

      if (!shouldChargeClick({ billingType: camp.billingType, bidAmount: camp.bidAmount, cpcBid: camp.cpcBid })) {
        return;
      }

      const amount = clickUnitCost({
        billingType: camp.billingType,
        bidAmount: camp.bidAmount,
        cpcBid: camp.cpcBid,
      });
      await applyUserCampaignSpend(tx, {
        campaignId: ad.campaignId,
        adId,
        amount,
        ledgerType: "CLICK",
        now,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

/** Lead cost from campaign pool; CPL when bidAmount + billing; legacy always charges configured lead fee. */
export async function chargeForLead(params: { campaignId: string; adId: string; cost?: number }) {
  const now = new Date();
  await prisma.$transaction(
    async (tx) => {
      const camp = await tx.campaign.findUnique({
        where: { id: params.campaignId },
        select: campaignSpendSelect,
      });
      if (!camp || camp.status !== "ACTIVE") return;

      if (!shouldChargeLead({ billingType: camp.billingType, bidAmount: camp.bidAmount })) return;

      const amount =
        params.cost != null && Number.isFinite(params.cost)
          ? new Prisma.Decimal(String(params.cost))
          : leadUnitCost({
              billingType: camp.billingType,
              bidAmount: camp.bidAmount,
              cplBid: camp.cplBid,
            });
      if (amount.lte(ZERO)) return;

      await applyUserCampaignSpend(tx, {
        campaignId: params.campaignId,
        adId: params.adId,
        amount,
        ledgerType: "LEAD",
        now,
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export { bidFieldSync };
