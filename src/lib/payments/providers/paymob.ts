import type { CreatePaymentContext, CreatePaymentResult, PaymentProvider, VerifyPaymentInput } from "../types";

/**
 * Paymob placeholder: same simulated checkout as Stripe until PAYMOB_HMAC + iframe/API is integrated.
 */
export const paymobPaymentProvider: PaymentProvider = {
  id: "paymob",
  async createPayment(ctx: CreatePaymentContext): Promise<CreatePaymentResult> {
    const q = new URLSearchParams({
      intentId: ctx.intentId,
      token: ctx.returnToken,
      provider: "paymob",
    });
    return {
      redirectUrl: `${ctx.baseUrl}/${ctx.locale}/payment/checkout?${q.toString()}`,
      providerRef: `paymob_${ctx.intentId}`,
    };
  },
  async verifyPayment(input: VerifyPaymentInput) {
    const hmac = input.secrets?.paymobSecret || process.env.PAYMOB_HMAC_SECRET;
    if (input.rawPayload && hmac) {
      return { ok: true };
    }
    if (input.providerRef?.startsWith("paymob_")) {
      return { ok: true };
    }
    return { ok: false, reason: "paymob_unverified" };
  },
  async getStatus() {
    return "pending" as const;
  },
};
