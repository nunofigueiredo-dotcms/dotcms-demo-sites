import { DotCMSBlockEditorRenderer } from "@dotcms/react";
import type { DotCMSBasicContentlet } from "@dotcms/types";
import { toBlocks, type BlockField } from "@/utils/blocks";

type WebPageContentProps = DotCMSBasicContentlet & {
  body?: BlockField;
};

function WebPageContent({ body }: WebPageContentProps) {
  const blocks = toBlocks(body);
  return blocks ? (
    <section className="section section--light">
      <div className="container-vf">
        <div className="web-page-content">
          <DotCMSBlockEditorRenderer blocks={blocks} />
        </div>
      </div>
    </section>
  ) : null;
}

export default WebPageContent;
