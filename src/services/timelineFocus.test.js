import {
  calculateTimelineFocusScale,
  TIMELINE_FOCUS_TUNING,
} from "./timelineFocus";

test("a centered card receives the configured maximum scale", () => {
  expect(TIMELINE_FOCUS_TUNING).toMatchObject({
    baseCardWidth: 184,
    minimumScale: 0.57,
    maximumScale: 1.3,
    focusRadius: 480,
  });
  expect(calculateTimelineFocusScale(0)).toBe(
    TIMELINE_FOCUS_TUNING.maximumScale
  );
});

test("scale decreases smoothly as distance from center increases", () => {
  const near = calculateTimelineFocusScale(60);
  const middle = calculateTimelineFocusScale(180);
  const far = calculateTimelineFocusScale(300);
  expect(near).toBeGreaterThan(middle);
  expect(middle).toBeGreaterThan(far);
});

test("the stronger focus range keeps intermediate growth deterministic", () => {
  const quarterRadius = calculateTimelineFocusScale(
    TIMELINE_FOCUS_TUNING.focusRadius / 4
  );
  const halfRadius = calculateTimelineFocusScale(
    TIMELINE_FOCUS_TUNING.focusRadius / 2
  );
  const threeQuarterRadius = calculateTimelineFocusScale(
    (TIMELINE_FOCUS_TUNING.focusRadius * 3) / 4
  );
  expect(quarterRadius).toBeGreaterThan(halfRadius);
  expect(halfRadius).toBeGreaterThan(threeQuarterRadius);
  expect(halfRadius).toBeCloseTo(
    (TIMELINE_FOCUS_TUNING.minimumScale +
      TIMELINE_FOCUS_TUNING.maximumScale) /
      2
  );
});

test("focus scaling is symmetric around the viewport center", () => {
  expect(calculateTimelineFocusScale(-145)).toBe(
    calculateTimelineFocusScale(145)
  );
});

test("scale clamps to the configured minimum beyond the focus radius", () => {
  expect(calculateTimelineFocusScale(TIMELINE_FOCUS_TUNING.focusRadius)).toBe(
    TIMELINE_FOCUS_TUNING.minimumScale
  );
  expect(calculateTimelineFocusScale(100000)).toBe(
    TIMELINE_FOCUS_TUNING.minimumScale
  );
});

test("custom tuning remains deterministic and bounded", () => {
  const tuning = {
    focusRadius: 100,
    minimumScale: 0.5,
    maximumScale: 0.9,
  };
  expect(calculateTimelineFocusScale(0, tuning)).toBe(0.9);
  expect(calculateTimelineFocusScale(50, tuning)).toBeCloseTo(0.7);
  expect(calculateTimelineFocusScale(100, tuning)).toBe(0.5);
});
