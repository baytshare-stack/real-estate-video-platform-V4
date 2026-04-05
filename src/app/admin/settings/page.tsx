"use client";

import * as React from "react";
import Link from "next/link";

type Category = { id: string; name: string };
type LocationItem = { id: string; country: string; city: string; area: string };
type PlatformSettings = {
  enableAds: boolean;
  requireVideoApproval: boolean;
  maintenanceMode: boolean;
};

const CATEGORIES_KEY = "bytaktube.admin.categories";
const LOCATIONS_KEY = "bytaktube.admin.locations";
const PLATFORM_SETTINGS_KEY = "bytaktube.admin.platformSettings";

function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/35 outline-none transition focus-visible:border-indigo-400/60 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
    />
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-white">{label}</span>
        {description ? <span className="block mt-1 text-xs text-white/60">{description}</span> : null}
      </span>
      <span className="shrink-0 flex items-center">
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={[
            "relative inline-flex h-7 w-12 items-center rounded-full transition",
            checked ? "bg-indigo-600" : "bg-white/10 border border-white/10",
          ].join(" ")}
          aria-pressed={checked}
        >
          <span
            className={[
              "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition",
              checked ? "translate-x-6" : "translate-x-1",
            ].join(" ")}
          />
        </button>
      </span>
    </label>
  );
}

export default function AdminSettingsPage() {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [locations, setLocations] = React.useState<LocationItem[]>([]);
  const [platformSettings, setPlatformSettings] = React.useState<PlatformSettings>({
    enableAds: true,
    requireVideoApproval: true,
    maintenanceMode: false,
  });

  const [categoryName, setCategoryName] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [city, setCity] = React.useState("");
  const [area, setArea] = React.useState("");

  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const initialCategories: Category[] = [
      { id: uid(), name: "Apartment" },
      { id: uid(), name: "Villa" },
      { id: uid(), name: "House" },
      { id: uid(), name: "Land" },
      { id: uid(), name: "Office" },
      { id: uid(), name: "Shop" },
      { id: uid(), name: "Commercial" },
    ];

    const cat = safeParseJSON<Category[]>(localStorage.getItem(CATEGORIES_KEY), []);
    const loc = safeParseJSON<LocationItem[]>(localStorage.getItem(LOCATIONS_KEY), []);
    const settings = safeParseJSON<PlatformSettings>(
      localStorage.getItem(PLATFORM_SETTINGS_KEY),
      {
        enableAds: true,
        requireVideoApproval: true,
        maintenanceMode: false,
      }
    );

    setCategories(cat.length ? cat : initialCategories);
    setLocations(loc);
    setPlatformSettings(settings);
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }, [categories, hydrated]);

  React.useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LOCATIONS_KEY, JSON.stringify(locations));
  }, [locations, hydrated]);

  React.useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PLATFORM_SETTINGS_KEY, JSON.stringify(platformSettings));
  }, [platformSettings, hydrated]);

  const addCategory = () => {
    const name = categoryName.trim();
    if (!name) return;
    setCategories((prev) => [{ id: uid(), name }, ...prev]);
    setCategoryName("");
  };

  const removeCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const addLocation = () => {
    const c = country.trim();
    const ci = city.trim();
    const a = area.trim();
    if (!c || !ci || !a) return;
    setLocations((prev) => [{ id: uid(), country: c, city: ci, area: a }, ...prev]);
    setCountry("");
    setCity("");
    setArea("");
  };

  const removeLocation = (id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Settings</h1>
          <p className="mt-1 text-sm text-white/60">Mock admin configuration UI.</p>
        </div>
        <Link
          href="/admin/settings/appearance"
          className="rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-4 py-2.5 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/25"
        >
          Site look & theme →
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Categories */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-white font-semibold">Categories</h2>
              <p className="text-xs text-white/60 mt-1">Real estate types (mock + local persistence).</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3">
            <TextInput value={categoryName} onChange={setCategoryName} placeholder="Add new category…" />
            <button
              type="button"
              onClick={addCategory}
              className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!categoryName.trim()}
            >
              Add
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm text-white/80 font-medium">{c.name}</p>
                <button
                  type="button"
                  onClick={() => removeCategory(c.id)}
                  className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/15"
                >
                  Remove
                </button>
              </div>
            ))}
            {categories.length === 0 ? <p className="text-sm text-white/60">No categories yet.</p> : null}
          </div>
        </div>

        {/* Locations */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-white font-semibold">Locations</h2>
              <p className="text-xs text-white/60 mt-1">Country / City / Area (mock + local persistence).</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextInput value={country} onChange={setCountry} placeholder="Country" />
            <TextInput value={city} onChange={setCity} placeholder="City" />
            <TextInput value={area} onChange={setArea} placeholder="Area" />
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={addLocation}
              disabled={!country.trim() || !city.trim() || !area.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Add location
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {locations.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-sm text-white/80 font-medium line-clamp-1">
                  {l.country} / {l.city} / {l.area}
                </p>
                <button
                  type="button"
                  onClick={() => removeLocation(l.id)}
                  className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/15"
                >
                  Remove
                </button>
              </div>
            ))}
            {locations.length === 0 ? <p className="text-sm text-white/60">No locations yet.</p> : null}
          </div>
        </div>
      </div>

      {/* Platform Settings */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-white font-semibold">Platform settings</h2>
        <p className="text-xs text-white/60 mt-1">Mock toggles (stored locally for now).</p>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <Toggle
            checked={platformSettings.enableAds}
            onChange={(v) => setPlatformSettings((p) => ({ ...p, enableAds: v }))}
            label="Enable ads"
            description="Controls whether ad placements are considered for serving."
          />
          <Toggle
            checked={platformSettings.requireVideoApproval}
            onChange={(v) => setPlatformSettings((p) => ({ ...p, requireVideoApproval: v }))}
            label="Require video approval"
            description="If enabled, new videos must be approved before being publicly visible."
          />
          <Toggle
            checked={platformSettings.maintenanceMode}
            onChange={(v) => setPlatformSettings((p) => ({ ...p, maintenanceMode: v }))}
            label="Maintenance mode"
            description="Mock switch. Hook into server maintenance later."
          />
        </div>
      </div>
    </div>
  );
}


