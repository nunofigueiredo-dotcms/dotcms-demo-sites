"use client";

import { Link } from "@/components/site/Locale";
import { ArrowRight } from "lucide-react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { useSiteData } from "@/components/site/SiteData";
import { formatDate } from "@/utils/dates";
import { dateLocale } from "@/utils/i18n";
import { useLocale } from "@/components/site/Locale";
import { useT } from "@/components/site/Strings";

type SandlerArticleListProps = DotCMSBasicContentlet & {
  heading?: string;
  limit?: string;
  ctaText?: string;
  ctaLink?: string;
};

export default function SandlerArticleList({
  heading,
  limit = "3",
  ctaText,
  ctaLink,
}: SandlerArticleListProps) {
  const t = useT();
  const { articles } = useSiteData();
  const locale = useLocale();
  const shown = articles.slice(0, Number(limit) || 3);

  return (
    <section className="section section--light">
      <div className="section__inner">
        {heading && (
          <header className="section__header">
            <p className="eyebrow">{t("articles.eyebrow")}</p>
            <h2>{heading}</h2>
          </header>
        )}
        <ul className="article-grid">
          {shown.map((article) => (
            <li key={article.urlTitle} className="article-card">
              <p className="article-card__meta">
                <span>{article.category}</span>
                <time dateTime={article.publishDate}>{formatDate(article.publishDate, dateLocale(locale))}</time>
              </p>
              <h3>
                <Link href={`/articles/${article.urlTitle}`}>{article.title}</Link>
              </h3>
              {article.teaser && <p>{article.teaser}</p>}
              <span className="feature__link" aria-hidden>
                {t("articles.read")} <ArrowRight className="h-4 w-4" />
              </span>
            </li>
          ))}
        </ul>
        {ctaText && ctaLink && (
          <div className="section__cta">
            <Link href={ctaLink} className="btn btn--outline">
              {ctaText}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
