"use client";

import { DotCMSBlockEditorRenderer } from "@dotcms/react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { toBlocks, type BlockField } from "@/utils/blocks";

type WebPageContentProps = DotCMSBasicContentlet & {
  body?: BlockField;
};

/** Rich text (the instance's shared webPageContent type). */
export default function WebPageContent({ body }: WebPageContentProps) {
  const blocks = toBlocks(body);
  return blocks ? (
    <section className="section section--white">
      <div className="container-expo">
        <div className="prose-expo">
          <DotCMSBlockEditorRenderer blocks={blocks} />
        </div>
      </div>
    </section>
  ) : null;
}
