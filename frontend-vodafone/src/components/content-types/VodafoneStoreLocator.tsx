"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Clock, LocateFixed, MapPin, Phone } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { useSiteData } from "@/components/site/SiteData";
import { checkboxValues } from "@/utils/content";
import { compareGovernorates, distanceKm, STORE_SERVICES, telHref } from "@/utils/stores";

const StoreMap = dynamic(() => import("@/components/site/StoreMap"), {
  ssr: false,
  loading: () => <div className="store-map store-map--loading" />,
});

type VodafoneStoreLocatorProps = DotCMSBasicContentlet & {
  heading?: string;
  intro?: string;
  /** A governorate name, or "all". */
  defaultGovernorate?: string;
};

interface Origin {
  latitude: number;
  longitude: number;
}

/** Map and filterable list of every published Vodafone Store on the site. */
export default function VodafoneStoreLocator({ heading, intro, defaultGovernorate = "all" }: VodafoneStoreLocatorProps) {
  const { stores } = useSiteData();
  const [governorate, setGovernorate] = useState(defaultGovernorate || "all");
  const [service, setService] = useState("all");
  const [selectedId, setSelectedId] = useState<string>();
  const [origin, setOrigin] = useState<Origin>();
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");

  const governorates = useMemo(() => [...new Set(stores.map((s) => s.governorate))].sort(compareGovernorates), [stores]);

  const results = useMemo(() => {
    const list = stores
      .map((s) => ({
        ...s,
        lat: Number(s.latitude),
        lng: Number(s.longitude),
        serviceList: checkboxValues(s.services),
      }))
      .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
      .filter((s) => governorate === "all" || s.governorate === governorate)
      .filter((s) => service === "all" || s.serviceList.includes(service))
      .map((s) => ({ ...s, distance: origin ? distanceKm(origin.latitude, origin.longitude, s.lat, s.lng) : undefined }));
    return list.sort((a, b) =>
      a.distance !== undefined && b.distance !== undefined
        ? a.distance - b.distance
        : compareGovernorates(a.governorate, b.governorate) || a.title.localeCompare(b.title)
    );
  }, [stores, governorate, service, origin]);

  const mapStores = useMemo(
    () => results.map((s) => ({ identifier: s.identifier, title: s.title, address: s.address, latitude: s.lat, longitude: s.lng })),
    [results]
  );

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocateError("Your browser can't share its location.");
      return;
    }
    setLocating(true);
    setLocateError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setGovernorate("all");
        setLocating(false);
      },
      () => {
        setLocateError("We couldn't get your location. Pick a governorate instead.");
        setLocating(false);
      }
    );
  }, []);

  return (
    <section className="section">
      <div className="container-vf">
        {heading && <h2 className="section__title">{heading}</h2>}
        {intro && <p className="section__intro">{intro}</p>}

        <div className="store-filters">
          <label>
            <span>Governorate</span>
            <select value={governorate} onChange={(e) => setGovernorate(e.target.value)}>
              <option value="all">All of Egypt</option>
              {governorates.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Service</span>
            <select value={service} onChange={(e) => setService(e.target.value)}>
              <option value="all">All services</option>
              {Object.entries(STORE_SERVICES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn--outline" onClick={locate} disabled={locating}>
            <LocateFixed aria-hidden className="h-4 w-4" /> {locating ? "Locating…" : "Use my location"}
          </button>
        </div>
        {locateError && <p className="store-filters__error">{locateError}</p>}

        <div className="store-locator">
          <div className="store-list">
            <p className="store-list__count" aria-live="polite">
              {results.length} {results.length === 1 ? "store" : "stores"}
            </p>
            <ul>
              {results.map((store) => (
                <li key={store.identifier}>
                  <button
                    type="button"
                    className={store.identifier === selectedId ? "store-card is-selected" : "store-card"}
                    onClick={() => setSelectedId(store.identifier)}
                  >
                    <span className="store-card__type">{store.storeType}</span>
                    <strong>{store.title}</strong>
                    <span className="store-card__line">
                      <MapPin aria-hidden className="h-4 w-4 shrink-0" /> {store.address}
                      {store.area && `, ${store.area}`}
                    </span>
                    {store.hours && (
                      <span className="store-card__line">
                        <Clock aria-hidden className="h-4 w-4 shrink-0" /> {store.hours}
                      </span>
                    )}
                    {store.distance !== undefined && (
                      <span className="store-card__distance">{store.distance.toFixed(1)} km away</span>
                    )}
                    {store.serviceList.length > 0 && (
                      <span className="store-card__services">
                        {store.serviceList.map((s) => (
                          <span key={s}>{STORE_SERVICES[s] ?? s}</span>
                        ))}
                      </span>
                    )}
                  </button>
                  {store.phone && (
                    <a href={telHref(store.phone)} className="store-card__phone">
                      <Phone aria-hidden className="h-4 w-4" /> {store.phone}
                    </a>
                  )}
                </li>
              ))}
            </ul>
            {!results.length && <p className="store-list__empty">No stores match these filters.</p>}
          </div>
          <StoreMap stores={mapStores} selectedId={selectedId} onSelect={setSelectedId} origin={origin} />
        </div>
      </div>
    </section>
  );
}
