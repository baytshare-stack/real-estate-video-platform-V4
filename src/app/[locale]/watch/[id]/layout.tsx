import type { Metadata } from "next";
import { ModerationStatus } from "@prisma/client";
import { localeFromParams, pageMetadata } from "@/i18n/seo";
import prisma from "@/lib/prisma";
import { safeFindFirst } from "@/lib/safePrisma";

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

  const video = await safeFindFirst(() =>
    prisma.video.findUnique({
      where: { id },
      select: { title: true, description: true, thumbnail: true, moderationStatus: true },
    })
  );

  if (!video) {
    return pageMetadata(locale, `/watch/${id}`, {
      title: locale === "ar" ? "الفيديو غير موجود" : "Video not found",
      noIndex: true,
    });
  }

  if (video.moderationStatus !== ModerationStatus.APPROVED) {
    return pageMetadata(locale, `/watch/${id}`, {
      title: video.title,
      description: video.description?.slice(0, 160) ?? undefined,
      ogImage: video.thumbnail,
      noIndex: true,
    });
  }

  return pageMetadata(locale, `/watch/${id}`, {
    title: video.title,
    description: video.description?.slice(0, 160) ?? undefined,
    ogImage: video.thumbnail,
  });
}
