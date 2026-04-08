import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { applyWalletRechargeInTransaction, getOrCreateWallet } from "@/lib/ads-platform/billing";
import { getPaymentProvider } from "./registry";
import type { PaymentProviderId } from "./types";
import { isPaymentProviderId } from "./types";
import { getSiteUrl } from "@/lib/site-url";
import { assertProviderCanStartCheckout, getVerifySecretsForProvider } from "./payment-settings";

const AWAITING = "AWAITING_USER";

export async function createWalletTopUpIntent(params: {
  userId: string;
  amount: number;
  provider: PaymentProviderId;
  locale: string;
}) {
  const { userId, amount, provider, locale } = params;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("INVALID_AMOUNT");
  }

  const idempotencyKey = randomBytes(24).toString("hex");
  const returnToken = randomBytes(32).toString("hex");
  const baseUrl = getSiteUrl();

  const providerRuntime = await assertProviderCanStartCheckout(provider);

  const intent = await prisma.walletPaymentIntent.create({
    data: {
      userId,
      amount: new Prisma.Decimal(String(amount)),
      currency: "EGP",
      provider,
      status: "PENDING",
      idempotencyKey,
      returnToken,
    },
  });

  const impl = getPaymentProvider(provider);
  const { redirectUrl, providerRef } = await impl.createPayment({
    intentId: intent.id,
    returnToken,
    amount,
    currency: "EGP",
    userId,
    locale,
    baseUrl,
    providerConfig: providerRuntime,
  });

  await prisma.walletPaymentIntent.update({
    where: { id: intent.id },
    data: {
      providerRef: providerRef ?? null,
      status: AWAITING,
    },
  });

  return {
    intentId: intent.id,
    returnToken,
    redirectUrl,
    provider,
    amount,
    currency: "EGP",
  };
}

export async function completeWalletTopUpIntent(params: {
  intentId: string;
  returnToken: string;
  userId: string;
}) {
  const { intentId, returnToken, userId } = params;

  return prisma.$transaction(async (tx) => {
    const intent = await tx.walletPaymentIntent.findUnique({
      where: { id: intentId },
    });
    if (!intent || intent.userId !== userId) {
      throw new Error("NOT_FOUND");
    }
    if (intent.returnToken !== returnToken) {
      throw new Error("INVALID_TOKEN");
    }

    if (intent.status === "SUCCEEDED") {
      const w = await tx.wallet.findUnique({
        where: { userId: intent.userId },
        select: { balance: true },
      });
      return {
        duplicate: true as const,
        amount: Number(intent.amount),
        newBalance: w?.balance ?? new Prisma.Decimal(0),
        currency: intent.currency,
      };
    }

    if (intent.status === "FAILED") {
      throw new Error("INTENT_FAILED");
    }

    const providerId = intent.provider;
    if (!isPaymentProviderId(providerId)) {
      throw new Error("BAD_PROVIDER");
    }
    const impl = getPaymentProvider(providerId);
    const secrets = await getVerifySecretsForProvider(providerId);
    const verify = await impl.verifyPayment({
      intentId: intent.id,
      providerRef: intent.providerRef,
      secrets,
    });
    if (!verify.ok) {
      await tx.walletPaymentIntent.update({
        where: { id: intentId },
        data: { status: "FAILED" },
      });
      throw new Error(verify.reason || "VERIFY_FAILED");
    }

    const lock = await tx.walletPaymentIntent.updateMany({
      where: {
        id: intentId,
        userId,
        returnToken,
        status: { in: ["PENDING", AWAITING] },
      },
      data: { status: "PROCESSING" },
    });

    if (lock.count === 0) {
      const cur = await tx.walletPaymentIntent.findUnique({ where: { id: intentId } });
      if (cur?.status === "SUCCEEDED") {
        const w = await tx.wallet.findUnique({
          where: { userId: intent.userId },
          select: { balance: true },
        });
        return {
          duplicate: true as const,
          amount: Number(intent.amount),
          newBalance: w?.balance ?? new Prisma.Decimal(0),
          currency: intent.currency,
        };
      }
      throw new Error("CONFLICT");
    }

    const w = await applyWalletRechargeInTransaction(tx, intent.userId, Number(intent.amount), {
      paymentProvider: intent.provider,
      paymentIntentId: intent.id,
    });

    await tx.walletPaymentIntent.update({
      where: { id: intentId },
      data: { status: "SUCCEEDED" },
    });

    return {
      duplicate: false as const,
      amount: Number(intent.amount),
      newBalance: w.balance,
      currency: intent.currency,
    };
  });
}

export async function getIntentSummaryForUser(params: {
  intentId: string;
  returnToken: string;
  userId: string;
}) {
  const intent = await prisma.walletPaymentIntent.findFirst({
    where: {
      id: params.intentId,
      returnToken: params.returnToken,
      userId: params.userId,
    },
  });
  if (!intent) return null;
  const wallet = await getOrCreateWallet(intent.userId);
  return {
    status: intent.status,
    amount: Number(intent.amount),
    currency: intent.currency,
    provider: intent.provider,
    newBalance: Number(wallet.balance),
  };
}
