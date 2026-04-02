"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, CalendarClock } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { useTranslation } from "@/i18n/LanguageProvider";
import LocaleLink from "@/components/LocaleLink";

type BookVisitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle: string;
};

function phoneDigitCount(s: string): number {
  return s.replace(/\D/g, "").length;
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function toScheduledIso(dateStr: string, timeStr: string): string | null {
  if (!dateStr?.trim() || !timeStr?.trim()) return null;
  const d = new Date(`${dateStr.trim()}T${timeStr.trim()}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function todayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function BookVisitModal({ isOpen, onClose, videoId, videoTitle }: BookVisitModalProps) {
  const { t, dir } = useTranslation();
  const { data: session, status } = useSession();
  const [visitorName, setVisitorName] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const authed = status === "authenticated";

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setDone(false);
    const u = session?.user;
    if (u) {
      setVisitorName(u.name?.trim() || "");
      setVisitorEmail(u.email?.trim() || "");
    }
  }, [isOpen, session]);

  const minDate = useMemo(() => todayDateStr(), []);

  const validate = useCallback(() => {
    if (visitorName.trim().length < 2) return t("booking", "errorName");
    if (phoneDigitCount(visitorPhone) < 8) return t("booking", "errorPhone");
    if (visitorEmail.trim() && !isValidEmail(visitorEmail.trim())) return t("booking", "errorEmail");
    const iso = toScheduledIso(dateStr, timeStr);
    if (!iso) return t("booking", "errorDateTime");
    const tMs = new Date(iso).getTime();
    if (tMs < Date.now() - 60_000) return t("booking", "errorPast");
    return null;
  }, [visitorName, visitorPhone, visitorEmail, dateStr, timeStr, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authed) return;
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    const scheduledAt = toScheduledIso(dateStr, timeStr);
    if (!scheduledAt) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          videoId,
          visitorName: visitorName.trim(),
          visitorPhone: visitorPhone.trim(),
          visitorEmail: visitorEmail.trim() || undefined,
          scheduledAt,
          message: message.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || t("booking", "errorSubmit"));
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("booking", "errorSubmit"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-visit-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3 md:px-5">
          <div className="flex items-center gap-2 text-white">
            <CalendarClock className="h-5 w-5 shrink-0 text-blue-400" />
            <h3 id="book-visit-title" className="text-base font-bold md:text-lg">
              {t("booking", "title")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={t("booking", "close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[min(70vh,540px)] overflow-y-auto px-4 py-4 md:px-5 md:py-5">
          {!authed ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-300">{t("booking", "signInHint")}</p>
              <button
                type="button"
                onClick={() => signIn(undefined, { callbackUrl: typeof window !== "undefined" ? window.location.href : "/" })}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500"
              >
                {t("booking", "signIn")}
              </button>
              <LocaleLink href="/login" className="block text-sm text-blue-400 hover:underline">
                {t("booking", "goLogin")}
              </LocaleLink>
            </div>
          ) : done ? (
            <div className="space-y-3 text-center">
              <p className="text-sm font-medium text-emerald-400">{t("booking", "success")}</p>
              <p className="text-xs text-gray-400">{t("booking", "successDetail")}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full rounded-xl bg-gray-800 py-3 text-sm font-semibold text-white hover:bg-gray-700"
              >
                {t("booking", "close")}
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 md:space-y-4">
              <p className="line-clamp-2 text-xs text-gray-500">{videoTitle}</p>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">{t("booking", "fullName")}</label>
                <input
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  autoComplete="name"
                  required
                  minLength={2}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">{t("booking", "phone")}</label>
                <input
                  value={visitorPhone}
                  onChange={(e) => setVisitorPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  autoComplete="tel"
                  inputMode="tel"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">{t("booking", "emailOptional")}</label>
                <input
                  type="email"
                  value={visitorEmail}
                  onChange={(e) => setVisitorEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  autoComplete="email"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">{t("booking", "date")}</label>
                  <input
                    type="date"
                    value={dateStr}
                    min={minDate}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-400">{t("booking", "time")}</label>
                  <input
                    type="time"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-400">{t("booking", "messageOptional")}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  className="w-full resize-none rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {submitting ? t("booking", "submitting") : t("booking", "submit")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
