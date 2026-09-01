import {
  APP_THEMES,
  DEFAULT_APP_THEME_ID,
  DEFAULT_SHELL_THEME_ID,
  getAppTheme,
  getAppShellThemeColor,
  isAppThemeId,
  normalizeAppThemeId,
  resolveAppShellThemeId,
} from "./appThemes";

test("registers seven unique app themes with exactly one Modern Heirloom default", () => {
  const ids = APP_THEMES.map(({ id }) => id);
  expect(ids).toEqual([
    "modern-heirloom",
    "river",
    "haunted-forest",
    "gnome-village",
    "desert-journey",
    "outer-space-journey",
    "to-kingdoms-ahead",
  ]);
  expect(new Set(ids)).toHaveProperty("size", ids.length);
  expect(APP_THEMES.filter(({ isDefault }) => isDefault)).toEqual([
    expect.objectContaining({ id: "modern-heirloom", immersive: false }),
  ]);
  expect(DEFAULT_APP_THEME_ID).toBe("modern-heirloom");
  expect(DEFAULT_SHELL_THEME_ID).toBe("modern-heirloom");
  expect(getAppTheme("modern-heirloom")).toMatchObject({
    label: "Modern Heirloom",
    description: "A clean, non-illustrated Life Current with Trace’s deep navy heirloom texture.",
    presentation: { renderer: "modern-heirloom-current" },
  });
  expect(getAppTheme("river")).toMatchObject({
    label: "River",
    immersive: true,
    presentation: { renderer: "river-current" },
    tokenMetadata: { foundation: "river", status: "active" },
  });
  expect(getAppTheme("haunted-forest")).toMatchObject({
    immersive: true,
    presentation: { renderer: "forest-path" },
    tokenMetadata: { foundation: "haunted-forest", status: "active" },
  });
  expect(getAppTheme("to-kingdoms-ahead")).toMatchObject({
    label: "To Kingdoms Ahead",
    immersive: true,
    presentation: { renderer: "to-kingdoms-ahead" },
    tokenMetadata: { foundation: "to-kingdoms-ahead", status: "active" },
  });
});

test("resolves active full-app themes to distinct shell token sets", () => {
  expect(resolveAppShellThemeId("modern-heirloom")).toBe("modern-heirloom");
  expect(resolveAppShellThemeId("river")).toBe("river");
  expect(resolveAppShellThemeId("haunted-forest")).toBe("haunted-forest");
  expect(resolveAppShellThemeId("to-kingdoms-ahead")).toBe("to-kingdoms-ahead");
  expect(getAppShellThemeColor("modern-heirloom")).toBe("#07131f");
  expect(getAppShellThemeColor("river")).toBe("#0b2426");
  expect(getAppShellThemeColor("haunted-forest")).toBe("#0b140f");
  expect(getAppShellThemeColor("to-kingdoms-ahead")).toBe("#171712");
});

test.each([
  "gnome-village",
  "desert-journey",
  "outer-space-journey",
  "obsolete-theme",
])("uses the Modern Heirloom shell fallback for %s", (themeId) => {
  expect(resolveAppShellThemeId(themeId)).toBe("modern-heirloom");
  expect(getAppShellThemeColor(themeId)).toBe("#07131f");
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
