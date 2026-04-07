"use client";

import { ChevronRight, ArrowLeft } from "lucide-react";
import LocaleLink from "@/components/LocaleLink";

type Segment = "campaigns" | "ads";

export function StudioBackToStudio({ className = "" }: { className?: string }) {
  return (
    <LocaleLink
      href="/studio"
      className={`inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/90 transition hover:border-white/25 hover:bg-white/10 ${className}`}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      Back to Studio
    </LocaleLink>
  );
}

export function StudioAdsBreadcrumb({ segment }: { segment: Segment }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-white/55">
      <LocaleLink href="/studio" className="transition hover:text-white">
        Studio
      </LocaleLink>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
      {segment === "campaigns" ? (
        <span className="font-semibold text-white">Campaigns</span>
      ) : (
        <LocaleLink href="/studio/campaigns" className="transition hover:text-white">
          Campaigns
        </LocaleLink>
      )}
      {segment === "ads" ? (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
          <span className="font-semibold text-white">Ads</span>
        </>
      ) : null}
    </nav>
  );
}

export function StudioAdsPageHeader({
  segment,
  title,
  subtitle,
}: {
  segment: Segment;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StudioBackToStudio />
        <StudioAdsBreadcrumb segment={segment} />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-sm text-white/60">{subtitle}</p> : null}
      </div>
    </div>
  );
}
