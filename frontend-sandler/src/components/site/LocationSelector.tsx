"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocale, useLocalizedPush } from "@/components/site/Locale";
import { Check, ChevronDown, LocateFixed, MapPin, Search } from "lucide-react";
import { useSiteData } from "./SiteData";
import { useT } from "./Strings";
import {
  centerCountries,
  centerHref,
  centerShortName,
  countryName,
  matchesSearch,
  nearestCenter,
} from "@/utils/centers";

type LocateState = "idle" | "locating" | "error";

/** Top-right dropdown for choosing the visitor's training center. */
export function LocationSelector() {
  const t = useT();
  const locale = useLocale();
  const { centers, selectedCenter, selectCenter } = useSiteData();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [locate, setLocate] = useState<LocateState>("idle");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelId = useId();
  const push = useLocalizedPush();

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    searchRef.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Choosing a center remembers it and opens that center's page.
  function choose(slug: string) {
    const center = centers.find((c) => c.urlTitle === slug);
    selectCenter(center);
    setOpen(false);
    setSearch("");
    if (center) push(centerHref(center));
  }

  function findNearest() {
    if (!("geolocation" in navigator)) {
      setLocate("error");
      return;
    }
    setLocate("locating");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nearest = nearestCenter(centers, coords.latitude, coords.longitude);
        setLocate(nearest ? "idle" : "error");
        if (nearest) choose(nearest.urlTitle);
      },
      () => setLocate("error"),
      { timeout: 10000 }
    );
  }

  const visible = centers.filter((c) => matchesSearch(c, search));

  return (
    <div ref={rootRef} className="location-selector">
      <button
        type="button"
        className="location-selector__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <MapPin aria-hidden className="h-4 w-4 text-brand-cyan" />
        <span>{t("selector.locations")}</span>
        {selectedCenter && (
          <span className="location-selector__current">{centerShortName(selectedCenter)}</span>
        )}
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div id={panelId} className="location-selector__panel">
          <label className="location-selector__search">
            <Search aria-hidden className="h-4 w-4 text-muted-foreground" />
            <span className="sr-only">{t("selector.search")}</span>
            <input
              ref={searchRef}
              type="search"
              placeholder={t("selector.placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <button
            type="button"
            className="location-selector__locate"
            onClick={findNearest}
            disabled={locate === "locating"}
          >
            <LocateFixed aria-hidden className="h-4 w-4" />
            {locate === "locating" ? t("selector.locating") : t("selector.useLocation")}
          </button>
          {locate === "error" && (
            <p className="location-selector__error">
              {t("selector.locateError")}
            </p>
          )}

          <div className="location-selector__list">
            {centerCountries(visible).map((country) => {
              const inCountry = visible.filter((c) => c.country === country);
              if (!inCountry.length) return null;
              return (
                <div key={country}>
                  <p className="location-selector__group">{countryName(country, locale)}</p>
                  <ul>
                    {inCountry.map((center) => {
                      const isSelected = center.urlTitle === selectedCenter?.urlTitle;
                      return (
                        <li key={center.urlTitle}>
                          <button
                            type="button"
                            aria-current={isSelected || undefined}
                            onClick={() => choose(center.urlTitle)}
                          >
                            <span>
                              <span className="block font-medium text-foreground">
                                {center.city}, {center.region}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {center.title}
                              </span>
                            </span>
                            {isSelected && <Check aria-hidden className="h-4 w-4 text-brand-royal" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {!visible.length && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                {t("selector.none", { search })}
              </p>
            )}
          </div>

          <div className="location-selector__footer">
            <Link href="/locations" onClick={() => setOpen(false)}>
              {t("selector.viewAll")}
            </Link>
            {selectedCenter && (
              <button type="button" onClick={() => selectCenter(undefined)}>
                {t("selector.clear")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
