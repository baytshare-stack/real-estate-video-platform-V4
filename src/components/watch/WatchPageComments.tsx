"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/i18n/LanguageProvider";

type CommentUser = {
  id: string;
  fullName: string;
  name: string | null;
  image: string | null;
  profile: { avatar: string | null; name: string | null } | null;
};

type ApiComment = {
  id: string;
  content: string;
  createdAt: string;
  likesCount: number;
  dislikesCount: number;
  user: CommentUser;
  replies: ApiComment[];
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

function CommentRow({ c, depth }: { c: ApiComment; depth: number }) {
  return (
    <div className={depth ? "ml-6 mt-3 border-l border-gray-700 pl-3" : "mt-4"}>
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
        </div>
      </div>
      {c.replies?.map((r) => (
        <CommentRow key={r.id} c={r} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function WatchPageComments({ videoId }: { videoId: string }) {
  const { data: session, status } = useSession();
  const { t } = useTranslation();
  const [rows, setRows] = React.useState<ApiComment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [text, setText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [postError, setPostError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/comments?videoId=${encodeURIComponent(videoId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        comments?: ApiComment[];
        error?: string;
      };
      if (!res.ok) {
        setLoadError(data.error || t("watch", "commentsLoadError"));
        setRows([]);
        return;
      }
      setRows(Array.isArray(data.comments) ? data.comments : []);
    } catch {
      setLoadError(t("watch", "commentsLoadError"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [videoId, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setPostError(t("watch", "commentEmpty"));
      return;
    }
    if (status !== "authenticated") {
      setPostError(t("watch", "signInToComment"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ videoId, content: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; comment?: ApiComment };
      if (!res.ok) {
        setPostError(data.error || t("watch", "commentPostError"));
        return;
      }
      setText("");
      if (data.comment) {
        setRows((prev) => [data.comment as ApiComment, ...prev]);
      } else {
        await load();
      }
    } catch {
      setPostError(t("watch", "commentPostError"));
    } finally {
      setSubmitting(false);
    }
  };

  const userInitial = session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U";
  const userImg = session?.user?.image;

  return (
    <div className="mt-6">
      <h3 className="mb-4 text-lg font-bold text-white md:text-xl">{t("watch", "comments")}</h3>

      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-2">
        <div className="flex gap-4">
          {userImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImg}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full object-cover md:h-10 md:w-10"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white md:h-10 md:w-10">
              {userInitial}
            </div>
          )}
          <div className="flex-1 border-b border-gray-700 pb-2 focus-within:border-white">
            <input
              type="text"
              name="comment"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("watch", "addComment")}
              disabled={status !== "authenticated" || submitting}
              className="w-full bg-transparent pb-1 text-sm text-white outline-none placeholder:text-gray-500 md:text-base"
              autoComplete="off"
            />
          </div>
        </div>
        {postError ? <p className="text-sm text-rose-400">{postError}</p> : null}
        {status !== "authenticated" ? (
          <p className="text-sm text-gray-400">
            <Link href="/login" className="text-blue-400 underline hover:text-blue-300">
              {t("watch", "signInToComment")}
            </Link>
          </p>
        ) : (
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="self-start rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40"
          >
            {submitting ? "…" : t("watch", "postComment")}
          </button>
        )}
      </form>

      <div className="mt-6">
        {loadError ? <p className="text-center text-sm text-rose-400">{loadError}</p> : null}
        {!loadError && loading ? (
          <p className="text-center text-sm text-gray-500">{t("watch", "loadingComments")}</p>
        ) : !loadError && rows.length === 0 ? (
          <p className="text-center text-sm text-gray-500">{t("watch", "noCommentsYet")}</p>
        ) : !loadError ? (
          rows.map((c) => <CommentRow key={c.id} c={c} depth={0} />)
        ) : null}
      </div>
    </div>
  );
}
