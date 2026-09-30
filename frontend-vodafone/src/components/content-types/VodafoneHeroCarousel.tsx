"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { editContentlet } from "@dotcms/uve";
import { HeroSlideView } from "@/components/site/HeroSlideView";
import { useSiteData } from "@/components/site/SiteData";
import { useIsEditing, useIsInEditor } from "@/hooks/useIsEditing";
import type { HeroSlide } from "@/types/page";

type VodafoneHeroCarouselProps = DotCMSBasicContentlet & {
  /**
   * The Slides relationship, in the editor's order. The page data lists the
   * related slides by identifier; their content comes from the slides loaded
   * with the page (utils/queries.ts).
   */
  slides?: (string | { identifier: string })[];
  /** Seconds per slide; "0" stops the rotation. */
  interval?: string;
};

/** The slide shaped like a contentlet, for the editor's "edit content" dialog. */
function asContentlet({ conLanguage, ...slide }: HeroSlide) {
  return { ...slide, languageId: conLanguage?.id ?? 1 } as unknown as DotCMSBasicContentlet;
}

/**
 * A rotating hero banner: a widget editors add to a page, whose slides are
 * picked (and ordered) in its Slides field. Each slide is its own content,
 * so it can be reused in several carousels and goes through review before
 * it's published.
 */
export default function VodafoneHeroCarousel({ slides: related = [], interval = "7" }: VodafoneHeroCarouselProps) {
  const inEditor = useIsInEditor();
  const editing = useIsEditing();
  const all = useSiteData().slides;
  const slides = related
    .map((r) => all.find((s) => s.identifier === (typeof r === "string" ? r : r.identifier)))
    .filter((s): s is HeroSlide => Boolean(s));
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  // No rotation in the editor: the slide being edited shouldn't move away.
  const seconds = inEditor ? 0 : Number(interval) || 0;
  const active = Math.min(current, Math.max(slides.length - 1, 0));

  useEffect(() => {
    if (!seconds || paused || slides.length < 2) return;
    const timer = setInterval(() => setCurrent((i) => (i + 1) % slides.length), seconds * 1000);
    return () => clearInterval(timer);
  }, [seconds, paused, slides.length]);

  if (!slides.length) {
    return inEditor ? (
      <p className="editor-note">This carousel has no published slides yet. Edit it and pick some in the Slides field.</p>
    ) : null;
  }

  const go = (step: number) => setCurrent((i) => (i + step + slides.length) % slides.length);

  return (
    <section
      className="hero-carousel"
      aria-roledescription="carousel"
      aria-label="Featured offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <div
          key={slide.identifier}
          className={i === active ? "hero-carousel__slide is-active" : "hero-carousel__slide"}
          aria-hidden={i !== active}
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${slides.length}`}
        >
          <HeroSlideView slide={slide} priority={i === 0} />
          {editing && (
            <button type="button" className="hero-carousel__edit" onClick={() => editContentlet(asContentlet(slide))}>
              <Pencil aria-hidden className="h-4 w-4" /> Edit this slide
            </button>
          )}
        </div>
      ))}
      {slides.length > 1 && (
        <>
          <button type="button" className="hero-carousel__arrow hero-carousel__arrow--prev" aria-label="Previous slide" onClick={() => go(-1)}>
            ❮
          </button>
          <button type="button" className="hero-carousel__arrow hero-carousel__arrow--next" aria-label="Next slide" onClick={() => go(1)}>
            ❯
          </button>
          <div className="hero-carousel__dots">
            {slides.map((slide, i) => (
              <button
                key={slide.identifier}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                aria-current={i === active}
                className={i === active ? "is-active" : undefined}
                onClick={() => setCurrent(i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
