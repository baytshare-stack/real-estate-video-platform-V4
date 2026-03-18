"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";

type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED";
type CreativeType = "IMAGE" | "VIDEO";

type Campaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  createdAt: string;
};

type Creative = {
  id: string;
  campaignId: string;
  type: CreativeType;
  mediaUrl: string;
  clickUrl: string | null;
  impressions: number;
  clicks: number;
  createdAt: string;
};

type Placement = {
  id: string;
  campaignId: string;
  videoId: string;
  videoTitle: string;
  createdAt: string;
};

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function formatCompact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "camp_1",
    name: "Summer Property Push",
    status: "ACTIVE",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  },
];

const MOCK_CREATIVES: Creative[] = [
  {
    id: "cr_1",
    campaignId: "camp_1",
    type: "IMAGE",
    mediaUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1200&h=600",
    clickUrl: "https://example.com/buy",
    impressions: 12800,
    clicks: 312,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
];

const MOCK_PLACEMENTS: Placement[] = [
  {
    id: "pl_1",
    campaignId: "camp_1",
    videoId: "v_demo_001",
    videoTitle: "Modern Villa Tour (Mock)",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

export default function AdsManager() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>(MOCK_CAMPAIGNS);
  const [creatives, setCreatives] = React.useState<Creative[]>(MOCK_CREATIVES);
  const [placements, setPlacements] = React.useState<Placement[]>(MOCK_PLACEMENTS);

  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string>(MOCK_CAMPAIGNS[0]?.id ?? "");

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) ?? null;
  const selectedCreatives = creatives.filter((c) => c.campaignId === selectedCampaignId);
  const selectedPlacements = placements.filter((p) => p.campaignId === selectedCampaignId);

  const [createName, setCreateName] = React.useState("");
  const [createStatus, setCreateStatus] = React.useState<CampaignStatus>("DRAFT");

  const [creativeType, setCreativeType] = React.useState<CreativeType>("IMAGE");
  const [creativeMediaUrl, setCreativeMediaUrl] = React.useState("");
  const [creativeClickUrl, setCreativeClickUrl] = React.useState("");
  const [uploadBusy, setUploadBusy] = React.useState(false);

  const [assignVideoId, setAssignVideoId] = React.useState("");

  const [busyCreativeId, setBusyCreativeId] = React.useState<string>("");

  const createCampaign = () => {
    const name = createName.trim();
    if (!name) return;
    const id = uid("camp");
    const newCamp: Campaign = {
      id,
      name,
      status: createStatus,
      createdAt: new Date().toISOString(),
    };
    setCampaigns((prev) => [newCamp, ...prev]);
    setSelectedCampaignId(id);
    setCreateName("");
    setCreateStatus("DRAFT");
  };

  const addCreative = async (file?: File | null) => {
    if (!selectedCampaignId) return;
    const clickUrl = creativeClickUrl.trim();

    setUploadBusy(true);
    try {
      // Mock "upload": store media URL. For file input we use object URL.
      let mediaUrl = creativeMediaUrl.trim();
      if (!mediaUrl && file) {
        mediaUrl = URL.createObjectURL(file);
      }

      if (!mediaUrl) return;

      const c: Creative = {
        id: uid("cr"),
        campaignId: selectedCampaignId,
        type: creativeType,
        mediaUrl,
        clickUrl: clickUrl || null,
        impressions: 0,
        clicks: 0,
        createdAt: new Date().toISOString(),
      };
      setCreatives((prev) => [c, ...prev]);
      setCreativeMediaUrl("");
      setCreativeClickUrl("");
    } finally {
      setUploadBusy(false);
    }
  };

  const removeCampaign = (campaignId: string) => {
    setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    setCreatives((prev) => prev.filter((cr) => cr.campaignId !== campaignId));
    setPlacements((prev) => prev.filter((pl) => pl.campaignId !== campaignId));

    if (selectedCampaignId === campaignId) {
      const next = campaigns.find((c) => c.id !== campaignId)?.id ?? "";
      setSelectedCampaignId(next);
    }
  };

  const removeCreative = (creativeId: string) => {
    setCreatives((prev) => prev.filter((c) => c.id !== creativeId));
  };

  const removePlacement = (placementId: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== placementId));
  };

  const assignToVideo = () => {
    const videoId = assignVideoId.trim();
    if (!videoId || !selectedCampaignId) return;

    const exists = placements.some((p) => p.campaignId === selectedCampaignId && p.videoId === videoId);
    if (exists) return;

    const p: Placement = {
      id: uid("pl"),
      campaignId: selectedCampaignId,
      videoId,
      videoTitle: `Video ${videoId.slice(0, 10)} (Mock)`,
      createdAt: new Date().toISOString(),
    };
    setPlacements((prev) => [p, ...prev]);
    setAssignVideoId("");
  };

  const simulateImpression = (creativeId: string) => {
    setBusyCreativeId(creativeId);
    setCreatives((prev) =>
      prev.map((c) => (c.id === creativeId ? { ...c, impressions: c.impressions + 1 } : c))
    );
    setTimeout(() => setBusyCreativeId(""), 250);
  };

  const simulateClick = (creativeId: string) => {
    setBusyCreativeId(creativeId);
    setCreatives((prev) =>
      prev.map((c) => (c.id === creativeId ? { ...c, clicks: c.clicks + 1 } : c))
    );
    setTimeout(() => setBusyCreativeId(""), 250);
  };

  const setCampaignStatus = (campaignId: string, status: CampaignStatus) => {
    setCampaigns((prev) => prev.map((c) => (c.id === campaignId ? { ...c, status } : c)));
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-white font-semibold">Ads</h2>
          <p className="text-sm text-white/60 mt-1">
            Campaigns, creatives, assignments, and impressions/clicks tracking (mock UI).
          </p>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
          {/* Campaigns */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="block text-xs font-medium text-white/70 mb-2">Campaign name</label>
                <input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                  placeholder="e.g. Q2 Lead Gen"
                />
              </div>
              <div className="w-full sm:w-[180px]">
                <label className="block text-xs font-medium text-white/70 mb-2">Status</label>
                <select
                  value={createStatus}
                  onChange={(e) => setCreateStatus(e.target.value as CampaignStatus)}
                  className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PAUSED</option>
                </select>
              </div>
              <button
                type="button"
                onClick={createCampaign}
                className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!createName.trim()}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create
                </span>
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {campaigns.length === 0 ? (
                <p className="text-sm text-white/60">No campaigns yet.</p>
              ) : (
                campaigns.map((c) => {
                  const active = c.id === selectedCampaignId;
                  return (
                    <div
                      key={c.id}
                      className={[
                        "rounded-2xl border p-3 transition",
                        active ? "border-indigo-400/20 bg-indigo-500/10" : "border-white/10 bg-white/5",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCampaignId(c.id)}
                          className="min-w-0 text-left"
                        >
                          <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                          <p className="mt-1 text-xs text-white/50">{formatDate(c.createdAt)}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCampaign(c.id)}
                          className="rounded-xl border border-red-400/20 bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/15"
                          aria-label="Delete campaign"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <select
                          value={c.status}
                          onChange={(e) => setCampaignStatus(c.id, e.target.value as CampaignStatus)}
                          className="flex-1 rounded-xl px-3 py-2 bg-white/5 border border-white/10 text-white outline-none transition"
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="PAUSED">PAUSED</option>
                        </select>
                        <span className="text-xs text-white/50 whitespace-nowrap">
                          {c.id === selectedCampaignId ? "Selected" : ""}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Details */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            {!selectedCampaign ? (
              <p className="text-sm text-white/60">Select a campaign to manage.</p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold truncate">{selectedCampaign.name}</h3>
                    <p className="text-sm text-white/60 mt-1">
                      Status: <span className="text-white/80">{selectedCampaign.status}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/50">Creatives</p>
                    <p className="text-sm font-semibold text-white tabular-nums">
                      {selectedCreatives.length}
                    </p>
                  </div>
                </div>

                {/* Creatives */}
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h4 className="text-white font-semibold">Creatives</h4>
                      <p className="text-xs text-white/60 mt-1">Add media by URL or mock upload.</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr]">
                    <div>
                      <label className="block text-xs font-medium text-white/70 mb-2">Type</label>
                      <select
                        value={creativeType}
                        onChange={(e) => setCreativeType(e.target.value as CreativeType)}
                        className="w-full rounded-xl px-3 py-3 bg-white/5 border border-white/10 text-white outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                      >
                        <option value="IMAGE">IMAGE</option>
                        <option value="VIDEO">VIDEO</option>
                      </select>
                    </div>
                    <div className="min-w-0">
                      <label className="block text-xs font-medium text-white/70 mb-2">Media URL</label>
                      <input
                        value={creativeMediaUrl}
                        onChange={(e) => setCreativeMediaUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-white/70 mb-2">Click URL (optional)</label>
                    <input
                      value={creativeClickUrl}
                      onChange={(e) => setCreativeClickUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                    />
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 cursor-pointer">
                      Upload file (mock)
                      <input
                        type="file"
                        accept={creativeType === "IMAGE" ? "image/*" : "video/*"}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          void addCreative(file);
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => void addCreative(null)}
                      disabled={uploadBusy || !creativeMediaUrl.trim()}
                      className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {uploadBusy ? "Adding..." : "Add creative"}
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {selectedCreatives.length === 0 ? (
                      <p className="text-sm text-white/60">No creatives yet.</p>
                    ) : (
                      selectedCreatives.map((cr) => (
                        <div key={cr.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs text-white/50">
                                {cr.type} • {formatDate(cr.createdAt)}
                              </p>
                              <p className="mt-1 text-sm font-medium text-white/80 break-all line-clamp-1">{cr.mediaUrl}</p>
                              <div className="mt-2 flex gap-3 text-xs text-white/60 tabular-nums">
                                <span>Impr: {formatCompact(cr.impressions)}</span>
                                <span>Clicks: {formatCompact(cr.clicks)}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeCreative(cr.id)}
                              className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/15"
                            >
                              Delete
                            </button>
                          </div>

                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => simulateImpression(cr.id)}
                                disabled={busyCreativeId === cr.id}
                                className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/15 disabled:opacity-60"
                              >
                                Simulate impression
                              </button>
                              <button
                                type="button"
                                onClick={() => simulateClick(cr.id)}
                                disabled={busyCreativeId === cr.id}
                                className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/15 disabled:opacity-60"
                              >
                                Simulate click
                              </button>
                            </div>
                            <div className="text-xs text-white/50">
                              {cr.clickUrl ? `Click: ${cr.clickUrl}` : "No click URL"}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Placements */}
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <h4 className="text-white font-semibold">Assign to videos</h4>
                  <p className="text-xs text-white/60 mt-1">Paste Video ID to attach this campaign.</p>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px]">
                    <input
                      value={assignVideoId}
                      onChange={(e) => setAssignVideoId(e.target.value)}
                      placeholder="Video ID..."
                      className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                    />
                    <button
                      type="button"
                      onClick={assignToVideo}
                      disabled={!assignVideoId.trim()}
                      className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Assign
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {selectedPlacements.length === 0 ? (
                      <p className="text-sm text-white/60">No placements yet.</p>
                    ) : (
                      selectedPlacements.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-3 flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs text-white/50">{formatDate(p.createdAt)}</p>
                            <p className="mt-1 text-sm font-medium text-white/80 line-clamp-1">{p.videoTitle}</p>
                            <p className="mt-1 text-xs text-white/50 font-mono break-all">{p.videoId}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePlacement(p.id)}
                            className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/15"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

