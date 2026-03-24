"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MapVideo = {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  thumbnailUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const DEFAULT_CENTER: L.LatLngExpression = [25.2048, 55.2708];

export default function PropertyMap({ videos, className = "h-full w-full" }: { videos: MapVideo[]; className?: string }) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(mapContainerRef.current).setView(DEFAULT_CENTER, 10);
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    const valid = videos.filter((v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude));

    valid.forEach((video) => {
      const lat = Number(video.latitude);
      const lng = Number(video.longitude);
      const marker = L.marker([lat, lng]);
      const price = typeof video.price === "number" ? `${video.price.toLocaleString()} ${video.currency || "USD"}` : "";
      const thumbnail = video.thumbnailUrl || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=320&h=180";

      marker.bindPopup(
        `<a href="/watch/${video.id}" style="display:block;min-width:220px;text-decoration:none;color:#111827">
          <img src="${thumbnail}" alt="${video.title}" style="width:100%;height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />
          <div style="font-weight:700;font-size:14px;line-height:1.2;margin-bottom:4px;">${video.title}</div>
          <div style="font-size:13px;color:#374151;">${price}</div>
        </a>`,
        { closeButton: true }
      );

      marker.addTo(markersLayerRef.current!);
    });

    if (valid.length > 0) {
      const bounds = L.latLngBounds(valid.map((v) => [Number(v.latitude), Number(v.longitude)] as [number, number]));
      mapRef.current.fitBounds(bounds.pad(0.2));
    } else {
      mapRef.current.setView(DEFAULT_CENTER, 10);
    }
  }, [videos]);

  return <div ref={mapContainerRef} className={className} />;
}

