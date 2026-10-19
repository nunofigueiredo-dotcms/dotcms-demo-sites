import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDotCMSPage, type PageMode } from "@/utils/getDotCMSPage";
import { getPageDescription } from "@/utils/pageDescription";
import { LANGUAGE_IDS, localeForLanguageId, splitLocale, t, type Locale } from "@/utils/i18n";
import { organizationJsonLd } from "@/utils/jsonld";
import { isRecord } from "@/utils/records";
import { buildPageMetadata, SITE_NAME } from "@/utils/seo";
import { imageSrc } from "@/utils/images";
import { Page } from "@/views/Page";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Announcements } from "@/components/site/Announcements";
import { GoogleAnalytics } from "@/components/site/GoogleAnalytics";
import { JsonLd } from "@/components/site/JsonLd";
import { LocaleProvider } from "@/components/site/Locale";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface PageRequest {
  /** The dotCMS page path, without the /ar prefix. */
  path: string;
  locale: Locale;
  mode: PageMode;
}

/**
 * Which page, in which language, and how it's being viewed. The Universal
 * Visual Editor loads pages with ?mode=EDIT_MODE|PREVIEW_MODE and the
 * language it is editing as ?language_id=…; the public site uses /ar/… for
 * Arabic.
 */
async function resolve({ params, searchParams }: PageProps): Promise<PageRequest> {
  const query = await searchParams;
  const mode: PageMode =
    query.mode === "EDIT_MODE" ? "EDIT" : query.mode === "PREVIEW_MODE" ? "PREVIEW" : "LIVE";
  const fromUrl = splitLocale(`/${((await params).slug ?? []).join("/")}`);
  const languageId = typeof query.language_id === "string" ? query.language_id : undefined;
  return { path: fromUrl.path, locale: localeForLanguageId(languageId) ?? fromUrl.locale, mode };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { path, locale, mode } = await resolve(props);
  // Same arguments as the page render, so React's cache() serves both from
  // one request to dotCMS.
  const pageData = await getDotCMSPage(path, mode, LANGUAGE_IDS[locale]);
  if (!pageData) return { title: `${t("notFoundTitle", locale)} | ${SITE_NAME[locale]}` };
  const { page, urlContentMap } = pageData.pageAsset ?? {};
  // An attraction's, event's, restaurant's or venue's own title, not its detail page's.
  const record = isRecord(urlContentMap) ? urlContentMap : undefined;
  const title = record?.title || page?.friendlyName || page?.title;
  const image = imageSrc(record?.image);
  return buildPageMetadata({
    title: path === "/" ? title : `${title} | ${SITE_NAME[locale]}`,
    description: record?.teaser || (await getPageDescription(path, LANGUAGE_IDS[locale])),
    path,
    locale,
    imageUrl: image?.split("?")[0],
    type: record ? "article" : "website",
  });
}

export default async function CatchAllPage(props: PageProps) {
  const { path, locale, mode } = await resolve(props);
  const pageContent = await getDotCMSPage(path, mode, LANGUAGE_IDS[locale]);
  if (!pageContent) return notFound();

  const layout = pageContent.pageAsset?.layout;
  const navItems = pageContent.content?.navigation?.children ?? [];
  const settings = pageContent.content?.settings?.[0];
  const inEditor = mode !== "LIVE";

  return (
    <LocaleProvider locale={locale} prefixLinks={!inEditor}>
      <a className="skip-link" href="#main">
        {t("skipToContent", locale)}
      </a>
      {path === "/" && <JsonLd data={organizationJsonLd(locale)} />}
      {layout?.header && (
        <>
          <Header navItems={navItems} settings={settings} path={path} inEditor={inEditor} />
          <Announcements settings={settings} />
        </>
      )}
      <Page pageContent={pageContent} />
      {layout?.footer && <Footer navItems={navItems} settings={settings} />}
      {/* Only on the public site: editors' visits aren't traffic. */}
      {!inEditor && <GoogleAnalytics measurementId={settings?.gaMeasurementId} />}
    </LocaleProvider>
  );
}
