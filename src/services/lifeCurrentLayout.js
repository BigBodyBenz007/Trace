export const LIFE_CURRENT_LAYOUT_TUNING = Object.freeze({
  minimumGap: 1,
  maximumGap: 4,
  logarithmicScale: 4,
  compressionScaleDays: 7,
});

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return {
    dateKey: `${match[1]}-${match[2]}-${match[3]}`,
    year,
    month,
    day,
    calendarDay: date.getTime() / MILLISECONDS_PER_DAY,
  };
}

function compareDate(first, second) {
  return first.dateKey < second.dateKey ? -1 : first.dateKey > second.dateKey ? 1 : 0;
}

function finiteNonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function canonicalDays(days) {
  const byDate = new Map();
  (Array.isArray(days) ? days : []).forEach((day) => {
    const parts = parseDateKey(day?.dateKey);
    if (!parts) return;
    const existing = byDate.get(parts.dateKey);
    const rawActivity = finiteNonNegative(day?.rawActivity);
    const intensity = Math.min(1, finiteNonNegative(day?.intensity));
    if (!existing) {
      byDate.set(parts.dateKey, { ...parts, rawActivity, intensity });
      return;
    }
    // Phase 1 emits one bucket per day. Maxima make malformed duplicate input
    // deterministic without treating duplicates as additional temporal points.
    existing.rawActivity = Math.max(existing.rawActivity, rawActivity);
    existing.intensity = Math.max(existing.intensity, intensity);
  });
  return [...byDate.values()].sort(compareDate);
}

function compressedGap(elapsedDays) {
  if (!Number.isFinite(elapsedDays) || elapsedDays <= 0) return 0;
  const additionalDays = Math.max(0, elapsedDays - 1);
  return Math.min(
    LIFE_CURRENT_LAYOUT_TUNING.maximumGap,
    LIFE_CURRENT_LAYOUT_TUNING.minimumGap +
      LIFE_CURRENT_LAYOUT_TUNING.logarithmicScale *
        Math.log1p(additionalDays / LIFE_CURRENT_LAYOUT_TUNING.compressionScaleDays)
  );
}

export function deriveLifeCurrentLayout(lifeCurrent = {}) {
  const days = canonicalDays(lifeCurrent?.days);
  if (days.length === 0) {
    return {
      points: [],
      bounds: {
        earliestDateKey: null,
        latestDateKey: null,
        minX: 0,
        maxX: 0,
        span: 0,
      },
    };
  }

  let x = 0;
  const points = days.map((day, index) => {
    const previous = days[index - 1];
    const elapsedDaysFromPrevious = previous
      ? day.calendarDay - previous.calendarDay
      : 0;
    const visualGapFromPrevious = previous
      ? compressedGap(elapsedDaysFromPrevious)
      : 0;
    x += visualGapFromPrevious;
    return {
      dateKey: day.dateKey,
      year: day.year,
      month: day.month,
      day: day.day,
      x,
      normalizedX: 0,
      elapsedDaysFromPrevious,
      visualGapFromPrevious,
      intensity: day.intensity,
      rawActivity: day.rawActivity,
    };
  });

  const maxX = points[points.length - 1].x;
  points.forEach((point) => {
    point.normalizedX = maxX > 0 ? point.x / maxX : 0;
  });

  return {
    points,
    bounds: {
      earliestDateKey: points[0].dateKey,
      latestDateKey: points[points.length - 1].dateKey,
      minX: 0,
      maxX,
      span: maxX,
    },
  };
}
