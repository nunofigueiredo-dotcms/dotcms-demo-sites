"use client";

import { createContext, useCallback, useContext, type ComponentProps, type ReactNode } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_LOCALE, localizeHref, type Locale } from "@/utils/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** next/link that keeps the visitor's language: "/articles" → "/es/articles". */
export function Link({ href, ...props }: ComponentProps<typeof NextLink> & { href: string }) {
  const locale = useLocale();
  return <NextLink href={localizeHref(href, locale)} {...props} />;
}

/** router.push that keeps the visitor's language. */
export function useLocalizedPush() {
  const router = useRouter();
  const locale = useLocale();
  return useCallback((href: string) => router.push(localizeHref(href, locale)), [router, locale]);
}
