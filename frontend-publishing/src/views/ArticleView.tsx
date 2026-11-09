"use client";

import { DotCMSEditableText, useEditableDotCMSPage } from "@dotcms/react";
import { editContentlet, enableBlockEditorInline } from "@dotcms/uve";
import { Blocks, useIsEditing } from "@/components/uve";
import { asContentlet, mappedItem, type Article, type PageResponse } from "@/lib/types";
import { formatDate, topicName } from "@/lib/format";

interface ArticleViewProps {
  page: PageResponse;
  /** Link to the approved PDF of this article, when one has been generated */
  pdfHref?: string;
  /** The source of truth this article is based on */
  source?: { title: string; href: string; version: string };
}

/**
 * A thought leadership article. In the Universal Visual Editor's Edit mode the
 * H1 and standfirst are edited in place, and clicking the body opens the block
 * editor on the page, so a single heading inside it (an H3) is one click away.
 */
export function ArticleView({ page, pdfHref, source }: ArticleViewProps) {
  // After an edit, UVE sends the updated page here.
  const live = useEditableDotCMSPage(page);
  const article = (mappedItem<Article>(live) ?? mappedItem<Article>(page)) as Article;
  const editing = useIsEditing();
  const faq = article.faq && typeof article.faq === "object" ? Object.entries(article.faq) : [];

  return (
    <article>
      <div className="bg-sand">
        <div className="container-page py-14 md:py-20">
          <p className="eyebrow">{topicName(article.topic) ?? "Insights"}</p>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl leading-tight font-semibold md:text-[3.25rem]">
            {editing ? <DotCMSEditableText contentlet={asContentlet(article)} fieldName="h1" format="text" mode="plain" /> : article.h1}
          </h1>
          <p className="mt-6 max-w-3xl text-xl leading-relaxed text-ink-soft">
            {editing ? <DotCMSEditableText contentlet={asContentlet(article)} fieldName="standfirst" format="text" mode="plain" /> : article.standfirst}
          </p>
          <p className="mt-8 text-sm text-muted">
            {article.author && <strong className="text-ink">{article.author}</strong>}
            {article.authorRole && <>, {article.authorRole}</>}
            {article.lastReviewed && <> · Last reviewed {formatDate(article.lastReviewed)}</>}
          </p>
        </div>
      </div>

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 max-w-[720px]">
          {editing && (
            <div className="no-print mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-orange/40 bg-orange/5 p-3 text-sm">
              <span>
                <strong>Edit mode.</strong> Click any heading or paragraph below to edit it in place.
              </span>
              <button type="button" className="btn btn-outline !py-1 !text-sm" onClick={() => editContentlet(asContentlet(article))}>
                Open full editor and workflow
              </button>
            </div>
          )}
          <div
            className={editing ? "uve-editable" : undefined}
            onClick={editing ? () => enableBlockEditorInline(asContentlet(article), "body") : undefined}
          >
            <Blocks value={article.body} className="prose-article" />
          </div>

          {faq.length > 0 && (
            <section className="mt-16 border-t border-line pt-10" aria-labelledby="faq-heading">
              <h2 id="faq-heading" className="text-2xl font-bold">
                Frequently asked questions
              </h2>
              <div className="mt-6 divide-y divide-line border-y border-line">
                {faq.map(([q, a]) => (
                  <details key={q} className="group py-4">
                    <summary className="cursor-pointer list-none font-semibold marker:hidden">
                      <span className="mr-2 inline-block text-orange transition group-open:rotate-90">›</span>
                      {q}
                    </summary>
                    <p className="mt-3 pl-5 text-ink-soft">{a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="no-print space-y-6 text-sm">
          {article.seoSummary && (
            <div className="rounded-lg border border-line p-5">
              <p className="eyebrow">In brief</p>
              <p className="mt-2 text-ink-soft">{article.seoSummary}</p>
            </div>
          )}
          {pdfHref && (
            <a className="btn w-full justify-center" href={pdfHref}>
              Download PDF
            </a>
          )}
          {source && (
            <div className="rounded-lg bg-warm p-5">
              <p className="eyebrow">Based on approved messaging</p>
              <a className="mt-2 block font-semibold" href={source.href}>
                {source.title}
              </a>
              <p className="mt-1 text-muted">Source of truth, version {source.version}</p>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
