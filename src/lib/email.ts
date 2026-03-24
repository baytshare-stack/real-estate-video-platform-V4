import { Resend } from "resend";

const isDev = process.env.NODE_ENV === "development";

/**
 * Send a one-time verification code to the user's email (Resend).
 * In development without RESEND_API_KEY, logs only (caller may still return `otp` in API JSON).
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey) {
    console.info(`[email/otp] (no RESEND_API_KEY) to ${to}: ${otp}`);
    if (!isDev) {
      throw new Error("Email delivery is not configured (set RESEND_API_KEY and RESEND_FROM_EMAIL)");
    }
    return;
  }

  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is required when RESEND_API_KEY is set");
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Your verification code",
    html: `
      <p>Your RealEstateTV verification code is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${otp}</p>
      <p>This code expires in 5 minutes. If you did not request it, you can ignore this email.</p>
    `,
  });

  if (error) {
    console.error("[email/otp] Resend error", error);
    throw new Error(typeof error === "object" && error && "message" in error ? String((error as { message: string }).message) : "Failed to send email");
  }
}
