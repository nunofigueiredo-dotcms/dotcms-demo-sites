import { DOTCMS_SITE_ID } from "./config";
import { graphql } from "./dotcms";
import type { Contentlet, HeroSlide, PageData, Plan, Store } from "./types";

// Content types are shared across the instance's sites, so every collection
// is filtered to this site, and to published, non-archived content.
const PUBLISHED = `+conHost:${DOTCMS_SITE_ID} +live:true +deleted:false +languageId:1`;

const byOrder = <T extends { displayOrder?: string | null }>(a: T, b: T) =>
  (Number(a.displayOrder) || 999) - (Number(b.displayOrder) || 999);

interface PageQueryResult {
  page: {
    title: string;
    friendlyName?: string;
    layout: {
      body: {
        rows: { columns: { containers: { identifier: string; uuid: string }[] }[] }[];
      };
    };
    containers: {
      identifier: string;
      containerContentlets: { uuid: string; contentlets: { _map: Contentlet }[] }[];
    }[];
  } | null;
}

/**
 * A page as editors built it in dotCMS: its layout, and the content placed
 * in each container, flattened into sections in top-to-bottom order.
 */
export async function fetchPage(url: string): Promise<PageData> {
  const { page } = await graphql<PageQueryResult>(`{
    page(url: "${url}", site: "${DOTCMS_SITE_ID}", languageId: "1") {
      title
      friendlyName
      layout { body { rows { columns { containers { identifier uuid } } } } }
      containers {
        identifier
        containerContentlets { uuid contentlets { _map } }
      }
    }
  }`);
  if (!page) throw new Error(`Page ${url} was not found on dotCMS`);

  // Content is keyed by container and "uuid-{n}", layout slots by "{n}".
  const byUuid = new Map<string, Contentlet[]>();
  for (const container of page.containers) {
    for (const slot of container.containerContentlets) {
      byUuid.set(`${container.identifier}/${slot.uuid}`, slot.contentlets.map((c) => c._map));
    }
  }
  const sections = page.layout.body.rows.flatMap((row) =>
    row.columns.flatMap((column) =>
      column.containers.flatMap((c) =>
        byUuid.get(`${c.identifier}/uuid-${c.uuid}`) ?? []
      )
    )
  );
  return { title: page.friendlyName || page.title, sections };
}

/**
 * The slides of a Vodafone Hero Carousel. Its page data lists them by
 * identifier (in the editor's order); this loads their content.
 */
export async function fetchSlides(ids: string[]): Promise<HeroSlide[]> {
  if (!ids.length) return [];
  const data = await graphql<{ VodafoneHeroSlideCollection: HeroSlide[] }>(`{
    VodafoneHeroSlideCollection(query: "${PUBLISHED} +identifier:(${ids.join(" OR ")})", limit: ${ids.length}) {
      identifier title highlight text ctaText ctaLink
      image { idPath }
      mobileImage { idPath }
    }
  }`);
  const slides = data.VodafoneHeroSlideCollection;
  return ids.map((id) => slides.find((s) => s.identifier === id)).filter((s): s is HeroSlide => Boolean(s));
}

export async function fetchPlans(family?: string): Promise<Plan[]> {
  const filter = family ? ` +VodafonePlan.family:${family}` : "";
  const data = await graphql<{ VodafonePlanCollection: Plan[] }>(`{
    VodafonePlanCollection(query: "${PUBLISHED}${filter}", limit: 100) {
      identifier title family data minutes price priceNote badge benefits ctaText ctaLink displayOrder
      subscriptionsIncluded
      subscriptions { title category }
    }
  }`);
  return data.VodafonePlanCollection.sort(byOrder);
}

export async function fetchStores(): Promise<Store[]> {
  const data = await graphql<{ VodafoneStoreCollection: Store[] }>(`{
    VodafoneStoreCollection(query: "${PUBLISHED}", limit: 500) {
      identifier title storeType governorate area address phone hours latitude longitude services
    }
  }`);
  return data.VodafoneStoreCollection;
}
