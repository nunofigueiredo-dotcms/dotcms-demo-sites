"use client";

import Image from "next/image";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { EditableText } from "@/components/site/EditableText";
import { SmartLink } from "@/components/SmartLink";
import { paragraphs } from "@/utils/content";
import { imageSrc, type DotCMSImageField } from "@/utils/images";

/** Style editor options (dotcms/style-schemas/ExpoFeatureSplit.mjs). */
interface SplitStyles {
  imageShape?: "rounded" | "arch" | "square";
  imageSize?: "half" | "large";
}

type ExpoFeatureSplitProps = DotCMSBasicContentlet & {
  title: string;
  eyebrow?: string;
  text?: string;
  ctaText?: string;
  ctaLink?: string;
  image?: DotCMSImageField;
  imageAlt?: string;
  /** "start" is the left in English and the right in Arabic. */
  imagePosition?: "start" | "end";
  theme?: "white" | "sand" | "charcoal" | "teal";
  dotStyleProperties?: SplitStyles;
};

/** A photo beside a heading, text and a button. */
export default function ExpoFeatureSplit(props: ExpoFeatureSplitProps) {
  const { eyebrow, text, ctaText, ctaLink, imageAlt, imagePosition = "start", theme = "white" } = props;
  const styles = props.dotStyleProperties ?? {};
  const src = imageSrc(props.image);
  const dark = theme === "charcoal" || theme === "teal";
  return (
    <section className={`section section--${theme}`}>
      <div
        className={[
          "container-expo split",
          `split--image-${imagePosition}`,
          `split--${styles.imageSize ?? "half"}`,
          !src && "split--text-only",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {src && (
          <div className={`split__media split__media--${styles.imageShape ?? "rounded"}`}>
            <Image src={src} alt={imageAlt ?? ""} fill sizes="(min-width: 1024px) 50vw, 100vw" />
          </div>
        )}
        <div className="split__text">
          {eyebrow && <p className={dark ? "eyebrow eyebrow--light" : "eyebrow"}>{eyebrow}</p>}
          <h2 className="section__title">
            <EditableText contentlet={props} field="title" />
          </h2>
          {paragraphs(text).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {ctaText && ctaLink && (
            <SmartLink href={ctaLink} className={dark ? "btn btn--outline-light" : "btn btn--primary"}>
              {ctaText}
            </SmartLink>
          )}
        </div>
      </div>
    </section>
  );
}
