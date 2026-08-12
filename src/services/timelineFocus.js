export const TIMELINE_FOCUS_TUNING = Object.freeze({
  baseCardWidth: 184,
  minimumScale: 0.57,
  maximumScale: 1.3,
  focusRadius: 480,
  transitionMilliseconds: 100,
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateTimelineFocusScale(
  distanceFromCenter,
  tuning = TIMELINE_FOCUS_TUNING
) {
  const distance = Math.abs(Number(distanceFromCenter) || 0);
  const radius = Math.max(1, Number(tuning.focusRadius) || 1);
  const minimum = Number(tuning.minimumScale);
  const maximum = Number(tuning.maximumScale);
  const proximity = 1 - clamp(distance / radius, 0, 1);
  const easedProximity = proximity * proximity * (3 - 2 * proximity);
  return minimum + (maximum - minimum) * easedProximity;
}
