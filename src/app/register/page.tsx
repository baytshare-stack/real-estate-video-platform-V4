"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getProviders, signIn } from "next-auth/react";
import { COUNTRIES, getCountryByIso, buildFullPhoneNumber } from "@/lib/countriesData";

type RoleValue = "user" | "agent" | "agency";

function digitsOnly(s: string) {
  return s.replace(/\D/g, "");
}

export default function RegisterPage() {
  const router = useRouter();
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
      setError("Phone is required for agent and agency accounts.");
      setLoading(false);
      return;
    }

    if (wantsPhone && !formData.countryIso) {
      setError("Select a country to set your phone country code.");
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
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      if (data.needsOtp) {
        setSuccess("We sent a verification code to your email. Enter it below.");
        setStep("otp");
        setLoading(false);
        if (process.env.NODE_ENV === "development" && data.otp) {
          console.info("[dev] registration OTP:", data.otp);
        }
        return;
      }

      setSuccess("Account created! Signing you in...");
      const sign = await signIn("credentials", {
        redirect: false,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (sign?.error) {
        setSuccess("");
        setError("Registered but sign-in failed. Please log in manually.");
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      const isAgentOrAgency = formData.role === "agent" || formData.role === "agency";
      router.push(isAgentOrAgency ? "/create-channel" : "/profile");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
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
        setError(d.error || "Could not resend code");
        return;
      }
      if (process.env.NODE_ENV === "development" && d.otp) {
        console.info("[dev] resent OTP:", d.otp);
      }
      setSuccess("A new code was sent to your email.");
    } catch {
      setError("Could not resend code");
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
        setError(data.error || "Verification failed");
        setOtpLoading(false);
        return;
      }

      const sign = await signIn("credentials", {
        redirect: false,
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (sign?.error) {
        setError(sign.error || "Sign-in failed after verification");
        setOtpLoading(false);
        return;
      }

      const isAgentOrAgency = formData.role === "agent" || formData.role === "agency";
      router.push(isAgentOrAgency ? "/create-channel" : "/profile");
      router.refresh();
    } catch {
      setError("Verification failed");
    } finally {
      setOtpLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
        <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl my-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">Verify your email</h1>
            <p className="text-gray-400 mt-2">Enter the 6-digit code we sent to your email</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded-lg text-sm mb-6">
              {success}
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={8}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="123456"
              />
            </div>
            <button
              type="submit"
              disabled={otpLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl mt-4 transition-colors disabled:opacity-50"
            >
              {otpLoading ? "Verifying..." : "Verify & continue"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={otpLoading}
            className="w-full mt-4 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
          >
            Resend code
          </button>

          <p className="text-center text-gray-400 mt-8 text-sm">
            <Link href="/login" className="text-blue-500 hover:text-blue-400 font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl my-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Create an Account</h1>
          <p className="text-gray-400 mt-2">Join RealEstateTV to upload or discover properties</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded-lg text-sm mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Username *</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Role *</label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as RoleValue })}
                className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="user">User</option>
                <option value="agent">Agent</option>
                <option value="agency">Agency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password *</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Country {wantsPhone ? "*" : "(for phone)"}
            </label>
            <select
              required={wantsPhone}
              value={formData.countryIso}
              onChange={(e) => setFormData({ ...formData, countryIso: e.target.value })}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Select country</option>
              {COUNTRIES.map((c) => (
                <option key={c.iso2} value={c.iso2}>
                  {c.flag} {c.name} ({c.phoneCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Phone {phoneRequired ? "*" : "(optional)"}{" "}
              {country ? <span className="text-gray-500">{country.phoneCode}</span> : null}
            </label>
            <input
              type="tel"
              required={phoneRequired}
              value={formData.phoneNational}
              onChange={(e) =>
                setFormData({ ...formData, phoneNational: digitsOnly(e.target.value) })
              }
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder={phoneRequired ? "National number (no country code)" : "Optional"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">WhatsApp (optional)</label>
            <input
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="w-full bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Same country code as above, or full international"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl mt-4 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        {formData.role === "user" && showGoogle ? (
          <>
            <div className="mt-6 flex items-center justify-center gap-4">
              <div className="h-px bg-gray-800 flex-1" />
              <span className="text-gray-500 text-sm font-medium">OR</span>
              <div className="h-px bg-gray-800 flex-1" />
            </div>
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/auth/post-login" })}
              className="mt-4 w-full bg-white hover:bg-gray-100 text-black font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                />
              </svg>
              Continue with Google
            </button>
          </>
        ) : null}

        <p className="text-center text-gray-400 mt-8 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-500 hover:text-blue-400 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
