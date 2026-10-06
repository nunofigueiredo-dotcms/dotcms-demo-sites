import type { DotCMSBasicContentlet } from "@dotcms/types";
import { EditableText } from "@/components/site/EditableText";
import { SmartLink } from "@/components/SmartLink";

/** Style editor options (dotcms/style-schemas/TsdCallout.mjs). */
interface CalloutStyles {
  alignment?: "center" | "left";
  size?: "large" | "medium";
}

type TsdCalloutProps = DotCMSBasicContentlet & {
  eyebrow?: string;
  text: string;
  ctaText?: string;
  ctaLink?: string;
  theme?: "navy" | "steel" | "mist";
  dotStyleProperties?: CalloutStyles;
};

/** A full-width statement band, such as the mission statement. */
export default function TsdCallout(props: TsdCalloutProps) {
  const { eyebrow, ctaText, ctaLink, theme = "navy", dotStyleProperties: styles = {} } = props;
  const light = theme !== "mist";
  return (
    <section className={`callout callout--${theme} callout--${styles.alignment ?? "center"} callout--${styles.size ?? "large"}`}>
      <svg className="callout__star" viewBox="0 0 100 100" aria-hidden>
        <polygon points="50,2 61,38 99,38 68,60 79,96 50,74 21,96 32,60 1,38 39,38" />
      </svg>
      <div className="container-tsd callout__inner">
        {eyebrow && <p className={light ? "eyebrow eyebrow--light" : "eyebrow"}>{eyebrow}</p>}
        <blockquote>
          <EditableText contentlet={props} field="text" />
        </blockquote>
        {ctaText && ctaLink && (
          <SmartLink href={ctaLink} className={light ? "btn btn--outline-light" : "btn btn--primary"}>
            {ctaText}
          </SmartLink>
        )}
      </div>
    </section>
  );
}
