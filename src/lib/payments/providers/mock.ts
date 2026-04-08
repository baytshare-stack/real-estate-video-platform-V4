import type { CreatePaymentContext, CreatePaymentResult, PaymentProvider, VerifyPaymentInput } from "../types";

/**
 * Mock: /payment/mock simulates checkout, then client completes via /api/payments/complete.
 */
export const mockPaymentProvider: PaymentProvider = {
  id: "mock",
  async createPayment(ctx: CreatePaymentContext): Promise<CreatePaymentResult> {
    const q = new URLSearchParams({
      intentId: ctx.intentId,
      token: ctx.returnToken,
    });
    return {
      redirectUrl: `${ctx.baseUrl}/${ctx.locale}/payment/mock?${q.toString()}`,
      providerRef: `mock_${ctx.intentId}`,
    };
  },
  async verifyPayment(_input: VerifyPaymentInput) {
    return { ok: true };
  },
  async getStatus() {
    return "succeeded" as const;
  },
};
