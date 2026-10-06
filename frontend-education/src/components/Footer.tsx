import Link from "next/link";
import { MapPin, Phone, Video } from "lucide-react";
import type { DotCMSPageNavigation, SiteSettings } from "@/types/page";
import { Seal } from "./Logo";
import { links, socialLinks } from "./social";

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

/** "(512) 462-5353" → "tel:+15124625353" */
const tel = (number: string) => `tel:+1${number.replace(/\D/g, "")}`;

interface FooterProps {
  navItems: DotCMSPageNavigation["children"];
  /** TSD Site Settings: contact details, social icons and the footer columns. */
  settings?: SiteSettings;
}

/** Everything here is editable: the menu in dotCMS folders, the rest in TSD Site Settings. */
export default function Footer({ navItems, settings }: FooterProps) {
  const social = socialLinks(settings?.socialLinks);
  const community = links(settings?.footerCommunity);
  const useful = links(settings?.footerUseful);
  return (
    <footer className="site-footer">
      <div className="container-tsd site-footer__grid">
        <div className="site-footer__contact">
          <Seal size={96} />
          <p className="site-footer__name">Texas School for the Deaf</p>
          {settings?.address && (
            <p>
              <MapPin aria-hidden className="h-4 w-4" />
              <a href={`https://maps.google.com/?q=${encodeURIComponent(settings.address)}`}>{settings.address}</a>
            </p>
          )}
          {settings?.phone && (
            <p>
              <Phone aria-hidden className="h-4 w-4" />
              <span>
                Phone: <a href={tel(settings.phone)}>{settings.phone}</a>
              </span>
            </p>
          )}
          {settings?.videophone && (
            <p>
              <Video aria-hidden className="h-4 w-4" />
              <span>
                VP: <a href={tel(settings.videophone)}>{settings.videophone}</a>
              </span>
            </p>
          )}
          <ul className="site-footer__social">
            {social.map(({ label, href, Icon }) => (
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
        {community.length > 0 && <Column title="Community" links={community} />}
        {useful.length > 0 && <Column title="Useful Links" links={useful} />}
      </div>
      <div className="site-footer__bottom">
        <div className="container-tsd">
          <p>&copy; {new Date().getFullYear()} Texas School for the Deaf · Learn. Grow. Belong.</p>
        </div>
      </div>
    </footer>
  );
}
