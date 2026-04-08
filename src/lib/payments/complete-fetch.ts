/** Browser-only: completes wallet top-up with short retries on transient conflicts. */
export async function postWalletPaymentComplete(intentId: string, returnToken: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch("/api/payments/complete", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intentId, returnToken }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        ok?: boolean;
        amount?: number;
        newBalance?: string;
        currency?: string;
        duplicate?: boolean;
      };
      return { ok: true as const, data };
    }
    if (res.status === 409 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      continue;
    }
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false as const, error: err.error || "Payment failed" };
  }
  return { ok: false as const, error: "Payment failed" };
}
