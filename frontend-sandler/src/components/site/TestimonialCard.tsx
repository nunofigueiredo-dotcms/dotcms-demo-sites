"use client";

import { useState } from "react";
import { Quote, Star } from "lucide-react";
import type { SandlerTestimonial } from "@/types/page";
import { useT } from "@/components/site/Strings";

const LONG_QUOTE = 280;

/** One testimonial: quote (long ones fold, as on go.sandler.com), stars, attribution. */
export function TestimonialCard({ testimonial }: { testimonial: SandlerTestimonial }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const long = testimonial.quote.length > LONG_QUOTE;
  const text = long && !open ? testimonial.quote.slice(0, LONG_QUOTE).replace(/\s+\S*$/, "") + "…" : testimonial.quote;
  const stars = Number(testimonial.rating) || 0;

  return (
    <li className="testimonial">
      <Quote aria-hidden className="testimonial__mark" />
      {stars > 0 && (
        <p className="testimonial__stars" aria-label={t("testimonial.stars", { stars })}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} aria-hidden className={`h-4 w-4 ${i < stars ? "fill-current" : "opacity-30"}`} />
          ))}
        </p>
      )}
      {testimonial.headline && <h3>{testimonial.headline}</h3>}
      <blockquote>{text}</blockquote>
      {long && (
        <button type="button" className="testimonial__more" onClick={() => setOpen((o) => !o)}>
          {open ? t("testimonial.showLess") : t("testimonial.readMore")}
        </button>
      )}
      <footer>
        <strong>{testimonial.name || t("testimonial.anonymous")}</strong>
        {testimonial.role && <span>{testimonial.role}</span>}
      </footer>
    </li>
  );
}
