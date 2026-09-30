/**
 * A dotCMS binary (image) field. The REST page API returns a path string
 * ("/dA/{id}/image/{file}"); the GraphQL page API — which the SDK uses —
 * returns an object whose `idPath` is that same path.
 */
export type DotCMSImageField = string | { idPath?: string | null } | null | undefined;

/** The "/dA/…" path for next/image (resized by utils/imageLoader), or undefined. */
export function imageSrc(image: DotCMSImageField): string | undefined {
  if (!image) return undefined;
  const path = typeof image === "string" ? image : image.idPath;
  return path || undefined;
}
