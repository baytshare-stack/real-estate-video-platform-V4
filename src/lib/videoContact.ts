import { formatE164ForDisplay } from "@/lib/countriesData";
import { whatsappDigits } from "@/lib/crmContactLinks";

export type WatchContactOwner = {
  fullPhoneNumber: string | null;
  whatsapp: string | null;
  phone: string | null;
  phoneCode: string | null;
  phoneNumber: string | null;
};

export type WatchContactChannel = {
  phone: string | null;
  whatsapp: string | null;
  whatsappUrl: string | null;
};

const WA_PREFILL = "I am interested in this property and would like more information.";

/**
 * Phone / WhatsApp for the watch page: prefers channel studio settings, then owner account fields.
 * Never concatenates phoneCode + phoneNumber (those can both hold full international digits).
 */
export function buildWatchPageContact(
  owner: WatchContactOwner | null | undefined,
  channel: WatchContactChannel | null | undefined
): { rawPhone: string | null; whatsappLink: string | null; email: string | null } | null {
  const o = owner;
  const c = channel;

  const phoneLine =
    c?.phone?.trim() ||
    o?.fullPhoneNumber?.trim() ||
    (o?.phone && o.phone.replace(/\D/g, "").length >= 7 ? `+${o.phone.replace(/\D/g, "")}` : null);

  const rawPhone = phoneLine
    ? phoneLine.startsWith("+")
      ? formatE164ForDisplay(phoneLine) || phoneLine
      : phoneLine
    : null;

  let whatsappLink: string | null = null;
  const url = c?.whatsappUrl?.trim();
  if (url) {
    whatsappLink = url;
  } else {
    const chWa = c?.whatsapp?.replace(/\D/g, "") ?? "";
    const ownWa = o?.whatsapp?.replace(/\D/g, "") ?? "";
    const fromChannel = chWa.length >= 8 ? chWa : null;
    const fromOwner = ownWa.length >= 8 ? ownWa : null;
    const fromUserFields = whatsappDigits({
      fullPhoneNumber: o?.fullPhoneNumber,
      phone: o?.phone,
      phoneCode: o?.phoneCode,
      phoneNumber: o?.phoneNumber,
    });
    const fromPhoneLine = phoneLine ? phoneLine.replace(/\D/g, "") : null;
    const waDigits =
      fromChannel ||
      fromOwner ||
      (fromUserFields && fromUserFields.length >= 8 ? fromUserFields : null) ||
      (fromPhoneLine && fromPhoneLine.length >= 8 ? fromPhoneLine : null);

    if (waDigits) {
      whatsappLink = `https://wa.me/${waDigits}?text=${encodeURIComponent(WA_PREFILL)}`;
    }
  }

  if (!rawPhone && !whatsappLink) return null;
  return { rawPhone, whatsappLink, email: null };
}
