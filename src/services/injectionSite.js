export const INJECTION_SITES_STORAGE_KEY = "injectionSiteEntries";
export const INJECTION_SITE_SETTINGS_STORAGE_KEY = "injectionSiteSettings";
export const INJECTION_SITE_COLLECTION_SCHEMA_VERSION = 2;
export const INJECTION_SESSION_SCHEMA_VERSION = 1;
export const INJECTION_SHOT_SCHEMA_VERSION = 1;
export const INJECTION_SITE_SETTINGS_SCHEMA_VERSION = 1;

export const BODY_STYLE_OPTIONS = Object.freeze([
  { id: "feminine-average", label: "Feminine — Average" },
  { id: "feminine-fuller", label: "Feminine — Fuller" },
  { id: "masculine-average", label: "Masculine — Average" },
  { id: "masculine-fuller", label: "Masculine — Fuller" },
  { id: "neutral-average", label: "Neutral — Average" },
]);
export const DEFAULT_BODY_STYLE_ID = "neutral-average";

const BODY_STYLE_IDS = new Set(BODY_STYLE_OPTIONS.map(({ id }) => id));
const VIEWS = new Set(["front", "back"]);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return String(value ?? "").trim();
}

function optionalText(value) {
  const normalized = text(value);
  return normalized || null;
}

