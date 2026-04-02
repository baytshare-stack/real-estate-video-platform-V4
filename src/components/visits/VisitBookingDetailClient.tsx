"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  Ban,
  RotateCcw,
  CircleDot,
  Clock,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import LocaleLink from "@/components/LocaleLink";
import { useTranslation } from "@/i18n/LanguageProvider";
import { useLocalizedPath } from "@/i18n/navigation";
import SendWhatsAppButton from "@/components/booking/SendWhatsAppButton";
import { buildBookingWhatsAppHref } from "@/lib/bookingWaMe";
import { localDateTimeToIso } from "@/lib/bookingTime";

type BookingPayload = {
  id: string;
  role: "visitor" | "agent";
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "RESCHEDULED";
  scheduledAt: string;
  updatedAt: string;
  createdAt: string;
  visitorName: string;
  visitorPhone: string;
  visitorEmail: string | null;
  message: string | null;
  responseMessage: string | null;
  reschedulePendingFrom: string | null;
  statusBeforePendingReschedule: string | null;
  visitorCounterProposalAt: string | null;
  video: { id: string; title: string; thumbnail: string | null };
  propertyLabel: string | null;
  contact: { visitorWhatsAppDigits?: string | null; agentWhatsAppDigits?: string | null };
};

function todayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function StatusIcon({ status }: { status: BookingPayload["status"] }) {
  const cls = "h-4 w-4 shrink-0";
  switch (status) {
    case "ACCEPTED":
      return <Check className={`${cls} text-emerald-400`} aria-hidden />;
    case "REJECTED":
      return <Ban className={`${cls} text-red-400`} aria-hidden />;
    case "RESCHEDULED":
      return <RotateCcw className={`${cls} text-sky-400`} aria-hidden />;
    default:
      return <CircleDot className={`${cls} text-amber-400`} aria-hidden />;
  }
}

function statusEmoji(status: BookingPayload["status"]): string {
  switch (status) {
    case "ACCEPTED":
      return "✅";
    case "REJECTED":
      return "❌";
    case "RESCHEDULED":
      return "🔄";
    default:
      return "⏳";
  }
}

function statusPillClass(s: BookingPayload["status"]) {
  if (s === "ACCEPTED") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
  if (s === "REJECTED") return "bg-red-500/15 text-red-400 border-red-500/25";
  if (s === "RESCHEDULED") return "bg-sky-500/15 text-sky-300 border-sky-500/25";
  return "bg-amber-500/15 text-amber-400 border-amber-500/25";
}

type Props = { bookingId: string };

