import { useEffect, useState } from "react";

export const REDUCED_MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)";

export const MOTION_PREFERENCES = Object.freeze({
  STANDARD: "standard",
  REDUCED: "reduced",
});

export function normalizeMotionPreference(value) {
  return Object.values(MOTION_PREFERENCES).includes(value)
    ? value
    : MOTION_PREFERENCES.STANDARD;
}

export function resolveReducedMotion(motionPreference, devicePrefersReducedMotion) {
  return normalizeMotionPreference(motionPreference) === MOTION_PREFERENCES.REDUCED
    || Boolean(devicePrefersReducedMotion);
}

function readDevicePreference() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches;
}

export function useReducedMotion(motionPreference) {
  const [devicePrefersReducedMotion, setDevicePrefersReducedMotion] = useState(readDevicePreference);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia(REDUCED_MOTION_MEDIA_QUERY);
    const update = () => setDevicePrefersReducedMotion(query.matches);
    update();
    if (typeof query.addEventListener === "function") query.addEventListener("change", update);
    else query.addListener?.(update);
    return () => {
      if (typeof query.removeEventListener === "function") query.removeEventListener("change", update);
      else query.removeListener?.(update);
    };
  }, []);

  return resolveReducedMotion(motionPreference, devicePrefersReducedMotion);
}

export function motionScrollBehavior(reducedMotion) {
  const active = typeof reducedMotion === "boolean"
    ? reducedMotion
    : typeof document !== "undefined"
      && document.querySelector(".trace-app-shell")?.dataset.motion === "reduced";
  return active ? "auto" : "smooth";
}
