"use client";

import React from "react";
import { COUNTRIES, type CountryOption } from "@/lib/countriesData";
import { useTranslation } from "@/i18n/LanguageProvider";

export type { CountryOption };
export { COUNTRIES, getCountryByIso } from "@/lib/countriesData";

type CountrySelectProps = {
  label?: string;
  value: string | null | undefined;
  onChange: (iso2: string) => void;
  disabled?: boolean;
};

export default function CountrySelect({ label, value, onChange, disabled }: CountrySelectProps) {
  const { t } = useTranslation();
  const displayLabel = label ?? t("countrySelect", "label");
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        {displayLabel} <span className="text-red-500">*</span>
      </label>
      <select
        className="w-full bg-gray-800/60 border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-blue-500/50 transition-colors"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          {t("countrySelect", "placeholder")}
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
