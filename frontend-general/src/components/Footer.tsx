"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import type { DotCMSPageNavigation, SiteSettings } from "@/types/page";
import { parseLines } from "@/utils/content";
import { Logo } from "./Logo";
import { SmartLink } from "./SmartLink";
import { useLocale } from "./site/Locale";

interface FooterProps {
  navItems: DotCMSPageNavigation["children"];
  settings?: SiteSettings;
}

const trim = (href: string) => (href.length > 1 ? href.replace(/\/$/, "") : href);

/** Everything here comes from the menu folders and the site settings in dotCMS. */
export default function Footer({ navItems, settings }: FooterProps) {
  const { locale, t, href } = useLocale();
  const titles = new Map(parseLines(settings?.menuLabels ?? "", 2).map(([p, title]) => [trim(p), title]));
  const label = (item: { href: string; title: string }) => titles.get(trim(item.href)) || item.title;
  const links = parseLines(settings?.footerLinks ?? "", 2);
  const social = parseLines(settings?.socialLinks ?? "", 2);

  return (
    <footer className="site-footer">
      <div className="container-expo site-footer__grid">
        <div className="site-footer__brand">
          <Logo locale={locale} white />
          {settings?.tagline && <p>{settings.tagline}</p>}
          {social.length > 0 && (
            <ul className="site-footer__social" aria-label={t("followUs")}>
              {social.map(([name, link]) => (
                <li key={name}>
                  <a href={link} target="_blank" rel="noopener">
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {navItems.map((item) => (
          <nav key={item.href} aria-label={label(item)}>
            <h2>
              <Link href={href(trim(item.href))}>{label(item)}</Link>
            </h2>
            <ul>
              {(item.children ?? []).map((child) => (
                <li key={child.href}>
                  <Link href={href(trim(child.href))}>{label(child)}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2>{t("contact")}</h2>
          <ul className="site-footer__contact">
            {settings?.address && (
              <li>
                <MapPin aria-hidden className="h-4 w-4" />
                {settings.address}
              </li>
            )}
            {settings?.phone && (
              <li>
                <Phone aria-hidden className="h-4 w-4" />
                <a href={`tel:${settings.phone.replace(/\s/g, "")}`} dir="ltr">
                  {settings.phone}
                </a>
              </li>
            )}
            {settings?.email && (
              <li>
                <Mail aria-hidden className="h-4 w-4" />
                <a href={`mailto:${settings.email}`}>{settings.email}</a>
              </li>
            )}
          </ul>
          {links.length > 0 && (
            <ul className="site-footer__links">
              {links.map(([text, link]) => (
                <li key={text}>
                  <SmartLink href={link}>{text}</SmartLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="container-expo site-footer__legal">
        © {new Date().getFullYear()} {t("rights")}
      </p>
    </footer>
  );
}
