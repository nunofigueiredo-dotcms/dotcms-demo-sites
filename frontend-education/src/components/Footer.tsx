import Link from "next/link";
import { MapPin, Phone, Video } from "lucide-react";
import type { DotCMSPageNavigation } from "@/types/page";
import { Seal } from "./Logo";
import { SOCIAL } from "./social";

const TSD = "https://www.tsd.texas.gov";

// The fixed footer links from tsd.texas.gov.
const COMMUNITY = [
  { title: "Ranger Press", href: `${TSD}/apps/pages/index.jsp?uREC_ID=812292&type=d` },
  { title: "Ranger Sports", href: `${TSD}/apps/pages/index.jsp?uREC_ID=170240&type=d` },
  { title: "TSD Foundation", href: "https://tsdfoundation.org/" },
  { title: "TSD Alumni Association", href: "https://tsdalumni.org/about-us" },
  { title: "Video Gallery", href: `${TSD}/apps/video` },
];

const USEFUL = [
  { title: "Accessibility Policy", href: `${TSD}/apps/pages/index.jsp?uREC_ID=170317&type=d&pREC_ID=541951` },
  { title: "Privacy", href: `${TSD}/apps/pages/index.jsp?uREC_ID=170317&type=d` },
  { title: "Anonymous Alerts", href: `${TSD}/apps/pages/anonymous` },
  { title: "Report Fraud", href: "https://sao.fraud.texas.gov/ReportFraud/" },
  { title: "Texas.gov", href: "https://www.texas.gov/" },
  { title: "Texas Veterans", href: "https://veterans.portal.texas.gov/" },
];

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return href.startsWith("/") ? <Link href={href}>{children}</Link> : <a href={href}>{children}</a>;
}

function Column({ title, links }: { title: string; links: { title: string; href: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {links.map((link) => (
          <li key={link.title}>
            <FooterLink href={link.href}>{link.title}</FooterLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer({ navItems }: { navItems: DotCMSPageNavigation["children"] }) {
  return (
    <footer className="site-footer">
      <div className="container-tsd site-footer__grid">
        <div className="site-footer__contact">
          <Seal size={96} />
          <p className="site-footer__name">Texas School for the Deaf</p>
          <p>
            <MapPin aria-hidden className="h-4 w-4" />
            <a href="https://maps.google.com/?q=1102+S.+Congress+Ave.,+Austin,+TX+78704">
              1102 S. Congress Ave., Austin, TX 78704
            </a>
          </p>
          <p>
            <Phone aria-hidden className="h-4 w-4" />
            <span>
              Phone: <a href="tel:+15124625353">(512) 462-5353</a>
            </span>
          </p>
          <p>
            <Video aria-hidden className="h-4 w-4" />
            <span>
              VP: <a href="tel:+15125806994">(512) 580-6994</a>
            </span>
          </p>
          <ul className="site-footer__social">
            {SOCIAL.map(({ label, href, Icon }) => (
              <li key={label}>
                <a href={href} aria-label={label} target="_blank" rel="noopener">
                  <Icon aria-hidden className="h-5 w-5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
        {/* This site's dotCMS menu, so new sections appear here too. */}
        <Column title="Explore TSD" links={navItems.map((item) => ({ title: item.title, href: item.href }))} />
        <Column title="Community" links={COMMUNITY} />
        <Column title="Useful Links" links={USEFUL} />
      </div>
      <div className="site-footer__bottom">
        <div className="container-tsd">
          <p>&copy; {new Date().getFullYear()} Texas School for the Deaf · Learn. Grow. Belong.</p>
        </div>
      </div>
    </footer>
  );
}
