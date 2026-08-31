export const WATER_STORAGE_KEY = "waterEntries";
export const WATER_SCHEMA_VERSION = 1;
export const ML_PER_FLUID_OUNCE = 29.5735295625;

export const WATER_UNITS = Object.freeze({
  OUNCES: "oz",
  MILLILITERS: "mL",
});

export function emptyWaterCollection() {
  return { schemaVersion: WATER_SCHEMA_VERSION, entries: [] };
}

function normalizedAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Number(amount.toFixed(6));
}

export function normalizeWaterEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = String(value.id || "").trim();
  const amountMl = normalizedAmount(value.amountMl);
  const loggedAt = new Date(value.loggedAt);
  if (!id || amountMl === null || Number.isNaN(loggedAt.getTime())) return null;
  return { id, amountMl, loggedAt: loggedAt.toISOString() };
}

export function normalizeWaterCollection(value) {
  if (Array.isArray(value)) value = { schemaVersion: 0, entries: value };
  if (!value || typeof value !== "object" || !Array.isArray(value.entries)) return null;

  const ids = new Set();
  const entries = value.entries.reduce((validEntries, candidate) => {
    const entry = normalizeWaterEntry(candidate);
    if (!entry || ids.has(entry.id)) return validEntries;
    ids.add(entry.id);
    validEntries.push(entry);
    return validEntries;
  }, []);

  return { schemaVersion: WATER_SCHEMA_VERSION, entries };
}

export function readWaterEntries(storage = localStorage) {
  try {
    const raw = storage.getItem(WATER_STORAGE_KEY);
    if (raw === null) return emptyWaterCollection();
    return normalizeWaterCollection(JSON.parse(raw)) || emptyWaterCollection();
  } catch (error) {
    return emptyWaterCollection();
  }
}

export function writeWaterEntries(storage, value) {
  const normalized = normalizeWaterCollection(value);
  if (!normalized) throw new Error("Invalid water entry collection.");
  storage.setItem(WATER_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function waterAmountToMilliliters(value, unit) {
  const amount = normalizedAmount(value);
  if (amount === null) return null;
  if (unit === WATER_UNITS.MILLILITERS) return amount;
  if (unit === WATER_UNITS.OUNCES) {
    return Number((amount * ML_PER_FLUID_OUNCE).toFixed(6));
  }
  return null;
}

export function millilitersToWaterAmount(value, unit) {
  const amountMl = Number(value);
  if (!Number.isFinite(amountMl) || amountMl < 0) return 0;
  return unit === WATER_UNITS.OUNCES ? amountMl / ML_PER_FLUID_OUNCE : amountMl;
}

export function formatWaterAmount(value, unit) {
  const displayed = millilitersToWaterAmount(value, unit);
  const rounded = unit === WATER_UNITS.OUNCES
    ? Number(displayed.toFixed(1))
    : Math.round(displayed);
  return `${rounded.toLocaleString()} ${unit}`;
}

function localDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function rollingDateKeys(now, days) {
  const keys = new Set();
  for (let daysAgo = 0; daysAgo < days; daysAgo += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    date.setDate(date.getDate() - daysAgo);
    keys.add(localDateKey(date));
  }
  return keys;
}

export function calculateWaterSummary(entries, now = new Date()) {
  const todayKey = localDateKey(now);
  const sevenDayKeys = rollingDateKeys(now, 7);
  const thirtyDayKeys = rollingDateKeys(now, 30);
  let todayMl = 0;
  let sevenDayTotalMl = 0;
  let thirtyDayTotalMl = 0;

  entries.forEach((candidate) => {
    const entry = normalizeWaterEntry(candidate);
    if (!entry) return;
    const key = localDateKey(entry.loggedAt);
    if (key === todayKey) todayMl += entry.amountMl;
    if (sevenDayKeys.has(key)) sevenDayTotalMl += entry.amountMl;
    if (thirtyDayKeys.has(key)) thirtyDayTotalMl += entry.amountMl;
  });

  return {
    todayMl,
    sevenDayAverageMl: sevenDayTotalMl / 7,
    thirtyDayAverageMl: thirtyDayTotalMl / 30,
  };
}
