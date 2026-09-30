import Image from "next/image";
import { ChevronRight } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { EditableText } from "@/components/site/EditableText";
import { SmartLink } from "@/components/SmartLink";
import { imageSrc, type DotCMSImageField } from "@/utils/images";

type VodafoneTileProps = DotCMSBasicContentlet & {
  title: string;
  text?: string;
  ctaText?: string;
  ctaLink?: string;
  /** large: image on top · compact: image beside the text */
  size?: "large" | "compact";
  image?: DotCMSImageField;
};

/** A white card with an image and a red "Know More" link, as on the home page. */
export default function VodafoneTile(props: VodafoneTileProps) {
  const { ctaText, ctaLink, size = "compact", image } = props;
  const src = imageSrc(image);
  return (
    <article className={`tile tile--${size}`}>
      {src && (
        <div className="tile__image">
          <Image src={src} alt="" fill sizes={size === "large" ? "(min-width: 768px) 50vw, 100vw" : "200px"} />
        </div>
      )}
      <div className="tile__body">
        <h3>
          <EditableText contentlet={props} field="title" />
        </h3>
        {props.text && (
          <p>
            <EditableText contentlet={props} field="text" />
          </p>
        )}
        {ctaText && ctaLink && (
          <SmartLink href={ctaLink} className="link-red">
            {ctaText} <ChevronRight aria-hidden className="h-4 w-4" />
          </SmartLink>
        )}
      </div>
    </article>
  );
}
