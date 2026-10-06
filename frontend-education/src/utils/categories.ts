/** A dotCMS category, as GraphQL returns it. */
export interface Category {
  key: string;
  name: string;
}

/**
 * Category fields arrive in three shapes depending on the API: GraphQL
 * collections give [{ key, name }], the page API gives
 * { categories: [{ key, name, … }] }, and REST gives [{ "key": "name" }].
 */
export function toCategories(field: unknown): Category[] {
  const list = Array.isArray(field)
    ? field
    : field && typeof field === "object" && Array.isArray((field as { categories?: unknown }).categories)
      ? (field as { categories: unknown[] }).categories
      : [];
  return list.flatMap((item): Category[] => {
    if (!item || typeof item !== "object") return [];
    const c = item as Record<string, unknown>;
    if (typeof c.key === "string") return [{ key: c.key, name: String(c.name ?? c.key) }];
    const [key, name] = Object.entries(c)[0] ?? [];
    return typeof key === "string" ? [{ key, name: String(name) }] : [];
  });
}

/**
 * Colours for the TSD Event Categories and TSD News Categories in dotCMS
 * (Content → Categories), in display order. All pass WCAG AA with white
 * text. A category editors add later shows in the default navy, after these.
 */
const CATEGORY_COLORS: Record<string, string> = {
  "tsd-academic": "#041436",
  "tsd-testing": "#3e6581",
  "tsd-no-school": "#b5245f",
  "tsd-family": "#1f6f43",
  "tsd-athletics": "#a3470f",
  "tsd-student-life": "#5b3f99",
  "tsd-community": "#2c5e8c",
  "tsd-outreach": "#0e5f6e",
  "tsd-news-announcements": "#b5245f",
  "tsd-news-lone-star": "#041436",
  "tsd-news-the-roots": "#5b3f99",
  "tsd-news-programs": "#0e5f6e",
  "tsd-news-recognition": "#a3470f",
  "tsd-news-academics": "#3e6581",
  "tsd-news-athletics": "#1f6f43",
  "tsd-dept-administration": "#041436",
  "tsd-dept-admissions": "#b5245f",
  "tsd-dept-elc": "#a3470f",
  "tsd-dept-elementary": "#1f6f43",
  "tsd-dept-middle": "#2c5e8c",
  "tsd-dept-high": "#3e6581",
  "tsd-dept-access": "#5b3f99",
  "tsd-dept-student-life": "#0e5f6e",
  "tsd-dept-support": "#7a4a12",
  "tsd-dept-outreach": "#0e5f6e",
  "tsd-dept-hr": "#4c5869",
  "tsd-topic-admissions": "#b5245f",
  "tsd-topic-handbooks": "#041436",
  "tsd-topic-policies": "#3e6581",
  "tsd-topic-safety": "#a3470f",
  "tsd-topic-student-life": "#0e5f6e",
  "tsd-topic-visiting": "#1f6f43",
  "tsd-topic-accessibility": "#5b3f99",
  "tsd-topic-staff": "#4c5869",
};
const ORDER = Object.keys(CATEGORY_COLORS);

export function categoryColor(key: string | undefined): string {
  return (key && CATEGORY_COLORS[key]) || "#041436";
}

/** Known categories in their display order, then any others alphabetically. */
export function sortCategories(categories: Category[]): Category[] {
  const rank = (c: Category) => (ORDER.includes(c.key) ? ORDER.indexOf(c.key) : ORDER.length);
  return [...categories].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** The distinct categories of a list of items, in display order. */
export function distinctCategories(lists: Category[][]): Category[] {
  const byKey = new Map<string, Category>();
  for (const c of lists.flat()) byKey.set(c.key, c);
  return sortCategories([...byKey.values()]);
}
