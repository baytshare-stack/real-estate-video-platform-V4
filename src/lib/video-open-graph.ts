import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { locales } from "@/i18n/config";
import { ModerationStatus, type Prisma } from "@prisma/client";
import { buildCanonical, buildLanguageAlternates, getSiteSeo } from "@/i18n/seo";
import { getSiteUrl } from "@/lib/site-url";
import prisma from "@/lib/prisma";
import { safeFindFirst } from "@/lib/safePrisma";

const OG_LABELS = {
  en: {
    price: "Price",
    beds: "Bedrooms",
    baths: "Bathrooms",
    area: "Area",
    sqm: "m²",
    location: "Location",
    separator: " · ",
  },
  ar: {
    price: "السعر",
    beds: "غرف النوم",
    baths: "الحمامات",
    area: "المساحة",
    sqm: "م²",
    location: "الموقع",
    separator: " · ",
  },
} as const;

export type WatchVideoOgRow = {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  videoUrl: string | null;
  moderationStatus: ModerationStatus;
  property: {
    price: Prisma.Decimal | null;
    currency: string;
    bedrooms: number | null;
    bathrooms: number | null;
    sizeSqm: number | null;
    city: string;
    country: string;
  } | null;
};

export async function getWatchVideoForOg(videoId: string): Promise<WatchVideoOgRow | null> {
  return safeFindFirst(() =>
    prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        videoUrl: true,
        moderationStatus: true,
        property: {
          select: {
            price: true,
            currency: true,
            bedrooms: true,
            bathrooms: true,
            sizeSqm: true,
            city: true,
            country: true,
          },
        },
      },
    })
  );
}

export function ogLabels(locale: Locale) {
  return OG_LABELS[locale] ?? OG_LABELS.en;
}

export function formatOgPrice(locale: Locale, price: Prisma.Decimal | null | undefined, currency: string): string | null {
  if (price === null || price === undefined) return null;
  const n = Number(price);
  if (!Number.isFinite(n)) return null;
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    maximumFractionDigits: 0,
  }).format(n);
  return `${formatted} ${currency}`;
}

export function formatBathrooms(bathrooms: number | null | undefined): string | null {
  if (bathrooms === null || bathrooms === undefined) return null;
  if (Number.isInteger(bathrooms)) return String(bathrooms);
  return bathrooms.toFixed(1);
}

/** Social / meta description: listing facts + optional excerpt from video description. */
export function buildWatchVideoOgDescription(locale: Locale, row: WatchVideoOgRow, maxLen = 220): string {
  const L = ogLabels(locale);
  const parts: string[] = [];
  const p = row.property;

  if (p) {
    const priceStr = formatOgPrice(locale, p.price, p.currency);
    if (priceStr) parts.push(`${L.price}: ${priceStr}`);
    if (p.bedrooms != null) parts.push(`${L.beds}: ${p.bedrooms}`);
    const baths = formatBathrooms(p.bathrooms);
    if (baths) parts.push(`${L.baths}: ${baths}`);
    if (p.sizeSqm != null && Number.isFinite(p.sizeSqm)) {
      parts.push(`${L.area}: ${Math.round(p.sizeSqm)} ${L.sqm}`);
    }
    if (p.city || p.country) {
      parts.push(`${L.location}: ${[p.city, p.country].filter(Boolean).join(", ")}`);
    }
  }

  const facts = parts.join(L.separator);
  const excerpt = row.description?.trim();
  if (excerpt && facts) {
    const combined = `${facts}${L.separator}${excerpt}`;
    return combined.length <= maxLen ? combined : `${facts}${L.separator}${excerpt.slice(0, Math.max(0, maxLen - facts.length - 3))}…`;
  }
  if (facts) return facts.length <= maxLen ? facts : `${facts.slice(0, maxLen - 1)}…`;
  if (excerpt) return excerpt.length <= maxLen ? excerpt : `${excerpt.slice(0, maxLen - 1)}…`;
  return locale === "ar" ? "جولة فيديو عقارية على ريال إستيت تي في" : "Property video tour on Real Estate TV";
}

function isLikelyDirectVideoFile(url: string): boolean {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return false;
  return (
    /\.(mp4|webm|mov)(\?|$)/i.test(u) ||
    u.includes("/video/upload/") ||
    (u.includes("res.cloudinary.com") && u.includes("/video/"))
  );
}

/** Full metadata for watch pages: `video.other` OG, Twitter large card; image comes from `opengraph-image.tsx`. */
export function buildVideoWatchPageMetadata(
  locale: Locale,
  videoId: string,
  row: WatchVideoOgRow,
  opts?: { noIndex?: boolean }
): Metadata {
  const pathWithoutLocale = `/watch/${videoId}`;
  const canonical = buildCanonical(locale, pathWithoutLocale);
  const languages = buildLanguageAlternates(pathWithoutLocale);
  const site = getSiteSeo(locale);
  const siteName = locale === "ar" ? "ريال إستيت تي في" : "Real Estate TV";
  const title = row.title;
  const description = buildWatchVideoOgDescription(locale, row);
  const ogImageUrl = new URL(`/${locale}/watch/${videoId}/opengraph-image`, getSiteUrl()).href;

  const openGraphVideos =
    row.videoUrl && isLikelyDirectVideoFile(row.videoUrl)
      ? [{ url: row.videoUrl, type: row.videoUrl.toLowerCase().includes(".webm") ? "video/webm" : "video/mp4" }]
      : undefined;

  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    keywords: site.keywords,
    alternates: { canonical, languages },
    openGraph: {
      type: "video.other",
      locale: locale === "ar" ? "ar_SA" : "en_US",
      alternateLocale: locales.filter((l) => l !== locale).map((l) => (l === "ar" ? "ar_SA" : "en_US")),
      url: canonical,
      siteName,
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
      ...(openGraphVideos ? { videos: openGraphVideos } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    robots: opts?.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}
