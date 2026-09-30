import { ChevronRight } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { Icon } from "@/components/Icon";
import { SmartLink } from "@/components/SmartLink";
import { parseLines } from "@/utils/content";

type VodafoneServiceCarouselProps = DotCMSBasicContentlet & {
  heading?: string;
  /** One per line: Title | Text | Link text | link | icon */
  items: string;
};

/** "Other Services": a scrolling row of service cards. */
export default function VodafoneServiceCarousel({ heading, items }: VodafoneServiceCarouselProps) {
  const services = parseLines(items, 5);
  return (
    <section className="section">
      <div className="container-vf">
        {heading && <h2 className="section__title">{heading}</h2>}
        <ul className="service-row">
          {services.map(([title, text, linkText, href, icon]) => (
            <li key={title} className="service-card">
              <Icon name={icon} className="h-12 w-12 text-brand-red" />
              <h3>{title}</h3>
              <p>{text}</p>
              {linkText && href && (
                <SmartLink href={href} className="link-red">
                  {linkText} <ChevronRight aria-hidden className="h-4 w-4" />
                </SmartLink>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
