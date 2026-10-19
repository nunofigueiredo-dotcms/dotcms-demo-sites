"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Globe, Menu, X } from "lucide-react";
import type { DotCMSPageNavigation, SiteSettings } from "@/types/page";
import { parseLines } from "@/utils/content";
import { localizePath } from "@/utils/i18n";
import { Logo } from "./Logo";
import { useLocale } from "./site/Locale";

type NavItem = DotCMSPageNavigation["children"][number];

interface HeaderProps {
  /** Folders marked "Show on menu" in dotCMS, in menu order, with their subfolders. */
  navItems: NavItem[];
  settings?: SiteSettings;
  /** The dotCMS page path (no /ar prefix), for the language switch. */
  path: string;
  /** In the editor, which has its own language picker. */
  inEditor: boolean;
}

const trim = (href: string) => (href.length > 1 ? href.replace(/\/$/, "") : href);

/**
 * Folder titles are the English menu. Other languages take their titles from
 * the site settings in that language (Menu labels: "/folder | Title").
 */
function menuTitles(settings?: SiteSettings): Map<string, string> {
  return new Map(parseLines(settings?.menuLabels ?? "", 2).map(([path, title]) => [trim(path), title]));
}

export default function Header({ navItems, settings, path, inEditor }: HeaderProps) {
  const { locale, t, href } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const titles = menuTitles(settings);
  const label = (item: NavItem) => titles.get(trim(item.href)) || item.title;
  const current = trim(pathname);
  const isActive = (target: string) => current === href(trim(target)) || current.startsWith(`${href(trim(target))}/`);
  const other = locale === "ar" ? "en" : "ar";

  return (
    <header className="site-header">
      <div className="container-expo site-header__bar">
        <Link href={href("/")} aria-label={t("home")} className="site-header__logo">
          <Logo locale={locale} />
        </Link>

        <nav id="main-menu" aria-label={t("mainMenu")} className={open ? "main-nav is-open" : "main-nav"}>
          <ul className="main-nav__list">
            {navItems.map((item) => {
              const children = item.children ?? [];
              return (
                <li key={item.href} className={children.length ? "main-nav__item has-children" : "main-nav__item"}>
                  <Link
                    href={href(trim(item.href))}
                    className={isActive(item.href) ? "main-nav__link is-active" : "main-nav__link"}
                    onClick={() => setOpen(false)}
                  >
                    {label(item)}
                    {children.length > 0 && <ChevronDown aria-hidden className="h-4 w-4" />}
                  </Link>
                  {children.length > 0 && (
                    <ul className="main-nav__dropdown">
                      {children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={href(trim(child.href))}
                            aria-current={current === href(trim(child.href)) ? "page" : undefined}
                            onClick={() => setOpen(false)}
                          >
                            {label(child)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="site-header__actions">
          {!inEditor && (
            <a
              href={localizePath(path, other)}
              hrefLang={other}
              lang={other}
              className="lang-switch"
              aria-label={t("switchLanguageLabel")}
            >
              <Globe aria-hidden className="h-4 w-4" />
              {t("switchLanguage")}
            </a>
          )}
          <button
            type="button"
            className="menu-toggle"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            aria-expanded={open}
            aria-controls="main-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </header>
  );
}
