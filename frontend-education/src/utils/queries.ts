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

// Staff for directories; sorted by last name in the frontend.
const staffQuery = (editor: boolean) => `
TsdStaffCollection(query: "${filter(editor)}", limit: 300) {
    identifier
    title
    lastName
    urlTitle
    jobTitle
    departments {
        key
        name
    }
    email
    phone
    videophone
    languages
    office
    photo { idPath }
    photoAlt
}
`;

// The knowledge base, for resource libraries and resource pages (the page
// API's urlContentMap gives a File field only as an identifier).
const resourcesQuery = (editor: boolean) => `
TsdResourceCollection(query: "${filter(editor)}", limit: 300) {
    identifier
    title
    urlTitle
    summary
    topics {
        key
        name
    }
    audience
    ownerDepartment {
        key
        name
    }
    lastReviewed
    document {
        identifier
        ... on FileAsset {
            fileName
            fileAsset { idPath name size mime }
        }
    }
    documentDescription
    externalUrl
}
`;

// Alert banners. Their start and end times are checked on each request
// (dotCMS also unpublishes them at the end time).
const alertsQuery = (editor: boolean) => `
TsdAlertCollection(query: "${filter(editor)}", limit: 20) {
    identifier
    title
    message
    severity
    ctaText
    ctaLink
    aslVideoUrl
    startDate
    endDate
    scope
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
      staff: staffQuery(editor),
      resources: resourcesQuery(editor),
      alerts: alertsQuery(editor),
      settings: settingsQuery,
    },
  };
}

// Built once per variant, so React's cache() (which compares arguments by
// identity) serves generateMetadata and the page render from one request.
const PUBLIC_QUERY = buildPageContentQuery(false);
const EDITOR_QUERY = buildPageContentQuery(true);

/**
 * Loaded alongside every page: the menu, the news, events, promo banners and
 * staff that the list sections, carousels and directories pick from, and
 * site settings.
 */
export function pageContentQuery(inEditor: boolean) {
  return inEditor ? EDITOR_QUERY : PUBLIC_QUERY;
}
