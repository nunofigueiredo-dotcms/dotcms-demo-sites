"use client";

import Image from "next/image";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { EditableText } from "@/components/site/EditableText";
import { SmartLink } from "@/components/SmartLink";
import { imageSrc, type DotCMSImageField } from "@/utils/images";

/** Style editor options (dotcms/style-schemas/ExpoPageBanner.mjs). */
interface BannerStyles {
  layout?: "split" | "cover" | "plain";
  theme?: "sand" | "charcoal" | "teal";
}

type ExpoPageBannerProps = DotCMSBasicContentlet & {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  image?: DotCMSImageField;
  imageAlt?: string;
  dotStyleProperties?: BannerStyles;
};

/** The title at the top of an inner page: beside a photo, over it, or on its own. */
export default function ExpoPageBanner(props: ExpoPageBannerProps) {
  const { eyebrow, subtitle, ctaText, ctaLink, imageAlt, dotStyleProperties: styles = {} } = props;
  const src = imageSrc(props.image);
  const layout = src ? (styles.layout ?? "split") : "plain";
  return (
    <section className={`page-banner page-banner--${layout} section--${styles.theme ?? "sand"}`}>
      {layout === "cover" && src && (
        <Image src={src} alt={imageAlt ?? ""} fill priority sizes="100vw" className="page-banner__cover" />
      )}
      <div className="container-expo page-banner__inner">
        <div className="page-banner__text">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>
            <EditableText contentlet={props} field="title" />
          </h1>
          {subtitle && (
            <p className="page-banner__subtitle">
              <EditableText contentlet={props} field="subtitle" />
            </p>
          )}
          {ctaText && ctaLink && (
            <SmartLink href={ctaLink} className="btn btn--primary">
              {ctaText}
            </SmartLink>
          )}
        </div>
        {layout === "split" && src && (
          <div className="page-banner__media">
            <Image src={src} alt={imageAlt ?? ""} fill priority sizes="(min-width: 1024px) 50vw, 100vw" />
          </div>
        )}
      </div>
    </section>
  );
}
