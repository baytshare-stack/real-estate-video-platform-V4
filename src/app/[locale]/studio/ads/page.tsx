"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Loader2, Link2, Upload, ImageIcon, Film, Sparkles, Pencil, Play, Pause, Trash2, RotateCcw } from "lucide-react";
import LocaleLink from "@/components/LocaleLink";
import { StudioAdsPageHeader } from "@/components/studio/ads/StudioAdsBreadcrumb";
import { AdsLifecycleBadge } from "@/components/studio/ads/AdsLifecycleBadge";
import { StudioConfirmDialog } from "@/components/studio/ads/StudioConfirmDialog";
import type { MapRadiusValue } from "@/components/studio/ads/MapRadiusPicker";
import { DEFAULT_MAP_RADIUS } from "@/components/studio/ads/MapRadiusPicker";

const MapRadiusPicker = dynamic(() => import("@/components/studio/ads/MapRadiusPicker"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-2xl bg-white/[0.04] ring-1 ring-white/10" />,
});

type Campaign = { id: string; name: string; status?: string };
type ListingGov = { key: string; labelEn: string; labelAr: string };
type ListingCountry = { key: string; labelEn: string; labelAr: string; governorates: ListingGov[] };
type ListingPT = { slug: string; labelEn: string; labelAr: string };

type AdRow = {
  id: string;
  type: string;
  placement: string;
  status: string;
  videoUrl?: string | null;
  imageUrl?: string | null;
  thumbnail?: string | null;
  duration?: number;
  skipAfter?: number;
  ctaType?: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  campaign?: {
    id?: string;
    name?: string;
    status?: string;
    budget?: unknown;
    spent?: unknown;
  };
  targeting?: {
    country?: string;
    city?: string;
    area?: string;
    propertyTypes?: string[];
    priceMin?: unknown;
    priceMax?: unknown;
    userIntent?: string | null;
  };
  performance?: { impressions?: number; clicks?: number; views?: number };
};

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function ctrPct(impressions: number, clicks: number): number {
  if (impressions <= 0) return 0;
  return (clicks / impressions) * 100;
}

function formatInt(x: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(x);
}

function formatPct(x: number) {
  return `${x.toFixed(2)}%`;
}

function AdToolbar({
  ad,
  patchAd,
  onEdit,
  setConfirmDelete,
}: {
  ad: AdRow;
  patchAd: (id: string, body: Record<string, unknown>) => Promise<boolean>;
  onEdit: () => void;
  setConfirmDelete: (id: string | null) => void;
}) {
  const st = ad.status;
  const deleted = st === "DELETED";
  const btn =
    "inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-medium text-white hover:bg-white/10 disabled:opacity-35";

  return (
    <div className="flex flex-wrap gap-1">
      <button type="button" className={btn} disabled={deleted} onClick={onEdit}>
        <Pencil className="h-3 w-3" aria-hidden />
        Edit
      </button>
      {deleted ? (
        <button type="button" className={btn} onClick={() => void patchAd(ad.id, { status: "DRAFT" })}>
          <RotateCcw className="h-3 w-3" aria-hidden />
          Restore
        </button>
      ) : null}
      {(st === "DRAFT" || st === "PAUSED") && !deleted ? (
        <button type="button" className={btn} onClick={() => void patchAd(ad.id, { status: "ACTIVE" })}>
          <Play className="h-3 w-3" aria-hidden />
          {st === "DRAFT" ? "Activate" : "Resume"}
        </button>
      ) : null}
      {st === "ACTIVE" && !deleted ? (
        <button type="button" className={btn} onClick={() => void patchAd(ad.id, { status: "PAUSED" })}>
          <Pause className="h-3 w-3" aria-hidden />
          Pause
        </button>
      ) : null}
      {!deleted ? (
        <button type="button" className={`${btn} text-rose-200`} onClick={() => setConfirmDelete(ad.id)}>
          <Trash2 className="h-3 w-3" aria-hidden />
          Delete
        </button>
      ) : null}
    </div>
  );
}

