import { ComponentType } from "react";
import HubSpotForm from "./HubSpotForm";
import SandlerArticleList from "./SandlerArticleList";
import SandlerCenterDirectory from "./SandlerCenterDirectory";
import SandlerCenterHero from "./SandlerCenterHero";
import SandlerCenterIntro from "./SandlerCenterIntro";
import SandlerEventList from "./SandlerEventList";
import SandlerFeatureGrid from "./SandlerFeatureGrid";
import SandlerHero from "./SandlerHero";
import SandlerLocalCenter from "./SandlerLocalCenter";
import SandlerReviewForm from "./SandlerReviewForm";
import SandlerTestimonial from "./SandlerTestimonial";
import SandlerTestimonialList from "./SandlerTestimonialList";
import WebPageContent from "./WebPageContent";

// Keys are dotCMS content type variables. Each component declares its own
// narrower props; because component props are contravariant, no single
// concrete type accepts all of them, and DotCMSLayoutBody's own `components`
// prop is typed with `ComponentType<any>` for this reason.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const pageComponents: Record<string, ComponentType<any>> = {
  HubSpotForm,
  SandlerArticleList,
  SandlerCenterDirectory,
  SandlerCenterHero,
  SandlerCenterIntro,
  SandlerEventList,
  SandlerFeatureGrid,
  SandlerHero,
  SandlerLocalCenter,
  SandlerReviewForm,
  SandlerTestimonial,
  SandlerTestimonialList,
  SandlerRichText: WebPageContent,
  webPageContent: WebPageContent,
};
