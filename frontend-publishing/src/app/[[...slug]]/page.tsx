import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { UveBridge } from "@/components/uve";
import { currentUser, getPage, getWithRelations, search, type PageMode } from "@/lib/dotcms";
import { hubSession, readerName } from "@/lib/session";
import type { Article, MessagingSot } from "@/lib/types";
import { first, mappedItem } from "@/lib/types";
import { ArticleView } from "@/views/ArticleView";
import { HomeView } from "@/views/HomeView";
import { HubView } from "@/views/HubView";
import { TopicView } from "@/views/TopicView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The Universal Visual Editor asks for pages with ?mode=EDIT_MODE|PREVIEW_MODE. */
async function resolve({ params, searchParams }: PageProps) {
  const query = await searchParams;
  const m = one(query.mode);
  const mode: PageMode = m === "EDIT_MODE" ? "EDIT" : m === "PREVIEW_MODE" ? "PREVIEW" : "LIVE";
  const path = `/${((await params).slug ?? []).join("/")}`;
  return { path, mode, query };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { path, mode } = await resolve(props);
  const page = await getPage(path, mode);
  if (!page) return { title: "Not found" };
  const map = mappedItem<Article & MessagingSot>(page);
  if (map?.contentType === "PdArticle") return { title: map.h1, description: map.seoSummary };
  if (map?.contentType === "PdMessagingSot") return { title: `${map.title} (v${map.version})` };
  return { title: page.pageAsset?.page?.title };
}

export default async function CatchAll(props: PageProps) {
  const { path, mode, query } = await resolve(props);
  const page = await getPage(path, mode);
  if (!page?.pageAsset) notFound();

  const session = await hubSession();
  const user = session ? await currentUser(session) : null;
  const reader = session && !user ? await readerName() : undefined;
  const map = mappedItem<Article & MessagingSot>(page);

  let body: React.ReactNode;
  if (map?.contentType === "PdArticle") {
    const [full, pdf] = await Promise.all([
      getWithRelations<Article>(map.inode),
      search<{ identifier: string; fileName: string }>(`+contentType:FileAsset +FileAsset.fileName:${map.urlTitle}.pdf`, { live: true, limit: 1 }),
    ]);
    const sot = first(full?.relatedSot);
    body = (
      <>
        <ArticleJsonLd article={map} />
        <ArticleView
          page={page}
          pdfHref={pdf[0] ? `/dA/${pdf[0].identifier}/${map.urlTitle}.pdf` : undefined}
          source={sot ? { title: sot.title, href: `/topics/${sot.urlTitle}`, version: String(sot.version) } : undefined}
        />
      </>
    );
  } else if (map?.contentType === "PdMessagingSot") {
    body = <TopicView sot={map} />;
  } else if (path === "/hub") {
    body = <HubView q={one(query.q)?.slice(0, 80)} topic={one(query.topic)} signInFailed={one(query.signin) === "failed"} />;
  } else if (path === "/") {
    body = <HomeView />;
  } else {
    notFound();
  }

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      {map?.contentType !== "PdArticle" && <UveBridge page={page} />}
      <Header path={path} userName={user?.name ?? reader} />
      <main id="main" tabIndex={-1}>{body}</main>
      <Footer />
    </>
  );
}

/** Article and FAQ structured data, for search and answer engines. */
function ArticleJsonLd({ article }: { article: Article }) {
  const faq = article.faq && typeof article.faq === "object" ? Object.entries(article.faq) : [];
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.h1,
      description: article.seoSummary || article.standfirst,
      author: article.author ? { "@type": "Person", name: article.author } : undefined,
      dateModified: article.lastReviewed,
    },
    ...(faq.length
      ? [{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
        }]
      : []),
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
