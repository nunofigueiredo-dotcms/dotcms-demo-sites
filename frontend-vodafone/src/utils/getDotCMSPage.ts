import { cache } from "react";
import { dotCMSClient } from "./dotCMSClient";
import { pageContentQuery } from "./queries";
import type { DotCMSPageContent } from "@/types/page";

/** How the page is being viewed: on the site, or in the Universal Visual Editor. */
export type PageMode = "LIVE" | "EDIT" | "PREVIEW";

/**
 * Fetch a page and its extra GraphQL content. Returns null when not found.
 * In the editor the page is asked for in its edit/preview mode: dotCMS then
 * returns draft content and the Style editor schemas, which it leaves out of
 * a live request.
 */
export const getDotCMSPage = cache(async (path: string, mode: PageMode = "LIVE", persona?: string) => {
  try {
    return await dotCMSClient.page.get<{ content: DotCMSPageContent }>(path, {
      languageId: 1,
      mode,
      // A persona key tag: dotCMS returns that persona's version of the page.
      ...(persona && { personaId: persona }),
      graphql: pageContentQuery(mode !== "LIVE"),
    });
  } catch (e) {
    console.error("ERROR FETCHING PAGE: ", (e as Error).message);
    return null;
  }
});
