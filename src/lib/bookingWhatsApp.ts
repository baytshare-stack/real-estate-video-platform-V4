/**
 * Optional Meta WhatsApp Cloud API outbound text.
 * Set WHATSAPP_CLOUD_API_TOKEN and WHATSAPP_CLOUD_PHONE_NUMBER_ID to enable.
 * `to` must be digits only (country code + number, no +).
 */
export async function sendWhatsAppCloudText(toDigits: string, body: string): Promise<boolean> {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) return false;

  const digits = toDigits.replace(/\D/g, "");
  if (digits.length < 8) return false;

  const text = body.trim().slice(0, 4096);
  if (!text) return false;

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: digits,
        type: "text",
        text: { body: text },
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn("[bookingWhatsApp] Cloud API error", res.status, errText.slice(0, 500));
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[bookingWhatsApp] Cloud API fetch failed", e);
    return false;
  }
}
