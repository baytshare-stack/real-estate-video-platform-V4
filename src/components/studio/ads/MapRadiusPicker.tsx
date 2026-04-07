"use client";

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapRadiusValue = { lat: number; lng: number; radiusKm: number };

export const DEFAULT_MAP_RADIUS: MapRadiusValue = { lat: 30.0444, lng: 31.2357, radiusKm: 5 };

type Props = {
  value: MapRadiusValue;
  onChange: (v: MapRadiusValue) => void;
};

export default function MapRadiusPicker({ value, onChange }: Props) {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);
  const circleRef = React.useRef<L.Circle | null>(null);
  const valueRef = React.useRef(value);
  valueRef.current = value;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  React.useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([valueRef.current.lat, valueRef.current.lng], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const circle = L.circle([valueRef.current.lat, valueRef.current.lng], {
      radius: valueRef.current.radiusKm * 1000,
      color: "#6366f1",
      fillColor: "#6366f1",
      fillOpacity: 0.2,
      weight: 2,
    }).addTo(map);

    mapInstanceRef.current = map;
    circleRef.current = circle;

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const v = valueRef.current;
      onChangeRef.current({ ...v, lat, lng });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      circleRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const map = mapInstanceRef.current;
    const circle = circleRef.current;
    if (!map || !circle) return;
    circle.setLatLng([value.lat, value.lng]);
    circle.setRadius(value.radiusKm * 1000);
    map.panTo([value.lat, value.lng]);
  }, [value.lat, value.lng, value.radiusKm]);

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div>
        <p className="text-sm font-medium text-white">Map targeting (optional)</p>
        <p className="mt-1 text-xs text-white/50">
          Click the map to set the center. Radius is saved with your ad for reference (stored as metadata).
        </p>
      </div>
      <div ref={mapRef} className="h-64 w-full overflow-hidden rounded-xl border border-white/10 sm:h-80" />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-xs text-white/60">
          Latitude
          <input
            type="number"
            step="any"
            value={value.lat}
            onChange={(e) => onChange({ ...value, lat: Number(e.target.value) || 0 })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-white/60">
          Longitude
          <input
            type="number"
            step="any"
            value={value.lng}
            onChange={(e) => onChange({ ...value, lng: Number(e.target.value) || 0 })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-white/60">
          Radius (km)
          <input
            type="number"
            min={1}
            max={200}
            step={1}
            value={value.radiusKm}
            onChange={(e) => onChange({ ...value, radiusKm: Math.max(1, Number(e.target.value) || 1) })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={() => onChange(DEFAULT_MAP_RADIUS)}
        className="text-xs font-medium text-indigo-300 underline-offset-2 hover:underline"
      >
        Reset to Cairo default
      </button>
    </div>
  );
}
