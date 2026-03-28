import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { safeFindFirst } from "@/lib/safePrisma";
import DashboardVideosList from "@/components/dashboard/DashboardVideosList";
import type { VideoRowData } from "@/components/studio/VideoRow";

export const dynamic = "force-dynamic";

export default async function DashboardVideosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role === "USER") {
    redirect("/");
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
        <h1 className="mb-2 text-2xl font-bold text-slate-100">Your Videos</h1>
        <p className="mb-6 text-slate-400">Create your channel first to manage uploads.</p>
        <Link
          href="/create-channel"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          Create Channel
        </Link>
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
        <h1 className="text-2xl font-bold text-slate-100">Your Videos</h1>
        <Link
          href="/upload-video"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          Upload New Video
        </Link>
      </div>

      <DashboardVideosList initialVideos={initialVideos} />
    </div>
  );
}
