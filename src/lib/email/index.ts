/**
 * Transactional email module (Resend-first, SMTP fallback).
 *
 * @example Vercel / production (.env)
 * RESEND_API_KEY=re_xxxxxxxx
 * RESEND_FROM_EMAIL="RealEstateTV <onboarding@resend.dev>"  // or your verified domain
 * # Optional fallback display if you only set EMAIL_FROM:
 * # EMAIL_FROM=noreply@yourdomain.com
 */

export {
  allowUnconfiguredEmail,
  getEmailTransportConfig,
  isTransactionalEmailConfigured,
  validateEmailEnvironment,
  type EmailConfigResult,
  type EmailTransportConfig,
  type ResendConfig,
  type SmtpConfig,
} from "./config";

export {
  sendEmail,
  sendOtpEmail,
  sendRegistrationOtpEmail,
  sendTransactionalEmail,
  type SendEmailParams,
} from "./send";

export { buildRegistrationOtpEmail } from "./templates";
