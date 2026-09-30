"use client";

import { Link } from "@/components/site/Locale";
import type { DotCMSNavigationItem } from "@dotcms/types";
import { Logo } from "./Logo";
import { useSiteData } from "./site/SiteData";
import { centerHref, telHref, navKey } from "@/utils/centers";
import { useT } from "@/components/site/Strings";

interface FooterProps {
  navItems: DotCMSNavigationItem[];
}

export default function Footer({ navItems }: FooterProps) {
  const t = useT();
  const { selectedCenter } = useSiteData();

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="max-w-xs">
          <Logo className="h-6 w-auto" />
          <p className="mt-5">{t("brand.taglineLong")}</p>
        </div>

        <nav aria-label={t("footer.nav")}>
          <h2>{t("footer.explore")}</h2>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {t(navKey(item.href), undefined, item.title)}
            </Link>
          ))}
          <Link href="/contact">{t("nav.letsConnect")}</Link>
        </nav>

        <div>
          <h2>{t("footer.yourCenter")}</h2>
          {selectedCenter ? (
            <>
              <Link href={centerHref(selectedCenter)}>{selectedCenter.title}</Link>
              <p>{selectedCenter.address}</p>
              {selectedCenter.phone && (
                <a href={telHref(selectedCenter.phone)}>{selectedCenter.phone}</a>
              )}
            </>
          ) : (
            <Link href="/locations">{t("footer.findCenter")}</Link>
          )}
        </div>

        <div>
          <h2>{t("footer.headquarters")}</h2>
          <p>
            300 Red Brook Blvd, Suite 10
            <br />
            Owings Mills, MD 21117
          </p>
        </div>
      </div>
      <div className="footer__legal">
        <p>
          &copy;{new Date().getFullYear()} Sandler Systems, LLC. {t("footer.rights")}
        </p>
        <p className="shrink-0">{t("footer.demo")}</p>
      </div>
    </footer>
  );
}
