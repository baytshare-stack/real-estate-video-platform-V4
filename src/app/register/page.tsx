"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getProviders, signIn } from "next-auth/react";
import { COUNTRIES, getCountryByIso, buildFullPhoneNumber } from "@/lib/countriesData";
import { useTranslation } from "@/i18n/LanguageProvider";

type RoleValue = "user" | "agent" | "agency";

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

function mapSignInError(raw: string | undefined, t: (a: string, b?: string) => string): string {
  if (!raw) return t("errors", "generic");
  if (raw === "CredentialsSignin" || raw === "credentials") return t("errors", "invalidCredentials");
  return raw;
}

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user" as RoleValue,
    countryIso: "",
    phoneNational: "",
    whatsapp: "",
  });
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);

  useEffect(() => {
    void getProviders().then((p) => setShowGoogle(Boolean(p?.google)));
  }, []);

  const phoneRequired = formData.role === "agent" || formData.role === "agency";
  const country = getCountryByIso(formData.countryIso);
  const wantsPhone =
    phoneRequired || Boolean(formData.phoneNational.trim()) || Boolean(formData.whatsapp.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (phoneRequired && !formData.phoneNational.trim()) {
      setError(t("auth", "phoneRequiredAgent"));
      setLoading(false);
      return;
    }

    if (wantsPhone && !formData.countryIso) {
      setError(t("auth", "selectCountryPhone"));
      setLoading(false);
      return;
    }

    try {
      const fullPhone =
        formData.countryIso && formData.phoneNational.trim()
          ? buildFullPhoneNumber(formData.countryIso, formData.phoneNational)
          : null;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          countryIso: formData.countryIso || undefined,
          phoneNational: formData.phoneNational,
          whatsapp: formData.whatsapp,
          fullPhoneNumber: fullPhone || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const hint = typeof data.hint === "string" ? data.hint : "";
        const base =
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : t("auth", "registrationFailed");
        setError(hint ? `${base}\n${hint}` : base);
        setLoading(false);
        return;
      }

      if (data.needsOtp) {
        const inlineOtp = typeof data.otp === "string" ? data.otp : "";
        setSuccess(
          inlineOtp
            ? t("auth", "otpDevHint").replace("{{code}}", inlineOtp)
            : t("auth", "otpSent")
        );
        setStep("otp");
        setLoading(false);
        if (inlineOtp) {
          console.info("[register] OTP from API:", inlineOtp);
        }
        return;
      }

      setSuccess(t("auth", "accountCreated"));
      const sign = await signIn("credentials", {
        redirect: false,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (sign?.error) {
        setSuccess("");
        setError(t("auth", "registeredSignInFailed"));
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      const isAgentOrAgency = formData.role === "agent" || formData.role === "agency";
      router.push(isAgentOrAgency ? "/create-channel" : "/profile");
      router.refresh();
    } catch {
      setError(t("auth", "unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "register",
          email: formData.email.trim().toLowerCase(),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof d.error === "string" ? d.error : t("auth", "couldNotResendCode"));
        return;
      }
      if (typeof d.otp === "string") {
        console.info("[register] resent OTP from API:", d.otp);
        setSuccess(t("auth", "otpNewDev").replace("{{code}}", d.otp));
      } else {
        setSuccess(t("auth", "otpResentEmail"));
      }
    } catch {
      setError(t("auth", "couldNotResendCode"));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/verify-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          code: otpCode.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("auth", "verifyFailed"));
        setOtpLoading(false);
        return;
      }

      const sign = await signIn("credentials", {
        redirect: false,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (sign?.error) {
        setError(mapSignInError(sign.error, t) || t("auth", "signInAfterVerifyFailed"));
        setOtpLoading(false);
        return;
      }

      const isAgentOrAgency = formData.role === "agent" || formData.role === "agency";
      router.push(isAgentOrAgency ? "/create-channel" : "/profile");
      router.refresh();
    } catch {
      setError(t("auth", "verifyFailed"));
    } finally {
      setOtpLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="my-8 flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl md:p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white">{t("auth", "verifyEmailHeading")}</h1>
            <p className="mt-2 text-gray-400">{t("auth", "verifyEmailBody")}</p>
          </div>

          {error ? (
            <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mb-6 rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">
              {success}
            </div>
          ) : null}

          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                {t("auth", "verificationCodeLabel")}
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={8}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:outline-none"
                placeholder={t("auth", "otpPlaceholder")}
              />
            </div>
            <button
              type="submit"
              disabled={otpLoading}
              className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {otpLoading ? t("auth", "verifying") : t("auth", "verifyAndContinue")}
            </button>
          </form>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={otpLoading}
            className="mt-4 w-full text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
          >
            {t("auth", "resendCode")}
          </button>

          <p className="mt-8 text-center text-sm text-gray-400">
            <Link href="/login" className="font-medium text-blue-500 hover:text-blue-400">
              {t("auth", "backToSignIn")}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-8 flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl md:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">{t("auth", "registerHeroTitle")}</h1>
          <p className="mt-2 text-gray-400">{t("auth", "registerHeroSubtitle")}</p>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-6 rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">
            {success}
          </div>
        ) : null}

        {showGoogle ? (
          <div className="mb-6 space-y-3">
            <button
              type="button"
              onClick={() =>
                signIn("google", {
                  callbackUrl: "/auth/post-login?from=register",
                })
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 font-semibold text-black transition-colors hover:bg-gray-100"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                />
              </svg>
              {t("auth", "continueWithGoogleNoCode")}
            </button>
            <p className="text-center text-xs text-gray-500">{t("auth", "googleRegisterExplainer")}</p>
            <div className="flex items-center justify-center gap-4">
              <div className="h-px flex-1 bg-gray-800" />
              <span className="text-sm font-medium text-gray-500">{t("auth", "orRegisterWithEmail")}</span>
              <div className="h-px flex-1 bg-gray-800" />
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                {t("auth", "usernameRequiredLabel")}
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                {t("auth", "roleRequiredLabel")}
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as RoleValue })}
                className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:outline-none"
              >
                <option value="user">{t("auth", "roleUser")}</option>
                <option value="agent">{t("auth", "roleAgent")}</option>
                <option value="agency">{t("auth", "roleAgency")}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              {t("auth", "emailRequiredLabel")}
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              {t("auth", "passwordRequiredLabel")}
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              {t("auth", "country")} {wantsPhone ? "*" : t("auth", "countryOptionalForPhone")}
            </label>
            <select
              required={wantsPhone}
              value={formData.countryIso}
              onChange={(e) => setFormData({ ...formData, countryIso: e.target.value })}
              className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:outline-none"
            >
              <option value="">{t("auth", "selectCountry")}</option>
              {COUNTRIES.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.flag} {c.name} ({c.phoneCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              {t("auth", "phone")} {phoneRequired ? "*" : t("auth", "fieldOptional")}{" "}
              {country ? <span className="text-gray-500">{country.phoneCode}</span> : null}
            </label>
            <input
              type="tel"
              required={phoneRequired}
              value={formData.phoneNational}
              onChange={(e) =>
                setFormData({ ...formData, phoneNational: digitsOnly(e.target.value) })
              }
              className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:outline-none"
              placeholder={
                phoneRequired ? t("auth", "phoneNationalPlaceholder") : t("auth", "phoneOptionalShort")
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              {t("auth", "whatsapp")} {t("auth", "fieldOptional")}
            </label>
            <input
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:outline-none"
              placeholder={t("auth", "whatsappPlaceholderLong")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? t("auth", "registering") : t("auth", "registerSubmit")}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-400">
          {t("auth", "hasAccount")}{" "}
          <Link href="/login" className="font-medium text-blue-500 hover:text-blue-400">
            {t("auth", "signInShort")}
          </Link>
        </p>
      </div>
    </div>
  );
}
