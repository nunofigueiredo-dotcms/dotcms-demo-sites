import Image from "next/image";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { EditableText } from "@/components/site/EditableText";
import { SmartLink } from "@/components/SmartLink";
import { imageSrc, type DotCMSImageField } from "@/utils/images";

type VodafonePageBannerProps = DotCMSBasicContentlet & {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  /** overlay: image across the banner · split: text beside the image · red: no image */
  bannerStyle?: "overlay" | "split" | "red";
  image?: DotCMSImageField;
};

/** Hero banner for inner pages. */
export default function VodafonePageBanner(props: VodafonePageBannerProps) {
  const { subtitle, ctaText, ctaLink, image } = props;
  const src = imageSrc(image);
  const style = props.bannerStyle ?? (src ? "overlay" : "red");

  return (
    <section className={`page-banner page-banner--${style}`}>
      {style === "overlay" && src && (
        <Image src={src} alt="" fill priority sizes="100vw" className="page-banner__bg" />
      )}
      <div className="container-vf page-banner__inner">
        <div className="page-banner__text">
          <h1>
            <EditableText contentlet={props} field="title" />
          </h1>
          {subtitle && (
            <p>
              <EditableText contentlet={props} field="subtitle" />
            </p>
          )}
          {ctaText && ctaLink && (
            <SmartLink href={ctaLink} className="btn btn--primary">
              {ctaText}
            </SmartLink>
          )}
        </div>
        {style === "split" && src && (
          <div className="page-banner__image">
            <Image src={src} alt="" fill priority sizes="(min-width: 768px) 360px, 70vw" />
          </div>
        )}
      </div>
    </section>
  );
}
