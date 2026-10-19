"use client";

import { DotCMSLayoutBody, useEditableDotCMSPage } from "@dotcms/react";
import type { DotCMSComposedPageResponse } from "@dotcms/types";
import { pageComponents } from "@/components/content-types";
import { SiteDataProvider } from "@/components/site/SiteData";
import type { DotCMSPageContent } from "@/types/page";
import { isRecord } from "@/utils/records";
import { RecordDetail } from "./RecordDetail";

interface PageProps {
  pageContent: DotCMSComposedPageResponse<{ content: DotCMSPageContent }>;
}

/**
 * The page body, laid out from the dotCMS template and editable in UVE.
 * After every change in the editor, UVE re-runs the page's GraphQL query and
 * sends the result here, so the collections refresh along with the sections.
 */
export function Page({ pageContent }: PageProps) {
  const editablePage = useEditableDotCMSPage(pageContent);
  const content = editablePage?.content;
  const pageAsset = editablePage?.pageAsset;
  // /visit/attractions/…, /visit/events/…, /visit/dining/… and /spaces/…
  // carry the matched item in urlContentMap.
  const mapped = pageAsset?.urlContentMap;
  const record = isRecord(mapped) ? mapped : undefined;

  return (
    <SiteDataProvider
      attractions={content?.attractions ?? []}
      events={content?.events ?? []}
      restaurants={content?.restaurants ?? []}
      venues={content?.venues ?? []}
      faqs={content?.faqs ?? []}
    >
      <main id="main" tabIndex={-1}>
        {record && <RecordDetail item={record} />}
        <DotCMSLayoutBody page={pageAsset} components={pageComponents} />
      </main>
    </SiteDataProvider>
  );
}
