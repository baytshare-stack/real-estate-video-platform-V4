import type { Metadata } from "next";
import type { Locale } from "./config";
import { locales } from "./config";
import { getSiteUrl } from "@/lib/site-url";
import { prefixWithLocale, stripLocaleFromPathname } from "./routing";

type SeoFields = {
  title: string;
  description: string;
  keywords?: string[];
};

const seo: Record<Locale, { site: SeoFields }> = {
  en: {
    site: {
      title: "Real Estate TV — Property video tours & listings",
      description:
        "Watch and share professional real estate video tours. Explore homes, apartments, and commercial listings with maps, agents, and agencies worldwide.",
      keywords: [
        "real estate video",
        "property tours",
        "listings",
        "homes for sale",
        "Dubai real estate",
        "agents",
        "agencies",
      ],
    },
  },
  ar: {
    site: {
      title: "ريال إستيت تي في — جولات فيديو وعقارات",
      description:
        "شاهد وشارك جولات فيديو احترافية للعقارات. استكشف المنازل والشقق والعقارات التجارية مع الخرائط والوكلاء والوكالات.",
      keywords: ["عقارات", "فيديو عقاري", "جولات", "بيع", "إيجار", "دبي", "وكلاء"],
    },
  },
};

export function getSiteSeo(locale: Locale): SeoFields {
  const block = seo[locale] ?? seo.en;
  return { ...block.site };
}

