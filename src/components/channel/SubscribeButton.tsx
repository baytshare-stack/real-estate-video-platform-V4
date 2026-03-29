"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import SubscriptionNotifyDropdown, { type NotifyPref } from "@/components/channel/SubscriptionNotifyDropdown";
import { formatSubscriberCount } from "@/lib/formatSubscribers";

function isNotifyPref(v: unknown): v is NotifyPref {
  return v === "ALL" || v === "PERSONALIZED" || v === "NONE";
}

export default function SubscribeButton({
  channelId,
  initialSubscribed,
  initialSubscriberCount,
  initialNotificationPreference,
  disabledSelf,
  isLoggedIn,
}: {
  channelId: string;
  initialSubscribed: boolean;
  initialSubscriberCount: number;
  initialNotificationPreference?: NotifyPref | null;
  disabledSelf?: boolean;
  isLoggedIn: boolean;
}) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [subscriberCount, setSubscriberCount] = useState(initialSubscriberCount);
  const [notifyPref, setNotifyPref] = useState<NotifyPref>(
    isNotifyPref(initialNotificationPreference) ? initialNotificationPreference : "ALL"
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = useMemo(() => (subscribed ? "Subscribed" : "Subscribe"), [subscribed]);

  useEffect(() => {
    setSubscribed(initialSubscribed);
  }, [initialSubscribed]);

  useEffect(() => {
    setSubscriberCount(initialSubscriberCount);
  }, [initialSubscriberCount]);

  useEffect(() => {
    if (isNotifyPref(initialNotificationPreference)) {
      setNotifyPref(initialNotificationPreference);
    }
  }, [initialNotificationPreference]);

  useEffect(() => {
    if (!isLoggedIn || disabledSelf) return;
    let cancelled = false;
    void fetch(`/api/channels/${encodeURIComponent(channelId)}/subscribe`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: {
          subscribed?: boolean;
          subscriberCount?: number;
          notificationPreference?: string;
        } | null) => {
          if (cancelled || !data) return;
          if (typeof data.subscribed === "boolean") setSubscribed(data.subscribed);
          if (typeof data.subscriberCount === "number") setSubscriberCount(data.subscriberCount);
          if (isNotifyPref(data.notificationPreference)) setNotifyPref(data.notificationPreference);
        }
      )
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
    if (nextSubscribed) setNotifyPref("ALL");
    setPending(true);

    try {
      const res = await fetch(`/api/channels/${encodeURIComponent(channelId)}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update subscription");
      }

      if (typeof data?.subscribed === "boolean") {
        setSubscribed(data.subscribed);
      }
      if (typeof data?.subscriberCount === "number") setSubscriberCount(data.subscriberCount);
      if (isNotifyPref(data?.notificationPreference)) {
        setNotifyPref(data.notificationPreference);
      } else if (data?.subscribed) {
        setNotifyPref("ALL");
      }
    } catch (err: unknown) {
      setSubscribed(!nextSubscribed);
      setSubscriberCount((c) => Math.max(0, c + (nextSubscribed ? -1 : 1)));
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={toggleSubscribe}
          disabled={pending || disabledSelf}
          className={[
            "px-6 py-2.5 md:px-8 rounded-full font-bold transition-colors inline-flex items-center justify-center gap-2 min-h-[44px]",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-transparent",
            disabledSelf
              ? "bg-white/10 text-white border border-white/10 cursor-not-allowed"
              : subscribed
                ? "bg-indigo-600 text-white hover:bg-indigo-500"
                : "bg-white text-black hover:bg-gray-200",
          ].join(" ")}
        >
          {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {pending ? "Updating" : label}
        </button>
        {subscribed && !disabledSelf && isLoggedIn ? (
          <SubscriptionNotifyDropdown
            channelId={channelId}
            value={notifyPref}
            onChange={setNotifyPref}
            disabled={pending}
            variant="dark"
          />
        ) : null}
      </div>
      {typeof subscriberCount === "number" ? (
        <p className="text-xs text-gray-300/90">
          {formatSubscriberCount(subscriberCount)} subscriber{subscriberCount === 1 ? "" : "s"}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-300/90">{error}</p> : null}
    </div>
  );
}
