"use client";

import { useEffect, useState } from "react";
import { getProviders, getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
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
      setError("Google sign-in is only available for user accounts. Use email and password.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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
        setError(res.error);
      } else {
        await router.refresh();
        const session = await getSession();
        const role = session?.user?.role;
        router.push(role === "ADMIN" || role === "SUPER_ADMIN" ? "/studio" : "/");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = codeEmail.trim().toLowerCase();
    if (!em) {
      setError("Enter your email address");
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
        setError(data.error || "Could not send code");
        return;
      }
      setCodeStep("otp");
      if (process.env.NODE_ENV === "development" && data.otp) {
        console.info("[dev] login OTP:", data.otp);
      }
    } catch {
      setError("Could not send code");
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
        setError(data.error || "Invalid code");
        setCodeLoading(false);
        return;
      }

      const sign = await signIn("phone-login", {
        redirect: false,
        email: em,
        loginToken: data.loginToken,
      });

      if (sign?.error) {
        setError(sign.error);
        setCodeLoading(false);
        return;
      }

      await router.refresh();
      const session = await getSession();
      const role = session?.user?.role;
      router.push(role === "ADMIN" || role === "SUPER_ADMIN" ? "/studio" : "/");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 mx-auto flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            R
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-gray-400 mt-2">Sign in to your RealEstateTV account</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl mt-4 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="h-px bg-gray-800 flex-1"></div>
          <span className="text-gray-500 text-sm font-medium">OR EMAIL CODE</span>
          <div className="h-px bg-gray-800 flex-1"></div>
        </div>

        {codeStep === "enter" ? (
          <form onSubmit={handleSendEmailOtp} className="mt-6 flex flex-col gap-3">
            <label className="block text-sm font-medium text-gray-400 mb-1">Sign in with a code</label>
            <p className="text-xs text-gray-500">
              We&apos;ll send a one-time code to your email (same address as your account).
            </p>
            <input
              type="email"
              value={codeEmail}
              onChange={(e) => setCodeEmail(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="you@example.com"
            />
            <button
              type="submit"
              disabled={codeLoading}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {codeLoading ? "Sending..." : "Send verification code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailOtpSubmit} className="mt-6 flex flex-col gap-3">
            <label className="block text-sm font-medium text-gray-400 mb-1">Enter code</label>
            <p className="text-xs text-gray-500">We sent a code to your email</p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="123456"
            />
            <button
              type="submit"
              disabled={codeLoading}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {codeLoading ? "Signing in..." : "Verify & sign in"}
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
              Use a different email
            </button>
          </form>
        )}

        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="h-px bg-gray-800 flex-1"></div>
          <span className="text-gray-500 text-sm font-medium">OR CONTINUE WITH</span>
          <div className="h-px bg-gray-800 flex-1"></div>
        </div>

        <div className={`mt-6 flex gap-4 ${showGoogle && showFacebook ? "" : "flex-col"}`}>
          {showGoogle ? (
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/auth/post-login" })}
              className={`${showFacebook ? "flex-1" : "w-full"} bg-white hover:bg-gray-100 text-black font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                />
              </svg>
              Google
            </button>
          ) : null}
          {showFacebook ? (
            <button
              type="button"
              onClick={() => signIn("facebook", { callbackUrl: "/auth/post-login" })}
              className={`${showGoogle ? "flex-1" : "w-full"} bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 shrink-0`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
          ) : null}
        </div>

        <p className="text-center text-gray-400 mt-8 text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-500 hover:text-blue-400 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
