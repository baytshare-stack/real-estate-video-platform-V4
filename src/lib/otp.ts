import bcrypt from "bcryptjs";
import crypto from "crypto";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const PHONE_LOGIN_TOKEN_TTL_MS = 3 * 60 * 1000;

export function generateNumericOtp(length = 6): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, 8);
}

export async function verifyOtpAgainstHash(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function generateLoginToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Deliver OTP via SMS or WhatsApp-style webhook. Configure:
 * - OTP_DELIVERY_WEBHOOK_URL: POST JSON { to, code, channel: "sms"|"whatsapp" }
 * - Or logs to server console in development.
 */
export async function deliverOtp(params: {
  toE164: string;
  code: string;
  channel: "sms" | "whatsapp";
}): Promise<void> {
  const webhook = process.env.OTP_DELIVERY_WEBHOOK_URL?.trim();
  if (webhook) {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: params.toE164,
        code: params.code,
        channel: params.channel,
      }),
    });
    if (!res.ok) {
      console.error("[otp] webhook failed", res.status, await res.text().catch(() => ""));
    }
    return;
  }

  console.info(
    `[otp] ${params.channel.toUpperCase()} to ${params.toE164}: ${params.code} (set OTP_DELIVERY_WEBHOOK_URL for production)`
  );
}
