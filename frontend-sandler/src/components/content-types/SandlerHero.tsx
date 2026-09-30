"use client";

import Image from "next/image";
import { DotCMSEditableText } from "@dotcms/react";
import { Link } from "@/components/site/Locale";
import { MapPin } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { BarsIcon } from "@/components/BarsIcon";
import { useIsEditing } from "@/hooks/useIsEditing";
import { imageSrc, type DotCMSImageField } from "@/utils/images";
import { useCurrentCenter } from "@/components/site/CurrentCenter";
import { useSiteData } from "@/components/site/SiteData";
import { centerHref, centerShortName, resolveCenterLink } from "@/utils/centers";
import { useT } from "@/components/site/Strings";

/**
 * Style editor values (UVE → select the hero → Style editor). The schema is
 * dotcms/style-schemas/SandlerHero.mjs; ids and values must match it.
 */
interface HeroStyles {
  alignment?: "left" | "center";
  height?: "compact" | "standard" | "full";
  headingFont?: "brand" | "serif" | "condensed";
  headingSize?: "md" | "lg" | "xl";
  textStyle?: { italic?: boolean; uppercase?: boolean; hideEyebrow?: boolean };
  background?: "image" | "navy" | "gradient" | "light";
}

/** CSS classes for the chosen styles; nothing chosen = the default design. */
function heroStyleClasses(styles: HeroStyles = {}): string {
  const t = styles.textStyle || {};
  return [
    styles.alignment === "center" && "hero--center",
    styles.height && `hero--h-${styles.height}`,
    styles.headingFont && styles.headingFont !== "brand" && `hero--font-${styles.headingFont}`,
    styles.headingSize && `hero--title-${styles.headingSize}`,
    t.italic && "hero--italic",
    t.uppercase && "hero--uppercase",
    styles.background && styles.background !== "image" && `hero--bg-${styles.background}`,
  ]
    .filter(Boolean)
    .join(" ");
}

type SandlerHeroProps = DotCMSBasicContentlet & {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  size?: "large" | "compact";
  /** Background image; a navy overlay keeps the text readable. */
  image?: DotCMSImageField;
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  dotStyleProperties?: HeroStyles;
};

export default function SandlerHero(props: SandlerHeroProps) {
  const t = useT();
  const {
    title,
    eyebrow,
    subtitle,
    size = "compact",
    image,
    primaryCtaText,
    primaryCtaLink,
    secondaryCtaText,
    secondaryCtaLink,
    dotStyleProperties,
  } = props;
  // Headline and subtitle are inline-editable in the editor's Edit mode.
  const editing = useIsEditing();
  const { selectedCenter } = useSiteData();
  const current = useCurrentCenter();
  const styles = dotStyleProperties || {};
  const editable = (fieldName: "title" | "subtitle") => (
    <DotCMSEditableText contentlet={props} fieldName={fieldName} />
  );
  // A non-image background replaces the photo.
  const background = !styles.background || styles.background === "image" ? imageSrc(image) : undefined;

  // Once a visitor has chosen a center, "Find your training center" becomes a
  // direct link to it.
  const primary =
    selectedCenter && primaryCtaLink === "/locations"
      ? { text: t("center.visit", { city: centerShortName(selectedCenter) }), href: centerHref(selectedCenter) }
      : { text: primaryCtaText, href: primaryCtaLink && resolveCenterLink(primaryCtaLink, current) };
  const secondaryHref = secondaryCtaLink && resolveCenterLink(secondaryCtaLink, current);
  // On a center's pages the eyebrow names the center.
  const label = current ? `${current.title} · ${current.city}, ${current.region}` : eyebrow;

  return (
    <section className={`hero hero--${size} ${heroStyleClasses(styles)}`}>
      {background && (
        <Image src={background} alt="" fill priority sizes="100vw" className="hero__image" />
      )}
      <div className="hero__inner">
        {label && !styles.textStyle?.hideEyebrow && <p className="eyebrow eyebrow--light">{label}</p>}
        {editing ? (
          <>
            <div className="hero__title">{editable("title")}</div>
            <div className="hero__subtitle">{editable("subtitle")}</div>
          </>
        ) : (
          <>
            <h1>{title}</h1>
            {subtitle && <p className="hero__subtitle">{subtitle}</p>}
          </>
        )}
        {(primary.text || secondaryCtaText) && (
          <div className="hero__actions">
            {primary.text && primary.href && (
              <Link href={primary.href} className="btn btn--white">
                {primary.text} <BarsIcon />
              </Link>
            )}
            {secondaryCtaText && secondaryHref && (
              <Link href={secondaryHref} className="btn btn--outline-light">
                {secondaryCtaText}
              </Link>
            )}
          </div>
        )}
        {size === "large" && !current && selectedCenter && (
          <p className="hero__local">
            <MapPin aria-hidden className="h-4 w-4 text-brand-cyan" />
            {t("center.showingFrom", { center: selectedCenter.title })}
          </p>
        )}
      </div>
    </section>
  );
}
