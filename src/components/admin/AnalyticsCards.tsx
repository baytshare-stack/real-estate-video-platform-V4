import * as React from "react";

export type DashboardMetrics = {
  totalUsers: number;
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  activeListings: number;
};

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

export default function AnalyticsCards({
  metrics,
  loading,
}: {
  metrics: DashboardMetrics | null;
  loading?: boolean;
}) {
  if (loading && !metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {SKELETON_KEYS.map((k) => (
          <div key={k} className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm animate-pulse">
            <div className="h-4 w-24 rounded bg-white/10" />
            <div className="mt-3 h-8 w-20 rounded bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  const t: DashboardMetrics = metrics ?? {
    totalUsers: 0,
    totalVideos: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    activeListings: 0,
  };

  const cards = [
    { label: "Total Users", value: t.totalUsers },
    { label: "Total Videos", value: t.totalVideos },
    { label: "Total Views", value: t.totalViews },
    { label: "Total Likes", value: t.totalLikes },
    { label: "Total Comments", value: t.totalComments },
    { label: "Active listings", value: t.activeListings },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
          <p className="text-sm text-white/60">{c.label}</p>
          <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{formatCompact(c.value)}</p>
        </div>
      ))}
    </div>
  );
}
