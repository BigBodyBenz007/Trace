import {
  APP_THEMES,
  DEFAULT_APP_THEME_ID,
  getAppTheme,
  isAppThemeId,
  normalizeAppThemeId,
} from "./appThemes";

test("registers six unique app themes with exactly one Modern Heirloom default", () => {
  const ids = APP_THEMES.map(({ id }) => id);
  expect(ids).toEqual([
    "modern-heirloom",
    "river",
    "haunted-forest",
    "gnome-village",
    "desert-journey",
    "outer-space-journey",
  ]);
  expect(new Set(ids)).toHaveProperty("size", ids.length);
  expect(APP_THEMES.filter(({ isDefault }) => isDefault)).toEqual([
    expect.objectContaining({ id: "modern-heirloom", immersive: false }),
  ]);
  expect(DEFAULT_APP_THEME_ID).toBe("modern-heirloom");
  expect(getAppTheme("modern-heirloom")).toMatchObject({
    label: "Modern Heirloom",
    presentation: { renderer: "modern-heirloom-current" },
  });
  expect(getAppTheme("river")).toMatchObject({
    label: "River",
    immersive: true,
    presentation: { renderer: "river-current" },
  });
});

test.each([undefined, null, "", "obsolete", {}, []])(
  "normalizes unknown app theme value %p to Modern Heirloom",
  (value) => {
    expect(isAppThemeId(value)).toBe(false);
    expect(normalizeAppThemeId(value)).toBe("modern-heirloom");
    expect(getAppTheme(value).id).toBe("modern-heirloom");
  }
);

test.each(APP_THEMES.map(({ id }) => id))("recognizes the current theme ID %s", (id) => {
  expect(isAppThemeId(id)).toBe(true);
  expect(normalizeAppThemeId(id)).toBe(id);
});
