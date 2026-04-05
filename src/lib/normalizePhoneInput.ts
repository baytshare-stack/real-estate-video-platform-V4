/**
 * Maps Arabic-Indic, Eastern Arabic-Indic, and fullwidth digits to ASCII 0–9
 * so validation and storage work when users type localized numerals.
 */
export function normalizePhoneDigits(input: string): string {
  let s = input.trim();
  const arabicIndic = "٠١٢٣٤٥٦٧٨٩";
  const persianIndic = "۰۱۲۳۴۵۶۷۸۹";
  const fullwidth = "０１２３４５６７８９";
  for (let i = 0; i < 10; i++) {
    const d = String(i);
    s = s.split(arabicIndic[i]!).join(d);
    s = s.split(persianIndic[i]!).join(d);
    s = s.split(fullwidth[i]!).join(d);
  }
  return s;
}

export function countDialDigits(normalizedInput: string): number {
  return (normalizedInput.match(/\d/g) || []).length;
}
