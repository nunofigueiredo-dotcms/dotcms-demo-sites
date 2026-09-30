import uiStrings from "@/i18n/ui-strings.json";
import type { Locale } from "./i18n";

/** A dotCMS Language Variable. Keys used by this site start with "sandler.". */
export interface LanguageVariable {
  key: string;
  value: string;
}

const LANGUAGE_VARIABLE_PREFIX = "sandler.";

type Entry = Partial<Record<Locale, string>>;
const DEFAULTS = uiStrings as unknown as Record<string, Entry>;

/**
 * One interface label: the dotCMS value if an editor set one, else this
 * language's default, else English, else the key itself (so a missing label
 * is visible rather than blank). "{name}" placeholders are filled from vars.
 */
export function translate(
  key: string,
  locale: Locale,
  overrides: Record<string, string> = {},
  vars?: Record<string, string | number>,
  /** Shown when the key has no text at all, e.g. a menu item's own title. */
  fallback?: string
): string {
  const entry = DEFAULTS[key];
  const text = overrides[LANGUAGE_VARIABLE_PREFIX + key] ?? entry?.[locale] ?? entry?.en ?? fallback ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, name) => String(vars[name] ?? m)) : text;
}
