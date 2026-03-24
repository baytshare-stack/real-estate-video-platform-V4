"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Edit2, Trash2, Eye, Heart, MessageCircle, Clapperboard, Film } from 'lucide-react';
import DeleteConfirmModal from './DeleteConfirmModal';

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

export default function VideoRow({ video, onDeleted, index }: VideoRowProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // TEMP DEBUG: verify thumbnail value flowing to dashboard row.
  console.debug("[VideoRow] thumbnail", { id: video.id, thumbnail: video.thumbnail });

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/studio/video/${video.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDeleted(video.id);
      } else {
        alert('Failed to delete video. Please try again.');
      }
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const date = new Date(video.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const isShort = Boolean(video.isShort);

  return (
    <>
      <tr className="group border-b border-white/[0.06] hover:bg-white/[0.025] transition-colors">
        {/* Thumbnail + Title */}
        <td className="py-4 pl-2 pr-4">
          <div className="flex items-start gap-4 min-w-[260px]">
            <div className="relative flex-shrink-0">
              <img
                src={video.thumbnail || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=160&h=90'}
                alt={video.title}
                className="w-28 aspect-video rounded-lg object-cover bg-gray-800"
              />
              <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white flex items-center gap-0.5 ${isShort ? 'bg-red-600' : 'bg-gray-700/90 backdrop-blur-sm'}`}>
                {isShort ? <><Clapperboard className="w-2.5 h-2.5" /> SHORT</> : <><Film className="w-2.5 h-2.5" /> LONG</>}
              </div>
            </div>
            <div className="flex flex-col gap-1 overflow-hidden">
              <Link href={`/watch/${video.id}`} target="_blank" className="text-white font-semibold text-sm line-clamp-2 hover:text-blue-400 transition-colors leading-snug">
                {video.title}
              </Link>
              {video.property && (
                <span className="text-gray-500 text-xs truncate">
                  {video.property.city}, {video.property.country} · {video.property.propertyType}
                </span>
              )}
              {/* Hover-revealed action buttons */}
              <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/upload?edit=${video.id}`}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </Link>
                <span className="text-gray-700">·</span>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        </td>

        {/* Status badge */}
        <td className="py-4 align-top">
          {video.property ? (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${video.property.status === 'FOR_SALE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
              {video.property.status === 'FOR_SALE' ? 'For Sale' : 'For Rent'}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">Published</span>
          )}
        </td>

        {/* Date */}
        <td className="py-4 align-top text-gray-400 text-sm whitespace-nowrap">{date}</td>

        {/* Likes */}
        <td className="py-4 align-top">
          <span className="flex items-center gap-1.5 text-gray-300 text-sm tabular-nums">
            <Heart className="w-3.5 h-3.5 text-red-400" />
            {(video.likesCount ?? 0).toLocaleString()}
          </span>
        </td>

        {/* Comments */}
        <td className="py-4 align-top">
          <span className="flex items-center gap-1.5 text-gray-300 text-sm tabular-nums">
            <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
            {(video.commentsCount ?? 0).toLocaleString()}
          </span>
        </td>

        {/* Actions */}
        <td className="py-4 align-top">
          <div className="flex items-center gap-2">
            <Link
              href={`/upload?edit=${video.id}`}
              className="p-2 rounded-lg hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>

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
