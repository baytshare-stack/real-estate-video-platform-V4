import type { PaymentProvider, PaymentProviderId } from "./types";
import { isPaymentProviderId } from "./types";
import { cashierPaymentProvider } from "./providers/cashier";
import { paymobPaymentProvider } from "./providers/paymob";
import { stripePaymentProvider } from "./providers/stripe";
import { mockPaymentProvider } from "./providers/mock";

const providers: Record<PaymentProviderId, PaymentProvider> = {
  cashier: cashierPaymentProvider,
  paymob: paymobPaymentProvider,
  stripe: stripePaymentProvider,
  mock: mockPaymentProvider,
};

/** Default from PAYMENT_PROVIDER env; falls back to mock for safe local dev. */
export function getDefaultPaymentProviderId(): PaymentProviderId {
  const raw = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (raw && isPaymentProviderId(raw)) return raw;
  return "mock";
}

export function getPaymentProvider(id: PaymentProviderId): PaymentProvider {
  return providers[id];
}
