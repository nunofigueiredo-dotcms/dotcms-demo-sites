// Style editor options for the VodafoneHeroSlide content type (Universal
// Visual Editor → select a slide → Style editor tab). Pushed to dotCMS by
// `npm run style-schemas`; the values an editor picks come back on the
// contentlet as `dotStyleProperties` and are applied in
// src/components/content-types/VodafoneHeroSlide.tsx.
//
// Field ids and option values here must match SlideStyles in that file.

const schema = {
  contentType: "VodafoneHeroSlide",
  sections: [
    {
      title: "Layout",
      fields: [
        {
          type: "radio",
          id: "imagePosition",
          label: "Image position",
          columns: 2,
          options: [
            { label: "Right", value: "right" },
            { label: "Left", value: "left" },
          ],
        },
        {
          type: "radio",
          id: "alignment",
          label: "Text alignment",
          columns: 2,
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
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
            { label: "Vodafone (brand)", value: "brand" },
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
            { label: "Extra large (default)", value: "xl" },
          ],
        },
        {
          type: "checkboxGroup",
          id: "textStyle",
          label: "Heading style",
          options: [
            { label: "Uppercase", key: "uppercase" },
            { label: "Italic", key: "italic" },
            { label: "Regular weight (not bold)", key: "light" },
          ],
        },
      ],
    },
    {
      title: "Colours",
      fields: [
        {
          type: "dropdown",
          id: "background",
          label: "Background",
          options: [
            { label: "White (default)", value: "white" },
            { label: "Light grey", value: "grey" },
            { label: "Dark", value: "dark" },
            { label: "Vodafone red", value: "red" },
          ],
        },
        {
          type: "radio",
          id: "buttonStyle",
          label: "Button",
          options: [
            { label: "Red", value: "filled" },
            { label: "Red outline", value: "outline" },
            { label: "White", value: "white" },
          ],
        },
      ],
    },
  ],
};

export default schema;
