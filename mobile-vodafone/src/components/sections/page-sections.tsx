import { useCallback, type ComponentType } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { text } from "@/lib/content";
import { useDotCMS } from "@/hooks/use-dotcms";
import { openLink } from "@/lib/links";
import { fetchSlides } from "@/lib/queries";
import type { Contentlet, HeroSlide } from "@/lib/types";
import { Faq } from "./faq";
import { FeatureGrid } from "./feature-grid";
import { FeatureSplit } from "./feature-split";
import { HeroCarousel } from "./hero-carousel";
import { PageBanner } from "./page-banner";
import { PlanList } from "./plan-list";
import { QuickLinks } from "./quick-links";
import { ServiceList } from "./service-list";
import { Tile } from "./tile";

/** VodafoneHeroSlide: one banner. */
function HeroBanner({ contentlet }: { contentlet: Contentlet }) {
  return <HeroCarousel slides={[contentlet as unknown as HeroSlide]} />;
}

/** VodafoneHeroCarousel: its Slides relationship arrives as identifiers. */
function HeroCarouselWidget({ contentlet }: { contentlet: Contentlet }) {
  const ids = (Array.isArray(contentlet.slides) ? contentlet.slides : []).map((s) =>
    typeof s === "string" ? s : String((s as { identifier?: string }).identifier)
  );
  const key = ids.join(",");
  const load = useCallback(() => fetchSlides(key ? key.split(",") : []), [key]);
  const { data: slides = [] } = useDotCMS(load);
  return slides.length ? <HeroCarousel slides={slides} /> : null;
}

/** The store locator is its own tab in the app; on a page it becomes a link to it. */
function StoreLocatorLink({ contentlet }: { contentlet: Contentlet }) {
  return (
    <View style={styles.locator}>
      <Text style={styles.heading}>{text(contentlet.heading) ?? "Find a store"}</Text>
      <Pressable style={styles.button} onPress={() => openLink("/store-locator")}>
        <Text style={styles.buttonText}>Open the store locator</Text>
      </Pressable>
    </View>
  );
}

// Keys are dotCMS content type variables — the same ones the website maps
// to its React components, so one page in dotCMS drives both.
const SECTIONS: Record<string, ComponentType<{ contentlet: Contentlet }>> = {
  VodafoneFaq: Faq,
  VodafoneFeatureGrid: FeatureGrid,
  VodafoneFeatureSplit: FeatureSplit,
  VodafoneHeroCarousel: HeroCarouselWidget,
  VodafoneHeroSlide: HeroBanner,
  VodafonePageBanner: PageBanner,
  VodafonePlanList: PlanList,
  VodafoneQuickLinks: QuickLinks,
  VodafoneServiceCarousel: ServiceList,
  VodafoneStoreLocator: StoreLocatorLink,
  VodafoneTile: Tile,
};

/** Render a dotCMS page's sections natively, skipping types the app doesn't know. */
export function PageSections({ sections }: { sections: Contentlet[] }) {
  return (
    <View style={styles.page}>
      {sections.map((contentlet) => {
        const Section = SECTIONS[contentlet.contentType];
        return Section ? <Section key={contentlet.identifier} contentlet={contentlet} /> : null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: Spacing.xl },
  locator: { padding: Spacing.md, gap: Spacing.md },
  heading: { fontSize: 22, color: Colors.charcoal },
  button: { backgroundColor: Colors.red, borderRadius: Radius, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: Colors.white, fontSize: 16 },
});
