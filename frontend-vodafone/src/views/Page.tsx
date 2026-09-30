"use client";

import { DotCMSLayoutBody, useEditableDotCMSPage } from "@dotcms/react";
import type { DotCMSComposedPageResponse } from "@dotcms/types";
import { pageComponents } from "@/components/content-types";
import { SiteDataProvider } from "@/components/site/SiteData";
import type { DotCMSPageContent } from "@/types/page";

interface PageProps {
  pageContent: DotCMSComposedPageResponse<{ content: DotCMSPageContent }>;
}

/**
 * The page body, laid out from the dotCMS template and editable in UVE.
 * After every change in the editor, UVE re-runs the page's GraphQL query and
 * sends the result here, so slides, plans and stores come from the editable
 * page too, not just the page's own sections.
 */
export function Page({ pageContent }: PageProps) {
  const editablePage = useEditableDotCMSPage(pageContent);
  const content = editablePage?.content;
  return (
    <SiteDataProvider
      slides={content?.slides ?? []}
      plans={content?.plans ?? []}
      devices={content?.devices ?? []}
      stores={content?.stores ?? []}
    >
      <main>
        <DotCMSLayoutBody page={editablePage?.pageAsset} components={pageComponents} />
      </main>
    </SiteDataProvider>
  );
}
