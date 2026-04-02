"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Pencil,
  Check,
  X,
  Clock,
  CalendarClock,
  CircleDot,
  Ban,
  RotateCcw,
} from "lucide-react";
import LocaleLink from "@/components/LocaleLink";
import { useTranslation } from "@/i18n/LanguageProvider";
import { localDateTimeToIso } from "@/lib/bookingTime";
import SendWhatsAppButton from "@/components/booking/SendWhatsAppButton";
import { buildBookingWhatsAppHref, bookingPhoneDigits } from "@/lib/bookingWaMe";

export type StudioBookingRow = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "RESCHEDULED";
  scheduledAt: string;
  updatedAt: string;
  visitorName: string;
  visitorPhone: string;
  visitorEmail: string | null;
  message: string | null;
  responseMessage: string | null;
  visitorCounterProposalAt: string | null;
  video: { id: string; title: string; thumbnail: string | null };
  propertyLabel: string | null;
};

function localDateTimeParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${day}`, time: `${hh}:${mm}` };
}

function todayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  pollMs?: number;
};

function statusEmoji(status: StudioBookingRow["status"]): string {
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

function StatusIcon({ status }: { status: StudioBookingRow["status"] }) {
  const cls = "h-3.5 w-3.5 shrink-0";
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

export default function StudioBookingsTable({ pollMs = 5000 }: Props) {
  const { t, dir, locale } = useTranslation();
  const [rows, setRows] = useState<StudioBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modifyId, setModifyId] = useState<string | null>(null);
  const [modDate, setModDate] = useState("");
  const [modTime, setModTime] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const minDate = useMemo(() => todayDateStr(), []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/studio/bookings", { credentials: "include" });
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as { bookings?: StudioBookingRow[] };
      setRows(Array.isArray(data.bookings) ? data.bookings : []);
      setError(null);
    } catch {
      setError(t("studio", "bookings.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  const openModify = (r: StudioBookingRow) => {
    const { date, time } = localDateTimeParts(r.scheduledAt);
    setModifyId(r.id);
    setModDate(date);
    setModTime(time);
  };

  const patchBooking = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/studio/bookings/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      await load();
      setModifyId(null);
      setRejectId(null);
      setRejectNote("");
    } catch {
      setError(t("studio", "bookings.actionError"));
    } finally {
      setBusyId(null);
    }
  };

  const saveModify = async () => {
    if (!modifyId) return;
    const iso = localDateTimeToIso(modDate, modTime);
    if (!iso) return;
    await patchBooking(modifyId, { scheduledAt: iso });
  };

  const openReject = (r: StudioBookingRow) => {
    setRejectId(r.id);
    setRejectNote("");
  };

  const confirmReject = async () => {
    if (!rejectId) return;
    await patchBooking(rejectId, {
      status: "REJECTED",
      responseMessage: rejectNote.trim() || undefined,
    });
  };

  const fmtWhen = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(locale || undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const fmtUpdated = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(locale || undefined, {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const statusClass = (s: StudioBookingRow["status"]) => {
    if (s === "ACCEPTED") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
    if (s === "REJECTED") return "bg-red-500/15 text-red-400 border-red-500/25";
    if (s === "RESCHEDULED") return "bg-sky-500/15 text-sky-300 border-sky-500/25";
    return "bg-amber-500/15 text-amber-400 border-amber-500/25";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600/30 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500">{t("studio", "bookings.pollHint")}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10"
        >
          <RefreshCw className="h-3.5 w-3.5" /> {t("studio", "overview.refresh")}
        </button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-gray-900/80 py-16 text-center text-gray-500">
          {t("studio", "bookings.empty")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-gray-900/80 shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-start text-sm">
              <thead>
                <tr className="border-b border-white/[0.07] text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">{t("studio", "bookings.colProperty")}</th>
                  <th className="px-4 py-3">{t("studio", "bookings.colVisitor")}</th>
                  <th className="px-4 py-3">{t("studio", "bookings.colWhen")}</th>
                  <th className="px-4 py-3">{t("studio", "bookings.colStatus")}</th>
                  <th className="px-4 py-3">{t("studio", "bookings.colUpdated")}</th>
                  <th className="px-4 py-3">{t("studio", "overview.tableActions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-white/[0.05] text-gray-200 last:border-0">
                    <td className="px-4 py-3 align-top">
                      <LocaleLink href={`/watch/${r.video.id}`} className="font-medium text-blue-400 hover:underline">
                        <span className="line-clamp-2">{r.video.title}</span>
                      </LocaleLink>
                      {r.propertyLabel ? (
                        <p className="mt-0.5 text-xs text-gray-500">{r.propertyLabel}</p>
                      ) : null}
                      {r.responseMessage ? (
                        <p className="mt-1 text-xs text-gray-400">
                          <span className="text-gray-500">{t("studio", "bookings.agentNote")}</span> {r.responseMessage}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-white">{r.visitorName}</div>
                      <div className="text-xs text-gray-400">{r.visitorPhone}</div>
                      {r.visitorEmail ? <div className="text-xs text-gray-500">{r.visitorEmail}</div> : null}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">{fmtWhen(r.scheduledAt)}</td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs font-semibold ${statusClass(r.status)}`}
                      >
                        <span aria-hidden>{statusEmoji(r.status)}</span>
                        <StatusIcon status={r.status} />
                        {t("studio", `bookings.status.${r.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0 opacity-70" />
                        {fmtUpdated(r.updatedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-2">
                        {r.visitorCounterProposalAt ? (
                          <p className="text-[11px] text-amber-300/90">
                            {t("visitDetail", "visitorCounter")}: {fmtWhen(r.visitorCounterProposalAt)}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-1.5">
                          {r.visitorCounterProposalAt ? (
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => void patchBooking(r.id, { acceptVisitorProposal: true })}
                              className="rounded-lg bg-amber-600/25 px-2 py-1 text-xs font-bold text-amber-200 hover:bg-amber-600/35 disabled:opacity-40"
                            >
                              <Check className="inline h-3.5 w-3.5" /> {t("studio", "bookings.acceptVisitorTime")}
                            </button>
                          ) : null}
                          {r.status === "PENDING" || r.status === "REJECTED" || r.status === "RESCHEDULED" ? (
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => void patchBooking(r.id, { status: "ACCEPTED" })}
                              className="rounded-lg bg-emerald-600/20 px-2 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-40"
                            >
                              <Check className="inline h-3.5 w-3.5" /> {t("studio", "bookings.approve")}
                            </button>
                          ) : null}
                          {r.status !== "REJECTED" ? (
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => openReject(r)}
                              className="rounded-lg bg-red-600/20 px-2 py-1 text-xs font-bold text-red-400 hover:bg-red-600/30 disabled:opacity-40"
                            >
                              <X className="inline h-3.5 w-3.5" /> {t("studio", "bookings.reject")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => openModify(r)}
                            className="rounded-lg bg-white/10 px-2 py-1 text-xs font-bold text-gray-200 hover:bg-white/15 disabled:opacity-40"
                          >
                            <Pencil className="inline h-3.5 w-3.5" /> {t("studio", "bookings.modify")}
                          </button>
                          <LocaleLink
                            href={`/visits/${r.id}`}
                            className="inline-flex items-center rounded-lg border border-white/10 px-2 py-1 text-xs font-bold text-blue-300 hover:bg-white/5"
                          >
                            {t("visitDetail", "viewDetails")}
                          </LocaleLink>
                        </div>
                        {(() => {
                          const d = bookingPhoneDigits(r.visitorPhone);
                          const visitUrl =
                            typeof window !== "undefined"
                              ? `${window.location.origin}/visits/${r.id}`
                              : `/visits/${r.id}`;
                          const href = d
                            ? buildBookingWhatsAppHref(d, r.video.title, new Date(r.scheduledAt), locale, visitUrl)
                            : null;
                          return (
                            <SendWhatsAppButton
                              href={href}
                              label={t("visitDetail", "whatsapp")}
                              className="!py-1.5 !text-xs !font-semibold"
                            />
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modifyId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" dir={dir}>
          <div className="max-h-[min(90vh,640px)] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-white">
              <CalendarClock className="h-5 w-5 text-blue-400" />
              <h4 className="font-bold">{t("studio", "bookings.modifyTitle")}</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-400">{t("booking", "date")}</label>
                <input
                  type="date"
                  value={modDate}
                  onChange={(e) => setModDate(e.target.value)}
                  min={minDate}
                  className="w-full rounded-xl border border-gray-700 bg-[#020b22] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">{t("booking", "time")}</label>
                <input
                  type="time"
                  value={modTime}
                  onChange={(e) => setModTime(e.target.value)}
                  step={300}
                  className="w-full rounded-xl border border-gray-700 bg-[#020b22] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModifyId(null)}
                className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-white/10"
              >
                {t("common", "cancel")}
              </button>
              <button
                type="button"
                disabled={busyId === modifyId}
                onClick={() => void saveModify()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {t("studio", "bookings.save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" dir={dir}>
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xl">
            <h4 className="mb-2 font-bold text-white">{t("studio", "bookings.rejectTitle")}</h4>
            <p className="mb-3 text-xs text-gray-500">{t("studio", "bookings.rejectHint")}</p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={t("studio", "bookings.responsePlaceholder")}
              className="mb-4 w-full resize-none rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectNote("");
                }}
                className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-white/10"
              >
                {t("common", "cancel")}
              </button>
              <button
                type="button"
                disabled={busyId === rejectId}
                onClick={() => void confirmReject()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {t("studio", "bookings.confirmReject")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