/** Per-path copy for public routes (no locale prefix). "/" uses `getSiteSeo` via `staticPageMetadata`. */
const ROUTE_STATIC_SEO: Record<string, Record<Locale, SeoFields>> = {
  "/login": {
    en: {
      title: "Sign in",
      description: "Sign in to Real Estate TV to upload property tours, subscribe to channels, and message agents.",
      keywords: ["login", "sign in", "real estate"],
    },
    ar: {
      title: "تسجيل الدخول",
      description: "سجّل الدخول إلى ريال إستيت تي في لرفع جولات العقارات والاشتراك في القنوات ومراسلة الوكلاء.",
      keywords: ["دخول", "تسجيل"],
    },
  },
  "/register": {
    en: {
      title: "Create account",
      description: "Join Real Estate TV to list properties, publish video tours, and grow your audience.",
      keywords: ["register", "sign up", "agent account"],
    },
    ar: {
      title: "إنشاء حساب",
      description: "انضم إلى ريال إستيت تي في لعرض العقارات ونشر جولات الفيديو وتنمية جمهورك.",
      keywords: ["تسجيل", "حساب جديد"],
    },
  },
  "/upload": {
    en: {
      title: "Upload property video",
      description: "Upload a professional real estate video tour or listing to your channel.",
      keywords: ["upload video", "property listing", "real estate upload"],
    },
    ar: {
      title: "رفع فيديو عقاري",
      description: "ارفع جولة فيديو أو إعلان عقاري احترافي إلى قناتك.",
      keywords: ["رفع فيديو", "عقار"],
    },
  },
  "/upload-video": {
    en: {
      title: "Upload video (dashboard)",
      description: "Add a new listing video from your creator dashboard.",
      keywords: ["upload", "dashboard"],
    },
    ar: {
      title: "رفع فيديو (لوحة التحكم)",
      description: "أضف فيديو إعلان جديد من لوحة منشئ المحتوى.",
      keywords: ["رفع", "لوحة التحكم"],
    },
  },
  "/create-channel": {
    en: {
      title: "Create a channel",
      description: "Start your Real Estate TV channel to publish listings and shorts.",
      keywords: ["create channel", "real estate channel"],
    },
    ar: {
      title: "إنشاء قناة",
      description: "ابدأ قناة ريال إستيت تي في لنشر الإعلانات والفيديوهات القصيرة.",
      keywords: ["قناة", "إنشاء"],
    },
  },
  "/profile": {
    en: {
      title: "Your profile",
      description: "Manage your Real Estate TV profile, contact details, and channel branding.",
      keywords: ["profile", "account settings"],
    },
    ar: {
      title: "ملفك الشخصي",
      description: "أدر ملفك على ريال إستيت تي في وبيانات التواصل وهوية القناة.",
      keywords: ["ملف", "حساب"],
    },
  },
  "/studio": {
    en: {
      title: "Creator studio",
      description: "Analytics, content, CRM, and channel settings for real estate creators.",
      keywords: ["studio", "creator dashboard", "analytics"],
    },
    ar: {
      title: "استوديو المنشئ",
      description: "التحليلات والمحتوى وإدارة العملاء وإعدادات القناة للمنشئين.",
      keywords: ["استوديو", "تحليلات"],
    },
  },
  "/studio/profile": {
    en: {
      title: "Studio profile",
      description: "Edit your public studio profile and channel appearance.",
      keywords: ["studio profile", "channel profile"],
    },
    ar: {
      title: "ملف الاستوديو",
      description: "عدّل ملف الاستوديو العام ومظهر قناتك.",
      keywords: ["ملف", "استوديو"],
    },
  },
  "/shorts": {
    en: {
      title: "Property shorts",
      description: "Short-form real estate videos and quick property highlights.",
      keywords: ["shorts", "real estate shorts", "vertical video"],
    },
    ar: {
      title: "فيديوهات قصيرة",
      description: "فيديوهات عقارية قصيرة ولمحات سريعة عن العقارات.",
      keywords: ["قصير", "عقار"],
    },
  },
  "/subscribers": {
    en: {
      title: "Subscribers",
      description: "People and channels connected to your account on Real Estate TV.",
      keywords: ["subscribers", "followers"],
    },
    ar: {
      title: "المشتركون",
      description: "الأشخاص والقنوات المرتبطة بحسابك على ريال إستيت تي في.",
      keywords: ["مشتركين"],
    },
  },
  "/subscriptions": {
    en: {
      title: "Subscriptions",
      description: "Channels you follow on Real Estate TV.",
      keywords: ["subscriptions", "following"],
    },
    ar: {
      title: "الاشتراكات",
      description: "القنوات التي تتابعها على ريال إستيت تي في.",
      keywords: ["اشتراكات"],
    },
  },
  "/explore": {
    en: {
      title: "Explore listings",
      description: "Discover property videos, map view, and curated real estate content.",
      keywords: ["explore", "map", "listings"],
    },
    ar: {
      title: "استكشف العقارات",
      description: "اكتشف فيديوهات العقارات وعرض الخريطة والمحتوى المختار.",
      keywords: ["استكشاف", "خريطة"],
    },
  },
  "/agents": {
    en: {
      title: "Real estate agents",
      description: "Find verified agents and browse their listings on Real Estate TV.",
      keywords: ["agents", "realtors", "brokers"],
    },
    ar: {
      title: "وكلاء عقاريون",
      description: "اعثر على وكلاء موثوقين وتصفح إعلاناتهم على ريال إستيت تي في.",
      keywords: ["وكلاء", "وسطاء"],
    },
  },
  "/agencies": {
    en: {
      title: "Real estate agencies",
      description: "Discover agencies and their property video channels.",
      keywords: ["agencies", "brokerage", "real estate firm"],
    },
    ar: {
      title: "وكالات عقارية",
      description: "اكتشف الوكالات وقنوات فيديو العقارات الخاصة بها.",
      keywords: ["وكالات", "شركات عقارية"],
    },
  },
  "/trending": {
    en: {
      title: "Trending property videos",
      description: "Popular real estate tours and listings trending now.",
      keywords: ["trending", "popular", "viral listings"],
    },
    ar: {
      title: "الأكثر مشاهدة",
      description: "جولات وإعلانات عقارية رائجة الآن.",
      keywords: ["ترند", "شائع"],
    },
  },
  "/search": {
    en: {
      title: "Search",
      description: "Search property videos, channels, and agents on Real Estate TV.",
      keywords: ["search", "find listings"],
    },
    ar: {
      title: "بحث",
      description: "ابحث عن فيديوهات العقارات والقنوات والوكلاء على ريال إستيت تي في.",
      keywords: ["بحث"],
    },
  },
  "/dashboard": {
    en: {
      title: "Dashboard",
      description: "Creator dashboard on Real Estate TV.",
      keywords: ["dashboard"],
    },
    ar: {
      title: "لوحة التحكم",
      description: "لوحة منشئ المحتوى على ريال إستيت تي في.",
      keywords: ["لوحة التحكم"],
    },
  },
  "/dashboard/videos": {
    en: {
      title: "My videos",
      description: "Manage your uploaded property videos and listings.",
      keywords: ["my videos", "listings"],
    },
    ar: {
      title: "فيديوهاتي",
      description: "أدر فيديوهاتك وإعلاناتك العقارية المرفوعة.",
      keywords: ["فيديوهات"],
    },
  },
  "/auth/post-login": {
    en: {
      title: "Signing you in",
      description: "Completing sign-in and redirecting you on Real Estate TV.",
      keywords: [],
    },
    ar: {
      title: "جارٍ تسجيل الدخول",
      description: "إتمام تسجيل الدخول وإعادة التوجيه على ريال إستيت تي في.",
      keywords: [],
    },
  },
};

