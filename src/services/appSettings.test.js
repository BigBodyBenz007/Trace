import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  readAppSettings,
  writeAppSettings,
} from "./appSettings";
import { DEFAULT_HOME_VISIBILITY } from "./homeModules";

test("defaults new and missing settings to Modern Heirloom schema v5", () => {
  expect(readAppSettings({ getItem: () => null })).toEqual(DEFAULT_APP_SETTINGS);
  expect(DEFAULT_APP_SETTINGS).toMatchObject({
    schemaVersion: 5,
    themeId: "modern-heirloom",
    homeVisibility: DEFAULT_HOME_VISIBILITY,
    motionPreference: "standard",
    journalPrivacy: { autoLockMinutes: 5 },
  });
  expect(DEFAULT_APP_SETTINGS).not.toHaveProperty("lifeCurrentThemeId");
});

test("persists normalized current settings with only themeId", () => {
  const storage = {
    raw: null,
    getItem() { return this.raw; },
    setItem(key, value) { this.raw = value; },
  };
  const saved = writeAppSettings(storage, {
    schemaVersion: 3,
    units: { weight: "kg", height: "cm", circumference: "cm" },
    lifeCurrentThemeId: "haunted-forest",
    homeVisibility: { ...DEFAULT_HOME_VISIBILITY, workouts: false },
    motionPreference: "reduced",
  });

  expect(saved).toEqual({
    schemaVersion: 5,
    units: { weight: "kg", height: "cm", circumference: "cm" },
    themeId: "haunted-forest",
    homeVisibility: { ...DEFAULT_HOME_VISIBILITY, workouts: false },
    motionPreference: "reduced",
    journalPrivacy: { autoLockMinutes: 5 },
  });
  expect(JSON.parse(storage.raw)).toEqual(saved);
  expect(storage.raw).not.toContain("lifeCurrentThemeId");
});

test.each(["river", "haunted-forest", "gnome-village", "desert-journey", "outer-space-journey"])(
  "migrates legacy lifeCurrentThemeId %s without changing the selected theme",
  (lifeCurrentThemeId) => {
    expect(normalizeAppSettings({
      schemaVersion: 3,
      units: { weight: "kg", height: "cm", circumference: "cm" },
      lifeCurrentThemeId,
      homeVisibility: { ...DEFAULT_HOME_VISIBILITY, journal: false },
      motionPreference: "reduced",
    })).toEqual({
      schemaVersion: 5,
      units: { weight: "kg", height: "cm", circumference: "cm" },
      themeId: lifeCurrentThemeId,
      homeVisibility: { ...DEFAULT_HOME_VISIBILITY, journal: false },
      motionPreference: "reduced",
      journalPrivacy: { autoLockMinutes: 5 },
    });
  }
);

test("valid current themeId takes precedence over a valid legacy value", () => {
  expect(normalizeAppSettings({
    themeId: "modern-heirloom",
    lifeCurrentThemeId: "river",
  }).themeId).toBe("modern-heirloom");
  expect(normalizeAppSettings({
    themeId: "outer-space-journey",
    lifeCurrentThemeId: "haunted-forest",
  }).themeId).toBe("outer-space-journey");
});

test("invalid current values can fall through to valid legacy values", () => {
  expect(normalizeAppSettings({
    themeId: "abandoned-theme",
    lifeCurrentThemeId: "gnome-village",
  }).themeId).toBe("gnome-village");
});

test("malformed storage and invalid settings fail safely without losing unrelated defaults", () => {
  expect(readAppSettings({ getItem: () => "not-json" })).toEqual(DEFAULT_APP_SETTINGS);
  expect(readAppSettings({ getItem: () => { throw new Error("storage denied"); } }))
    .toEqual(DEFAULT_APP_SETTINGS);
  expect(normalizeAppSettings({
    units: { weight: "stones", height: "cm", circumference: "cm" },
    themeId: { obsolete: true },
    motionPreference: { reduced: true },
  })).toEqual({
    ...DEFAULT_APP_SETTINGS,
    units: { weight: "lb", height: "cm", circumference: "cm" },
  });
});

test("schema-v3 migration preserves units, Home visibility, and Motion & Effects", () => {
  const homeVisibility = { ...DEFAULT_HOME_VISIBILITY, protocols: false, journal: false };
  expect(normalizeAppSettings({
    schemaVersion: 3,
    units: { weight: "kg", height: "cm", circumference: "cm" },
    lifeCurrentThemeId: "river",
    homeVisibility,
    motionPreference: "reduced",
  })).toEqual({
    schemaVersion: 5,
    units: { weight: "kg", height: "cm", circumference: "cm" },
    themeId: "river",
    homeVisibility,
    motionPreference: "reduced",
    journalPrivacy: { autoLockMinutes: 5 },
  });
});

test("missing or invalid theme and motion values use safe defaults", () => {
  expect(normalizeAppSettings({}).themeId).toBe("modern-heirloom");
  expect(normalizeAppSettings({ themeId: "lost-world" }).themeId).toBe("modern-heirloom");
  expect(normalizeAppSettings({ motionPreference: "excessive" }).motionPreference).toBe("standard");
});

test.each([1, 5, 15, 30])("preserves the supported %s-minute Journal auto-lock choice", (autoLockMinutes) => {
  expect(normalizeAppSettings({ journalPrivacy: { autoLockMinutes } }).journalPrivacy)
    .toEqual({ autoLockMinutes });
});

test("invalid Journal auto-lock settings use the five-minute default", () => {
  expect(normalizeAppSettings({ journalPrivacy: { autoLockMinutes: 2 } }).journalPrivacy)
    .toEqual({ autoLockMinutes: 5 });
});
