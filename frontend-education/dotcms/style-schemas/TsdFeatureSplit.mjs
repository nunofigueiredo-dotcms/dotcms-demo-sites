// Style editor options for TsdFeatureSplit. Pushed by `npm run style-schemas`;
// applied in src/components/content-types/TsdFeatureSplit.tsx (SplitStyles).

const schema = {
  contentType: "TsdFeatureSplit",
  sections: [
    {
      title: "Photo",
      fields: [
        {
          type: "dropdown",
          id: "imageShape",
          label: "Photo shape",
          options: [
            { label: "Rounded corners (default)", value: "rounded" },
            { label: "Square corners", value: "square" },
            { label: "Arched top", value: "arch" },
          ],
        },
        {
          type: "radio",
          id: "imageWidth",
          label: "Photo width",
          columns: 3,
          options: [
            { label: "Half (default)", value: "half" },
            { label: "Wider", value: "wide" },
            { label: "Narrower", value: "narrow" },
          ],
        },
      ],
    },
  ],
};

export default schema;
