import type { NextConfig } from "next";

const DOTCMS_HOST = process.env.NEXT_PUBLIC_DOTCMS_HOST || process.env.DOTCMS_URL;

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ["publishing-demo.localhost"],
  // Files (the article PDFs) are served by dotCMS through this site.
  async rewrites() {
    if (!DOTCMS_HOST) return [];
    return [{ source: "/dA/:path*", destination: `${DOTCMS_HOST.replace(/\/$/, "")}/dA/:path*` }];
  },
  async headers() {
    // A demo environment: keep it out of search engines even if a link leaks.
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
