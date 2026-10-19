"use client";

import { ArrowUpRight } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { Icon } from "@/components/Icon";
import { SectionHeader } from "@/components/site/SectionHeader";
import { SmartLink } from "@/components/SmartLink";
import { parseLines } from "@/utils/content";

/** Style editor options (dotcms/style-schemas/ExpoFeatureGrid.mjs). */
interface GridStyles {
  columns?: "auto" | "2" | "3" | "4";
  cardStyle?: "filled" | "outlined" | "minimal";
}

type ExpoFeatureGridProps = DotCMSBasicContentlet & {
  eyebrow?: string;
  heading?: string;
  intro?: string;
  layout: "cards" | "steps" | "stats";
  theme?: "white" | "sand" | "charcoal" | "teal";
  /** One per line: Title | Text | optional link | optional icon (stats: Value | Label) */
  items: string;
  ctaText?: string;
  ctaLink?: string;
  dotStyleProperties?: GridStyles;
};

/** A heading plus a grid of icon cards, numbered steps or big stats. */
export default function ExpoFeatureGrid(props: ExpoFeatureGridProps) {
  const { layout, theme = "white", items, dotStyleProperties: styles = {} } = props;
  const rows = parseLines(items, 4);
  const columns = styles.columns && styles.columns !== "auto" ? styles.columns : String(Math.min(rows.length, 4));
  return (
    <section className={`section section--${theme}`}>
      <div className="container-expo">
        <SectionHeader contentlet={props} />
        <ul
          className={`feature-grid feature-grid--${layout} feature-grid--card-${styles.cardStyle ?? "filled"}`}
          style={{ "--columns": columns } as React.CSSProperties}
        >
          {rows.map(([title, text, href, icon], i) => {
            if (layout === "stats") {
              return (
                <li key={`${title}-${i}`}>
                  <strong dir="auto">{title}</strong>
                  <span>{text}</span>
                </li>
              );
            }
            const body = (
              <>
                {layout === "steps" ? (
                  <span className="feature-grid__number" aria-hidden>
                    {i + 1}
                  </span>
                ) : (
                  <span className="feature-grid__icon">
                    <Icon name={icon || "sparkles"} className="h-6 w-6" />
                  </span>
                )}
                <h3>
                  {title}
                  {href && <ArrowUpRight aria-hidden className="h-4 w-4 flip-rtl" />}
                </h3>
                {text && <p>{text}</p>}
              </>
            );
            return (
              <li key={`${title}-${i}`}>
                {href ? (
                  <SmartLink href={href} className="feature-card feature-card--link">
                    {body}
                  </SmartLink>
                ) : (
                  <div className="feature-card">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
