// Style editor options for the ExpoCollection content type (Universal Visual Editor →
// select the section → Style editor tab). Pushed to dotCMS by
// `npm run style-schemas`; the values an editor picks come back on the
// contentlet as `dotStyleProperties` and are applied in
// src/components/content-types/ExpoCollection.tsx.

const schema = {
  contentType: "ExpoCollection",
  sections: [
    {
      title: "Layout",
      fields: [
        {
          type: "radio",
          id: "layout",
          label: "Arrange cards",
          columns: 2,
          options: [
            { label: "Grid (default)", value: "grid" },
            { label: "Carousel", value: "carousel" },
          ],
        },
        {
          type: "radio",
          id: "columns",
          label: "Cards per row",
          columns: 2,
          options: [
            { label: "4 (default)", value: "4" },
            { label: "3", value: "3" },
          ],
        },
        {
          type: "radio",
          id: "ratio",
          label: "Photo shape",
          columns: 2,
          options: [
            { label: "Portrait (default)", value: "portrait" },
            { label: "Landscape", value: "landscape" },
          ],
        },
      ],
    },
  ],
};

export default schema;