export default function VisitBookingDetailClient({ bookingId }: Props) {
  const { t, dir, locale } = useTranslation();
  const toPath = useLocalizedPath();
  const [booking, setBooking] = useState<BookingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [propDate, setPropDate] = useState("");
  const [propTime, setPropTime] = useState("");
  const minDate = useMemo(() => todayDateStr(), []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, { credentials: "include" });
      if (res.status === 401) {
        setError(t("booking", "signInHint"));
        setBooking(null);
        return;
      }
      if (res.status === 403) {
        setError(t("visitDetail", "forbidden"));
        setBooking(null);
        return;
      }
      if (res.status === 404) {
        setError(t("visitDetail", "loadError"));
        setBooking(null);
        return;
      }
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as { booking?: BookingPayload };
      if (!data.booking) throw new Error("load");
      setBooking(data.booking);
    } catch {
      setError(t("visitDetail", "loadError"));
      setBooking(null);
    }
  }, [bookingId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const waHrefVisitor = useMemo(() => {
    if (!booking || booking.role !== "visitor") return null;
    const d = booking.contact.agentWhatsAppDigits;
    if (!d) return null;
    return buildBookingWhatsAppHref(d, booking.video.title, new Date(booking.scheduledAt), locale);
  }, [booking, locale]);

  const waHrefAgent = useMemo(() => {
    if (!booking || booking.role !== "agent") return null;
    const d = booking.contact.visitorWhatsAppDigits;
    if (!d) return null;
    return buildBookingWhatsAppHref(d, booking.video.title, new Date(booking.scheduledAt), locale);
  }, [booking, locale]);

  const visitorActionsVisible =
    booking?.role === "visitor" &&
    booking.status === "RESCHEDULED" &&
    booking.reschedulePendingFrom;

  const runVisitorAction = async (body: Record<string, unknown>) => {
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(booking.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      await load();
      setProposeOpen(false);
    } catch {
      setError(t("studio", "bookings.actionError"));
    } finally {
      setBusy(false);
    }
  };

  const runAgentPatch = async (body: Record<string, unknown>) => {
    if (!booking) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/bookings/${encodeURIComponent(booking.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      setError(t("studio", "bookings.actionError"));
    } finally {
      setBusy(false);
    }
  };

  const submitPropose = () => {
    const iso = localDateTimeToIso(propDate, propTime);
    if (!iso) return;
    void runVisitorAction({ action: "proposeTime", scheduledAt: iso });
  };

  const openPropose = () => {
    if (booking) {
      const d = new Date(booking.scheduledAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      setPropDate(`${y}-${m}-${day}`);
      setPropTime(`${hh}:${mm}`);
    }
    setProposeOpen(true);
  };

  if (error && !booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center" dir={dir}>
        <p className="text-red-400">{error}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
          <LocaleLink href="/login" className="text-blue-400 hover:underline">
            {t("booking", "goLogin")}
          </LocaleLink>
          <LocaleLink href="/profile" className="text-blue-400 hover:underline">
            {t("profile", "title")}
          </LocaleLink>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex justify-center py-24" dir={dir}>
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600/30 border-t-blue-600" />
      </div>
    );
  }

  const fmtWhen = (iso: string) =>
    new Date(iso).toLocaleString(locale || undefined, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="mx-auto min-h-[70vh] max-w-2xl px-4 py-6 pb-24" dir={dir}>
      <button
        type="button"
        onClick={() => window.history.back()}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("visitDetail", "back")}
      </button>

      {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

      <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-gray-900 to-gray-950 shadow-2xl">
        <div className="relative aspect-[21/9] w-full bg-gray-950 sm:aspect-[2/1]">
          {booking.video.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={booking.video.thumbnail} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-600">
              <CalendarClock className="h-16 w-16 opacity-30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />
        </div>

        <div className="space-y-5 p-5 sm:p-8">
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">{t("visitDetail", "title")}</h1>
            <LocaleLink
              href={`/watch/${booking.video.id}`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-400 hover:underline"
            >
              {booking.video.title}
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </LocaleLink>
            {booking.propertyLabel ? (
              <p className="mt-1 text-xs text-gray-500">{booking.propertyLabel}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-semibold ${statusPillClass(booking.status)}`}
            >
              <span aria-hidden>{statusEmoji(booking.status)}</span>
              <StatusIcon status={booking.status} />
              {t("studio", `bookings.status.${booking.status}`)}
            </span>
          </div>

          <div className="space-y-1 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("visitDetail", "when")}</p>
            <p className="text-lg font-semibold tabular-nums text-white">{fmtWhen(booking.scheduledAt)}</p>
            {booking.visitorCounterProposalAt ? (
              <p className="mt-2 text-sm text-amber-200/90">
                {t("visitDetail", "visitorCounter")}: {fmtWhen(booking.visitorCounterProposalAt)}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t("visitDetail", "created")} {fmtWhen(booking.createdAt)}
            </span>
            <span className="text-gray-700">·</span>
            <span>
              {t("visitDetail", "lastUpdated")} {fmtWhen(booking.updatedAt)}
            </span>
          </div>

          {booking.role === "agent" ? (
            <p className="text-sm text-gray-300">
              <span className="text-gray-500">{t("studio", "bookings.colVisitor")}:</span> {booking.visitorName} ·{" "}
              {booking.visitorPhone}
            </p>
          ) : null}

          {booking.message ? (
            <div>
              <p className="text-xs font-medium text-gray-500">{t("visitDetail", "yourMessage")}</p>
              <p className="mt-1 text-sm text-gray-300">{booking.message}</p>
            </div>
          ) : null}

          {booking.responseMessage ? (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <p className="text-xs font-medium text-gray-500">{t("visitDetail", "agentNote")}</p>
              <p className="mt-1 text-sm text-gray-200">{booking.responseMessage}</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <SendWhatsAppButton href={waHrefVisitor ?? waHrefAgent} label={t("visitDetail", "whatsapp")} />
            <LocaleLink
              href={`/watch/${booking.video.id}`}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              {t("visitDetail", "viewListing")}
            </LocaleLink>
            {booking.role === "agent" ? (
              <a
                href={`${toPath("/studio")}?tab=bookings`}
                className="inline-flex items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/10 px-4 py-2.5 text-sm font-semibold text-blue-300 hover:bg-blue-600/20"
              >
                {t("visitDetail", "manageInStudio")}
              </a>
            ) : null}
          </div>

          {visitorActionsVisible ? (
            <div className="space-y-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
              <p className="text-sm font-medium text-sky-200">{t("visitDetail", "pendingYourConfirm")}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runVisitorAction({ action: "acceptReschedule" })}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {t("visitDetail", "acceptProposal")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runVisitorAction({ action: "rejectReschedule" })}
                  className="rounded-xl bg-red-600/90 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {t("visitDetail", "rejectProposal")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openPropose()}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"
                >
                  {t("visitDetail", "proposeOther")}
                </button>
              </div>
            </div>
          ) : null}

          {booking.role === "agent" && booking.visitorCounterProposalAt ? (
            <div className="space-y-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4">
              <p className="text-sm text-amber-100">
                {t("visitDetail", "visitorCounter")}: {fmtWhen(booking.visitorCounterProposalAt)}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAgentPatch({ acceptVisitorProposal: true })}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {t("studio", "bookings.acceptVisitorTime")}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {proposeOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="max-h-[min(90vh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-2xl animate-in zoom-in-95 duration-200"
            dir={dir}
          >
            <h4 className="mb-3 font-bold text-white">{t("visitDetail", "proposeTitle")}</h4>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">{t("booking", "date")}</label>
                <input
                  type="date"
                  value={propDate}
                  onChange={(e) => setPropDate(e.target.value)}
                  min={minDate}
                  className="w-full rounded-xl border border-gray-700 bg-[#020b22] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">{t("booking", "time")}</label>
                <input
                  type="time"
                  value={propTime}
                  onChange={(e) => setPropTime(e.target.value)}
                  step={300}
                  className="w-full rounded-xl border border-gray-700 bg-[#020b22] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProposeOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-white/10"
              >
                {t("common", "cancel")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitPropose()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {t("visitDetail", "sendProposal")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
