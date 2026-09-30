import type { Metadata } from "next";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "";
}

function toAbsoluteUrl(path: string): string {
  const base = getBaseUrl().replace(/\/$/, "");
  const pathStr = path.startsWith("/") ? path : `/${path}`;
  return pathStr === "/" ? base : `${base}${pathStr}`;
}

export function buildPageMetadata({
  title,
  description,
  path,
  imageUrl,
  type = "website",
}: {
  title?: string;
  description?: string;
  path?: string;
  imageUrl?: string;
  type?: "website" | "article";
}): Metadata {
  const url = toAbsoluteUrl(path || "/") || undefined;
  return {
    title: title || "Page",
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type,
      ...(imageUrl && { images: [{ url: imageUrl }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
