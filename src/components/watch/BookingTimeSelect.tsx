"use client";

import { useMemo, useState } from "react";

type Period = "AM" | "PM";

type BookingTimeSelectProps = {
  value: string;
  onChange: (timeStr: string) => void;
  dir: "ltr" | "rtl";
  amLabel: string;
  pmLabel: string;
  hourPlaceholder: string;
  periodPlaceholder: string;
};

function parseHm(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

function toTimeStr24(h24: number): string {
  return `${String(h24).padStart(2, "0")}:00`;
}

function from24To12(h24: number): { hour12: number; period: Period } {
  if (h24 === 0) return { hour12: 12, period: "AM" };
  if (h24 < 12) return { hour12: h24, period: "AM" };
  if (h24 === 12) return { hour12: 12, period: "PM" };
  return { hour12: h24 - 12, period: "PM" };
}

function encode12(h12: number, p: Period): string {
  let h24: number;
  if (p === "AM") {
    h24 = h12 === 12 ? 0 : h12;
  } else {
    h24 = h12 === 12 ? 12 : h12 + 12;
  }
  return toTimeStr24(h24);
}

const selectClass =
  "min-w-0 flex-1 rounded-xl border border-gray-700 bg-gray-950 px-2 py-2.5 text-sm text-white outline-none focus:border-blue-500";

export default function BookingTimeSelect({
  value,
  onChange,
  dir,
  amLabel,
  pmLabel,
  hourPlaceholder,
  periodPlaceholder,
}: BookingTimeSelectProps) {
  const parsed = useMemo(() => parseHm(value), [value]);
  const [partial, setPartial] = useState<{ h: number | ""; p: Period | "" }>({ h: "", p: "" });

  const hour12 = parsed ? from24To12(parsed.h).hour12 : partial.h;
  const period = parsed ? from24To12(parsed.h).period : partial.p;

  const onHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === "") {
      setPartial({ h: "", p: "" });
      onChange("");
      return;
    }
    const n = Number(v);
    const pEff = parsed ? from24To12(parsed.h).period : partial.p;
    setPartial((prev) => ({ ...prev, h: n }));
    if (pEff === "AM" || pEff === "PM") onChange(encode12(n, pEff));
  };

  const onPeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v !== "AM" && v !== "PM") {
      setPartial({ h: "", p: "" });
      onChange("");
      return;
    }
    const p = v as Period;
    const hEff = parsed ? from24To12(parsed.h).hour12 : partial.h;
    setPartial((prev) => ({ ...prev, p }));
    if (hEff !== "") onChange(encode12(hEff as number, p));
  };

  return (
    <div className="flex flex-wrap items-stretch gap-2" dir={dir}>
      <select
        value={hour12 === "" ? "" : String(hour12)}
        onChange={onHourChange}
        className={selectClass}
        aria-label={hourPlaceholder}
      >
        <option value="">{hourPlaceholder}</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <select
        value={period}
        onChange={onPeriodChange}
        className={`${selectClass} max-w-[6rem]`}
        aria-label={periodPlaceholder}
      >
        <option value="">{periodPlaceholder}</option>
        <option value="AM">{amLabel}</option>
        <option value="PM">{pmLabel}</option>
      </select>
    </div>
  );
}
