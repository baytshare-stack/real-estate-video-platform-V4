"use client";

import { useState } from "react";
import Link from "next/link";
import { Edit2, Trash2, Heart, MessageCircle, Clapperboard, Film } from "lucide-react";
import DeleteConfirmModal from "./DeleteConfirmModal";
import StudioVideoCommentsModal from "./StudioVideoCommentsModal";

export interface VideoRowData {
  id: string;
  title: string;
  thumbnail?: string | null;
  isShort?: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: string | Date;
  property?: { status: string; propertyType: string; city: string; country: string } | null;
}

interface VideoRowProps {
  video: VideoRowData;
  onDeleted: (id: string) => void;
  index: number;
}

export default function VideoRow({ video, onDeleted }: VideoRowProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/studio/video/${video.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted(video.id);
      } else {
        alert("Failed to delete video. Please try again.");
      }
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const date = new Date(video.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isShort = Boolean(video.isShort);

  return (
    <>
      <tr className="group border-b border-white/[0.06] transition-colors hover:bg-white/[0.025]">
        <td className="py-4 pl-2 pr-4">
          <div className="flex min-w-[260px] items-start gap-4">
            <div className="relative flex-shrink-0">
              <img
                src={
                  video.thumbnail ||
                  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=160&h=90"
                }
                alt={video.title}
                className="aspect-video w-28 rounded-lg bg-gray-800 object-cover"
              />
              <div
                className={`absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
                  isShort ? "bg-red-600" : "bg-gray-700/90 backdrop-blur-sm"
                }`}
              >
                {isShort ? (
                  <>
                    <Clapperboard className="h-2.5 w-2.5" /> SHORT
                  </>
                ) : (
                  <>
                    <Film className="h-2.5 w-2.5" /> LONG
                  </>
                )}
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
              <Link
                href={`/watch/${video.id}`}
                target="_blank"
                className="line-clamp-2 text-sm font-semibold leading-snug text-white transition-colors hover:text-blue-400"
              >
                {video.title}
              </Link>
              {video.property && (
                <span className="truncate text-xs text-gray-500">
                  {video.property.city}, {video.property.country} · {video.property.propertyType}
                </span>
              )}
              <div className="mt-1 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Link
                  href={`/upload?edit=${video.id}`}
                  className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-blue-400"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Link>
                <span className="text-gray-700">·</span>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        </td>

        <td className="py-4 align-top">
          {video.property ? (
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
                video.property.status === "FOR_SALE"
                  ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                  : "border-purple-500/20 bg-purple-500/10 text-purple-400"
              }`}
            >
              {video.property.status === "FOR_SALE" ? "For Sale" : "For Rent"}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400">
              Published
            </span>
          )}
        </td>

        <td className="whitespace-nowrap py-4 align-top text-sm text-gray-400">{date}</td>

        <td className="py-4 align-top">
          <span className="flex items-center gap-1.5 text-sm tabular-nums text-gray-300">
            <Heart className="h-3.5 w-3.5 text-red-400" />
            {(video.likesCount ?? 0).toLocaleString()}
          </span>
        </td>

        <td className="py-4 align-top">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-sm tabular-nums text-gray-300">
              <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
              {(video.commentsCount ?? 0).toLocaleString()}
            </span>
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className="w-fit text-left text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              Comments
            </button>
          </div>
        </td>

        <td className="py-4 align-top">
          <div className="flex items-center gap-2">
            <Link
              href={`/upload?edit=${video.id}`}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-500/10 hover:text-blue-400"
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>

      <StudioVideoCommentsModal
        videoId={commentsOpen ? video.id : null}
        videoTitle={video.title}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />

      {showDeleteModal && (
        <DeleteConfirmModal
          title={video.title}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
    </>
  );
}
