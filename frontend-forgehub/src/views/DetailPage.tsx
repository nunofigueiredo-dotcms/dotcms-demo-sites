"use client";

import DotCMSImage from "@/components/DotCMSImage";
import { DotCMSBlockEditorRenderer, useEditableDotCMSPage } from "@dotcms/react";
import type { DotCMSComposedPageResponse, DotCMSPageResponse } from "@dotcms/types";
import type { BlogURLContentMap } from "@/types/blog";

interface DetailPageProps {
  pageContent: DotCMSComposedPageResponse<DotCMSPageResponse>;
}

export function DetailPage({ pageContent }: DetailPageProps) {
  const editablePage = useEditableDotCMSPage(pageContent);
  const pageAsset = editablePage?.pageAsset;
  const { title, image, body, publishDate } =
    (pageAsset?.urlContentMap as BlogURLContentMap) ?? {};

  return (
    <main className="detail-page">
      <article>
        {title && <h1>{title}</h1>}

        {publishDate && (
          <time className="detail-page__date">
            {new Date(publishDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        )}

        {image && (
          <div className="detail-page__image">
            <DotCMSImage src={image} width={800} height={400} alt={title || ""} />
          </div>
        )}

        {body?.json && (
          <DotCMSBlockEditorRenderer blocks={body.json} className="detail-page__body" />
        )}
      </article>
    </main>
  );
}
