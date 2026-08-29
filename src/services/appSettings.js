import {
  DEFAULT_APP_THEME_ID,
  isAppThemeId,
} from "./appThemes";
import {
  DEFAULT_HOME_VISIBILITY,
  normalizeHomeVisibility,
} from "./homeModules";
import {
  MOTION_PREFERENCES,
  normalizeMotionPreference,
} from "./motionPreference";

export { MOTION_PREFERENCES, normalizeMotionPreference } from "./motionPreference";

export const APP_SETTINGS_STORAGE_KEY = "appSettings";
export const APP_SETTINGS_SCHEMA_VERSION = 4;
export const DEFAULT_APP_SETTINGS = Object.freeze({
  schemaVersion: APP_SETTINGS_SCHEMA_VERSION,
  units: Object.freeze({ weight: "lb", height: "ft-in", circumference: "in" }),
  themeId: DEFAULT_APP_THEME_ID,
  homeVisibility: DEFAULT_HOME_VISIBILITY,
  motionPreference: MOTION_PREFERENCES.STANDARD,
});

const VALID_UNITS = { weight: ["lb", "kg"], height: ["ft-in", "cm"], circumference: ["in", "cm"] };

function resolveThemeId(value) {
  if (isAppThemeId(value?.themeId)) return value.themeId;
  if (isAppThemeId(value?.lifeCurrentThemeId)) return value.lifeCurrentThemeId;
  return DEFAULT_APP_THEME_ID;
}

export function normalizeAppSettings(value) {
  const units = value?.units || {};
  return {
    schemaVersion: APP_SETTINGS_SCHEMA_VERSION,
    units: Object.fromEntries(Object.entries(VALID_UNITS).map(([key, choices]) => [
      key,
      choices.includes(units[key]) ? units[key] : DEFAULT_APP_SETTINGS.units[key],
    ])),
    themeId: resolveThemeId(value),
    homeVisibility: normalizeHomeVisibility(value?.homeVisibility),
    motionPreference: normalizeMotionPreference(value?.motionPreference),
  };
}

export function readAppSettings(storage = localStorage) {
  try {
    const raw = storage.getItem(APP_SETTINGS_STORAGE_KEY);
    return raw ? normalizeAppSettings(JSON.parse(raw)) : normalizeAppSettings();
  } catch (error) {
    return normalizeAppSettings();
  }
}

export function writeAppSettings(storage, settings) {
  const normalized = normalizeAppSettings(settings);
  storage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
