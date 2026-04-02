import { stripNationalTrunkZero } from "@/lib/countriesData";

/** Build international digits (no +) for WhatsApp wa.me/{digits} */

export type CrmUserPhoneFields = {
  fullPhoneNumber?: string | null;
  phone?: string | null;
  phoneNumber?: string | null;
  phoneCode?: string | null;
};

export function whatsappDigits(user: CrmUserPhoneFields): string | null {
  if (user.fullPhoneNumber?.trim()) {
    const d = user.fullPhoneNumber.replace(/\D/g, "");
    if (d.length >= 8) return d;
  }
  if (user.phone?.trim()) {
    const d = user.phone.replace(/\D/g, "");
    if (d.length >= 8) return d;
  }
  if (user.phoneCode?.trim() && user.phoneNumber?.trim()) {
    const code = user.phoneCode.replace(/\D/g, "");
    const num = stripNationalTrunkZero(user.phoneNumber);
    const combined = code + num;
    if (combined.length >= 8) return combined;
  }
  return null;
}

/** E.164-style href for tel: */
export function telHref(user: CrmUserPhoneFields): string | null {
  const raw = user.fullPhoneNumber?.trim();
  if (raw?.startsWith("+")) {
    const compact = raw.replace(/\s/g, "");
    return `tel:${compact}`;
  }
  const d = whatsappDigits(user);
  if (d) return `tel:+${d}`;
  return null;
}

export function whatsappUrl(digits: string, prefilledText: string): string {
  const text = encodeURIComponent(prefilledText);
  return `https://wa.me/${digits}?text=${text}`;
}

export function mailtoInquiryUrl(
  email: string,
  opts: { leadName: string; subject?: string; bodyIntro?: string }
): string {
  const subject = opts.subject ?? "Property inquiry";
  const body =
    opts.bodyIntro ??
    `Hello ${opts.leadName},\n\nI am reaching out regarding your interest in our real estate listings on RealEstateTV.\n\nBest regards`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