function validTimestamp(value) {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function validCoordinate(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function validAmount(value) {
  return value === null || value === undefined || value === ""
    || (Number.isFinite(Number(value)) && Number(value) > 0);
}

export function createInjectionId(prefix) {
  const value = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${value}`;
}

export function emptyInjectionSiteCollection() {
  return { schemaVersion: INJECTION_SITE_COLLECTION_SCHEMA_VERSION, sessions: [], shots: [] };
}

export function defaultInjectionSiteSettings() {
  return { schemaVersion: INJECTION_SITE_SETTINGS_SCHEMA_VERSION, bodyStyleId: DEFAULT_BODY_STYLE_ID };
}

export function normalizeInjectionSiteSettings(value) {
  if (!isObject(value) || value.schemaVersion !== INJECTION_SITE_SETTINGS_SCHEMA_VERSION) return null;
  if (!BODY_STYLE_IDS.has(value.bodyStyleId)) return null;
  return { schemaVersion: INJECTION_SITE_SETTINGS_SCHEMA_VERSION, bodyStyleId: value.bodyStyleId };
}

export function readInjectionSiteSettings(storage = localStorage) {
  const raw = storage.getItem(INJECTION_SITE_SETTINGS_STORAGE_KEY);
  if (raw === null) return defaultInjectionSiteSettings();
  const settings = normalizeInjectionSiteSettings(JSON.parse(raw));
  if (!settings) throw new Error("Invalid injection site settings.");
  return settings;
}

export function writeInjectionSiteSettings(storage = localStorage, settings) {
  const normalized = normalizeInjectionSiteSettings(settings);
  if (!normalized) throw new Error("Invalid injection site settings.");
  storage.setItem(INJECTION_SITE_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function normalizeInjectionSession(value) {
  if (
    !isObject(value)
    || value.schemaVersion !== INJECTION_SESSION_SCHEMA_VERSION
    || !text(value.id)
    || !validTimestamp(value.occurredAt)
    || !validTimestamp(value.createdAt)
    || !validTimestamp(value.updatedAt)
  ) return null;
  return {
    schemaVersion: INJECTION_SESSION_SCHEMA_VERSION,
    id: text(value.id),
    occurredAt: new Date(value.occurredAt).toISOString(),
    createdAt: new Date(value.createdAt).toISOString(),
    updatedAt: new Date(value.updatedAt).toISOString(),
  };
}

export function normalizeInjectionShot(value) {
  if (
    !isObject(value)
    || value.schemaVersion !== INJECTION_SHOT_SCHEMA_VERSION
    || !text(value.id)
    || !text(value.sessionId)
    || !VIEWS.has(value.view)
    || !validCoordinate(value.x)
    || !validCoordinate(value.y)
    || !text(value.siteLabel)
    || !text(value.substanceName)
    || !validAmount(value.amount)
    || !validTimestamp(value.createdAt)
    || !validTimestamp(value.updatedAt)
  ) return null;
  const protocolId = optionalText(value.protocolId);
  const amount = value.amount === null || value.amount === undefined || value.amount === "" ? null : Number(value.amount);
  return {
    schemaVersion: INJECTION_SHOT_SCHEMA_VERSION,
    id: text(value.id),
    sessionId: text(value.sessionId),
    view: value.view,
    x: value.x,
    y: value.y,
    siteLabel: text(value.siteLabel),
    substanceName: text(value.substanceName),
    protocolId,
    protocolName: protocolId ? optionalText(value.protocolName) : null,
    protocolItemId: protocolId ? optionalText(value.protocolItemId) : null,
    amount,
    unit: amount === null ? null : optionalText(value.unit),
    notes: text(value.notes),
    createdAt: new Date(value.createdAt).toISOString(),
    updatedAt: new Date(value.updatedAt).toISOString(),
  };
}

function protocolDoseUnit(item) {
  if (!item?.dose) return null;
  return item.dose.unit === "custom" ? optionalText(item.dose.customUnit) : optionalText(item.dose.unit);
}

function migratePhaseOneCollection(value, protocols) {
  if (!isObject(value) || value.schemaVersion !== 1 || !Array.isArray(value.entries)) return null;
  const sessions = [];
  const shots = [];
  const ids = new Set();
  for (const entry of value.entries) {
    if (
      !isObject(entry) || entry.schemaVersion !== 1 || !text(entry.id) || ids.has(text(entry.id))
      || !text(entry.protocolId) || !VIEWS.has(entry.view) || !validCoordinate(entry.x) || !validCoordinate(entry.y)
      || !text(entry.siteLabel) || !validTimestamp(entry.occurredAt)
      || !validTimestamp(entry.createdAt) || !validTimestamp(entry.updatedAt)
    ) return null;
    ids.add(text(entry.id));
    const protocol = protocols.find(({ id }) => id === entry.protocolId);
    const onlyItem = protocol?.items?.length === 1 ? protocol.items[0] : null;
    const sessionId = `injection-session:migrated:${encodeURIComponent(text(entry.id))}`;
    sessions.push({
      schemaVersion: INJECTION_SESSION_SCHEMA_VERSION,
      id: sessionId,
      occurredAt: new Date(entry.occurredAt).toISOString(),
      createdAt: new Date(entry.createdAt).toISOString(),
      updatedAt: new Date(entry.updatedAt).toISOString(),
    });
    shots.push({
      schemaVersion: INJECTION_SHOT_SCHEMA_VERSION,
      id: `injection-shot:migrated:${encodeURIComponent(text(entry.id))}`,
      sessionId,
      view: entry.view,
      x: entry.x,
      y: entry.y,
      siteLabel: text(entry.siteLabel),
      substanceName: text(onlyItem?.compound?.name) || text(entry.protocolName) || text(protocol?.name) || "Migrated injection",
      protocolId: text(entry.protocolId),
      protocolName: text(entry.protocolName) || text(protocol?.name) || null,
      protocolItemId: onlyItem?.id || null,
      amount: onlyItem?.dose?.amount ?? null,
      unit: protocolDoseUnit(onlyItem),
      notes: text(entry.notes),
      createdAt: new Date(entry.createdAt).toISOString(),
      updatedAt: new Date(entry.updatedAt).toISOString(),
    });
  }
  return { schemaVersion: INJECTION_SITE_COLLECTION_SCHEMA_VERSION, sessions, shots };
}

export function normalizeInjectionSiteCollection(value, protocols = []) {
  if (value?.schemaVersion === 1) return migratePhaseOneCollection(value, Array.isArray(protocols) ? protocols : []);
  if (
    !isObject(value)
    || value.schemaVersion !== INJECTION_SITE_COLLECTION_SCHEMA_VERSION
    || !Array.isArray(value.sessions)
    || !Array.isArray(value.shots)
  ) return null;
  const sessionIds = new Set();
  const shotIds = new Set();
  const sessions = [];
  const shots = [];
  for (const valueSession of value.sessions) {
    const session = normalizeInjectionSession(valueSession);
    if (!session || sessionIds.has(session.id)) return null;
    sessionIds.add(session.id);
    sessions.push(session);
  }
  for (const valueShot of value.shots) {
    const shot = normalizeInjectionShot(valueShot);
    if (!shot || shotIds.has(shot.id) || !sessionIds.has(shot.sessionId)) return null;
    shotIds.add(shot.id);
    shots.push(shot);
  }
  if (sessions.some(({ id }) => !shots.some(({ sessionId }) => sessionId === id))) return null;
  return { schemaVersion: INJECTION_SITE_COLLECTION_SCHEMA_VERSION, sessions, shots };
}

export function shotDraftError(draft) {
  if (!VIEWS.has(draft?.view) || !validCoordinate(draft?.x) || !validCoordinate(draft?.y)) {
    return "Tap the front or back body map to choose an injection site.";
  }
  if (!text(draft?.siteLabel)) return "The selected site needs a readable label.";
  if (!text(draft?.substanceName)) return "Enter what you injected.";
  if (!validAmount(draft?.amount)) return "Enter an amount greater than zero or leave it blank.";
  if (draft?.amount !== null && draft?.amount !== undefined && draft?.amount !== "" && !text(draft?.unit)) {
    return "Enter a unit for the amount.";
  }
  return "";
}

export function createInjectionSession(draft, { now = new Date(), sessionId = null, shotIds = [] } = {}) {
  if (!validTimestamp(draft?.occurredAt) || !Array.isArray(draft?.shots) || draft.shots.length === 0) return null;
  if (!(now instanceof Date) || Number.isNaN(now.getTime()) || draft.shots.some(shotDraftError)) return null;
  const timestamp = now.toISOString();
  const id = sessionId || createInjectionId("injection-session");
  const session = normalizeInjectionSession({
    schemaVersion: INJECTION_SESSION_SCHEMA_VERSION,
    id,
    occurredAt: draft.occurredAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const shots = draft.shots.map((shot, index) => normalizeInjectionShot({
    schemaVersion: INJECTION_SHOT_SCHEMA_VERSION,
    ...shot,
    id: shotIds[index] || shot.id || createInjectionId("injection-shot"),
    sessionId: id,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
  if (!session || shots.some((shot) => !shot) || new Set(shots.map(({ id: shotId }) => shotId)).size !== shots.length) return null;
  return { session, shots };
}

export function appendInjectionSession(data, created) {
  const normalized = normalizeInjectionSiteCollection(data);
  if (!normalized || !created?.session || !Array.isArray(created.shots)) return null;
  return normalizeInjectionSiteCollection({
    schemaVersion: INJECTION_SITE_COLLECTION_SCHEMA_VERSION,
    sessions: [...normalized.sessions, created.session],
    shots: [...normalized.shots, ...created.shots],
  });
}

export function updateInjectionShotData(data, shotId, draft, occurredAt, now = new Date()) {
  const normalized = normalizeInjectionSiteCollection(data);
  const existing = normalized?.shots.find(({ id }) => id === shotId);
  if (!normalized || !existing || shotDraftError(draft) || !validTimestamp(occurredAt) || !(now instanceof Date) || Number.isNaN(now.getTime())) return null;
  const timestamp = now.toISOString();
  return normalizeInjectionSiteCollection({
    schemaVersion: INJECTION_SITE_COLLECTION_SCHEMA_VERSION,
    sessions: normalized.sessions.map((session) => session.id === existing.sessionId
      ? { ...session, occurredAt, updatedAt: timestamp }
      : session),
    shots: normalized.shots.map((shot) => shot.id === shotId
      ? { ...shot, ...draft, id: shot.id, sessionId: shot.sessionId, createdAt: shot.createdAt, updatedAt: timestamp }
      : shot),
  });
}

export function deleteInjectionShotData(data, shotId) {
  const normalized = normalizeInjectionSiteCollection(data);
  const existing = normalized?.shots.find(({ id }) => id === shotId);
  if (!normalized || !existing) return null;
  const shots = normalized.shots.filter(({ id }) => id !== shotId);
  const sessions = shots.some(({ sessionId }) => sessionId === existing.sessionId)
    ? normalized.sessions
    : normalized.sessions.filter(({ id }) => id !== existing.sessionId);
  return normalizeInjectionSiteCollection({ schemaVersion: INJECTION_SITE_COLLECTION_SCHEMA_VERSION, sessions, shots });
}

export function injectionHistory(data) {
  const normalized = normalizeInjectionSiteCollection(data);
  if (!normalized) return [];
  const sessions = new Map(normalized.sessions.map((session) => [session.id, session]));
  return normalized.shots
    .map((shot) => ({ ...shot, occurredAt: sessions.get(shot.sessionId)?.occurredAt || null }))
    .filter(({ occurredAt }) => occurredAt)
    .sort((first, second) => new Date(second.occurredAt) - new Date(first.occurredAt));
}

export function readInjectionSiteData(storage = localStorage, protocols = []) {
  const raw = storage.getItem(INJECTION_SITES_STORAGE_KEY);
  if (raw === null) return emptyInjectionSiteCollection();
  const parsed = JSON.parse(raw);
  const collection = normalizeInjectionSiteCollection(parsed, protocols);
  if (!collection) throw new Error("Invalid injection site data.");
  if (parsed.schemaVersion !== INJECTION_SITE_COLLECTION_SCHEMA_VERSION) {
    try { storage.setItem(INJECTION_SITES_STORAGE_KEY, JSON.stringify(collection)); } catch (error) { /* Keep readable legacy data intact. */ }
  }
  return collection;
}

export function writeInjectionSiteData(storage = localStorage, data) {
  const collection = normalizeInjectionSiteCollection(data);
  if (!collection) throw new Error("Invalid injection site data.");
  storage.setItem(INJECTION_SITES_STORAGE_KEY, JSON.stringify(collection));
  return collection;
}

export function localDateTimeParts(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
}

export function localDateTimeToIso(dateValue, timeValue) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ""));
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(String(timeValue || ""));
  if (!dateMatch || !timeMatch) return null;
  const [, year, month, day] = dateMatch.map(Number);
  const [, hour, minute] = timeMatch.map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day
    || date.getHours() !== hour || date.getMinutes() !== minute
  ) return null;
  return date.toISOString();
}

export function deriveInjectionSiteLabel(view, x, y) {
  if (!VIEWS.has(view) || !validCoordinate(x) || !validCoordinate(y)) return "";
  const side = view === "front" ? (x < 0.5 ? "Right" : "Left") : (x < 0.5 ? "Left" : "Right");
  const outer = x < 0.38 || x > 0.62;
  const back = view === "back" ? " (Back)" : "";
  if (y < 0.13) return `Head${back}`;
  if (y < 0.19) return `Neck${back}`;
  if (y < 0.33) return outer ? `${side} Upper Arm${back}` : `${side} ${view === "back" ? "Upper Back" : "Chest"}`;
  if (y < 0.49) return outer ? `${side} Forearm${back}` : `${side} ${view === "back" ? "Lower Back" : "Abdomen"}`;
  if (y < 0.61) return `${side} ${view === "back" ? "Glute" : "Hip"}`;
  if (y < 0.79) return `${side} Thigh (${outer ? "Outer" : "Inner"})${back}`;
  if (y < 0.88) return `${side} Knee${back}`;
  if (y < 0.97) return `${side} Lower Leg${back}`;
  return `${side} Foot${back}`;
}

function localDaySerial(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
}

export function injectionSiteRecency(occurredAt, now = new Date()) {
  const occurredDay = localDaySerial(occurredAt);
  const today = localDaySerial(now);
  if (occurredDay === null || today === null) return null;
  const days = today - occurredDay;
  if (days === 0) return "today";
  if (days >= 1 && days <= 7) return "week";
  if (days >= 8 && days <= 30) return "month";
  return null;
}
