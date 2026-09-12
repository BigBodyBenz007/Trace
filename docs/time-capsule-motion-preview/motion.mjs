// Pure choreography for the isolated motion study. All poses use one mesh.
export const durations = Object.freeze({ open: 7.6, close: 6.4 });

const MAX_ANGLE = 102 * Math.PI / 180;
const SETTLE_ANGLE = 7 * Math.PI / 180;
const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
const quintic = (value) => value * value * value * (value * (value * 6 - 15) + 10);
const progress = (time, start, end) => quintic(clamp((time - start) / (end - start)));
const interiorLight = (angle) => quintic(clamp(angle / (28 * Math.PI / 180)));

function openPose(time) {
  const angle = MAX_ANGLE * progress(time, 2.65, 6.8);
  const valve = progress(time, 1.7, 2.1) * (1 - progress(time, 2.55, 3.2));
  const pressure = progress(time, 1.95, 2.15) * (1 - progress(time, 2.15, 2.55));
  let phase = "Sealed";
  if (time >= 0.3) phase = "Unlocking dial";
  if (time >= 1.1) phase = "Retracting bolts";
  if (time >= 1.7) phase = "Opening pressure valve";
  if (time >= 1.95) phase = "Releasing pressure";
  if (time >= 2.65) phase = "Lifting lid";
  if (time >= 6.8) phase = "Open";
  return {
    angle,
    bolts: 1 - progress(time, 1.1, 1.7),
    dial: 1 - progress(time, 0.3, 1.2),
    valve,
    light: interiorLight(angle),
    pressure,
    phase,
  };
}

function closePose(time) {
  // The motor brings the lid close, then seats the gasket gently. The final
  // seven degrees get their own slower interval, with no rebound or lifting.
  const angle = time <= 3.4
    ? MAX_ANGLE + (SETTLE_ANGLE - MAX_ANGLE) * progress(time, 0.4, 3.4)
    : SETTLE_ANGLE * (1 - progress(time, 3.4, 4.2));
  let phase = "Ready to close";
  if (time >= 0.4) phase = "Lowering lid";
  if (time >= 3.4) phase = "Seating lid";
  if (time >= 4.2) phase = "Lid seated";
  if (time >= 4.45) phase = "Engaging bolts";
  if (time >= 5.15) phase = "Bolts engaged";
  if (time >= 5.2) phase = "Locking dial";
  if (time >= 6.05) phase = "Sealed";
  return {
    angle,
    bolts: progress(time, 4.45, 5.15),
    dial: progress(time, 5.2, 6.05),
    valve: 0,
    light: interiorLight(angle),
    pressure: 0,
    phase,
  };
}

export function sampleMotion(kind, seconds = 0) {
  if (kind !== "open" && kind !== "close") {
    throw new TypeError(`Unknown capsule motion: ${kind}`);
  }
  const suppliedTime = Number(seconds);
  const time = clamp(Number.isNaN(suppliedTime) ? 0 : suppliedTime, 0, durations[kind]);
  const pose = kind === "open" ? openPose(time) : closePose(time);
  return { ...pose, done: time >= durations[kind] };
}
