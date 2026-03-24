"use client";

import React, { useMemo } from "react";
import { Facebook, Instagram, MessageCircle, Send, Globe, Youtube } from "lucide-react";

export type SocialLinks = {
  facebookUrl: string;
  instagramUrl: string;
  whatsappUrl: string;
  telegramUrl: string;
  youtubeUrl: string;
  websiteUrl: string;
};

function validateHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

type SocialLinksFormProps = {
  value: SocialLinks;
  onChange: (next: SocialLinks) => void;
};

function Field({
  icon: Icon,
  label,
  placeholder,
  value,
  error,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  placeholder: string;
  value: string;
  error?: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">
        <span className="inline-flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" /> {label}
        </span>
      </label>
      <input
        type="url"
        inputMode="url"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-gray-800/60 border rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors ${
          error ? "border-red-500/70 focus:border-red-500/70" : "border-white/[0.08] focus:border-blue-500/50"
        }`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function SocialLinksForm({ value, onChange }: SocialLinksFormProps) {
  const errors = useMemo(() => {
    const makeErr = (v: string) => {
      const trimmed = v.trim();
      if (!trimmed) return null;
      return validateHttpUrl(trimmed) ? null : "Invalid URL (use http/https)";
    };

    return {
      facebookUrl: makeErr(value.facebookUrl),
      instagramUrl: makeErr(value.instagramUrl),
      whatsappUrl: makeErr(value.whatsappUrl),
      telegramUrl: makeErr(value.telegramUrl),
      youtubeUrl: makeErr(value.youtubeUrl),
      websiteUrl: makeErr(value.websiteUrl),
    } as const;
  }, [value]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field
        icon={Facebook}
        label="Facebook"
        placeholder="https://facebook.com/yourpage"
        value={value.facebookUrl}
        error={errors.facebookUrl}
        onChange={(facebookUrl) => onChange({ ...value, facebookUrl })}
      />
      <Field
        icon={Instagram}
        label="Instagram"
        placeholder="https://instagram.com/yourhandle"
        value={value.instagramUrl}
        error={errors.instagramUrl}
        onChange={(instagramUrl) => onChange({ ...value, instagramUrl })}
      />
      <Field
        icon={MessageCircle}
        label="WhatsApp Link"
        placeholder="https://wa.me/201234567890"
        value={value.whatsappUrl}
        error={errors.whatsappUrl}
        onChange={(whatsappUrl) => onChange({ ...value, whatsappUrl })}
      />
      <Field
        icon={Send}
        label="Telegram"
        placeholder="https://t.me/yourchannel"
        value={value.telegramUrl}
        error={errors.telegramUrl}
        onChange={(telegramUrl) => onChange({ ...value, telegramUrl })}
      />
      <Field
        icon={Youtube}
        label="YouTube"
        placeholder="https://youtube.com/@yourchannel"
        value={value.youtubeUrl}
        error={errors.youtubeUrl}
        onChange={(youtubeUrl) => onChange({ ...value, youtubeUrl })}
      />
      <Field
        icon={Globe}
        label="Website"
        placeholder="https://yourdomain.com"
        value={value.websiteUrl}
        error={errors.websiteUrl}
        onChange={(websiteUrl) => onChange({ ...value, websiteUrl })}
      />
    </div>
  );
}

