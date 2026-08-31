import {
  DEFAULT_LIFE_CURRENT_THEME_ID,
  getLifeCurrentTheme,
  LIFE_CURRENT_THEMES,
  normalizeLifeCurrentThemeId,
} from "./lifeCurrentThemes";

test("compatibility exports expose the authoritative seven-theme app registry", () => {
  expect(LIFE_CURRENT_THEMES.map(({ id }) => id)).toEqual([
    "modern-heirloom",
    "river",
    "haunted-forest",
    "gnome-village",
    "desert-journey",
    "outer-space-journey",
    "to-kingdoms-ahead",
  ]);
  expect(DEFAULT_LIFE_CURRENT_THEME_ID).toBe("modern-heirloom");
  expect(getLifeCurrentTheme("modern-heirloom")).toMatchObject({
    name: "Modern Heirloom",
    immersive: false,
    presentation: { renderer: "modern-heirloom-current" },
  });
  expect(getLifeCurrentTheme("haunted-forest")).toMatchObject({
    name: "Haunted Forest",
    description: "A winding path through a darker world.",
    presentation: { renderer: "forest-path" },
  });
  expect(getLifeCurrentTheme("gnome-village")).toMatchObject({
    name: "Gnome Village",
    description: "A storybook path through a lived-in woodland village.",
    presentation: { renderer: "gnome-village" },
  });
  expect(getLifeCurrentTheme("desert-journey")).toMatchObject({
    name: "Desert Journey",
    description: "One connected golden-ochre road through an ancient desert world.",
    presentation: { renderer: "desert-journey" },
  });
  expect(getLifeCurrentTheme("outer-space-journey")).toMatchObject({
    name: "Outer Space Journey",
    description: "A continuous expedition through an ancient alien world.",
    presentation: { renderer: "outer-space-journey" },
  });
  expect(getLifeCurrentTheme("to-kingdoms-ahead")).toMatchObject({
    name: "To Kingdoms Ahead",
    presentation: { renderer: "to-kingdoms-ahead" },
  });
});

test.each([undefined, null, "", "obsolete", {}, []])(
  "normalizes unknown theme value %p to Modern Heirloom",
  (value) => {
    expect(normalizeLifeCurrentThemeId(value)).toBe("modern-heirloom");
    expect(getLifeCurrentTheme(value).id).toBe("modern-heirloom");
  }
);
