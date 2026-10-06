const SITE_ID = process.env.NEXT_PUBLIC_DOTCMS_SITE_ID;

// Content types are shared across sites on this instance, so every listing
// is filtered by +conHost; +deleted:false keeps archived content out. The
// public site asks for +live:true so only published news and events appear.
// Inside the Universal Visual Editor it asks for +working:true instead, so
// editors see their unpublished changes as they make them.
const filter = (editor: boolean) =>
  `+conHost:${SITE_ID} +deleted:false +${editor ? "working" : "live"}:true +languageId:1`;

// Depth 3: the top menu, the Academics dropdown, and nothing deeper.
const navigationQuery = `
DotNavigation(uri: "/", depth: 3) {
    href
    target
    title
    children {
        href
        target
        title
        children {
            href
            target
            title
        }
    }
}
`;

// Sorted in the frontend (utils/dates.ts): dotCMS silently returns nothing
// when sortBy names a field it can't sort on.
const newsQuery = (editor: boolean) => `
TsdNewsCollection(query: "${filter(editor)}", limit: 100) {
    identifier
    title
    urlTitle
    newsCategories {
        key
        name
    }
    pinned
    publishDate
    teaser
    image { idPath }
    imageAlt
}
`;

const eventsQuery = (editor: boolean) => `
TsdEventCollection(query: "${filter(editor)}", limit: 300) {
    identifier
    title
    startDate
    endDate
    timeText
    location
    eventCategories {
        key
        name
    }
    description
}
`;

// Promo banners, for the promo carousels: a carousel's page data only lists
// its related banners by identifier. inode, contentType and language let
// editors open a banner from the carousel.
const promosQuery = (editor: boolean) => `
TsdPromoBannerCollection(query: "${filter(editor)}", limit: 50) {
    identifier
    inode
    contentType
    conLanguage { id }
    title
    image { idPath }
    imageAlt
    link
}
`;

// Always the published settings: an unpublished analytics ID shouldn't
// switch tracking on, nor a draft footer go live.
const settingsQuery = `
TsdSiteSettingsCollection(query: "${filter(false)}", limit: 1) {
    gaMeasurementId
    utilityLinks
    socialLinks
    address
    phone
    videophone
    footerCommunity
    footerUseful
}
`;

function buildPageContentQuery(editor: boolean) {
  return {
    content: {
      navigation: navigationQuery,
      news: newsQuery(editor),
      events: eventsQuery(editor),
      promos: promosQuery(editor),
      settings: settingsQuery,
    },
  };
}

// Built once per variant, so React's cache() (which compares arguments by
// identity) serves generateMetadata and the page render from one request.
const PUBLIC_QUERY = buildPageContentQuery(false);
const EDITOR_QUERY = buildPageContentQuery(true);

/**
 * Loaded alongside every page: the menu, the news, events and promo banners
 * that the list sections and promo carousels pick from, and site settings.
 */
export function pageContentQuery(inEditor: boolean) {
  return inEditor ? EDITOR_QUERY : PUBLIC_QUERY;
}
