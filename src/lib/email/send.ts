import nodemailer from "nodemailer";
import { Resend } from "resend";
import type { ResendConfig, SmtpConfig } from "./config";
import { getEmailTransportConfig } from "./config";
import { buildRegistrationOtpEmail } from "./templates";

export type SendEmailParams = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

let resendSingleton: Resend | null = null;

function getResendClient(apiKey: string): Resend {
  if (!resendSingleton) {
    resendSingleton = new Resend(apiKey);
  }
  return resendSingleton;
}

function parseEmailServer(): string | Record<string, unknown> | undefined {
  const raw = process.env.EMAIL_SERVER?.trim();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return raw;
  }
}

function createNodemailerTransporter(config: SmtpConfig) {
  if (config.transport === "email_server") {
    const parsed = parseEmailServer();
    if (!parsed) {
      throw new Error("EMAIL_SERVER is set but empty after trim");
    }
    return nodemailer.createTransport(
      parsed as Parameters<typeof nodemailer.createTransport>[0]
    );
  }
  const user = process.env.EMAIL_FROM?.trim();
  const pass = process.env.EMAIL_PASSWORD;
  if (!user || !pass) {
    throw new Error("EMAIL_FROM and EMAIL_PASSWORD are required for SMTP");
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user, pass },
  });
}

async function sendWithResend(
  cfg: ResendConfig,
  params: SendEmailParams
): Promise<void> {
  const resend = getResendClient(cfg.apiKey);
  const hasHtml = Boolean(params.html?.trim());
  const hasText = Boolean(params.text?.trim());
  const { error } = hasHtml
    ? await resend.emails.send({
        from: cfg.from,
        to: params.to,
        subject: params.subject,
        html: params.html!,
        ...(hasText ? { text: params.text! } : {}),
      })
    : await resend.emails.send({
        from: cfg.from,
        to: params.to,
        subject: params.subject,
        text: params.text!,
      });
  if (error) {
    const msg =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : JSON.stringify(error);
    throw new Error(`Resend API error: ${msg}`);
  }
}

async function sendWithSmtp(
  cfg: SmtpConfig,
  params: SendEmailParams
): Promise<void> {
  const transporter = createNodemailerTransporter(cfg);
  const info = await transporter.sendMail({
    from: `RealEstate <${cfg.from}>`,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
  const rejected = info.rejected?.length ?? 0;
  if (rejected > 0) {
    throw new Error(
      `SMTP rejected recipient(s): ${JSON.stringify(info.rejected)}`
    );
  }
  const accepted = info.accepted?.length ?? 0;
  if (accepted === 0 && !info.messageId) {
    throw new Error("SMTP did not accept any recipients");
  }
}

/**
 * Sends one transactional message using the configured provider (Resend preferred).
 * Throws on misconfiguration or provider failure — callers map to HTTP 503 / rollback.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const toTrim = params.to?.trim();
  if (!toTrim) {
    throw new Error("sendEmail: to is required");
  }
  if (!params.subject?.trim()) {
    throw new Error("sendEmail: subject is required");
  }
  if (!params.text?.trim() && !params.html?.trim()) {
    throw new Error("sendEmail: provide text or html");
  }

  const resolved = getEmailTransportConfig();
  if (!resolved.ok) {
    throw new Error(
      `Email not configured: missing ${resolved.missing.join("; ")}`
    );
  }

  const payload: SendEmailParams = {
    to: toTrim,
    subject: params.subject,
    text: params.text,
    html: params.html,
  };

  if (resolved.config.provider === "resend") {
    await sendWithResend(resolved.config, payload);
    return;
  }
  await sendWithSmtp(resolved.config, payload);
}

/** Registration / resend OTP — single place for subject + body. */
export async function sendRegistrationOtpEmail(
  to: string,
  otpPlain: string
): Promise<void> {
  const { subject, text, html } = buildRegistrationOtpEmail(otpPlain);
  await sendEmail({ to, subject, text, html });
}

export const sendTransactionalEmail = sendEmail;
export const sendOtpEmail = sendRegistrationOtpEmail;
