"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Bell, Loader2 } from "lucide-react";

export default function SubscribeButton({
  channelId,
  initialSubscribed,
  initialSubscriberCount,
  disabledSelf,
  isLoggedIn,
}: {
  channelId: string;
  initialSubscribed: boolean;
  initialSubscriberCount: number;
  disabledSelf?: boolean;
  isLoggedIn: boolean;
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [subscriberCount, setSubscriberCount] = useState(initialSubscriberCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = useMemo(() => (subscribed ? "Subscribed" : "Subscribe"), [subscribed]);

  // Keep client state in sync if the server-rendered props change after navigation/refresh.
  useEffect(() => {
    setSubscribed(initialSubscribed);
  }, [initialSubscribed]);

  useEffect(() => {
    setSubscriberCount(initialSubscriberCount);
  }, [initialSubscriberCount]);

  useEffect(() => {
    if (!isLoggedIn || disabledSelf) return;
    let cancelled = false;
    void fetch(`/api/subscribe?channelId=${encodeURIComponent(channelId)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { subscribed?: boolean; subscriberCount?: number } | null) => {
        if (cancelled || !data) return;
        if (typeof data.subscribed === "boolean") setSubscribed(data.subscribed);
        if (typeof data.subscriberCount === "number") setSubscriberCount(data.subscriberCount);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [channelId, disabledSelf, isLoggedIn]);

  async function toggleSubscribe() {
    if (pending) return;
    if (disabledSelf) return;
    if (!isLoggedIn) {
      setError("Please sign in to subscribe.");
      return;
    }

    setError(null);

    const nextSubscribed = !subscribed;
    setSubscribed(nextSubscribed);
    setSubscriberCount((c) => Math.max(0, c + (nextSubscribed ? 1 : -1)));
    setPending(true);

    try {
      const res = await fetch(`/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ channelId }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update subscription");
      }

      // Some environments may return partial JSON; never wipe the optimistic UI unless we have a boolean.
      if (typeof data?.subscribed === "boolean") {
        setSubscribed(data.subscribed);
      }
      if (typeof data?.subscriberCount === "number") setSubscriberCount(data.subscriberCount);
    } catch (err: any) {
      // Revert optimistic state.
      setSubscribed(!nextSubscribed);
      setSubscriberCount((c) => Math.max(0, c + (nextSubscribed ? -1 : 1)));
      setError(err?.message ?? "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={toggleSubscribe}
        disabled={pending || disabledSelf}
        className={[
          "px-8 py-2.5 rounded-full font-bold transition-colors inline-flex items-center gap-2",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-transparent",
          disabledSelf
            ? "bg-white/10 text-white border border-white/10 cursor-not-allowed"
            : subscribed
              ? "bg-indigo-600 text-white hover:bg-indigo-500"
              : "bg-white text-black hover:bg-gray-200",
        ].join(" ")}
      >
        {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bell className="w-4 h-4" />}
        {pending ? "Updating" : label}
      </button>
      {typeof subscriberCount === "number" ? (
        <p className="text-xs text-gray-300/90">
          {subscriberCount.toLocaleString()} subscriber{subscriberCount === 1 ? "" : "s"}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-300/90">{error}</p> : null}
    </div>
  );
}

