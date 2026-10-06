import { DotCMSBlockEditorRenderer } from "@dotcms/react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { toBlocks, type BlockField } from "@/utils/blocks";

type WebPageContentProps = DotCMSBasicContentlet & {
  body?: BlockField;
};

/** Rich text (the instance's shared webPageContent type). */
function WebPageContent({ body }: WebPageContentProps) {
  const blocks = toBlocks(body);
  return blocks ? (
    <section className="section section--white">
      <div className="container-tsd">
        <div className="prose-tsd">
          <DotCMSBlockEditorRenderer blocks={blocks} />
        </div>
      </div>
    </section>
  ) : null;
}

export default WebPageContent;
