"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { formatTimeHmFrom24, parseTimeHm } from "@/lib/bookingTime";

type Period = "AM" | "PM";

type BookingTimeDialProps = {
  value: string;
  onChange: (timeStr: string) => void;
  dir: "ltr" | "rtl";
  locale: string;
  pickHourLabel: string;
  pickMinuteLabel: string;
  amLabel: string;
  pmLabel: string;
};

function from24To12(h24: number): { hour12: number; period: Period } {
  if (h24 === 0) return { hour12: 12, period: "AM" };
  if (h24 < 12) return { hour12: h24, period: "AM" };
  if (h24 === 12) return { hour12: 12, period: "PM" };
  return { hour12: h24 - 12, period: "PM" };
}

function to24(h12: number, p: Period): number {
  if (p === "AM") return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}

const MINUTE_STEP = 5;
const MINUTE_MARKS = Array.from({ length: 12 }, (_, i) => i * MINUTE_STEP);

function polarToCss(angleRad: number, radiusPct: number): Pick<CSSProperties, "left" | "top"> {
  const x = 50 + radiusPct * Math.cos(angleRad);
  const y = 50 + radiusPct * Math.sin(angleRad);
  return { left: `${x}%`, top: `${y}%` };
}

export default function BookingTimeDial({
  value,
  onChange,
  dir,
  locale,
  pickHourLabel,
  pickMinuteLabel,
  amLabel,
  pmLabel,
}: BookingTimeDialProps) {
  const parsed = useMemo(() => parseTimeHm(value), [value]);
  const [step, setStep] = useState<"hour" | "minute">("hour");

  const h24 = parsed?.h ?? 10;
  const minute = parsed?.m ?? 0;
  const { hour12, period } = from24To12(h24);
  const hasValue = Boolean(parsed);

  useEffect(() => {
    if (!parsed) setStep("hour");
  }, [parsed]);

  const emit = useCallback(
    (nextH24: number, nextMin: number) => {
      onChange(formatTimeHmFrom24(nextH24, nextMin));
    },
    [onChange]
  );

  const setPeriod = (p: Period) => {
    if (!hasValue) return;
    const nextH = to24(hour12, p);
    emit(nextH, minute);
  };

  const onPickHour = (h12: number) => {
    const nextH = to24(h12, period);
    emit(nextH, minute);
    setStep("minute");
  };

  const onPickMinute = (m: number) => {
    emit(h24, m);
  };

  const centerLabel = useMemo(() => {
    if (!hasValue) return "—";
    const d = new Date();
    d.setHours(h24, minute, 0, 0);
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  }, [hasValue, h24, minute, locale]);

  const hourAngles = useMemo(() => {
    const out: { label: number; rad: number }[] = [];
    for (let h = 1; h <= 12; h++) {
      const rad = ((h % 12) / 12) * 2 * Math.PI - Math.PI / 2;
      out.push({ label: h, rad });
    }
    return out;
  }, []);

  const minuteAngles = useMemo(() => {
    return MINUTE_MARKS.map((m, idx) => {
      const rad = (idx / 12) * 2 * Math.PI - Math.PI / 2;
      return { label: m, rad };
    });
  }, []);

  const selectedMinuteIdx = Math.round(minute / MINUTE_STEP) % 12;
  const selectedHour12 = hour12;

  return (
    <div className="space-y-3" dir={dir}>
      <div
        className={`flex items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-950 p-1 ${
          !hasValue ? "opacity-50" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => setPeriod("AM")}
          disabled={!hasValue}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed ${
            period === "AM" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800"
          }`}
        >
          {amLabel}
        </button>
        <button
          type="button"
          onClick={() => setPeriod("PM")}
          disabled={!hasValue}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed ${
            period === "PM" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800"
          }`}
        >
          {pmLabel}
        </button>
      </div>

      <p className="text-center text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {step === "hour" ? pickHourLabel : pickMinuteLabel}
      </p>

      <div className="relative mx-auto aspect-square w-full max-w-[min(100%,240px)]">
        <div className="absolute inset-0 rounded-full border border-gray-700 bg-gradient-to-b from-gray-900 to-gray-950 shadow-inner shadow-black/40" />

        <div className="absolute left-1/2 top-[14%] z-10 -translate-x-1/2 text-center">
          <div className="text-2xl font-semibold tabular-nums text-white">{centerLabel}</div>
        </div>

        {step === "hour"
          ? hourAngles.map(({ label: h, rad }) => {
              const selected = hasValue && h === selectedHour12;
              const pos = polarToCss(rad, 38);
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => onPickHour(h)}
                  style={{ position: "absolute", transform: "translate(-50%, -50%)", ...pos }}
                  className={`z-[5] flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    selected
                      ? "scale-110 bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                      : "bg-gray-800/90 text-gray-100 hover:bg-gray-700"
                  }`}
                >
                  {h}
                </button>
              );
            })
          : minuteAngles.map(({ label: m, rad }, idx) => {
              const selected = hasValue && idx === selectedMinuteIdx;
              const pos = polarToCss(rad, 36);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onPickMinute(m)}
                  style={{ position: "absolute", transform: "translate(-50%, -50%)", ...pos }}
                  className={`z-[5] flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                    selected
                      ? "scale-110 bg-blue-600 text-white shadow-md"
                      : "bg-gray-800/90 text-gray-200 hover:bg-gray-700"
                  }`}
                >
                  {String(m).padStart(2, "0")}
                </button>
              );
            })}

        <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/80" />
      </div>

      <div className="flex justify-center gap-2">
        {step === "minute" ? (
          <button
            type="button"
            onClick={() => setStep("hour")}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-white/5"
          >
            ← {pickHourLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep("minute")}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-400 hover:bg-white/5"
          >
            {pickMinuteLabel} →
          </button>
        )}
      </div>
    </div>
  );
}
