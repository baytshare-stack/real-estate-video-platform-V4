import LocaleLink from "@/components/LocaleLink";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/prisma";
import { safeFindFirst } from "@/lib/safePrisma";
import DashboardVideosList from "@/components/dashboard/DashboardVideosList";
import type { VideoRowData } from "@/components/studio/VideoRow";
import { getServerI18n } from "@/i18n/server";
import { prefixWithLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function DashboardVideosPage() {
  const { t, locale } = await getServerI18n();
  const lp = (path: string) => prefixWithLocale(locale, path);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(lp("/login"));
  }

  if (session.user.role === "USER") {
    redirect(lp("/"));
  }

  const channel = await safeFindFirst(() =>
    prisma.channel.findUnique({
      where: { ownerId: session.user.id },
      select: {
        id: true,
        videos: {
          orderBy: { createdAt: "desc" },
          include: { property: true },
        },
      },
    })
  );

  if (!channel) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold text-slate-100">{t("dashboardVideos", "title")}</h1>
        <p className="mb-6 text-slate-400">{t("dashboardVideos", "createChannelFirst")}</p>
        <LocaleLink
          href="/create-channel"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          {t("dashboardVideos", "createChannel")}
        </LocaleLink>
      </div>
    );
  }

  const initialVideos: VideoRowData[] = channel.videos.map((video) => ({
    id: video.id,
    title: video.title,
    thumbnail: video.thumbnail,
    isShort: video.isShort,
    likesCount: video.likesCount,
    commentsCount: video.commentsCount ?? 0,
    createdAt: video.createdAt.toISOString(),
    property: video.property
      ? {
          status: video.property.status,
          propertyType: video.property.propertyType,
          city: video.property.city,
          country: video.property.country,
        }
      : null,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">{t("dashboardVideos", "title")}</h1>
        <LocaleLink
          href="/upload-video"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          {t("dashboardVideos", "uploadNew")}
        </LocaleLink>
      </div>

      <DashboardVideosList initialVideos={initialVideos} />
    </div>
  );
}
