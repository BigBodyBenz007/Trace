const DAY_MS = 24 * 60 * 60 * 1000;

export const LIFE_CURRENT_WINDOW_TUNING = Object.freeze({
  paddingDays: 30,
  minimumWindowDays: 90,
  cameraWindowDays: 120,
});

function calendarDay(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? time / DAY_MS
    : null;
}

function dateKeyFromDay(day) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function xAtDay(points, day) {
  const firstDay = calendarDay(points[0].dateKey);
  if (day <= firstDay) return points[0].x;
  const last = points[points.length - 1];
  const lastDay = calendarDay(last.dateKey);
  if (day >= lastDay) return last.x;

  for (let index = 1; index < points.length; index += 1) {
    const right = points[index];
    const rightDay = calendarDay(right.dateKey);
    if (day > rightDay) continue;
    const left = points[index - 1];
    const leftDay = calendarDay(left.dateKey);
    const progress = (day - leftDay) / (rightDay - leftDay);
    return left.x + (right.x - left.x) * progress;
  }
  return last.x;
}

function boundaryPoint(dateKey, x) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return {
    dateKey,
    year,
    month,
    day,
    x,
    normalizedX: 0,
    intensity: 0,
    rawActivity: 0,
    boundary: true,
  };
}

export function deriveLifeCurrentWindow(layout = {}, options = {}) {
  const points = Array.isArray(layout.points) ? layout.points : [];
  if (points.length === 0) return { points: [], bounds: { ...layout.bounds } };

  let startDay = calendarDay(options.startDateKey);
  let endDay = calendarDay(options.endDateKey);
  if (startDay === null || endDay === null) return layout;
  if (startDay > endDay) [startDay, endDay] = [endDay, startDay];

  const paddingDays = Math.max(0, Number(options.paddingDays) || 0);
  startDay -= paddingDays;
  endDay += paddingDays;
  const minimumWindowDays = Math.max(0, Number(options.minimumWindowDays) || 0);
  if (endDay - startDay < minimumWindowDays) {
    const missing = minimumWindowDays - (endDay - startDay);
    startDay -= Math.floor(missing / 2);
    endDay += Math.ceil(missing / 2);
  }

  const fullStartDay = calendarDay(points[0].dateKey);
  const fullEndDay = calendarDay(points[points.length - 1].dateKey);
  startDay = Math.max(startDay, fullStartDay);
  endDay = Math.min(endDay, fullEndDay);
  if (startDay > endDay) return { points: [], bounds: { earliestDateKey: null, latestDateKey: null, minX: 0, maxX: 0, span: 0 } };

  const startDateKey = dateKeyFromDay(startDay);
  const endDateKey = dateKeyFromDay(endDay);
  const startX = xAtDay(points, startDay);
  const endX = xAtDay(points, endDay);
  const selected = points
    .filter(({ dateKey }) => dateKey >= startDateKey && dateKey <= endDateKey)
    .map((point) => ({ ...point }));
  if (!selected.length || selected[0].dateKey !== startDateKey) {
    selected.unshift(boundaryPoint(startDateKey, startX));
  }
  if (selected[selected.length - 1].dateKey !== endDateKey) {
    selected.push(boundaryPoint(endDateKey, endX));
  }

  const span = endX - startX;
  selected.forEach((point) => {
    point.normalizedX = span > 0 ? (point.x - startX) / span : 0;
  });
  return {
    points: selected,
    bounds: {
      earliestDateKey: startDateKey,
      latestDateKey: endDateKey,
      minX: startX,
      maxX: endX,
      span,
    },
  };
}

export function deriveLifeCurrentCameraWindow(layout, options = {}) {
  const rangeStart = calendarDay(options.rangeStartDateKey);
  const rangeEnd = calendarDay(options.rangeEndDateKey);
  const anchor = calendarDay(options.anchorDateKey);
  if (rangeStart === null || rangeEnd === null || anchor === null) return layout;
  const start = Math.min(rangeStart, rangeEnd);
  const end = Math.max(rangeStart, rangeEnd);
  const windowDays = Math.max(1, Number(options.windowDays) || LIFE_CURRENT_WINDOW_TUNING.cameraWindowDays);
  if (end - start <= windowDays) {
    return deriveLifeCurrentWindow(layout, {
      startDateKey: dateKeyFromDay(start),
      endDateKey: dateKeyFromDay(end),
    });
  }
  const half = windowDays / 2;
  let cameraStart = Math.round(Math.max(start, Math.min(anchor - half, end - windowDays)));
  let cameraEnd = Math.round(cameraStart + windowDays);
  if (cameraEnd > end) {
    cameraEnd = end;
    cameraStart = end - windowDays;
  }
  return deriveLifeCurrentWindow(layout, {
    startDateKey: dateKeyFromDay(cameraStart),
    endDateKey: dateKeyFromDay(cameraEnd),
  });
}
