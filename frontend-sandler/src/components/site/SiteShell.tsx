import type { ReactNode } from "react";
import { cookies } from "next/headers";
import type { DotCMSPageContent, SandlerArticleSummary } from "@/types/page";
import { CENTER_COOKIE } from "@/utils/centers";
import { allCenters, withEnglishFallback } from "@/utils/content";
import { getLocale } from "@/utils/languages";
import { reducedHeaderTemplateIds } from "@/utils/templates";
import { LocaleProvider } from "./Locale";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SiteDataProvider } from "./SiteData";
import { StringsProvider } from "./Strings";
import { UtilityBar } from "./UtilityBar";

interface SiteShellProps {
  content?: DotCMSPageContent;
  showHeader?: boolean;
  showFooter?: boolean;
  /** The page's dotCMS template; some templates get a reduced header. */
  templateId?: string;
  children: ReactNode;
}

/**
 * Translated articles first; English ones fill in any not yet translated, so
 * a Spanish page still lists every article. Newest first.
 */
function mergeArticles(
  translated: SandlerArticleSummary[] = [],
  english: SandlerArticleSummary[] = []
): SandlerArticleSummary[] {
  const bySlug = new Map(english.map((a) => [a.urlTitle, a]));
  for (const a of translated) bySlug.set(a.urlTitle, a);
  return [...bySlug.values()].sort((a, b) => b.publishDate.localeCompare(a.publishDate));
}

/** Everything around the page body: locale, site data, utility bar, header, footer. */
export async function SiteShell({ content, showHeader, showFooter, templateId, children }: SiteShellProps) {
  const cookieStore = await cookies();
  const locale = await getLocale();
  const navItems = content?.navigation?.children ?? [];
  const reducedHeader = Boolean(templateId && (await reducedHeaderTemplateIds()).has(templateId));

  return (
    <LocaleProvider locale={locale}>
      <StringsProvider variables={content?.languageVariables ?? []}>
      <SiteDataProvider
        centers={allCenters(content)}
        articles={mergeArticles(content?.articles, content?.articlesEnglish)}
        events={withEnglishFallback(
          content?.events,
          content?.eventsEnglish,
          (e) => e.identifier ?? e.title,
          (e) => Boolean(e.center)
        )}
        testimonials={content?.testimonials ?? []}
        initialCenterSlug={cookieStore.get(CENTER_COOKIE)?.value}
      >
        {showHeader && (
          <>
            <UtilityBar />
            <Header navItems={navItems} reduced={reducedHeader} />
          </>
        )}
        {children}
        {showFooter && <Footer navItems={navItems} />}
      </SiteDataProvider>
      </StringsProvider>
    </LocaleProvider>
  );
}
