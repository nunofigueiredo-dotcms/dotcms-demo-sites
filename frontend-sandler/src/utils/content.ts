import type { DotCMSPageContent, TrainingCenter } from "@/types/page";

/**
 * Translated items first; English fills in the rest, keeping English order.
 * GraphQL can return null entries (e.g. a translated event whose center has
 * no translation) and `usable` rejects incomplete ones, so both fall back too.
 */
export function withEnglishFallback<T>(
  translated: (T | null)[] = [],
  english: (T | null)[] = [],
  key: (item: T) => string,
  usable: (item: T) => boolean = () => true
): T[] {
  const ok = (item: T | null): item is T => item !== null && usable(item);
  const good = translated.filter(ok);
  if (!english.length) return good;
  const byKey = new Map(good.map((item) => [key(item), item]));
  return english.filter(ok).map((item) => byKey.get(key(item)) ?? item);
}

/** Every training center, in the page's language where translated. */
export function allCenters(content?: DotCMSPageContent): TrainingCenter[] {
  return withEnglishFallback(content?.centers, content?.centersEnglish, (c) => c.urlTitle);
}
