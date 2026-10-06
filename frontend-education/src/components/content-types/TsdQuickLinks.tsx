import type { DotCMSBasicContentlet } from "@dotcms/types";
import { Icon } from "@/components/Icon";
import { SmartLink } from "@/components/SmartLink";
import { parseLines } from "@/utils/content";

type TsdQuickLinksProps = DotCMSBasicContentlet & {
  /** One per line: Label | link | icon */
  items: string;
};

/** Large icon links, as under the home page hero. */
export default function TsdQuickLinks({ items }: TsdQuickLinksProps) {
  const links = parseLines(items, 3);
  return (
    <nav className="quick-links" aria-label="Quick links">
      <ul className="container-tsd quick-links__list">
        {links.map(([label, href, icon]) => (
          <li key={label}>
            <SmartLink href={href || "#"} className="quick-links__link">
              <span className="quick-links__icon">
                <Icon name={icon} className="h-8 w-8" />
              </span>
              {label}
            </SmartLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
