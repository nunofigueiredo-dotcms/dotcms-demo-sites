import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDotCMSPage, type PageMode } from "@/utils/getDotCMSPage";
import type { NewsArticle, Resource, SiteAlert, StaffMember } from "@/types/page";
import { AlertBanner, DismissedAlertsScript } from "@/components/site/AlertBanner";
import { austinNow, parseDate } from "@/utils/dates";
import { buildPageMetadata } from "@/utils/seo";
import { Page } from "@/views/Page";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { GoogleAnalytics } from "@/components/site/GoogleAnalytics";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const SITE_NAME = "Texas School for the Deaf";

/** The Universal Visual Editor loads pages with ?mode=EDIT_MODE or PREVIEW_MODE. */
async function pageMode(searchParams: PageProps["searchParams"]): Promise<PageMode> {
  const mode = (await searchParams).mode;
  if (mode === "EDIT_MODE") return "EDIT";
  if (mode === "PREVIEW_MODE") return "PREVIEW";
  return "LIVE";
}

const SEVERITY_ORDER = { emergency: 0, closure: 1, info: 2 };

/**
 * The alerts to show on this page, most severe first: those running now (by
 * their start and end times, in Austin) for this page. In the editor every
 * alert is shown, so editors can preview one before it starts.
 */
function activeAlerts(alerts: SiteAlert[], path: string, inEditor: boolean): SiteAlert[] {
  const now = austinNow();
  return alerts
    .filter((a) => inEditor || ((parseDate(a.startDate) ?? now) <= now && now <= (parseDate(a.endDate) ?? now)))
    .filter((a) => a.scope !== "home" || path === "/")
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3));
}

function resolvePath(slug?: string[]): string {
  return `/${(slug ?? []).join("/")}`;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const path = resolvePath((await params).slug);
  // Same arguments as the page render, so React's cache() serves both from
  // one request to dotCMS.
  const pageData = await getDotCMSPage(path, await pageMode(searchParams));
  if (!pageData) return { title: `Page not found | ${SITE_NAME}` };
  const { page, urlContentMap } = pageData.pageAsset ?? {};
  // A news article's own title and teaser, not the shared detail page's.
  const article =
    urlContentMap?.contentType === "TsdNews" ? (urlContentMap as unknown as NewsArticle) : undefined;
  const person = urlContentMap?.contentType === "TsdStaff" ? (urlContentMap as unknown as StaffMember) : undefined;
  const resource = urlContentMap?.contentType === "TsdResource" ? (urlContentMap as unknown as Resource) : undefined;
  const title =
    article?.title ||
    (person && `${person.title}, ${person.jobTitle}`) ||
    resource?.title ||
    page?.friendlyName ||
    page?.title;
  return buildPageMetadata({
    title: path === "/" ? title : `${title} | ${SITE_NAME}`,
    description:
      article?.teaser || (person && `${person.jobTitle} at ${SITE_NAME}.`) || resource?.summary || page?.seodescription,
    path,
    type: article ? "article" : "website",
  });
}

export default async function CatchAllPage({ params, searchParams }: PageProps) {
  const mode = await pageMode(searchParams);
  const path = resolvePath((await params).slug);
  const pageContent = await getDotCMSPage(path, mode);
  if (!pageContent) return notFound();

  const layout = pageContent.pageAsset?.layout;
  const navItems = pageContent.content?.navigation?.children ?? [];
  const settings = pageContent.content?.settings?.[0];

  return (
    <>
      {/* First on the page, before the alerts and the header. */}
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <DismissedAlertsScript />
      <AlertBanner alerts={activeAlerts(pageContent.content?.alerts ?? [], path, mode !== "LIVE")} scheduledNote={mode !== "LIVE"} />
      {layout?.header && <Header navItems={navItems} settings={settings} />}
      <Page pageContent={pageContent} />
      {layout?.footer && <Footer navItems={navItems} settings={settings} />}
      {/* Only on the public site: editors' visits aren't traffic. */}
      {mode === "LIVE" && <GoogleAnalytics measurementId={settings?.gaMeasurementId} />}
    </>
  );
}