export default function StudioAdsPage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [ads, setAds] = React.useState<AdRow[]>([]);
  const [countries, setCountries] = React.useState<ListingCountry[]>([]);
  const [propertyTypes, setPropertyTypes] = React.useState<ListingPT[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmDeleteAdId, setConfirmDeleteAdId] = React.useState<string | null>(null);
  const [editingAd, setEditingAd] = React.useState<AdRow | null>(null);
  const [editForm, setEditForm] = React.useState({
    type: "VIDEO" as "VIDEO" | "IMAGE",
    videoUrl: "",
    imageUrl: "",
    thumbnail: "",
    duration: 15,
    skipAfter: 5,
    placement: "PRE_ROLL",
    ctaType: "WHATSAPP",
    ctaLabel: "",
    ctaUrl: "",
    country: "",
    city: "",
    area: "",
    propertyType: "",
    priceMin: "",
    priceMax: "",
  });
  const [editSaving, setEditSaving] = React.useState(false);

  const [mediaMode, setMediaMode] = React.useState<"upload" | "url">("url");
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    campaignId: "",
    type: "VIDEO" as "VIDEO" | "IMAGE",
    videoUrl: "",
    imageUrl: "",
    thumbnail: "",
    duration: 15,
    skipAfter: 5,
    placement: "PRE_ROLL",
    ctaType: "WHATSAPP",
    ctaLabel: "احصل على السعر النهائي",
    ctaUrl: "",
    country: "",
    city: "",
    area: "",
    propertyType: "",
    priceMin: "",
    priceMax: "",
  });

  const [mapValue, setMapValue] = React.useState<MapRadiusValue>(DEFAULT_MAP_RADIUS);
  const [includeMapMeta, setIncludeMapMeta] = React.useState(true);

  const revokePreview = React.useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [campaignsRes, adsRes, optRes] = await Promise.all([
        fetch("/api/studio/campaigns"),
        fetch("/api/studio/ads"),
        fetch("/api/listing-options", { cache: "no-store" }),
      ]);
      const cd = await campaignsRes.json().catch(() => ({}));
      const ad = await adsRes.json().catch(() => ({}));
      setCampaigns(cd.campaigns || []);
      setAds(ad.ads || []);
      if (optRes.ok) {
        const od = await optRes.json().catch(() => ({}));
        setCountries(od.countries || []);
        setPropertyTypes(od.propertyTypes || []);
      }
    } catch {
      setError("Could not load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const patchAd = React.useCallback(async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/studio/ads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof j.error === "string" ? j.error : "Update failed");
      return false;
    }
    setError(null);
    await load();
    return true;
  }, [load]);

  const openEditAd = React.useCallback((ad: AdRow) => {
    setEditingAd(ad);
    const t = ad.targeting;
    const pt = t?.propertyTypes?.[0] ?? "";
    setEditForm({
      type: (ad.type as "VIDEO" | "IMAGE") || "VIDEO",
      videoUrl: ad.videoUrl?.trim() ?? "",
      imageUrl: ad.imageUrl?.trim() ?? "",
      thumbnail: ad.thumbnail?.trim() ?? "",
      duration: ad.duration ?? 15,
      skipAfter: ad.skipAfter ?? 5,
      placement: ad.placement || "PRE_ROLL",
      ctaType: (ad.ctaType as string) || "WHATSAPP",
      ctaLabel: ad.ctaLabel ?? "",
      ctaUrl: ad.ctaUrl ?? "",
      country: t?.country ?? "",
      city: t?.city ?? "",
      area: t?.area ?? "",
      propertyType: pt,
      priceMin: t?.priceMin != null ? String(t.priceMin) : "",
      priceMax: t?.priceMax != null ? String(t.priceMax) : "",
    });
  }, []);

  const saveEditAd = React.useCallback(async () => {
    if (!editingAd) return;
    setEditSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/ads/${editingAd.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editForm.type,
          videoUrl: editForm.videoUrl.trim() || null,
          imageUrl: editForm.imageUrl.trim() || null,
          thumbnail: editForm.thumbnail.trim() || null,
          duration: editForm.duration,
          skipAfter: editForm.skipAfter,
          placement: editForm.placement,
          ctaType: editForm.ctaType,
          ctaLabel: editForm.ctaLabel,
          ctaUrl: editForm.ctaUrl.trim() || null,
          targeting: {
            country: editForm.country.trim(),
            city: editForm.city.trim(),
            area: editForm.area.trim(),
            propertyTypes: editForm.propertyType ? [editForm.propertyType] : [],
            priceMin: editForm.priceMin ? Number(editForm.priceMin) : null,
            priceMax: editForm.priceMax ? Number(editForm.priceMax) : null,
          },
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof j.error === "string" ? j.error : "Save failed");
      setEditingAd(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setEditSaving(false);
    }
  }, [editingAd, editForm, load]);

  const campaignsSelectable = React.useMemo(
    () => campaigns.filter((c) => c.status !== "DELETED" && c.status !== "ENDED"),
    [campaigns]
  );

  React.useEffect(() => () => revokePreview(), [revokePreview]);

  const cities = React.useMemo(() => {
    const c = countries.find((x) => x.key === form.country);
    return c?.governorates ?? [];
  }, [countries, form.country]);

  const editCities = React.useMemo(() => {
    const c = countries.find((x) => x.key === editForm.country);
    return c?.governorates ?? [];
  }, [countries, editForm.country]);

  const setMapValueStable = React.useCallback((v: MapRadiusValue) => {
    setMapValue(v);
  }, []);

  const applyPreviewFromForm = React.useCallback(() => {
    revokePreview();
    const url = form.type === "VIDEO" ? form.videoUrl.trim() : form.imageUrl.trim();
    if (url) setPreviewUrl(url);
  }, [form.type, form.videoUrl, form.imageUrl, revokePreview]);

  React.useEffect(() => {
    if (mediaMode === "url") {
      const url = form.type === "VIDEO" ? form.videoUrl.trim() : form.imageUrl.trim();
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        setPreviewUrl(url);
      } else if (!url) {
        revokePreview();
      }
    }
  }, [form.videoUrl, form.imageUrl, form.type, mediaMode, revokePreview]);

  const uploadFile = async (file: File, role: "video" | "image") => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      if (role === "video") {
        fd.append("video", file);
      } else {
        fd.append("thumbnail", file);
      }
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; thumbnailUrl?: string; error?: string };
      const detail = (data as { detail?: string }).detail;
      if (!res.ok) throw new Error([data.error || "Upload failed", detail].filter(Boolean).join(": "));
      if (role === "video" && data.url) {
        setForm((s) => ({ ...s, videoUrl: data.url! }));
        setPreviewUrl(data.url);
      }
      if (role === "image" && data.thumbnailUrl) {
        setForm((s) => ({ ...s, imageUrl: data.thumbnailUrl! }));
        setPreviewUrl(data.thumbnailUrl);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    revokePreview();
    const blob = URL.createObjectURL(file);
    setPreviewUrl(blob);
    if (form.type === "VIDEO") {
      void uploadFile(file, "video");
    } else {
      void uploadFile(file, "image");
    }
  };

  const submit = async () => {
    if (!form.campaignId.trim()) {
      setError("Select a campaign.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const userIntent =
        includeMapMeta
          ? JSON.stringify({
              geoTarget: { lat: mapValue.lat, lng: mapValue.lng, radiusKm: mapValue.radiusKm },
            })
          : undefined;
      const res = await fetch("/api/studio/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: form.campaignId,
          type: form.type,
          videoUrl: form.videoUrl.trim() || null,
          imageUrl: form.imageUrl.trim() || null,
          thumbnail: form.thumbnail.trim() || null,
          duration: Number(form.duration),
          skipAfter: Number(form.skipAfter),
          placement: form.placement,
          ctaType: form.ctaType,
          ctaLabel: form.ctaLabel,
          ctaUrl: form.ctaUrl.trim() || null,
          targeting: {
            country: form.country.trim(),
            city: form.city.trim(),
            area: form.area.trim(),
            propertyTypes: form.propertyType ? [form.propertyType] : [],
            priceMin: form.priceMin ? Number(form.priceMin) : undefined,
            priceMax: form.priceMax ? Number(form.priceMax) : undefined,
            ...(userIntent ? { userIntent } : {}),
          },
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Publish failed");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <StudioAdsPageHeader
        segment="ads"
        title="Ads"
        subtitle="Create and review video ads with targeting similar to professional ad tools — same APIs, clearer layout."
      />

      {error ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-indigo-400" aria-hidden />
            <h2 className="text-lg font-semibold">New ad</h2>
          </div>
          <LocaleLink
            href="/studio/campaigns"
            className="text-sm font-medium text-indigo-300 hover:text-indigo-200"
          >
            Manage campaigns →
          </LocaleLink>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/70">Campaign</label>
              <select
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none ring-indigo-500/0 transition focus:ring-2"
                value={form.campaignId}
                onChange={(e) => setForm((s) => ({ ...s, campaignId: e.target.value }))}
              >
                <option value="">Select campaign</option>
                {campaignsSelectable.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.status && c.status !== "ACTIVE" ? ` (${c.status})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/70">Creative type</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                  value={form.type}
                  onChange={(e) => {
                    const t = e.target.value as "VIDEO" | "IMAGE";
                    setForm((s) => ({ ...s, type: t }));
                    revokePreview();
                  }}
                >
                  <option value="VIDEO">Video</option>
                  <option value="IMAGE">Image</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/70">Placement</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                  value={form.placement}
                  onChange={(e) => setForm((s) => ({ ...s, placement: e.target.value }))}
                >
                  <option value="PRE_ROLL">Pre-roll</option>
                  <option value="MID_ROLL">Mid-roll</option>
                </select>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-white/70">Media</p>
              <div className="mb-3 inline-flex rounded-xl border border-white/10 bg-black/20 p-1">
                <button
                  type="button"
                  onClick={() => setMediaMode("upload")}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    mediaMode === "upload" ? "bg-indigo-600 text-white shadow" : "text-white/65 hover:text-white"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden />
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaMode("url");
                    revokePreview();
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                    mediaMode === "url" ? "bg-indigo-600 text-white shadow" : "text-white/65 hover:text-white"
                  }`}
                >
                  <Link2 className="h-3.5 w-3.5" aria-hidden />
                  External URL
                </button>
              </div>

              {mediaMode === "upload" ? (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-black/25 px-4 py-8 text-center transition hover:border-indigo-400/40 hover:bg-black/35">
                  <input type="file" className="hidden" accept={form.type === "VIDEO" ? "video/mp4,video/*" : "image/*"} onChange={onPickFile} />
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                  ) : form.type === "VIDEO" ? (
                    <Film className="h-8 w-8 text-white/40" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-white/40" />
                  )}
                  <span className="text-sm text-white/80">
                    {form.type === "VIDEO" ? "Drop or click to upload MP4" : "Drop or click to upload image"}
                  </span>
                  <span className="text-xs text-white/45">Uses your existing Cloudinary upload (agent/agency).</span>
                </label>
              ) : (
                <div className="space-y-3">
                  {form.type === "VIDEO" ? (
                    <div>
                      <label className="mb-1.5 block text-xs text-white/60">Video URL — direct link to MP4 or stream</label>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/35"
                        placeholder="https://…"
                        value={form.videoUrl}
                        onChange={(e) => setForm((s) => ({ ...s, videoUrl: e.target.value }))}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1.5 block text-xs text-white/60">Image URL — full creative</label>
                      <input
                        className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/35"
                        placeholder="https://…"
                        value={form.imageUrl}
                        onChange={(e) => setForm((s) => ({ ...s, imageUrl: e.target.value }))}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => applyPreviewFromForm()}
                    className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
                  >
                    Refresh preview from URL
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/70">Thumbnail URL (optional)</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/35"
                placeholder="https://…"
                value={form.thumbnail}
                onChange={(e) => setForm((s) => ({ ...s, thumbnail: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/70">Duration (seconds)</label>
                <p className="mb-1 text-[11px] text-white/45">Length of the ad creative playback.</p>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                  value={form.duration}
                  onChange={(e) => setForm((s) => ({ ...s, duration: Number(e.target.value) || 15 }))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/70">Skip after (seconds)</label>
                <p className="mb-1 text-[11px] text-white/45">When viewers may skip (e.g. 5 = after 5s).</p>
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                  value={form.skipAfter}
                  onChange={(e) => setForm((s) => ({ ...s, skipAfter: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/70">CTA type</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                  value={form.ctaType}
                  onChange={(e) => setForm((s) => ({ ...s, ctaType: e.target.value }))}
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="CALL">Call</option>
                  <option value="BOOK_VISIT">Book visit</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/70">CTA label</label>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                  value={form.ctaLabel}
                  onChange={(e) => setForm((s) => ({ ...s, ctaLabel: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/70">CTA URL</label>
              <input
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/35"
                placeholder="https://wa.me/…"
                value={form.ctaUrl}
                onChange={(e) => setForm((s) => ({ ...s, ctaUrl: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-medium text-white/70">Live preview</p>
              <p className="mt-1 text-[11px] text-white/45">Updates when you upload or paste a valid URL.</p>
              <div className="mt-4 aspect-video overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
                {!previewUrl ? (
                  <div className="flex h-full items-center justify-center text-sm text-white/40">No preview yet</div>
                ) : form.type === "VIDEO" ? (
                  <video key={previewUrl} src={previewUrl} className="h-full w-full object-contain" controls muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- dynamic blob/external URLs
                  <img src={previewUrl} alt="Creative preview" className="h-full w-full object-contain" />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-white">Targeting</h3>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/70">Country</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                  value={form.country}
                  onChange={(e) => setForm((s) => ({ ...s, country: e.target.value, city: "" }))}
                >
                  <option value="">Select country</option>
                  {countries.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.labelEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/70">City / governorate</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white disabled:opacity-45"
                  disabled={!form.country}
                  value={form.city}
                  onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
                >
                  <option value="">{form.country ? "Select city" : "Choose country first"}</option>
                  {cities.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.labelEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/70">Area / neighborhood</label>
                <p className="mb-1 text-[11px] text-white/45">Must match listing text exactly for delivery.</p>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/35"
                  placeholder="e.g. Hadayek Al Ahram"
                  value={form.area}
                  onChange={(e) => setForm((s) => ({ ...s, area: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/70">Property type</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                  value={form.propertyType}
                  onChange={(e) => setForm((s) => ({ ...s, propertyType: e.target.value }))}
                >
                  <option value="">Any (no filter)</option>
                  {propertyTypes.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.labelEn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/70">Min price (optional)</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                    inputMode="decimal"
                    value={form.priceMin}
                    onChange={(e) => setForm((s) => ({ ...s, priceMin: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/70">Max price (optional)</label>
                  <input
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
                    inputMode="decimal"
                    value={form.priceMax}
                    onChange={(e) => setForm((s) => ({ ...s, priceMax: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={includeMapMeta}
              onChange={(e) => setIncludeMapMeta(e.target.checked)}
              className="rounded border-white/30 bg-black/40 text-indigo-600 focus:ring-indigo-500"
            />
            Save map pin & radius with this ad (stored as metadata)
          </label>
          <MapRadiusPicker value={mapValue} onChange={setMapValueStable} />
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save ad (draft)
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Your ads</h2>
        <p className="mt-1 text-sm text-white/55">
          Lifecycle controls below. Delivery only when ad and campaign are ACTIVE and budget remains.
        </p>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : ads.length === 0 ? (
          <p className="mt-6 text-sm text-white/50">No ads yet. Publish your first ad above.</p>
        ) : (
          <>
            <div className="mt-6 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px] border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr className="text-xs font-medium uppercase tracking-wide text-white/45">
                    <th className="border-b border-white/10 px-3 py-3">Ad</th>
                    <th className="border-b border-white/10 px-3 py-3">Campaign</th>
                    <th className="border-b border-white/10 px-3 py-3">Placement</th>
                    <th className="border-b border-white/10 px-3 py-3">Status</th>
                    <th className="border-b border-white/10 px-3 py-3 text-right">Impr.</th>
                    <th className="border-b border-white/10 px-3 py-3 text-right">Clicks</th>
                    <th className="border-b border-white/10 px-3 py-3 text-right">CTR</th>
                    <th className="border-b border-white/10 px-3 py-3 text-right">Budget</th>
                    <th className="border-b border-white/10 px-3 py-3 text-right">Remaining</th>
                    <th className="border-b border-white/10 px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((a) => {
                    const impr = n(a.performance?.impressions);
                    const clk = n(a.performance?.clicks);
                    const ctr = ctrPct(impr, clk);
                    const bud = n(a.campaign?.budget);
                    const spent = n(a.campaign?.spent);
                    const rem = Math.max(0, bud - spent);
                    return (
                      <tr key={a.id} className="text-white/90">
                        <td className="border-b border-white/5 px-3 py-3 font-mono text-xs text-white/70">{a.id.slice(0, 8)}…</td>
                        <td className="border-b border-white/5 px-3 py-3">
                          <div>{a.campaign?.name ?? "—"}</div>
                          {a.campaign?.status ? (
                            <div className="mt-1">
                              <AdsLifecycleBadge status={a.campaign.status} />
                            </div>
                          ) : null}
                        </td>
                        <td className="border-b border-white/5 px-3 py-3">{a.placement}</td>
                        <td className="border-b border-white/5 px-3 py-3">
                          <AdsLifecycleBadge status={a.status} />
                        </td>
                        <td className="border-b border-white/5 px-3 py-3 text-right tabular-nums">{formatInt(impr)}</td>
                        <td className="border-b border-white/5 px-3 py-3 text-right tabular-nums">{formatInt(clk)}</td>
                        <td className="border-b border-white/5 px-3 py-3 text-right tabular-nums text-emerald-300/90">
                          {formatPct(ctr)}
                        </td>
                        <td className="border-b border-white/5 px-3 py-3 text-right tabular-nums text-white/80">
                          {formatInt(bud)}
                        </td>
                        <td className="border-b border-white/5 px-3 py-3 text-right tabular-nums text-indigo-200/90">
                          {formatInt(rem)}
                        </td>
                        <td className="border-b border-white/5 px-3 py-3 align-top">
                          <AdToolbar
                            ad={a}
                            patchAd={patchAd}
                            onEdit={() => openEditAd(a)}
                            setConfirmDelete={setConfirmDeleteAdId}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-3 md:hidden">
              {ads.map((a) => {
                const impr = n(a.performance?.impressions);
                const clk = n(a.performance?.clicks);
                const ctr = ctrPct(impr, clk);
                const bud = n(a.campaign?.budget);
                const spent = n(a.campaign?.spent);
                const rem = Math.max(0, bud - spent);
                const pct = bud > 0 ? Math.min(100, (spent / bud) * 100) : 0;
                return (
                  <div key={a.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-white/55">{a.id.slice(0, 10)}…</p>
                        <p className="mt-1 font-medium text-white">{a.campaign?.name ?? "Campaign"}</p>
                        <p className="mt-1 text-xs text-white/45">{a.placement}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <AdsLifecycleBadge status={a.status} />
                          {a.campaign?.status ? <AdsLifecycleBadge status={a.campaign.status} /> : null}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-200">
                        CTR {formatPct(ctr)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <AdToolbar
                        ad={a}
                        patchAd={patchAd}
                        onEdit={() => openEditAd(a)}
                        setConfirmDelete={setConfirmDeleteAdId}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-[10px] uppercase text-white/45">Impressions</p>
                        <p className="tabular-nums text-white">{formatInt(impr)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-white/45">Clicks</p>
                        <p className="tabular-nums text-white">{formatInt(clk)}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-white/55">
                        <span>Budget use</span>
                        <span className="tabular-nums">
                          {formatInt(spent)} / {formatInt(bud)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-indigo-200/90">Remaining: {formatInt(rem)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <StudioConfirmDialog
        open={confirmDeleteAdId !== null}
        title="Delete this ad?"
        message="The ad will be soft-deleted (status DELETED). Historical performance stays in the database."
        confirmLabel="Delete ad"
        danger
        onCancel={() => setConfirmDeleteAdId(null)}
        onConfirm={() => {
          const id = confirmDeleteAdId;
          if (!id) return;
          void (async () => {
            await patchAd(id, { status: "DELETED" });
            setConfirmDeleteAdId(null);
          })();
        }}
      />

      {editingAd ? (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center overflow-y-auto bg-black/80 p-4 py-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ad-edit-title"
        >
          <div className="my-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl">
            <h3 id="ad-edit-title" className="text-lg font-semibold text-white">
              Edit ad
            </h3>
            <p className="mt-1 text-sm text-white/55">Media, targeting, and CTA. Budget is set on the campaign.</p>
            <div className="mt-4 grid max-h-[70vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
              <div className="space-y-3">
                <label className="block text-xs text-white/65">
                  Type
                  <select
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={editForm.type}
                    onChange={(e) =>
                      setEditForm((s) => ({ ...s, type: e.target.value as "VIDEO" | "IMAGE" }))
                    }
                  >
                    <option value="VIDEO">Video</option>
                    <option value="IMAGE">Image</option>
                  </select>
                </label>
                <label className="block text-xs text-white/65">
                  Placement
                  <select
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={editForm.placement}
                    onChange={(e) => setEditForm((s) => ({ ...s, placement: e.target.value }))}
                  >
                    <option value="PRE_ROLL">Pre-roll</option>
                    <option value="MID_ROLL">Mid-roll</option>
                  </select>
                </label>
                {editForm.type === "VIDEO" ? (
                  <label className="block text-xs text-white/65">
                    Video URL
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                      value={editForm.videoUrl}
                      onChange={(e) => setEditForm((s) => ({ ...s, videoUrl: e.target.value }))}
                    />
                  </label>
                ) : (
                  <label className="block text-xs text-white/65">
                    Image URL
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                      value={editForm.imageUrl}
                      onChange={(e) => setEditForm((s) => ({ ...s, imageUrl: e.target.value }))}
                    />
                  </label>
                )}
                <label className="block text-xs text-white/65">
                  Thumbnail URL
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={editForm.thumbnail}
                    onChange={(e) => setEditForm((s) => ({ ...s, thumbnail: e.target.value }))}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs text-white/65">
                    Duration (s)
                    <input
                      type="number"
                      min={1}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                      value={editForm.duration}
                      onChange={(e) =>
                        setEditForm((s) => ({ ...s, duration: Number(e.target.value) || 15 }))
                      }
                    />
                  </label>
                  <label className="block text-xs text-white/65">
                    Skip after (s)
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                      value={editForm.skipAfter}
                      onChange={(e) =>
                        setEditForm((s) => ({ ...s, skipAfter: Number(e.target.value) || 0 }))
                      }
                    />
                  </label>
                </div>
                <label className="block text-xs text-white/65">
                  CTA type
                  <select
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={editForm.ctaType}
                    onChange={(e) => setEditForm((s) => ({ ...s, ctaType: e.target.value }))}
                  >
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="CALL">Call</option>
                    <option value="BOOK_VISIT">Book visit</option>
                  </select>
                </label>
                <label className="block text-xs text-white/65">
                  CTA label
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={editForm.ctaLabel}
                    onChange={(e) => setEditForm((s) => ({ ...s, ctaLabel: e.target.value }))}
                  />
                </label>
                <label className="block text-xs text-white/65">
                  CTA URL
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={editForm.ctaUrl}
                    onChange={(e) => setEditForm((s) => ({ ...s, ctaUrl: e.target.value }))}
                  />
                </label>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-white">Targeting</p>
                <label className="block text-xs text-white/65">
                  Country
                  <select
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={editForm.country}
                    onChange={(e) =>
                      setEditForm((s) => ({ ...s, country: e.target.value, city: "" }))
                    }
                  >
                    <option value="">Select</option>
                    {countries.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.labelEn}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-white/65">
                  City
                  <select
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    disabled={!editForm.country}
                    value={editForm.city}
                    onChange={(e) => setEditForm((s) => ({ ...s, city: e.target.value }))}
                  >
                    <option value="">{editForm.country ? "Select city" : "Country first"}</option>
                    {editCities.map((g) => (
                      <option key={g.key} value={g.key}>
                        {g.labelEn}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-white/65">
                  Area
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={editForm.area}
                    onChange={(e) => setEditForm((s) => ({ ...s, area: e.target.value }))}
                  />
                </label>
                <label className="block text-xs text-white/65">
                  Property type
                  <select
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                    value={editForm.propertyType}
                    onChange={(e) => setEditForm((s) => ({ ...s, propertyType: e.target.value }))}
                  >
                    <option value="">Any</option>
                    {propertyTypes.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.labelEn}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs text-white/65">
                    Min price
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                      value={editForm.priceMin}
                      onChange={(e) => setEditForm((s) => ({ ...s, priceMin: e.target.value }))}
                    />
                  </label>
                  <label className="block text-xs text-white/65">
                    Max price
                    <input
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                      value={editForm.priceMax}
                      onChange={(e) => setEditForm((s) => ({ ...s, priceMax: e.target.value }))}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5"
                onClick={() => setEditingAd(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                onClick={() => void saveEditAd()}
              >
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
