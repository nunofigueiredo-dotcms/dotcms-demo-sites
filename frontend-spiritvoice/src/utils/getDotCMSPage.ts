import { cache } from "react";
import { dotCMSClient } from "./dotCMSClient";
import type { DotCMSGraphQLParams } from "@dotcms/types";
import type { DotCMSPageContent } from "@/types/page";

export const getDotCMSPage = cache(
  async (path: string, graphql?: DotCMSGraphQLParams) => {
    try {
      const pageData = await dotCMSClient.page.get<{
        content: DotCMSPageContent;
      }>(path, graphql ? { graphql } : undefined);
      return pageData;
    } catch (e) {
      console.error("ERROR FETCHING PAGE: ", (e as Error).message);
      return null;
    }
  }
);