export function staticPageMetadata(locale: Locale, pathWithoutLocale: string): Metadata {
  const site = getSiteSeo(locale);
  const row = pathWithoutLocale === "/" ? undefined : ROUTE_STATIC_SEO[pathWithoutLocale];
  const fields = row ? (row[locale] ?? row.en) : site;
  return buildPageMetadata({
    locale,
    pathWithoutLocale,
    title: fields.title,
    description: fields.description,
    keywords: fields.keywords?.length ? fields.keywords : site.keywords,
  });
}

/** Static public paths for sitemaps (each × every locale). */
export function listPublicStaticSeoPaths(): string[] {
  return ["/", ...Object.keys(ROUTE_STATIC_SEO)];
}

export function buildLanguageAlternates(pathWithoutLocale: string): Record<string, string> {
  const base = getSiteUrl();
  const path = pathWithoutLocale === "/" ? "" : pathWithoutLocale;
  const map: Record<string, string> = {};
  for (const loc of locales) {
    map[loc] = `${base}${prefixWithLocale(loc, path)}`;
  }
  map["x-default"] = `${base}${prefixWithLocale("en", path)}`;
  return map;
}

export function buildCanonical(locale: Locale, pathWithoutLocale: string): string {
  const base = getSiteUrl();
  const path = pathWithoutLocale === "/" ? "" : pathWithoutLocale;
  return `${base}${prefixWithLocale(locale, path)}`;
}

type BuildMetadataArgs = {
  locale: Locale;
  /** Path without locale prefix, e.g. "/upload" or "/" */
  pathWithoutLocale: string;
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string | null;
  noIndex?: boolean;
};

export function buildPageMetadata({
  locale,
  pathWithoutLocale,
  title,
  description,
  keywords,
  ogImage,
  noIndex,
}: BuildMetadataArgs): Metadata {
  const site = getSiteSeo(locale);
  const pageTitle = title ?? site.title;
  const pageDesc = description ?? site.description;
  const pageKeywords = keywords ?? site.keywords;
  const canonical = buildCanonical(locale, pathWithoutLocale);
  const languages = buildLanguageAlternates(pathWithoutLocale);
  const imageUrl =
    ogImage === null
      ? undefined
      : ogImage
        ? ogImage.startsWith("http")
          ? ogImage
          : `${getSiteUrl()}${ogImage.startsWith("/") ? ogImage : `/${ogImage}`}`
        : undefined;

  const meta: Metadata = {
    metadataBase: new URL(getSiteUrl()),
    title: pageTitle,
    description: pageDesc,
    keywords: pageKeywords,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: "website",
      locale: locale === "ar" ? "ar_SA" : "en_US",
      alternateLocale: locales.filter((l) => l !== locale).map((l) => (l === "ar" ? "ar_SA" : "en_US")),
      url: canonical,
      siteName: locale === "ar" ? "ريال إستيت تي في" : "Real Estate TV",
      title: pageTitle,
      description: pageDesc,
      ...(imageUrl ? { images: [{ url: imageUrl, width: 1200, height: 630, alt: pageTitle }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDesc,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };

  return meta;
}

/** Derive path segment for metadata from a request pathname (may include /en or /ar). */
export function pathWithoutLocaleFromPathname(pathname: string): string {
  return stripLocaleFromPathname(pathname);
}

export async function localeFromParams(params: Promise<{ locale?: string }>): Promise<Locale | null> {
  const { locale: loc } = await params;
  if (!loc || !locales.includes(loc as Locale)) return null;
  return loc as Locale;
}

/** Typed helper for `generateMetadata` in `[locale]/...` routes. */
export function pageMetadata(
  locale: Locale,
  pathWithoutLocale: string,
  overrides?: Omit<BuildMetadataArgs, "locale" | "pathWithoutLocale">
): Metadata {
  return buildPageMetadata({ locale, pathWithoutLocale, ...overrides });
}
