const SITE_ID = process.env.NEXT_PUBLIC_DOTCMS_SITE_ID;

// Content types are shared across sites on this instance, so every listing
// is filtered by +conHost; +deleted:false keeps archived content out. The
// public site asks for +live:true so only published plans and stores
// appear. Inside the Universal Visual Editor it asks for +working:true
// instead, so editors see their unpublished changes (including inline edits,
// which save a draft) as they make them.
const filter = (editor: boolean) =>
  `+conHost:${SITE_ID} +deleted:false +${editor ? "working" : "live"}:true +languageId:1`;

const navigationQuery = `
DotNavigation(uri: "/", depth: 2) {
    href
    target
    title
    children {
        href
        target
        title
    }
}
`;

// Hero slides, for the carousels: a carousel's page data only lists its
// related slides by identifier. inode, contentType and language let editors
// open a slide from the carousel.
const slidesQuery = (editor: boolean) => `
VodafoneHeroSlideCollection(query: "${filter(editor)}", limit: 100) {
    identifier
    inode
    contentType
    conLanguage { id }
    title
    highlight
    text
    ctaText
    ctaLink
    image { idPath }
    mobileImage { idPath }
}
`;

const plansQuery = (editor: boolean) => `
VodafonePlanCollection(query: "${filter(editor)}", limit: 100) {
    identifier
    title
    family
    data
    minutes
    price
    priceNote
    pricePeriod
    badge
    benefits
    ctaText
    ctaLink
    displayOrder
    subscriptionsIncluded
    subscriptions {
        title
        category
    }
}
`;

const devicesQuery = (editor: boolean) => `
VodafoneDeviceCollection(query: "${filter(editor)}", limit: 100) {
    identifier
    title
    brand
    storage
    price
    badge
    image { idPath }
}
`;

const storesQuery = (editor: boolean) => `
VodafoneStoreCollection(query: "${filter(editor)}", limit: 500) {
    identifier
    title
    storeType
    governorate
    area
    address
    phone
    hours
    latitude
    longitude
    services
}
`;

function buildPageContentQuery(editor: boolean) {
  return {
    content: {
      navigation: navigationQuery,
      slides: slidesQuery(editor),
      plans: plansQuery(editor),
      devices: devicesQuery(editor),
      stores: storesQuery(editor),
    },
  };
}

// Built once per variant, so React's cache() (which compares arguments by
// identity) serves generateMetadata and the page render from one request.
const PUBLIC_QUERY = buildPageContentQuery(false);
const EDITOR_QUERY = buildPageContentQuery(true);

/**
 * Loaded alongside every page: the menu, plus the slides, plans and stores
 * that hero carousels, the plan list and the store locator pick from.
 */
export function pageContentQuery(inEditor: boolean) {
  return inEditor ? EDITOR_QUERY : PUBLIC_QUERY;
}
