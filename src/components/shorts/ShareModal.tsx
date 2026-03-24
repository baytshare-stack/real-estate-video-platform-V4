"use client";

import * as React from "react";
import { Copy, Facebook, Link2, Linkedin, MessageCircle, Send, Twitter, X } from "lucide-react";
import type { SharePlatform } from "./shareTrack";

export default function ShareModal({
  open,
  onClose,
  shareUrl,
  title,
  onShareTracked,
}: {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
  title: string;
  onShareTracked: (platform: SharePlatform) => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const [tiktokCopied, setTiktokCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setCopied(false);
      setTiktokCopied(false);
    }
  }, [open]);

  if (!open) return null;

  const urlEnc = encodeURIComponent(shareUrl);

  const links: { platform: SharePlatform; label: string; icon: React.ReactNode; href: string }[] = [
    {
      platform: "whatsapp",
      label: "WhatsApp",
      icon: <MessageCircle className="h-5 w-5" />,
      href: `https://wa.me/?text=${urlEnc}`,
    },
    {
      platform: "facebook",
      label: "Facebook",
      icon: <Facebook className="h-5 w-5" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${urlEnc}`,
    },
    {
      platform: "telegram",
      label: "Telegram",
      icon: <Send className="h-5 w-5" />,
      href: `https://t.me/share/url?url=${urlEnc}`,
    },
    {
      platform: "twitter",
      label: "X / Twitter",
      icon: <Twitter className="h-5 w-5" />,
      href: `https://twitter.com/intent/tweet?url=${urlEnc}`,
    },
    {
      platform: "linkedin",
      label: "LinkedIn",
      icon: <Linkedin className="h-5 w-5" />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${urlEnc}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#141414] p-5 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Share</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {title ? (
          <p className="mb-3 line-clamp-2 text-sm text-white/55" title={title}>
            {title}
          </p>
        ) : null}
        <ul className="space-y-2">
          {links.map((l) => (
            <li key={l.platform}>
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onShareTracked(l.platform)}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/90 transition hover:bg-white/10"
              >
                {l.icon}
                <span className="font-medium">{l.label}</span>
              </a>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  setTiktokCopied(true);
                  onShareTracked("tiktok");
                } catch {
                  setTiktokCopied(false);
                }
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white/90 transition hover:bg-white/10"
            >
              <Link2 className="h-5 w-5" />
              <span className="font-medium">
                {tiktokCopied ? "Link copied (TikTok)" : "TikTok — copy link"}
              </span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  onShareTracked("copy");
                } catch {
                  setCopied(false);
                }
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white/90 transition hover:bg-white/10"
            >
              <Copy className="h-5 w-5" />
              <span className="font-medium">{copied ? "Copied!" : "Copy link"}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
