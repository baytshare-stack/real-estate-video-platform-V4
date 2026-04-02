"use client";

import { useCallback, useEffect, useState } from "react";
import LocaleLink from "@/components/LocaleLink";
import { useTranslation } from "@/i18n/LanguageProvider";
import { CalendarClock, Check, Ban, RotateCcw, CircleDot, Clock } from "lucide-react";

type VisitRow = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "RESCHEDULED";
  scheduledAt: string;
  updatedAt: string;
  responseMessage: string | null;
  message: string | null;
  video: { id: string; title: string; thumbnail: string | null };
  propertyLabel: string | null;
};

function StatusIcon({ status }: { status: VisitRow["status"] }) {
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

function statusPillClass(s: VisitRow["status"]) {
  if (s === "ACCEPTED") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/25";
  if (s === "REJECTED") return "bg-red-500/15 text-red-400 border-red-500/25";
  if (s === "RESCHEDULED") return "bg-sky-500/15 text-sky-300 border-sky-500/25";
  return "bg-amber-500/15 text-amber-400 border-amber-500/25";
}

export default function ProfileMyVisits() {
  const { t, dir, locale } = useTranslation();
  const [rows, setRows] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings/mine", { credentials: "include" });
      if (res.status === 401) {
        setRows([]);
        setErr(null);
        return;
      }
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as { bookings?: VisitRow[] };
      setRows(Array.isArray(data.bookings) ? data.bookings : []);
      setErr(null);
    } catch {
      setErr(t("profile", "myVisitsLoadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

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

  if (loading) {
    return (
      <div className="flex justify-center py-12" dir={dir}>
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600/30 border-t-blue-600" />
      </div>
    );
  }

  if (err) {
    return (
      <p className="text-sm text-red-400" dir={dir}>
        {err}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500" dir={dir}>
        {t("profile", "myVisitsEmpty")}
      </p>
    );
  }

  return (
    <ul className="space-y-4" dir={dir}>
      {rows.map((r) => (
        <li
          key={r.id}
          className="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-gray-900/80 p-4 sm:flex-row sm:items-stretch"
        >
          <LocaleLink
            href={`/watch/${r.video.id}`}
            className="block shrink-0 overflow-hidden rounded-xl border border-gray-800 bg-gray-950 sm:h-28 sm:w-40"
          >
            {r.video.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.video.thumbnail} alt="" className="h-36 w-full object-cover sm:h-full sm:w-full" />
            ) : (
              <div className="flex h-36 items-center justify-center text-gray-600 sm:h-full">
                <CalendarClock className="h-10 w-10 opacity-40" />
              </div>
            )}
          </LocaleLink>
          <div className="min-w-0 flex-1 space-y-2">
            <LocaleLink href={`/watch/${r.video.id}`} className="line-clamp-2 font-semibold text-white hover:text-blue-400">
              {r.video.title}
            </LocaleLink>
            {r.propertyLabel ? <p className="text-xs text-gray-500">{r.propertyLabel}</p> : null}
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-300">
              <CalendarClock className="h-4 w-4 shrink-0 text-gray-500" />
              <span>{fmtWhen(r.scheduledAt)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs font-semibold ${statusPillClass(r.status)}`}
              >
                <StatusIcon status={r.status} />
                {t("studio", `bookings.status.${r.status}`)}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {t("profile", "myVisitsUpdated")} {fmtUpdated(r.updatedAt)}
              </span>
            </div>
            {r.responseMessage ? (
              <p className="text-sm text-gray-400">
                <span className="font-medium text-gray-500">{t("profile", "agentResponse")}</span> {r.responseMessage}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
