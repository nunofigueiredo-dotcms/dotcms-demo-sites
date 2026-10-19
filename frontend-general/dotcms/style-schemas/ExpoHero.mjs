// Style editor options for the ExpoHero content type (Universal Visual Editor →
// select the section → Style editor tab). Pushed to dotCMS by
// `npm run style-schemas`; the values an editor picks come back on the
// contentlet as `dotStyleProperties` and are applied in
// src/components/content-types/ExpoHero.tsx.

const schema = {
  contentType: "ExpoHero",
  sections: [
    {
      title: "Layout",
      fields: [
        {
          type: "radio",
          id: "textPosition",
          label: "Text position",
          columns: 3,
          options: [
            { label: "Bottom (default)", value: "bottom" },
            { label: "Side", value: "start" },
            { label: "Centred", value: "center" },
          ],
        },
        {
          type: "radio",
          id: "height",
          label: "Height",
          columns: 3,
          options: [
            { label: "Full screen", value: "full" },
            { label: "Tall (default)", value: "tall" },
            { label: "Medium", value: "medium" },
          ],
        },
      ],
    },
    {
      title: "Photo",
      fields: [
        {
          type: "dropdown",
          id: "overlay",
          label: "Overlay",
          options: [
            { label: "Gradient (default)", value: "gradient" },
            { label: "Dark", value: "dark" },
            { label: "None", value: "none" },
          ],
        },
      ],
    },
  ],
};

export default schema;
