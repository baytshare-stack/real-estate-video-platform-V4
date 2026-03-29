"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";

type Peer = {
  id: string;
  username: string | null;
  fullName: string;
  name: string | null;
  image: string | null;
  profile: { avatar: string | null; name: string | null } | null;
};

type Conv = {
  peerId: string;
  lastMessage: string;
  lastAt: string;
  peer: Peer;
};

type Msg = {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: Peer;
};

function peerLabel(p: Peer) {
  return p.profile?.name?.trim() || p.fullName || p.name || p.username || "User";
}

function peerAvatar(p: Peer) {
  return p.profile?.avatar || p.image || null;
}

export default function ProfileInbox({
  currentUserId,
  sessionName,
}: {
  currentUserId: string;
  sessionName: string;
}) {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [thread, setThread] = useState<Msg[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/messages");
    if (!res.ok) return;
    const data = (await res.json()) as { conversations: Conv[] };
    setConversations(data.conversations ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadConversations();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadConversations]);

  const openThread = async (peerId: string) => {
    setActivePeerId(peerId);
    setThreadLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/messages?with=${encodeURIComponent(peerId)}`);
      if (!res.ok) throw new Error("Failed to load messages");
      const data = (await res.json()) as { messages: Msg[] };
      setThread(data.messages ?? []);
    } catch {
      setError("Could not load conversation");
      setThread([]);
    } finally {
      setThreadLoading(false);
    }
  };

  const sendReply = async () => {
    if (!activePeerId || !reply.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: activePeerId, content: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Send failed");
        return;
      }
      setReply("");
      await openThread(activePeerId);
      await loadConversations();
    } catch {
      setError("Send failed");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading messages…
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-gray-800 bg-gray-900/40">
        <div className="border-b border-gray-800 px-4 py-3 text-sm font-semibold text-white">Conversations</div>
        {conversations.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No messages yet. Visit an agent profile and use Send message.</p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {conversations.map((c) => (
              <li key={c.peerId}>
                <button
                  type="button"
                  onClick={() => openThread(c.peerId)}
                  className={`flex w-full items-start gap-3 border-b border-gray-800/80 px-4 py-3 text-left transition hover:bg-white/5 ${
                    activePeerId === c.peerId ? "bg-white/5" : ""
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-800 text-sm font-bold text-gray-400">
                    {peerAvatar(c.peer) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={peerAvatar(c.peer)!} alt="" className="h-full w-full object-cover" />
                    ) : (
                      peerLabel(c.peer).charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{peerLabel(c.peer)}</p>
                    <p className="truncate text-xs text-gray-500">{c.lastMessage}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-gray-600">
                    {new Date(c.lastAt).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex min-h-[280px] flex-col rounded-xl border border-gray-800 bg-gray-900/40">
        <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3 text-sm font-semibold text-white">
          <MessageCircle className="h-4 w-4 text-blue-400" />
          {activePeerId ? "Thread" : "Select a conversation"}
        </div>
        {error && <div className="px-4 py-2 text-sm text-red-400">{error}</div>}
        <div className="flex flex-1 flex-col overflow-hidden">
          {!activePeerId ? (
            <p className="flex flex-1 items-center justify-center p-6 text-sm text-gray-500">
              Choose a conversation to read and reply.
            </p>
          ) : threadLoading ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="max-h-72 flex-1 space-y-3 overflow-y-auto p-4">
              {thread.map((m) => {
                const mine = m.senderId === currentUserId;
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        mine ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className={`mt-1 text-[10px] ${mine ? "text-blue-100/80" : "text-gray-500"}`}>
                        {new Date(m.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {activePeerId ? (
            <div className="border-t border-gray-800 p-3">
              <div className="flex gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={`Reply as ${sessionName}…`}
                  rows={2}
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-gray-700 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={sending || !reply.trim()}
                  onClick={sendReply}
                  className="shrink-0 self-end rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
