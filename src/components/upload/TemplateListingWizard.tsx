"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

type ApiTemplate = {
  id: string;
  slug: string;
  name: string;
  type: "SHORT" | "LONG";
  previewImage: string | null;
  config: unknown;
};

const PROPERTY_TYPES = [
  { v: "APARTMENT", l: "Apartment" },
  { v: "VILLA", l: "Villa" },
  { v: "TOWNHOUSE", l: "Townhouse" },
  { v: "STUDIO", l: "Studio" },
  { v: "LAND", l: "Land" },
  { v: "OTHER", l: "Other" },
];

export default function TemplateListingWizard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageLines, setImageLines] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [propertyType, setPropertyType] = useState("APARTMENT");
  const [listingStatus, setListingStatus] = useState("FOR_SALE");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [sizeSqm, setSizeSqm] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [country, setCountry] = useState("USA");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/video-templates")
      .then((r) => r.json())
      .then((d: { templates?: ApiTemplate[] }) => {
        if (!cancelled && Array.isArray(d.templates)) setTemplates(d.templates);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedId) {
        setError("Choose a template first.");
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        const images = imageLines
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        const res = await fetch("/api/videos/from-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: selectedId,
            title,
            description,
            templatePayload: {
              images,
              audioUrl: audioUrl.trim() || undefined,
              contactPhone: contactPhone.trim() || undefined,
              contactWhatsapp: contactWhatsapp.trim() || undefined,
              contactEmail: contactEmail.trim() || undefined,
            },
            propertyType,
            status: listingStatus,
            price: Number(price),
            bedrooms: bedrooms || undefined,
            bathrooms: bathrooms || undefined,
            sizeSqm: sizeSqm || undefined,
            currency,
            country,
            city,
            address: address || undefined,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
        if (!res.ok) throw new Error(data.error || "Publish failed");
        if (data.id) router.push(`/watch/${data.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      } finally {
        setSubmitting(false);
      }
    },
    [
      selectedId,
      title,
      description,
      imageLines,
      audioUrl,
      contactPhone,
      contactWhatsapp,
      contactEmail,
      propertyType,
      listingStatus,
      price,
      bedrooms,
      bathrooms,
      sizeSqm,
      currency,
      country,
      city,
      address,
      router,
    ]
  );

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-600 dark:text-slate-300">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <p className="text-center text-slate-600 dark:text-slate-300">
        <Link href="/login" className="font-semibold text-indigo-600 underline">
          Sign in
        </Link>{" "}
        to publish a template listing.
      </p>
    );
  }

  const roles = ["AGENT", "AGENCY", "ADMIN", "SUPER_ADMIN"];
  if (!roles.includes(session?.user?.role ?? "")) {
    return <p className="text-center text-amber-700 dark:text-amber-400">Only agents and agencies can publish.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Select template</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Short = vertical; long = widescreen cinematic layouts.
        </p>
        {loadingList ? (
          <div className="mt-4 flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`overflow-hidden rounded-xl border-2 text-left transition ${
                  selectedId === t.id
                    ? "border-indigo-600 ring-2 ring-indigo-500/30"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="relative aspect-[3/4] bg-slate-900">
                  {t.previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.previewImage}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    {t.type === "SHORT" ? "Short" : "Long"}
                  </span>
                </div>
                <div className="p-2">
                  <p className="line-clamp-2 text-xs font-semibold text-slate-900 dark:text-white">{t.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-6 border-t border-slate-200 pt-8 dark:border-slate-700">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-amber-500" />
          2. Media & listing
        </h2>

        {selected ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Preview: <span className="font-medium text-slate-900 dark:text-white">{selected.name}</span>
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Image URLs (one per line)
            </span>
            <textarea
              value={imageLines}
              onChange={(e) => setImageLines(e.target.value)}
              rows={4}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Background audio URL (optional)</span>
            <input
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="https://...mp3"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Contact phone override</span>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">WhatsApp override</span>
            <input
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Listing email</span>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Property type</span>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            >
              {PROPERTY_TYPES.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.l}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Listing</span>
            <select
              value={listingStatus}
              onChange={(e) => setListingStatus(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            >
              <option value="FOR_SALE">For sale</option>
              <option value="FOR_RENT">For rent</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Price</span>
            <input
              required
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Currency</span>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Country</span>
            <input
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">City</span>
            <input
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Address</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Bedrooms</span>
            <input
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Bathrooms</span>
            <input
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Size (m²)</span>
            <input
              value={sizeSqm}
              onChange={(e) => setSizeSqm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </label>
        </div>

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting || !selectedId}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white shadow transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Publish template listing
        </button>
      </form>
    </div>
  );
}
