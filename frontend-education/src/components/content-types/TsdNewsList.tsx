"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { useSiteData } from "@/components/site/SiteData";
import { useIsInEditor } from "@/hooks/useIsEditing";
import { NEWS_CATEGORIES, isChecked } from "@/utils/content";
import { latestNews, longDate } from "@/utils/dates";
import { imageSrc } from "@/utils/images";

type TsdNewsListProps = DotCMSBasicContentlet & {
  heading?: string;
  /** "3", "6", "9" or "all" */
  count?: string;
  /** A category value, or "all" */
  category?: string;
  layout?: "cards" | "list";
  showAllLink?: unknown;
};

/** The latest published news articles, newest first. */
export default function TsdNewsList({ heading, count = "3", category = "all", layout = "cards", showAllLink }: TsdNewsListProps) {
  const inEditor = useIsInEditor();
  const { news } = useSiteData();
  const matching = latestNews(news).filter((n) => category === "all" || n.category === category);
  const articles = count === "all" ? matching : matching.slice(0, Number(count) || 3);

  if (!articles.length) {
    return inEditor ? <p className="editor-note">No published news{category !== "all" ? " in this category" : ""} yet.</p> : null;
  }

  return (
    <section className="section section--white list-section">
      <div className="container-tsd">
        {heading && (
          <header className="list-section__header">
            <h2 className="section__title">{heading}</h2>
            {isChecked(showAllLink) && (
              <Link href="/news" className="text-link">
                All news <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            )}
          </header>
        )}
        <ul className={`news-list news-list--${layout}`}>
          {articles.map((article) => {
            const src = imageSrc(article.image);
            return (
              <li key={article.identifier}>
                <article className="news-card">
                  {layout === "cards" && src && (
                    <div className="news-card__image">
                      <Image src={src} alt={article.imageAlt ?? ""} fill sizes="(min-width: 1024px) 33vw, 100vw" />
                    </div>
                  )}
                  <div className="news-card__body">
                    <p className="news-card__meta">
                      <span>{NEWS_CATEGORIES[article.category] ?? article.category}</span>
                      <time>{longDate(article.publishDate)}</time>
                    </p>
                    <h3>
                      {/* The whole card is clickable; the link itself is the title. */}
                      <Link href={`/news/${article.urlTitle}`} className="stretched-link">
                        {article.title}
                      </Link>
                    </h3>
                    <p className="news-card__teaser">{article.teaser}</p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
