"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLocalizeAppHref } from "@/i18n/navigation";
import { Bell } from "lucide-react";

type NotifRow = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  linkUrl: string | null;
};

export default function NotificationBell() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const localizeHref = useLocalizeAppHref();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (cursor?: string | null) => {
    const q = new URLSearchParams({ limit: "15" });
    if (cursor) q.set("cursor", cursor);
    const res = await fetch(`/api/notifications?${q}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      notifications?: NotifRow[];
      unreadCount?: number;
      nextCursor?: string | null;
    };
    setUnread(data.unreadCount ?? 0);
    if (cursor) {
      setItems((prev) => [...prev, ...(data.notifications ?? [])]);
    } else {
      setItems(data.notifications ?? []);
    }
    setNextCursor(data.nextCursor ?? null);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    load()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, load]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const id = window.setInterval(() => {
      void load().catch(() => {});
    }, 10_000);
    return () => clearInterval(id);
  }, [status, load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (status !== "authenticated") return null;

  const onItemClick = async (n: NotifRow) => {
    try {
      await fetch("/api/notifications/read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      });
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnread((u) => Math.max(0, u - (n.isRead ? 0 : 1)));
    } catch {
      /* still navigate */
    }
    setOpen(false);
    if (n.linkUrl) router.push(localizeHref(n.linkUrl));
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await load(nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[70] mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl shadow-black/40">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
          </div>
          <div className="max-h-[min(70vh,24rem)] overflow-y-auto">
            {loading && !items.length ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onItemClick(n)}
                      className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                        n.isRead ? "text-gray-400" : "bg-white/[0.04] text-white"
                      }`}
                    >
                      <span className="text-sm leading-snug">{n.message}</span>
                      <span className="text-[11px] text-gray-500">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {nextCursor ? (
              <div className="border-t border-white/10 p-2">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full rounded-lg py-2 text-center text-xs font-medium text-blue-400 hover:bg-white/5 disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
