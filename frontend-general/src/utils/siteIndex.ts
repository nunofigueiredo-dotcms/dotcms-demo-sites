import { RECORD_PATHS, RECORD_TYPES, recordPath } from "./records";

const HOST = process.env.NEXT_PUBLIC_DOTCMS_HOST;
const TOKEN = process.env.NEXT_PUBLIC_DOTCMS_AUTH_TOKEN;
const SITE_ID = process.env.NEXT_PUBLIC_DOTCMS_SITE_ID;

export interface IndexedPage {
  /** The dotCMS page path, English (the Arabic page is /ar + path). */
  path: string;
  title: string;
  description?: string;
  /** The record type for attractions, events, restaurants and venues. */
  contentType?: string;
  modified?: string;
}

interface SearchHit {
  contentType: string;
  title: string;
  url?: string;
  urlTitle?: string;
  teaser?: string;
  seodescription?: string;
  modDate?: string;
}

/** Published English content on the site, from dotCMS's content search. */
async function search(query: string): Promise<SearchHit[]> {
  if (!HOST || !TOKEN) return [];
  try {
    const res = await fetch(`${HOST}/api/content/_search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `${query} +conHost:${SITE_ID} +live:true +deleted:false +languageId:1`, limit: 500 }),
      next: { revalidate: 300 },
    });
    const json = await res.json();
    return json?.entity?.jsonObjectView?.contentlets ?? [];
  } catch {
    return [];
  }
}

/**
 * Every public page on the site: the pages themselves (without the detail
 * pages records render on) and each attraction, event, restaurant and venue.
 */
export async function siteIndex(): Promise<IndexedPage[]> {
  const [pages, records] = await Promise.all([
    search("+contentType:htmlpageasset"),
    search(`+contentType:(${RECORD_TYPES.join(" OR ")})`),
  ]);
  const pageEntries = pages
    .filter((p) => p.url && !/-detail$/.test(p.url))
    .map((p) => ({
      path: p.url!.replace(/\/index$/, "") || "/",
      title: p.title,
      description: p.seodescription,
      modified: p.modDate,
    }));
  const recordEntries = records
    .filter((r) => r.urlTitle && RECORD_PATHS[r.contentType])
    .map((r) => ({
      path: recordPath({ contentType: r.contentType, urlTitle: r.urlTitle! }),
      title: r.title,
      description: r.teaser,
      contentType: r.contentType,
      modified: r.modDate,
    }));
  return [...pageEntries.sort((a, b) => a.path.localeCompare(b.path)), ...recordEntries];
}
