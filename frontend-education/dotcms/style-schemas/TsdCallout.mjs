// Style editor options for TsdCallout. Pushed by `npm run style-schemas`;
// applied in src/components/content-types/TsdCallout.tsx (CalloutStyles).

const schema = {
  contentType: "TsdCallout",
  sections: [
    {
      title: "Statement",
      fields: [
        {
          type: "radio",
          id: "alignment",
          label: "Alignment",
          columns: 2,
          options: [
            { label: "Centered (default)", value: "center" },
            { label: "Left", value: "left" },
          ],
        },
        {
          type: "radio",
          id: "size",
          label: "Text size",
          columns: 2,
          options: [
            { label: "Large (default)", value: "large" },
            { label: "Medium", value: "medium" },
          ],
        },
      ],
    },
  ],
};

export default schema;
