/**
 * A dotCMS image field. Image fields reference an image in the site's media
 * library (/images/...). GraphQL collections return `{ idPath }`; a page's
 * `_map` returns the referenced asset with its `identifier`; the REST page
 * API returns the identifier as a string.
 */
export type DotCMSImageField =
  | string
  | { idPath?: string | null; identifier?: string | null }
  | null
  | undefined;

/** The "/dA/…" path for next/image (resized by utils/imageLoader), or undefined. */
export function imageSrc(image: DotCMSImageField): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return image.startsWith("/") ? image : `/dA/${image}`;
  if (image.idPath) return image.idPath;
  return image.identifier ? `/dA/${image.identifier}` : undefined;
}
