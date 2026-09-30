import { cache } from "react";

const DOTCMS = (process.env.NEXT_PUBLIC_DOTCMS_HOST || "").replace(/\/$/, "");
const TOKEN = process.env.NEXT_PUBLIC_DOTCMS_AUTH_TOKEN;
const SITE_ID = process.env.NEXT_PUBLIC_DOTCMS_SITE_ID;

/**
 * Pages built on these dotCMS templates get a reduced header: no main menu
 * or Let's Connect button (a training center's page has its own menu).
 * Editors choose it per page by switching the page's template in dotCMS.
 */
const REDUCED_HEADER_TEMPLATES = ["Sandler Center"];

/**
 * Identifiers of the reduced-header templates on this site. The page data
 * only carries the template's identifier, which differs per instance, so
 * the names are looked up (cached for five minutes).
 */
export const reducedHeaderTemplateIds = cache(async (): Promise<Set<string>> => {
  try {
    const res = await fetch(`${DOTCMS}/api/v1/templates?host=${SITE_ID}&per_page=100`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      next: { revalidate: 300 },
    });
    const { entity } = (await res.json()) as { entity: { identifier: string; title: string }[] };
    return new Set(entity.filter((t) => REDUCED_HEADER_TEMPLATES.includes(t.title)).map((t) => t.identifier));
  } catch {
    return new Set();
  }
});
