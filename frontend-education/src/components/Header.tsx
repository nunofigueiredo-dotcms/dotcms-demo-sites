"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import type { DotCMSPageNavigation, SiteSettings } from "@/types/page";
import { Logo } from "./Logo";
import { links, socialLinks } from "./social";

// The search box is TSD's own site search.
const SEARCH = "https://www.tsd.texas.gov/apps/search";

type NavItem = DotCMSPageNavigation["children"][number];

interface HeaderProps {
  /** Folders marked "Show on menu" in dotCMS, in menu order, with their subfolders. */
  navItems: NavItem[];
  /** TSD Site Settings: the top bar's links and the social icons. */
  settings?: SiteSettings;
}

/** The menu comes from dotCMS folders; the top bar from TSD Site Settings. */
export default function Header({ navItems, settings }: HeaderProps) {
  const audiences = links(settings?.utilityLinks);
  const social = socialLinks(settings?.socialLinks);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="site-header">
      <div className="utility-bar">
        <div className="container-tsd utility-bar__inner">
          <nav aria-label="Audiences">
            <ul>
              {audiences.map((item) => (
                <li key={item.title}>
                  <a href={item.href}>{item.title}</a>
                </li>
              ))}
            </ul>
          </nav>
          <ul className="utility-bar__social">
            {social.map(({ label, href, Icon }) => (
              <li key={label}>
                <a href={href} aria-label={label} target="_blank" rel="noopener">
                  <Icon aria-hidden className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="main-header">
        <div className="container-tsd main-header__inner">
          <Link href="/" aria-label="Texas School for the Deaf home">
            <Logo />
          </Link>
          <button
            type="button"
            className="menu-toggle lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="main-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </button>
        </div>
        <nav id="main-menu" aria-label="Main" className={open ? "main-nav is-open" : "main-nav"}>
          <ul className="container-tsd main-nav__list">
            {navItems.map((item) => {
              const children = item.children ?? [];
              return (
                <li key={item.href} className={children.length ? "main-nav__item has-children" : "main-nav__item"}>
                  <Link
                    href={item.href}
                    className={isActive(item.href) ? "main-nav__link is-active" : "main-nav__link"}
                    aria-current={pathname === item.href ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {item.title}
                    {children.length > 0 && <ChevronDown aria-hidden className="h-4 w-4 max-lg:hidden" />}
                  </Link>
                  {children.length > 0 && (
                    <ul className="main-nav__dropdown">
                      {children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            aria-current={pathname === child.href ? "page" : undefined}
                            onClick={() => setOpen(false)}
                          >
                            {child.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            <li className="main-nav__item main-nav__item--search">
              <a className="main-nav__link" href={SEARCH} aria-label="Search">
                <Search aria-hidden className="h-5 w-5" />
                <span className="lg:hidden">Search</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
