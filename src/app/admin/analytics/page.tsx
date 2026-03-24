"use client";

import * as React from "react";

type Totals = {
  totalUsers: number;
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
};

type ChartPoint = { day: string; value: number };
type TopChannel = { channelName: string; views: number };

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function LineChart({ points }: { points: ChartPoint[] }) {
  const width = 700;
  const height = 220;
  const padding = 28;

  const values = points.map((p) => p.value);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);

  const xStep = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const yScale = (v: number) => {
    const t = (v - min) / (max - min || 1);
    return height - padding - t * (height - padding * 2);
  };

  const d = points
    .map((p, idx) => {
      const x = padding + idx * xStep;
      const y = yScale(p.value);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-white font-semibold text-sm">User growth</h2>
        <p className="text-xs text-white/50">Last 14 days</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = padding + (height - padding * 2) * t;
          return <line key={i} x1={padding} x2={width - padding} y1={y} y2={y} stroke="rgba(255,255,255,0.08)" />;
        })}

        {/* line fill */}
        <path
          d={`${d} L ${padding + (points.length - 1) * xStep} ${height - padding} L ${padding} ${height - padding} Z`}
          fill="url(#fillGrad)"
        />
        <path d={d} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

        {/* points */}
        {points.map((p, idx) => {
          const x = padding + idx * xStep;
          const y = yScale(p.value);
          return (
            <g key={p.day}>
              <circle cx={x} cy={y} r="5" fill="rgba(99,102,241,0.15)" stroke="#818cf8" strokeWidth="2" />
            </g>
          );
        })}
      </svg>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-white/50">
        {points.map((p, idx) => {
          if (idx === 0 || idx === points.length - 1 || idx === Math.floor(points.length / 2)) {
            return (
              <span key={p.day}>
                {formatDateShort(p.day)}
              </span>
            );
          }
          return <span key={p.day} className="w-0 overflow-hidden" aria-hidden="true">.</span>;
        })}
      </div>
    </div>
  );
}

function BarChart({ points }: { points: ChartPoint[] }) {
  const values = points.map((p) => p.value);
  const max = Math.max(1, ...values);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-white font-semibold text-sm">Video performance</h2>
        <p className="text-xs text-white/50">Views by day</p>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2 items-end h-52">
        {points.map((p) => {
          const h = (p.value / max) * 100;
          return (
            <div key={p.day} className="flex flex-col items-center gap-2">
              <div
                className="w-full rounded-xl bg-indigo-500/20 border border-indigo-400/20"
                style={{ height: `${Math.max(6, h)}%` }}
                title={`${formatDateShort(p.day)}: ${p.value} views`}
              />
              <div className="text-[11px] text-white/50">{formatDateShort(p.day)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopChannels({ items }: { items: TopChannel[] }) {
  const max = Math.max(1, ...items.map((i) => i.views));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-white font-semibold text-sm">Top channels</h2>
        <p className="text-xs text-white/50">By total views</p>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((it) => {
          const w = (it.views / max) * 100;
          return (
            <div key={it.channelName} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white/80 line-clamp-1">{it.channelName}</p>
                <p className="text-sm text-white/60 tabular-nums">{formatCompact(it.views)} views</p>
              </div>
              <div className="h-2 rounded-full bg-white/5 border border-white/10 overflow-hidden">
                <div className="h-full bg-indigo-400/30" style={{ width: `${w}%` }} />
              </div>
            </div>
          );
        })}
        {items.length === 0 ? <p className="text-sm text-white/60">No channel data yet.</p> : null}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>("");
  const [totals, setTotals] = React.useState<Totals>({
    totalUsers: 0,
    totalVideos: 0,
    totalViews: 0,
    totalLikes: 0,
  });
  const [userGrowth, setUserGrowth] = React.useState<ChartPoint[]>([]);
  const [videoPerformance, setVideoPerformance] = React.useState<ChartPoint[]>([]);
  const [topChannels, setTopChannels] = React.useState<TopChannel[]>([]);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/analytics", { cache: "no-store" });
        const data = (await res.json()) as
          | {
              error?: string;
              totals: Totals;
              userGrowth: ChartPoint[];
              videoPerformance: ChartPoint[];
              topChannels: TopChannel[];
            }
          | { error: string };
        if (!res.ok || "error" in data) {
          throw new Error((data as any).error || "Failed to load analytics.");
        }
        setTotals(data.totals);
        setUserGrowth(data.userGrowth);
        setVideoPerformance(data.videoPerformance);
        setTopChannels(data.topChannels);
      } catch (e: any) {
        setError(e?.message || "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-white/60">Summary + performance charts.</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: totals.totalUsers },
          { label: "Total Videos", value: totals.totalVideos },
          { label: "Total Views", value: totals.totalViews },
          { label: "Total Likes", value: totals.totalLikes },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
            <p className="text-sm text-white/60">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white tabular-nums">
              {formatCompact(c.value)}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/60">
          Loading charts…
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-4">
            <LineChart points={userGrowth} />
          </div>
          <div className="space-y-4">
            <BarChart points={videoPerformance.slice(-7)} />
            <TopChannels items={topChannels} />
          </div>
        </div>
      )}
    </div>
  );
}


