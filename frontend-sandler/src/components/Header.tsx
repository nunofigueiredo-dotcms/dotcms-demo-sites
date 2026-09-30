"use client";

import { Link } from "@/components/site/Locale";
import type { DotCMSNavigationItem } from "@dotcms/types";
import { MobileNav } from "./MobileNav";
import { Logo } from "./Logo";
import { useT } from "@/components/site/Strings";
import { navKey } from "@/utils/centers";

interface HeaderProps {
  navItems: DotCMSNavigationItem[];
  /** Logo only: no main menu or Let's Connect (pages on the "Sandler
   *  Center" template, which have their own center menu). */
  reduced?: boolean;
}

export default function Header({ navItems, reduced = false }: HeaderProps) {
  const t = useT();
  return (
    <header className="header">
      <div className="header__inner">
        <Link href="/" aria-label={t("brand.home")}>
          <Logo className="h-6 md:h-7 w-auto" />
        </Link>
        {!reduced && (
          <>
            <nav aria-label={t("nav.main")}>
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} target={item.target || undefined}>
                  {t(navKey(item.href), undefined, item.title)}
                </Link>
              ))}
            </nav>
            <Link href="/contact" className="btn btn--white btn--sm hidden md:inline-flex">
              {t("nav.letsConnect")}
            </Link>
            <MobileNav navItems={navItems} />
          </>
        )}
      </div>
    </header>
  );
}
