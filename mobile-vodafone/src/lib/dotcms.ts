import { DOTCMS_HOST, DOTCMS_TOKEN } from "./config";

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

/** Run a query against dotCMS's GraphQL endpoint (POST /api/v1/graphql). */
export async function graphql<T>(query: string): Promise<T> {
  if (!DOTCMS_TOKEN) {
    throw new Error("EXPO_PUBLIC_DOTCMS_AUTH_TOKEN is not set. Add it to .env.local and restart Expo.");
  }
  const res = await fetch(`${DOTCMS_HOST}/api/v1/graphql`, {
    method: "POST",
    headers: { Authorization: `Bearer ${DOTCMS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`dotCMS GraphQL returned ${res.status}`);
  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  if (!json.data) throw new Error("dotCMS GraphQL returned no data");
  return json.data;
}

/**
 * A dotCMS image field, referencing an image in the site's media library.
 * GraphQL collections return `{ idPath }`; a page's `_map` returns the
 * referenced asset with its `identifier`.
 */
export type ImageField = { idPath?: string | null; identifier?: string | null } | string | null | undefined;

/**
 * Full URL for a dotCMS image, resized on the server: "/dA/{id}/{field}/{name}"
 * or "/dA/{id}" becomes ".../{width}w/80q" (80q also switches to WebP).
 */
export function imageUrl(image: ImageField, width = 800): string | undefined {
  const path =
    typeof image === "string"
      ? image.startsWith("/") ? image : `/dA/${image}`
      : image?.idPath ?? (image?.identifier ? `/dA/${image.identifier}` : undefined);
  if (!path) return undefined;
  const base = path.split("?")[0].replace(/\/[^/]+\.[a-z0-9]+$/i, "");
  return `${DOTCMS_HOST}${base}/${width}w/80q`;
}
