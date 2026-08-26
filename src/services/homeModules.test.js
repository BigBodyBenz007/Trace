import {
  DEFAULT_HOME_VISIBILITY,
  HOME_MODULES,
  normalizeHomeVisibility,
} from "./homeModules";

test("defines stable defaults for every customizable Home module", () => {
  expect(Object.keys(DEFAULT_HOME_VISIBILITY)).toEqual(HOME_MODULES.map(({ id }) => id));
  expect(Object.values(DEFAULT_HOME_VISIBILITY).every(Boolean)).toBe(true);
});

test("missing and malformed visibility values stay visible while explicit false stays hidden", () => {
  expect(normalizeHomeVisibility()).toEqual(DEFAULT_HOME_VISIBILITY);
  expect(normalizeHomeVisibility({ workouts: false, protocols: "no", retiredModule: false }))
    .toEqual({ ...DEFAULT_HOME_VISIBILITY, workouts: false });
});
