"use client";

import { Link, useLocale } from "@/components/site/Locale";
import { usePathname } from "next/navigation";
import { ChevronDown, MapPin } from "lucide-react";
import type { TrainingCenter } from "@/types/page";
import { CENTER_PAGES, centerHref, centerSolutions, centerPageKey, solutionKey } from "@/utils/centers";
import { localizeHref } from "@/utils/i18n";
import { useT } from "@/components/site/Strings";

/**
 * A center's own menu, shown on all of its pages: Overview, the solutions it
 * offers, About Us, Events and Contact Us — as on each go.sandler.com center.
 */
export function CenterNav({ center }: { center: TrainingCenter }) {
  const t = useT();
  const locale = useLocale();
  // The browser URL carries the language prefix (/es/…); compare like for like.
  const pathname = usePathname();
  const isActive = (href: string) => pathname === localizeHref(href, locale);
  const base = centerHref(center);
  const solutions = centerSolutions(center);
  const onSolution = solutions.some((s) => isActive(s.href));

  const linkClass = (href: string) =>
    `center-nav__link ${isActive(href) ? "center-nav__link--active" : ""}`;

  return (
    <nav className="center-nav" aria-label={t("center.pages", { center: center.title })}>
      <div className="center-nav__inner">
        <Link href={base} className="center-nav__name">
          <MapPin aria-hidden className="h-4 w-4 text-brand-cyan shrink-0" />
          <span className="truncate">{center.title}</span>
        </Link>
        <div className="center-nav__links">
          <Link href={base} className={linkClass(base)}>
            {t("center.overview")}
          </Link>
          {solutions.length > 0 && (
            <div className="center-nav__menu">
              <button
                type="button"
                className={`center-nav__link ${onSolution ? "center-nav__link--active" : ""}`}
                aria-haspopup="true"
              >
                {t("center.solutions")} <ChevronDown aria-hidden className="h-4 w-4" />
              </button>
              <ul className="center-nav__dropdown">
                {solutions.map((solution) => (
                  <li key={solution.label}>
                    <Link href={solution.href} className={linkClass(solution.href)}>
                      {t(solutionKey(solution.slug), undefined, solution.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {CENTER_PAGES.map((page) => {
            const href = `${base}/${page.path}`;
            return (
              <Link key={page.path} href={href} className={linkClass(href)}>
                {t(centerPageKey(page.path), undefined, page.label)}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
