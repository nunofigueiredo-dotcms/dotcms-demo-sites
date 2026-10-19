import type { NextConfig } from "next";

// Optional so the build still succeeds where dotCMS isn't configured (CI, a
// preview deploy). Without a host there's nothing to proxy or load images
// from, so those rules are simply omitted rather than built from `undefined`.
const DOTCMS_HOST = process.env.NEXT_PUBLIC_DOTCMS_HOST;
const DOTCMS_HOSTNAME = DOTCMS_HOST?.replace(/^https?:\/\//, "");

// The site's public address, for canonical links, the sitemap and structured
// data. On Vercel it defaults to the production domain Vercel provides at
// build time. Set here so the server and the browser use the same value.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");

const nextConfig: NextConfig = {
  reactStrictMode: false,
  env: { NEXT_PUBLIC_SITE_URL: SITE_URL },
  // Content Analytics finds the site from the browser's Origin, so the demo
  // runs at http://general.localhost:3009 (a dotCMS site alias).
  allowedDevOrigins: ["general.localhost"],
  images: {
    loader: "custom",
    loaderFile: "./src/utils/imageLoader.ts",
    remotePatterns: DOTCMS_HOSTNAME
      ? [{ protocol: "https", hostname: DOTCMS_HOSTNAME, port: "", pathname: "/**" }]
      : [],
  },
  async rewrites() {
    if (!DOTCMS_HOST) return [];
    return [{ source: "/dA/:path*", destination: `${DOTCMS_HOST}/dA/:path*` }];
  },
  async redirects() {
    return [{ source: "/:path*/index", destination: "/:path*/", permanent: true }];
  },
};

export default nextConfig;
