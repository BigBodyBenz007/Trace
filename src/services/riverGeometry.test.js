import {
  deriveRiverGeometry,
  RIVER_GEOMETRY_TUNING,
  sampleRiverLowerBank,
} from "./riverGeometry";

const point = (normalizedX, intensity = 0.4, dateKey = "2026-01-01") => ({
  dateKey,
  normalizedX,
  intensity,
});

function geometry(points, options = {}) {
  return deriveRiverGeometry(points, { width: 1440, height: 260, ...options });
}

function centersOf(result) {
  return result.upper.map((upper, index) =>
    (upper.y + result.lower[index].y) / 2
  );
}

function directionChanges(values) {
  const directions = values.slice(1).map((value, index) =>
    Math.sign(value - values[index])
  );
  return directions.slice(1).filter((direction, index) =>
    direction !== directions[index]
  ).length;
}

test("returns deterministic River geometry for the same inputs", () => {
  const points = [point(0, 0.2), point(0.45, 0.8), point(1, 0.4)];
  expect(geometry(points)).toEqual(geometry(points));
});

test("produces one finite closed water-channel polygon", () => {
  const result = geometry([point(0), point(0.5), point(1)]);
  expect(result.paths.channel).toMatch(/^M /);
  expect(result.paths.channel).toMatch(/ Z$/);
  expect(result.paths.channel).not.toMatch(/NaN|Infinity|undefined/);
});

test("upper and lower banks diverge independently instead of tracing parallel edges", () => {
  const result = geometry([point(0), point(1)]);
  const widths = result.lower.map((lower, index) => lower.y - result.upper[index].y);
  const upperSteps = result.upper.slice(1).map((upper, index) =>
    upper.y - result.upper[index].y
  );
  const lowerSteps = result.lower.slice(1).map((lower, index) =>
    lower.y - result.lower[index].y
  );
  const bankDivergence = lowerSteps.map((step, index) => step - upperSteps[index]);
  expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(20);
  expect(Math.max(...bankDivergence)).toBeGreaterThan(10);
  expect(Math.min(...bankDivergence)).toBeLessThan(-10);
  expect(new Set(result.upper.map(({ y }) => y)).size).toBeGreaterThan(2);
  expect(new Set(result.lower.map(({ y }) => y)).size).toBeGreaterThan(2);
});

test("engagement changes channel width smoothly", () => {
  const quiet = geometry([point(0, 0), point(0.5, 0), point(1, 0)]);
  const active = geometry([point(0, 1), point(0.5, 1), point(1, 1)]);
  expect(active.minimumWidth).toBeGreaterThan(quiet.minimumWidth);
  expect(active.maximumWidth).toBeGreaterThan(quiet.maximumWidth);
  const widthSteps = active.lower.map((lower, index) =>
    lower.y - active.upper[index].y
  ).slice(1).map((width, index) => Math.abs(
    width - (active.lower[index].y - active.upper[index].y)
  ));
  expect(Math.max(...widthSteps)).toBeLessThan(30);
});

test("enforces minimum bank separation", () => {
  const result = geometry([point(0, 0), point(1, 0)], { height: 140 });
  result.lower.forEach((lower, index) => {
    expect(lower.y - result.upper[index].y)
      .toBeGreaterThanOrEqual(RIVER_GEOMETRY_TUNING.minimumBankSeparation - 0.01);
  });
});

test("uses broad non-periodic meanders with meaningful travel and unequal radii", () => {
  const result = geometry([point(0), point(0.4, 0.9), point(1, 0.2)]);
  const centers = centersOf(result);
  const intervals = result.upper.slice(1).map((upper, index) =>
    upper.x - result.upper[index].x
  );
  expect(Math.max(...centers) - Math.min(...centers)).toBeGreaterThan(35);
  expect(Math.abs(centers.at(-1) - centers[0])).toBeGreaterThan(25);
  expect(directionChanges(centers)).toBeGreaterThanOrEqual(3);
  expect(Math.max(...intervals) - Math.min(...intervals)).toBeGreaterThan(30);
  expect(new Set(intervals.map((interval) => interval.toFixed(2))).size)
    .toBe(intervals.length);
  expect(Math.min(...result.upper.map(({ y }) => y))).toBeGreaterThanOrEqual(0);
  expect(Math.max(...result.lower.map(({ y }) => y))).toBeLessThanOrEqual(result.height);
});

