"use client";

import { useState } from "react";
import Link from "next/link";
import VideoRow, { type VideoRowData } from "@/components/studio/VideoRow";

export default function DashboardVideosList({ initialVideos }: { initialVideos: VideoRowData[] }) {
  const [videos, setVideos] = useState(initialVideos);
  const handleDeleted = (id: string) => setVideos((prev) => prev.filter((x) => x.id !== id));

  if (videos.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-8 text-center">
        <p className="mb-4 text-slate-300">No videos uploaded yet.</p>
        <Link href="/upload-video" className="text-indigo-400 hover:text-indigo-300">
          Upload your first video
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] divide-y divide-slate-800 text-left">
          <thead className="bg-slate-800">
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              <th className="px-6 py-3">Video</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Likes</th>
              <th className="px-3 py-3">Comments</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {videos.map((v) => (
              <VideoRow key={v.id} video={v} onDeleted={handleDeleted} index={0} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
