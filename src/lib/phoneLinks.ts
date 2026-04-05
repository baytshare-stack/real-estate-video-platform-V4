/** Digits only for wa.me (country code should be included when possible). */
export function digitsForDialing(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function whatsappToNumberUrl(phone: string, message: string): string {
  const d = digitsForDialing(phone);
  if (!d) return "#";
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}

export function telHref(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "#";
  const compact = trimmed.replace(/\s+/g, "");
  if (compact.startsWith("+")) return `tel:${compact}`;
  return `tel:${digitsForDialing(trimmed)}`;
}
