export const DEFAULT_LIFE_CURRENT_THEME_ID = "river";

export const LIFE_CURRENT_THEMES = Object.freeze([
  Object.freeze({
    id: "river",
    name: "River",
    description: "A flowing current through your timeline.",
    presentation: Object.freeze({
      renderer: "river-current",
      className: "life-current-theme--river",
      colors: Object.freeze({
        year: "#e5e7eb",
        month: "#9ca3af",
        fallback: "#6b7280",
        stem: "#6b7280",
        node: "#5ec8ff",
        selectedNode: "#bae6fd",
        nodeBorder: "#111827",
        nodeGlow: "rgba(94, 200, 255, 0.8)",
        card: "#1f2937",
        selectedCardRing: "#5ec8ff",
        selectedCardGlow: "rgba(94, 200, 255, 0.2)",
      }),
    }),
  }),
  Object.freeze({
    id: "haunted-forest",
    name: "Haunted Forest",
    description: "A winding path through a darker world.",
    presentation: Object.freeze({
      renderer: "forest-path",
      className: "life-current-theme--haunted-forest",
      colors: Object.freeze({
        year: "#f0ead7",
        month: "#c7d0b5",
        fallback: "#776d59",
        stem: "#776d59",
        node: "#d6c99a",
        selectedNode: "#fff4c2",
        nodeBorder: "#172019",
        nodeGlow: "rgba(221, 210, 150, 0.72)",
        card: "#20271f",
        selectedCardRing: "#d6c99a",
        selectedCardGlow: "rgba(214, 201, 154, 0.2)",
      }),
    }),
  }),
]);

const THEMES_BY_ID = new Map(LIFE_CURRENT_THEMES.map((theme) => [theme.id, theme]));

export function normalizeLifeCurrentThemeId(value) {
  return typeof value === "string" && THEMES_BY_ID.has(value)
    ? value
    : DEFAULT_LIFE_CURRENT_THEME_ID;
}

export function getLifeCurrentTheme(value) {
  return THEMES_BY_ID.get(normalizeLifeCurrentThemeId(value));
}
