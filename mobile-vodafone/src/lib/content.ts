/**
 * Editors enter lists as one item per line with "|" between the parts, e.g.
 * "Store Locator | /store-locator | store". Missing parts come back as "".
 */
export function parseLines(value: unknown, parts: number): string[][] {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = line.split("|").map((cell) => cell.trim());
      return Array.from({ length: parts }, (_, i) => cells[i] ?? "");
    });
}

/** Checkbox fields come back as a list or as "a,b". */
export function checkboxValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
}

/** "3450" → "3,450" */
export function formatPrice(price: string): string {
  const n = Number(price.replace(/,/g, ""));
  return Number.isFinite(n) ? n.toLocaleString("en-US") : price;
}

/** A string field from a `_map`, or undefined. */
export function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
