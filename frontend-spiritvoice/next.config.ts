import type { NextConfig } from "next";

// Optional so the build still succeeds where dotCMS isn't configured (CI, a
// preview deploy). Without a host there's nothing to proxy or load images
// from, so those rules are simply omitted rather than built from `undefined`.
const DOTCMS_HOST = process.env.NEXT_PUBLIC_DOTCMS_HOST;
const DOTCMS_HOSTNAME = DOTCMS_HOST?.replace(/^https?:\/\//, "");

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
    ];
  },
};

export default nextConfig;
