import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DotCMSBlockEditorRenderer } from "@dotcms/react";
import type { NewsArticle } from "@/types/page";
import { toBlocks } from "@/utils/blocks";
import { NEWS_CATEGORIES } from "@/utils/content";
import { longDate } from "@/utils/dates";
import { imageSrc } from "@/utils/images";

/** A news article at /news/{urlTitle}: the URL-mapped TsdNews contentlet. */
export function NewsDetail({ article }: { article: NewsArticle }) {
  const blocks = toBlocks(article.body);
  const src = imageSrc(article.image);
  return (
    <article>
      <header className="page-banner page-banner--navy page-banner--left">
        <div className="container-tsd page-banner__inner">
          <div className="page-banner__text">
            <p className="eyebrow eyebrow--light">
              {NEWS_CATEGORIES[article.category] ?? article.category} · <time>{longDate(article.publishDate)}</time>
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
