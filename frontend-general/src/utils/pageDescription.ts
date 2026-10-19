import { cache } from "react";

const HOST = process.env.NEXT_PUBLIC_DOTCMS_HOST;
const TOKEN = process.env.NEXT_PUBLIC_DOTCMS_AUTH_TOKEN;
const SITE_ID = process.env.NEXT_PUBLIC_DOTCMS_SITE_ID;

/**
 * A page's SEO description (its "seodescription" field), for the meta tags.
 * The SDK's page request leaves it out, and asking it for extra page fields
 * changes how it returns the sections, so it's fetched on its own.
 */
export const getPageDescription = cache(async (path: string, languageId: number): Promise<string | undefined> => {
  if (!HOST || !TOKEN) return undefined;
  const query = `{ page(url: ${JSON.stringify(path)}, languageId: "${languageId}", site: "${SITE_ID}") { seodescription } }`;
  try {
    const res = await fetch(`${HOST}/api/v1/graphql`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      next: { revalidate: 300 },
    });
    const json = await res.json();
    return json?.data?.page?.seodescription || undefined;
  } catch {
    return undefined;
  }
});
