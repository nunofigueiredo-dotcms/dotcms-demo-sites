import type { TrainingCenter } from "@/types/page";

/** Cookie holding the visitor's chosen center slug. Read on the server so the
 *  first render is already personalised — no flash of the default state. */
export const CENTER_COOKIE = "sandler-center";

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  AU: "Australia",
  BE: "Belgium",
  KY: "Cayman Islands",
  FR: "France",
  GR: "Greece",
  MX: "Mexico",
  PL: "Poland",
  RS: "Serbia",
  SI: "Slovenia",
  AE: "United Arab Emirates",
};

// Most centers are North American; those countries come first, then A–Z.
const FIRST_COUNTRIES = ["US", "CA", "GB"];

/** A country's name; in another language via the browser's own list of
 *  country names ("US" → "Estados Unidos" in Spanish). */
export function countryName(code: string, locale?: string): string {
  if (locale && locale !== "en") {
    try {
      return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
    } catch {
      // Unknown code or no Intl support: fall back to the English name.
    }
  }
  return COUNTRY_NAMES[code] ?? code;
}

function countryRank(code: string): number {
  const i = FIRST_COUNTRIES.indexOf(code);
  return i === -1 ? FIRST_COUNTRIES.length : i;
}

/** The countries these centers are in, in display order. */
export function centerCountries(centers: TrainingCenter[]): string[] {
  return [...new Set(centers.map((c) => c.country))].sort(
    (a, b) => countryRank(a) - countryRank(b) || countryName(a).localeCompare(countryName(b))
  );
}

/** How a center is labelled in compact places (selector, buttons): its city.
 *  Center names are the franchise's own ("Sandler Minnesota", "GTM Performance
 *  Ltd") and don't always say where they are. */
export function centerShortName(center: TrainingCenter): string {
  return center.city;
}

/** Google Maps search for the center's address. */
export function directionsHref(center: TrainingCenter): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    center.address || `${center.city}, ${center.region}`
  )}`;
}

/** Split "Title | Description" lines, as used by the benefits field. */
export function titledLines(value?: string): { title: string; text: string }[] {
  return (value ?? "")
    .split("\n")
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter(([title]) => Boolean(title))
    .map(([title, text = ""]) => ({ title, text }));
}

export function centerHref(center: TrainingCenter): string {
  return `/locations/${center.urlTitle}`;
}

/**
 * Every Sandler solution a center can offer, in menu order (as on
 * go.sandler.com). Each has one shared dotCMS page at
 * /center-pages/solutions/{slug}; a center's "Solutions offered" checkboxes
 * (the TrainingCenter `solutions` field, values = these slugs) decide which
 * appear in its menu and which pages exist under it.
 */
export const SOLUTIONS = [
  { slug: "sales-training", label: "Sales Training" },
  { slug: "sales-leadership-training", label: "Sales Leadership Training" },
  { slug: "sales-management-training", label: "Sales Management Training" },
  { slug: "customer-success-training", label: "Customer Success Training" },
  { slug: "assessments", label: "Assessments" },
  { slug: "online-training", label: "Online Training" },
  { slug: "certification", label: "Certification" },
  { slug: "coaching-consulting", label: "Coaching & Consulting" },
  { slug: "channel-sales-series", label: "Channel Sales Series" },
  { slug: "sales-training-boot-camp", label: "Sales Training Boot Camp" },
  { slug: "end-of-the-year-goals-workshop-series", label: "End of the Year Goals Workshop Series" },
  { slug: "sandler-reinforcement-services", label: "Sandler Reinforcement Services" },
] as const;

/** A checkbox field's selected values, however the API shapes them
 *  ("a,b", ["a","b"] or [{ value: "a" }]). */
export function checkboxValues(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === "string") return raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(raw)) {
    return raw
      .map((v) => (typeof v === "string" ? v : (v as { value?: string; key?: string }).value ?? (v as { key?: string }).key))
      .filter((v): v is string => Boolean(v));
  }
  return [];
}

function selectedSolutionSlugs(center: TrainingCenter): string[] {
  return checkboxValues(center.solutions);
}

export interface CenterLink {
  slug: string;
  label: string;
  href: string;
}

/** Label key for a solution (ui-strings.json / Language Variable). */
export function solutionKey(slug: string): string {
  return `solution.${slug}`;
}

/** Label key for a center subpage: "about-us/testimonials" → center.page.about-us.testimonials. */
export function centerPageKey(path: string): string {
  return `center.page.${path.replace(/\//g, ".")}`;
}

/** Label key for a main-menu item, from its URL: "/articles" → nav.item.articles. */
export function navKey(href: string): string {
  return `nav.item.${href.replace(/\/+$/, "").split("/").pop() || "home"}`;
}

export function centerSolutions(center: TrainingCenter): CenterLink[] {
  const chosen = new Set(selectedSolutionSlugs(center));
  return SOLUTIONS.filter((s) => chosen.has(s.slug)).map((s) => ({
    slug: s.slug,
    label: s.label,
    href: `${centerHref(center)}/solutions/${s.slug}`,
  }));
}

/** Subpages every center has, besides its solutions. */
export const CENTER_PAGES = [
  { label: "About Us", path: "about-us" },
  { label: "Testimonials", path: "about-us/testimonials" },
  { label: "Events", path: "events" },
  { label: "Contact Us", path: "contact-us" },
] as const;

/** Is `/locations/{center}/{path}` a real page for this center? */
export function isCenterSubpage(center: TrainingCenter, path: string): boolean {
  if (CENTER_PAGES.some((page) => page.path === path)) return true;
  return centerSolutions(center).some((s) => s.href === `${centerHref(center)}/${path}`);
}

// Where "~/" links go when there is no current center (e.g. in the editor).
const CENTER_LINK_FALLBACKS: Record<string, string> = {
  "contact-us": "/contact",
};

/**
 * Content links starting "~/" are relative to the current center:
 * "~/contact-us" is /locations/minnesota/contact-us on Minnesota's pages.
 * Without a center they fall back to a site-wide page.
 */
export function resolveCenterLink(href: string, center?: TrainingCenter): string {
  if (!href.startsWith("~/")) return href;
  const path = href.slice(2);
  if (center) return `${centerHref(center)}/${path}`;
  return CENTER_LINK_FALLBACKS[path] ?? "/locations";
}

export function lines(value?: string): string[] {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}


export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function sortCenters(centers: TrainingCenter[]): TrainingCenter[] {
  return [...centers].sort(
    (a, b) =>
      countryRank(a.country) - countryRank(b.country) ||
      countryName(a.country).localeCompare(countryName(b.country)) ||
      centerShortName(a).localeCompare(centerShortName(b))
  );
}

export function matchesSearch(center: TrainingCenter, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [center.title, center.city, center.region, countryName(center.country)]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

/** Great-circle distance in km (haversine). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function nearestCenter(
  centers: TrainingCenter[],
  latitude: number,
  longitude: number
): TrainingCenter | undefined {
  let best: TrainingCenter | undefined;
  let bestDistance = Infinity;
  for (const center of centers) {
    const lat = Number(center.latitude);
    const lon = Number(center.longitude);
    if (!center.latitude || !center.longitude || Number.isNaN(lat) || Number.isNaN(lon)) {
      continue;
    }
    const d = distanceKm(latitude, longitude, lat, lon);
    if (d < bestDistance) {
      best = center;
      bestDistance = d;
    }
  }
  return best;
}
