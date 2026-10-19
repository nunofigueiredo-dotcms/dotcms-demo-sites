// Style editor options for the ExpoFeatureGrid content type (Universal Visual Editor →
// select the section → Style editor tab). Pushed to dotCMS by
// `npm run style-schemas`; the values an editor picks come back on the
// contentlet as `dotStyleProperties` and are applied in
// src/components/content-types/ExpoFeatureGrid.tsx.

const schema = {
  contentType: "ExpoFeatureGrid",
  sections: [
    {
      title: "Layout",
      fields: [
        {
          type: "radio",
          id: "columns",
          label: "Columns",
          columns: 4,
          options: [
            { label: "Automatic", value: "auto" },
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
          ],
        },
        {
          type: "dropdown",
          id: "cardStyle",
          label: "Card style",
          options: [
            { label: "Filled (default)", value: "filled" },
            { label: "Outlined", value: "outlined" },
            { label: "Minimal", value: "minimal" },
          ],
        },
      ],
    },
  ],
};

export default schema;
