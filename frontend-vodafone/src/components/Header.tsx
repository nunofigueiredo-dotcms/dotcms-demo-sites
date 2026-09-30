"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Search, UserRound, X } from "lucide-react";
import type { DotCMSNavigationItem } from "@dotcms/types";
import { Logo } from "./Logo";

// The dark top bar, as on web.vodafone.com.eg. These go to Vodafone's own
// site; only the main menu below comes from dotCMS.
const SWITCHER = [
  { title: "Personal", href: "/", active: true },
  { title: "Business", href: "https://web.vodafone.com.eg/en/business" },
  { title: "Network Coverage Map", href: "https://web.vodafone.com.eg/spa/NetworkCoverageChecker" },
  { title: "Vodafone Egypt Foundation", href: "https://web.vodafone.com.eg/en/foundation-home" },
];

interface HeaderProps {
  /** Folders marked "Show on menu" in dotCMS, in menu order. */
  navItems: DotCMSNavigationItem[];
}

export default function Header({ navItems }: HeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="site-header">
      <nav className="switcher" aria-label="Vodafone sites">
        <div className="container-vf switcher__inner">
          <ul>
            {SWITCHER.map((item) => (
              <li key={item.title}>
                <a href={item.href} className={item.active ? "switcher__link is-active" : "switcher__link"}>
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
          <span className="switcher__link switcher__lang" lang="ar" title="Arabic is coming soon">
            العربية
          </span>
        </div>
      </nav>

      <div className="nav-header">
        <div className="container-vf nav-header__inner">
          <Link href="/" aria-label="Vodafone home" className="nav-header__logo">
            <Logo className="h-9 w-9" />
          </Link>
          <nav aria-label="Main" className="nav-header__menu">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target={item.target === "_blank" ? "_blank" : undefined}
                className={isActive(item.href) ? "nav-link is-active" : "nav-link"}
              >
                {item.title}
              </Link>
            ))}
            <a className="nav-link" href="https://eshop.vodafone.com.eg/en/" target="_blank" rel="noopener">
              Shop
            </a>
          </nav>
          <div className="nav-header__actions">
            <button type="button" className="icon-button" aria-label="Search">
              <Search className="h-6 w-6" strokeWidth={1.5} />
            </button>
            <a className="icon-button" href="https://web.vodafone.com.eg/spa/myHome" aria-label="My Vodafone">
              <UserRound className="h-6 w-6" strokeWidth={1.5} />
            </a>
            <button
              type="button"
              className="icon-button lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {open && (
          <nav aria-label="Main (mobile)" className="mobile-menu lg:hidden">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.title} <ChevronRight className="h-5 w-5 text-brand-red" />
              </Link>
            ))}
            {SWITCHER.slice(1).map((item) => (
              <a key={item.title} href={item.href} className="mobile-menu__secondary">
                {item.title}
              </a>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
