/**
 * Email environment validation and typed config for Resend (preferred) or SMTP fallback.
 * No secrets are logged; only missing variable *names* are returned.
 */

export type ResendConfig = {
  provider: "resend";
  apiKey: string;
  /** Must be a verified sender in Resend (e.g. RealEstate <noreply@yourdomain.com>) */
  from: string;
};

export type SmtpConfig = {
  provider: "smtp";
  from: string;
  transport: "email_server" | "gmail_style";
};

export type EmailTransportConfig = ResendConfig | SmtpConfig;

export type EmailConfigResult =
  | { ok: true; config: EmailTransportConfig }
  | { ok: false; missing: string[] };

/**
 * Resolves which email backend is active. Resend wins when RESEND_API_KEY is set.
 */
export function getEmailTransportConfig(): EmailConfigResult {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const from =
      process.env.RESEND_FROM_EMAIL?.trim() || process.env.EMAIL_FROM?.trim();
    if (!from) {
      return {
        ok: false,
        missing: [
          "RESEND_FROM_EMAIL (recommended) or EMAIL_FROM — required with RESEND_API_KEY; must match a verified domain in Resend",
        ],
      };
    }
    return { ok: true, config: { provider: "resend", apiKey: resendKey, from } };
  }

  const emailServer = process.env.EMAIL_SERVER?.trim();
  const emailFrom = process.env.EMAIL_FROM?.trim();
  const emailPassword = process.env.EMAIL_PASSWORD?.trim();

  if (emailServer) {
    if (!emailFrom) {
      return {
        ok: false,
        missing: ["EMAIL_FROM — required when using EMAIL_SERVER"],
      };
    }
    return {
      ok: true,
      config: { provider: "smtp", from: emailFrom, transport: "email_server" },
    };
  }

  if (emailFrom && emailPassword) {
    return {
      ok: true,
      config: { provider: "smtp", from: emailFrom, transport: "gmail_style" },
    };
  }

  return {
    ok: false,
    missing: [
      "RESEND_API_KEY + RESEND_FROM_EMAIL (or EMAIL_FROM), or",
      "EMAIL_SERVER + EMAIL_FROM, or",
      "EMAIL_FROM + EMAIL_PASSWORD",
    ],
  };
}

/** True when sendEmail() can run without throwing a configuration error first. */
export function isTransactionalEmailConfigured(): boolean {
  return getEmailTransportConfig().ok;
}

/**
 * When true, registration/OTP may skip sending and return OTP in API JSON (dev / staging only).
 */
export function allowUnconfiguredEmail(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return process.env.ALLOW_UNCONFIGURED_EMAIL === "true";
}

/**
 * Validate env for production deployments (e.g. Vercel). Safe to call from a health route or logs.
 * Does not expose secret values.
 */
export function validateEmailEnvironment(): {
  ready: boolean;
  provider: "resend" | "smtp" | "none";
  issues: string[];
} {
  const result = getEmailTransportConfig();
  if (!result.ok) {
    return { ready: false, provider: "none", issues: result.missing };
  }
  if (result.config.provider === "resend") {
    return { ready: true, provider: "resend", issues: [] };
  }
  return { ready: true, provider: "smtp", issues: [] };
}
