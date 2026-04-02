import type { Metadata } from "next";
import { localeFromParams, staticPageMetadata } from "@/i18n/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = await localeFromParams(params);
  if (!locale) return {};
  return staticPageMetadata(locale, "/subscribers");
}

export default function SubscribersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
