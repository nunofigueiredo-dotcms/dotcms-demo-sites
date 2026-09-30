"use client";

import { DotCMSLayoutBody, useEditableDotCMSPage } from "@dotcms/react";
import type { DotCMSComposedPageResponse, DotCMSPageResponse } from "@dotcms/types";
import { pageComponents } from "@/components/content-types";
import { CenterNav } from "@/components/site/CenterNav";
import { CurrentCenterProvider } from "@/components/site/CurrentCenter";
import type { TrainingCenter } from "@/types/page";
import type { SandlerArticle, TrainingCenterDetail } from "./detail";
import { ArticleDetail } from "./ArticleDetail";
import { CenterDetail } from "./CenterDetail";

interface PageProps {
  pageContent: DotCMSComposedPageResponse<DotCMSPageResponse>;
  /** Set on a center's subpages (/locations/{center}/…), which render a
   *  shared dotCMS page in that center's context. */
  center?: TrainingCenter;
}

export function Page({ pageContent, center }: PageProps) {
  const editablePage = useEditableDotCMSPage(pageContent);
  const pageAsset = editablePage?.pageAsset;

  // URL-mapped pages (/locations/{slug}, /articles/{slug}) carry the matched
  // contentlet in urlContentMap. The page layout below it still comes from the
  // detail page in dotCMS, so editors control what appears underneath.
  const mapped = pageAsset?.urlContentMap;
  const mappedCenter =
    mapped?.contentType === "TrainingCenter" ? (mapped as unknown as TrainingCenterDetail) : undefined;
  const currentCenter = center ?? mappedCenter;

  return (
    <CurrentCenterProvider center={currentCenter}>
      <main>
        {currentCenter && <CenterNav center={currentCenter} />}
        {mappedCenter && <CenterDetail center={mappedCenter} />}
        {mapped?.contentType === "SandlerArticle" && (
          <ArticleDetail article={mapped as unknown as SandlerArticle} />
        )}
        <DotCMSLayoutBody page={pageAsset} components={pageComponents} />
      </main>
    </CurrentCenterProvider>
  );
}
