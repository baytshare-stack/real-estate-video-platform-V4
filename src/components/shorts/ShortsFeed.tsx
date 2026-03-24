"use client";

import * as React from "react";
import ShareModal from "./ShareModal";
import ShortVideoPlayer from "./ShortVideoPlayer";
import type { ShortVideoPayload } from "./types";
import { trackVideoShare } from "./shareTrack";

export default function ShortsFeed({ videos, origin }: { videos: ShortVideoPayload[]; origin: string }) {
  const [shareVideo, setShareVideo] = React.useState<ShortVideoPayload | null>(null);

  const openShare = (v: ShortVideoPayload) => {
    setShareVideo(v);
  };

  return (
    <div className="relative">
      <div className="flex h-[calc(100vh-64px)] w-full flex-col overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        {videos.map((v) => (
          <ShortVideoPlayer
            key={v.id}
            video={v}
            mode="feed"
            onShare={openShare}
          />
        ))}
      </div>

      <ShareModal
        open={!!shareVideo}
        onClose={() => setShareVideo(null)}
        shareUrl={shareVideo ? `${origin}/watch/${shareVideo.id}` : ""}
        title={shareVideo?.title ?? ""}
        onShareTracked={(platform) => {
          if (shareVideo) void trackVideoShare(shareVideo.id, platform);
        }}
      />
    </div>
  );
}
