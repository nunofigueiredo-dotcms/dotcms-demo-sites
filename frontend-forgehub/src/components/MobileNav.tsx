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
import Link from "next/link";
import type { DotCMSNavigationItem } from "@dotcms/types";

interface MobileNavProps {
  navItems: DotCMSNavigationItem[];
}

export function MobileNav({ navItems }: MobileNavProps) {
  return (
    <Sheet>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon" className="text-foreground">
          <Menu className="h-7 w-7" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="bg-background border-t border-border text-foreground"
      >
        <SheetHeader>
          <SheetTitle className="text-left text-xl font-semibold text-foreground">
            Navigation
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 mt-6 px-4 pb-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              target={item.target || undefined}
              className="text-muted-foreground hover:text-foreground justify-start text-lg py-2"
            >
              {item.title}
            </Link>
          ))}
          <Link
            href="https://dev.dotcms.com/getting-started/setup/demo-instance"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-4"
          >
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-full font-medium shadow-sm transition-colors">
              Try for Free
            </Button>
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
