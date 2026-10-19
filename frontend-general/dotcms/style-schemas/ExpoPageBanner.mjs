// Style editor options for the ExpoPageBanner content type (Universal Visual Editor →
// select the section → Style editor tab). Pushed to dotCMS by
// `npm run style-schemas`; the values an editor picks come back on the
// contentlet as `dotStyleProperties` and are applied in
// src/components/content-types/ExpoPageBanner.tsx.

const schema = {
  contentType: "ExpoPageBanner",
  sections: [
    {
      title: "Layout",
      fields: [
        {
          type: "radio",
          id: "layout",
          label: "Photo",
          columns: 3,
          options: [
            { label: "Beside the title (default)", value: "split" },
            { label: "Behind the title", value: "cover" },
            { label: "No photo", value: "plain" },
          ],
        },
        {
          type: "dropdown",
          id: "theme",
          label: "Background",
          options: [
            { label: "Sand (default)", value: "sand" },
            { label: "Charcoal", value: "charcoal" },
            { label: "Teal", value: "teal" },
          ],
        },
      ],
    },
  ],
};

export default schema;
