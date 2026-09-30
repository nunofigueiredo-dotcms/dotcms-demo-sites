"use client";

import { useEffect, useRef } from "react";
// MarkerClusterGroup's type comes from @types/leaflet.markercluster, which
// adds it to the "leaflet" module.
import type { Circle, LayerGroup, Map as LeafletMap, MarkerClusterGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { SearchOrigin } from "@/types/page";
import { useT } from "@/components/site/Strings";

export interface MapLocation {
  urlTitle: string;
  title: string;
  city: string;
  region?: string;
  phone?: string;
  latitude: number;
  longitude: number;
  href: string;
  /** Has its own pages on this site (vs. a link to go.sandler.com). */
  internal: boolean;
}

interface LocationsMapProps {
  locations: MapLocation[];
  origin?: SearchOrigin;
  radiusKm?: number;
  /** Follow an internal link without a full page load. */
  onNavigate: (href: string) => void;
}

// Leaflet needs `window`, so it is imported inside the effect (and this
// component is only ever loaded client-side, via next/dynamic).
type Leaflet = typeof import("leaflet");

async function loadLeaflet(): Promise<Leaflet> {
  const L = (await import("leaflet")).default;
  // leaflet.markercluster extends the global `L` rather than importing it.
  (window as unknown as { L: Leaflet }).L = L;
  await import("leaflet.markercluster");
  return L;
}

function pinIcon(L: Leaflet) {
  return L.divIcon({
    className: "map-pin",
    html: "<span></span>",
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -30],
  });
}

function popupContent(
  location: MapLocation,
  onNavigate: (href: string) => void,
  labels: { viewCenter: string; website: string }
): HTMLElement {
  const root = document.createElement("div");
  root.className = "map-popup";
  const name = document.createElement("strong");
  name.textContent = location.title;
  const place = document.createElement("p");
  place.textContent = [location.city, location.region].filter(Boolean).join(", ");
  root.append(name, place);
  if (location.phone) {
    const phone = document.createElement("a");
    phone.href = `tel:${location.phone.replace(/[^\d+]/g, "")}`;
    phone.textContent = location.phone;
    root.append(phone);
  }
  const link = document.createElement("a");
  link.className = "map-popup__cta";
  link.href = location.href;
  link.textContent = location.internal ? labels.viewCenter : labels.website;
  if (location.internal) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      onNavigate(location.href);
    });
  } else {
    link.target = "_blank";
    link.rel = "noopener";
  }
  root.append(link);
  return root;
}

/** Map of Sandler locations. Nearby pins merge into numbered clusters that
 *  split apart as the visitor zooms in. */
export default function LocationsMap({ locations, origin, radiusKm, onNavigate }: LocationsMapProps) {
  const t = useT();
  const container = useRef<HTMLDivElement>(null);
  const leaflet = useRef<{ L: Leaflet; map: LeafletMap; clusters: MarkerClusterGroup; search: LayerGroup }>(null);
  const navigate = useRef(onNavigate);
  const labels = useRef({ viewCenter: t("finder.viewCenter"), website: t("finder.website") });

  useEffect(() => {
    navigate.current = onNavigate;
    labels.current = { viewCenter: t("finder.viewCenter"), website: t("finder.website") };
  }, [onNavigate, t]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | undefined;
    loadLeaflet().then((L) => {
      if (cancelled || !container.current) return;
      map = L.map(container.current, { scrollWheelZoom: false, worldCopyJump: true }).setView([40, -40], 2);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      // Scroll-wheel zoom only once the visitor has clicked into the map, so
      // scrolling the page doesn't get trapped.
      map.once("focus", () => map?.scrollWheelZoom.enable());
      const clusters = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        iconCreateFunction: (cluster) =>
          L.divIcon({
            className: "map-cluster",
            html: `<span>${cluster.getChildCount()}</span>`,
            iconSize: [40, 40],
          }),
      }).addTo(map);
      const search = L.layerGroup().addTo(map);
      leaflet.current = { L, map, clusters, search };
      // Let the data effect below draw the pins now that the map exists.
      container.current.dispatchEvent(new Event("mapready"));
    });
    return () => {
      cancelled = true;
      map?.remove();
      leaflet.current = null;
    };
  }, []);

  // Redraw pins, the search area and the view whenever the results change.
  useEffect(() => {
    const el = container.current;
    function draw() {
      if (!leaflet.current) return;
      const { L, map, clusters, search } = leaflet.current;
      clusters.clearLayers();
      clusters.addLayers(
        locations.map((location) =>
          L.marker([location.latitude, location.longitude], {
            icon: pinIcon(L),
            title: location.title,
          }).bindPopup(() => popupContent(location, (href) => navigate.current(href), labels.current))
        )
      );

      search.clearLayers();
      let area: Circle | undefined;
      if (origin) {
        L.circleMarker([origin.latitude, origin.longitude], {
          radius: 7,
          color: "#ffffff",
          weight: 3,
          fillColor: "#00aded",
          fillOpacity: 1,
        })
          .bindTooltip(origin.label)
          .addTo(search);
        if (radiusKm) {
          area = L.circle([origin.latitude, origin.longitude], {
            radius: radiusKm * 1000,
            color: "#0045c2",
            weight: 1,
            fillOpacity: 0.06,
          }).addTo(search);
        }
      }

      // Radius search: show the whole circle. Otherwise fit the pins (and the
      // searched place, for a state/country search).
      const bounds = area ? area.getBounds() : clusters.getBounds();
      if (origin && !area && bounds.isValid()) bounds.extend([origin.latitude, origin.longitude]);
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
      else if (origin) map.setView([origin.latitude, origin.longitude], 8);
    }
    draw();
    el?.addEventListener("mapready", draw);
    return () => el?.removeEventListener("mapready", draw);
  }, [locations, origin, radiusKm]);

  return <div ref={container} className="locations-map" role="region" aria-label={t("finder.map")} />;
}
