import type { NextConfig } from "next";

// Optional so the build still succeeds where dotCMS isn't configured (CI, a
// preview deploy). Without a host there's nothing to proxy or load images
// from, so those rules are simply omitted rather than built from `undefined`.
const DOTCMS_HOST = process.env.NEXT_PUBLIC_DOTCMS_HOST;
const DOTCMS_HOSTNAME = DOTCMS_HOST?.replace(/^https?:\/\//, "");

const RENAMED_CENTERS: Record<string, string> = {
  "downtown-boston": "gnatraining-downtown-boston",
  minnesota: "salespro",
  mississauga: "singh",
  "london-city": "londoncity",
  irvine: "cora",
  "fort-wayne": "wilcox",
};

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    loader: "custom",
    loaderFile: "./src/utils/imageLoader.ts",
    remotePatterns: DOTCMS_HOSTNAME
      ? [
          {
            protocol: "https",
            hostname: DOTCMS_HOSTNAME,
            port: "",
            pathname: "/**",
          },
        ]
      : [],
  },
  async rewrites() {
    if (!DOTCMS_HOST) return [];

    return [
      {
        source: "/dA/:path*",
        destination: `${DOTCMS_HOST}/dA/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*/index",
        destination: "/:path*/",
        permanent: true,
      },
      // Center URLs now use each center's go.sandler.com identifier
      // (e.g. /locations/wilcox) instead of its city.
      ...Object.entries(RENAMED_CENTERS).flatMap(([from, to]) =>
        ["", "/es", "/fr"].map((prefix) => ({
          source: `${prefix}/locations/${from}/:path*`,
          destination: `${prefix}/locations/${to}/:path*`,
          permanent: true,
        }))
      ),
    ];
  },
};

export default nextConfig;
