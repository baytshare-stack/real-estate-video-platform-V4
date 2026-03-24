"use client";

import * as React from "react";

type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED";
type CreativeType = "IMAGE" | "VIDEO";

type CampaignRow = {
  id: string;
  name: string;
  status: CampaignStatus;
  createdAt: string;
  creativesCount: number;
  placementsCount: number;
};

type CreativeRow = {
  id: string;
  campaignId: string;
  type: CreativeType;
  mediaUrl: string;
  clickUrl: string | null;
  impressions: number;
  clicks: number;
  createdAt: string;
};

type PlacementRow = {
  id: string;
  campaignId: string;
  videoId: string;
  videoTitle: string;
  createdAt: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function AdminAdsPage() {
  const [campaigns, setCampaigns] = React.useState<CampaignRow[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string>("");
  const [creatives, setCreatives] = React.useState<CreativeRow[]>([]);
  const [placements, setPlacements] = React.useState<PlacementRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  const [newCampaignName, setNewCampaignName] = React.useState("");
  const [newCampaignStatus, setNewCampaignStatus] = React.useState<CampaignStatus>("DRAFT");

  const [newCreativeType, setNewCreativeType] = React.useState<CreativeType>("IMAGE");
  const [newCreativeMediaUrl, setNewCreativeMediaUrl] = React.useState("");
  const [newCreativeClickUrl, setNewCreativeClickUrl] = React.useState("");

  const [assignVideoId, setAssignVideoId] = React.useState("");

  const loadCampaigns = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ads/campaigns", { cache: "no-store" });
      const data = (await res.json()) as { campaigns?: CampaignRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load campaigns.");
      setCampaigns(data.campaigns || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCampaignDetails = React.useCallback(async (campaignId: string) => {
    if (!campaignId) {
      setCreatives([]);
      setPlacements([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [crRes, plRes] = await Promise.all([
        fetch(`/api/admin/ads/creatives?campaignId=${encodeURIComponent(campaignId)}`, { cache: "no-store" }),
        fetch(`/api/admin/ads/placements?campaignId=${encodeURIComponent(campaignId)}`, { cache: "no-store" }),
      ]);
      const crData = (await crRes.json()) as { creatives?: CreativeRow[]; error?: string };
      const plData = (await plRes.json()) as { placements?: PlacementRow[]; error?: string };
      if (!crRes.ok) throw new Error(crData.error || "Failed to load creatives.");
      if (!plRes.ok) throw new Error(plData.error || "Failed to load placements.");
      setCreatives(crData.creatives || []);
      setPlacements(plData.placements || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load campaign details.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  React.useEffect(() => {
    void loadCampaignDetails(selectedCampaignId);
  }, [loadCampaignDetails, selectedCampaignId]);

  const createCampaign = async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCampaignName, status: newCampaignStatus }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to create campaign.");
      setNewCampaignName("");
      await loadCampaigns();
      if (data.id) setSelectedCampaignId(data.id);
    } catch (e: any) {
      setError(e?.message || "Failed to create campaign.");
    }
  };

  const updateCampaignStatus = async (campaignId: string, status: CampaignStatus) => {
    setError("");
    try {
      const res = await fetch(`/api/admin/ads/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to update campaign.");
      await loadCampaigns();
    } catch (e: any) {
      setError(e?.message || "Failed to update campaign.");
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    const ok = window.confirm("Delete this campaign? This will remove creatives and placements.");
    if (!ok) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/ads/campaigns/${campaignId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete campaign.");
      if (selectedCampaignId === campaignId) setSelectedCampaignId("");
      await loadCampaigns();
    } catch (e: any) {
      setError(e?.message || "Failed to delete campaign.");
    }
  };

  const addCreative = async () => {
    if (!selectedCampaignId) return;
    setError("");
    try {
      const res = await fetch("/api/admin/ads/creatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: selectedCampaignId,
          type: newCreativeType,
          mediaUrl: newCreativeMediaUrl,
          clickUrl: newCreativeClickUrl,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to add creative.");
      setNewCreativeMediaUrl("");
      setNewCreativeClickUrl("");
      await loadCampaignDetails(selectedCampaignId);
      await loadCampaigns();
    } catch (e: any) {
      setError(e?.message || "Failed to add creative.");
    }
  };

  const deleteCreative = async (creativeId: string) => {
    const ok = window.confirm("Delete this creative?");
    if (!ok) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/ads/creatives/${creativeId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to delete creative.");
      await loadCampaignDetails(selectedCampaignId);
      await loadCampaigns();
    } catch (e: any) {
      setError(e?.message || "Failed to delete creative.");
    }
  };

  const assignToVideo = async () => {
    if (!selectedCampaignId) return;
    setError("");
    try {
      const res = await fetch("/api/admin/ads/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selectedCampaignId, videoId: assignVideoId }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to assign to video.");
      setAssignVideoId("");
      await loadCampaignDetails(selectedCampaignId);
      await loadCampaigns();
    } catch (e: any) {
      setError(e?.message || "Failed to assign to video.");
    }
  };

  const removePlacement = async (placementId: string) => {
    const ok = window.confirm("Remove this placement?");
    if (!ok) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/ads/placements/${placementId}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: true; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to remove placement.");
      await loadCampaignDetails(selectedCampaignId);
      await loadCampaigns();
    } catch (e: any) {
      setError(e?.message || "Failed to remove placement.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Ads</h1>
          <p className="mt-1 text-sm text-white/60">
            Create campaigns, add creatives (media URLs), assign to videos, and track impressions/clicks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCampaigns()}
          className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
        {/* Campaigns */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-white font-semibold">Campaigns</h2>
            <p className="text-xs text-white/50 mt-1">Select a campaign to manage creatives and placements.</p>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_120px] gap-3">
              <input
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="New campaign name…"
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              />
              <select
                value={newCampaignStatus}
                onChange={(e) => setNewCampaignStatus(e.target.value as CampaignStatus)}
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
              </select>
              <button
                type="button"
                onClick={() => void createCampaign()}
                className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
              >
                Create
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="text-left text-white/70">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Creatives</th>
                    <th className="py-2 pr-4 font-medium">Placements</th>
                    <th className="py-2 pr-4 font-medium">Created</th>
                    <th className="py-2 pr-0 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {campaigns.map((c) => {
                    const selected = c.id === selectedCampaignId;
                    return (
                      <tr key={c.id} className={selected ? "bg-indigo-500/10" : ""}>
                        <td className="py-3 pr-4">
                          <button
                            type="button"
                            onClick={() => setSelectedCampaignId(c.id)}
                            className="text-left font-medium text-white hover:text-indigo-300 transition"
                          >
                            {c.name}
                          </button>
                        </td>
                        <td className="py-3 pr-4">
                          <select
                            value={c.status}
                            onChange={(e) => void updateCampaignStatus(c.id, e.target.value as CampaignStatus)}
                            className="rounded-xl px-3 py-2 bg-white/5 border border-white/10 text-white outline-none"
                          >
                            <option value="DRAFT">DRAFT</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="PAUSED">PAUSED</option>
                          </select>
                        </td>
                        <td className="py-3 pr-4 tabular-nums text-white/70">{c.creativesCount}</td>
                        <td className="py-3 pr-4 tabular-nums text-white/70">{c.placementsCount}</td>
                        <td className="py-3 pr-4 text-white/60">{formatDate(c.createdAt)}</td>
                        <td className="py-3 pr-0 text-right">
                          <button
                            type="button"
                            onClick={() => void deleteCampaign(c.id)}
                            className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/15"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {campaigns.length === 0 ? (
                    <tr>
                      <td className="py-6 text-white/60" colSpan={6}>
                        {loading ? "Loading…" : "No campaigns yet."}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-white font-semibold">Creatives</h2>
            <p className="text-xs text-white/50 mt-1">
              Add image/video creatives by URL (upload integration can be added next).
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={newCreativeType}
                  onChange={(e) => setNewCreativeType(e.target.value as CreativeType)}
                  disabled={!selectedCampaignId}
                  className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none disabled:opacity-60"
                >
                  <option value="IMAGE">IMAGE</option>
                  <option value="VIDEO">VIDEO</option>
                </select>
                <button
                  type="button"
                  onClick={() => void addCreative()}
                  disabled={!selectedCampaignId}
                  className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Add creative
                </button>
              </div>
              <input
                value={newCreativeMediaUrl}
                onChange={(e) => setNewCreativeMediaUrl(e.target.value)}
                disabled={!selectedCampaignId}
                placeholder="Media URL (image/video)…"
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none disabled:opacity-60"
              />
              <input
                value={newCreativeClickUrl}
                onChange={(e) => setNewCreativeClickUrl(e.target.value)}
                disabled={!selectedCampaignId}
                placeholder="Click URL (optional)…"
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none disabled:opacity-60"
              />
            </div>

            <div className="mt-4 space-y-2">
              {creatives.map((cr) => (
                <div
                  key={cr.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-white/50">
                      {cr.type} • {formatDate(cr.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-white/80 break-all line-clamp-2">{cr.mediaUrl}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-white/60 tabular-nums">
                      <span>Impr: {cr.impressions}</span>
                      <span>Clicks: {cr.clicks}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteCreative(cr.id)}
                    className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/15"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {selectedCampaignId && creatives.length === 0 ? (
                <div className="text-sm text-white/60">No creatives yet.</div>
              ) : null}
              {!selectedCampaignId ? (
                <div className="text-sm text-white/60">Select a campaign to manage creatives.</div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-white font-semibold">Assign to videos</h2>
            <p className="text-xs text-white/50 mt-1">Paste a Video ID to attach this campaign.</p>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3">
              <input
                value={assignVideoId}
                onChange={(e) => setAssignVideoId(e.target.value)}
                disabled={!selectedCampaignId}
                placeholder="Video ID…"
                className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void assignToVideo()}
                disabled={!selectedCampaignId}
                className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Assign
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {placements.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-white/50">{formatDate(p.createdAt)}</p>
                    <p className="mt-1 text-sm text-white/80 line-clamp-1">{p.videoTitle}</p>
                    <p className="mt-1 text-xs text-white/50 font-mono break-all">{p.videoId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removePlacement(p.id)}
                    className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/15"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {selectedCampaignId && placements.length === 0 ? (
                <div className="text-sm text-white/60">No placements yet.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

