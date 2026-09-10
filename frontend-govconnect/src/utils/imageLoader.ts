import type { ImageLoaderProps } from "next/image";

// `new URL` throws on a missing host, which would break the build wherever
// dotCMS isn't configured (CI, a preview deploy). Fall back to a relative URL:
// the /dA/ rewrite resolves it when a host is set, and images simply 404
// otherwise instead of failing the build.
const dotcmsOrigin = process.env.NEXT_PUBLIC_DOTCMS_HOST
  ? new URL(process.env.NEXT_PUBLIC_DOTCMS_HOST).origin
  : "";

const ImageLoader = ({ src, width = 250 }: ImageLoaderProps): string => {
  const imageSRC = src.includes("/dA/") ? src : `/dA/${src}`;
  return `${dotcmsOrigin}${imageSRC}/${width}w`;
};

export default ImageLoader;
