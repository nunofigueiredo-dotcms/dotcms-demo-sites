import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/utils/seo";

/** Search engines and AI crawlers are welcome; the sitemap lists every page. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
