import { DotCMSBlockEditorRenderer } from "@dotcms/react";
import { DotCMSBasicContentlet } from "@dotcms/types";

import type { BlockEditorNode } from "@dotcms/types";

type WebPageContentProps = DotCMSBasicContentlet & {
  body?: BlockEditorNode;
};

function WebPageContent({ body }: WebPageContentProps) {
  return body ? (
    <div className="web-page-content">
      <DotCMSBlockEditorRenderer blocks={body} />
    </div>
  ) : null;
}

export default WebPageContent;
