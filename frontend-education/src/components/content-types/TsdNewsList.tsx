"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Pin, Rss } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { CategoryFilter, useCategoryFilter } from "@/components/site/CategoryFilter";
import { useSiteData } from "@/components/site/SiteData";
import { useIsInEditor } from "@/hooks/useIsEditing";
import { distinctCategories, toCategories } from "@/utils/categories";
import { isChecked } from "@/utils/content";
import { latestNews, longDate } from "@/utils/dates";
import { imageSrc } from "@/utils/images";

type TsdNewsListProps = DotCMSBasicContentlet & {
  heading?: string;
  /** "3", "6", "9" or "all" */
  count?: string;
  /** "Only these categories": a category field; empty shows every category. */
  newsCategories?: unknown;
  layout?: "cards" | "list";
  /** Options checkbox: "true" (All news link), "filter", "rss". */
  showAllLink?: unknown;
};

/**
 * Published news, pinned articles first, then newest first. Editors can
 * limit a list to some categories (e.g. Academics news on the Academics
 * page) and turn on category filter buttons and an RSS link for visitors.
 */
export default function TsdNewsList({ heading, count = "3", newsCategories, layout = "cards", showAllLink }: TsdNewsListProps) {
  const inEditor = useIsInEditor();
  const scope = toCategories(newsCategories).map((c) => c.key);
  // On an article's page, "More news" leaves out the article itself.
  const pathname = usePathname();
  const matching = latestNews(useSiteData().news).filter(
    (n) =>
      pathname !== `/news/${n.urlTitle}` &&
      (!scope.length || (n.newsCategories ?? []).some((c) => scope.includes(c.key))),
  );
  const showFilter = isChecked(showAllLink, "filter");
  const filters = distinctCategories(matching.map((n) => n.newsCategories ?? []));
  const [selected, select] = useCategoryFilter(filters, showFilter);
  const filtered = selected ? matching.filter((n) => (n.newsCategories ?? []).some((c) => c.key === selected)) : matching;
  const articles = count === "all" ? filtered : filtered.slice(0, Number(count) || 3);
  const selectedCategory = filters.find((c) => c.key === selected);

  if (!matching.length) {
    return inEditor ? <p className="editor-note">No published news{scope.length ? " in the chosen categories" : ""} yet.</p> : null;
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
        {showFilter && (
          <CategoryFilter label="Filter news by category" filters={filters} selected={selected} onSelect={select} />
        )}
        {isChecked(showAllLink, "rss") && (
          <p className="feed-links">
            <a href={`/api/news${selected ? `?category=${selected}` : ""}`} className="feed-links__link">
              <Rss aria-hidden className="h-4 w-4" /> RSS feed{selectedCategory ? `: ${selectedCategory.name}` : ""}
            </a>
          </p>
        )}
        {showFilter && (
          <p className="sr-only" role="status">
            Showing {articles.length} {selectedCategory ? `${selectedCategory.name} ` : ""}articles
          </p>
        )}
        <ul className={`news-list news-list--${layout}`}>
          {articles.map((article) => {
            const src = imageSrc(article.image);
            const pinned = isChecked(article.pinned, "pinned");
            const categories = article.newsCategories ?? [];
            return (
              <li key={article.identifier}>
                <article className={pinned ? "news-card news-card--pinned" : "news-card"}>
                  {layout === "cards" && src && (
                    <div className="news-card__image">
                      <Image src={src} alt={article.imageAlt ?? ""} fill sizes="(min-width: 1024px) 33vw, 100vw" />
                    </div>
                  )}
                  <div className="news-card__body">
                    <p className="news-card__meta">
                      {pinned && (
                        <span className="news-card__pinned">
                          <Pin aria-hidden className="h-3.5 w-3.5" /> Pinned
                        </span>
                      )}
                      {categories.length > 0 && <span>{categories.map((c) => c.name).join(" · ")}</span>}
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
        {articles.length === 0 && <p className="event-list__empty">No news in this category yet.</p>}
      </div>
    </section>
  );
}
