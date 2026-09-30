import { ChevronRight } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { Icon } from "@/components/Icon";
import { SmartLink } from "@/components/SmartLink";
import { parseLines } from "@/utils/content";

type VodafoneFeatureGridProps = DotCMSBasicContentlet & {
  heading?: string;
  intro?: string;
  layout: "cards" | "steps" | "stats";
  theme?: "grey" | "light" | "red";
  /** One per line: Title | Text | optional link | optional icon (stats: Value | Label) */
  items: string;
  ctaText?: string;
  ctaLink?: string;
};

/** A heading plus a grid of items, as cards, numbered steps or big stats. */
export default function VodafoneFeatureGrid({ heading, intro, layout, theme = "grey", items, ctaText, ctaLink }: VodafoneFeatureGridProps) {
  const rows = parseLines(items, 4);
  return (
    <section className={`section section--${theme}`}>
      <div className="container-vf">
        {heading && <h2 className="section__title">{heading}</h2>}
        {intro && <p className="section__intro">{intro}</p>}
        {/* Three or six cards sit in three columns rather than leaving a gap. */}
        <ol className={`feature-grid feature-grid--${layout} ${rows.length % 3 === 0 && rows.length <= 6 ? "feature-grid--thirds" : ""}`}>
          {rows.map(([title, text, href, icon], i) => (
            <li key={title}>
              {layout === "stats" ? (
                <>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </>
              ) : (
                <>
                  {layout === "steps" ? (
                    <span className="feature-grid__number">{i + 1}</span>
                  ) : (
                    <Icon name={icon} className="h-10 w-10 text-brand-red" />
                  )}
                  <h3>{title}</h3>
                  {text && <p>{text}</p>}
                  {href && (
                    <SmartLink href={href} className="link-red">
                      Know More <ChevronRight aria-hidden className="h-4 w-4" />
                    </SmartLink>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
        {ctaText && ctaLink && (
          <div className="mt-8 text-center">
            <SmartLink href={ctaLink} className="btn btn--primary">
              {ctaText}
            </SmartLink>
          </div>
        )}
      </div>
    </section>
  );
}
