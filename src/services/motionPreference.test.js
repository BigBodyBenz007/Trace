import {
  MOTION_PREFERENCES,
  motionScrollBehavior,
  normalizeMotionPreference,
  resolveReducedMotion,
} from "./motionPreference";

test("normalizes saved motion choices and defaults invalid values to Standard", () => {
  expect(normalizeMotionPreference(MOTION_PREFERENCES.STANDARD)).toBe("standard");
  expect(normalizeMotionPreference(MOTION_PREFERENCES.REDUCED)).toBe("reduced");
  expect(normalizeMotionPreference(undefined)).toBe("standard");
  expect(normalizeMotionPreference("full-motion")).toBe("standard");
});

test("device Reduced overrides saved Standard through the shared resolver", () => {
  expect(resolveReducedMotion("standard", false)).toBe(false);
  expect(resolveReducedMotion("reduced", false)).toBe(true);
  expect(resolveReducedMotion("standard", true)).toBe(true);
  expect(resolveReducedMotion("reduced", true)).toBe(true);
});

test("resolved Reduced motion uses instant scrolling", () => {
  expect(motionScrollBehavior(false)).toBe("smooth");
  expect(motionScrollBehavior(true)).toBe("auto");
});

test("feature navigation consumes the effective root motion state", () => {
  const root = document.createElement("div");
  root.className = "trace-app-shell";
  root.dataset.motion = "standard";
  document.body.appendChild(root);
  expect(motionScrollBehavior()).toBe("smooth");
  root.dataset.motion = "reduced";
  expect(motionScrollBehavior()).toBe("auto");
  root.remove();
});
