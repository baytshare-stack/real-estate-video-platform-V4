"use client";

import { useEffect, useState } from "react";
import { getProviders, getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import LocaleLink from "@/components/LocaleLink";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useLocalizedPath } from "@/i18n/navigation";

function mapSignInError(raw: string | undefined, t: (a: string, b?: string) => string): string {
  if (!raw) return t("errors", "generic");
  if (raw === "CredentialsSignin" || raw === "credentials") return t("errors", "invalidCredentials");
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const localizedPath = useLocalizedPath();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codeEmail, setCodeEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [codeStep, setCodeStep] = useState<"enter" | "otp">("enter");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [showFacebook, setShowFacebook] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);

  useEffect(() => {
    getProviders().then((p) => {
      setShowFacebook(Boolean(p?.facebook));
      setShowGoogle(Boolean(p?.google));
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("error");
    if (q === "GoogleAccountNotEligible") {
      setError(t("auth", "googleNotEligible"));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [t]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(mapSignInError(res.error, t));
      } else {
        await router.refresh();
        const session = await getSession();
        const role = session?.user?.role;
        router.push(role === "ADMIN" || role === "SUPER_ADMIN" ? "/studio" : "/");
      }
    } catch {
      setError(t("auth", "unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = codeEmail.trim().toLowerCase();
    if (!em) {
      setError(t("auth", "enterEmail"));
      return;
    }
    setCodeLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "login", email: em }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("auth", "couldNotSendCode"));
        return;
      }
      setCodeStep("otp");
      if (process.env.NODE_ENV === "development" && data.otp) {
        console.info("[dev] login OTP:", data.otp);
      }
    } catch {
      setError(t("auth", "couldNotSendCode"));
    } finally {
      setCodeLoading(false);
    }
  };

  const handleEmailOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeLoading(true);
    setError("");
    const em = codeEmail.trim().toLowerCase();
    try {
      const res = await fetch("/api/auth/otp/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, code: emailOtp.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("auth", "invalidCode"));
        setCodeLoading(false);
        return;
      }

      const sign = await signIn("phone-login", {
        redirect: false,
        email: em,
        loginToken: data.loginToken,
      });

      if (sign?.error) {
        setError(mapSignInError(sign.error, t));
        setCodeLoading(false);
        return;
      }

      await router.refresh();
      const session = await getSession();
      const role = session?.user?.role;
      router.push(
        localizedPath(role === "ADMIN" || role === "SUPER_ADMIN" ? "/studio" : "/")
      );
    } catch {
      setError(t("auth", "unexpectedError"));
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-2xl font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            R
          </div>
          <h1 className="text-2xl font-bold text-white">{t("auth", "loginTitle")}</h1>
          <p className="mt-2 text-gray-400">{t("auth", "loginSubtitleBrand")}</p>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">{t("auth", "email")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:outline-none"
              placeholder={t("auth", "emailPlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">{t("auth", "password")}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:outline-none"
              placeholder={t("auth", "passwordPlaceholder")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? t("auth", "signingIn") : t("auth", "signIn")}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="h-px flex-1 bg-gray-800" />
          <span className="text-sm font-medium text-gray-500">{t("auth", "orEmailCode")}</span>
          <div className="h-px flex-1 bg-gray-800" />
        </div>

        {codeStep === "enter" ? (
          <form onSubmit={handleSendEmailOtp} className="mt-6 flex flex-col gap-3">
            <label className="mb-1 block text-sm font-medium text-gray-400">{t("auth", "signInWithCode")}</label>
            <p className="text-xs text-gray-500">{t("auth", "codeHelp")}</p>
            <input
              type="email"
              value={codeEmail}
              onChange={(e) => setCodeEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:outline-none"
              placeholder={t("auth", "emailPlaceholder")}
            />
            <button
              type="submit"
              disabled={codeLoading}
              className="w-full rounded-xl bg-gray-800 py-2.5 font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
            >
              {codeLoading ? t("auth", "sending") : t("auth", "sendCode")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailOtpSubmit} className="mt-6 flex flex-col gap-3">
            <label className="mb-1 block text-sm font-medium text-gray-400">{t("auth", "enterCode")}</label>
            <p className="text-xs text-gray-500">{t("auth", "codeSentHint")}</p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-xl border border-gray-700 bg-black/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:outline-none"
              placeholder={t("auth", "otpPlaceholder")}
            />
            <button
              type="submit"
              disabled={codeLoading}
              className="w-full rounded-xl bg-gray-800 py-2.5 font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
            >
              {codeLoading ? t("auth", "signingIn") : t("auth", "verifySignIn")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCodeStep("enter");
                setEmailOtp("");
                setError("");
              }}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {t("auth", "differentEmail")}
            </button>
          </form>
        )}

        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="h-px flex-1 bg-gray-800" />
          <span className="text-sm font-medium text-gray-500">{t("auth", "orContinueWith")}</span>
          <div className="h-px flex-1 bg-gray-800" />
        </div>

        <div className={`mt-6 flex gap-4 ${showGoogle && showFacebook ? "" : "flex-col"}`}>
          {showGoogle ? (
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: localizedPath("/auth/post-login") })}
              className={`${showFacebook ? "flex-1" : "w-full"} flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 font-semibold text-black transition-colors hover:bg-gray-100`}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                />
              </svg>
              {t("auth", "signInWithGoogle")}
            </button>
          ) : null}
          {showFacebook ? (
            <button
              type="button"
              onClick={() => signIn("facebook", { callbackUrl: localizedPath("/auth/post-login") })}
              className={`${showGoogle ? "flex-1" : "w-full"} flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-800 py-2.5 font-semibold text-white transition-colors hover:bg-gray-700`}
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              {t("auth", "signInWithFacebook")}
            </button>
          ) : null}
        </div>

        <p className="mt-8 text-center text-sm text-gray-400">
          {t("auth", "noAccount")}{" "}
          <LocaleLink href="/register" className="font-medium text-blue-500 hover:text-blue-400">
            {t("auth", "createOne")}
          </LocaleLink>
        </p>
      </div>
    </div>
  );
}
