export const RIVER_GEOMETRY_TUNING = Object.freeze({
  detailedEdgeIntervals: 14,
  detailedEdgeSpan: 3000,
  edgeInset: 12,
  maximumSamples: 320,
  minimumBankSeparation: 64,
  sampleSpacing: 220,
  singleDayHalfLength: 10,
});

const END_BEND_TARGETS = Object.freeze([0.74, 0.31, 0.18, 0.72, 0.86, 0.27, 0.48, 0.08]);

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function intensityOf(point) {
  return clamp(finiteNumber(point?.intensity), 0, 1);
}

function rounded(value) {
  return Number(value.toFixed(3));
}

function deterministicUnit(index, seed) {
  let value = Math.imul(index + 1, 0x45d9f3b) ^ seed;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function pointCommands(points) {
  return points.slice(1).map((point, index) => {
    const current = points[index];
    const previous = points[index - 1] || current;
    const next = points[index + 2] || point;
    const firstControl = {
      x: current.x + (point.x - previous.x) / 6,
      y: current.y + (point.y - previous.y) / 6,
    };
    const secondControl = {
      x: point.x - (next.x - current.x) / 6,
      y: point.y - (next.y - current.y) / 6,
    };
    return `C ${rounded(firstControl.x)} ${rounded(firstControl.y)}, ` +
      `${rounded(secondControl.x)} ${rounded(secondControl.y)}, ` +
      `${rounded(point.x)} ${rounded(point.y)}`;
  }).join(" ");
}

export function riverCurvePath(points) {
  if (!Array.isArray(points) || points.length === 0) return "";
  return `M ${rounded(points[0].x)} ${rounded(points[0].y)} ${pointCommands(points)}`.trim();
}

function areaBetween(upper, lower) {
  const reversedLower = [...lower].reverse();
  return `${riverCurvePath(upper)} L ${rounded(reversedLower[0].x)} ` +
    `${rounded(reversedLower[0].y)} ${pointCommands(reversedLower)} Z`;
}

function sourcePoints(points, width, extendFinalPointToEdge) {
  const edgeInset = Math.min(RIVER_GEOMETRY_TUNING.edgeInset, width / 4);
  const availableWidth = Math.max(
    0,
    width - edgeInset - (extendFinalPointToEdge ? 0 : edgeInset)
  );
  const sources = [];

  (Array.isArray(points) ? points : []).forEach((point) => {
    const normalizedX = clamp(finiteNumber(point?.normalizedX), 0, 1);
    const x = edgeInset + normalizedX * availableWidth;
    const previous = sources[sources.length - 1];
    if (previous && x <= previous.x) {
      previous.intensity = Math.max(previous.intensity, intensityOf(point));
      return;
    }
    sources.push({ x, intensity: intensityOf(point) });
  });

  if (sources.length !== 1) return sources;
  const [source] = sources;
  const halfLength = Math.min(
    RIVER_GEOMETRY_TUNING.singleDayHalfLength,
    Math.max(1, width / 4)
  );
  return [
    { ...source, x: clamp(source.x - halfLength, 0, width) },
    { ...source, x: clamp(source.x + halfLength, 0, width) },
  ];
}

function interpolatedIntensity(sources, x, cursor) {
  while (cursor.index < sources.length - 2 && x > sources[cursor.index + 1].x) {
    cursor.index += 1;
  }
  const left = sources[cursor.index];
  const right = sources[Math.min(cursor.index + 1, sources.length - 1)];
  if (right.x <= left.x) return Math.max(left.intensity, right.intensity);
  const progress = clamp((x - left.x) / (right.x - left.x), 0, 1);
  return left.intensity + (right.intensity - left.intensity) * progress;
}

function smoothedIntensities(samples) {
  const prefix = samples.reduce((values, sample) => {
    values.push(values[values.length - 1] + sample.intensity);
    return values;
  }, [0]);
  return samples.map((sample, index) => {
    const start = Math.max(0, index - 2);
    const end = Math.min(samples.length - 1, index + 2);
    return (prefix[end + 1] - prefix[start]) / (end - start + 1);
  });
}

function normalizedWeights(count, seed) {
  const weights = Array.from({ length: count }, (_, index) =>
    0.72 + deterministicUnit(index, seed) * 0.56
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
}

function sampleCoordinates(startX, endX, sampleCount) {
  const span = endX - startX;
  const intervalCount = sampleCount - 1;
  if (intervalCount <= 0 || span <= 0) return [startX];

  let intervalWidths;
  if (sampleCount < RIVER_GEOMETRY_TUNING.maximumSamples) {
    intervalWidths = normalizedWeights(intervalCount, 0x1f123bb5)
      .map((weight) => weight * span);
  } else {
    const edgeCount = Math.min(
      RIVER_GEOMETRY_TUNING.detailedEdgeIntervals,
      Math.floor(intervalCount / 4)
    );
    const interiorCount = intervalCount - edgeCount * 2;
    const edgeSpan = Math.min(
      RIVER_GEOMETRY_TUNING.detailedEdgeSpan,
      span * 0.18
    );
    const interiorSpan = span - edgeSpan * 2;
    intervalWidths = [
      ...normalizedWeights(edgeCount, 0x2a741c63).map((weight) => weight * edgeSpan),
      ...normalizedWeights(interiorCount, 0x5e2d58d1)
        .map((weight) => weight * interiorSpan),
      ...normalizedWeights(edgeCount, 0x73a91e47).map((weight) => weight * edgeSpan),
    ];
  }

  const coordinates = [startX];
  intervalWidths.forEach((intervalWidth, index) => {
    coordinates.push(index === intervalWidths.length - 1
      ? endX
      : coordinates[coordinates.length - 1] + intervalWidth);
  });
  return coordinates;
}

function spatialSamples(sources) {
  const startX = sources[0].x;
  const endX = sources[sources.length - 1].x;
  const span = Math.max(0, endX - startX);
  const sampleCount = Math.min(
    RIVER_GEOMETRY_TUNING.maximumSamples,
    Math.max(2, Math.ceil(span / RIVER_GEOMETRY_TUNING.sampleSpacing) + 1)
  );
  const cursor = { index: 0 };
  const samples = sampleCoordinates(startX, endX, sampleCount).map((x) => {
    return { x, intensity: interpolatedIntensity(sources, x, cursor) };
  });
  const intensities = smoothedIntensities(samples);
  return samples.map((sample, index) => ({ ...sample, intensity: intensities[index] }));
}

function geographicCenter(index, sampleCount, height) {
  const remainingSamples = sampleCount - index;
  const bend = remainingSamples <= END_BEND_TARGETS.length
    ? END_BEND_TARGETS[END_BEND_TARGETS.length - remainingSamples]
    : deterministicUnit(index, 0xec48c90d);
  const slowDrift = height * (
    deterministicUnit(Math.floor(index / 5), 0x6c8e9cf5) - 0.5
  ) * 0.04;
  return height * (0.335 + bend * 0.31) + slowDrift;
}

function fitBanks(upperY, lowerY, height) {
  const topLimit = Math.max(14, height * 0.1);
  const bottomLimit = height - Math.max(22, height * 0.12);
  let upper = upperY;
  let lower = lowerY;
  const separation = lower - upper;
  if (separation < RIVER_GEOMETRY_TUNING.minimumBankSeparation) {
    const adjustment = (RIVER_GEOMETRY_TUNING.minimumBankSeparation - separation) / 2;
    upper -= adjustment;
    lower += adjustment;
  }
  if (upper < topLimit) {
    lower += topLimit - upper;
    upper = topLimit;
  }
  if (lower > bottomLimit) {
    upper -= lower - bottomLimit;
    lower = bottomLimit;
  }
  return { upper: rounded(upper), lower: rounded(lower) };
}

export function deriveRiverGeometry(points, options = {}) {
  const width = Math.max(40, finiteNumber(options.width, 1000));
  const height = Math.max(140, finiteNumber(options.height, 260));
  const sources = sourcePoints(points, width, options.extendFinalPointToEdge === true);
  if (sources.length === 0) return null;
  const samples = spatialSamples(sources);
  const upper = [];
  const lower = [];
  const upperShoreOuter = [];
  const lowerShoreOuter = [];
  const depthUpper = [];
  const depthLower = [];
  const widths = [];

  const farDetailOuter = [];
  const nearDetailOuter = [];

  samples.forEach((sample, index) => {
    const center = geographicCenter(index, samples.length, height);
    const targetWidth = height * (
      0.30 +
      sample.intensity * 0.18 +
      (deterministicUnit(index, 0x51d7348b) - 0.5) * 0.2
    );
    const upperShare = 0.43 + deterministicUnit(index, 0x17b7a1d3) * 0.1;
    const upperIrregularity =
      (deterministicUnit(index, 0x29c86f41) - 0.5) * height * 0.07;
    const lowerIrregularity =
      (deterministicUnit(index, 0x7d3e5a19) - 0.5) * height * 0.085;
    const fitted = fitBanks(
      center - targetWidth * upperShare + upperIrregularity,
      center + targetWidth * (1 - upperShare) + lowerIrregularity,
      height
    );
    const widthAtSample = fitted.lower - fitted.upper;
    upper.push({ x: rounded(sample.x), y: fitted.upper });
    lower.push({ x: rounded(sample.x), y: fitted.lower });
    widths.push(widthAtSample);

    const upperShoreWidth = height * (
      0.025 + deterministicUnit(index, 0x3b5d972f) * 0.04
    );
    const lowerShoreWidth = height * (
      0.028 + deterministicUnit(index, 0x68f2c4ad) * 0.045
    );
    upperShoreOuter.push({
      x: rounded(sample.x),
      y: rounded(Math.max(0, fitted.upper - upperShoreWidth)),
    });
    lowerShoreOuter.push({
      x: rounded(sample.x),
      y: rounded(Math.min(height, fitted.lower + lowerShoreWidth)),
    });
    farDetailOuter.push({
      x: rounded(sample.x),
      y: rounded(Math.max(0, fitted.upper - upperShoreWidth - height * 0.31)),
    });
    nearDetailOuter.push({
      x: rounded(sample.x),
      y: rounded(Math.min(height, fitted.lower + lowerShoreWidth + height * 0.31)),
    });
    depthUpper.push({
      x: rounded(sample.x),
      y: rounded(fitted.upper + widthAtSample * (
        0.18 + deterministicUnit(index, 0x4e8d16c7) * 0.07
      )),
    });
    depthLower.push({
      x: rounded(sample.x),
      y: rounded(fitted.lower - widthAtSample * (
        0.2 + deterministicUnit(index, 0x12a4f6e3) * 0.08
      )),
    });
  });

  const top = upperShoreOuter.map(({ x }) => ({ x, y: 0 }));
  const bottom = lowerShoreOuter.map(({ x }) => ({ x, y: height }));
  const minimumWidth = Math.min(...widths);
  const maximumWidth = Math.max(...widths);

  return {
    width,
    height,
    sampleCount: samples.length,
    startX: upper[0].x,
    endX: upper[upper.length - 1].x,
    minimumWidth,
    maximumWidth,
    upper,
    lower,
    upperShoreOuter,
    lowerShoreOuter,
    depthUpper,
    depthLower,
    paths: {
      farLand: areaBetween(top, upperShoreOuter),
      upperShore: areaBetween(upperShoreOuter, upper),
      channel: areaBetween(upper, lower),
      depth: areaBetween(depthUpper, depthLower),
      lowerShore: areaBetween(lower, lowerShoreOuter),
      nearLand: areaBetween(lowerShoreOuter, bottom),
      farDetails: areaBetween(farDetailOuter, upperShoreOuter),
      nearDetails: areaBetween(lowerShoreOuter, nearDetailOuter),
    },
  };
}

export function sampleRiverLowerBank(geometry, horizontalCoordinate) {
  const points = geometry?.lower;
  if (!Array.isArray(points) || points.length === 0) return null;
  const x = finiteNumber(horizontalCoordinate, points[0].x);
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;
  let low = 0;
  let high = points.length - 1;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle].x <= x) low = middle;
    else high = middle;
  }
  const left = points[low];
  const right = points[high];
  const progress = (x - left.x) / Math.max(1, right.x - left.x);
  return left.y + (right.y - left.y) * progress;
}
