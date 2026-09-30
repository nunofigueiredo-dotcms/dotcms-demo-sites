"use client";

import Image from "next/image";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { EditableText } from "@/components/site/EditableText";
import { SmartLink } from "@/components/SmartLink";
import { imageSrc, type DotCMSImageField } from "@/utils/images";

/**
 * Style editor values for a hero slide placed on a page (UVE → select the
 * slide → Style editor). Schema: dotcms/style-schemas/VodafoneHeroSlide.mjs.
 */
export interface SlideStyles {
  imagePosition?: "right" | "left";
  alignment?: "left" | "center";
  headingFont?: "brand" | "serif" | "condensed";
  headingSize?: "md" | "lg" | "xl";
  textStyle?: { uppercase?: boolean; italic?: boolean; light?: boolean };
  background?: "white" | "grey" | "dark" | "red";
  buttonStyle?: "filled" | "outline" | "white";
}

export interface SlideContent {
  title: string;
  /** Shown in Vodafone red after the headline, e.g. "RED !". */
  highlight?: string | null;
  text?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  image?: DotCMSImageField;
  mobileImage?: DotCMSImageField;
}

/** CSS classes for the chosen styles; nothing chosen = the vodafone.com.eg design. */
function styleClasses(styles: SlideStyles): string {
  const text = styles.textStyle ?? {};
  return [
    styles.imagePosition === "left" && "hero-slide--image-left",
    styles.alignment === "center" && "hero-slide--center",
    styles.headingFont && styles.headingFont !== "brand" && `hero-slide--font-${styles.headingFont}`,
    styles.headingSize && `hero-slide--title-${styles.headingSize}`,
    text.uppercase && "hero-slide--uppercase",
    text.italic && "hero-slide--italic",
    text.light && "hero-slide--light",
    styles.background && styles.background !== "white" && `hero-slide--bg-${styles.background}`,
  ]
    .filter(Boolean)
    .join(" ");
}

const BUTTON_CLASS = {
  filled: "btn btn--primary",
  outline: "btn btn--outline-red",
  white: "btn btn--white",
};

interface HeroSlideViewProps {
  slide: SlideContent;
  styles?: SlideStyles;
  /** The contentlet, when its text should be editable in place (UVE Edit mode). */
  editable?: DotCMSBasicContentlet & SlideContent;
  /** Load the image eagerly (the first slide on the page). */
  priority?: boolean;
}

/** A hero slide's design: copy on one side, image on the other. */
export function HeroSlideView({ slide, styles = {}, editable, priority = false }: HeroSlideViewProps) {
  const desktop = imageSrc(slide.image);
  const mobile = imageSrc(slide.mobileImage) ?? desktop;
  const buttonClass = BUTTON_CLASS[styles.buttonStyle ?? "filled"];
  const text = (field: "title" | "highlight" | "text") =>
    editable ? <EditableText contentlet={editable} field={field} /> : slide[field];

  return (
    <div className={`hero-slide ${styleClasses(styles)}`}>
      <div className="hero-slide__content">
        <h2>
          <strong>
            {text("title")}{" "}
            {(slide.highlight || editable) && <span className="text-brand-red">{text("highlight")}</span>}
          </strong>
        </h2>
        {(slide.text || editable) && <div className="hero-slide__text">{text("text")}</div>}
        {slide.ctaText &&
          slide.ctaLink &&
          (editable ? (
            // In Edit mode the button isn't a link, so clicking it doesn't
            // navigate away. Its label is changed in the slide's form.
            <span className={buttonClass}>{slide.ctaText}</span>
          ) : (
            <SmartLink href={slide.ctaLink} className={buttonClass}>
              {slide.ctaText}
            </SmartLink>
          ))}
      </div>
      <div className="hero-slide__image">
        {desktop && (
          <Image src={desktop} alt="" fill priority={priority} sizes="(min-width: 1024px) 50vw, 100vw" className="hidden md:block" />
        )}
        {mobile && <Image src={mobile} alt="" fill priority={priority} sizes="100vw" className="md:hidden" />}
      </div>
    </div>
  );
}
