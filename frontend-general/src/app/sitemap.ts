import type { MetadataRoute } from "next";
import { localizePath } from "@/utils/i18n";
import { absoluteUrl } from "@/utils/seo";
import { siteIndex } from "@/utils/siteIndex";

export const revalidate = 300;

/** Every page in English, with its Arabic version as an alternate. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await siteIndex();
  return pages.map((p) => ({
    url: absoluteUrl(p.path),
    lastModified: p.modified ? new Date(p.modified) : undefined,
    alternates: { languages: { en: absoluteUrl(p.path), ar: absoluteUrl(localizePath(p.path, "ar")) } },
  }));
}
