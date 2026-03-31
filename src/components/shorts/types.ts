export type ShortVideoPayload = {
  id: string;
  title: string;
  videoUrl: string | null;
  thumbnail: string | null;
  isTemplate?: boolean;
  templateId?: string | null;
  template?: {
    id: string;
    name: string;
    type: string;
    previewImage: string;
    previewVideo: string | null;
    defaultAudio: string | null;
    config: unknown;
  } | null;
  images?: string[];
  audio?: string | null;
  channelId: string;
  channelName: string;
  channelAvatar: string | null;
  viewsCount: number;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  userReaction: "LIKE" | "DISLIKE" | null;
  subscribed: boolean;
  /** Denormalized channel subscriber count for display */
  subscribersCount?: number;
};
