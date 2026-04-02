import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { getSiteSeo } from "@/i18n/seo";
import { getSiteUrl } from "@/lib/site-url";

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/** Defaults only — leaf routes set canonical, hreflang (`alternates.languages`), and OG URL via `pageMetadata`. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: loc } = await params;
  if (!locales.includes(loc as Locale)) return {};
  const locale = loc as Locale;
  const site = getSiteSeo(locale);
  const brand = locale === "ar" ? "ريال إستيت تي في" : "Real Estate TV";
  return {
    metadataBase: new URL(getSiteUrl()),
    title: { default: site.title, template: `%s | ${brand}` },
    description: site.description,
    keywords: site.keywords,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: loc } = await params;
  if (!locales.includes(loc as Locale)) notFound();

  const locale = loc as Locale;
  const dict = await getDictionary(locale);
  const fallbackDictionary = await getDictionary(defaultLocale);

  return (
    <LanguageProvider locale={locale} dictionary={dict} fallbackDictionary={fallbackDictionary}>
      <Header />
      <div className="flex min-w-0 flex-row overflow-x-hidden pt-16">
        <Sidebar />
        <main className="min-h-[calc(100vh-64px)] min-w-0 flex-1 bg-[#0f0f0f] pb-[calc(4rem+env(safe-area-inset-bottom,0px))] xl:pb-0 xl:ps-64">
          <div className="mx-auto w-full min-w-0 max-w-screen-2xl px-2.5 sm:px-4 md:px-6 lg:px-8 xl:px-10">
            {children}
          </div>
        </main>
      </div>
    </LanguageProvider>
  );
}
