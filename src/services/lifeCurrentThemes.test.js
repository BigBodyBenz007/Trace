import {
  DEFAULT_LIFE_CURRENT_THEME_ID,
  getLifeCurrentTheme,
  LIFE_CURRENT_THEMES,
  normalizeLifeCurrentThemeId,
} from "./lifeCurrentThemes";

test("registers the five stable first-party Life Current themes", () => {
  expect(LIFE_CURRENT_THEMES.map(({ id }) => id)).toEqual([
    "river",
    "haunted-forest",
    "gnome-village",
    "desert-journey",
    "outer-space-journey",
  ]);
  expect(DEFAULT_LIFE_CURRENT_THEME_ID).toBe("river");
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
});

test.each([undefined, null, "", "obsolete", {}, []])(
  "normalizes unknown theme value %p to River",
  (value) => {
    expect(normalizeLifeCurrentThemeId(value)).toBe("river");
    expect(getLifeCurrentTheme(value).id).toBe("river");
  }
);
