"use client";

import { Button } from "@/components/Button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/Sheet";
import { Menu } from "lucide-react";
import { Link } from "@/components/site/Locale";
import type { DotCMSNavigationItem } from "@dotcms/types";
import { useT } from "@/components/site/Strings";
import { navKey } from "@/utils/centers";

interface MobileNavProps {
  navItems: DotCMSNavigationItem[];
}

export function MobileNav({ navItems }: MobileNavProps) {
  const t = useT();
  return (
    <Sheet>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
          <Menu className="h-7 w-7" />
          <span className="sr-only">{t("nav.toggle")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mobile-nav__sheet">
        <SheetHeader>
          <SheetTitle className="text-left text-xl font-semibold text-foreground">
            {t("nav.menu")}
          </SheetTitle>
        </SheetHeader>
        <nav>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} target={item.target || undefined}>
              {t(navKey(item.href), undefined, item.title)}
            </Link>
          ))}
          <Link href="/contact" className="btn btn--primary mt-4 justify-center uppercase">
            {t("nav.letsConnect")}
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
