import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDotCMSPage } from "@/utils/getDotCMSPage";
import { getLanguageId } from "@/utils/languages";
import { pageContentQuery } from "@/utils/queries";
import { buildPageMetadata } from "@/utils/seo";
import { isCenterSubpage } from "@/utils/centers";
import { allCenters } from "@/utils/content";
import { Page } from "@/views/Page";
import { SiteShell } from "@/components/site/SiteShell";

/**
 * A training center's subpages: /locations/{center}/solutions/sales-training,
 * /about-us, /events, /contact-us. Every center shares one dotCMS page per
 * subpage (under /center-pages/), rendered here in that center's context —
 * edit it once and all centers update, as on go.sandler.com.
 *
 * A page in the center's own folder (/locations/{center}/{path} in dotCMS)
 * comes first: that's how a franchisee adds pages of their own (a local
 * campaign page) or replaces a shared one with their own version.
 */
const SHARED_PAGES_FOLDER = "/center-pages";

interface PageProps {
  params: Promise<{ center: string; sub: string[] }>;
}

async function load(params: PageProps["params"]) {
  const { center: slug, sub } = await params;
  const path = sub.join("/");
  const languageId = await getLanguageId();
  const own = await getDotCMSPage(`/locations/${slug}/${path}`, pageContentQuery(languageId), languageId);
  if (own && !own.pageAsset?.urlContentMap?.identifier) {
    const center = allCenters(own.content).find((c) => c.urlTitle === slug);
    if (center) return { pageContent: own, center, path: `/locations/${slug}/${path}` };
  }
  const pageContent = await getDotCMSPage(
    `${SHARED_PAGES_FOLDER}/${path}`,
    pageContentQuery(languageId),
    languageId
  );
  const center = allCenters(pageContent?.content).find((c) => c.urlTitle === slug);
  // Only the solutions a center offers exist under it.
  if (!pageContent || !center || !isCenterSubpage(center, path)) return null;
  return { pageContent, center, path: `/locations/${slug}/${path}` };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const loaded = await load(params);
  if (!loaded) return { title: "Not found" };
  const page = loaded.pageContent.pageAsset?.page;
  return buildPageMetadata({
    title: `${page?.friendlyName || page?.title} | ${loaded.center.title}`,
    description: loaded.center.summary,
    path: loaded.path,
  });
}

export default async function CenterSubpage({ params }: PageProps) {
  const loaded = await load(params);
  if (!loaded) return notFound();
  const { pageContent, center } = loaded;
  const layout = pageContent.pageAsset?.layout;

  return (
    <SiteShell
      content={pageContent.content}
      showHeader={layout?.header}
      showFooter={layout?.footer}
      templateId={pageContent.pageAsset?.template?.identifier}
    >
      <Page pageContent={pageContent} center={center} />
    </SiteShell>
  );
}
