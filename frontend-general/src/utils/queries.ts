const SITE_ID = process.env.NEXT_PUBLIC_DOTCMS_SITE_ID;

// Content types are shared across sites on this instance, so every listing
// is filtered by +conHost; +deleted:false keeps archived content out. The
// public site asks for +live:true; inside the Universal Visual Editor
// +working:true, so editors see unpublished changes as they make them.
const filter = (editor: boolean, languageId: number) =>
  `+conHost:${SITE_ID} +deleted:false +${editor ? "working" : "live"}:true +languageId:${languageId}`;

// Depth counts the root: 3 gives the top menu and its dropdowns.
const navigationQuery = (languageId: number) => `
DotNavigation(uri: "/", depth: 3, languageId: ${languageId}) {
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

// Fields every card needs. inode and contentType let editors open an item
// from a card in the editor.
const card = `
    identifier
    inode
    contentType
    title
    urlTitle
    teaser
    image { idPath }
    imageAlt
`;

// Sorted in the frontend: dotCMS silently returns nothing when sortBy names
// a field it can't sort on.
const attractionsQuery = (editor: boolean, lang: number) => `
ExpoAttractionCollection(query: "${filter(editor, lang)}", limit: 100) {
    ${card}
    category
    location
    hours
    price
}
`;

const eventsQuery = (editor: boolean, lang: number) => `
ExpoEventCollection(query: "${filter(editor, lang)}", limit: 200) {
    ${card}
    startDate
    endDate
    timeText
    category
    venue
    price
    ticketLink
}
`;

const restaurantsQuery = (editor: boolean, lang: number) => `
ExpoRestaurantCollection(query: "${filter(editor, lang)}", limit: 100) {
    ${card}
    category
    cuisine
    location
    hours
}
`;

const venuesQuery = (editor: boolean, lang: number) => `
ExpoVenueCollection(query: "${filter(editor, lang)}", limit: 100) {
    ${card}
    flagship
    eventTypes
    capacity
    area
}
`;

const faqsQuery = (editor: boolean, lang: number) => `
ExpoFaqCollection(query: "${filter(editor, lang)}", limit: 200) {
    identifier
    title
    answer
    topic
    position
}
`;

// Always the published settings: a draft footer or analytics ID shouldn't go live.
const settingsQuery = (lang: number) => `
ExpoSiteSettingsCollection(query: "${filter(false, lang)}", limit: 1) {
    gaMeasurementId
    announcements
    menuLabels
    socialLinks
    footerLinks
    tagline
    address
    phone
    email
}
`;

function buildPageContentQuery(editor: boolean, lang: number) {
  return {
    content: {
      navigation: navigationQuery(lang),
      attractions: attractionsQuery(editor, lang),
      events: eventsQuery(editor, lang),
      restaurants: restaurantsQuery(editor, lang),
      venues: venuesQuery(editor, lang),
      faqs: faqsQuery(editor, lang),
      settings: settingsQuery(lang),
    },
  };
}

// Built once per variant, so React's cache() (which compares arguments by
// identity) serves generateMetadata and the page render from one request.
const QUERIES = new Map<string, ReturnType<typeof buildPageContentQuery>>();

/** Loaded with every page: the menu, the collections the list sections pick from, and site settings. */
export function pageContentQuery(inEditor: boolean, languageId: number) {
  const key = `${inEditor}:${languageId}`;
  if (!QUERIES.has(key)) QUERIES.set(key, buildPageContentQuery(inEditor, languageId));
  return QUERIES.get(key)!;
}
