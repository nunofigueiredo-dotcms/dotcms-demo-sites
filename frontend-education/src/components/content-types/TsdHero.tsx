import Image from "next/image";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { EditableText } from "@/components/site/EditableText";
import { SmartLink } from "@/components/SmartLink";
import { imageSrc, type DotCMSImageField } from "@/utils/images";

/** Style editor options (dotcms/style-schemas/TsdHero.mjs). */
interface HeroStyles {
  textPosition?: "left" | "center";
  overlay?: "navy" | "steel" | "light";
  height?: "tall" | "medium";
}

type TsdHeroProps = DotCMSBasicContentlet & {
  title: string;
  eyebrow?: string;
  text?: string;
  ctaText?: string;
  ctaLink?: string;
  cta2Text?: string;
  cta2Link?: string;
  image?: DotCMSImageField;
  imageAlt?: string;
  dotStyleProperties?: HeroStyles;
};

/** The home page's photo banner, with the headline over the image. */
export default function TsdHero(props: TsdHeroProps) {
  const { ctaText, ctaLink, cta2Text, cta2Link, imageAlt, dotStyleProperties: styles = {} } = props;
  const src = imageSrc(props.image);
  const classes = [
    "hero",
    `hero--${styles.textPosition ?? "left"}`,
    `hero--overlay-${styles.overlay ?? "navy"}`,
    `hero--${styles.height ?? "tall"}`,
  ].join(" ");
  return (
    <section className={classes}>
      {src && <Image src={src} alt={imageAlt ?? ""} fill priority sizes="100vw" className="hero__image" />}
      <div className="hero__shade" aria-hidden />
      <div className="container-tsd hero__inner">
        <div className="hero__content">
          {props.eyebrow && (
            <p className="eyebrow eyebrow--light">
              <EditableText contentlet={props} field="eyebrow" />
            </p>
          )}
          <h1>
            <EditableText contentlet={props} field="title" />
          </h1>
          {props.text && (
            <p className="hero__text">
              <EditableText contentlet={props} field="text" />
            </p>
          )}
          {(ctaText || cta2Text) && (
            <div className="button-row">
              {ctaText && ctaLink && (
                <SmartLink href={ctaLink} className="btn btn--accent">
                  {ctaText}
                </SmartLink>
              )}
              {cta2Text && cta2Link && (
                <SmartLink href={cta2Link} className="btn btn--outline-light">
                  {cta2Text}
                </SmartLink>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
