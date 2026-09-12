import { parseDateOnlyLocal } from "./dateOnly";

export const TIME_CAPSULE_SCHEMA_VERSION = 1;
export const TIME_CAPSULE_STORAGE_KEY = "timeCapsules";
export const TIME_CAPSULE_DRAFT_STORAGE_KEY = "timeCapsuleDraft";
export const TIME_CAPSULE_REMINDER_STORAGE_KEY = "timeCapsuleReminders";

export const TIME_CAPSULE_STATE = Object.freeze({
  DRAFT: "draft",
  SEALED: "sealed",
  AVAILABLE: "available",
  OPENED: "opened",
});

export const TIME_CAPSULE_REMINDER_STATE = Object.freeze({
  PENDING: "pending",
  POSTPONED: "postponed",
  ACKNOWLEDGED: "acknowledged",
});

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" && Boolean(value.trim());
}

export function isLocalDate(value) {
  return typeof value === "string" && Boolean(parseDateOnlyLocal(value));
}

export function localDateKey(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function addCalendarYears(dateKey, years) {
  const date = parseDateOnlyLocal(dateKey);
  if (!date || !Number.isInteger(years)) return "";
  const month = date.getMonth();
  const day = date.getDate();
  const result = new Date(date.getFullYear() + years, month, day);
  if (result.getMonth() !== month) result.setDate(0);
  return localDateKey(result);
}

export function addCalendarDays(dateKey, days) {
  const date = parseDateOnlyLocal(dateKey);
  if (!date || !Number.isInteger(days)) return "";
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function millisecondsUntilNextLocalMidnight(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 25);
  return Math.max(25, next.getTime() - now.getTime());
}

function timestamp(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function normalizeSealCycle(value) {
  if (!object(value) || !Number.isSafeInteger(value.number) || value.number < 1 || !timestamp(value.sealedAt)) return null;
  return { number: value.number, sealedAt: value.sealedAt };
}

function normalizeOpeningHistory(values) {
  if (!Array.isArray(values)) return null;
  const history = values.map((entry) => {
    if (!object(entry) || !Number.isSafeInteger(entry.cycle) || entry.cycle < 1 ||
      !isLocalDate(entry.openOn) || !timestamp(entry.openedAt)) return null;
    return { cycle: entry.cycle, openOn: entry.openOn, openedAt: entry.openedAt };
  });
  if (history.some((entry) => !entry)) return null;
  if (history.some((entry, index) => entry.cycle !== index + 1)) return null;
  return history;
}

export function normalizeCapsuleMediaReference(value) {
  if (!object(value) || !text(value.id) || !["photo", "audio", "video"].includes(value.kind)) return null;
  if (!text(value.name) || !text(value.mimeType) || !Number.isSafeInteger(value.bytes) || value.bytes < 0) return null;
  if (value.durationMs !== undefined && (!Number.isFinite(value.durationMs) || value.durationMs < 0)) return null;
  const result = {
    id: value.id.trim(),
    kind: value.kind,
    name: value.name,
    mimeType: value.mimeType.toLowerCase(),
    bytes: value.bytes,
  };
  if (value.durationMs !== undefined) result.durationMs = value.durationMs;
  ["originalBytes", "storedBytes", "width", "height"].forEach((field) => {
    if (Number.isFinite(value[field]) && value[field] >= 0) result[field] = value[field];
  });
  ["optimized", "converted"].forEach((field) => {
    if (typeof value[field] === "boolean") result[field] = value[field];
  });
  return result;
}

function normalizeMediaList(values) {
  if (!Array.isArray(values)) return null;
  const media = values.map(normalizeCapsuleMediaReference);
  if (media.some((item) => !item) || new Set(media.map(({ id }) => id)).size !== media.length) return null;
  if (media.filter(({ kind }) => kind === "photo").length > 12 ||
    media.filter(({ kind }) => kind === "audio").length > 3 ||
    media.filter(({ kind }) => kind === "video").length > 1) return null;
  if (media.some((item) => !item.mimeType.startsWith(`${item.kind === "photo" ? "image" : item.kind}/`))) return null;
  if (media.some((item) => item.kind === "photo" && item.bytes > 10 * 1024 * 1024)) return null;
  if (media.filter(({ kind }) => kind === "photo").reduce((sum, item) => sum + item.bytes, 0) > 48 * 1024 * 1024) return null;
  if (media.some((item) => item.kind === "audio" && item.bytes > 20 * 1024 * 1024)) return null;
  if (media.some((item) => item.kind === "video" && item.bytes > 75 * 1024 * 1024)) return null;
  if (media.reduce((sum, item) => sum + item.bytes, 0) > 100 * 1024 * 1024) return null;
  return media;
}

export function normalizeTimeCapsule(value) {
  if (!object(value) || value.schemaVersion !== TIME_CAPSULE_SCHEMA_VERSION || !text(value.id) || !text(value.name)) return null;
  if (typeof value.text !== "string" || !isLocalDate(value.openOn) || !timestamp(value.createdAt) ||
    !timestamp(value.updatedAt) || !timestamp(value.sealedAt) ||
    (value.openedAt !== null && !timestamp(value.openedAt))) return null;
  const media = normalizeMediaList(value.media);
  if (!media || (!value.text.trim() && media.length === 0)) return null;
  const legacyLifecycle = value.sealCycle === undefined && value.openingHistory === undefined;
  if (!legacyLifecycle && (value.sealCycle === undefined || value.openingHistory === undefined)) return null;
  const sealCycle = legacyLifecycle
    ? { number: 1, sealedAt: value.sealedAt }
    : normalizeSealCycle(value.sealCycle);
  const openingHistory = legacyLifecycle
    ? (value.openedAt ? [{ cycle: 1, openOn: value.openOn, openedAt: value.openedAt }] : [])
    : normalizeOpeningHistory(value.openingHistory);
  if (!sealCycle || !openingHistory) return null;
  if (sealCycle.number === 1 && sealCycle.sealedAt !== value.sealedAt) return null;
  const expectedHistoryLength = value.openedAt ? sealCycle.number : sealCycle.number - 1;
  if (openingHistory.length !== expectedHistoryLength) return null;
  const latestOpening = openingHistory[openingHistory.length - 1];
  if (value.openedAt && (!latestOpening || latestOpening.cycle !== sealCycle.number ||
    latestOpening.openOn !== value.openOn || latestOpening.openedAt !== value.openedAt)) return null;
  return {
    schemaVersion: TIME_CAPSULE_SCHEMA_VERSION,
    id: value.id.trim(),
    name: value.name.trim(),
    text: value.text,
    openOn: value.openOn,
    media,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    sealedAt: value.sealedAt,
    openedAt: value.openedAt,
    sealCycle,
    openingHistory,
  };
}

export function normalizeTimeCapsuleDraft(value) {
  if (!object(value) || value.schemaVersion !== TIME_CAPSULE_SCHEMA_VERSION || !text(value.id) || !text(value.capsuleId)) return null;
  if (!object(value.form) || typeof value.form.name !== "string" || typeof value.form.text !== "string" ||
    (value.form.openOn !== "" && !isLocalDate(value.form.openOn)) || !timestamp(value.createdAt) || !timestamp(value.updatedAt)) return null;
  const media = normalizeMediaList(value.media);
  if (!media) return null;
  const pendingRecording = value.pendingRecording == null
    ? null : normalizeCapsuleMediaReference(value.pendingRecording);
  if (value.pendingRecording != null && (!pendingRecording || pendingRecording.kind !== "audio" ||
    pendingRecording.bytes <= 0 || !Number.isFinite(pendingRecording.durationMs) || pendingRecording.durationMs <= 0 ||
    !normalizeMediaList([...media, pendingRecording]))) return null;
  return {
    schemaVersion: TIME_CAPSULE_SCHEMA_VERSION,
    id: value.id.trim(),
    capsuleId: value.capsuleId.trim(),
    form: { name: value.form.name, text: value.form.text, openOn: value.form.openOn },
    media,
    // Omit absent pending takes so existing draft/backup payloads stay unchanged.
    ...(pendingRecording ? { pendingRecording } : {}),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function createTimeCapsuleDraft({ id, capsuleId, form, media = [], pendingRecording, createdAt }, now = new Date()) {
  const updatedAt = now.toISOString();
  return normalizeTimeCapsuleDraft({
    schemaVersion: TIME_CAPSULE_SCHEMA_VERSION,
    id,
    capsuleId,
    form,
    media,
    pendingRecording,
    createdAt: createdAt || updatedAt,
    updatedAt,
  });
}

export function timeCapsuleDraftMedia(draft) {
  return [...(draft?.media || []), ...(draft?.pendingRecording ? [draft.pendingRecording] : [])];
}

export function timeCapsuleDraftHasMeaningfulWork(value) {
  const draft = normalizeTimeCapsuleDraft(value);
  return Boolean(draft && (draft.form.name.trim() || draft.form.text.trim() || timeCapsuleDraftMedia(draft).length));
}

export function createSealedTimeCapsule(draft, now = new Date()) {
  const normalized = normalizeTimeCapsuleDraft(draft);
  if (!normalized) return { error: "This Time Capsule draft is invalid." };
  if (normalized.pendingRecording) return { error: "Keep or discard the pending recording before sealing this Time Capsule." };
  if (!normalized.form.name.trim()) return { error: "Give this Time Capsule a visible name." };
  if (!normalized.form.text.trim() && normalized.media.length === 0) return { error: "Add private text or at least one attachment before sealing." };
  if (!isLocalDate(normalized.form.openOn) || normalized.form.openOn < localDateKey(now)) {
    return { error: "Choose today or a future opening date." };
  }
  const timestampValue = now.toISOString();
  const value = normalizeTimeCapsule({
    schemaVersion: TIME_CAPSULE_SCHEMA_VERSION,
    id: normalized.capsuleId,
    name: normalized.form.name,
    text: normalized.form.text,
    openOn: normalized.form.openOn,
    media: normalized.media,
    createdAt: normalized.createdAt,
    updatedAt: timestampValue,
    sealedAt: timestampValue,
    openedAt: null,
    sealCycle: { number: 1, sealedAt: timestampValue },
    openingHistory: [],
  });
  return value ? { value } : { error: "Trace could not prepare this Time Capsule." };
}

export function recordTimeCapsuleOpening(capsule, now = new Date()) {
  const normalized = normalizeTimeCapsule(capsule);
  if (!normalized) return { error: "This Time Capsule is invalid." };
  if (normalized.openedAt) return { value: normalized };
  if (timeCapsuleState(normalized, localDateKey(now)) === TIME_CAPSULE_STATE.SEALED) {
    return { error: "This Time Capsule is still sealed." };
  }
  const openedAt = now.toISOString();
  const value = normalizeTimeCapsule({
    ...normalized,
    openedAt,
    updatedAt: openedAt,
    openingHistory: [
      ...normalized.openingHistory,
      { cycle: normalized.sealCycle.number, openOn: normalized.openOn, openedAt },
    ],
  });
  return value ? { value } : { error: "Trace could not record this Time Capsule opening." };
}

export function resealOpenedTimeCapsule(capsule, openOn, now = new Date(), expectedCycle = null) {
  const normalized = normalizeTimeCapsule(capsule);
  if (!normalized || !normalized.openedAt) return { error: "Only an opened Time Capsule can be sealed again." };
  if (expectedCycle !== null && expectedCycle !== normalized.sealCycle.number) {
    return { error: "This Time Capsule changed before it could be sealed again. Review it and retry." };
  }
  if (!isLocalDate(openOn) || openOn <= localDateKey(now)) {
    return { error: "Choose a future date to seal this Time Capsule again." };
  }
  const sealedAt = now.toISOString();
  const value = normalizeTimeCapsule({
    ...normalized,
    openOn,
    openedAt: null,
    updatedAt: sealedAt,
    sealCycle: { number: normalized.sealCycle.number + 1, sealedAt },
  });
  return value ? { value } : { error: "Trace could not prepare this Time Capsule for another opening." };
}

export function timeCapsuleState(capsule, today = localDateKey()) {
  const normalized = normalizeTimeCapsule(capsule);
  if (!normalized) return null;
  if (normalized.openedAt) return TIME_CAPSULE_STATE.OPENED;
  return today >= normalized.openOn ? TIME_CAPSULE_STATE.AVAILABLE : TIME_CAPSULE_STATE.SEALED;
}

function collectionReport(storage, key, normalize, label) {
  const raw = storage.getItem(key);
  if (raw === null) return { status: "ok", records: [], raw: null };
  try {
    const values = JSON.parse(raw);
    if (!Array.isArray(values)) throw new Error();
    const records = values.map(normalize);
    if (records.some((record) => !record) || new Set(records.map(({ id, capsuleId }) => id || capsuleId)).size !== records.length) throw new Error();
    return { status: "ok", records, raw };
  } catch (error) {
    return { status: "blocked", records: [], raw, message: `Trace could not read saved ${label}. The original stored data was left unchanged.` };
  }
}

export function readTimeCapsules(storage = localStorage) {
  const report = collectionReport(storage, TIME_CAPSULE_STORAGE_KEY, normalizeTimeCapsule, "Time Capsules");
  if (report.status !== "ok") return report;
  const mediaIds = report.records.flatMap((capsule) => capsule.media.map(({ id }) => id));
  if (new Set(mediaIds).size !== mediaIds.length) {
    return {
      status: "blocked",
      records: [],
      raw: report.raw,
      message: "Trace could not read saved Time Capsules because an attachment is referenced more than once. The original stored data was left unchanged.",
    };
  }
  return report;
}

export function writeTimeCapsules(storage = localStorage, records) {
  const normalized = Array.isArray(records) ? records.map(normalizeTimeCapsule) : [];
  const mediaIds = normalized.flatMap((capsule) => capsule?.media?.map(({ id }) => id) || []);
  if (!Array.isArray(records) || normalized.some((record) => !record) ||
    new Set(normalized.map(({ id }) => id)).size !== normalized.length ||
    new Set(mediaIds).size !== mediaIds.length) {
    throw new Error("The Time Capsule collection is invalid.");
  }
  storage.setItem(TIME_CAPSULE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function readTimeCapsuleDraft(storage = localStorage) {
  const raw = storage.getItem(TIME_CAPSULE_DRAFT_STORAGE_KEY);
  if (raw === null) return { status: "ok", draft: null, raw: null };
  try {
    const draft = normalizeTimeCapsuleDraft(JSON.parse(raw));
    if (!draft) throw new Error();
    return { status: "ok", draft, raw };
  } catch (error) {
    return { status: "blocked", draft: null, raw, message: "Trace could not read the unfinished Time Capsule draft. The original stored data was left unchanged." };
  }
}

export function writeTimeCapsuleDraft(storage = localStorage, draft) {
  const normalized = normalizeTimeCapsuleDraft(draft);
  if (!normalized) throw new Error("The unfinished Time Capsule draft is invalid.");
  storage.setItem(TIME_CAPSULE_DRAFT_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearTimeCapsuleDraft(storage = localStorage) {
  storage.removeItem(TIME_CAPSULE_DRAFT_STORAGE_KEY);
}

export function normalizeTimeCapsuleReminder(value) {
  if (!object(value) || value.schemaVersion !== TIME_CAPSULE_SCHEMA_VERSION || !text(value.capsuleId) ||
    !Object.values(TIME_CAPSULE_REMINDER_STATE).includes(value.state) || !timestamp(value.updatedAt)) return null;
  if (value.state === TIME_CAPSULE_REMINDER_STATE.POSTPONED) {
    if (!isLocalDate(value.remindOn)) return null;
  } else if (value.remindOn !== null) return null;
  return {
    schemaVersion: TIME_CAPSULE_SCHEMA_VERSION,
    capsuleId: value.capsuleId.trim(),
    state: value.state,
    remindOn: value.remindOn,
    updatedAt: value.updatedAt,
  };
}

export function readTimeCapsuleReminders(storage = localStorage) {
  return collectionReport(storage, TIME_CAPSULE_REMINDER_STORAGE_KEY, normalizeTimeCapsuleReminder, "Time Capsule reminders");
}

export function writeTimeCapsuleReminders(storage = localStorage, reminders) {
  const normalized = Array.isArray(reminders) ? reminders.map(normalizeTimeCapsuleReminder) : [];
  if (!Array.isArray(reminders) || normalized.some((item) => !item) || new Set(normalized.map(({ capsuleId }) => capsuleId)).size !== normalized.length) {
    throw new Error("The Time Capsule reminder collection is invalid.");
  }
  storage.setItem(TIME_CAPSULE_REMINDER_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function pendingTimeCapsuleReminder(capsules, reminders, today = localDateKey()) {
  const byCapsule = new Map(reminders.map((reminder) => [reminder.capsuleId, reminder]));
  return capsules
    .filter((capsule) => timeCapsuleState(capsule, today) === TIME_CAPSULE_STATE.AVAILABLE)
    .filter((capsule) => {
      const reminder = byCapsule.get(capsule.id);
      return !reminder || reminder.state === TIME_CAPSULE_REMINDER_STATE.PENDING ||
        (reminder.state === TIME_CAPSULE_REMINDER_STATE.POSTPONED && reminder.remindOn <= today);
    })
    .sort((a, b) => a.openOn.localeCompare(b.openOn) || a.sealedAt.localeCompare(b.sealedAt) || a.id.localeCompare(b.id))[0] || null;
}

export function reminderFor(capsuleId, state, remindOn = null, now = new Date()) {
  return normalizeTimeCapsuleReminder({ schemaVersion: 1, capsuleId, state, remindOn, updatedAt: now.toISOString() });
}
