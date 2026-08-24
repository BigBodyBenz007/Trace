export const DAILY_ACTIONS_STORAGE_KEY = "dailyActions";
export const DAILY_ACTION_COLLECTION_SCHEMA_VERSION = 1;
export const DAILY_ACTION_SCHEMA_VERSION = 1;

export const DAILY_ACTION_TYPES = Object.freeze([
  { value: "meeting", label: "Meeting" },
  { value: "appointment", label: "Appointment" },
  { value: "errand", label: "Errand" },
  { value: "personal", label: "Personal plan / date" },
  { value: "medication", label: "Medication" },
  { value: "supplement", label: "Supplement / vitamin" },
  { value: "other", label: "Other" },
]);

export const DAILY_ACTION_SKIP_REASONS = Object.freeze([
  "Pain or discomfort",
  "Equipment unavailable",
  "Not enough time",
  "Low energy",
  "Schedule conflict",
]);

const ACTION_TYPES = new Set(DAILY_ACTION_TYPES.map(({ value }) => value));
const STATUSES = new Set(["scheduled", "completed", "skipped"]);
const SKIP_REASONS = new Set([...DAILY_ACTION_SKIP_REASONS, "Other"]);
const RECURRENCE_TYPES = new Set(["daily", "weekly"]);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return String(value ?? "").trim();
}

function validDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
}

function validTime(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  return Boolean(match) && Number(match[1]) < 24 && Number(match[2]) < 60;
}

function validTimestamp(value) {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function normalizeTimeWindow(value) {
  if (value === null || value === undefined) return null;
  if (!isObject(value) || !validTime(value.start) || !validTime(value.end)) return null;
  if (value.start >= value.end) return null;
  return { start: value.start, end: value.end };
}

function normalizeRecurrence(value) {
  if (value === null || value === undefined) return null;
  if (!isObject(value) || !RECURRENCE_TYPES.has(value.type)) return null;
  const until = value.until === null || value.until === undefined || value.until === ""
    ? null
    : value.until;
  if (until !== null && !validDate(until)) return null;
  if (value.type === "daily") return { type: "daily", until };
  if (!Array.isArray(value.weekdays) || value.weekdays.length === 0) return null;
  const weekdays = [...new Set(value.weekdays)];
  if (weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) return null;
  weekdays.sort((first, second) => first - second);
  return { type: "weekly", weekdays, until };
}

export function emptyDailyActionCollection() {
  return { schemaVersion: DAILY_ACTION_COLLECTION_SCHEMA_VERSION, actions: [] };
}

export function normalizeDailyAction(value) {
  if (
    !isObject(value)
    || value.schemaVersion !== DAILY_ACTION_SCHEMA_VERSION
    || !text(value.id)
    || !text(value.title)
    || !ACTION_TYPES.has(value.actionType)
    || !validDate(value.date)
    || !STATUSES.has(value.status)
    || !validTimestamp(value.createdAt)
    || !validTimestamp(value.updatedAt)
  ) return null;

  const time = value.time === null || value.time === undefined || value.time === ""
    ? null
    : value.time;
  if (time !== null && !validTime(time)) return null;
  const timeWindow = normalizeTimeWindow(value.timeWindow);
  if (value.timeWindow != null && !timeWindow) return null;
  if (time && timeWindow) return null;

  const durationMinutes = value.durationMinutes === null
    || value.durationMinutes === undefined
    || value.durationMinutes === ""
    ? null
    : Number(value.durationMinutes);
  if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes <= 0)) return null;

  const recurrence = normalizeRecurrence(value.recurrence);
  if (value.recurrence != null && !recurrence) return null;
  if (recurrence?.until && recurrence.until < value.date) return null;

  const completedAt = value.completedAt ?? null;
  const skippedAt = value.skippedAt ?? null;
  const skipReason = text(value.skipReason);
  const customSkipReason = text(value.customSkipReason);
  if (value.status === "scheduled" && (completedAt || skippedAt || skipReason || customSkipReason)) return null;
  if (value.status === "completed") {
    if (!validTimestamp(completedAt)) return null;
    const hasSkipProvenance = Boolean(skippedAt || skipReason || customSkipReason);
    if (hasSkipProvenance && !validTimestamp(skippedAt)) return null;
    if (skipReason && !SKIP_REASONS.has(skipReason)) return null;
    if (customSkipReason && skipReason !== "Other") return null;
  }
  if (value.status === "skipped") {
    if (!validTimestamp(skippedAt) || completedAt) return null;
    if (skipReason && !SKIP_REASONS.has(skipReason)) return null;
    if (customSkipReason && skipReason !== "Other") return null;
  }

  return {
    schemaVersion: DAILY_ACTION_SCHEMA_VERSION,
    id: text(value.id),
    title: text(value.title),
    actionType: value.actionType,
    date: value.date,
    time,
    timeWindow,
    durationMinutes,
    location: text(value.location),
    notes: text(value.notes),
    recurrence,
    status: value.status,
    completedAt,
    skippedAt,
    skipReason,
    customSkipReason,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function normalizeDailyActionCollection(value) {
  if (!isObject(value) || value.schemaVersion !== DAILY_ACTION_COLLECTION_SCHEMA_VERSION || !Array.isArray(value.actions)) {
    return null;
  }
  const ids = new Set();
  const actions = [];
  for (const action of value.actions) {
    const normalized = normalizeDailyAction(action);
    if (!normalized || ids.has(normalized.id)) return null;
    ids.add(normalized.id);
    actions.push(normalized);
  }
  return { schemaVersion: DAILY_ACTION_COLLECTION_SCHEMA_VERSION, actions };
}

export function getDailyActionError(draft) {
  if (!text(draft?.title)) return "Enter an action title.";
  if (!ACTION_TYPES.has(draft?.actionType)) return "Choose an action type.";
  if (!validDate(draft?.date)) return "Enter a valid action date.";
  if (draft?.time && !validTime(draft.time)) return "Enter a valid action time.";
  if (draft?.timeWindow && !normalizeTimeWindow(draft.timeWindow)) return "Enter a valid time window.";
  if (draft?.time && draft?.timeWindow) return "Choose either a time or a time window.";
  if (draft?.durationMinutes !== "" && draft?.durationMinutes != null) {
    const duration = Number(draft.durationMinutes);
    if (!Number.isInteger(duration) || duration <= 0) return "Enter a whole-number duration greater than zero.";
  }
  if (draft?.recurrence && !normalizeRecurrence(draft.recurrence)) return "Choose valid recurrence details.";
  return "";
}

function generatedId() {
  const value = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `daily-action:${value}`;
}

function timestampFromDate(value) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) return null;
  return value.toISOString();
}

