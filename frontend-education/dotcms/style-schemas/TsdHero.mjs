// Style editor options for the TsdHero content type (Universal Visual
// Editor → select the hero → Style editor tab). Pushed to dotCMS by
// `npm run style-schemas`; the values an editor picks come back on the
// contentlet as `dotStyleProperties` and are applied in
// src/components/content-types/TsdHero.tsx.
//
// Field ids and option values here must match HeroStyles in that file.

const schema = {
  contentType: "TsdHero",
  sections: [
    {
      title: "Layout",
      fields: [
        {
          type: "radio",
          id: "textPosition",
          label: "Text position",
          columns: 2,
          options: [
            { label: "Left (default)", value: "left" },
            { label: "Centered", value: "center" },
          ],
        },
        {
          type: "radio",
          id: "height",
          label: "Height",
          columns: 2,
          options: [
            { label: "Tall (default)", value: "tall" },
            { label: "Medium", value: "medium" },
          ],
        },
      ],
    },
    {
      title: "Colours",
      fields: [
        {
          type: "dropdown",
          id: "overlay",
          label: "Photo overlay",
          options: [
            { label: "Navy (default)", value: "navy" },
            { label: "Steel blue", value: "steel" },
            { label: "Light, from the bottom", value: "light" },
          ],
        },
      ],
    },
  ],
};

export default schema;
