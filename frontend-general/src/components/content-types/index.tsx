import { ComponentType } from "react";
import ExpoCallout from "./ExpoCallout";
import ExpoCollection from "./ExpoCollection";
import ExpoEventList from "./ExpoEventList";
import ExpoFaqList from "./ExpoFaqList";
import ExpoFeatureGrid from "./ExpoFeatureGrid";
import ExpoFeatureSplit from "./ExpoFeatureSplit";
import ExpoHero from "./ExpoHero";
import ExpoPageBanner from "./ExpoPageBanner";
import WebPageContent from "./WebPageContent";

// Keys are dotCMS content type variables. Each component declares its own
// narrower props; because component props are contravariant, no single
// concrete type accepts all of them, and DotCMSLayoutBody's own `components`
// prop is typed with `ComponentType<any>` for this reason.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pageComponents: Record<string, ComponentType<any>> = {
  ExpoCallout,
  ExpoCollection,
  ExpoEventList,
  ExpoFaqList,
  ExpoFeatureGrid,
  ExpoFeatureSplit,
  ExpoHero,
  ExpoPageBanner,
  webPageContent: WebPageContent,
};
