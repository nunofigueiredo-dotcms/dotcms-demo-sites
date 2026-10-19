"use client";

import { ChevronDown } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { JsonLd } from "@/components/site/JsonLd";
import { SectionHeader } from "@/components/site/SectionHeader";
import { useSiteData } from "@/components/site/SiteData";
import { paragraphs, selectValue } from "@/utils/content";
import { faqJsonLd } from "@/utils/jsonld";
import { sortFaqs } from "@/utils/records";

type ExpoFaqListProps = DotCMSBasicContentlet & {
  heading?: string;
  intro?: string;
  topic?: unknown;
  count?: unknown;
  theme?: "white" | "sand" | "charcoal" | "teal";
  ctaText?: string;
  ctaLink?: string;
};

/**
 * Questions and answers from the FAQ content, as an accordion. Each list
 * also publishes FAQPage data, which answer engines quote directly.
 */
export default function ExpoFaqList(props: ExpoFaqListProps) {
  const { faqs } = useSiteData();
  const topic = selectValue(props.topic) || "all";
  const count = selectValue(props.count) || "all";
  const matching = sortFaqs(topic === "all" ? faqs : faqs.filter((f) => selectValue(f.topic) === topic));
  const shown = count === "all" ? matching : matching.slice(0, Number(count));
  if (!shown.length) return null;
  return (
    <section className={`section section--${props.theme ?? "white"}`}>
      <div className="container-expo faq">
        <SectionHeader contentlet={props} />
        <div className="faq__list">
          {shown.map((f) => (
            <details key={f.identifier} className="faq__item">
              <summary>
                <span>{f.title}</span>
                <ChevronDown aria-hidden className="faq__chevron h-5 w-5" />
              </summary>
              <div className="faq__answer">
                {paragraphs(f.answer).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
        <JsonLd data={faqJsonLd(shown)} />
      </div>
    </section>
  );
}
