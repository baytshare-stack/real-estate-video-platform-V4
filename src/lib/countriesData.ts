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

export function buildFullPhoneNumber(iso2: string | undefined, nationalDigits: string): string | null {
  const c = getCountryByIso(iso2);
  const digits = nationalDigits.replace(/\D/g, "");
  if (!c || !digits) return null;
  return `+${c.phoneCodeDigits}${digits}`;
}

export function buildWhatsappFull(iso2: string | undefined, whatsappInput: string): string | null {
  const trimmed = whatsappInput.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    return `+${trimmed.replace(/\D/g, "")}`;
  }
  return buildFullPhoneNumber(iso2, trimmed);
}
