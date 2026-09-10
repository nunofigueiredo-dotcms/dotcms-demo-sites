import type { DotCMSNavigationItem } from "@dotcms/types";
import type { Blog } from "./blog";

export interface DotCMSPageNavigation extends DotCMSNavigationItem {
  children: DotCMSNavigationItem[];
}

export interface DotCMSPageContent {
  blogs?: Blog[];
  navigation: DotCMSPageNavigation;
}
