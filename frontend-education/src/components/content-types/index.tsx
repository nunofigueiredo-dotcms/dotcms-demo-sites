import { ComponentType } from "react";
import TsdCallout from "./TsdCallout";
import TsdContactList from "./TsdContactList";
import TsdEventList from "./TsdEventList";
import TsdFaq from "./TsdFaq";
import TsdFeatureGrid from "./TsdFeatureGrid";
import TsdFeatureSplit from "./TsdFeatureSplit";
import TsdHero from "./TsdHero";
import TsdNewsList from "./TsdNewsList";
import TsdPageBanner from "./TsdPageBanner";
import TsdPromoCarousel from "./TsdPromoCarousel";
import TsdQuickLinks from "./TsdQuickLinks";
import WebPageContent from "./WebPageContent";

// Keys are dotCMS content type variables. Each component declares its own
// narrower props; because component props are contravariant, no single
// concrete type accepts all of them, and DotCMSLayoutBody's own `components`
// prop is typed with `ComponentType<any>` for this reason.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pageComponents: Record<string, ComponentType<any>> = {
  TsdCallout,
  TsdContactList,
  TsdEventList,
  TsdFaq,
  TsdFeatureGrid,
  TsdFeatureSplit,
  TsdHero,
  TsdNewsList,
  TsdPageBanner,
  TsdPromoCarousel,
  TsdQuickLinks,
  webPageContent: WebPageContent,
};
