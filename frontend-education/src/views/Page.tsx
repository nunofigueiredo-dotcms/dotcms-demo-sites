"use client";

import { DotCMSLayoutBody, useEditableDotCMSPage } from "@dotcms/react";
import type { DotCMSComposedPageResponse } from "@dotcms/types";
import { pageComponents } from "@/components/content-types";
import { AccessibilityPanel } from "@/components/site/AccessibilityPanel";
import { SiteDataProvider } from "@/components/site/SiteData";
import type { DotCMSPageContent, NewsArticle, Resource, StaffMember } from "@/types/page";
import { NewsDetail } from "./NewsDetail";
import { ResourceDetail } from "./ResourceDetail";
import { StaffProfile } from "./StaffProfile";

interface PageProps {
  pageContent: DotCMSComposedPageResponse<{ content: DotCMSPageContent }>;
}

/**
 * The page body, laid out from the dotCMS template and editable in UVE.
 * After every change in the editor, UVE re-runs the page's GraphQL query and
 * sends the result here, so news, events and promo banners come from the
 * editable page too, not just the page's own sections.
 */
export function Page({ pageContent }: PageProps) {
  const editablePage = useEditableDotCMSPage(pageContent);
  const content = editablePage?.content;
  const pageAsset = editablePage?.pageAsset;
  // /news/…, /staff/… and /resources/… carry the matched article, person or
  // resource in urlContentMap. The sections below come from the detail page in
  // dotCMS, so editors control what appears underneath.
  const mapped = pageAsset?.urlContentMap;
  const article = mapped?.contentType === "TsdNews" ? (mapped as unknown as NewsArticle) : undefined;
  const person = mapped?.contentType === "TsdStaff" ? (mapped as unknown as StaffMember) : undefined;
  const resource = mapped?.contentType === "TsdResource" ? (mapped as unknown as Resource) : undefined;

  return (
    <SiteDataProvider
      news={content?.news ?? []}
      events={content?.events ?? []}
      promos={content?.promos ?? []}
      staff={content?.staff ?? []}
      resources={content?.resources ?? []}
    >
      <main id="main" tabIndex={-1}>
        {article && <NewsDetail article={article} />}
        {person && <StaffProfile person={person} />}
        {resource && <ResourceDetail resource={resource} />}
        <DotCMSLayoutBody page={pageAsset} components={pageComponents} />
      </main>
      {/* In the editor only. Re-checks each time the editor sends the page. */}
      <AccessibilityPanel version={pageAsset} />
    </SiteDataProvider>
  );
}
