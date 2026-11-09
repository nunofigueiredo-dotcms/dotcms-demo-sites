import Image from "next/image";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/uve";
import { getWithRelations, getWorkflowState, search } from "@/lib/dotcms";
import { formatDate, topicName } from "@/lib/format";
import type { Article } from "@/lib/types";
import { first } from "@/lib/types";

export const dynamic = "force-dynamic";

/** A print layout of the approved (live) article. channels/fetch.sh turns it into
 * the downloadable PDF, so the PDF always comes from the same approved content. */
export default async function PrintArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [found] = await search<Article>(`+contentType:PdArticle +PdArticle.urlTitle:${slug.replace(/[^a-z0-9-]/gi, "")}`, { live: true, limit: 1 });
  if (!found) notFound();
  const [article, state] = await Promise.all([getWithRelations<Article>(found.inode), getWorkflowState(found.inode)]);
  const a = article ?? found;
  const source = first(a.relatedSot);
  const faq = a.faq && typeof a.faq === "object" ? Object.entries(a.faq) : [];

  return (
    <main className="mx-auto max-w-[760px] px-8 py-10 print:p-0">
      <style>{`@page { size: A4; margin: 18mm 18mm 20mm; } body { background: #fff; }`}</style>
      <header className="flex items-center justify-between border-b-4 border-orange pb-4">
        <Image src="/brand/elsevier-logo-orange.svg" alt="Elsevier" width={120} height={34} />
        <span className="text-xs uppercase tracking-wider text-muted">Insights · {topicName(a.topic)}</span>
      </header>
      <h1 className="mt-8 font-serif text-[2.1rem] font-semibold leading-tight">{a.h1}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-soft">{a.standfirst}</p>
      <p className="mt-4 text-sm text-muted">
        {a.author}
        {a.authorRole && `, ${a.authorRole}`} · Last reviewed {formatDate(a.lastReviewed)}
      </p>
      <Blocks value={a.body} className="prose-article mt-8 !text-[15.5px]" />
      {faq.length > 0 && (
        <section className="mt-10 break-inside-avoid border-t border-line pt-6">
          <h2 className="text-lg font-bold">Frequently asked questions</h2>
          <dl className="mt-3 space-y-3 text-[14px]">
            {faq.map(([q, ans]) => (
              <div key={q}>
                <dt className="font-semibold">{q}</dt>
                <dd className="text-ink-soft">{ans}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <footer className="mt-10 border-t border-line pt-4 text-[11px] leading-relaxed text-muted">
        Approved content from dotCMS · workflow step: {state?.step ?? "published"}
        {source && <> · based on “{source.title}” (source of truth v{source.version})</>} · approved version saved {formatDate(a.modDate)}.
        <br />
        Demo environment: fictional content, not an official Elsevier publication.
      </footer>
    </main>
  );
}
