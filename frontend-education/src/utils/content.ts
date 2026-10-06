/**
 * Editors enter lists as one item per line with "|" between the parts, e.g.
 * "School Calendar | /calendar | calendar". Blank lines are skipped and
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

/** Paragraphs from a text area: a blank line starts a new one. */
export function paragraphs(value: string | undefined): string[] {
  return (value ?? "")
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Checkbox fields arrive as "a,b", as a list of strings, or as a list of
 * { key, value } objects, depending on the API. Always returns the values.
 */
export function checkboxValues(field: unknown): string[] {
  if (!field) return [];
  if (typeof field === "string") return field.split(",").map((v) => v.trim()).filter(Boolean);
  if (Array.isArray(field)) {
    return field
      .map((v) => (typeof v === "string" ? v : ((v as { value?: string }).value ?? "")))
      .filter(Boolean);
  }
  return [];
}

/** True when a checkbox field has `value` ticked. */
export function isChecked(field: unknown, value = "true"): boolean {
  return checkboxValues(field).includes(value);
}
