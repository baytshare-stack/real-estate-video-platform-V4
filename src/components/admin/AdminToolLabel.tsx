"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";

/**
 * Section tool label + hover tooltip (disappears on mouse leave). Arabic hints for admin clarity.
 */
export function AdminToolLabel({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <div
        className="inline-flex max-w-full cursor-default flex-wrap items-center gap-2"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        {children}
        <span className="text-sm font-medium text-white">{title}</span>
        <HelpCircle className="h-3.5 w-3.5 shrink-0 text-indigo-300/80" aria-hidden />
      </div>
      {open ? (
        <div
          role="tooltip"
          className="absolute left-0 top-full z-[100] mt-1.5 max-w-[min(100%,20rem)] rounded-lg border border-white/20 bg-gray-950/98 px-3 py-2 text-[11px] leading-relaxed text-white/90 shadow-2xl backdrop-blur-md"
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function AdminSectionTitle({
  id,
  title,
  subtitle,
}: {
  id?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header id={id} className="mb-4 border-b border-white/10 pb-3">
      <h2 className="text-base font-bold tracking-wide text-white">{title}</h2>
      {subtitle ? <p className="mt-1 text-xs text-white/50">{subtitle}</p> : null}
    </header>
  );
}
