"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, LocateFixed, MapPin, Phone, Search, X } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import type { SandlerLocation, SearchOrigin } from "@/types/page";
import { useSiteData } from "@/components/site/SiteData";
import { Link, useLocale, useLocalizedPush } from "@/components/site/Locale";
import type { MapLocation } from "@/components/site/LocationsMap";
import { checkboxValues, countryName, distanceKm, telHref } from "@/utils/centers";
import { useT } from "@/components/site/Strings";

// Leaflet only runs in the browser.
const LocationsMap = dynamic(() => import("@/components/site/LocationsMap"), {
  ssr: false,
  loading: () => <div className="locations-map locations-map--loading" />,
});

type SearchMode = "radius" | "region";

/** Editor settings from the SandlerCenterDirectory content type. */
type SandlerCenterDirectoryProps = DotCMSBasicContentlet & {
  heading?: string;
  intro?: string;
  /** Checkbox: "radius" and/or "region". */
  searchModes?: unknown;
  /** Comma-separated, e.g. "25,50,100,250". */
  radiusOptions?: string;
  defaultRadius?: string;
  distanceUnit?: "mi" | "km";
  /** For demos: treat every visitor as being here (e.g. "New York, NY")
   *  instead of asking the browser for its location. */
  demoLocation?: string;
};

interface DirectoryLocation extends MapLocation {
  region?: string;
  regionCode?: string;
  country: string;
  countryCode: string;
  postalCode?: string;
}

interface Result extends DirectoryLocation {
  distanceKm?: number;
}

const KM_PER_MILE = 1.609344;
// Dropdown values: "radius:50" … or "region".
const RADIUS = "radius:";
// The network is mostly North American; show those first, then A–Z.
const COUNTRY_ORDER = ["US", "CA", "GB"];

function countryRank(code: string) {
  const i = COUNTRY_ORDER.indexOf(code);
  return i === -1 ? COUNTRY_ORDER.length : i;
}

/** "Birmingham, AL 35244" / "Tring HP23 6AF" */
function formatAddress(l: DirectoryLocation) {
  const place = l.regionCode && ["US", "CA"].includes(l.countryCode) ? `${l.city}, ${l.regionCode}` : l.city;
  return [place, l.postalCode].filter(Boolean).join(" ");
}

function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return [...groups];
}

