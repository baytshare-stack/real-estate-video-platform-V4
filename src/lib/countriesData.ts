export type CountryOption = {
  iso2: string;
  name: string;
  flag: string;
  phoneCode: string;
  phoneCodeDigits: string;
};

export const COUNTRIES: CountryOption[] = [
  { iso2: "EG", name: "Egypt", flag: "🇪🇬", phoneCode: "+20", phoneCodeDigits: "20" },
  { iso2: "SA", name: "Saudi Arabia", flag: "🇸🇦", phoneCode: "+966", phoneCodeDigits: "966" },
  { iso2: "AE", name: "United Arab Emirates", flag: "🇦🇪", phoneCode: "+971", phoneCodeDigits: "971" },
  { iso2: "US", name: "United States", flag: "🇺🇸", phoneCode: "+1", phoneCodeDigits: "1" },
  { iso2: "GB", name: "United Kingdom", flag: "🇬🇧", phoneCode: "+44", phoneCodeDigits: "44" },
  { iso2: "FR", name: "France", flag: "🇫🇷", phoneCode: "+33", phoneCodeDigits: "33" },
  { iso2: "DE", name: "Germany", flag: "🇩🇪", phoneCode: "+49", phoneCodeDigits: "49" },
  { iso2: "CA", name: "Canada", flag: "🇨🇦", phoneCode: "+1", phoneCodeDigits: "1" },
  { iso2: "AU", name: "Australia", flag: "🇦🇺", phoneCode: "+61", phoneCodeDigits: "61" },
];

export function getCountryByIso(iso2: string | null | undefined): CountryOption | undefined {
  if (!iso2) return undefined;
  return COUNTRIES.find((c) => c.iso2 === iso2);
}

const SORTED_BY_CODE_LEN: CountryOption[] = [...COUNTRIES].sort(
  (a, b) => b.phoneCodeDigits.length - a.phoneCodeDigits.length
);

/** Remove a single domestic trunk "0" after the country code (national field). */
export function stripNationalTrunkZero(nationalDigits: string): string {
  const d = nationalDigits.replace(/\D/g, "");
  if (d.length <= 1) return d;
  if (d.startsWith("0")) return d.slice(1);
  return d;
}

/**
 * E.164 (+digits) from country + national input. Strips a leading 0 from the national part
 * and avoids duplicating the country code if the user pasted it into the national field.
 */
export function buildFullPhoneNumber(iso2: string | undefined, nationalDigits: string): string | null {
  const c = getCountryByIso(iso2);
  if (!c) return null;
  let digits = nationalDigits.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith(c.phoneCodeDigits)) {
    const rest = stripNationalTrunkZero(digits.slice(c.phoneCodeDigits.length));
    if (!rest) return null;
    return `+${c.phoneCodeDigits}${rest}`;
  }

  const national = stripNationalTrunkZero(digits);
  if (!national) return null;

  if (national.startsWith(c.phoneCodeDigits)) {
    return `+${national}`;
  }

  return `+${c.phoneCodeDigits}${national}`;
}

/**
 * Normalize a string that already starts with + (spaces allowed). Removes a spurious 0
 * right after the country code (e.g. +20 010… → +2010…).
 */
export function normalizePlusE164(raw: string, hintIso2?: string | null): string | null {
  const compact = raw.trim().replace(/\s+/g, "");
  if (!compact.startsWith("+")) return null;
  const allDigits = compact.slice(1).replace(/\D/g, "");
  if (allDigits.length < 7 || allDigits.length > 15) return null;

  const tryCountry = (country: CountryOption): string | null => {
    if (!allDigits.startsWith(country.phoneCodeDigits)) return null;
    let rest = allDigits.slice(country.phoneCodeDigits.length);
    rest = stripNationalTrunkZero(rest);
    if (!rest) return null;
    const out = `+${country.phoneCodeDigits}${rest}`;
    const check = out.slice(1).replace(/\D/g, "");
    if (check.length < 7 || check.length > 15) return null;
    return out;
  };

  if (hintIso2) {
    const c = getCountryByIso(hintIso2);
    if (c) {
      const hit = tryCountry(c);
      if (hit) return hit;
    }
  }

  for (const c of SORTED_BY_CODE_LEN) {
    const hit = tryCountry(c);
    if (hit) return hit;
  }

  return `+${allDigits}`;
}

/** Readable spacing for UI (not for wa.me). */
export function inferPhoneCodeFromE164(normalized: string): string | null {
  const digits = normalized.slice(1).replace(/\D/g, "");
  for (const c of SORTED_BY_CODE_LEN) {
    if (digits.startsWith(c.phoneCodeDigits)) return c.phoneCode;
  }
  return null;
}

export function formatE164ForDisplay(e164: string | null | undefined): string {
  if (!e164?.trim()) return "";
  const n = e164.trim().startsWith("+")
    ? normalizePlusE164(e164)
    : normalizePlusE164(`+${e164.replace(/\D/g, "")}`);
  if (!n) return e164.trim();
  const digits = n.slice(1);
  for (const c of SORTED_BY_CODE_LEN) {
    if (digits.startsWith(c.phoneCodeDigits)) {
      const rest = digits.slice(c.phoneCodeDigits.length);
      const restFmt = rest.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
      return `${c.phoneCode} ${restFmt}`.trim();
    }
  }
  return `+${digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim()}`;
}

export function buildWhatsappFull(iso2: string | undefined, whatsappInput: string): string | null {
  const trimmed = whatsappInput.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    return normalizePlusE164(trimmed, iso2);
  }
  return buildFullPhoneNumber(iso2, trimmed);
}
