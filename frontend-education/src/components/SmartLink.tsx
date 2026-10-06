import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Editors enter links as a page on this site ("/plans"), an anchor ("#plans")
 * or a full URL. Pages go through next/link; anything else is a plain anchor,
 * and other websites open in a new tab.
 */
export function SmartLink({ href, children, ...rest }: ComponentProps<"a"> & { href: string }) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} {...rest}>
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
