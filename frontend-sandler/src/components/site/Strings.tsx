"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useLocale } from "./Locale";
import { translate, type LanguageVariable } from "@/utils/strings";

const StringsContext = createContext<Record<string, string>>({});

/** The page's dotCMS Language Variables (sandler.*), in the page's language. */
export function StringsProvider({
  variables,
  children,
}: {
  variables: LanguageVariable[];
  children: ReactNode;
}) {
  const map = Object.fromEntries(variables.map((v) => [v.key, v.value]));
  return <StringsContext.Provider value={map}>{children}</StringsContext.Provider>;
}

/**
 * Interface labels in the visitor's language:
 *   const t = useT();  t("center.directions")  t("center.call", { phone })
 * An editor's value in dotCMS (Language Variable "sandler.<key>") wins;
 * otherwise the default from src/i18n/ui-strings.json.
 */
export function useT() {
  const locale = useLocale();
  const overrides = useContext(StringsContext);
  return useCallback(
    (key: string, vars?: Record<string, string | number>, fallback?: string) =>
      translate(key, locale, overrides, vars, fallback),
    [locale, overrides]
  );
}
