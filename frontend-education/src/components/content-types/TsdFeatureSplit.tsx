"use client";

import Image from "next/image";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { EditableText } from "@/components/site/EditableText";
import { SmartLink } from "@/components/SmartLink";
import { useIsEditing } from "@/hooks/useIsEditing";
import { paragraphs } from "@/utils/content";
import { imageSrc, type DotCMSImageField } from "@/utils/images";

type TsdFeatureSplitProps = DotCMSBasicContentlet & {
  title: string;
  eyebrow?: string;
  /** Paragraphs separated by a blank line. */
  text?: string;
  ctaText?: string;
  ctaLink?: string;
  image?: DotCMSImageField;
  imageAlt?: string;
  imagePosition?: "left" | "right";
  theme?: "white" | "mist" | "navy";
};

/** A photo on one side; heading, text and a button on the other. */
export default function TsdFeatureSplit(props: TsdFeatureSplitProps) {
  const { ctaText, ctaLink, imageAlt, imagePosition = "left", theme = "white" } = props;
  const editing = useIsEditing();
  const src = imageSrc(props.image);
  return (
    <section className={`section section--${theme}`}>
      <div className={`container-tsd split split--image-${imagePosition} ${src ? "" : "split--no-image"}`}>
        {src && (
          <div className="split__image">
            <Image src={src} alt={imageAlt ?? ""} fill sizes="(min-width: 1024px) 50vw, 100vw" />
          </div>
        )}
        <div className="split__text">
          {props.eyebrow && <p className={theme === "navy" ? "eyebrow eyebrow--light" : "eyebrow"}>{props.eyebrow}</p>}
          <h2 className="section__title">
            <EditableText contentlet={props} field="title" />
          </h2>
          {/* In the editor the whole text is one inline-editable field. */}
          {editing ? (
            <p>
              <EditableText contentlet={props} field="text" />
            </p>
          ) : (
            paragraphs(props.text).map((p) => <p key={p}>{p}</p>)
          )}
          {ctaText && ctaLink && (
            <SmartLink href={ctaLink} className={theme === "navy" ? "btn btn--outline-light" : "btn btn--primary"}>
              {ctaText}
            </SmartLink>
          )}
        </div>
      </div>
    </section>
  );
}
