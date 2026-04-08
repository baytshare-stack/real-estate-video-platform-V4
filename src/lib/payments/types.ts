export type PaymentProviderId = "cashier" | "paymob" | "stripe" | "mock";

export type ProviderConfigContext = {
  publicKey?: string | null;
  secretKey?: string | null;
  callbackUrl?: string | null;
};

export type CreatePaymentContext = {
  intentId: string;
  returnToken: string;
  amount: number;
  currency: string;
  userId: string;
  locale: string;
  baseUrl: string;
  /** Resolved from DB (admin) + env fallbacks where applicable. */
  providerConfig?: ProviderConfigContext;
};

export type CreatePaymentResult = {
  redirectUrl: string;
  providerRef?: string;
};

export type VerifyPaymentInput = {
  intentId: string;
  providerRef: string | null;
  /** Raw callback payload for real gateways (HMAC, signature). */
  rawPayload?: unknown;
  /** Secrets from DB / env at verify time (never from client). */
  secrets?: {
    stripeSecret?: string;
    paymobSecret?: string;
  };
};

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createPayment(ctx: CreatePaymentContext): Promise<CreatePaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<{ ok: boolean; reason?: string }>;
  getStatus(providerRef: string): Promise<"pending" | "succeeded" | "failed">;
}

export function isPaymentProviderId(v: string): v is PaymentProviderId {
  return v === "cashier" || v === "paymob" || v === "stripe" || v === "mock";
}
