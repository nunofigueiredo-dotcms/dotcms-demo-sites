import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getDotCMSPage } from "@/utils/getDotCMSPage";
import { getLanguageId, getLocale } from "@/utils/languages";
import { localizeHref } from "@/utils/i18n";
import { allCenters } from "@/utils/content";
import { pageContentQuery } from "@/utils/queries";
import { buildPageMetadata } from "@/utils/seo";
import { Page } from "@/views/Page";
import { SiteShell } from "@/components/site/SiteShell";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Folders starting with "_" (e.g. /_franchisee-skeleton, the template for new
 * franchisee pages) are for HQ, not visitors. The site reads dotCMS with an
 * admin token, so folder permissions don't hide them here: they 404 unless
 * the Universal Visual Editor is loading them (it adds ?mode=EDIT_MODE /
 * PREVIEW_MODE). This hides them from the public site; it isn't security.
 */
async function isHidden(slug: string[] | undefined, searchParams: PageProps["searchParams"]) {
  if (!slug?.[0]?.startsWith("_")) return false;
  const mode = (await searchParams).mode;
  return mode !== "EDIT_MODE" && mode !== "PREVIEW_MODE";
}

function resolvePath(slug?: string[]): string {
  return `/${(slug ?? []).join("/")}`;
}

/**
 * A center's own page lives in dotCMS at /locations/{center}/index, built
 * from sections like any other page. dotCMS serves it ahead of the
 * TrainingCenter URL map, so the center has to be found from the path.
 */
function centerOfPage(
  slug: string[] | undefined,
  pageContent: NonNullable<Awaited<ReturnType<typeof getDotCMSPage>>>
) {
  // (A normal page may still carry an empty urlContentMap object.)
  if (slug?.length !== 2 || slug[0] !== "locations" || pageContent.pageAsset?.urlContentMap?.identifier) {
    return undefined;
  }
  return allCenters(pageContent.content).find((c) => c.urlTitle === slug[1]);
}

/**
 * go.sandler.com-style center URLs (/cora, /cora/about-us) lead to the
 * center's pages under /locations. Only asked when nothing else matched.
 */
async function centerRedirect(slug: string[] | undefined, languageId: number) {
  if (!slug?.length) return undefined;
  const site = await getDotCMSPage("/locations", pageContentQuery(languageId), languageId);
  const isCenter = allCenters(site?.content).some((c) => c.urlTitle === slug[0]);
  return isCenter ? `/locations/${slug.join("/")}` : undefined;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = resolvePath(slug);

  // Same arguments as the page render, so React's cache() serves both from
  // one request to dotCMS.
  const languageId = await getLanguageId();
  const pageData = await getDotCMSPage(path, pageContentQuery(languageId), languageId);
  if (!pageData) return { title: "Not found" };

  const page = pageData.pageAsset?.page;
  const mapped = pageData.pageAsset?.urlContentMap;
  const center = centerOfPage(slug, pageData);
  const mappedTitle = center?.title ?? (typeof mapped?.title === "string" ? mapped.title : undefined);
  return buildPageMetadata({
    title: mappedTitle ? `${mappedTitle} | Sandler` : page?.friendlyName || page?.title,
    description: page?.seodescription,
    path,
    type: mapped?.contentType === "SandlerArticle" ? "article" : "website",
  });
}

export default async function CatchAllPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  if (await isHidden(slug, searchParams)) return notFound();
  const languageId = await getLanguageId();
  const pageContent = await getDotCMSPage(resolvePath(slug), pageContentQuery(languageId), languageId);
  if (!pageContent) {
    const target = await centerRedirect(slug, languageId);
    if (target) redirect(localizeHref(target, await getLocale()));
    return notFound();
  }

  const layout = pageContent.pageAsset?.layout;

  return (
    <SiteShell
      content={pageContent.content}
      showHeader={layout?.header}
      showFooter={layout?.footer}
      templateId={pageContent.pageAsset?.template?.identifier}
    >
      <Page pageContent={pageContent} center={centerOfPage(slug, pageContent)} />
    </SiteShell>
  );
}
