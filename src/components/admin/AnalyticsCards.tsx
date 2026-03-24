import * as React from "react";

export type AnalyticsTotals = {
  totalUsers: number;
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
};

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export default function AnalyticsCards({ totals }: { totals?: AnalyticsTotals }) {
  const mock: AnalyticsTotals = {
    totalUsers: 12840,
    totalVideos: 342,
    totalViews: 1280400,
    totalLikes: 98200,
  };

  const t = totals ?? mock;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
        <p className="text-sm text-white/60">Total Users</p>
        <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{formatCompact(t.totalUsers)}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
        <p className="text-sm text-white/60">Total Videos</p>
        <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{formatCompact(t.totalVideos)}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
        <p className="text-sm text-white/60">Total Views</p>
        <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{formatCompact(t.totalViews)}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
        <p className="text-sm text-white/60">Total Likes</p>
        <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{formatCompact(t.totalLikes)}</p>
      </div>
    </div>
  );
}

