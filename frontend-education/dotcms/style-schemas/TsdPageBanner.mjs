// Style editor options for the TsdPageBanner content type (Universal Visual
// Editor → select a banner → Style editor tab). Pushed to dotCMS by
// `npm run style-schemas`; applied in
// src/components/content-types/TsdPageBanner.tsx.
//
// Field ids and option values here must match BannerStyles in that file.

const schema = {
  contentType: "TsdPageBanner",
  sections: [
    {
      title: "Banner",
      fields: [
        {
          type: "dropdown",
          id: "background",
          label: "Background",
          options: [
            { label: "Navy (default)", value: "navy" },
            { label: "Steel blue", value: "steel" },
            { label: "Light blue", value: "mist" },
          ],
        },
        {
          type: "radio",
          id: "alignment",
          label: "Text alignment",
          columns: 2,
          options: [
            { label: "Left (default)", value: "left" },
            { label: "Centered", value: "center" },
          ],
        },
      ],
    },
  ],
};

export default schema;
