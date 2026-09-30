import { NextResponse, type NextRequest } from "next/server";
import type { SearchOrigin } from "@/types/page";

/**
 * Turns what a visitor typed ("02116", "Toronto", "SW1A 1AA") — or their
 * browser location — into coordinates plus country and state, using
 * OpenStreetMap Nominatim. Proxied here so requests carry an identifying
 * User-Agent (Nominatim's usage policy) and repeat searches hit the cache.
 */
const NOMINATIM = "https://nominatim.openstreetmap.org";
const USER_AGENT = "Sandler-dotCMS-demo/1.0 (https://www.dotcms.com)";

// Countries with Sandler offices; keeps "Portland" or "London" from matching
// somewhere Sandler isn't.
const COUNTRIES = "us,ca,gb,mx,pl,au,ky,fr,gr,rs,si,ae,be";

interface NominatimPlace {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
}

function toOrigin(place: NominatimPlace): SearchOrigin {
  const address = place.address ?? {};
  const countryCode = (address.country_code ?? "").toUpperCase();
  // "US-MA" → "MA"
  const iso = address["ISO3166-2-lvl4"] ?? "";
  const town = address.city || address.town || address.village || address.suburb || address.county;
  const label = [address.postcode && !town ? address.postcode : town, address.state || address.country]
    .filter(Boolean)
    .join(", ");
  return {
    label: label || place.display_name,
    latitude: Number(place.lat),
    longitude: Number(place.lon),
    countryCode,
    regionCode: iso.includes("-") ? iso.split("-")[1] : undefined,
  };
}

async function nominatim(path: string, params: Record<string, string>) {
  const url = `${NOMINATIM}${path}?${new URLSearchParams({
    format: "json",
    addressdetails: "1",
    "accept-language": "en",
    ...params,
  })}`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  return res.json() as Promise<NominatimPlace[] | NominatimPlace>;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const lat = params.get("lat");
  const lon = params.get("lon");

  try {
    if (lat && lon) {
      const place = (await nominatim("/reverse", { lat, lon, zoom: "10" })) as NominatimPlace;
      return NextResponse.json({ origin: toOrigin(place) });
    }
    if (!q) return NextResponse.json({ error: "Enter a ZIP code or city." }, { status: 400 });

    // A bare 5-digit number is a US ZIP code.
    const search: Record<string, string> = /^\d{5}$/.test(q)
      ? { postalcode: q, countrycodes: "us" }
      : { q, countrycodes: COUNTRIES };
    const [place] = (await nominatim("/search", { ...search, limit: "1" })) as NominatimPlace[];
    if (!place) {
      return NextResponse.json({ error: `We couldn't find “${q}”.` }, { status: 404 });
    }
    return NextResponse.json({ origin: toOrigin(place) });
  } catch {
    return NextResponse.json({ error: "Location search is unavailable right now." }, { status: 502 });
  }
}
