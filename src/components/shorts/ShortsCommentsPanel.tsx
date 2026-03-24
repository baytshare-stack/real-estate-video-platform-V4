"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { ThumbsDown, ThumbsUp, X } from "lucide-react";

type U = {
  id: string;
  fullName: string;
  name: string | null;
  image: string | null;
  profile: { avatar: string | null; name: string | null } | null;
};

type CRow = {
  id: string;
  content: string;
  createdAt: string;
  likesCount: number;
  dislikesCount: number;
  user: U;
  replies: CRow[];
};

function avatarUrl(u: U) {
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

function CommentBlock({
  c,
  reactions,
  onReact,
  onReply,
  depth,
}: {
  c: CRow;
  reactions: Record<string, "LIKE" | "DISLIKE" | null>;
  onReact: (id: string, action: "like" | "dislike") => void;
  onReply: (parentId: string) => void;
  depth: number;
}) {
  const ur = reactions[c.id] ?? null;
  return (
    <div className={depth ? "ml-8 mt-3 border-l border-white/10 pl-3" : "mt-4"}>
      <div className="flex gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl(c.user)} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {c.user.name?.trim() || c.user.fullName}
            </span>
            <span className="text-xs text-white/40">{timeAgo(c.createdAt)}</span>
          </div>
          <p className="mt-1 text-sm text-white/85 whitespace-pre-wrap break-words">{c.content}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onReact(c.id, "like")}
              className={`inline-flex items-center gap-1 text-xs ${ur === "LIKE" ? "text-sky-400" : "text-white/50"}`}
            >
              <ThumbsUp className="h-4 w-4" />
              {c.likesCount}
            </button>
            <button
              type="button"
              onClick={() => onReact(c.id, "dislike")}
              className={`inline-flex items-center gap-1 text-xs ${ur === "DISLIKE" ? "text-rose-400" : "text-white/50"}`}
            >
              <ThumbsDown className="h-4 w-4" />
              {c.dislikesCount}
            </button>
            {depth === 0 ? (
              <button
                type="button"
                onClick={() => onReply(c.id)}
                className="text-xs font-medium text-sky-400/90"
              >
                Reply
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {c.replies?.map((r) => (
        <CommentBlock
          key={r.id}
          c={r}
          reactions={reactions}
          onReact={onReact}
          onReply={onReply}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function ShortsCommentsPanel({
  videoId,
  open,
  onClose,
}: {
  videoId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { status } = useSession();
  const [rows, setRows] = React.useState<CRow[]>([]);
  const [reactions, setReactions] = React.useState<Record<string, "LIKE" | "DISLIKE" | null>>({});
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [text, setText] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<string | null>(null);
  const [posting, setPosting] = React.useState(false);
  const [postError, setPostError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!videoId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/comments`, {
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        comments?: CRow[];
        reactions?: Record<string, "LIKE" | "DISLIKE" | null>;
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error || "Could not load comments.");
        setRows([]);
        setReactions({});
        return;
      }
      setRows(data.comments ?? []);
      setReactions(data.reactions ?? {});
    } catch {
      setLoadError("Could not load comments.");
      setRows([]);
      setReactions({});
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  React.useEffect(() => {
    if (open && videoId) void load();
  }, [open, videoId, load]);

  const submit = async () => {
    if (!videoId || !text.trim() || status !== "authenticated") return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(videoId)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: text.trim(),
          parentCommentId: replyTo,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPostError(data.error || "Could not post comment.");
        return;
      }
      setText("");
      setReplyTo(null);
      await load();
    } catch {
      setPostError("Could not post comment.");
    } finally {
      setPosting(false);
    }
  };

  const onReact = async (commentId: string, action: "like" | "dislike") => {
    if (status !== "authenticated") return;
    const res = await fetch(`/api/comments/${commentId}/reaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return;
    const j = (await res.json()) as {
      likesCount: number;
      dislikesCount: number;
      userReaction: "LIKE" | "DISLIKE" | null;
    };
    setReactions((prev) => ({ ...prev, [commentId]: j.userReaction }));
    setRows((prev) =>
      prev.map((c) => {
        const patch = (x: CRow): CRow => {
          if (x.id === commentId) {
            return { ...x, likesCount: j.likesCount, dislikesCount: j.dislikesCount };
          }
          return { ...x, replies: x.replies.map(patch) };
        };
        return patch(c);
      })
    );
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm lg:hidden"
        aria-label="Close comments"
        onClick={onClose}
      />
      <aside className="fixed z-[160] flex flex-col bg-[#0f0f0f] border-white/10 shadow-2xl bottom-0 left-0 right-0 h-[min(72vh,640px)] rounded-t-2xl border-t lg:bottom-auto lg:left-auto lg:top-16 lg:right-0 lg:h-[calc(100vh-4rem)] lg:w-[min(100vw,420px)] lg:rounded-none lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 shrink-0">
          <h3 className="text-lg font-semibold text-white">Comments</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        {status === "authenticated" ? (
          <div className="shrink-0 border-b border-white/10 p-3 space-y-2">
            {replyTo ? (
              <p className="text-xs text-sky-400/90">
                Replying…{" "}
                <button type="button" className="underline" onClick={() => setReplyTo(null)}>
                  Cancel
                </button>
              </p>
            ) : null}
            {postError ? <p className="text-xs text-rose-400/90">{postError}</p> : null}
            <div className="flex gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a comment..."
                rows={2}
                className="flex-1 resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-sky-500/50"
              />
              <button
                type="button"
                disabled={posting || !text.trim()}
                onClick={() => void submit()}
                className="self-end rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {posting ? "…" : "Send"}
              </button>
            </div>
          </div>
        ) : (
          <p className="shrink-0 border-b border-white/10 p-3 text-center text-sm text-white/45">
            Sign in to comment
          </p>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          {loadError ? <p className="text-center text-sm text-rose-400/90">{loadError}</p> : null}
          {!loadError && loading ? (
            <p className="text-center text-sm text-white/40">Loading…</p>
          ) : !loadError && rows.length === 0 ? (
            <p className="text-center text-sm text-white/40">No comments yet.</p>
          ) : !loadError ? (
            rows.map((c) => (
              <CommentBlock
                key={c.id}
                c={c}
                reactions={reactions}
                onReact={onReact}
                onReply={(id) => setReplyTo(id)}
                depth={0}
              />
            ))
          ) : null}
        </div>
      </aside>
    </>
  );
}
