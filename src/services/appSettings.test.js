import { DEFAULT_APP_SETTINGS, normalizeAppSettings, readAppSettings, writeAppSettings } from "./appSettings";
import { DEFAULT_HOME_VISIBILITY } from "./homeModules";

test("defaults to the existing units, River theme, and all Home modules visible", () => {
  expect(readAppSettings({ getItem: () => null })).toEqual(DEFAULT_APP_SETTINGS);
  expect(DEFAULT_APP_SETTINGS.lifeCurrentThemeId).toBe("river");
  expect(DEFAULT_APP_SETTINGS.homeVisibility).toEqual(DEFAULT_HOME_VISIBILITY);
  expect(DEFAULT_APP_SETTINGS.schemaVersion).toBe(3);
  expect(DEFAULT_APP_SETTINGS.motionPreference).toBe("standard");
});

test("persists versioned preferences and safely normalizes malformed values", () => {
  const storage = { raw: null, getItem() { return this.raw; }, setItem(key, value) { this.raw = value; } };
  writeAppSettings(storage, { units: { weight: "kg", height: "cm", circumference: "cm" }, lifeCurrentThemeId: "haunted-forest", motionPreference: "reduced" });
  expect(readAppSettings(storage)).toEqual({ schemaVersion: 3, units: { weight: "kg", height: "cm", circumference: "cm" }, lifeCurrentThemeId: "haunted-forest", homeVisibility: DEFAULT_HOME_VISIBILITY, motionPreference: "reduced" });
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
    schemaVersion: 3,
    units: { weight: "kg", height: "cm", circumference: "cm" },
    lifeCurrentThemeId: "river",
    homeVisibility: DEFAULT_HOME_VISIBILITY,
    motionPreference: "standard",
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

test("migrates schema-v1 and schema-v2 settings without losing Home visibility", () => {
  const hiddenHome = { ...DEFAULT_HOME_VISIBILITY, workouts: false, journal: false };
  expect(normalizeAppSettings({
    schemaVersion: 1,
    units: { weight: "kg", height: "cm", circumference: "cm" },
    lifeCurrentThemeId: "haunted-forest",
  })).toEqual({
    schemaVersion: 3,
    units: { weight: "kg", height: "cm", circumference: "cm" },
    lifeCurrentThemeId: "haunted-forest",
    homeVisibility: DEFAULT_HOME_VISIBILITY,
    motionPreference: "standard",
  });
  expect(normalizeAppSettings({
    schemaVersion: 2,
    units: { weight: "lb", height: "ft-in", circumference: "in" },
    lifeCurrentThemeId: "river",
    homeVisibility: hiddenHome,
    motionPreference: "reduced",
  })).toEqual({
    schemaVersion: 3,
    units: { weight: "lb", height: "ft-in", circumference: "in" },
    lifeCurrentThemeId: "river",
    homeVisibility: hiddenHome,
    motionPreference: "reduced",
  });
});

test("missing and malformed motion values safely default to Standard", () => {
  expect(normalizeAppSettings({ motionPreference: null }).motionPreference).toBe("standard");
  expect(normalizeAppSettings({ motionPreference: "excessive" }).motionPreference).toBe("standard");
  expect(normalizeAppSettings({ motionPreference: { reduced: true } }).motionPreference).toBe("standard");
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
