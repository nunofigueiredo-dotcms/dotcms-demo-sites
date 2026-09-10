"use client";

import { DotCMSLayoutBody, useEditableDotCMSPage } from "@dotcms/react";
import type { DotCMSComposedPageResponse, DotCMSPageResponse } from "@dotcms/types";
import { pageComponents } from "@/components/content-types";

interface PageProps {
  pageContent: DotCMSComposedPageResponse<DotCMSPageResponse>;
}

export function Page({ pageContent }: PageProps) {
  const editablePage = useEditableDotCMSPage(pageContent);
  const pageAsset = editablePage?.pageAsset;
  return (
    <main className="page-main">
      <DotCMSLayoutBody
        page={pageAsset}
        components={pageComponents}
      />
    </main>
  );
}
