"use client";

import Image from "next/image";
import { Link } from "@/components/site/Locale";
import { ArrowUpRight, Brain, ChevronRight, Repeat, Target } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { BarsIcon } from "@/components/BarsIcon";
import { useCurrentCenter } from "@/components/site/CurrentCenter";
import { resolveCenterLink } from "@/utils/centers";
import { imageSrc, type DotCMSImageField } from "@/utils/images";

type Layout = "cards" | "numbered" | "triangle" | "stats" | "awards" | "split";

type SandlerFeatureGridProps = DotCMSBasicContentlet & {
  eyebrow?: string;
  heading?: string;
  intro?: string;
  layout: Layout;
  theme?: "light" | "muted" | "dark";
  /** One item per line: "Title | Description | optional link". */
  items: string;
  /** Optional image: beside the list (split) or the badge (awards). */
  image?: DotCMSImageField;
  ctaText?: string;
  ctaLink?: string;
};

interface Item {
  title: string;
  text: string;
  link?: string;
}

function parseItems(items: string): Item[] {
  return (items ?? "")
    .split("\n")
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter(([title]) => Boolean(title))
    .map(([title, text = "", link]) => ({ title, text, link: link || undefined }));
}

// Behavior, attitude, technique — the three corners of the Success Triangle.
const TRIANGLE_ICONS = [Repeat, Brain, Target];

function ItemCard({ item, index, layout }: { item: Item; index: number; layout: Layout }) {
  const current = useCurrentCenter();
  switch (layout) {
    case "numbered":
      return (
        <li className="feature feature--bar">
          <span className="feature__number">{String(index + 1).padStart(2, "0")}</span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </li>
      );
    case "split":
      return (
        <li className="feature feature--split">
          <ChevronRight aria-hidden className="h-6 w-6 text-brand-cyan shrink-0" />
          <div>
            <h3>{item.title}</h3>
            {item.text && <p>{item.text}</p>}
          </div>
        </li>
      );
    case "triangle": {
      const Icon = TRIANGLE_ICONS[index % TRIANGLE_ICONS.length];
      // The description starts with the corner's name: "Behavior: …".
      const [corner, ...rest] = item.text.split(":");
      const hasCorner = rest.length > 0;
      const description = hasCorner ? rest.join(":").trim() : item.text;
      return (
        <li className="feature feature--triangle">
          <span className="feature__icon">
            <Icon aria-hidden className="h-7 w-7" />
          </span>
          {hasCorner && <p className="eyebrow">{corner}</p>}
          <h3>{item.title}</h3>
          <p>{description.charAt(0).toUpperCase() + description.slice(1)}</p>
        </li>
      );
    }
    case "stats":
      return (
        <li className="feature feature--stat">
          <span className="feature__stat">{item.title}</span>
          <p>{item.text}</p>
        </li>
      );
    case "awards":
      return (
        <li className="feature feature--bar">
          <p className="eyebrow">{item.title}</p>
          <h3>{item.text}</h3>
        </li>
      );
    default:
      return (
        <li className="feature feature--bar">
          <h3>{item.title}</h3>
          <p>{item.text}</p>
          {item.link && (
            <Link href={resolveCenterLink(item.link, current)} className="feature__link">
              Learn more <ArrowUpRight aria-hidden className="feature__link-icon" />
            </Link>
          )}
        </li>
      );
  }
}

export default function SandlerFeatureGrid({
  eyebrow,
  heading,
  intro,
  layout,
  theme = "light",
  items,
  image,
  ctaText,
  ctaLink,
}: SandlerFeatureGridProps) {
  const current = useCurrentCenter();
  const parsed = parseItems(items);
  const media = imageSrc(image);
  const header = (eyebrow || heading || intro) && (
    <header className={`section__header ${layout === "stats" ? "section__header--center" : ""}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      {heading && <h2>{heading}</h2>}
      {intro && <p>{intro}</p>}
    </header>
  );
  const list = (
    <ul className={`feature-grid feature-grid--${layout}`}>
      {parsed.map((item, i) => (
        // Titles can repeat (two awards from the same body), so key on both.
        <ItemCard key={`${item.title}|${item.text}`} item={item} index={i} layout={layout} />
      ))}
    </ul>
  );
  const cta = ctaText && ctaLink && (
    <div className="section__cta">
      <Link href={resolveCenterLink(ctaLink, current)} className="btn btn--primary">
        {ctaText} <BarsIcon />
      </Link>
    </div>
  );

  return (
    <section className={`section section--${theme}`}>
      <div className="section__inner">
        {media && (layout === "split" || layout === "awards") ? (
          <div className={`feature-split feature-split--${layout}`}>
            <div>
              {header}
              {list}
              {cta}
            </div>
            <div className="feature-split__media">
              <Image
                src={media}
                alt=""
                width={layout === "awards" ? 272 : 1071}
                height={layout === "awards" ? 334 : 632}
                sizes={layout === "awards" ? "200px" : "(min-width: 768px) 50vw, 100vw"}
              />
            </div>
          </div>
        ) : (
          <>
            {header}
            {list}
            {cta}
          </>
        )}
      </div>
    </section>
  );
}
