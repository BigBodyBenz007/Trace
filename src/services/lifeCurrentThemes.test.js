import {
  DEFAULT_LIFE_CURRENT_THEME_ID,
  getLifeCurrentTheme,
  LIFE_CURRENT_THEMES,
  normalizeLifeCurrentThemeId,
} from "./lifeCurrentThemes";

test("registers the two stable first-party Life Current themes", () => {
  expect(LIFE_CURRENT_THEMES.map(({ id }) => id)).toEqual(["river", "haunted-forest"]);
  expect(DEFAULT_LIFE_CURRENT_THEME_ID).toBe("river");
  expect(getLifeCurrentTheme("haunted-forest")).toMatchObject({
    name: "Haunted Forest",
    description: "A winding path through a darker world.",
    presentation: { renderer: "forest-path" },
  });
});

test.each([undefined, null, "", "obsolete", {}, []])(
  "normalizes unknown theme value %p to River",
  (value) => {
    expect(normalizeLifeCurrentThemeId(value)).toBe("river");
    expect(getLifeCurrentTheme(value).id).toBe("river");
  }
);
