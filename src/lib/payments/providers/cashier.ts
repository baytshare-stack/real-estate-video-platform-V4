import type { CreatePaymentContext, CreatePaymentResult, PaymentProvider, VerifyPaymentInput } from "../types";

/**
 * Cashier / bank redirect placeholder. Set CASHIER_CHECKOUT_URL_TEMPLATE with {{amount}}, {{currency}}, {{ref}} for real redirect.
 */
export const cashierPaymentProvider: PaymentProvider = {
  id: "cashier",
  async createPayment(ctx: CreatePaymentContext): Promise<CreatePaymentResult> {
    const template =
      process.env.CASHIER_CHECKOUT_URL_TEMPLATE?.trim() || ctx.providerConfig?.callbackUrl?.trim();
    if (template) {
      const url = template
        .replace(/\{\{amount\}\}/g, String(ctx.amount))
        .replace(/\{\{currency\}\}/g, ctx.currency)
        .replace(/\{\{ref\}\}/g, ctx.intentId);
      return { redirectUrl: url, providerRef: ctx.intentId };
    }
    const q = new URLSearchParams({
      intentId: ctx.intentId,
      token: ctx.returnToken,
      provider: "cashier",
    });
    return {
      redirectUrl: `${ctx.baseUrl}/${ctx.locale}/payment/checkout?${q.toString()}`,
      providerRef: `cashier_${ctx.intentId}`,
    };
  },
  async verifyPayment(input: VerifyPaymentInput) {
    // Strict mode: never auto-success from local providerRef; require verified callback payload.
    if (input.rawPayload && input.providerRef) {
      return { ok: true };
    }
    return { ok: false, reason: "cashier_unverified" };
  },
  async getStatus() {
    return "pending" as const;
  },
};
