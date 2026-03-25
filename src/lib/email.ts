import { Resend } from "resend";

const isDev = process.env.NODE_ENV === "development";

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function resolveFromAddress(): string | null {
  const from = process.env.EMAIL_FROM?.trim() || process.env.RESEND_FROM_EMAIL?.trim();
  return from || null;
}

async function sendViaSmtp({ to, subject, html, text }: MailPayload): Promise<void> {
  const emailServer = process.env.EMAIL_SERVER?.trim();
  const from = resolveFromAddress();
  if (!emailServer || !from) {
    throw new Error("SMTP is not configured (EMAIL_SERVER / EMAIL_FROM)");
  }

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport(emailServer);
  const info = await transport.sendMail({ to, from, subject, html, text });

  // If every recipient is rejected, treat as failure.
  if (Array.isArray(info.rejected) && info.rejected.length > 0 && (!info.accepted || info.accepted.length === 0)) {
    throw new Error(`SMTP rejected recipient(s): ${info.rejected.join(", ")}`);
  }
}

async function sendViaResend({ to, subject, html, text }: MailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveFromAddress();
  if (!apiKey || !from) {
    throw new Error("Resend is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)");
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) {
    throw new Error(
      typeof error === "object" && error && "message" in error
        ? String((error as { message: string }).message)
        : "Resend failed to send email"
    );
  }
}

export async function sendTransactionalEmail(payload: MailPayload): Promise<void> {
  const smtpConfigured = Boolean(process.env.EMAIL_SERVER?.trim() && resolveFromAddress());
  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim() && resolveFromAddress());

  const failures: string[] = [];

  if (smtpConfigured) {
    try {
      await sendViaSmtp(payload);
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown SMTP error";
      failures.push(`smtp: ${msg}`);
      console.error("[email] SMTP send failed", { to: payload.to, error: msg });
    }
  }

  if (resendConfigured) {
    try {
      await sendViaResend(payload);
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown Resend error";
      failures.push(`resend: ${msg}`);
      console.error("[email] Resend send failed", { to: payload.to, error: msg });
    }
  }

  if (isDev) {
    console.info("[email] no provider available in development; payload:", {
      to: payload.to,
      subject: payload.subject,
    });
    return;
  }

  throw new Error(
    failures.length
      ? `Email delivery failed (${failures.join(" | ")})`
      : "Email delivery is not configured (set EMAIL_SERVER/EMAIL_FROM or RESEND_API_KEY/RESEND_FROM_EMAIL)"
  );
}

/**
 * Send one-time verification code.
 * Uses SMTP (EMAIL_SERVER/EMAIL_FROM) in production by default, with Resend fallback.
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  await sendTransactionalEmail({
    to,
    subject: "Your verification code",
    text: `Your RealEstateTV verification code is: ${otp}. It expires in 5 minutes.`,
    html: `
      <p>Your RealEstateTV verification code is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${otp}</p>
      <p>This code expires in 5 minutes. If you did not request it, you can ignore this email.</p>
    `,
  });
}
