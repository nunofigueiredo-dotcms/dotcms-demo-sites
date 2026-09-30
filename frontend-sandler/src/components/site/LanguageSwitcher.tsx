"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { useLocale } from "./Locale";
import { LOCALES, localizeHref, splitLocale } from "@/utils/i18n";
import { useT } from "@/components/site/Strings";

/**
 * EN / ES / FR links to the current page in each language. Pages without a
 * translation still open — dotCMS falls back to the English content.
 */
export function LanguageSwitcher() {
  const t = useT();
  const current = useLocale();
  const { path } = splitLocale(usePathname() || "/");

  return (
    <nav className="language-switcher" aria-label={t("nav.language")}>
      <Globe aria-hidden className="h-4 w-4 text-brand-cyan" />
      {LOCALES.map((l) => (
        <NextLink
          key={l.code}
          href={localizeHref(path, l.code)}
          hrefLang={l.code}
          lang={l.code}
          title={l.label}
          aria-current={l.code === current ? "true" : undefined}
        >
          {l.short}
        </NextLink>
      ))}
    </nav>
  );
}
