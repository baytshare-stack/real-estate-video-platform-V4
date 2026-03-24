"use client";

import React from "react";
import { COUNTRIES, type CountryOption } from "@/lib/countriesData";

export type { CountryOption };
export { COUNTRIES, getCountryByIso } from "@/lib/countriesData";

type CountrySelectProps = {
  label?: string;
  value: string | null | undefined;
  onChange: (iso2: string) => void;
  disabled?: boolean;
};

export default function CountrySelect({ label = "Country", value, onChange, disabled }: CountrySelectProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        {label} <span className="text-red-500">*</span>
      </label>
      <select
        className="w-full bg-gray-800/60 border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 transition-colors"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          Select a country
        </option>
        {COUNTRIES.map((c) => (
          <option key={c.iso2} value={c.iso2}>
            {c.flag} {c.name} ({c.phoneCode})
          </option>
        ))}
      </select>
    </div>
  );
}
