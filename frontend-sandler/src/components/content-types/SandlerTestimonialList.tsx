"use client";

import type { DotCMSBasicContentlet } from "@dotcms/types";
import { Link } from "@/components/site/Locale";
import { useCurrentCenter } from "@/components/site/CurrentCenter";
import { useSiteData } from "@/components/site/SiteData";
import { TestimonialCard } from "@/components/site/TestimonialCard";
import { useT } from "@/components/site/Strings";

type SandlerTestimonialListProps = DotCMSBasicContentlet & {
  heading?: string;
  emptyText?: string;
  /** "3", "6" … or empty for all. When set, links to the full list. */
  limit?: string;
};

/** The current center's published testimonials. */
export default function SandlerTestimonialList({ heading, emptyText, limit }: SandlerTestimonialListProps) {
  const t = useT();
  const { testimonials, selectedCenter } = useSiteData();
  const center = useCurrentCenter() ?? selectedCenter;
  // Attributed quotes first; anonymous ones at the end.
  const list = center
    ? testimonials
        .filter((t) => t.center?.urlTitle === center.urlTitle)
        .sort((a, b) => Number(!a.name) - Number(!b.name))
    : [];
  const max = Number(limit) || undefined;
  const shown = max ? list.slice(0, max) : list;

  return (
    // The short version (a center's overview) sits on a tinted band.
    <section className={`section ${max ? "section--muted" : "section--light"}`}>
      <div className="section__inner">
        {heading && (
          <header className={`section__header ${max ? "section__header--split" : ""}`}>
            <div>
              {center && <p className="eyebrow">{center.title}</p>}
              <h2>{heading}</h2>
            </div>
            {max && center && list.length > max && (
              <Link href={`/locations/${center.urlTitle}/about-us/testimonials`} className="btn btn--outline">
                {t("testimonial.seeAll")}
              </Link>
            )}
          </header>
        )}
        {shown.length > 0 ? (
          <ul className="testimonial-grid">
            {shown.map((t) => (
              <TestimonialCard key={`${t.name}|${t.quote.slice(0, 40)}`} testimonial={t} />
            ))}
          </ul>
        ) : (
          <p className="text-lg text-brand-slate">{emptyText}</p>
        )}
      </div>
    </section>
  );
}
