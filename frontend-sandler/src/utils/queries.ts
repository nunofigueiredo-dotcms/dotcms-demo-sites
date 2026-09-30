const SITE_ID = process.env.NEXT_PUBLIC_DOTCMS_SITE_ID;

export const navigationQuery = `
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

// Content is shared across sites on this instance, so every listing is
// filtered by +conHost or it picks up other sites' content. +deleted:false
// is needed too: GraphQL collections include archived content without it.
// Collections return every language version unless filtered by languageId,
// so each is asked for in the page's language (plus English, to fill in
// anything not translated yet — see SiteShell). They also return drafts
// (working versions) unless filtered with +live:true — which would show
// unpublished translations and not-yet-approved reviews on the site.
const centersQuery = (languageId: number) => `
TrainingCenterCollection(query: "+conHost:${SITE_ID} +deleted:false +live:true +languageId:${languageId}", limit: 500) {
    title
    urlTitle
    city
    region
    country
    address
    phone
    latitude
    longitude
    tagline
    summary
    solutions
}
`;

// `publishDate desc` is a sortable field; an unsortable one would silently
// return an empty list instead of an error.
const articlesQuery = (languageId: number) => `
SandlerArticleCollection(
    query: "+conHost:${SITE_ID} +deleted:false +live:true +languageId:${languageId}"
    sortBy: "SandlerArticle.publishDate desc"
    limit: 12
) {
    title
    urlTitle
    category
    publishDate
    teaser
}
`;

// Every center's upcoming events; each page filters to its own center.
const eventsQuery = (languageId: number) => `
SandlerEventCollection(
    query: "+conHost:${SITE_ID} +deleted:false +live:true +languageId:${languageId}"
    sortBy: "SandlerEvent.startDate asc"
    limit: 100
) {
    identifier
    title
    startDate
    format
    venue
    summary
    center {
        urlTitle
    }
}
`;

/**
 * Loaded alongside every page: the menu, the training centers (for the
 * location selector), the latest articles and the centers' events. Articles
 * come in the page's language plus English; the site shows the translation
 * where one exists and English otherwise (see mergeArticles).
 */
// Published testimonials (submitted reviews stay unpublished until approved).
const testimonialsQuery = `
SandlerTestimonialCollection(
    query: "+conHost:${SITE_ID} +deleted:false +live:true +languageId:1"
    limit: 200
) {
    quote
    name
    role
    headline
    rating
    center {
        urlTitle
    }
}
`;

// Interface labels editors can translate (Settings → Languages → Language
// Variables). Stored on the System Host, so there is no +conHost filter.
const languageVariablesQuery = (languageId: number) => `
LanguagevariableCollection(
    query: "+contentType:Languagevariable +Languagevariable.key:sandler.* +languageId:${languageId} +live:true +deleted:false"
    limit: 500
) {
    key
    value
}
`;

// One object per language, so React's cache() (which compares arguments by
// identity) serves generateMetadata and the page render from one request.
const queriesByLanguage = new Map<number, ReturnType<typeof buildPageContentQuery>>();

function buildPageContentQuery(languageId: number) {
  return {
    content: {
      navigation: navigationQuery,
      centers: centersQuery(languageId),
      ...(languageId !== 1 && { centersEnglish: centersQuery(1) }),
      articles: articlesQuery(languageId),
      ...(languageId !== 1 && { articlesEnglish: articlesQuery(1) }),
      events: eventsQuery(languageId),
      ...(languageId !== 1 && { eventsEnglish: eventsQuery(1) }),
      testimonials: testimonialsQuery,
      languageVariables: languageVariablesQuery(languageId),
    },
  };
}

export function pageContentQuery(languageId: number) {
  if (!queriesByLanguage.has(languageId)) {
    queriesByLanguage.set(languageId, buildPageContentQuery(languageId));
  }
  return queriesByLanguage.get(languageId)!;
}
