"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

type BookingDatePickerProps = {
  value: string;
  onChange: (dateStr: string) => void;
  minDate: string;
  locale: string;
  dir: "ltr" | "rtl";
};

function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

function toYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function ymdFromLocalDate(d: Date): string {
  return toYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Compare YYYY-MM-DD strings in local calendar order. */
function ymdCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export default function BookingDatePicker({ value, onChange, minDate, locale, dir }: BookingDatePickerProps) {
  const { t } = useTranslation();
  const parsedMin = useMemo(() => parseYmd(minDate), [minDate]);

  const [cursor, setCursor] = useState(() => {
    if (parsedMin) return new Date(parsedMin.y, parsedMin.m - 1, 1);
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const monthTitle = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(cursor),
    [cursor, locale]
  );

  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    const sun = new Date(2024, 6, 7);
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(sun.getTime() + i * 86400000)));
  }, [locale]);

  const cells = useMemo(() => {
    const y = cursor.getFullYear();
    const mi = cursor.getMonth();
    const first = new Date(y, mi, 1);
    const last = new Date(y, mi + 1, 0);
    const pad = first.getDay();
    const dim = last.getDate();
    const out: { day: number; inMonth: boolean; ymd: string }[] = [];
    const prevLast = new Date(y, mi, 0).getDate();
    for (let i = pad - 1; i >= 0; i--) {
      const d = prevLast - i;
      const dt = new Date(y, mi - 1, d);
      out.push({ day: d, inMonth: false, ymd: ymdFromLocalDate(dt) });
    }
    for (let d = 1; d <= dim; d++) {
      out.push({ day: d, inMonth: true, ymd: toYmd(y, mi + 1, d) });
    }
    const tail = 42 - out.length;
    for (let d = 1; d <= tail; d++) {
      const dt = new Date(y, mi + 1, d);
      out.push({ day: d, inMonth: false, ymd: ymdFromLocalDate(dt) });
    }
    return out;
  }, [cursor]);

  const goPrev = useCallback(() => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }, []);

  const goNext = useCallback(() => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }, []);

  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-950 p-3 transition-transform duration-200 animate-in zoom-in-95 fade-in">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrev}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={t("booking", "prevMonth")}
        >
          <PrevIcon className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 text-center text-sm font-semibold capitalize text-white">{monthTitle}</div>
        <button
          type="button"
          onClick={goNext}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={t("booking", "nextMonth")}
        >
          <NextIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500">
        {weekdayLabels.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          const disabled = ymdCmp(cell.ymd, minDate) < 0;
          const selected = value === cell.ymd;
          const base =
            "flex h-9 items-center justify-center rounded-lg text-sm transition-colors " +
            (cell.inMonth ? "text-white" : "text-gray-600");
          const state = disabled
            ? "cursor-not-allowed opacity-40"
            : selected
              ? "bg-blue-600 font-semibold text-white"
              : cell.inMonth
                ? "hover:bg-gray-800"
                : "hover:bg-gray-800/50";
          return (
            <button
              key={`${cell.ymd}-${idx}`}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                onChange(cell.ymd);
                const p = parseYmd(cell.ymd);
                if (p) setCursor(new Date(p.y, p.m - 1, 1));
              }}
              className={`${base} ${state}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
