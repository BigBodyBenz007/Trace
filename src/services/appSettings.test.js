import { DEFAULT_APP_SETTINGS, normalizeAppSettings, readAppSettings, writeAppSettings } from "./appSettings";
import { DEFAULT_HOME_VISIBILITY } from "./homeModules";

test("defaults to the existing units, River theme, and all Home modules visible", () => {
  expect(readAppSettings({ getItem: () => null })).toEqual(DEFAULT_APP_SETTINGS);
  expect(DEFAULT_APP_SETTINGS.lifeCurrentThemeId).toBe("river");
  expect(DEFAULT_APP_SETTINGS.homeVisibility).toEqual(DEFAULT_HOME_VISIBILITY);
});

test("persists versioned preferences and safely normalizes malformed values", () => {
  const storage = { raw: null, getItem() { return this.raw; }, setItem(key, value) { this.raw = value; } };
  writeAppSettings(storage, { units: { weight: "kg", height: "cm", circumference: "cm" }, lifeCurrentThemeId: "haunted-forest" });
  expect(readAppSettings(storage)).toEqual({ schemaVersion: 2, units: { weight: "kg", height: "cm", circumference: "cm" }, lifeCurrentThemeId: "haunted-forest", homeVisibility: DEFAULT_HOME_VISIBILITY });
  storage.raw = "not-json";
  expect(readAppSettings(storage)).toEqual(DEFAULT_APP_SETTINGS);
  expect(normalizeAppSettings({ units: { weight: "stones" } })).toEqual(DEFAULT_APP_SETTINGS);
});

test("invalid stored themes fall back to River while preserving valid unrelated settings", () => {
  const storage = {
    raw: JSON.stringify({
      schemaVersion: 1,
      units: { weight: "kg", height: "cm", circumference: "cm" },
      lifeCurrentThemeId: { obsolete: true },
    }),
    getItem() { return this.raw; },
    setItem(key, value) { this.raw = value; },
  };

  expect(readAppSettings(storage)).toEqual({
    schemaVersion: 2,
    units: { weight: "kg", height: "cm", circumference: "cm" },
    lifeCurrentThemeId: "river",
    homeVisibility: DEFAULT_HOME_VISIBILITY,
  });
});

test("migrates old settings to visible defaults and persists Home visibility across reloads", () => {
  const storage = {
    raw: JSON.stringify({
      schemaVersion: 1,
      units: { weight: "kg", height: "cm", circumference: "cm" },
      lifeCurrentThemeId: "river",
    }),
    getItem() { return this.raw; },
    setItem(key, value) { this.raw = value; },
  };

  const migrated = readAppSettings(storage);
  expect(migrated.homeVisibility).toEqual(DEFAULT_HOME_VISIBILITY);
  writeAppSettings(storage, {
    ...migrated,
    homeVisibility: { ...migrated.homeVisibility, workouts: false, protocols: false },
  });
  expect(readAppSettings(storage).homeVisibility).toEqual({
    ...DEFAULT_HOME_VISIBILITY,
    workouts: false,
    protocols: false,
  });
});

test.each(["haunted-forest", "gnome-village", "desert-journey", "outer-space-journey"])(
  "saving an unrelated unit preference preserves the selected %s Life Current theme",
  (lifeCurrentThemeId) => {
    const storage = {
      raw: JSON.stringify({
        schemaVersion: 1,
        units: { weight: "lb", height: "ft-in", circumference: "in" },
        lifeCurrentThemeId,
      }),
      getItem() { return this.raw; },
      setItem(key, value) { this.raw = value; },
    };
    const current = readAppSettings(storage);

    writeAppSettings(storage, {
      ...current,
      units: { ...current.units, weight: "kg" },
    });

    expect(readAppSettings(storage)).toMatchObject({
      units: { weight: "kg" },
      lifeCurrentThemeId,
    });
  }
);
