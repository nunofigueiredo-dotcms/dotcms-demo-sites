import { ComponentType } from "react";
import VodafoneDeviceList from "./VodafoneDeviceList";
import VodafoneFaq from "./VodafoneFaq";
import VodafoneFeatureGrid from "./VodafoneFeatureGrid";
import VodafoneFeatureSplit from "./VodafoneFeatureSplit";
import VodafoneHeroCarousel from "./VodafoneHeroCarousel";
import VodafoneHeroSlide from "./VodafoneHeroSlide";
import VodafonePageBanner from "./VodafonePageBanner";
import VodafonePlanList from "./VodafonePlanList";
import VodafoneQuickLinks from "./VodafoneQuickLinks";
import VodafoneServiceCarousel from "./VodafoneServiceCarousel";
import VodafoneStoreLocator from "./VodafoneStoreLocator";
import VodafoneTile from "./VodafoneTile";
import WebPageContent from "./WebPageContent";

// Keys are dotCMS content type variables. Each component declares its own
// narrower props; because component props are contravariant, no single
// concrete type accepts all of them, and DotCMSLayoutBody's own `components`
// prop is typed with `ComponentType<any>` for this reason.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pageComponents: Record<string, ComponentType<any>> = {
  VodafoneDeviceList,
  VodafoneFaq,
  VodafoneFeatureGrid,
  VodafoneFeatureSplit,
  VodafoneHeroCarousel,
  VodafoneHeroSlide,
  VodafonePageBanner,
  VodafonePlanList,
  VodafoneQuickLinks,
  VodafoneServiceCarousel,
  VodafoneStoreLocator,
  VodafoneTile,
  webPageContent: WebPageContent,
};
