"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { PropertyType, VideoPropertyType } from "@prisma/client";

type PropertyTypeRow = {
  id: string;
  slug: string;
  labelAr: string;
  labelEn: string;
  mapProperty: PropertyType;
  mapVideo: VideoPropertyType;
  sortOrder: number;
  active: boolean;
};

type GovernorateRow = {
  id: string;
  key: string;
  labelAr: string;
  labelEn: string;
  sortOrder: number;
  active: boolean;
};

type CountryRow = {
  id: string;
  key: string;
  labelAr: string;
  labelEn: string;
  currency: string;
  areaUnit: string;
  sortOrder: number;
  active: boolean;
  governorates: GovernorateRow[];
};

const PROPERTY_ENUM = Object.values(PropertyType);
const VIDEO_ENUM = Object.values(VideoPropertyType);

export default function ListingCatalogAdminPage() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [types, setTypes] = React.useState<PropertyTypeRow[]>([]);
  const [countries, setCountries] = React.useState<CountryRow[]>([]);

  const [ptSlug, setPtSlug] = React.useState("");
  const [ptEn, setPtEn] = React.useState("");
  const [ptAr, setPtAr] = React.useState("");
  const [ptMapP, setPtMapP] = React.useState<PropertyType>("APARTMENT");
  const [ptMapV, setPtMapV] = React.useState<VideoPropertyType>("APARTMENT");

  const [cKey, setCKey] = React.useState("");
  const [cEn, setCEn] = React.useState("");
  const [cAr, setCAr] = React.useState("");
  const [cCur, setCCur] = React.useState("USD");
  const [cUnit, setCUnit] = React.useState<"sqm" | "sqft">("sqm");

  const [gCountryId, setGCountryId] = React.useState("");
  const [gKey, setGKey] = React.useState("");
  const [gEn, setGEn] = React.useState("");
  const [gAr, setGAr] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const [tRes, cRes] = await Promise.all([
        fetch("/api/admin/listing-property-types", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/listing-countries", { credentials: "include", cache: "no-store" }),
      ]);
      const tJson = (await tRes.json()) as { items?: PropertyTypeRow[]; error?: string };
      const cJson = (await cRes.json()) as { items?: CountryRow[]; error?: string };
      if (!tRes.ok) throw new Error(tJson.error || "Failed property types");
      if (!cRes.ok) throw new Error(cJson.error || "Failed countries");
      setTypes(tJson.items ?? []);
      setCountries(cJson.items ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, []);

  React.useEffect(() => {
    if (!gCountryId && countries.length > 0) {
      setGCountryId(countries[0]!.id);
    }
  }, [countries, gCountryId]);

  const addPropertyType = async () => {
    setErr("");
    const res = await fetch("/api/admin/listing-property-types", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: ptSlug,
        labelEn: ptEn,
        labelAr: ptAr,
        mapProperty: ptMapP,
        mapVideo: ptMapV,
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      setErr(j.error || "Create failed");
      return;
    }
    setPtSlug("");
    setPtEn("");
    setPtAr("");
    await load();
  };

  const addCountry = async () => {
    setErr("");
    const res = await fetch("/api/admin/listing-countries", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: cKey,
        labelEn: cEn,
        labelAr: cAr,
        currency: cCur,
        areaUnit: cUnit,
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      setErr(j.error || "Create failed");
      return;
    }
    setCKey("");
    setCEn("");
    setCAr("");
    await load();
  };

  const addGovernorate = async () => {
    setErr("");
    const res = await fetch("/api/admin/listing-governorates", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        countryId: gCountryId,
        key: gKey,
        labelEn: gEn,
        labelAr: gAr,
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      setErr(j.error || "Create failed");
      return;
    }
    setGKey("");
    setGEn("");
    setGAr("");
    await load();
  };

  const input =
    "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-indigo-400/50";

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/70">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading catalog…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">كتالوج الإدراج</h1>
          <p className="mt-1 text-sm text-white/55">
            أنواع العقارات والدول والمحافظات تظهر في نموذج رفع الفيديو فور الحفظ. الربط الداخلي يستخدم حقول{" "}
            <code className="text-indigo-300">mapProperty</code> و<code className="text-indigo-300">mapVideo</code>{" "}
            للتوافق مع قاعدة البيانات.
          </p>
        </div>
        <Link
          href="/admin/settings/appearance"
          className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
        >
          ← Site look
        </Link>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{err}</div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Plus className="h-5 w-5 text-indigo-400" />
          نوع عقار جديد
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input className={input} placeholder="Slug (مثل PENTHOUSE)" value={ptSlug} onChange={(e) => setPtSlug(e.target.value)} />
          <input className={input} placeholder="Label EN" value={ptEn} onChange={(e) => setPtEn(e.target.value)} />
          <input className={input} placeholder="Label AR" value={ptAr} onChange={(e) => setPtAr(e.target.value)} />
          <select className={input} value={ptMapP} onChange={(e) => setPtMapP(e.target.value as PropertyType)}>
            {PROPERTY_ENUM.map((p) => (
              <option key={p} value={p}>
                Property → {p}
              </option>
            ))}
          </select>
          <select className={input} value={ptMapV} onChange={(e) => setPtMapV(e.target.value as VideoPropertyType)}>
            {VIDEO_ENUM.map((p) => (
              <option key={p} value={p}>
                Video → {p}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void addPropertyType()}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            إضافة
          </button>
        </div>
        <ul className="mt-4 divide-y divide-white/10 text-sm text-white/80">
          {types.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="font-mono text-indigo-300">{r.slug}</span> — {r.labelEn} / {r.labelAr}
                <span className="ml-2 text-xs text-white/45">
                  → {r.mapProperty} / {r.mapVideo}
                </span>
              </span>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`Delete type ${r.slug}?`)) return;
                  await fetch(`/api/admin/listing-property-types/${r.id}`, {
                    method: "DELETE",
                    credentials: "include",
                  });
                  void load();
                }}
                className="text-red-300 hover:text-red-200"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <MapPin className="h-5 w-5 text-emerald-400" />
          دولة جديدة
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input className={input} placeholder="Key (مثل Egypt)" value={cKey} onChange={(e) => setCKey(e.target.value)} />
          <input className={input} placeholder="Label EN" value={cEn} onChange={(e) => setCEn(e.target.value)} />
          <input className={input} placeholder="Label AR" value={cAr} onChange={(e) => setCAr(e.target.value)} />
          <input className={input} placeholder="Currency (USD)" value={cCur} onChange={(e) => setCCur(e.target.value)} />
          <select className={input} value={cUnit} onChange={(e) => setCUnit(e.target.value as "sqm" | "sqft")}>
            <option value="sqm">sqm</option>
            <option value="sqft">sqft</option>
          </select>
          <button
            type="button"
            onClick={() => void addCountry()}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            إضافة دولة
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-white">محافظة / مدينة داخل الدولة</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select className={input} value={gCountryId} onChange={(e) => setGCountryId(e.target.value)}>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.labelEn} ({c.key})
              </option>
            ))}
          </select>
          <input className={input} placeholder="Key (مثل Cairo)" value={gKey} onChange={(e) => setGKey(e.target.value)} />
          <input className={input} placeholder="Label EN" value={gEn} onChange={(e) => setGEn(e.target.value)} />
          <input className={input} placeholder="Label AR" value={gAr} onChange={(e) => setGAr(e.target.value)} />
          <button
            type="button"
            onClick={() => void addGovernorate()}
            disabled={!gCountryId}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
          >
            إضافة محافظة
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-white">الدول والمحافظات</h2>
        <ul className="mt-4 space-y-4 text-sm text-white/80">
          {countries.map((c) => (
            <li key={c.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-white">
                  {c.labelEn} / {c.labelAr}{" "}
                  <span className="font-mono text-xs text-white/50">({c.key})</span>
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`Delete country ${c.key} and all governorates?`)) return;
                    await fetch(`/api/admin/listing-countries/${c.id}`, { method: "DELETE", credentials: "include" });
                    void load();
                  }}
                  className="text-xs text-red-300"
                >
                  حذف الدولة
                </button>
              </div>
              <ul className="mt-2 space-y-1 pl-3 text-xs text-white/65">
                {c.governorates.map((g) => (
                  <li key={g.id} className="flex justify-between gap-2">
                    <span>
                      {g.labelEn} / {g.labelAr} <span className="text-white/40">({g.key})</span>
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Delete ${g.key}?`)) return;
                        await fetch(`/api/admin/listing-governorates/${g.id}`, {
                          method: "DELETE",
                          credentials: "include",
                        });
                        void load();
                      }}
                      className="text-red-400"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
