"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Pencil, Play } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { editContentlet } from "@dotcms/uve";
import { SmartLink } from "@/components/SmartLink";
import { useSiteData } from "@/components/site/SiteData";
import { useIsEditing, useIsInEditor } from "@/hooks/useIsEditing";
import type { PromoBanner } from "@/types/page";
import { imageSrc } from "@/utils/images";

type TsdPromoCarouselProps = DotCMSBasicContentlet & {
  /**
   * The Banners relationship, in the editor's order. The page data lists the
   * related banners by identifier; their content comes from the banners
   * loaded with the page (utils/queries.ts).
   */
  banners?: (string | { identifier: string })[];
  /** Seconds per banner; "0" stops the rotation. */
  interval?: string;
};

/** The banner shaped like a contentlet, for the editor's "edit content" dialog. */
function asContentlet({ conLanguage, ...banner }: PromoBanner) {
  return { ...banner, languageId: conLanguage?.id ?? 1 } as unknown as DotCMSBasicContentlet;
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Rotating promotional graphics. Each banner is its own content, so it can be
 * reused and scheduled on its own. Visitors can pause the rotation (WCAG
 * 2.2.2), and it never moves for visitors who ask for reduced motion.
 */
export default function TsdPromoCarousel({ banners: related = [], interval = "8" }: TsdPromoCarouselProps) {
  const inEditor = useIsInEditor();
  const editing = useIsEditing();
  const all = useSiteData().promos;
  const banners = related
    .map((r) => all.find((b) => b.identifier === (typeof r === "string" ? r : r.identifier)))
    .filter((b): b is PromoBanner => Boolean(b));
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  // No rotation in the editor: the banner being edited shouldn't move away.
  const seconds = inEditor ? 0 : Number(interval) || 0;
  const active = Math.min(current, Math.max(banners.length - 1, 0));

  useEffect(() => {
    if (!seconds || paused || hovered || banners.length < 2 || prefersReducedMotion()) return;
    const timer = setInterval(() => setCurrent((i) => (i + 1) % banners.length), seconds * 1000);
    return () => clearInterval(timer);
  }, [seconds, paused, hovered, banners.length]);

  if (!banners.length) {
    return inEditor ? (
      <p className="editor-note">This carousel has no published banners yet. Edit it and pick some in the Banners field.</p>
    ) : null;
  }

  const go = (step: number) => setCurrent((i) => (i + step + banners.length) % banners.length);

  return (
    <section className="section section--white">
      <div
        className="container-tsd promo"
        aria-roledescription="carousel"
        aria-label="Featured"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="promo__frame">
          {banners.map((banner, i) => {
            const src = imageSrc(banner.image);
            const picture = src && <Image src={src} alt={banner.imageAlt} fill sizes="(min-width: 1200px) 1200px, 100vw" />;
            return (
              <div
                key={banner.identifier}
                className={i === active ? "promo__slide is-active" : "promo__slide"}
                aria-hidden={i !== active}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${banners.length}`}
              >
                {banner.link && !editing ? (
                  <SmartLink href={banner.link} tabIndex={i === active ? 0 : -1}>
                    {picture}
                  </SmartLink>
                ) : (
                  picture
                )}
                {editing && (
                  <button type="button" className="promo__edit" onClick={() => editContentlet(asContentlet(banner))}>
                    <Pencil aria-hidden className="h-4 w-4" /> Edit this banner
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {banners.length > 1 && (
          <div className="promo__controls">
            <button type="button" aria-label="Previous banner" onClick={() => go(-1)}>
              <ChevronLeft aria-hidden className="h-5 w-5" />
            </button>
            {seconds > 0 && (
              <button type="button" aria-label={paused ? "Play" : "Pause"} onClick={() => setPaused((p) => !p)}>
                {paused ? <Play aria-hidden className="h-4 w-4" /> : <Pause aria-hidden className="h-4 w-4" />}
              </button>
            )}
            <div className="promo__dots">
              {banners.map((banner, i) => (
                <button
                  key={banner.identifier}
                  type="button"
                  aria-label={`Show banner ${i + 1}: ${banner.title}`}
                  aria-current={i === active}
                  className={i === active ? "is-active" : undefined}
                  onClick={() => setCurrent(i)}
                />
              ))}
            </div>
            <button type="button" aria-label="Next banner" onClick={() => go(1)}>
              <ChevronRight aria-hidden className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
