"use client";

import type { DotCMSBasicContentlet } from "@dotcms/types";
import { HeroSlideView, type SlideContent, type SlideStyles } from "@/components/site/HeroSlideView";
import { useIsEditing } from "@/hooks/useIsEditing";

type VodafoneHeroSlideProps = DotCMSBasicContentlet &
  SlideContent & {
    dotStyleProperties?: SlideStyles;
  };

/**
 * A single hero banner placed on a page — the home page's default. Its text
 * is editable in place, it has Style editor options, and it's published
 * with the page. For a rotating banner, use a Vodafone Hero Carousel.
 */
export default function VodafoneHeroSlide(props: VodafoneHeroSlideProps) {
  const editing = useIsEditing();
  return (
    <section className="hero-banner">
      <HeroSlideView slide={props} styles={props.dotStyleProperties} editable={editing ? props : undefined} priority />
    </section>
  );
}
