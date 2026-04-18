"use client";

import * as React from "react";
import Link from "next/link";
import { StudioAdsPageHeader } from "@/components/studio/ads/StudioAdsBreadcrumb";

export default function StudioAdsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-white">
      <StudioAdsPageHeader
        segment="ads"
        title="Video ads"
        subtitle="Pre-roll and mid-roll creatives are managed in the admin console. Wallet, campaigns, and billing stay here in Studio."
      />
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-sm text-white/80">
          Advertisers no longer attach video creatives to campaigns in this build. Add MP4 URLs, slots, and skip rules
          under{" "}
          <Link href="/admin/ads" className="font-semibold text-indigo-400 underline-offset-2 hover:underline">
            Admin → Ads
          </Link>
          . The watch page loads active creatives automatically.
        </p>
        <p className="mt-4 text-xs text-white/50">
          Optional: set <code className="rounded bg-black/40 px-1">VIDEO_ADS_DEMO_PRE_ROLL_URL</code> and{" "}
          <code className="rounded bg-black/40 px-1">VIDEO_ADS_DEMO_MID_ROLL_URL</code> for mock delivery without database
          rows. Use <code className="rounded bg-black/40 px-1">VIDEO_ADS_PREFER_MOCK=1</code> to force mocks in
          development.
        </p>
      </div>
    </div>
  );
}
