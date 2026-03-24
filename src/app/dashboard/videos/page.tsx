import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { safeFindFirst } from "@/lib/safePrisma";

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
        <Link href="/create-channel" className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          Create Channel
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Your Videos</h1>
        <Link href="/upload-video" className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
          Upload New Video
        </Link>
      </div>

      {channel.videos.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-8 text-center">
          <p className="mb-4 text-slate-300">No videos uploaded yet.</p>
          <Link href="/upload-video" className="text-indigo-400 hover:text-indigo-300">
            Upload your first video
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Thumbnail</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {channel.videos.map((video) => {
                console.debug("[DashboardVideos] thumbnail", { id: video.id, thumbnail: video.thumbnail });
                return (
                  <tr key={video.id}>
                    <td className="px-4 py-3 text-sm text-slate-100">{video.title}</td>
                    <td className="px-4 py-3">
                      <img
                        src={video.thumbnail ?? "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=320&h=180"}
                        alt={video.title}
                        className="h-12 w-20 rounded object-cover"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{video.isShort ? "short" : "long"}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{video.property?.status ?? "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {video.property ? `${video.property.city}, ${video.property.country}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{new Date(video.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
