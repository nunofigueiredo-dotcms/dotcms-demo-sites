import type { Metadata } from "next";
import { localizePath, type Locale } from "./i18n";

export const SITE_NAME = { en: "Expo City Dubai", ar: "مدينة إكسبو دبي" } as const;

export function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  return `${baseUrl()}${path === "/" ? "" : path}` || "/";
}

/**
 * Title, description, canonical URL and the page's other language
 * (hreflang), so search engines and AI answer engines show visitors the page
 * in their language.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  locale,
  imageUrl,
  type = "website",
}: {
  title?: string;
  description?: string;
  /** The dotCMS page path, without the /ar prefix. */
  path: string;
  locale: Locale;
  imageUrl?: string;
  type?: "website" | "article";
}): Metadata {
  const url = absoluteUrl(localizePath(path, locale));
  return {
    title: title || SITE_NAME[locale],
    description,
    alternates: {
      canonical: url,
      languages: {
        en: absoluteUrl(path),
        ar: absoluteUrl(localizePath(path, "ar")),
        "x-default": absoluteUrl(path),
      },
    },
    openGraph: {
      title,
      description,
      url,
      type,
      siteName: SITE_NAME[locale],
      locale: locale === "ar" ? "ar_AE" : "en_GB",
      ...(imageUrl && { images: [{ url: imageUrl }] }),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
