import { DEFAULT_APP_SETTINGS, normalizeAppSettings, readAppSettings, writeAppSettings } from "./appSettings";

test("defaults to lb, ft/in, inches, and the River Life Current theme", () => {
  expect(readAppSettings({ getItem: () => null })).toEqual(DEFAULT_APP_SETTINGS);
  expect(DEFAULT_APP_SETTINGS.lifeCurrentThemeId).toBe("river");
});

test("persists versioned preferences and safely normalizes malformed values", () => {
  const storage = { raw: null, getItem() { return this.raw; }, setItem(key, value) { this.raw = value; } };
  writeAppSettings(storage, { units: { weight: "kg", height: "cm", circumference: "cm" }, lifeCurrentThemeId: "haunted-forest" });
  expect(readAppSettings(storage)).toEqual({ schemaVersion: 1, units: { weight: "kg", height: "cm", circumference: "cm" }, lifeCurrentThemeId: "haunted-forest" });
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
    schemaVersion: 1,
    units: { weight: "kg", height: "cm", circumference: "cm" },
    lifeCurrentThemeId: "river",
  });
});

test("saving an unrelated unit preference preserves the selected Life Current theme", () => {
  const storage = {
    raw: JSON.stringify({
      schemaVersion: 1,
      units: { weight: "lb", height: "ft-in", circumference: "in" },
      lifeCurrentThemeId: "haunted-forest",
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
    lifeCurrentThemeId: "haunted-forest",
  });
});
