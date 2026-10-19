// Style editor options for the ExpoCallout content type (Universal Visual Editor →
// select the section → Style editor tab). Pushed to dotCMS by
// `npm run style-schemas`; the values an editor picks come back on the
// contentlet as `dotStyleProperties` and are applied in
// src/components/content-types/ExpoCallout.tsx.

const schema = {
  contentType: "ExpoCallout",
  sections: [
    {
      title: "Layout",
      fields: [
        {
          type: "radio",
          id: "size",
          label: "Size",
          columns: 2,
          options: [
            { label: "Large (default)", value: "large" },
            { label: "Compact", value: "compact" },
          ],
        },
        {
          type: "radio",
          id: "alignment",
          label: "Alignment",
          columns: 2,
          options: [
            { label: "Side by side (default)", value: "start" },
            { label: "Centred", value: "center" },
          ],
        },
      ],
    },
  ],
};

export default schema;
