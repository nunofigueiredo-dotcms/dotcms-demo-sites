import { NextResponse } from "next/server";
import type { SandlerLocation } from "@/types/page";

/**
 * Every published Sandler Location on this site, for the locations map.
 * Loaded on demand by the directory (it's ~200 items, too many to send with
 * every page) and cached for five minutes, so new locations published in
 * dotCMS show up shortly after.
 */
const DOTCMS = (process.env.NEXT_PUBLIC_DOTCMS_HOST || "").replace(/\/$/, "");
const TOKEN = process.env.NEXT_PUBLIC_DOTCMS_AUTH_TOKEN;
const SITE_ID = process.env.NEXT_PUBLIC_DOTCMS_SITE_ID;

const query = `{
  SandlerLocationCollection(
    query: "+conHost:${SITE_ID} +deleted:false +live:true +languageId:1"
    limit: 1000
  ) {
    title
    urlTitle
    city
    region
    regionCode
    country
    countryCode
    postalCode
    phone
    latitude
    longitude
    website
  }
}`;

export async function GET() {
  const res = await fetch(`${DOTCMS}/api/v1/graphql`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Locations are unavailable right now." }, { status: 502 });
  }
  const body = (await res.json()) as { data?: { SandlerLocationCollection?: SandlerLocation[] } };
  const locations = (body.data?.SandlerLocationCollection ?? []).filter(
    (l) => l.latitude && l.longitude
  );
  return NextResponse.json({ locations });
}
