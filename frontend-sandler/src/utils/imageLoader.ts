import type { ImageLoaderProps } from "next/image";

// `new URL` throws on a missing host, which would break the build wherever
// dotCMS isn't configured (CI, a preview deploy). Fall back to a relative URL:
// the /dA/ rewrite resolves it when a host is set, and images simply 404
// otherwise instead of failing the build.
const dotcmsOrigin = process.env.NEXT_PUBLIC_DOTCMS_HOST
  ? new URL(process.env.NEXT_PUBLIC_DOTCMS_HOST).origin
  : "";

/**
 * Binary fields arrive as "/dA/{id}/image/{file name}". dotCMS resizes when
 * the file name is replaced by "{width}w"; adding a quality ("80q") switches
 * the output to WebP, which is far smaller than the original.
 */
const ImageLoader = ({ src, width = 250 }: ImageLoaderProps): string => {
  // GraphQL's idPath carries a "?language_id=1" suffix; drop it first.
  const path = (src.startsWith("/dA/") ? src : `/dA/${src}`).split("?")[0];
  const base = path.replace(/\/[^/]+\.[a-z0-9]+$/i, "");
  return `${dotcmsOrigin}${base}/${width}w/80q`;
};

export default ImageLoader;
