"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import type { DotCMSPageNavigation } from "@/types/page";
import { Logo } from "./Logo";
import { SOCIAL } from "./social";

const TSD = "https://www.tsd.texas.gov";

// The top bar, as on tsd.texas.gov. These go to TSD's own site; only the
// main menu below comes from dotCMS.
const AUDIENCES = [
  { title: "Students", href: `${TSD}/apps/pages/index.jsp?uREC_ID=170309&type=d` },
  { title: "Parents", href: `${TSD}/apps/pages/index.jsp?uREC_ID=170252&type=d` },
  { title: "Staff", href: `${TSD}/apps/pages/index.jsp?uREC_ID=170310&type=d` },
  { title: "TSD Careers", href: `${TSD}/apps/pages/index.jsp?uREC_ID=170377&type=d&pREC_ID=860684` },
];

type NavItem = DotCMSPageNavigation["children"][number];

interface HeaderProps {
  /** Folders marked "Show on menu" in dotCMS, in menu order, with their subfolders. */
  navItems: NavItem[];
}

export default function Header({ navItems }: HeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="site-header">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <div className="utility-bar">
        <div className="container-tsd utility-bar__inner">
          <nav aria-label="Audiences">
            <ul>
              {AUDIENCES.map((item) => (
                <li key={item.title}>
                  <a href={item.href}>{item.title}</a>
                </li>
              ))}
            </ul>
          </nav>
          <ul className="utility-bar__social">
            {SOCIAL.map(({ label, href, Icon }) => (
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
              <a className="main-nav__link" href={`${TSD}/apps/search`} aria-label="Search">
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
