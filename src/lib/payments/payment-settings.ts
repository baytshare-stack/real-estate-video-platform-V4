import prisma from "@/lib/prisma";
import type { PaymentProviderId } from "./types";
import { isPaymentProviderId } from "./types";

const ALL: PaymentProviderId[] = ["cashier", "paymob", "stripe", "mock"];

export type ProviderConfigDTO = {
  provider: PaymentProviderId;
  enabled: boolean;
  publicKey: string;
  callbackUrl: string;
  hasSecret: boolean;
};

export type StudioPaymentConfig = {
  defaultProvider: PaymentProviderId;
  providers: { id: PaymentProviderId; enabled: boolean; ready: boolean }[];
};

function envStripeSecret() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

function envPaymobSecret() {
  return process.env.PAYMOB_HMAC_SECRET?.trim() || "";
}

/** Stripe/Paymob need a secret (DB or env). Cashier/mock need only enabled (internal checkout works without keys). */
export function isProviderReadyForCheckout(
  id: PaymentProviderId,
  row: { enabled: boolean; secretKey: string | null; callbackUrl: string | null } | null
): boolean {
  if (!row?.enabled) return false;
  if (id === "mock" || id === "cashier") return true;
  if (id === "stripe") {
    return !!(row.secretKey?.trim() || envStripeSecret());
  }
  if (id === "paymob") {
    return !!(row.secretKey?.trim() || envPaymobSecret());
  }
  return false;
}

export async function ensurePaymentProviderRows() {
  await prisma.paymentGatewaySettings.upsert({
    where: { id: "default" },
    create: { id: "default", defaultProvider: "mock" },
    update: {},
  });
  for (const p of ALL) {
    await prisma.paymentProviderConfig.upsert({
      where: { provider: p },
      create: { provider: p, enabled: p === "mock" },
      update: {},
    });
  }
}

export async function loadPaymentSettingsBundle() {
  await ensurePaymentProviderRows();
  const [gateway, rows] = await Promise.all([
    prisma.paymentGatewaySettings.findUnique({ where: { id: "default" } }),
    prisma.paymentProviderConfig.findMany(),
  ]);
  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  const get = (id: PaymentProviderId) => byProvider.get(id) ?? null;

  let defaultProvider: PaymentProviderId = "mock";
  const raw = gateway?.defaultProvider?.trim().toLowerCase() ?? "";
  if (raw && isPaymentProviderId(raw)) defaultProvider = raw;

  const row = get(defaultProvider);
  if (!isProviderReadyForCheckout(defaultProvider, row)) {
    const fallback = ALL.find((id) => {
      const r = get(id);
      return isProviderReadyForCheckout(id, r);
    });
    if (fallback) defaultProvider = fallback;
  }

  return { gateway, rows, byProvider: get, defaultProvider };
}

export async function getStudioPaymentConfig(): Promise<StudioPaymentConfig> {
  const { byProvider, defaultProvider } = await loadPaymentSettingsBundle();
  return {
    defaultProvider,
    providers: ALL.map((id) => {
      const r = byProvider(id);
      return {
        id,
        enabled: !!r?.enabled,
        ready: isProviderReadyForCheckout(id, r),
      };
    }),
  };
}

export type ProviderRuntimeSecrets = {
  publicKey: string | null;
  secretKey: string | null;
  callbackUrl: string | null;
};

export async function getProviderRuntimeSecrets(id: PaymentProviderId): Promise<ProviderRuntimeSecrets> {
  await ensurePaymentProviderRows();
  const r = await prisma.paymentProviderConfig.findUnique({ where: { provider: id } });
  return {
    publicKey: r?.publicKey?.trim() ? r.publicKey : null,
    secretKey: r?.secretKey?.trim() ? r.secretKey : null,
    callbackUrl: r?.callbackUrl?.trim() ? r.callbackUrl : null,
  };
}

export async function assertProviderCanStartCheckout(id: PaymentProviderId): Promise<ProviderRuntimeSecrets> {
  await ensurePaymentProviderRows();
  const row = await prisma.paymentProviderConfig.findUnique({ where: { provider: id } });
  if (!row?.enabled) {
    throw new Error("PROVIDER_DISABLED");
  }
  if (!isProviderReadyForCheckout(id, row)) {
    throw new Error("PROVIDER_NOT_CONFIGURED");
  }
  return {
    publicKey: row?.publicKey?.trim() ? row.publicKey : null,
    secretKey: row?.secretKey?.trim() ? row.secretKey : null,
    callbackUrl: row?.callbackUrl?.trim() ? row.callbackUrl : null,
  };
}

export async function getVerifySecretsForProvider(id: PaymentProviderId): Promise<{
  stripeSecret?: string;
  paymobSecret?: string;
}> {
  const row = await prisma.paymentProviderConfig.findUnique({ where: { provider: id } });
  const dbSecret = row?.secretKey?.trim() || "";
  if (id === "stripe") {
    return { stripeSecret: dbSecret || envStripeSecret() || undefined };
  }
  if (id === "paymob") {
    return { paymobSecret: dbSecret || envPaymobSecret() || undefined };
  }
  return {};
}

export type AdminPaymentProviderPatch = {
  enabled?: boolean;
  publicKey?: string;
  callbackUrl?: string;
  /** Non-empty = set new secret. */
  secretKey?: string;
  clearSecret?: boolean;
};

export async function getAdminPaymentSettingsDTO() {
  await ensurePaymentProviderRows();
  const gateway = await prisma.paymentGatewaySettings.findUnique({ where: { id: "default" } });
  const rows = await prisma.paymentProviderConfig.findMany();
  const by = new Map(rows.map((r) => [r.provider, r]));
  const dp = gateway?.defaultProvider?.trim().toLowerCase() ?? "mock";
  const defaultProvider: PaymentProviderId =
    dp && isPaymentProviderId(dp) ? dp : "mock";

  return {
    defaultProvider,
    providers: ALL.map((id) => {
      const r = by.get(id);
      return {
        id,
        enabled: r?.enabled ?? false,
        publicKey: r?.publicKey ?? "",
        callbackUrl: r?.callbackUrl ?? "",
        hasSecret: !!(r?.secretKey && r.secretKey.length > 0),
      };
    }),
  };
}

export async function saveAdminPaymentSettings(body: {
  defaultProvider?: string;
  providers?: Partial<Record<PaymentProviderId, AdminPaymentProviderPatch>>;
}) {
  await ensurePaymentProviderRows();
  if (body.defaultProvider && isPaymentProviderId(body.defaultProvider.trim().toLowerCase())) {
    await prisma.paymentGatewaySettings.update({
      where: { id: "default" },
      data: { defaultProvider: body.defaultProvider.trim().toLowerCase() },
    });
  }
  const patches = body.providers ?? {};
  for (const id of ALL) {
    const patch = patches[id];
    if (!patch) continue;
    const data: {
      enabled?: boolean;
      publicKey?: string | null;
      callbackUrl?: string | null;
      secretKey?: string | null;
    } = {};
    if (typeof patch.enabled === "boolean") data.enabled = patch.enabled;
    if (typeof patch.publicKey === "string") data.publicKey = patch.publicKey.trim() || null;
    if (typeof patch.callbackUrl === "string") data.callbackUrl = patch.callbackUrl.trim() || null;
    if (patch.clearSecret) data.secretKey = null;
    else if (typeof patch.secretKey === "string" && patch.secretKey.length > 0) {
      data.secretKey = patch.secretKey;
    }
    if (Object.keys(data).length === 0) continue;
    await prisma.paymentProviderConfig.update({
      where: { provider: id },
      data,
    });
  }
}