function editableFields(draft) {
  return {
    title: text(draft.title),
    actionType: draft.actionType,
    date: draft.date,
    time: draft.time || null,
    timeWindow: draft.timeWindow ? normalizeTimeWindow(draft.timeWindow) : null,
    durationMinutes: draft.durationMinutes === "" || draft.durationMinutes == null
      ? null
      : Number(draft.durationMinutes),
    location: text(draft.location),
    notes: text(draft.notes),
    recurrence: draft.recurrence ? normalizeRecurrence(draft.recurrence) : null,
  };
}

export function createDailyAction(draft, { id = generatedId(), now = new Date() } = {}) {
  const timestamp = timestampFromDate(now);
  if (getDailyActionError(draft) || !timestamp) return null;
  return normalizeDailyAction({
    schemaVersion: DAILY_ACTION_SCHEMA_VERSION,
    id,
    ...editableFields(draft),
    status: "scheduled",
    completedAt: null,
    skippedAt: null,
    skipReason: "",
    customSkipReason: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function updateDailyAction(existing, draft, now = new Date()) {
  const current = normalizeDailyAction(existing);
  const timestamp = timestampFromDate(now);
  if (!current || getDailyActionError(draft) || !timestamp) return null;
  return normalizeDailyAction({
    ...current,
    ...editableFields(draft),
    updatedAt: timestamp,
  });
}

export function completeDailyAction(existing, now = new Date()) {
  const current = normalizeDailyAction(existing);
  const timestamp = timestampFromDate(now);
  if (!current || !timestamp) return null;
  return normalizeDailyAction({
    ...current,
    status: "completed",
    completedAt: timestamp,
    updatedAt: timestamp,
  });
}

export function skipDailyAction(existing, reason = "", customReason = "", now = new Date()) {
  const current = normalizeDailyAction(existing);
  const timestamp = timestampFromDate(now);
  const normalizedReason = text(reason);
  const normalizedCustom = text(customReason);
  if (!current || !timestamp || (normalizedReason && !SKIP_REASONS.has(normalizedReason))) return null;
  if (normalizedCustom && normalizedReason !== "Other") return null;
  return normalizeDailyAction({
    ...current,
    status: "skipped",
    completedAt: null,
    skippedAt: timestamp,
    skipReason: normalizedReason,
    customSkipReason: normalizedReason === "Other" ? normalizedCustom : "",
    updatedAt: timestamp,
  });
}

function localDateFromKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isDailyActionScheduledForDate(action, dateKey) {
  const normalized = normalizeDailyAction(action);
  if (!normalized || !validDate(dateKey) || dateKey < normalized.date) return false;
  if (!normalized.recurrence) return dateKey === normalized.date;
  if (normalized.recurrence.until && dateKey > normalized.recurrence.until) return false;
  if (normalized.recurrence.type === "daily") return true;
  const day = localDateFromKey(dateKey).getDay();
  const isoDay = day === 0 ? 7 : day;
  return normalized.recurrence.weekdays.includes(isoDay);
}

export function dailyActionsForDate(actions, dateKey) {
  return actions.filter((action) => isDailyActionScheduledForDate(action, dateKey));
}

export function readDailyActions(storage = localStorage) {
  const raw = storage.getItem(DAILY_ACTIONS_STORAGE_KEY);
  if (raw === null) return [];
  const collection = normalizeDailyActionCollection(JSON.parse(raw));
  if (!collection) throw new Error("Invalid daily action data.");
  return collection.actions;
}

export function writeDailyActions(storage = localStorage, actions) {
  const collection = normalizeDailyActionCollection({
    schemaVersion: DAILY_ACTION_COLLECTION_SCHEMA_VERSION,
    actions,
  });
  if (!collection) throw new Error("Invalid daily action data.");
  storage.setItem(DAILY_ACTIONS_STORAGE_KEY, JSON.stringify(collection));
  return collection.actions;
}
