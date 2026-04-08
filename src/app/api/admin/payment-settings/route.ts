import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from "@/lib/admin-jwt";
import {
  getAdminPaymentSettingsDTO,
  saveAdminPaymentSettings,
  type AdminPaymentProviderPatch,
} from "@/lib/payments/payment-settings";
import { isPaymentProviderId, type PaymentProviderId } from "@/lib/payments/types";

export const runtime = "nodejs";

async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return token ? await verifyAdminToken(token) : null;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = await getAdminPaymentSettingsDTO();
    return NextResponse.json(data);
  } catch (e) {
    console.error("admin payment-settings GET", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const defaultProviderRaw = body.defaultProvider;
  const defaultProvider =
    typeof defaultProviderRaw === "string" ? defaultProviderRaw.trim().toLowerCase() : undefined;

  const providersIn = body.providers;
  const providers: Partial<Record<PaymentProviderId, AdminPaymentProviderPatch>> = {};
  if (providersIn && typeof providersIn === "object" && !Array.isArray(providersIn)) {
    for (const [k, v] of Object.entries(providersIn as Record<string, unknown>)) {
      if (!isPaymentProviderId(k) || !v || typeof v !== "object" || Array.isArray(v)) continue;
      const p = v as Record<string, unknown>;
      const patch: AdminPaymentProviderPatch = {};
      if (typeof p.enabled === "boolean") patch.enabled = p.enabled;
      if (typeof p.publicKey === "string") patch.publicKey = p.publicKey;
      if (typeof p.callbackUrl === "string") patch.callbackUrl = p.callbackUrl;
      if (typeof p.secretKey === "string") patch.secretKey = p.secretKey;
      if (typeof p.clearSecret === "boolean") patch.clearSecret = p.clearSecret;
      providers[k as PaymentProviderId] = patch;
    }
  }

  try {
    await saveAdminPaymentSettings({
      defaultProvider: defaultProvider && isPaymentProviderId(defaultProvider) ? defaultProvider : undefined,
      providers: Object.keys(providers).length ? providers : undefined,
    });
    const data = await getAdminPaymentSettingsDTO();
    return NextResponse.json(data);
  } catch (e) {
    console.error("admin payment-settings PATCH", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
