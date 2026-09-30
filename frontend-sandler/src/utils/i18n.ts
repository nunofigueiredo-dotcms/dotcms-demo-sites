/**
 * Site languages. English is served at the root; the others under a prefix
 * (/es/…, /fr/…). Each maps to a dotCMS language by its ISO code — the
 * numeric dotCMS language IDs differ per instance, so they are looked up at
 * runtime (utils/languages.ts).
 */
export const LOCALES = [
  { code: "en", label: "English", short: "EN" },
  { code: "es", label: "Español", short: "ES" },
  { code: "fr", label: "Français", short: "FR" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: Locale = "en";

/** Request header set by src/proxy.ts with the locale from the URL prefix. */
export const LOCALE_HEADER = "x-sandler-locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.some((l) => l.code === value);
}

/** "/es/articles/x" → { locale: "es", path: "/articles/x" }. */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const [, first, ...rest] = pathname.split("/");
  if (isLocale(first) && first !== DEFAULT_LOCALE) {
    return { locale: first, path: `/${rest.join("/")}` };
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}

/** Prefix an internal link with the locale; external links pass through. */
export function localizeHref(href: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE || !href.startsWith("/") || href.startsWith("//")) return href;
  if (splitLocale(href).locale !== DEFAULT_LOCALE) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

/** BCP 47 tag for dates, e.g. "es" → "es-ES". */
export function dateLocale(locale: Locale): string {
  return { en: "en-US", es: "es-ES", fr: "fr-FR" }[locale];
}
