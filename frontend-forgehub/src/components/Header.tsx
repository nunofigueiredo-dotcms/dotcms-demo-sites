import Image from "next/image";
import Link from "next/link";
import type { DotCMSNavigationItem } from "@dotcms/types";
import { Button } from "@/components/Button";
import { MobileNav } from "./MobileNav";

interface HeaderProps {
  navItems: DotCMSNavigationItem[];
  logo?: string;
  logoAlt?: string;
}

export default function Header({
  navItems,
  logo,
  logoAlt = "Logo",
}: HeaderProps) {
  return (
    <header className="w-full py-4">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center text-foreground text-xl font-semibold hover:text-primary-dark transition-colors"
          >
            {logo ? (
              <Image
                src={logo}
                alt={logoAlt}
                height={32}
                width={120}
                className="h-8 w-auto"
              />
            ) : (
              "dotCMS"
            )}
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target={item.target || undefined}
                className="text-muted-foreground hover:text-foreground px-4 py-2 rounded-full font-medium transition-colors"
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="https://dev.dotcms.com/getting-started/setup/demo-instance"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:block"
          >
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-full font-medium shadow-sm transition-colors">
              Try for Free
            </Button>
          </Link>
          <MobileNav navItems={navItems} />
        </div>
      </div>
    </header>
  );
}
