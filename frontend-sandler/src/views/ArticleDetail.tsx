"use client";

import { Link } from "@/components/site/Locale";
import { ArrowLeft } from "lucide-react";
import { DotCMSBlockEditorRenderer } from "@dotcms/react";
import { formatDate } from "@/utils/dates";
import { dateLocale } from "@/utils/i18n";
import { useLocale } from "@/components/site/Locale";
import { toBlocks } from "@/utils/blocks";
import type { SandlerArticle } from "./detail";
import { useT } from "@/components/site/Strings";

export function ArticleDetail({ article }: { article: SandlerArticle }) {
  const t = useT();
  const blocks = toBlocks(article.body);
  const locale = useLocale();

  return (
    <article>
      <header className="hero hero--compact">
        <div className="hero__inner">
          <p className="eyebrow">
            {article.category} · {formatDate(article.publishDate, dateLocale(locale))}
          </p>
          <h1>{article.title}</h1>
          {article.teaser && <p className="hero__subtitle">{article.teaser}</p>}
        </div>
      </header>
      <div className="section section--light">
        <div className="section__inner">
          <div className="web-page-content article-body">
            {blocks && <DotCMSBlockEditorRenderer blocks={blocks} />}
            <p>
              <Link href="/articles" className="inline-flex items-center gap-2 font-semibold">
                <ArrowLeft aria-hidden className="h-4 w-4" /> {t("articles.all")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
