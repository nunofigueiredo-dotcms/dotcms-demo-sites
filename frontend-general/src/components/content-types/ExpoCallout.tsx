"use client";

import type { DotCMSBasicContentlet } from "@dotcms/types";
import { EditableText } from "@/components/site/EditableText";
import { SmartLink } from "@/components/SmartLink";

/** Style editor options (dotcms/style-schemas/ExpoCallout.mjs). */
interface CalloutStyles {
  size?: "large" | "compact";
  alignment?: "start" | "center";
}

type ExpoCalloutProps = DotCMSBasicContentlet & {
  eyebrow?: string;
  text: string;
  ctaText?: string;
  ctaLink?: string;
  theme?: "magenta" | "teal" | "charcoal" | "sand";
  dotStyleProperties?: CalloutStyles;
};

/** A full-width statement band with a button. */
export default function ExpoCallout(props: ExpoCalloutProps) {
  const { eyebrow, ctaText, ctaLink, theme = "magenta", dotStyleProperties: styles = {} } = props;
  const light = theme === "sand";
  return (
    <section
      className={`callout section--${theme} callout--${styles.size ?? "large"} callout--${styles.alignment ?? "start"}`}
    >
      <div className="container-expo callout__inner">
        <div>
          {eyebrow && <p className={light ? "eyebrow" : "eyebrow eyebrow--light"}>{eyebrow}</p>}
          <p className="callout__text">
            <EditableText contentlet={props} field="text" />
          </p>
        </div>
        {ctaText && ctaLink && (
          <SmartLink href={ctaLink} className={light ? "btn btn--primary" : "btn btn--light"}>
            {ctaText}
          </SmartLink>
        )}
      </div>
    </section>
  );
}
