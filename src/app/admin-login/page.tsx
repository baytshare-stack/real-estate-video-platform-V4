"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield } from "lucide-react";
import { clearAdminSession } from "@/lib/adminSession";

type TextInputProps = {
  id: string;
  label: string;
  type: "email" | "password";
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoComplete?: string;
};

function TextInput({
  id,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: TextInputProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-white/80">
        {label}
      </label>

      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className={[
          "w-full rounded-xl px-4 py-3",
          "bg-white/5 border border-white/10 text-white placeholder:text-white/35",
          "backdrop-blur-xl shadow-sm",
          "outline-none transition",
          "focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40",
        ].join(" ")}
      />
    </div>
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  React.useEffect(() => {
    clearAdminSession();
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as
        | { ok: true; userId: string; role: string }
        | { error: string };

      if (!res.ok) {
        setError("Invalid credentials");
        return;
      }

      if (!("ok" in data) || !data.ok || typeof data.userId !== "string") {
        setError("Invalid credentials");
        return;
      }

      router.replace("/admin/dashboard");
    } catch {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent" />

          <div className="relative p-6 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-medium tracking-wide text-white/60">
                  <Shield className="h-4 w-4" />
                  Admin Portal
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-white">Sign in</h1>
                <p className="mt-1 text-sm text-white/60">
                  Use your admin credentials to continue.
                </p>
              </div>

              <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/5">
                <Lock className="h-5 w-5 text-white/70" />
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
              <TextInput
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="admin@bytak1tube.com"
                autoComplete="email"
              />

              <TextInput
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                autoComplete="current-password"
              />

              <button
                type="submit"
                disabled={loading}
                className={[
                  "mt-2 w-full rounded-xl px-4 py-3 font-medium",
                  "bg-indigo-600 text-white shadow-sm",
                  "transition",
                  "hover:bg-indigo-500 active:bg-indigo-600",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f0f]",
                  "disabled:opacity-70 disabled:cursor-not-allowed",
                ].join(" ")}
              >
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-white/40">
          This area is restricted to authorized administrators.
        </p>
      </div>
    </div>
  );
}
