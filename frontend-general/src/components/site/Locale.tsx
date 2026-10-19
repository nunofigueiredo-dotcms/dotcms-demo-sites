"use client";

import { createContext, useContext, type ReactNode } from "react";
import { localizePath, t, type Locale, type StringKey } from "@/utils/i18n";

interface LocaleValue {
  locale: Locale;
  /**
   * True on the public site. Inside the Universal Visual Editor links stay
   * unprefixed: the editor navigates by dotCMS page path and picks the
   * language itself.
   */
  prefixLinks: boolean;
}

const LocaleContext = createContext<LocaleValue>({ locale: "en", prefixLinks: true });

export function LocaleProvider({ children, ...value }: LocaleValue & { children: ReactNode }) {
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** The page's language, its interface strings, and links in that language. */
export function useLocale() {
  const { locale, prefixLinks } = useContext(LocaleContext);
  return {
    locale,
    t: (key: StringKey) => t(key, locale),
    href: (path: string) => (prefixLinks ? localizePath(path, locale) : path),
  };
}
