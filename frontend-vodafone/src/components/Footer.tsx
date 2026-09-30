import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import type { DotCMSNavigationItem } from "@dotcms/types";
import { Logo } from "./Logo";

const VF = "https://web.vodafone.com.eg/en";

// The fixed footer columns from web.vodafone.com.eg. "Products and services"
// also lists this site's dotCMS menu, so new sections appear here too.
const COLUMNS = [
  {
    title: "About Vodafone",
    links: [
      { title: "About Vodafone", href: `${VF}/about-us` },
      { title: "Careers", href: "https://careers.vodafone.com/" },
      { title: "News & press releases", href: `${VF}/latest-news-2022` },
      { title: "TV Commercials", href: `${VF}/home` },
    ],
  },
  {
    title: "Help",
    links: [
      { title: "Services FAQ's", href: `${VF}/faq` },
      { title: "Call us", href: "tel:888" },
      { title: "Store Locator", href: "/store-locator" },
      { title: "Contact us", href: "https://web.vodafone.com.eg/spa/contact-us" },
    ],
  },
];

const SOCIAL = [
  { label: "Facebook", href: "https://www.facebook.com/Vodafone.Egypt/", Icon: Facebook },
  { label: "X (Twitter)", href: "https://twitter.com/VodafoneEgypt", Icon: Twitter },
  { label: "Instagram", href: "https://www.instagram.com/vodafoneegypt/", Icon: Instagram },
  { label: "YouTube", href: "https://www.youtube.com/VodafoneEgypt", Icon: Youtube },
];

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return href.startsWith("/") ? (
    <Link href={href}>{children}</Link>
  ) : (
    <a href={href}>{children}</a>
  );
}

export default function Footer({ navItems }: { navItems: DotCMSNavigationItem[] }) {
  const products = [
    ...navItems.map((item) => ({ title: item.title, href: item.href })),
    { title: "Shop", href: "https://eshop.vodafone.com.eg/en/" },
    { title: "DSL", href: `${VF}/HomeDSLcatalog` },
  ];
  const columns = [COLUMNS[0], { title: "Products and services", links: products }, COLUMNS[1]];

  return (
    <footer className="site-footer">
      <div className="container-vf">
        <div className="site-footer__columns">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2>{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.title}>
                    <FooterLink href={link.href}>{link.title}</FooterLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="site-footer__switch">
            <a href={`${VF}/business`} className="btn btn--outline-light">
              Switch to business
            </a>
          </div>
        </div>
        <div className="site-footer__bottom">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8" inverted />
            <span>&copy; {new Date().getFullYear()} Vodafone Egypt</span>
            <a href={`${VF}/website-terms-conditions`}>Terms &amp; conditions</a>
            <a href={`${VF}/privacy-policy-of-vodafone-egypt`}>Privacy policy</a>
          </div>
          <ul className="site-footer__social">
            {SOCIAL.map(({ label, href, Icon }) => (
              <li key={label}>
                <a href={href} aria-label={label} target="_blank" rel="noopener">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
