import Link from "next/link";
import { DotCMSBasicContentlet } from "@dotcms/types";
import DotCMSImage, { type DotCMSImageSrc } from "@/components/DotCMSImage";

type BannerProps = DotCMSBasicContentlet & {
  title: string;
  caption: string;
  image?: DotCMSImageSrc;
  link?: string;
  buttonText?: string;
};

export default function Banner({ title, caption, image, link, buttonText }: BannerProps) {
  return (
    <section className="banner">
      <div className="banner__content">
        <h1>{title}</h1>
        <p>{caption}</p>
        {link && buttonText && (
          <Link href={link}>{buttonText}</Link>
        )}
      </div>
      {image && (
        <div className="banner__image">
          <DotCMSImage src={image} width={1200} height={500} alt={title || "Banner"} />
        </div>
      )}
    </section>
  );
}
