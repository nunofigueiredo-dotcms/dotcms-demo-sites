"use client";

import type { DotCMSBasicContentlet } from "@dotcms/types";
import { ArrowUpRight } from "lucide-react";
import { SmartLink } from "../SmartLink";
import { EditableText } from "./EditableText";

type WithHeader = DotCMSBasicContentlet & {
  eyebrow?: string;
  heading?: string;
  intro?: string;
  ctaText?: string;
  ctaLink?: string;
};

/** Eyebrow, heading and intro above a section, with its "View all" link at the end. */
export function SectionHeader({ contentlet }: { contentlet: WithHeader }) {
  const { eyebrow, heading, intro, ctaText, ctaLink } = contentlet;
  if (!eyebrow && !heading && !intro && !ctaText) return null;
  return (
    <header className="section__header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        {heading && (
          <h2 className="section__title">
            <EditableText contentlet={contentlet} field="heading" />
          </h2>
        )}
        {intro && <p className="section__intro">{intro}</p>}
      </div>
      {ctaText && ctaLink && (
        <SmartLink href={ctaLink} className="link-arrow">
          {ctaText}
          <ArrowUpRight aria-hidden className="h-4 w-4 flip-rtl" />
        </SmartLink>
      )}
    </header>
  );
}
