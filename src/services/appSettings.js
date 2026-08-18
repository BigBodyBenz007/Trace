import {
  DEFAULT_LIFE_CURRENT_THEME_ID,
  normalizeLifeCurrentThemeId,
} from "./lifeCurrentThemes";

export const APP_SETTINGS_STORAGE_KEY = "appSettings";
export const APP_SETTINGS_SCHEMA_VERSION = 1;
export const DEFAULT_APP_SETTINGS = Object.freeze({
  schemaVersion: APP_SETTINGS_SCHEMA_VERSION,
  units: Object.freeze({ weight: "lb", height: "ft-in", circumference: "in" }),
  lifeCurrentThemeId: DEFAULT_LIFE_CURRENT_THEME_ID,
});

const VALID_UNITS = { weight: ["lb", "kg"], height: ["ft-in", "cm"], circumference: ["in", "cm"] };

export function normalizeAppSettings(value) {
  const units = value?.units || {};
  return {
    schemaVersion: APP_SETTINGS_SCHEMA_VERSION,
    units: Object.fromEntries(Object.entries(VALID_UNITS).map(([key, choices]) => [
      key,
      choices.includes(units[key]) ? units[key] : DEFAULT_APP_SETTINGS.units[key],
    ])),
    lifeCurrentThemeId: normalizeLifeCurrentThemeId(value?.lifeCurrentThemeId),
  };
}

export function readAppSettings(storage = localStorage) {
  const raw = storage.getItem(APP_SETTINGS_STORAGE_KEY);
  if (!raw) return normalizeAppSettings();
  try { return normalizeAppSettings(JSON.parse(raw)); } catch (error) { return normalizeAppSettings(); }
}

export function writeAppSettings(storage, settings) {
  const normalized = normalizeAppSettings(settings);
  storage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
