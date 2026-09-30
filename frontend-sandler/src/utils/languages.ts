import { cache } from "react";
import { headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale, type Locale } from "./i18n";

const DOTCMS_HOST = process.env.NEXT_PUBLIC_DOTCMS_HOST || "http://localhost:8082";

/** The locale of the current request (set by src/proxy.ts). Server only. */
export async function getLocale(): Promise<Locale> {
  const value = (await headers()).get(LOCALE_HEADER);
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * dotCMS language IDs by ISO code ("es" → 2). IDs differ between instances,
 * so they are read from dotCMS (and cached for an hour) instead of hard-coded.
 */
const languageIds = cache(async (): Promise<Record<string, number>> => {
  try {
    const res = await fetch(`${DOTCMS_HOST}/api/v2/languages`, {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_DOTCMS_AUTH_TOKEN}` },
      next: { revalidate: 3600 },
    });
    const { entity } = (await res.json()) as { entity: { id: number; languageCode: string }[] };
    return Object.fromEntries(entity.map((l) => [l.languageCode, l.id]));
  } catch {
    return { en: 1 };
  }
});

/** The dotCMS language ID for the current request's locale (English = 1). */
export async function getLanguageId(): Promise<number> {
  const locale = await getLocale();
  return (await languageIds())[locale] ?? 1;
}
