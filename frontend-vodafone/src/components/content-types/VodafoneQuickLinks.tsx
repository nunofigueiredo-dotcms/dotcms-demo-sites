import type { DotCMSBasicContentlet } from "@dotcms/types";
import { Icon } from "@/components/Icon";
import { SmartLink } from "@/components/SmartLink";
import { parseLines } from "@/utils/content";

type VodafoneQuickLinksProps = DotCMSBasicContentlet & {
  /** One per line: Label | link | icon */
  items: string;
};

/** The red strip of icon links under the home page hero. */
export default function VodafoneQuickLinks({ items }: VodafoneQuickLinksProps) {
  const links = parseLines(items, 3);
  return (
    <nav className="quick-links" aria-label="Quick links">
      <ul className="container-vf">
        {links.map(([label, href, icon]) => (
          <li key={label}>
            <SmartLink href={href || "/"} className="quick-link">
              <Icon name={icon} className="h-10 w-10" />
              <span>{label}</span>
            </SmartLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
