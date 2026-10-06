import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DotCMSBlockEditorRenderer } from "@dotcms/react";
import type { NewsArticle } from "@/types/page";
import { toBlocks } from "@/utils/blocks";
import { categoryColor, toCategories } from "@/utils/categories";
import { longDate } from "@/utils/dates";
import { imageSrc } from "@/utils/images";

/** A news article at /news/{urlTitle}: the URL-mapped TsdNews contentlet. */
export function NewsDetail({ article }: { article: NewsArticle }) {
  const blocks = toBlocks(article.body);
  // urlContentMap carries the page API's shape of a category field.
  const categories = toCategories(article.newsCategories);
  const src = imageSrc(article.image);
  return (
    <article>
      <header className="page-banner page-banner--navy page-banner--left">
        <div className="container-tsd page-banner__inner">
          <div className="page-banner__text">
            <p className="eyebrow eyebrow--light">
              <time>{longDate(article.publishDate)}</time>
            </p>
            <h1>{article.title}</h1>
          </div>
        </div>
      </header>
      <div className="section section--white">
        <div className="container-tsd article">
          {src && (
            <figure className="article__image">
              <Image src={src} alt={article.imageAlt ?? ""} fill priority sizes="(min-width: 1024px) 360px, 100vw" />
            </figure>
          )}
          <div className="prose-tsd">
            {categories.length > 0 && (
              <ul className="article__categories" aria-label="Categories">
                {categories.map((c) => (
                  <li key={c.key}>
                    {/* Each category links to the news page, filtered to it. */}
                    <Link href={`/news?category=${c.key}`} className="category-chip category-chip--link">
                      <span className="category-chip__dot" style={{ background: categoryColor(c.key) }} aria-hidden />
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="article__teaser">{article.teaser}</p>
            {blocks && <DotCMSBlockEditorRenderer blocks={blocks} />}
            <p>
              <Link href="/news" className="text-link">
                <ArrowLeft aria-hidden className="h-4 w-4" /> All news
              </Link>
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
