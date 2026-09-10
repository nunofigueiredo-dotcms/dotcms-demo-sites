"use client";

import Image, { type ImageProps } from "next/image";
import ImageLoader from "@/utils/imageLoader";

export type DotCMSImageSrc =
  | { idPath?: string | null; identifier?: string | null; title?: string | null }
  | string;

type DotCMSImageProps = Omit<ImageProps, "src" | "loader"> & {
  src: DotCMSImageSrc;
};

function resolveSrc(src: DotCMSImageSrc): string {
  if (typeof src === "object") return src.idPath || src.identifier || "";
  return src;
}

export default function DotCMSImage({ src, alt, ...props }: DotCMSImageProps) {
  return (
    <Image {...props} alt={alt} src={resolveSrc(src)} loader={ImageLoader} />
  );
}
