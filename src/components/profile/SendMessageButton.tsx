"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocalizedPath } from "@/i18n/navigation";
import { useSession } from "next-auth/react";
import { Loader2, MessageCircle, X } from "lucide-react";

export default function SendMessageButton({
  receiverId,
  receiverName,
  disabled,
}: {
  receiverId: string;
  receiverName: string;
  disabled?: boolean;
}) {
  const { status } = useSession();
  const router = useRouter();
  const localizedPath = useLocalizedPath();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const onSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, content: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send");
        return;
      }
      setText("");
      setOpen(false);
      router.push(localizedPath("/profile"));
    } catch {
      setError("Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (status === "loading") {
    return null;
  }

  if (status === "unauthenticated") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          router.push(
            `${localizedPath("/login")}?callbackUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : localizedPath("/"))}`
          )
        }
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/5 disabled:opacity-50"
      >
        <MessageCircle className="h-4 w-4" />
        Log in to message
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-600/20 px-4 py-2.5 text-sm font-semibold text-sky-200 transition hover:bg-sky-600/30 disabled:opacity-50"
      >
        <MessageCircle className="h-4 w-4" />
        Send message
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 bg-black/75" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl border border-gray-800 bg-[#141414] p-5 shadow-2xl sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-white">Message {receiverName}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {error ? <p className="mb-2 text-sm text-red-400">{error}</p> : null}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Write your message…"
              className="mb-3 w-full resize-none rounded-xl border border-gray-700 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-sky-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={sending || !text.trim()}
              onClick={onSend}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
