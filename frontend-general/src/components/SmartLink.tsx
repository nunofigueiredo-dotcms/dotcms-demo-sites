"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useLocale } from "./site/Locale";

/**
 * Editors enter links as a page on this site ("/visit/events"), an anchor
 * ("#faqs"), a mailto: or a full URL. Pages go through next/link in the
 * page's language (/ar/… for Arabic); other websites open in a new tab.
 */
export function SmartLink({ href, children, ...rest }: ComponentProps<"a"> & { href: string }) {
  const { href: localize } = useLocale();
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={localize(href)} {...rest}>
        {children}
      </Link>
    );
  }
  const external = /^https?:\/\//.test(href);
  return (
    <a href={href} {...(external && { target: "_blank", rel: "noopener" })} {...rest}>
      {children}
    </a>
  );
}
