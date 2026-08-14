import { DEFAULT_APP_SETTINGS, normalizeAppSettings, readAppSettings, writeAppSettings } from "./appSettings";

test("defaults to lb, ft/in, and inches", () => {
  expect(readAppSettings({ getItem: () => null })).toEqual(DEFAULT_APP_SETTINGS);
});

test("persists versioned preferences and safely normalizes malformed values", () => {
  const storage = { raw: null, getItem() { return this.raw; }, setItem(key, value) { this.raw = value; } };
  writeAppSettings(storage, { units: { weight: "kg", height: "cm", circumference: "cm" } });
  expect(readAppSettings(storage)).toEqual({ schemaVersion: 1, units: { weight: "kg", height: "cm", circumference: "cm" } });
  storage.raw = "not-json";
  expect(readAppSettings(storage)).toEqual(DEFAULT_APP_SETTINGS);
  expect(normalizeAppSettings({ units: { weight: "stones" } })).toEqual(DEFAULT_APP_SETTINGS);
});
