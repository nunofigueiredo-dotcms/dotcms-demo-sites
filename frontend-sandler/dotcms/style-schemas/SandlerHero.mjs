// Style editor options for the SandlerHero content type (Universal Visual
// Editor → select the hero → Style editor tab). Pushed to dotCMS by
// `npm run style-schemas`; the values an editor picks come back on the
// contentlet as `dotStyleProperties` and are applied in SandlerHero.tsx.
//
// Field ids and option values here must match HERO_STYLES in
// src/components/content-types/SandlerHero.tsx.

export default {
  contentType: "SandlerHero",
  sections: [
    {
      title: "Layout",
      fields: [
        {
          type: "radio",
          id: "alignment",
          label: "Content alignment",
          columns: 2,
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
          ],
        },
        {
          type: "radio",
          id: "height",
          label: "Hero height",
          options: [
            { label: "Compact", value: "compact" },
            { label: "Standard", value: "standard" },
            { label: "Full screen", value: "full" },
          ],
        },
      ],
    },
    {
      title: "Typography",
      fields: [
        {
          type: "dropdown",
          id: "headingFont",
          label: "Heading font",
          options: [
            { label: "Poppins (brand)", value: "brand" },
            { label: "Serif", value: "serif" },
            { label: "Condensed", value: "condensed" },
          ],
        },
        {
          type: "dropdown",
          id: "headingSize",
          label: "Heading size",
          options: [
            { label: "Medium", value: "md" },
            { label: "Large", value: "lg" },
            { label: "Extra large", value: "xl" },
          ],
        },
        {
          type: "checkboxGroup",
          id: "textStyle",
          label: "Heading style",
          options: [
            { label: "Italic", key: "italic" },
            { label: "Uppercase", key: "uppercase" },
            { label: "Hide eyebrow", key: "hideEyebrow" },
          ],
        },
      ],
    },
    {
      title: "Background",
      fields: [
        {
          type: "dropdown",
          id: "background",
          label: "Background",
          options: [
            { label: "Brand image", value: "image" },
            { label: "Solid navy", value: "navy" },
            { label: "Royal gradient", value: "gradient" },
            { label: "Light blue", value: "light" },
          ],
        },
      ],
    },
  ],
};
