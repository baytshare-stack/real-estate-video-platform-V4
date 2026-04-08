import type { CreatePaymentContext, CreatePaymentResult, PaymentProvider, VerifyPaymentInput } from "../types";

/**
 * Stripe placeholder: hosted checkout simulation until STRIPE_SECRET_KEY + Checkout is wired.
 * Real implementation would create Checkout Session and return session.url.
 */
export const stripePaymentProvider: PaymentProvider = {
  id: "stripe",
  async createPayment(ctx: CreatePaymentContext): Promise<CreatePaymentResult> {
    const q = new URLSearchParams({
      intentId: ctx.intentId,
      token: ctx.returnToken,
      provider: "stripe",
    });
    const sessionId = `stripe_sim_${ctx.intentId}`;
    return {
      redirectUrl: `${ctx.baseUrl}/${ctx.locale}/payment/checkout?${q.toString()}`,
      providerRef: sessionId,
    };
  },
  async verifyPayment(input: VerifyPaymentInput) {
    const hookOrApiSecret =
      input.secrets?.stripeSecret || process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_SECRET_KEY;
    if (hookOrApiSecret && input.rawPayload) {
      // Future: stripe.webhooks.constructEvent(...)
      return { ok: true };
    }
    return { ok: false, reason: "stripe_unverified" };
  },
  async getStatus(providerRef: string) {
    if (providerRef.startsWith("stripe_sim_")) return "pending";
    return "pending";
  },
};
