// Style editor options for TsdFeatureGrid (Universal Visual Editor → select
// a grid → Style editor tab). Pushed by `npm run style-schemas`; applied in
// src/components/content-types/TsdFeatureGrid.tsx (GridStyles).

const schema = {
  contentType: "TsdFeatureGrid",
  sections: [
    {
      title: "Layout",
      fields: [
        {
          type: "radio",
          id: "columns",
          label: "Columns (cards and steps)",
          columns: 2,
          options: [
            { label: "Automatic (default)", value: "auto" },
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
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
    {
      title: "Cards",
      fields: [
        {
          type: "dropdown",
          id: "cardStyle",
          label: "Card style",
          options: [
            { label: "Outlined (default)", value: "outlined" },
            { label: "Filled", value: "filled" },
            { label: "Minimal, no box", value: "minimal" },
          ],
        },
      ],
    },
  ],
};

export default schema;
