import { redirect } from "next/navigation";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { prefixWithLocale } from "@/i18n/routing";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: loc } = await params;
  const locale = (locales.includes(loc as Locale) ? loc : defaultLocale) as Locale;
  redirect(prefixWithLocale(locale, "/dashboard/videos"));
}
