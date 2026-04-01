"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, Search } from "lucide-react";
import { useTranslation } from "@/i18n/LanguageProvider";

const defaultCenter: L.LatLngExpression = [25.2048, 55.2708];

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-black shadow-sm placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400";

const btnClass =
  "rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70";

export type LocationPatch = {
  latitude: string;
  longitude: string;
  address: string;
  country?: string;
  city?: string;
};

type MapLeafletPickerProps = {
  address: string;
  country: string;
  city: string;
  latitude: string;
  longitude: string;
  onPatch: (patch: LocationPatch) => void;
};

export default function MapLeafletPicker({
  address,
  country,
  city,
  latitude,
  longitude,
  onPatch,
}: MapLeafletPickerProps) {
  const { t } = useTranslation();
  const pinnedPrefixRef = useRef(t("uploadPage", "pinnedAtPrefix"));
  pinnedPrefixRef.current = t("uploadPage", "pinnedAtPrefix");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPatchRef = useRef(onPatch);
  const addressRef = useRef(address);
  const countryRef = useRef(country);
  const cityRef = useRef(city);
  onPatchRef.current = onPatch;
  addressRef.current = address;
  countryRef.current = country;
  cityRef.current = city;

  const [mapSearch, setMapSearch] = useState("");
  const [isMapSearching, setIsMapSearching] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(containerRef.current, { zoomControl: true }).setView(defaultCenter, 10);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const invalidate = () => map.invalidateSize();
    setTimeout(invalidate, 0);
    setTimeout(invalidate, 150);
    setTimeout(invalidate, 500);

    map.on("click", (event: L.LeafletMouseEvent) => {
      const { lat, lng } = event.latlng;
      const latS = lat.toFixed(6);
      const lngS = lng.toFixed(6);
      const addr = addressRef.current.trim();
      onPatchRef.current({
        latitude: latS,
        longitude: lngS,
        address: addr || `${pinnedPrefixRef.current} ${latS}, ${lngS}`,
      });
      if (markerRef.current) markerRef.current.setLatLng(event.latlng);
      else markerRef.current = L.marker(event.latlng).addTo(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  const handleMapSearch = useCallback(async () => {
    if (!mapSearch.trim() || !mapRef.current) return;
    setIsMapSearching(true);
    try {
      const query = encodeURIComponent(mapSearch.trim());
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=${query}`
      );
      const data = (await response.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
        address?: Record<string, string>;
      }>;
      if (!data.length) return;

      const result = data[0];
      const lat = Number(result.lat);
      const lng = Number(result.lon);
      const target: L.LatLngExpression = [lat, lng];
      mapRef.current.setView(target, 14);
      if (markerRef.current) markerRef.current.setLatLng(target);
      else markerRef.current = L.marker(target).addTo(mapRef.current);

      onPatchRef.current({
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        address: result.display_name,
        country: countryRef.current || result.address?.country || "",
        city: cityRef.current || result.address?.city || result.address?.town || result.address?.state || "",
      });
    } finally {
      setIsMapSearching(false);
    }
  }, [mapSearch]);

  return (
    <div className="space-y-3 md:col-span-3">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("uploadPage", "searchLocation")}
        </label>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
            <input
              value={mapSearch}
              onChange={(e) => setMapSearch(e.target.value)}
              className={`${inputClass} py-3 pl-10 pr-4`}
              placeholder={t("uploadPage", "searchPlaceholder")}
            />
          </div>
          <button type="button" onClick={handleMapSearch} className={btnClass} disabled={isMapSearching}>
            {isMapSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : t("uploadPage", "find")}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-300 dark:border-slate-600">
        <div
          ref={containerRef}
          className="h-[400px] w-full bg-neutral-100 dark:bg-slate-800"
          style={{ minHeight: 400 }}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-black dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
        {latitude && longitude
          ? `${t("uploadPage", "coordsSelected")} ${latitude}, ${longitude}`
          : t("uploadPage", "coordsHint")}
      </div>
    </div>
  );
}
