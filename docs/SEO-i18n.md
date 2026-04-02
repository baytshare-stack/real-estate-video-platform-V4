# SEO and multilingual routing

This app serves public pages under **`/{locale}/...`** where `locale` is `en` or `ar`. Middleware redirects bare paths (e.g. `/upload`) to the resolved locale (`/en/upload` or `/ar/upload`) using the `retv-locale` cookie and `Accept-Language`.

## Environment

Set **`NEXT_PUBLIC_SITE_URL`** to your canonical origin (no trailing slash), e.g. `https://www.example.com`. This drives canonical URLs, `hreflang` (`alternates.languages` in the Metadata API), Open Graph `og:url`, and the sitemap. On Vercel, `VERCEL_URL` is used as a fallback when the env var is unset.

## Adding a new **static** page with full SEO

1. Create the route under `src/app/[locale]/your-route/page.tsx` (and `layout.tsx` if the page is a client component).
2. Register **English and Arabic** title and description in `ROUTE_STATIC_SEO` in `src/i18n/seo.ts` (same keys as the path without locale, e.g. `/your-route`).
3. Add the path to sitemap coverage by ensuring it appears in `listPublicStaticSeoPaths()` — it is built from `ROUTE_STATIC_SEO` plus `/`, so adding the route to `ROUTE_STATIC_SEO` is enough for static URLs.
4. Use **`LocaleLink`** or **`useLocalizedPath`** / **`useLocalizeAppHref`** for internal navigation so links stay on the active locale.

**Client-only pages** cannot export `generateMetadata`. Add a sibling **`layout.tsx`** in the same segment that calls:

```ts
import type { Metadata } from "next";
import { localeFromParams, staticPageMetadata } from "@/i18n/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await localeFromParams(params);
  if (!locale) return {};
  return staticPageMetadata(locale, "/your-route");
}

export default function YourLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

## Adding a **dynamic** page (e.g. `/watch/[id]`)

- Prefer a **server `layout.tsx`** next to the segment with `generateMetadata` that loads entity data and returns `pageMetadata(locale, pathWithoutLocale, { title, description, ogImage, noIndex })` from `src/i18n/seo.ts`.
- Use **`noIndex: true`** for private, error, or unapproved content.

## APIs used everywhere

| Helper | Role |
|--------|------|
| `buildPageMetadata` | Canonical, `alternates.languages` (hreflang), OG, Twitter |
| `staticPageMetadata` | Static routes backed by `ROUTE_STATIC_SEO` |
| `pageMetadata` | Dynamic routes with explicit fields |
| `prefixWithLocale` / `stripLocaleFromPathname` | URLs and active-state checks |

## Sitemap and robots

- **`src/app/sitemap.ts`** — static paths × locales, plus approved videos, channels, agents, and agencies. Revalidates hourly (`revalidate = 3600`).
- **`src/app/robots.ts`** — allows `/`, disallows `/api/` and `/admin`, points crawlers to `/sitemap.xml`.

## Root vs locale layout

`src/app/[locale]/layout.tsx` sets **default** title template and site-wide description/keywords only. **Canonical and hreflang** are set by leaf layouts/pages so they match the real URL path.
