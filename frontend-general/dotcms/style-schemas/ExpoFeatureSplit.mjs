// Style editor options for the ExpoFeatureSplit content type (Universal Visual Editor →
// select the section → Style editor tab). Pushed to dotCMS by
// `npm run style-schemas`; the values an editor picks come back on the
// contentlet as `dotStyleProperties` and are applied in
// src/components/content-types/ExpoFeatureSplit.tsx.

const schema = {
  contentType: "ExpoFeatureSplit",
  sections: [
    {
      title: "Photo",
      fields: [
        {
          type: "radio",
          id: "imageShape",
          label: "Shape",
          columns: 3,
          options: [
            { label: "Rounded (default)", value: "rounded" },
            { label: "Arch", value: "arch" },
            { label: "Square", value: "square" },
          ],
        },
        {
          type: "radio",
          id: "imageSize",
          label: "Size",
          columns: 2,
          options: [
            { label: "Half (default)", value: "half" },
            { label: "Large", value: "large" },
          ],
        },
      ],
    },
  ],
};

export default schema;
