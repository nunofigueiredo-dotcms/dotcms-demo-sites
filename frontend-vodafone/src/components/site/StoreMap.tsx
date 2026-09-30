"use client";

import { useEffect, useRef } from "react";
import type { LayerGroup, Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapStore {
  identifier: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface StoreMapProps {
  stores: MapStore[];
  /** The store picked in the list: the map flies to it and opens its popup. */
  selectedId?: string;
  onSelect: (identifier: string) => void;
  /** The visitor's position once they share it. */
  origin?: { latitude: number; longitude: number };
}

type Leaflet = typeof import("leaflet");

// Leaflet needs `window`, so this component is only loaded client-side
// (next/dynamic with ssr: false) and imports Leaflet inside the effect.
export default function StoreMap({ stores, selectedId, onSelect, origin }: StoreMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const leaflet = useRef<{ L: Leaflet; map: LeafletMap; pins: LayerGroup; markers: Map<string, Marker> } | null>(null);
  const select = useRef(onSelect);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | undefined;
    import("leaflet").then(({ default: L }) => {
      if (cancelled || !container.current) return;
      map = L.map(container.current, { scrollWheelZoom: false }).setView([27.5, 30.8], 6);
      // Esri's street map labels places in English; the default
      // OpenStreetMap tiles use local (Arabic) names across Egypt.
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      map.once("focus", () => map?.scrollWheelZoom.enable());
      leaflet.current = { L, map, pins: L.layerGroup().addTo(map), markers: new Map() };
      container.current.dispatchEvent(new Event("mapready"));
    });
    return () => {
      cancelled = true;
      map?.remove();
      leaflet.current = null;
    };
  }, []);

  // Redraw the pins whenever the filtered list changes.
  useEffect(() => {
    const el = container.current;
    function draw() {
      if (!leaflet.current) return;
      const { L, map, pins, markers } = leaflet.current;
      pins.clearLayers();
      markers.clear();
      const icon = L.divIcon({ className: "map-pin", html: "<span></span>", iconSize: [26, 34], iconAnchor: [13, 34], popupAnchor: [0, -30] });
      for (const store of stores) {
        const popup = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = store.title;
        const address = document.createElement("p");
        address.textContent = store.address;
        popup.append(name, address);
        const marker = L.marker([store.latitude, store.longitude], { icon, title: store.title })
          .bindPopup(popup)
          .on("click", () => select.current(store.identifier))
          .addTo(pins);
        markers.set(store.identifier, marker);
      }
      if (origin) {
        L.circleMarker([origin.latitude, origin.longitude], {
          radius: 8, color: "#ffffff", weight: 3, fillColor: "#00b0ca", fillOpacity: 1,
        }).bindTooltip("You are here").addTo(pins);
      }
      const points: [number, number][] = stores.map((s) => [s.latitude, s.longitude]);
      if (origin) points.push([origin.latitude, origin.longitude]);
      if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13 });
    }
    draw();
    el?.addEventListener("mapready", draw);
    return () => el?.removeEventListener("mapready", draw);
  }, [stores, origin]);

  // Fly to the store picked in the list.
  useEffect(() => {
    const marker = selectedId && leaflet.current?.markers.get(selectedId);
    if (!marker || !leaflet.current) return;
    leaflet.current.map.flyTo(marker.getLatLng(), 14, { duration: 0.6 });
    marker.openPopup();
  }, [selectedId]);

  return <div ref={container} className="store-map" role="region" aria-label="Map of stores" />;
}
