/**
 * Editors enter lists as one item per line with "|" between the parts, e.g.
 * "Store Locator | /store-locator | store". Blank lines are skipped and
 * missing parts come back as "".
 */
export function parseLines(value: string | undefined, parts: number): string[][] {
  return (value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = line.split("|").map((cell) => cell.trim());
      return Array.from({ length: parts }, (_, i) => cells[i] ?? "");
    });
}

/** "Order" fields are text; items without one go last. */
export function byDisplayOrder<T extends { displayOrder?: string }>(a: T, b: T): number {
  const n = (item: T) => Number(item.displayOrder) || Number.MAX_SAFE_INTEGER;
  return n(a) - n(b);
}

/**
 * Checkbox fields arrive as "a,b", as a list of strings, or as a list of
 * { key, value } objects, depending on the API. Always returns the values.
 */
export function checkboxValues(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean);
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : (v as { value?: string; key?: string }).value ?? ""))
      .filter(Boolean);
  }
  return [];
}

/** "3450" → "3,450" */
export function formatPrice(price: string): string {
  const n = Number(price.replace(/,/g, ""));
  return Number.isFinite(n) ? n.toLocaleString("en-US") : price;
}
