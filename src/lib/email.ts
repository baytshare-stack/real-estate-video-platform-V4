import nodemailer from "nodemailer";
import { Resend } from "resend";

export type SendEmailParams = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

function parseEmailServer(): string | Record<string, unknown> | undefined {
  const raw = process.env.EMAIL_SERVER?.trim();
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return raw;
  }
}

function createNodemailerTransporter() {
  const parsed = parseEmailServer();
  if (parsed) {
    return nodemailer.createTransport(parsed as Parameters<typeof nodemailer.createTransport>[0]);
  }
  const user = process.env.EMAIL_FROM?.trim();
  const pass = process.env.EMAIL_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "Email not configured: set RESEND_API_KEY, or EMAIL_SERVER, or EMAIL_FROM + EMAIL_PASSWORD"
    );
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user, pass },
  });
}

async function sendWithNodemailer(params: SendEmailParams): Promise<void> {
  const transporter = createNodemailerTransporter();
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    throw new Error("EMAIL_FROM is required for SMTP");
  }
  const info = await transporter.sendMail({
    from: `RealEstate <${from}>`,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
  if (!info?.messageId) {
    throw new Error("SMTP sendMail did not return a message id");
  }
}

async function sendWithResend(params: SendEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY missing");
  }
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || process.env.EMAIL_FROM?.trim();
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL or EMAIL_FROM is required for Resend");
  }
  const resend = new Resend(apiKey);
  const hasHtml = Boolean(params.html?.trim());
  const hasText = Boolean(params.text?.trim());
  const { error } = hasHtml
    ? await resend.emails.send({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html!,
        ...(hasText ? { text: params.text! } : {}),
      })
    : await resend.emails.send({
        from,
        to: params.to,
        subject: params.subject,
        text: params.text!,
      });
  if (error) {
    throw error;
  }
}

/**
 * Sends a single email via Resend (if RESEND_API_KEY) or Nodemailer (SMTP).
 * Throws on failure so callers can handle 503 / rollback.
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
}: SendEmailParams): Promise<void> {
  const toTrim = to?.trim();
  if (!toTrim) {
    throw new Error("sendEmail: to is required");
  }
  if (!subject?.trim()) {
    throw new Error("sendEmail: subject is required");
  }
  if (!text?.trim() && !html?.trim()) {
    throw new Error("sendEmail: provide text or html");
  }

  if (process.env.RESEND_API_KEY?.trim()) {
    await sendWithResend({
      to: toTrim,
      subject,
      text,
      html,
    });
    return;
  }

  await sendWithNodemailer({
    to: toTrim,
    subject,
    text,
    html,
  });
}

export const sendTransactionalEmail = sendEmail;
export const sendOtpEmail = sendEmail;
