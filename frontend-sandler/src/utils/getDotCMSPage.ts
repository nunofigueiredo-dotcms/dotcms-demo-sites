import { cache } from "react";
import { dotCMSClient } from "./dotCMSClient";
import type { DotCMSGraphQLParams } from "@dotcms/types";
import type { DotCMSPageContent } from "@/types/page";

/**
 * Fetch a page (and its extra GraphQL content) in one language. dotCMS falls
 * back to the default-language page and content where no translation exists.
 */
export const getDotCMSPage = cache(
  async (path: string, graphql?: DotCMSGraphQLParams, languageId: number = 1) => {
    try {
      const pageData = await dotCMSClient.page.get<{
        content: DotCMSPageContent;
      }>(path, { languageId, ...(graphql && { graphql }) });
      return pageData;
    } catch (e) {
      console.error("ERROR FETCHING PAGE: ", (e as Error).message);
      return null;
    }
  }
);
