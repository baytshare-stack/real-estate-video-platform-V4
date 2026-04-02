"use client";

import { MessageCircle } from "lucide-react";

type Props = {
  href: string | null | undefined;
  label: string;
  className?: string;
};

export default function SendWhatsAppButton({ href, label, className = "" }: Props) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-transform hover:scale-[1.02] active:scale-[0.98] ${className}`}
    >
      <MessageCircle className="h-4 w-4 shrink-0" />
      {label}
    </a>
  );
}
