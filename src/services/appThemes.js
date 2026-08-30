export const DEFAULT_APP_THEME_ID = "modern-heirloom";

function theme({ description, id, immersive, isDefault = false, label, presentation, tokenMetadata }) {
  return Object.freeze({
    description,
    id,
    immersive,
    isDefault,
    label,
    name: label,
    presentation: Object.freeze({
      ...presentation,
      colors: Object.freeze(presentation.colors),
    }),
    tokenMetadata: Object.freeze(tokenMetadata),
  });
}

export const APP_THEMES = Object.freeze([
  theme({
    id: "modern-heirloom",
    label: "Modern Heirloom",
    description: "A clean, non-illustrated Life Current with Trace’s deep navy heirloom texture.",
    immersive: false,
    isDefault: true,
    presentation: {
      renderer: "modern-heirloom-current",
      className: "life-current-theme--modern-heirloom",
      colors: {
        year: "#f2eadc", month: "#b9b0a2", fallback: "#6e604e", stem: "#6e604e",
        node: "#bd9362", selectedNode: "#d2ad78", nodeBorder: "#07131f",
        nodeGlow: "rgba(189, 147, 98, 0.7)", card: "#1b3a4d",
        selectedCardRing: "#83d8cf", selectedCardGlow: "rgba(131, 216, 207, 0.18)",
      },
    },
    tokenMetadata: { foundation: "modern-heirloom", status: "active" },
  }),
  theme({
    id: "river",
    label: "River",
    description: "A flowing current through your timeline.",
    immersive: true,
    presentation: {
      renderer: "river-current",
      className: "life-current-theme--river",
      colors: {
        year: "#e5e7eb", month: "#9ca3af", fallback: "#6b7280", stem: "#6b7280",
        node: "#5ec8ff", selectedNode: "#bae6fd", nodeBorder: "#111827",
        nodeGlow: "rgba(94, 200, 255, 0.8)", card: "#1f2937",
        selectedCardRing: "#5ec8ff", selectedCardGlow: "rgba(94, 200, 255, 0.2)",
      },
    },
    tokenMetadata: { foundation: "modern-heirloom", status: "future-full-app" },
  }),
  theme({
    id: "haunted-forest",
    label: "Haunted Forest",
    description: "A winding path through a darker world.",
    immersive: true,
    presentation: {
      renderer: "forest-path",
      className: "life-current-theme--haunted-forest",
      colors: {
        year: "#f0ead7", month: "#c7d0b5", fallback: "#776d59", stem: "#776d59",
        node: "#d6c99a", selectedNode: "#fff4c2", nodeBorder: "#172019",
        nodeGlow: "rgba(221, 210, 150, 0.72)", card: "#20271f",
        selectedCardRing: "#d6c99a", selectedCardGlow: "rgba(214, 201, 154, 0.2)",
      },
    },
    tokenMetadata: { foundation: "modern-heirloom", status: "future-full-app" },
  }),
  theme({
    id: "gnome-village",
    label: "Gnome Village",
    description: "A storybook path through a lived-in woodland village.",
    immersive: true,
    presentation: {
      renderer: "gnome-village",
      className: "life-current-theme--gnome-village",
      colors: {
        year: "#f4ead0", month: "#d6c9a4", fallback: "#7f7158", stem: "#796849",
        node: "#dca85d", selectedNode: "#ffe2a6", nodeBorder: "#2d2b22",
        nodeGlow: "rgba(220, 168, 93, 0.74)", card: "#2d3026",
        selectedCardRing: "#dca85d", selectedCardGlow: "rgba(220, 168, 93, 0.2)",
      },
    },
    tokenMetadata: { foundation: "modern-heirloom", status: "future-full-app" },
  }),
  theme({
    id: "desert-journey",
    label: "Desert Journey",
    description: "One connected golden-ochre road through an ancient desert world.",
    immersive: true,
    presentation: {
      renderer: "desert-journey",
      className: "life-current-theme--desert-journey",
      colors: {
        year: "#fff1d1", month: "#e5c998", fallback: "#8c6845", stem: "#8c6845",
        node: "#e7b768", selectedNode: "#ffe1a3", nodeBorder: "#34251d",
        nodeGlow: "rgba(231, 183, 104, 0.76)", card: "#3a281f",
        selectedCardRing: "#e7b768", selectedCardGlow: "rgba(231, 183, 104, 0.2)",
      },
    },
    tokenMetadata: { foundation: "modern-heirloom", status: "future-full-app" },
  }),
  theme({
    id: "outer-space-journey",
    label: "Outer Space Journey",
    description: "A continuous expedition through an ancient alien world.",
    immersive: true,
    presentation: {
      renderer: "outer-space-journey",
      className: "life-current-theme--outer-space-journey",
      colors: {
        year: "#eef7ff", month: "#bed9e8", fallback: "#536b78", stem: "#536b78",
        node: "#68d7e8", selectedNode: "#c9f7ff", nodeBorder: "#101b25",
        nodeGlow: "rgba(104, 215, 232, 0.76)", card: "#182832",
        selectedCardRing: "#68d7e8", selectedCardGlow: "rgba(104, 215, 232, 0.2)",
      },
    },
    tokenMetadata: { foundation: "modern-heirloom", status: "future-full-app" },
  }),
]);

const THEMES_BY_ID = new Map(APP_THEMES.map((entry) => [entry.id, entry]));

export function isAppThemeId(value) {
  return typeof value === "string" && THEMES_BY_ID.has(value);
}

export function normalizeAppThemeId(value) {
  return isAppThemeId(value) ? value : DEFAULT_APP_THEME_ID;
}

export function getAppTheme(value) {
  return THEMES_BY_ID.get(normalizeAppThemeId(value));
}
