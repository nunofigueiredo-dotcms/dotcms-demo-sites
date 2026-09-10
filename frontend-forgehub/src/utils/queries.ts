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

export const blogListGraphQL = {
  content: { navigation: navigationQuery },
};

export const blogDetailGraphQL = {
  page: `
        urlContentMap {
            ... on Blog {
                title
                description
                modDate
                urlTitle
                body {
                    json
                }
                author {
                    firstName
                    lastName
                    image {
                        idPath
                        title
                    }
                }
                image {
                    idPath
                    title
                }
            }
        }
    `,
  content: { navigation: navigationQuery },
};
