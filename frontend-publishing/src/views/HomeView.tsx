import Link from "next/link";
import { getArticles } from "@/lib/dotcms";
import { formatDate, topicName } from "@/lib/format";

/** Insights home, in the style of elsevier.com's Academic & Government pages. */
export async function HomeView() {
  const articles = await getArticles();
  const [lead, ...rest] = articles;
  return (
    <>
      <section className="bg-sand">
        <div className="container-page grid items-end gap-10 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <span className="accent-rule" aria-hidden />
            <p className="eyebrow">Insights for research leaders</p>
            <h1 className="mt-3 font-serif text-5xl font-semibold leading-[1.05] md:text-6xl">
              Trusted evidence. <br className="hidden md:block" />
              Clear decisions.
            </h1>
          </div>
          <p className="text-lg leading-relaxed text-ink-soft">
            Perspectives for university leaders, librarians, funders and governments on research integrity, open access,
            responsible AI and the impact of research funding.
          </p>
        </div>
      </section>

      <section className="container-page py-16" aria-labelledby="latest">
        <h2 id="latest" className="text-3xl font-bold">Latest insights</h2>
        {lead && (
          <Link href={`/articles/${lead.urlTitle}`} className="group mt-8 grid gap-8 rounded-2xl bg-ink p-8 text-white no-underline md:grid-cols-[1fr_1fr] md:p-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-orange">{topicName(lead.topic)}</p>
              <h3 className="mt-3 font-serif text-3xl font-semibold leading-tight group-hover:underline md:text-4xl">{lead.h1}</h3>
            </div>
            <div className="flex flex-col justify-between gap-6">
              <p className="text-lg text-white/85">{lead.standfirst}</p>
              <p className="text-sm text-white/70">
                {lead.author} · {formatDate(lead.lastReviewed)}
              </p>
            </div>
          </Link>
        )}
        <ul className="mt-8 grid gap-6 md:grid-cols-2">
          {rest.map((a) => (
            <li key={a.identifier}>
              <Link href={`/articles/${a.urlTitle}`} className="group block h-full rounded-2xl border border-line p-8 text-ink no-underline hover:bg-warm">
                <p className="eyebrow">{topicName(a.topic)}</p>
                <h3 className="mt-3 font-serif text-2xl font-semibold leading-snug group-hover:underline">{a.h1}</h3>
                <p className="mt-3 text-ink-soft">{a.standfirst}</p>
                <p className="mt-6 text-sm text-muted">
                  {a.author} · {formatDate(a.lastReviewed)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-warm" aria-labelledby="hub-promo">
        <div className="container-page flex flex-col items-start gap-6 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="hub-promo" className="text-2xl font-bold">Writing for Academic &amp; Government?</h2>
            <p className="mt-2 max-w-xl text-ink-soft">
              Start from the approved messaging: current key messages, proof points, and who to ask.
            </p>
          </div>
          <Link href="/hub" className="btn">Open the Messaging Hub</Link>
        </div>
      </section>
    </>
  );
}
