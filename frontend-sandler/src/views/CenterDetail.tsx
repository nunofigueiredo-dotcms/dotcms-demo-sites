"use client";

import { Link } from "@/components/site/Locale";
import { Award, ChevronRight } from "lucide-react";
import { DotCMSBlockEditorRenderer } from "@dotcms/react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { CenterHero } from "@/components/site/CenterHero";
import { useIsEditing } from "@/hooks/useIsEditing";
import { EventCard } from "@/components/site/EventCard";
import { TestimonialCard } from "@/components/site/TestimonialCard";
import { useSiteData } from "@/components/site/SiteData";
import {
  centerHref,
  centerSolutions,
  lines,
  titledLines,
} from "@/utils/centers";
import { toBlocks } from "@/utils/blocks";
import type { TrainingCenterDetail } from "./detail";

/**
 * Fallback page for a training center that has no page of its own in
 * dotCMS (/locations/{center}/index): the sections are drawn from the
 * TrainingCenter content. Centers with their own page are built from
 * sections instead (SandlerCenterHero, SandlerCenterIntro, …).
 *
 * A training center's page, following the structure of the centers' own pages
 * on go.sandler.com. The shared sections below it (challenges, next steps)
 * come from the center detail page's layout in dotCMS.
 */
export function CenterDetail({ center }: { center: TrainingCenterDetail }) {
  const { events, testimonials } = useSiteData();
  const editing = useIsEditing();
  // The URL-mapped contentlet, as the page API sends it (inode, identifier…).
  const editableCenter = center as TrainingCenterDetail & DotCMSBasicContentlet;

  const solutions = centerSolutions(center);
  const upcoming = events.filter((e) => e.center?.urlTitle === center.urlTitle).slice(0, 2);
  const quotes = testimonials
    .filter((t) => t.center?.urlTitle === center.urlTitle && t.name)
    .slice(0, 3);
  const benefits = titledLines(center.benefits);
  const awards = lines(center.awards);
  const body = toBlocks(center.body);

  return (
    <>
      <CenterHero
        center={center}
        headline={center.headline || `Sales Training in ${center.city}`}
        subtitle={center.tagline}
        editable={editing ? { contentlet: editableCenter, headline: "headline", subtitle: "tagline" } : undefined}
      />

      <section className="section section--light">
        <div className="section__inner center-intro">
          <div>
            <p className="eyebrow">Sales Training in {center.city}</p>
            <h2>{center.tagline || center.title}</h2>
            {center.intro && <p className="center-intro__lead">{center.intro}</p>}
          </div>
          {solutions.length > 0 && (
            <div className="center-solutions">
              <h3>Our Solutions</h3>
              <ul>
                {solutions.map((solution) => (
                  <li key={solution.label}>
                    <Link href={solution.href}>
                      <ChevronRight aria-hidden className="h-5 w-5 text-brand-cyan shrink-0" />
                      {solution.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {body && (
        <section className="section section--light pt-0 md:pt-0">
          <div className="section__inner">
            <div className="web-page-content center-body">
              <DotCMSBlockEditorRenderer blocks={body} />
            </div>
          </div>
        </section>
      )}

      {benefits.length > 0 && (
        <section className="section section--dark">
          <div className="section__inner">
            <header className="section__header">
              <p className="eyebrow">Why Sandler</p>
              <h2>Why Choose {center.title}?</h2>
            </header>
            <ul className="feature-grid feature-grid--cards">
              {benefits.map((benefit) => (
                <li key={benefit.title} className="feature feature--bar">
                  <h3>{benefit.title}</h3>
                  <p>{benefit.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {quotes.length > 0 && (
        <section className="section section--muted">
          <div className="section__inner">
            <header className="section__header section__header--split">
              <div>
                <p className="eyebrow">Testimonials</p>
                <h2>What clients say</h2>
              </div>
              <Link href={`${centerHref(center)}/about-us/testimonials`} className="btn btn--outline">
                See All Testimonials
              </Link>
            </header>
            <ul className="testimonial-grid">
              {quotes.map((t) => (
                <TestimonialCard key={`${t.name}|${t.quote.slice(0, 40)}`} testimonial={t} />
              ))}
            </ul>
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="section section--light">
          <div className="section__inner">
            <header className="section__header section__header--split">
              <div>
                <p className="eyebrow">Coming up</p>
                <h2>Upcoming events in {center.city}</h2>
              </div>
              <Link href={`${centerHref(center)}/events`} className="btn btn--outline">
                See All Events
              </Link>
            </header>
            <ul className="event-list">
              {upcoming.map((event) => (
                <EventCard key={`${event.title}|${event.startDate}`} event={event} center={center} />
              ))}
            </ul>
          </div>
        </section>
      )}

      {awards.length > 0 && (
        <section className="section section--light">
          <div className="section__inner">
            <header className="section__header">
              <p className="eyebrow">Recognition</p>
              <h2>Awards &amp; Certifications</h2>
            </header>
            <ul className="center-awards">
              {awards.map((award) => (
                <li key={award}>
                  <Award aria-hidden className="h-6 w-6 text-brand-cyan shrink-0" />
                  {award}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
