"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Sparkles } from "lucide-react";

export type NotifyPref = "ALL" | "PERSONALIZED" | "NONE";

const OPTIONS: { value: NotifyPref; label: string; sub: string; icon: typeof Bell }[] = [
  { value: "ALL", label: "All", sub: "Every new video from this channel", icon: Bell },
  {
    value: "PERSONALIZED",
    label: "Personalized",
    sub: "New uploads (same as All for now; future: tailored alerts)",
    icon: Sparkles,
  },
  { value: "NONE", label: "None", sub: "No upload notifications", icon: BellOff },
];

export default function SubscriptionNotifyDropdown({
  channelId,
  value,
  onChange,
  disabled,
  variant = "dark",
}: {
  channelId: string;
  value: NotifyPref;
  onChange?: (next: NotifyPref) => void;
  disabled?: boolean;
  variant?: "dark" | "watch" | "shorts";
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [local, setLocal] = useState<NotifyPref>(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const setPref = async (next: NotifyPref) => {
    if (pending || disabled) return;
    setPending(true);
    const prev = local;
    setLocal(next);
    try {
      const res = await fetch(`/api/channels/${encodeURIComponent(channelId)}/subscribe`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notificationPreference: next }),
      });
      if (!res.ok) throw new Error();
      onChange?.(next);
      setOpen(false);
    } catch {
      setLocal(prev);
    } finally {
      setPending(false);
    }
  };

  const btnBase =
    variant === "watch" || variant === "shorts"
      ? "rounded-full p-2 text-white transition-colors hover:bg-white/15 disabled:opacity-50 bg-black/45 backdrop-blur-md border border-white/10"
      : "rounded-full border border-white/15 bg-white/5 p-2 text-white transition-colors hover:bg-white/10 disabled:opacity-50";

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled || pending}
        className={btnBase}
        aria-label="Notification settings"
        aria-expanded={open}
        title="Notification settings"
      >
        <Bell className="h-4 w-4 md:h-[18px] md:w-[18px]" />
      </button>

      {open && (
        <div
          className={[
            "absolute top-full z-[60] mt-2 w-[min(calc(100vw-2rem),18rem)] rounded-xl py-2 shadow-xl",
            variant === "shorts" ? "right-0 border border-white/15 bg-[#141414]" : "",
            variant === "watch" ? "left-0 border border-gray-700 bg-[#1a1a1a]" : "",
            variant === "dark" ? "right-0 border border-white/10 bg-[#141414]" : "",
          ].join(" ")}
        >
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Channel notifications
          </p>
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = local === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={pending}
                onClick={() => void setPref(opt.value)}
                className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                  active ? "bg-white/10 text-white" : "text-gray-300 hover:bg-white/5"
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
                <span>
                  <span className="block font-medium">{opt.label}</span>
                  <span className="mt-0.5 block text-[11px] font-normal text-gray-500">{opt.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
