import type { Metadata } from "next";
import { ModerationStatus } from "@prisma/client";
import { localeFromParams, pageMetadata } from "@/i18n/seo";
import { buildVideoWatchPageMetadata, getWatchVideoForOg } from "@/lib/video-open-graph";

export default function WatchSegmentLayout({ children }: { children: React.ReactNode }) {
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

  const row = await getWatchVideoForOg(id);

  if (!row) {
    return pageMetadata(locale, `/watch/${id}`, {
      title: locale === "ar" ? "الفيديو غير موجود" : "Video not found",
      noIndex: true,
    });
  }

  if (row.moderationStatus !== ModerationStatus.APPROVED) {
    return buildVideoWatchPageMetadata(locale, id, row, { noIndex: true });
  }

  return buildVideoWatchPageMetadata(locale, id, row);
}
