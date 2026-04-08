"use client";

import * as React from "react";
import { Pencil, Trash2, PauseCircle, Plus, Loader2 } from "lucide-react";

type ListingGov = { key: string; labelEn: string; labelAr: string };
type ListingCountry = {
  key: string;
  labelEn: string;
  labelAr: string;
  governorates: ListingGov[];
};
type ListingPT = { slug: string; labelEn: string; labelAr: string };

type AdminAdRow = {
  id: string;
  campaignId: string;
  type: "VIDEO" | "IMAGE";
  videoUrl: string | null;
  imageUrl: string | null;
  thumbnail: string | null;
  duration: number;
  skipAfter: number;
  ctaType: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  status: string;
  placement: string;
  createdAt: string;
  campaign: {
    id: string;
    name: string;
    status: string;
    budget: string | null;
    dailyBudget: string | null;
    spent: string | null;
    bidWeight: number;
    advertiserName: string;
    advertiserEmail: string | null;
  };
  targeting: {
    country: string;
    city: string;
    area: string;
    propertyTypes: string[];
    priceMin: string | null;
    priceMax: string | null;
  } | null;
  performance: { impressions: number; views: number; clicks: number; leads: number } | null;
};

type AdminCampaignOption = {
  id: string;
  name: string;
  status: string;
  budget: string | null;
  dailyBudget: string | null;
  advertiserName: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function numOrEmpty(v: string) {
  const t = v.trim();
  if (!t) return "";
  const n = Number(t);
  return Number.isFinite(n) ? String(n) : "";
}

type FormFields = {
  campaignId: string;
  type: "VIDEO" | "IMAGE";
  videoUrl: string;
  imageUrl: string;
  thumbnail: string;
  duration: string;
  skipAfter: string;
  placement: "PRE_ROLL" | "MID_ROLL";
  ctaType: "CALL" | "WHATSAPP" | "BOOK_VISIT";
  ctaLabel: string;
  ctaUrl: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED" | "DELETED";
  country: string;
  city: string;
  area: string;
  propertyTypeSlug: string;
  priceMin: string;
  priceMax: string;
  campaignBudget: string;
  campaignDailyBudget: string;
  bidWeight: string;
};

const emptyForm = (): FormFields => ({
  campaignId: "",
  type: "VIDEO",
  videoUrl: "",
  imageUrl: "",
  thumbnail: "",
  duration: "15",
  skipAfter: "5",
  placement: "PRE_ROLL",
  ctaType: "WHATSAPP",
  ctaLabel: "",
  ctaUrl: "",
  status: "ACTIVE",
  country: "",
  city: "",
  area: "",
  propertyTypeSlug: "",
  priceMin: "",
  priceMax: "",
  campaignBudget: "",
  campaignDailyBudget: "",
  bidWeight: "",
});

function adToForm(ad: AdminAdRow, campaigns: AdminCampaignOption[]): FormFields {
  const camp = campaigns.find((c) => c.id === ad.campaignId);
  const t = ad.targeting;
  const pt = t?.propertyTypes?.[0] ?? "";
  return {
    campaignId: ad.campaignId,
    type: ad.type,
    videoUrl: ad.videoUrl ?? "",
    imageUrl: ad.imageUrl ?? "",
    thumbnail: ad.thumbnail ?? "",
    duration: String(ad.duration),
    skipAfter: String(ad.skipAfter),
    placement: ad.placement as FormFields["placement"],
    ctaType: ad.ctaType as FormFields["ctaType"],
    ctaLabel: ad.ctaLabel ?? "",
    ctaUrl: ad.ctaUrl ?? "",
    status: ad.status as FormFields["status"],
    country: t?.country ?? "",
    city: t?.city ?? "",
    area: t?.area ?? "",
    propertyTypeSlug: pt,
    priceMin: t?.priceMin ?? "",
    priceMax: t?.priceMax ?? "",
    campaignBudget: ad.campaign.budget ?? camp?.budget ?? "",
    campaignDailyBudget: ad.campaign.dailyBudget ?? camp?.dailyBudget ?? "",
    bidWeight: String(ad.campaign.bidWeight ?? 1),
  };
}

function FieldLabel({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="block text-xs font-medium text-white/80 mb-1.5 leading-snug">
      {children}
    </label>
  );
}

export default function AdsManager() {
  const [ads, setAds] = React.useState<AdminAdRow[]>([]);
  const [campaigns, setCampaigns] = React.useState<AdminCampaignOption[]>([]);
  const [countries, setCountries] = React.useState<ListingCountry[]>([]);
  const [propertyTypes, setPropertyTypes] = React.useState<ListingPT[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busyId, setBusyId] = React.useState<string>("");
  const [createBusy, setCreateBusy] = React.useState(false);

  const [createForm, setCreateForm] = React.useState<FormFields>(emptyForm);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<FormFields | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [adsRes, optRes] = await Promise.all([
        fetch("/api/admin/ads", { credentials: "include", cache: "no-store" }),
        fetch("/api/listing-options", { cache: "no-store" }),
      ]);
      const adsJson = (await adsRes.json()) as { ads?: AdminAdRow[]; campaigns?: AdminCampaignOption[]; error?: string };
      if (!adsRes.ok) throw new Error(adsJson.error || "Failed to load ads.");
      setAds(adsJson.ads ?? []);
      setCampaigns(adsJson.campaigns ?? []);

      const optJson = (await optRes.json()) as {
        countries?: ListingCountry[];
        propertyTypes?: ListingPT[];
        error?: string;
      };
      if (optRes.ok) {
        setCountries(optJson.countries ?? []);
        setPropertyTypes(optJson.propertyTypes ?? []);
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

  const citiesFor = React.useCallback(
    (countryKey: string) => countries.find((c) => c.key === countryKey)?.governorates ?? [],
    [countries]
  );

  const buildTargetingPayload = (f: FormFields) => ({
    country: f.country.trim(),
    city: f.city.trim(),
    area: f.area.trim(),
    propertyTypes: f.propertyTypeSlug.trim() ? [f.propertyTypeSlug.trim()] : [],
    priceMin: numOrEmpty(f.priceMin) === "" ? null : Number(f.priceMin),
    priceMax: numOrEmpty(f.priceMax) === "" ? null : Number(f.priceMax),
  });

  const submitCreate = async () => {
    if (!createForm.campaignId.trim()) {
      setError("Choose a campaign for the new ad.");
      return;
    }
    setCreateBusy(true);
    setError("");
    try {
      const body = {
        campaignId: createForm.campaignId.trim(),
        type: createForm.type,
        videoUrl: createForm.videoUrl.trim() || null,
        imageUrl: createForm.imageUrl.trim() || null,
        thumbnail: createForm.thumbnail.trim() || null,
        duration: Number(createForm.duration) || 15,
        skipAfter: Number(createForm.skipAfter) || 5,
        placement: createForm.placement,
        ctaType: createForm.ctaType,
        ctaLabel: createForm.ctaLabel.trim() || null,
        ctaUrl: createForm.ctaUrl.trim() || null,
        status: createForm.status,
        targeting: buildTargetingPayload(createForm),
        campaignBudget: numOrEmpty(createForm.campaignBudget) ? Number(createForm.campaignBudget) : undefined,
        campaignDailyBudget: numOrEmpty(createForm.campaignDailyBudget)
          ? Number(createForm.campaignDailyBudget)
          : undefined,
        bidWeight: numOrEmpty(createForm.bidWeight) ? Number(createForm.bidWeight) : undefined,
      };
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(j.error || "Create failed.");
      setCreateForm(emptyForm());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed.");
    } finally {
      setCreateBusy(false);
    }
  };

  const submitEdit = async (adId: string) => {
    if (!editForm) return;
    setBusyId(adId);
    setError("");
    try {
      const body = {
        type: editForm.type,
        videoUrl: editForm.videoUrl.trim() || null,
        imageUrl: editForm.imageUrl.trim() || null,
        thumbnail: editForm.thumbnail.trim() || null,
        duration: Number(editForm.duration) || 15,
        skipAfter: Number(editForm.skipAfter) || 5,
        placement: editForm.placement,
        ctaType: editForm.ctaType,
        ctaLabel: editForm.ctaLabel.trim() || null,
        ctaUrl: editForm.ctaUrl.trim() || null,
        status: editForm.status,
        targeting: buildTargetingPayload(editForm),
        campaignBudget: numOrEmpty(editForm.campaignBudget) ? Number(editForm.campaignBudget) : undefined,
        campaignDailyBudget: numOrEmpty(editForm.campaignDailyBudget)
          ? Number(editForm.campaignDailyBudget)
          : undefined,
        bidWeight: numOrEmpty(editForm.bidWeight) ? Number(editForm.bidWeight) : undefined,
      };
      const res = await fetch(`/api/admin/ads/${adId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(j.error || "Save failed.");
      setEditingId(null);
      setEditForm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusyId("");
    }
  };

  const stopAd = async (adId: string) => {
    setBusyId(adId);
    setError("");
    try {
      const res = await fetch(`/api/admin/ads/${adId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAUSED" }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(j.error || "Pause failed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pause failed.");
    } finally {
      setBusyId("");
    }
  };

  const deleteAd = async (adId: string) => {
    if (!globalThis.confirm("Delete this ad permanently? This cannot be undone.")) return;
    setBusyId(adId);
    setError("");
    try {
      const res = await fetch(`/api/admin/ads/${adId}`, { method: "DELETE", credentials: "include" });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(j.error || "Delete failed.");
      if (editingId === adId) {
        setEditingId(null);
        setEditForm(null);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusyId("");
    }
  };

  const startEdit = (ad: AdminAdRow) => {
    setEditingId(ad.id);
    setEditForm(adToForm(ad, campaigns));
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const setEditFields = React.useCallback<React.Dispatch<React.SetStateAction<FormFields>>>((u) => {
    setEditForm((prev) => {
      if (prev == null) return null;
      return typeof u === "function" ? (u as (s: FormFields) => FormFields)(prev) : u;
    });
  }, []);

  const renderTargetingSection = (
    prefix: string,
    f: FormFields,
    setF: React.Dispatch<React.SetStateAction<FormFields>>
  ) => {
    const gov = citiesFor(f.country);
    return (
      <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-sm font-medium text-white">Geo & listing targeting</p>
        <p className="text-xs text-white/55">
          Ads only deliver when the video listing matches these values (country, city, and area must all match the ad for
          strict delivery).
        </p>

        <div>
          <FieldLabel id={`${prefix}-country`}>Country — where this ad should run</FieldLabel>
          <select
            id={`${prefix}-country`}
            value={f.country}
            onChange={(e) => setF((s) => ({ ...s, country: e.target.value, city: "" }))}
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            <option value="">Select country…</option>
            {countries.map((c) => (
              <option key={c.key} value={c.key}>
                {c.labelEn}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel id={`${prefix}-city`}>City / governorate — must match the property video</FieldLabel>
          <select
            id={`${prefix}-city`}
            value={f.city}
            onChange={(e) => setF((s) => ({ ...s, city: e.target.value }))}
            disabled={!f.country}
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-50"
          >
            <option value="">{f.country ? "Select city…" : "Select a country first"}</option>
            {gov.map((g) => (
              <option key={g.key} value={g.key}>
                {g.labelEn}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel id={`${prefix}-area`}>
            Area / neighborhood — strict text match (e.g. compound or district name)
          </FieldLabel>
          <input
            id={`${prefix}-area`}
            value={f.area}
            onChange={(e) => setF((s) => ({ ...s, area: e.target.value }))}
            placeholder="e.g. Hadayek Al Ahram"
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          />
        </div>

        <details className="rounded-xl border border-white/10 bg-white/5 p-3">
          <summary className="cursor-pointer text-sm font-medium text-white/90">
            Optional: map reference (pick a place, then copy the name into Area above)
          </summary>
          <p className="mt-2 text-xs text-white/55">
            Use the map to locate the neighborhood, then type the same name in &quot;Area / neighborhood&quot; so it
            matches your listings.
          </p>
          <iframe
            title="OpenStreetMap reference"
            className="mt-3 w-full h-56 rounded-lg border border-white/10"
            loading="lazy"
            src="https://www.openstreetmap.org/export/embed.html?bbox=29.7%2C29.85%2C31.75%2C30.35&amp;layer=mapnik"
          />
        </details>

        <div>
          <FieldLabel id={`${prefix}-pt`}>Property type — optional filter (leave empty to allow all types)</FieldLabel>
          <select
            id={`${prefix}-pt`}
            value={f.propertyTypeSlug}
            onChange={(e) => setF((s) => ({ ...s, propertyTypeSlug: e.target.value }))}
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            <option value="">Any property type</option>
            {propertyTypes.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.labelEn}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel id={`${prefix}-pmin`}>Minimum listing price (optional filter, same currency as listing)</FieldLabel>
            <input
              id={`${prefix}-pmin`}
              inputMode="decimal"
              value={f.priceMin}
              onChange={(e) => setF((s) => ({ ...s, priceMin: e.target.value }))}
              placeholder="e.g. 1000000"
              className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            />
          </div>
          <div>
            <FieldLabel id={`${prefix}-pmax`}>Maximum listing price (optional filter)</FieldLabel>
            <input
              id={`${prefix}-pmax`}
              inputMode="decimal"
              value={f.priceMax}
              onChange={(e) => setF((s) => ({ ...s, priceMax: e.target.value }))}
              placeholder="e.g. 5000000"
              className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderBudgetSection = (
    prefix: string,
    f: FormFields,
    setF: React.Dispatch<React.SetStateAction<FormFields>>
  ) => (
    <div className="space-y-4 rounded-xl border border-amber-400/15 bg-amber-500/5 p-4">
      <p className="text-sm font-medium text-white">Campaign budget (parent campaign)</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel id={`${prefix}-bud`}>
            Total campaign budget cap — maximum spend allowed for this campaign over its lifetime
          </FieldLabel>
          <input
            id={`${prefix}-bud`}
            inputMode="decimal"
            value={f.campaignBudget}
            onChange={(e) => setF((s) => ({ ...s, campaignBudget: e.target.value }))}
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          />
        </div>
        <div>
          <FieldLabel id={`${prefix}-daily`}>Daily spend cap — maximum amount to spend per calendar day</FieldLabel>
          <input
            id={`${prefix}-daily`}
            inputMode="decimal"
            value={f.campaignDailyBudget}
            onChange={(e) => setF((s) => ({ ...s, campaignDailyBudget: e.target.value }))}
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          />
        </div>
      </div>
      <div>
        <FieldLabel id={`${prefix}-bid`}>
          Bid weight — relative priority vs other ads (higher number wins when multiple ads qualify; leave empty to keep
          current default)
        </FieldLabel>
        <input
          id={`${prefix}-bid`}
          inputMode="decimal"
          value={f.bidWeight}
          onChange={(e) => setF((s) => ({ ...s, bidWeight: e.target.value }))}
          className="w-full max-w-xs rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        />
      </div>
    </div>
  );

  const renderCreativeSection = (
    prefix: string,
    f: FormFields,
    setF: React.Dispatch<React.SetStateAction<FormFields>>,
    opts: { showStatus: boolean }
  ) => (
    <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm font-medium text-white">Creative & playback</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel id={`${prefix}-type`}>Creative type — video or image asset</FieldLabel>
          <select
            id={`${prefix}-type`}
            value={f.type}
            onChange={(e) => setF((s) => ({ ...s, type: e.target.value as FormFields["type"] }))}
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
          >
            <option value="VIDEO">VIDEO</option>
            <option value="IMAGE">IMAGE</option>
          </select>
        </div>
        <div>
          <FieldLabel id={`${prefix}-place`}>Placement — before the video or mid-roll</FieldLabel>
          <select
            id={`${prefix}-place`}
            value={f.placement}
            onChange={(e) => setF((s) => ({ ...s, placement: e.target.value as FormFields["placement"] }))}
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
          >
            <option value="PRE_ROLL">PRE_ROLL</option>
            <option value="MID_ROLL">MID_ROLL</option>
          </select>
        </div>
      </div>
      <div>
        <FieldLabel id={`${prefix}-vurl`}>Video file URL — source of the ad video (for VIDEO type)</FieldLabel>
        <input
          id={`${prefix}-vurl`}
          value={f.videoUrl}
          onChange={(e) => setF((s) => ({ ...s, videoUrl: e.target.value }))}
          className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none"
          placeholder="https://…"
        />
      </div>
      <div>
        <FieldLabel id={`${prefix}-iurl`}>Image URL — full-screen image creative (for IMAGE type)</FieldLabel>
        <input
          id={`${prefix}-iurl`}
          value={f.imageUrl}
          onChange={(e) => setF((s) => ({ ...s, imageUrl: e.target.value }))}
          className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none"
          placeholder="https://…"
        />
      </div>
      <div>
        <FieldLabel id={`${prefix}-thumb`}>Thumbnail URL — small preview shown before play</FieldLabel>
        <input
          id={`${prefix}-thumb`}
          value={f.thumbnail}
          onChange={(e) => setF((s) => ({ ...s, thumbnail: e.target.value }))}
          className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel id={`${prefix}-dur`}>
            Duration (seconds) — how long the ad creative runs (e.g. 15 = fifteen seconds)
          </FieldLabel>
          <input
            id={`${prefix}-dur`}
            inputMode="numeric"
            value={f.duration}
            onChange={(e) => setF((s) => ({ ...s, duration: e.target.value }))}
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
          />
        </div>
        <div>
          <FieldLabel id={`${prefix}-skip`}>
            Skip after (seconds) — when the viewer may skip (e.g. 5 = skip enabled after 5 seconds)
          </FieldLabel>
          <input
            id={`${prefix}-skip`}
            inputMode="numeric"
            value={f.skipAfter}
            onChange={(e) => setF((s) => ({ ...s, skipAfter: e.target.value }))}
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel id={`${prefix}-cta`}>Call-to-action type</FieldLabel>
          <select
            id={`${prefix}-cta`}
            value={f.ctaType}
            onChange={(e) => setF((s) => ({ ...s, ctaType: e.target.value as FormFields["ctaType"] }))}
            className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
          >
            <option value="WHATSAPP">WHATSAPP</option>
            <option value="CALL">CALL</option>
            <option value="BOOK_VISIT">BOOK_VISIT</option>
          </select>
        </div>
        {opts.showStatus ? (
          <div>
            <FieldLabel id={`${prefix}-st`}>Ad delivery status</FieldLabel>
            <select
              id={`${prefix}-st`}
              value={f.status}
              onChange={(e) => setF((s) => ({ ...s, status: e.target.value as FormFields["status"] }))}
              className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAUSED">PAUSED</option>
              <option value="ENDED">ENDED</option>
            </select>
          </div>
        ) : (
          <div>
            <FieldLabel id={`${prefix}-st2`}>Initial ad status when published</FieldLabel>
            <select
              id={`${prefix}-st2`}
              value={f.status}
              onChange={(e) => setF((s) => ({ ...s, status: e.target.value as FormFields["status"] }))}
              className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PAUSED">PAUSED</option>
              <option value="ENDED">ENDED</option>
            </select>
          </div>
        )}
      </div>
      <div>
        <FieldLabel id={`${prefix}-ctal`}>CTA button label — text shown on the action button</FieldLabel>
        <input
          id={`${prefix}-ctal`}
          value={f.ctaLabel}
          onChange={(e) => setF((s) => ({ ...s, ctaLabel: e.target.value }))}
          className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
        />
      </div>
      <div>
        <FieldLabel id={`${prefix}-ctau`}>CTA destination URL — phone link, WhatsApp, or booking URL</FieldLabel>
        <input
          id={`${prefix}-ctau`}
          value={f.ctaUrl}
          onChange={(e) => setF((s) => ({ ...s, ctaUrl: e.target.value }))}
          className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
        />
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-white/10 p-4 sm:p-5">
        <h2 className="text-white font-semibold text-lg">Ads dashboard</h2>
        <p className="text-sm text-white/60">
          Manage platform ads, geo targeting, and campaign budgets. Data is loaded from the database; changes apply
          immediately to delivery.
        </p>
      </div>

      <div className="p-4 sm:p-5 space-y-8">
        {error ? (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading ads…
          </div>
        ) : null}

        {/* Create */}
        <section className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4 sm:p-5 space-y-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create new ad
          </h3>
          <div>
            <FieldLabel id="create-camp">Campaign — existing advertiser campaign this ad belongs to</FieldLabel>
            <select
              id="create-camp"
              value={createForm.campaignId}
              onChange={(e) => setCreateForm((s) => ({ ...s, campaignId: e.target.value }))}
              className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none"
            >
              <option value="">Select campaign…</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.advertiserName}
                </option>
              ))}
            </select>
          </div>
          {renderCreativeSection("create", createForm, setCreateForm, { showStatus: false })}
          {renderTargetingSection("create", createForm, setCreateForm)}
          {renderBudgetSection("create", createForm, setCreateForm)}
          <button
            type="button"
            onClick={() => void submitCreate()}
            disabled={createBusy || !createForm.campaignId}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Publish ad
          </button>
        </section>

        {/* List */}
        <section className="space-y-4">
          <h3 className="text-white font-semibold">Existing ads</h3>
          {!loading && ads.length === 0 ? (
            <p className="text-sm text-white/55">No ads in the database yet. Create one above or use Studio.</p>
          ) : null}
          <div className="space-y-4">
            {ads.map((ad) => {
              const isEditing = editingId === ad.id;
              const perf = ad.performance;
              return (
                <div
                  key={ad.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 space-y-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs text-white/50">Ad ID</p>
                      <p className="text-sm font-mono text-white/90 break-all">{ad.id}</p>
                      <p className="text-sm text-white mt-2">
                        <span className="text-white/55">Campaign:</span> {ad.campaign.name}{" "}
                        <span className="text-white/45">({ad.campaign.advertiserName})</span>
                      </p>
                      <p className="text-xs text-white/50">
                        Created {formatDate(ad.createdAt)} · Status{" "}
                        <span className="text-white/80">{ad.status}</span> · {ad.placement}
                      </p>
                      {perf ? (
                        <p className="text-xs text-white/55 mt-2">
                          <span className="text-white/70">Performance:</span> impressions {perf.impressions} · views{" "}
                          {perf.views} · clicks {perf.clicks} · leads {perf.leads}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => (isEditing ? cancelEdit() : startEdit(ad))}
                        disabled={busyId === ad.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15 disabled:opacity-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {isEditing ? "Close editor" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void stopAd(ad.id)}
                        disabled={busyId === ad.id || ad.status === "PAUSED"}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/25 bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-100 transition hover:bg-amber-500/25 disabled:opacity-50"
                      >
                        <PauseCircle className="h-3.5 w-3.5" />
                        Stop
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteAd(ad.id)}
                        disabled={busyId === ad.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-red-400/25 bg-red-500/15 px-3 py-2 text-xs font-medium text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {isEditing && editForm ? (
                    <div className="space-y-4 pt-2 border-t border-white/10">
                      {renderCreativeSection("edit", editForm, setEditFields, { showStatus: true })}
                      {renderTargetingSection("edit", editForm, setEditFields)}
                      {renderBudgetSection("edit", editForm, setEditFields)}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void submitEdit(ad.id)}
                          disabled={busyId === ad.id}
                          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          {busyId === ad.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Save changes
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
