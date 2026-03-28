"use client";

import * as React from "react";
import { X } from "lucide-react";

type CommentUser = {
  id: string;
  fullName: string;
  name: string | null;
  image: string | null;
  profile: { avatar: string | null; name: string | null } | null;
};

export type StudioCommentRow = {
  id: string;
  content: string;
  createdAt: string;
  likesCount: number;
  dislikesCount: number;
  user: CommentUser;
  replies: StudioCommentRow[];
};

function avatarUrl(u: CommentUser) {
  return (
    u.profile?.avatar?.trim() ||
    u.image?.trim() ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || u.fullName)}`
  );
}

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function mergeReply(
  prev: StudioCommentRow[],
  reply: StudioCommentRow & { parentCommentId?: string | null }
): StudioCommentRow[] {
  const pid = reply.parentCommentId ?? null;
  const normalized: StudioCommentRow = { ...reply, replies: reply.replies ?? [] };
  if (!pid) {
    return [normalized, ...prev];
  }
  return prev.map((c) =>
    c.id === pid ? { ...c, replies: [...(c.replies ?? []), normalized] } : c
  );
}

type Props = {
  videoId: string | null;
  videoTitle: string;
  open: boolean;
  onClose: () => void;
};

export default function StudioVideoCommentsModal({ videoId, videoTitle, open, onClose }: Props) {
  const [rows, setRows] = React.useState<StudioCommentRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const [replyText, setReplyText] = React.useState("");
  const [posting, setPosting] = React.useState(false);
  const [postError, setPostError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!videoId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/comments?videoId=${encodeURIComponent(videoId)}&limit=50`,
        { credentials: "include", cache: "no-store" }
      );
      const data = (await res.json().catch(() => ({}))) as {
        comments?: StudioCommentRow[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error || "Could not load comments.");
        setRows([]);
        return;
      }
      setRows(Array.isArray(data.comments) ? data.comments : []);
    } catch {
      setLoadError("Could not load comments.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  React.useEffect(() => {
    if (!open || !videoId) return;
    setReplyingTo(null);
    setReplyText("");
    setPostError(null);
    void load();
  }, [open, videoId, load]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submitReply = async (parentId: string) => {
    if (!videoId) return;
    const trimmed = replyText.trim();
    if (!trimmed) {
      setPostError("Write a reply first.");
      return;
    }
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          videoId,
          content: trimmed,
          parentId: parentId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        comment?: StudioCommentRow & { parentCommentId?: string | null };
      };
      if (!res.ok) {
        setPostError(data.error || "Could not post reply.");
        return;
      }
      if (data.comment) {
        setRows((prev) => mergeReply(prev, data.comment as StudioCommentRow & { parentCommentId?: string | null }));
      }
      setReplyText("");
      setReplyingTo(null);
    } catch {
      setPostError("Could not post reply.");
    } finally {
      setPosting(false);
    }
  };

  if (!open || !videoId) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[180] bg-black/70 backdrop-blur-sm"
        aria-label="Close comments"
        onClick={onClose}
      />
      <aside className="fixed inset-x-0 bottom-0 z-[190] mx-auto flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col rounded-t-2xl border border-white/[0.08] bg-[#0c0c0c] shadow-2xl sm:inset-auto sm:right-6 sm:top-1/2 sm:max-h-[min(85vh,680px)] sm:-translate-y-1/2 sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <div className="min-w-0 pr-2">
            <h2 className="truncate text-lg font-bold text-white">Comments</h2>
            <p className="truncate text-xs text-gray-500">{videoTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loadError ? <p className="text-center text-sm text-rose-400">{loadError}</p> : null}
          {!loadError && loading ? (
            <p className="text-center text-sm text-gray-500">Loading comments…</p>
          ) : !loadError && rows.length === 0 ? (
            <p className="text-center text-sm text-gray-500">No comments yet.</p>
          ) : !loadError ? (
            <ul className="space-y-4">
              {rows.map((c) => (
                <li key={c.id} className="border-b border-white/[0.06] pb-4 last:border-0">
                  <CommentThread
                    comment={c}
                    depth={0}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    replyText={replyText}
                    setReplyText={setReplyText}
                    posting={posting}
                    postError={postError}
                    setPostError={setPostError}
                    onSubmitReply={submitReply}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function CommentThread({
  comment: c,
  depth,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  posting,
  postError,
  setPostError,
  onSubmitReply,
}: {
  comment: StudioCommentRow;
  depth: number;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  replyText: string;
  setReplyText: (s: string) => void;
  posting: boolean;
  postError: string | null;
  setPostError: (s: string | null) => void;
  onSubmitReply: (parentId: string) => void | Promise<void>;
}) {
  const showComposer = replyingTo === c.id && depth === 0;

  return (
    <div className={depth ? "ml-4 mt-3 border-l border-white/10 pl-3" : ""}>
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl(c.user)} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {c.user.name?.trim() || c.user.fullName}
            </span>
            <span className="text-xs text-gray-500">{timeAgo(c.createdAt)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-300">{c.content}</p>
          {depth === 0 ? (
            <button
              type="button"
              onClick={() => {
                setPostError(null);
                setReplyingTo(showComposer ? null : c.id);
                if (showComposer) setReplyText("");
              }}
              className="mt-2 text-xs font-semibold text-blue-400 hover:text-blue-300"
            >
              Reply
            </button>
          ) : null}
        </div>
      </div>

      {showComposer ? (
        <div className="mt-3 space-y-2 pl-12">
          {postError ? <p className="text-xs text-rose-400">{postError}</p> : null}
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply…"
            rows={2}
            disabled={posting}
            className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none focus:border-blue-500/40"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={posting || !replyText.trim()}
              onClick={() => void onSubmitReply(c.id)}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              {posting ? "…" : "Post reply"}
            </button>
            <button
              type="button"
              onClick={() => {
                setReplyingTo(null);
                setReplyText("");
                setPostError(null);
              }}
              className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {c.replies?.map((r) => (
        <CommentThread
          key={r.id}
          comment={r}
          depth={depth + 1}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          replyText={replyText}
          setReplyText={setReplyText}
          posting={posting}
          postError={postError}
          setPostError={setPostError}
          onSubmitReply={onSubmitReply}
        />
      ))}
    </div>
  );
}