export default function SandlerCenterDirectory({
  heading,
  intro,
  searchModes,
  radiusOptions,
  defaultRadius,
  distanceUnit = "mi",
  demoLocation,
}: SandlerCenterDirectoryProps) {
  const t = useT();
  const { centers } = useSiteData();
  const push = useLocalizedPush();
  const locale = useLocale();

  const modes = checkboxValues(searchModes).filter((m): m is SearchMode => m === "radius" || m === "region");
  const radii = (radiusOptions || "25,50,100,250")
    .split(",")
    .map((r) => Number(r.trim()))
    .filter((r) => r > 0);
  const unit = distanceUnit === "km" ? "km" : "mi";
  const toKm = (value: number) => (unit === "mi" ? value * KM_PER_MILE : value);
  const fromKm = (km: number) => (unit === "mi" ? km / KM_PER_MILE : km);

  // One set of choices covers both modes: "50 mi" … or "My state / country".
  const scopes = [
    ...(modes.includes("radius") ? radii.map((r) => ({ value: `${RADIUS}${r}`, label: `${r} ${unit}` })) : []),
    ...(modes.includes("region") ? [{ value: "region", label: t("finder.myRegion") }] : []),
  ];
  const defaultScope = scopes.find((s) => s.value === `${RADIUS}${Number(defaultRadius)}`)?.value ?? scopes[0]?.value ?? "";

  const [locations, setLocations] = useState<SandlerLocation[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState(defaultScope);
  const [origin, setOrigin] = useState<SearchOrigin>();
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [openCountry, setOpenCountry] = useState<string | null>("US");

  useEffect(() => {
    fetch("/api/locations")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { locations: SandlerLocation[] }) => setLocations(data.locations))
      .catch(() => setLoadError(true));
  }, []);

  // Offices with a Training Center on this site link to its pages; the rest
  // to their own go.sandler.com site.
  const all: DirectoryLocation[] = useMemo(() => {
    const onSite = new Set(centers.map((c) => c.urlTitle));
    return (locations ?? [])
      .map((l) => {
        const internal = onSite.has(l.urlTitle);
        return {
          ...l,
          latitude: Number(l.latitude),
          longitude: Number(l.longitude),
          internal,
          href: internal ? `/locations/${l.urlTitle}` : l.website || `https://go.sandler.com/${l.urlTitle}/`,
        };
      })
      .filter((l) => !Number.isNaN(l.latitude) && !Number.isNaN(l.longitude))
      .sort(
        (a, b) =>
          countryRank(a.countryCode) - countryRank(b.countryCode) ||
          a.country.localeCompare(b.country) ||
          (a.region ?? "").localeCompare(b.region ?? "") ||
          a.city.localeCompare(b.city)
      );
  }, [locations, centers]);

  const radius = scope.startsWith(RADIUS) ? Number(scope.slice(RADIUS.length)) : undefined;
  const radiusKm = origin && radius ? toKm(radius) : undefined;

  const results: Result[] | null = useMemo(() => {
    if (!origin) return null;
    const withDistance = all.map((l) => ({
      ...l,
      distanceKm: distanceKm(origin.latitude, origin.longitude, l.latitude, l.longitude),
    }));
    const matches =
      radiusKm !== undefined
        ? withDistance.filter((l) => l.distanceKm <= radiusKm)
        : withDistance.filter((l) =>
            // US visitors see their state; everyone else their country.
            origin.countryCode === "US"
              ? l.countryCode === "US" && l.regionCode === origin.regionCode
              : l.countryCode === origin.countryCode
          );
    return matches.sort((a, b) => a.distanceKm - b.distanceKm);
  }, [all, origin, radiusKm]);

  const nearest = useMemo(() => {
    if (!origin || results?.length) return undefined;
    return all
      .map((l) => ({ ...l, distanceKm: distanceKm(origin.latitude, origin.longitude, l.latitude, l.longitude) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)[0];
  }, [all, origin, results]);

  const geocode = useCallback(async (params: Record<string, string>) => {
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/geocode?${new URLSearchParams(params)}`);
      const data = (await res.json()) as { origin?: SearchOrigin; error?: string };
      if (!data.origin) throw new Error(data.error || t("finder.notFound"));
      setOrigin(data.origin);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : t("finder.failed"));
    } finally {
      setSearching(false);
    }
  }, [t]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (query.trim()) geocode({ q: query.trim() });
  }

  // Where the visitor is: the editor's demo location if set, otherwise the
  // browser's position.
  function locateMe() {
    if (demoLocation) {
      setQuery("");
      geocode({ q: demoLocation });
      return;
    }
    if (!navigator.geolocation) {
      setSearchError(t("finder.noGeo"));
      return;
    }
    setSearching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setQuery("");
        geocode({ lat: String(pos.coords.latitude), lon: String(pos.coords.longitude) });
      },
      () => {
        setSearching(false);
        setSearchError(t("finder.geoBlocked"));
      },
      { timeout: 10000 }
    );
  }

  // Picking a distance re-filters around the current search; with nothing
  // searched yet it starts from the visitor's location.
  function chooseScope(value: string) {
    setScope(value);
    if (!origin && !query.trim()) locateMe();
    else if (!origin) geocode({ q: query.trim() });
  }

  function clearSearch() {
    setOrigin(undefined);
    setQuery("");
    setSearchError("");
  }

  function resultsSummary() {
    if (!origin || !results) return "";
    const count =
      results.length === 0
        ? t("finder.noLocations")
        : results.length === 1
          ? t("finder.oneLocation")
          : t("finder.manyLocations", { count: results.length });
    if (radiusKm !== undefined) {
      return t("finder.withinOf", { count, radius: `${radius} ${unit}`, place: origin.label });
    }
    if (origin.countryCode === "US") {
      const state = results[0]?.region ?? origin.label.split(", ").pop() ?? origin.label;
      return t("finder.in", { count, place: state });
    }
    const country = results[0]?.country ?? all.find((l) => l.countryCode === origin.countryCode)?.country;
    return t("finder.in", { count, place: country ?? origin.label });
  }

  const byCountry = groupBy(all, (l) => l.country);

  return (
    <section className="section section--light">
      <div className="section__inner">
        <header className="section__header">
          {heading && <h2>{heading}</h2>}
          {intro && <p>{intro}</p>}
        </header>

        {scopes.length > 0 && (
          <form className="finder" onSubmit={onSubmit} role="search">
            <label className="finder__field">
              <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">{t("finder.field")}</span>
              <input
                type="search"
                placeholder={t("finder.field")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button type="submit" className="btn btn--primary" disabled={searching || !query.trim()}>
              {searching ? t("finder.searching") : t("finder.find")}
            </button>
            <button type="button" className="finder__locate" onClick={locateMe} disabled={searching}>
              <LocateFixed aria-hidden className="h-4 w-4" /> {t("finder.useLocation")}
            </button>
            <fieldset className="finder__scopes">
              <legend>{t("finder.within")}</legend>
              {scopes.map((s) => (
                <label key={s.value} className="finder__scope">
                  <input
                    type="radio"
                    name="finder-scope"
                    value={s.value}
                    checked={Boolean(origin) && scope === s.value}
                    onChange={() => chooseScope(s.value)}
                  />
                  <span>{s.label}</span>
                </label>
              ))}
            </fieldset>
          </form>
        )}
        {searchError && <p className="finder__error">{searchError}</p>}

        <LocationsMap
          locations={results ?? all}
          origin={origin}
          radiusKm={radiusKm}
          onNavigate={push}
        />
        <p className="finder__legend">
          <span className="finder__legend-pin" /> {t("finder.legend")}
        </p>

        {loadError && <p className="finder__error">{t("finder.loadError")}</p>}

        {results ? (
          <div className="finder__results" aria-live="polite">
            <div className="finder__results-header">
              <h3>{resultsSummary()}</h3>
              <button type="button" className="finder__clear" onClick={clearSearch}>
                <X aria-hidden className="h-4 w-4" /> {t("finder.showAll")}
              </button>
            </div>
            {results.length > 0 ? (
              <ul className="location-grid">
                {results.map((l) => (
                  <LocationCard key={l.urlTitle} location={l} distance={`${Math.round(fromKm(l.distanceKm ?? 0))} ${unit}`} />
                ))}
              </ul>
            ) : (
              <div className="finder__empty">
                <p>{t("finder.noMatch")}</p>
                {nearest && (
                  <>
                    <p className="mt-2">
                      {t("finder.nearest", { distance: `${Math.round(fromKm(nearest.distanceKm))} ${unit}` })}
                    </p>
                    <ul className="location-grid mt-4">
                      <LocationCard location={nearest} />
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="country-list">
            {byCountry.map(([country, inCountry]) => {
              const open = openCountry === inCountry[0].countryCode;
              const panelId = `country-${inCountry[0].countryCode}`;
              return (
                <div key={country} className="country-list__item">
                  <button
                    type="button"
                    className="country-list__toggle"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenCountry(open ? null : inCountry[0].countryCode)}
                  >
                    <span>{countryName(inCountry[0].countryCode, locale)}</span>
                    <span className="country-list__count">{inCountry.length}</span>
                    <ChevronDown aria-hidden className="country-list__chevron h-5 w-5" />
                  </button>
                  {open && (
                    <div id={panelId} className="country-list__panel">
                      {groupBy(inCountry, (l) => l.region || country).map(([region, inRegion]) => (
                        <div key={region} className="state-group">
                          {region !== country && <h4>{region}</h4>}
                          <ul className="location-grid">
                            {inRegion.map((l) => (
                              <LocationCard key={l.urlTitle} location={l} />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function LocationCard({ location, distance }: { location: DirectoryLocation; distance?: string }) {
  const t = useT();
  const cta = location.internal ? t("finder.viewCenter") : t("finder.website");
  return (
    <li className="location-card">
      <div className="location-card__top">
        <strong>
          {location.internal ? (
            <Link href={location.href}>{location.title}</Link>
          ) : (
            <a href={location.href} target="_blank" rel="noopener">
              {location.title}
            </a>
          )}
        </strong>
        {distance && <span className="location-card__distance">{distance}</span>}
      </div>
      <address>
        <MapPin aria-hidden className="h-4 w-4 shrink-0 text-brand-cyan" />
        {formatAddress(location)}
      </address>
      <div className="location-card__actions">
        {location.internal ? (
          <Link href={location.href} className="btn btn--primary btn--sm">
            {cta}
          </Link>
        ) : (
          <a href={location.href} target="_blank" rel="noopener" className="btn btn--outline btn--sm">
            {cta}
          </a>
        )}
        {location.phone && (
          <a href={telHref(location.phone)} className="location-card__phone">
            <Phone aria-hidden className="h-4 w-4" />
            {location.phone}
          </a>
        )}
      </div>
    </li>
  );
}
