"use client";

import * as React from "react";
import type { SiteAppearanceDTO, SiteUiConfig } from "@/lib/site-appearance";
import { appearanceToCssVars, discoverGridUlClass } from "@/lib/site-appearance";

function MockAgentCard({ style }: { style: SiteUiConfig["discover"]["agentCardStyle"] }) {
  const img =
    style === "minimal"
      ? "aspect-[5/4]"
      : style === "compact"
        ? "aspect-[5/4]"
        : "aspect-[4/3]";
  const art =
    style === "minimal"
      ? "rounded-lg border border-white/15 bg-transparent"
      : style === "compact"
        ? "rounded-xl border border-white/10 bg-white/[0.04] shadow-md"
        : "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] shadow-lg";
  return (
    <article className={`flex max-w-[200px] flex-col overflow-hidden ${art}`}>
      <div className={`relative ${img} bg-black/50`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <p className="truncate text-[11px] font-semibold text-white">Agent preview</p>
          <p className="text-[9px] text-white/70">Dubai</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <div className="h-2 w-16 rounded bg-white/20" />
        <div className="mt-auto h-6 rounded-lg bg-sky-600/90 text-center text-[9px] leading-6 text-white">View</div>
      </div>
    </article>
  );
}

function MockAgencyCard({ style }: { style: SiteUiConfig["discover"]["agencyCardStyle"] }) {
  const art =
    style === "minimal"
      ? "rounded-lg border border-white/15 bg-transparent"
      : style === "compact"
        ? "rounded-xl border border-white/10 bg-violet-500/[0.06] shadow-md"
        : "rounded-2xl border border-white/10 bg-gradient-to-b from-violet-500/[0.1] to-white/[0.02] shadow-lg";
  return (
    <article className={`flex max-w-[200px] flex-col overflow-hidden ${art}`}>
      <div className="relative aspect-[5/3] bg-black/50">
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
        <div className="absolute bottom-2 left-2 right-2">
          <p className="truncate text-[11px] font-semibold text-white">Agency preview</p>
        </div>
      </div>
      <div className="p-2">
        <div className="h-6 rounded-lg bg-violet-600/90 text-center text-[9px] leading-6 text-white">Company</div>
      </div>
    </article>
  );
}

function MockVideoCard({ layout }: { layout: SiteUiConfig["videoCard"]["layout"] }) {
  if (layout === "poster") {
    return (
      <div className="w-[180px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
        <div className="relative aspect-video bg-gray-800">
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent p-2">
            <p className="text-[10px] font-bold text-white">$1,250,000</p>
            <p className="line-clamp-1 text-[9px] text-white/80">Poster layout · title</p>
          </div>
        </div>
      </div>
    );
  }
  if (layout === "dense") {
    return (
      <div className="flex w-[200px] shrink-0 gap-2 rounded-lg border border-white/10 bg-black/30 p-1.5">
        <div className="h-14 w-24 shrink-0 rounded bg-gray-700" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="line-clamp-2 text-[10px] font-medium text-white">Dense · shorter text</p>
          <p className="text-[9px] text-white/60">$890k · Miami</p>
        </div>
      </div>
    );
  }
  return (
    <div className="w-[200px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
      <div className="aspect-video bg-gray-800" />
      <div className="flex gap-2 p-2">
        <div className="h-8 w-8 shrink-0 rounded-full bg-gray-600" />
        <div className="min-w-0">
          <p className="line-clamp-2 text-[10px] text-white">Standard video card</p>
          <p className="mt-0.5 text-[9px] text-white/55">$2.1M · views</p>
        </div>
      </div>
    </div>
  );
}

function MockProfile({ layout }: { layout: SiteUiConfig["profile"]["layout"] }) {
  const banner = layout === "spotlight";
  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 ${banner ? "bg-gradient-to-br from-indigo-900/40 to-black/60" : "bg-gray-900/80"}`}
    >
      <div className={`flex items-start gap-3 p-3 ${banner ? "flex-col items-center text-center" : ""}`}>
        <div className={`shrink-0 rounded-full bg-gray-700 ${banner ? "h-14 w-14" : "h-10 w-10"}`} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] font-semibold text-white">Profile · {layout}</p>
          <p className="text-[9px] text-white/55">@user · joined</p>
        </div>
      </div>
    </div>
  );
}

export default function SiteLookLivePreview({ draft }: { draft: SiteAppearanceDTO }) {
  const vars = appearanceToCssVars(draft);
  const ui = draft.ui;
  const gridAgents = discoverGridUlClass("agents", ui.discover);

  return (
    <div className="lg:sticky lg:top-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white">معاينة مباشرة</h3>
        <span className="text-[10px] text-white/45">قبل الحفظ — تعكس المسودة الحالية</span>
      </div>
      <div
        className="max-h-[min(85vh,920px)] overflow-y-auto rounded-2xl border border-indigo-500/25 bg-black/40 p-4 shadow-inner"
        style={vars as React.CSSProperties}
      >
        <div
          className="space-y-6 rounded-xl p-3"
          style={{
            backgroundColor: "var(--site-bg)",
            color: "var(--site-text)",
            fontFamily: "var(--site-font-body)",
            fontSize: "var(--site-font-size-base)",
          }}
        >
          <div className="flex items-center gap-2 border-b border-[var(--site-border)] pb-3">
            {draft.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.logoUrl} alt="" className="h-7 w-auto max-w-[100px] object-contain" />
            ) : (
              <div
                className="flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold text-white"
                style={{ backgroundColor: "var(--site-primary)" }}
              >
                R
              </div>
            )}
            <span className="text-[11px] font-bold uppercase tracking-tight opacity-90">Header</span>
          </div>

          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--site-muted)]">
              وكلاء · شبكة {ui.discover.agentsColumns} أعمدة
            </p>
            <ul className={[gridAgents, "max-w-full"].join(" ")}>
              <li>
                <MockAgentCard style={ui.discover.agentCardStyle} />
              </li>
              <li>
                <MockAgentCard style={ui.discover.agentCardStyle} />
              </li>
            </ul>
          </section>

          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--site-muted)]">
              وكالات · بطاقة
            </p>
            <div className="flex flex-wrap gap-2">
              <MockAgencyCard style={ui.discover.agencyCardStyle} />
            </div>
          </section>

          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--site-muted)]">
              بطاقة فيديو · {ui.videoCard.layout}
            </p>
            <div className="flex flex-wrap gap-2">
              <MockVideoCard layout={ui.videoCard.layout} />
            </div>
          </section>

          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--site-muted)]">
              بروفايل
            </p>
            <MockProfile layout={ui.profile.layout} />
            {!ui.profile.showAccountCard ? (
              <p className="mt-1 text-[9px] text-amber-400/90">(بطاقة الحساب مخفية)</p>
            ) : null}
            {!ui.profile.showMyVisits ? (
              <p className="text-[9px] text-amber-400/90">(زياراتي مخفية)</p>
            ) : null}
            {!ui.profile.showInbox ? <p className="text-[9px] text-amber-400/90">(الرسائل مخفية)</p> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
