import { ArrowRight, Check } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { Icon } from "@/components/Icon";
import { SmartLink } from "@/components/SmartLink";
import { parseLines } from "@/utils/content";

/** Style editor options (dotcms/style-schemas/TsdFeatureGrid.mjs). */
interface GridStyles {
  columns?: "auto" | "2" | "3" | "4";
  alignment?: "left" | "center";
  cardStyle?: "outlined" | "filled" | "minimal";
}

type TsdFeatureGridProps = DotCMSBasicContentlet & {
  eyebrow?: string;
  heading?: string;
  intro?: string;
  layout: "cards" | "checklist" | "steps" | "stats";
  theme?: "white" | "mist" | "navy";
  /** One per line: Title | Text | optional link | optional icon (stats: Value | Label) */
  items: string;
  ctaText?: string;
  ctaLink?: string;
  dotStyleProperties?: GridStyles;
};

function Card({ title, text, href, icon }: { title: string; text: string; href: string; icon: string }) {
  const body = (
    <>
      <span className="card__icon">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {href && (
        <span className="card__more">
          Learn more <ArrowRight aria-hidden className="h-4 w-4" />
        </span>
      )}
    </>
  );
  // A linked card is one link, so screen readers announce it once.
  return href ? (
    <SmartLink href={href} className="card card--link">
      {body}
    </SmartLink>
  ) : (
    <div className="card">{body}</div>
  );
}

/** A heading plus a grid of items: cards, a checklist, numbered steps or big stats. */
export default function TsdFeatureGrid(props: TsdFeatureGridProps) {
  const { eyebrow, heading, intro, layout, theme = "white", items, ctaText, ctaLink, dotStyleProperties: styles = {} } = props;
  const rows = parseLines(items, 4);
  const columns = styles.columns ?? "auto";
  // Automatic: three, six or nine cards sit in three columns rather than leaving a gap.
  const thirds = columns === "auto" && layout === "cards" && rows.length % 3 === 0 ? "feature-grid--thirds" : "";
  const styleClasses = [
    columns !== "auto" && `feature-grid--cols-${columns}`,
    `feature-grid--card-${styles.cardStyle ?? "outlined"}`,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <section className={`section section--${theme} ${styles.alignment === "center" ? "section--centered" : ""}`}>
      <div className="container-tsd">
        {(eyebrow || heading || intro) && (
          <header className="section__header">
            {eyebrow && <p className={theme === "navy" ? "eyebrow eyebrow--light" : "eyebrow"}>{eyebrow}</p>}
            {heading && <h2 className="section__title">{heading}</h2>}
            {intro && <p className="section__intro">{intro}</p>}
          </header>
        )}
        <ul className={`feature-grid feature-grid--${layout} ${thirds} ${styleClasses}`}>
          {rows.map(([title, text, href, icon], i) => (
            <li key={`${title}-${i}`}>
              {layout === "cards" && <Card title={title} text={text} href={href} icon={icon} />}
              {layout === "checklist" && (
                <>
                  <Check aria-hidden className="feature-grid__check h-5 w-5" />
                  <span>
                    {text ? <strong>{title}. </strong> : title}
                    {text}
                  </span>
                </>
              )}
              {layout === "steps" && (
                <>
                  <span className="feature-grid__number" aria-hidden>
                    {i + 1}
                  </span>
                  <h3>{title}</h3>
                  {text && <p>{text}</p>}
                </>
              )}
              {layout === "stats" && (
                <>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </>
              )}
            </li>
          ))}
        </ul>
        {ctaText && ctaLink && (
          <div className="section__actions">
            <SmartLink href={ctaLink} className={theme === "navy" ? "btn btn--outline-light" : "btn btn--primary"}>
              {ctaText}
            </SmartLink>
          </div>
        )}
      </div>
    </section>
  );
}
