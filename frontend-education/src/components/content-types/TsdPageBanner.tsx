import Image from "next/image";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { EditableText } from "@/components/site/EditableText";
import { SmartLink } from "@/components/SmartLink";
import { imageSrc, type DotCMSImageField } from "@/utils/images";

/** Style editor options (dotcms/style-schemas/TsdPageBanner.mjs). */
interface BannerStyles {
  background?: "navy" | "steel" | "mist";
  alignment?: "left" | "center";
}

type TsdPageBannerProps = DotCMSBasicContentlet & {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  image?: DotCMSImageField;
  imageAlt?: string;
  dotStyleProperties?: BannerStyles;
};

/** The title band at the top of inner pages, with an optional photo beside it. */
export default function TsdPageBanner(props: TsdPageBannerProps) {
  const { ctaText, ctaLink, imageAlt, dotStyleProperties: styles = {} } = props;
  const src = imageSrc(props.image);
  const background = styles.background ?? "navy";
  const classes = [
    "page-banner",
    `page-banner--${background}`,
    `page-banner--${styles.alignment ?? "left"}`,
    src ? "page-banner--with-image" : "",
  ].join(" ");
  return (
    <section className={classes}>
      <div className="container-tsd page-banner__inner">
        <div className="page-banner__text">
          {props.eyebrow && (
            <p className={background === "mist" ? "eyebrow" : "eyebrow eyebrow--light"}>
              <EditableText contentlet={props} field="eyebrow" />
            </p>
          )}
          <h1>
            <EditableText contentlet={props} field="title" />
          </h1>
          {props.subtitle && (
            <p className="page-banner__subtitle">
              <EditableText contentlet={props} field="subtitle" />
            </p>
          )}
          {ctaText && ctaLink && (
            <SmartLink href={ctaLink} className="btn btn--accent">
              {ctaText}
            </SmartLink>
          )}
        </div>
        {src && (
          <div className="page-banner__image">
            <Image src={src} alt={imageAlt ?? ""} fill priority sizes="(min-width: 1024px) 40vw, 100vw" />
          </div>
        )}
      </div>
    </section>
  );
}
