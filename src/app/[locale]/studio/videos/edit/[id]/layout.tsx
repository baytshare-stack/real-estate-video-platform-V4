import type { Metadata } from "next";
import { localeFromParams, pageMetadata } from "@/i18n/seo";

export default function StudioEditVideoLayout({ children }: { children: React.ReactNode }) {
  return children;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const locale = await localeFromParams(params);
  if (!locale) return {};
  return pageMetadata(locale, `/studio/videos/edit/${id}`, {
    title: locale === "ar" ? "تعديل الفيديو" : "Edit video",
    description: locale === "ar" ? "تحرير إعدادات الفيديو." : "Edit your listing video settings.",
    noIndex: true,
  });
}
