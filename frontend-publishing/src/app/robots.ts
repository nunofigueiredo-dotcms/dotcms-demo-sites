import type { MetadataRoute } from "next";

// Demo environment: keep every crawler out.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
