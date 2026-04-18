"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { StudioAdsPageHeader } from "@/components/studio/ads/StudioAdsBreadcrumb";
import { cloudinaryUnsignedUpload } from "@/lib/ads-client/cloudinary-unsigned-upload";
import { parseResponseJson } from "@/lib/ads-client/safe-json";

type CampaignOpt = { id: string; name: string; status?: string };
type MediaKind = "VIDEO" | "IMAGE";

type PerformanceRow = {
  impressions?: number;
  views?: number;
  clicks?: number;
  leads?: number;
};

type UserAdRow = {
  id: string;
  mediaType?: MediaKind;
  videoUrl?: string | null;
  imageUrl?: string | null;
  thumbnail?: string | null;
  ctaType?: string;
  ctaLabel?: string | null;
  type: string;
  skippable: boolean;
  skipAfterSeconds: number;
  active: boolean;
  targetVideoId: string | null;
  campaignId: string | null;
  campaign?: { id: string; name: string; status: string } | null;
  performance?: PerformanceRow | null;
};

export default function StudioAdsPage() {
  const [ads, setAds] = React.useState<UserAdRow[]>([]);
  const [campaigns, setCampaigns] = React.useState<CampaignOpt[]>([]);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const [campaignId, setCampaignId] = React.useState("");
  const [mediaType, setMediaType] = React.useState<MediaKind>("VIDEO");
  const [mediaSource, setMediaSource] = React.useState<"url" | "upload">("url");
  const [videoUrl, setVideoUrl] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  /** Last successful unsigned upload URL (mirrors videoUrl or imageUrl for display). */
  const [mediaUrl, setMediaUrl] = React.useState("");
  const [uploadBusy, setUploadBusy] = React.useState(false);
  const [slot, setSlot] = React.useState<"PRE_ROLL" | "MID_ROLL">("PRE_ROLL");
  const [targetVideoId, setTargetVideoId] = React.useState("");
  const [skippable, setSkippable] = React.useState(true);
  const [skipAfter, setSkipAfter] = React.useState("5");
  const [ctaType, setCtaType] = React.useState<"WHATSAPP" | "CALL" | "BOOK_VISIT">("WHATSAPP");
  const [ctaLabel, setCtaLabel] = React.useState("احصل على السعر النهائي");
  const [ctaUrl, setCtaUrl] = React.useState("");
  const [countries, setCountries] = React.useState("");
  const [cities, setCities] = React.useState("");
  const [propertyTypes, setPropertyTypes] = React.useState("");
  const [priceMin, setPriceMin] = React.useState("");
  const [priceMax, setPriceMax] = React.useState("");
  const [userIntent, setUserIntent] = React.useState<"" | "BUY" | "RENT" | "INVEST">("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [adRes, campRes] = await Promise.all([
        fetch("/api/studio/ads", { credentials: "include", cache: "no-store" }),
        fetch("/api/studio/campaigns", { credentials: "include", cache: "no-store" }),
      ]);
      const adJson = await parseResponseJson(adRes, {} as { ads?: UserAdRow[]; notice?: string; error?: string });
      const campJson = await parseResponseJson(campRes, { campaigns: [] as CampaignOpt[] });
      if (!adRes.ok) throw new Error(adJson.error || "Failed to load ads.");
      setAds(adJson.ads ?? []);
      setNotice(adJson.notice ?? null);
      if (campRes.ok) {
        setCampaigns(campJson.campaigns ?? []);
      } else {
        setCampaigns([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const selectableCampaigns = React.useMemo(
    () => campaigns.filter((c) => c.status !== "DELETED"),
    [campaigns]
  );

  React.useEffect(() => {
    if (!campaignId) return;
    const stillValid = selectableCampaigns.some((c) => c.id === campaignId);
    if (!stillValid) setCampaignId("");
  }, [campaignId, selectableCampaigns]);

  const uploadCreativeFile = async (file: File) => {
    setUploadBusy(true);
    setError("");
    try {
      const { resourceType, secure_url } = await cloudinaryUnsignedUpload(file);
      setMediaUrl(secure_url);
      if (resourceType === "video") {
        setMediaType("VIDEO");
        setVideoUrl(secure_url);
        setImageUrl("");
      } else {
        setMediaType("IMAGE");
        setImageUrl(secure_url);
        setVideoUrl("");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed.";
      console.error("[studio/ads] Cloudinary unsigned upload failed:", e);
      setError(msg);
      window.alert(msg);
    } finally {
      setUploadBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/studio/ads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaignId.trim(),
          mediaType,
          videoUrl: mediaType === "VIDEO" ? videoUrl.trim() : undefined,
          imageUrl: mediaType === "IMAGE" ? imageUrl.trim() : undefined,
          type: slot,
          targetVideoId: targetVideoId.trim() || null,
          skippable,
          skipAfterSeconds: Number(skipAfter) || 5,
          active: true,
          ctaType,
          ctaLabel: ctaLabel.trim() || undefined,
          ctaUrl: ctaUrl.trim() || null,
          targeting: {
            countries: countries.split(/[,;]/).map((s) => s.trim()).filter(Boolean),
            cities: cities.split(/[,;]/).map((s) => s.trim()).filter(Boolean),
            propertyTypes: propertyTypes.split(/[,;]/).map((s) => s.trim()).filter(Boolean),
            priceMin: priceMin.trim() || null,
            priceMax: priceMax.trim() || null,
            userIntent: userIntent || null,
          },
        }),
      });
      const j = await parseResponseJson(res, {} as { error?: string });
      if (!res.ok) throw new Error(j.error || "Create failed.");
      setVideoUrl("");
      setImageUrl("");
      setMediaUrl("");
      setTargetVideoId("");
      setCountries("");
      setCities("");
      setPropertyTypes("");
      setPriceMin("");
      setPriceMax("");
      setUserIntent("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (row: UserAdRow) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/studio/ads/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !row.active }),
      });
      const j = await parseResponseJson(res, {} as { error?: string });
      if (!res.ok) throw new Error(j.error || "Update failed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this ad?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/studio/ads/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = await parseResponseJson(res, {} as { error?: string });
      if (!res.ok) throw new Error(j.error || "Delete failed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const hasCreativeUrl = mediaType === "VIDEO" ? Boolean(videoUrl.trim()) : Boolean(imageUrl.trim());
  const createDisabled = busy || uploadBusy || !campaignId.trim() || !hasCreativeUrl;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 text-white">
      <StudioAdsPageHeader
        segment="ads"
        title="Ads"
        subtitle="Create campaigns-backed creatives with geo and listing targeting. Delivery runs on watch with pre-roll and mid-roll."
      />

      {notice ? <p className="mt-3 text-sm text-amber-200/90">{notice}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      <div className="mt-8 space-y-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold text-white/90">New ad</h2>
          <p className="mt-1 text-xs text-white/50">
            Link an ACTIVE campaign with budget. Narrow targeting to match listing country, city, type, and price. Leave
            targeting empty to run broadly on matched inventory.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-white/60 sm:col-span-2">
              Campaign
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="">
                  {selectableCampaigns.length === 0
                    ? "No campaigns — create one under Campaigns"
                    : "Select…"}
                </option>
                {selectableCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.status})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-white/60 sm:col-span-2">
              Creative type
              <select
                value={mediaType}
                onChange={(e) => {
                  const v = e.target.value as MediaKind;
                  setMediaType(v);
                  setVideoUrl("");
                  setImageUrl("");
                  setMediaUrl("");
                }}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="VIDEO">Video (MP4)</option>
                <option value="IMAGE">Image (JPEG / PNG)</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              <p className="text-xs text-white/55">Media source</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMediaSource("upload");
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    mediaSource === "upload"
                      ? "border-indigo-400 bg-indigo-600/30 text-white"
                      : "border-white/15 text-white/75 hover:bg-white/5"
                  }`}
                >
                  Upload file
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaSource("url");
                    setMediaUrl("");
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    mediaSource === "url"
                      ? "border-indigo-400 bg-indigo-600/30 text-white"
                      : "border-white/15 text-white/75 hover:bg-white/5"
                  }`}
                >
                  Use URL
                </button>
              </div>
            </div>
            {mediaSource === "upload" ? (
              <label className="block text-xs text-white/60 sm:col-span-2">
                Video or image file
                <input
                  key={`${mediaSource}`}
                  type="file"
                  accept="video/*,image/*"
                  disabled={uploadBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void uploadCreativeFile(f);
                  }}
                  className="mt-1 block w-full text-sm text-white/90 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-indigo-500 disabled:opacity-40"
                />
                <p className="mt-1 text-[11px] text-white/40">
                  Unsigned upload to Cloudinary (default preset <span className="font-mono">real_estate_unsigned</span>; override
                  with <span className="font-mono">NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET</span>). Set{" "}
                  <span className="font-mono">NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</span>. Creative type follows the file you pick.
                </p>
                {uploadBusy ? (
                  <p className="mt-1 flex items-center gap-2 text-xs text-white/55">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    Uploading…
                  </p>
                ) : null}
                {mediaUrl ? (
                  <p className="mt-2 truncate text-[11px] text-emerald-200/90" title={mediaUrl}>
                    Ready ({mediaType}): {mediaUrl.slice(0, 80)}
                    {mediaUrl.length > 80 ? "…" : ""}
                  </p>
                ) : null}
              </label>
            ) : mediaType === "VIDEO" ? (
              <label className="block text-xs text-white/60 sm:col-span-2">
                Video URL
                <input
                  value={videoUrl}
                  onChange={(e) => {
                    setMediaUrl("");
                    setVideoUrl(e.target.value);
                  }}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                  placeholder="https://…/promo.mp4"
                />
              </label>
            ) : (
              <label className="block text-xs text-white/60 sm:col-span-2">
                Image URL
                <input
                  value={imageUrl}
                  onChange={(e) => {
                    setMediaUrl("");
                    setImageUrl(e.target.value);
                  }}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                  placeholder="https://…/banner.jpg"
                />
              </label>
            )}
            <label className="block text-xs text-white/60">
              Slot
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value as "PRE_ROLL" | "MID_ROLL")}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="PRE_ROLL">Pre-roll</option>
                <option value="MID_ROLL">Mid-roll</option>
              </select>
            </label>
            <label className="block text-xs text-white/60">
              Listing video id (optional)
              <input
                value={targetVideoId}
                onChange={(e) => setTargetVideoId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                placeholder="cuid…"
              />
            </label>
            <label className="block text-xs text-white/60 sm:col-span-2">
              Countries (comma-separated; empty = all)
              <input
                value={countries}
                onChange={(e) => setCountries(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-white/60 sm:col-span-2">
              Cities (comma-separated)
              <input
                value={cities}
                onChange={(e) => setCities(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-white/60 sm:col-span-2">
              Property types (e.g. APARTMENT, VILLA)
              <input
                value={propertyTypes}
                onChange={(e) => setPropertyTypes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-white/60">
              Price min
              <input
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-white/60">
              Price max
              <input
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-white/60 sm:col-span-2">
              Audience intent
              <select
                value={userIntent}
                onChange={(e) => setUserIntent(e.target.value as typeof userIntent)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="">Any</option>
                <option value="BUY">Buy</option>
                <option value="RENT">Rent</option>
                <option value="INVEST">Invest</option>
              </select>
            </label>
            <label className="block text-xs text-white/60">
              CTA type
              <select
                value={ctaType}
                onChange={(e) => setCtaType(e.target.value as typeof ctaType)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="CALL">Call</option>
                <option value="BOOK_VISIT">Book visit</option>
              </select>
            </label>
            <label className="block text-xs text-white/60">
              CTA label
              <input
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-white/60 sm:col-span-2">
              CTA URL (optional — deep link or wa.me)
              <input
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-white/80">
              <input type="checkbox" checked={skippable} onChange={(e) => setSkippable(e.target.checked)} />
              Skippable
            </label>
            <label className="block text-xs text-white/60">
              Skip after (seconds)
              <input
                value={skipAfter}
                onChange={(e) => setSkipAfter(e.target.value)}
                disabled={!skippable}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white disabled:opacity-40"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={createDisabled}
            onClick={() => void submit()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Publish ad
          </button>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-white/90">Your ads</h2>
          {loading ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-white/55">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : ads.length === 0 ? (
            <p className="mt-3 text-sm text-white/55">No ads yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {ads.map((a) => (
                <li key={a.id} className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                  <p className="font-mono text-[11px] text-white/45">{a.id}</p>
                  <p className="text-xs text-indigo-300/90">
                    {a.mediaType === "IMAGE" ? "Image" : "Video"} · {a.type}
                  </p>
                  <p className="truncate text-white/90">{a.mediaType === "IMAGE" ? a.imageUrl : a.videoUrl}</p>
                  <p className="mt-1 text-xs text-white/55">
                    impr {a.performance?.impressions ?? 0} · views {a.performance?.views ?? 0} · clicks{" "}
                    {a.performance?.clicks ?? 0} · leads {a.performance?.leads ?? 0}
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    {a.skippable ? `skip ${a.skipAfterSeconds}s` : "non-skippable"} ·{" "}
                    {a.targetVideoId ? `listing ${a.targetVideoId}` : "all your listings"} · {a.campaign?.name ?? a.campaignId}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleActive(a)}
                      className="rounded-lg border border-white/20 px-2 py-1 text-xs"
                    >
                      {a.active ? "Pause" : "Activate"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(a.id)}
                      className="rounded-lg border border-rose-500/40 px-2 py-1 text-xs text-rose-200"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
