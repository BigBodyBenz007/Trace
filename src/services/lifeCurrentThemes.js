// Temporary renderer-facing compatibility exports. The authoritative registry
// lives in appThemes so app and Life Current selection cannot diverge.
export {
  APP_THEMES as LIFE_CURRENT_THEMES,
  DEFAULT_APP_THEME_ID as DEFAULT_LIFE_CURRENT_THEME_ID,
  getAppTheme as getLifeCurrentTheme,
  normalizeAppThemeId as normalizeLifeCurrentThemeId,
} from "./appThemes";
