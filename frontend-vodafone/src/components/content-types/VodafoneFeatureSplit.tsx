import Image from "next/image";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { EditableText } from "@/components/site/EditableText";
import { SmartLink } from "@/components/SmartLink";
import { imageSrc, type DotCMSImageField } from "@/utils/images";

type VodafoneFeatureSplitProps = DotCMSBasicContentlet & {
  title: string;
  text?: string;
  ctaText?: string;
  ctaLink?: string;
  image?: DotCMSImageField;
  imagePosition?: "left" | "right";
  theme?: "light" | "grey" | "dark";
};

/** Image on one side; heading, text and a button on the other. */
export default function VodafoneFeatureSplit(props: VodafoneFeatureSplitProps) {
  const { ctaText, ctaLink, image, imagePosition = "left", theme = "light" } = props;
  const src = imageSrc(image);
  return (
    <section className={`section section--${theme}`}>
      <div className={`container-vf feature-split feature-split--image-${imagePosition}`}>
        {src && (
          <div className="feature-split__image">
            <Image src={src} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" />
          </div>
        )}
        <div className="feature-split__text">
          <h2>
            <EditableText contentlet={props} field="title" />
          </h2>
          {props.text && (
            <p>
              <EditableText contentlet={props} field="text" />
            </p>
          )}
          {ctaText && ctaLink && (
            <SmartLink href={ctaLink} className="btn btn--primary">
              {ctaText}
            </SmartLink>
          )}
        </div>
      </div>
    </section>
  );
}
