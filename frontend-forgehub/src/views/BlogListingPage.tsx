"use client";

import { ReactNode } from "react";
import { DotCMSLayoutBody, useEditableDotCMSPage } from "@dotcms/react";
import type { DotCMSComposedPageResponse, DotCMSPageResponse } from "@dotcms/types";
import { pageComponents } from "@/components/content-types";

interface BlogListingPageProps {
  pageContent: DotCMSComposedPageResponse<DotCMSPageResponse>;
  slots?: Record<string, ReactNode>;
}

export function BlogListingPage({ pageContent, slots }: BlogListingPageProps) {
  const editablePage = useEditableDotCMSPage(pageContent);
  const pageAsset = editablePage?.pageAsset;

  return (
    <main className="page-main">
      <DotCMSLayoutBody
        page={pageAsset}
        components={pageComponents}
        slots={slots}
      />
    </main>
  );
}
