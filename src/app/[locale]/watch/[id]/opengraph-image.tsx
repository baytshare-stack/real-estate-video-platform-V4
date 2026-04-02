import { ImageResponse } from "next/og";
import { ModerationStatus } from "@prisma/client";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import {
  formatBathrooms,
  formatOgPrice,
  getWatchVideoForOg,
  ogLabels,
} from "@/lib/video-open-graph";

export const alt = "Property video";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function fetchFontBuffer(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
    const cssRes = await fetch(cssUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 86400 },
    });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const m = css.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/);
    const url = (m?.[1] ?? css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/)?.[1])?.replace(/"/g, "");
    if (!url) return null;
    const fontRes = await fetch(url, { next: { revalidate: 86400 } });
    if (!fontRes.ok) return null;
    return fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

function truncateTitle(s: string, max = 88): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function thumbnailDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { next: { revalidate: 3600 } });
    if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    const ct = r.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    if (!ct.startsWith("image/")) return null;
    const b64 = Buffer.from(buf).toString("base64");
    return `data:${ct};base64,${b64}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: loc, id } = await params;
  const locale: Locale = locales.includes(loc as Locale) ? (loc as Locale) : defaultLocale;
  const isRtl = locale === "ar";
  const L = ogLabels(locale);

  const fontName = isRtl ? "Noto Sans Arabic" : "Noto Sans";
  const fontData = await fetchFontBuffer(fontName, 700);
  const fonts = fontData
    ? [{ name: "OGFont", data: fontData, weight: 700 as const, style: "normal" as const }]
    : [];

  const row = await getWatchVideoForOg(id);
  const showRich = row && row.moderationStatus === ModerationStatus.APPROVED;

  if (!showRich) {
    const msg = locale === "ar" ? "الفيديو غير متاح" : "Video unavailable";
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(145deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
            color: "#e2e8f0",
            fontSize: 52,
            fontWeight: 700,
            fontFamily: fontData ? "OGFont" : "system-ui",
          }}
        >
          {msg}
        </div>
      ),
      { ...size, fonts }
    );
  }

  const bgSrc = row.thumbnail ? await thumbnailDataUrl(row.thumbnail) : null;
  const p = row.property;
  const priceStr = p ? formatOgPrice(locale, p.price, p.currency) : null;
  const baths = p ? formatBathrooms(p.bathrooms) : null;

  const chips: { key: string; text: string }[] = [];
  if (priceStr) chips.push({ key: "p", text: `${L.price}: ${priceStr}` });
  if (p?.bedrooms != null) chips.push({ key: "b", text: `${L.beds}: ${p.bedrooms}` });
  if (baths) chips.push({ key: "ba", text: `${L.baths}: ${baths}` });
  if (p?.sizeSqm != null && Number.isFinite(p.sizeSqm)) {
    chips.push({ key: "a", text: `${L.area}: ${Math.round(p.sizeSqm)} ${L.sqm}` });
  }

  const title = truncateTitle(row.title);
  const ff = fontData ? "OGFont" : "system-ui";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          backgroundColor: "#0f172a",
        }}
      >
        {bgSrc ? (
          <img
            src={bgSrc}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.6) 42%, rgba(0,0,0,0.2) 68%, transparent 100%)",
          }}
        />
        <div
          style={{
            marginTop: "auto",
            padding: "44px 52px 48px",
            display: "flex",
            flexDirection: "column",
            gap: 22,
            position: "relative",
            zIndex: 1,
            direction: isRtl ? "rtl" : "ltr",
          }}
        >
          <div
            style={{
              fontSize: row.title.length > 70 ? 36 : 42,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.2,
              fontFamily: ff,
              textShadow: "0 4px 24px rgba(0,0,0,0.9)",
              maxHeight: 120,
              overflow: "hidden",
            }}
          >
            {title}
          </div>
          {chips.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: isRtl ? "row-reverse" : "row",
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              {chips.map((c) => (
                <div
                  key={c.key}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    borderRadius: 14,
                    padding: "12px 20px",
                    fontSize: 24,
                    color: "#f1f5f9",
                    fontFamily: ff,
                    fontWeight: 600,
                  }}
                >
                  {c.text}
                </div>
              ))}
            </div>
          ) : null}
          <div
            style={{
              fontSize: 20,
              color: "rgba(248,250,252,0.75)",
              fontFamily: ff,
              marginTop: 4,
            }}
          >
            {locale === "ar" ? "ريال إستيت تي في" : "Real Estate TV"}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
