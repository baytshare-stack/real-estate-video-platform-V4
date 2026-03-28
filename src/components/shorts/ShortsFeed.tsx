"use client";

import * as React from "react";
import ShareModal from "./ShareModal";
import ShortVideoPlayer from "./ShortVideoPlayer";
import ShortsCommentsPanel from "./ShortsCommentsPanel";
import { ShortsPlaybackProvider } from "./ShortsPlaybackContext";
import type { ShortVideoPayload } from "./types";
import { trackVideoShare } from "./shareTrack";

export default function ShortsFeed({ videos, origin }: { videos: ShortVideoPayload[]; origin: string }) {
  const [shareVideo, setShareVideo] = React.useState<ShortVideoPayload | null>(null);
  const [commentsVideoId, setCommentsVideoId] = React.useState<string | null>(null);

  const openShare = (v: ShortVideoPayload) => {
    setShareVideo(v);
  };

  return (
    <ShortsPlaybackProvider>
      <div className="relative">
        <div className="flex h-[calc(100dvh-4rem-3.5rem-env(safe-area-inset-bottom,0px))] w-full flex-col overflow-y-scroll scroll-smooth snap-y snap-mandatory xl:h-[calc(100vh-4rem)]">
          {videos.map((v) => (
            <ShortVideoPlayer
              key={v.id}
              video={v}
              mode="feed"
              onShare={openShare}
              onOpenComments={() => setCommentsVideoId(v.id)}
            />
          ))}
        </div>

        <ShortsCommentsPanel
          videoId={commentsVideoId}
          open={commentsVideoId != null}
          onClose={() => setCommentsVideoId(null)}
        />

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
    </ShortsPlaybackProvider>
  );
}