test("a phone-width River still has an obvious curve and changing bank relationship", () => {
  const result = geometry([point(0, 0.1), point(0.5, 1), point(1, 0.2)], {
    width: 390,
  });
  const centers = centersOf(result);
  const widths = result.lower.map((lower, index) => lower.y - result.upper[index].y);
  expect(Math.max(...centers) - Math.min(...centers)).toBeGreaterThan(30);
  expect(directionChanges(centers)).toBeGreaterThanOrEqual(1);
  expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(10);
});

test("supports a single populated day with a restrained finite channel", () => {
  const result = geometry([point(0, 0.5)]);
  expect(result.sampleCount).toBe(2);
  expect(result.endX - result.startX).toBe(20);
  expect(result.paths.channel).not.toMatch(/NaN|Infinity/);
});

test("supports sparse and filtered timelines", () => {
  const result = geometry([
    point(0, 0.1, "1998-03-10"),
    point(0.9, 0.9, "2025-05-01"),
    point(1, 0.2, "2026-08-19"),
  ]);
  expect(result.startX).toBe(12);
  expect(result.endX).toBe(1428);
  expect(sampleRiverLowerBank(result, result.width / 2)).toEqual(expect.any(Number));
});

test("caps long timelines at 320 spatial samples", () => {
  const points = Array.from({ length: 891 }, (_, index) =>
    point(index / 890, (index % 17) / 16, `2026-01-${String(index % 28 + 1).padStart(2, "0")}`)
  );
  const result = geometry(points, { width: 180000 });
  expect(result.sampleCount).toBe(RIVER_GEOMETRY_TUNING.maximumSamples);
  const finalDetailedSpan = result.upper.at(-1).x -
    result.upper.at(-(RIVER_GEOMETRY_TUNING.detailedEdgeIntervals + 1)).x;
  expect(finalDetailedSpan).toBeCloseTo(RIVER_GEOMETRY_TUNING.detailedEdgeSpan, 1);
});

test("keeps a constant eight-path geometry contract", () => {
  const sparse = geometry([point(0), point(1)]);
  const dense = geometry(Array.from({ length: 900 }, (_, index) =>
    point(index / 899, index % 7 / 6)
  ), { width: 180000 });
  expect(Object.keys(sparse.paths)).toHaveLength(8);
  expect(Object.keys(dense.paths)).toHaveLength(8);
  expect(Object.keys(dense.paths)).toEqual(Object.keys(sparse.paths));
});

test("all point collections and generated paths contain finite coordinates", () => {
  const result = geometry([point(0, 0), point(0.33, 1), point(1, 0.2)]);
  [
    result.upper,
    result.lower,
    result.upperShoreOuter,
    result.lowerShoreOuter,
    result.depthUpper,
    result.depthLower,
  ].flat().forEach(({ x, y }) => {
    expect(Number.isFinite(x)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
  });
  Object.values(result.paths).forEach((path) => {
    expect(path).toMatch(/^M /);
    expect(path).toMatch(/ Z$/);
    expect(path).not.toMatch(/NaN|Infinity|undefined/);
  });
});

test("samples and clamps the lower bank at horizontal coordinates", () => {
  const result = geometry([point(0), point(0.5), point(1)]);
  expect(sampleRiverLowerBank(result, -100)).toBe(result.lower[0].y);
  expect(sampleRiverLowerBank(result, result.width + 100)).toBe(result.lower.at(-1).y);
  expect(sampleRiverLowerBank(null, 10)).toBeNull();
});
