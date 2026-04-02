"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, CalendarClock, ChevronRight } from "lucide-react";
import { useSession, signIn } from "next-auth/react";
import { useTranslation } from "@/i18n/LanguageProvider";
import LocaleLink from "@/components/LocaleLink";
import { localDateTimeToIso } from "@/lib/bookingTime";
import SendWhatsAppButton from "@/components/booking/SendWhatsAppButton";

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
  return localDateTimeToIso(dateStr, timeStr);
}

function todayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function BookVisitModal({ isOpen, onClose, videoId, videoTitle }: BookVisitModalProps) {
  const { t, dir, locale } = useTranslation();
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
  const [step, setStep] = useState<0 | 1>(0);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [whatsappToAgentUrl, setWhatsappToAgentUrl] = useState<string | null>(null);

  const authed = status === "authenticated";

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setDone(false);
    setStep(0);
    setCreatedId(null);
    setWhatsappToAgentUrl(null);
    const u = session?.user;
    if (u) {
      setVisitorName(u.name?.trim() || "");
      setVisitorEmail(u.email?.trim() || "");
    }
  }, [isOpen, session]);

  const minDate = useMemo(() => todayDateStr(), []);

  const validateDateTime = useCallback(() => {
    const iso = toScheduledIso(dateStr, timeStr);
    if (!iso) return t("booking", "errorDateTime");
    const tMs = new Date(iso).getTime();
    if (tMs < Date.now() - 60_000) return t("booking", "errorPast");
    return null;
  }, [dateStr, timeStr, t]);

  const validateDetails = useCallback(() => {
    if (visitorName.trim().length < 2) return t("booking", "errorName");
    if (phoneDigitCount(visitorPhone) < 8) return t("booking", "errorPhone");
    if (visitorEmail.trim() && !isValidEmail(visitorEmail.trim())) return t("booking", "errorEmail");
    return null;
  }, [visitorName, visitorPhone, visitorEmail, t]);

  const handleContinueFromSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateDateTime();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authed) return;
    const vDetails = validateDetails();
    if (vDetails) {
      setError(vDetails);
      return;
    }
    const vDt = validateDateTime();
    if (vDt) {
      setError(vDt);
      setStep(0);
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
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        booking?: { id: string };
        whatsappToAgentUrl?: string | null;
      };
      if (!res.ok) throw new Error(data.error || t("booking", "errorSubmit"));
      setCreatedId(data.booking?.id ?? null);
      setWhatsappToAgentUrl(data.whatsappToAgentUrl ?? null);
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
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 backdrop-blur-sm p-0 sm:items-center sm:p-4 animate-in fade-in duration-200"
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-visit-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-t-3xl border border-gray-800 border-b-0 bg-gray-900 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 sm:rounded-2xl sm:border-b">
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

        {authed && !done ? (
          <div className="flex gap-1 border-b border-gray-800 px-4 py-2 md:px-5">
            <span
              className={`rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${
                step === 0 ? "bg-blue-600/30 text-blue-200" : "text-gray-500"
              }`}
            >
              1 · {t("visitDetail", "stepWhen")}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 self-center text-gray-600" />
            <span
              className={`rounded-lg px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${
                step === 1 ? "bg-blue-600/30 text-blue-200" : "text-gray-500"
              }`}
            >
              2 · {t("visitDetail", "stepDetails")}
            </span>
          </div>
        ) : null}

        <div className="max-h-[min(78vh,560px)] overflow-y-auto px-4 py-4 md:px-5 md:py-5">
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
            <div className="space-y-4 text-center">
              <p className="text-base font-semibold text-emerald-400">{t("booking", "success")}</p>
              <p className="text-xs text-gray-400">{t("booking", "successDetail")}</p>
              <div className="flex flex-col gap-2">
                {createdId ? (
                  <LocaleLink
                    href={`/visits/${createdId}`}
                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500"
                  >
                    {t("booking", "viewVisit")}
                  </LocaleLink>
                ) : null}
                <SendWhatsAppButton
                  href={whatsappToAgentUrl}
                  label={t("booking", "whatsappAgent")}
                  className="w-full"
                />
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-xl bg-gray-800 py-3 text-sm font-semibold text-white hover:bg-gray-700"
                >
                  {t("booking", "close")}
                </button>
              </div>
            </div>
          ) : step === 0 ? (
            <form onSubmit={(e) => void handleContinueFromSchedule(e)} className="space-y-3 md:space-y-4">
              <p className="line-clamp-2 text-center text-xs text-gray-500">{videoTitle}</p>
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-gray-400">{t("booking", "date")}</label>
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  min={minDate}
                  className="w-full rounded-xl border border-gray-700 bg-[#020b22] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-medium text-gray-400">{t("booking", "time")}</label>
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  step={300}
                  className="w-full rounded-xl border border-gray-700 bg-[#020b22] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500"
              >
                {t("visitDetail", "continue")}
                <ChevronRight className="h-4 w-4" />
              </button>
            </form>
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

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(0);
                    setError(null);
                  }}
                  className="flex-1 rounded-xl border border-gray-700 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5"
                >
                  {t("visitDetail", "back")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                >
                  {submitting ? t("booking", "submitting") : t("booking", "submit")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
