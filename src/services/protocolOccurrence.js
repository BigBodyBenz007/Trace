import { isValidLocalDate } from "./protocol";

export const PROTOCOL_OCCURRENCES_STORAGE_KEY = "protocolOccurrences";
export const PROTOCOL_OCCURRENCE_COLLECTION_SCHEMA_VERSION = 1;
export const PROTOCOL_OCCURRENCE_SCHEMA_VERSION = 1;

const STATUSES = new Set(["completed", "skipped"]);
const SKIP_REASONS = new Set([
  "Pain or discomfort",
  "Equipment unavailable",
  "Not enough time",
  "Low energy",
  "Schedule conflict",
  "Other",
]);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return String(value ?? "").trim();
}

function validTimestamp(value) {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function timestampFromDate(value) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) return null;
  return value.toISOString();
}

export function protocolOccurrenceId(protocolId, itemId, date) {
  return `protocol-occurrence:${encodeURIComponent(text(protocolId))}:${encodeURIComponent(text(itemId))}:${date}`;
}

export function emptyProtocolOccurrenceCollection() {
  return { schemaVersion: PROTOCOL_OCCURRENCE_COLLECTION_SCHEMA_VERSION, occurrences: [] };
}

export function normalizeProtocolOccurrence(value) {
  if (
    !isObject(value)
    || value.schemaVersion !== PROTOCOL_OCCURRENCE_SCHEMA_VERSION
    || !text(value.protocolId)
    || !text(value.itemId)
    || !isValidLocalDate(value.date)
    || !STATUSES.has(value.status)
    || !validTimestamp(value.createdAt)
    || !validTimestamp(value.updatedAt)
  ) return null;

  const id = protocolOccurrenceId(value.protocolId, value.itemId, value.date);
  if (value.id !== id) return null;
  const completedAt = value.completedAt ?? null;
  const skippedAt = value.skippedAt ?? null;
  const skipReason = text(value.skipReason);
  const customSkipReason = text(value.customSkipReason);
  if (value.status === "completed") {
    if (!validTimestamp(completedAt)) return null;
    const hasSkipProvenance = Boolean(skippedAt || skipReason || customSkipReason);
    if (hasSkipProvenance && !validTimestamp(skippedAt)) return null;
    if (skipReason && !SKIP_REASONS.has(skipReason)) return null;
    if (customSkipReason && skipReason !== "Other") return null;
  } else {
    if (!validTimestamp(skippedAt) || completedAt) return null;
    if (skipReason && !SKIP_REASONS.has(skipReason)) return null;
    if (customSkipReason && skipReason !== "Other") return null;
  }

  return {
    schemaVersion: PROTOCOL_OCCURRENCE_SCHEMA_VERSION,
    id,
    protocolId: text(value.protocolId),
    itemId: text(value.itemId),
    date: value.date,
    status: value.status,
    completedAt,
    skippedAt,
    skipReason,
    customSkipReason: skipReason === "Other" ? customSkipReason : "",
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function normalizeProtocolOccurrenceCollection(value) {
  if (
    !isObject(value)
    || value.schemaVersion !== PROTOCOL_OCCURRENCE_COLLECTION_SCHEMA_VERSION
    || !Array.isArray(value.occurrences)
  ) return null;
  const ids = new Set();
  const occurrences = [];
  for (const occurrence of value.occurrences) {
    const normalized = normalizeProtocolOccurrence(occurrence);
    if (!normalized || ids.has(normalized.id)) return null;
    ids.add(normalized.id);
    occurrences.push(normalized);
  }
  return { schemaVersion: PROTOCOL_OCCURRENCE_COLLECTION_SCHEMA_VERSION, occurrences };
}

function occurrenceRecord(existing, identity, status, reason, customReason, now) {
  const current = existing == null ? null : normalizeProtocolOccurrence(existing);
  const protocolId = text(identity?.protocolId);
  const itemId = text(identity?.itemId);
  const date = identity?.date;
  const timestamp = timestampFromDate(now);
  if (!protocolId || !itemId || !isValidLocalDate(date) || !timestamp) return null;
  if (current && (
    current.protocolId !== protocolId
    || current.itemId !== itemId
    || current.date !== date
  )) return null;
  const skipReason = text(reason);
  const customSkipReason = text(customReason);
  if (status === "skipped") {
    if (skipReason && !SKIP_REASONS.has(skipReason)) return null;
    if (customSkipReason && skipReason !== "Other") return null;
  }
  return normalizeProtocolOccurrence({
    schemaVersion: PROTOCOL_OCCURRENCE_SCHEMA_VERSION,
    id: protocolOccurrenceId(protocolId, itemId, date),
    protocolId,
    itemId,
    date,
    status,
    completedAt: status === "completed" ? timestamp : null,
    skippedAt: status === "skipped" ? timestamp : current?.skippedAt || null,
    skipReason: status === "skipped" ? skipReason : current?.skipReason || "",
    customSkipReason: status === "skipped" && skipReason === "Other"
      ? customSkipReason
      : current?.customSkipReason || "",
    createdAt: current?.createdAt || timestamp,
    updatedAt: timestamp,
  });
}

export function completeProtocolOccurrence(existing, identity, now = new Date()) {
  return occurrenceRecord(existing, identity, "completed", "", "", now);
}

export function skipProtocolOccurrence(existing, identity, reason = "", customReason = "", now = new Date()) {
  return occurrenceRecord(existing, identity, "skipped", reason, customReason, now);
}

export function findProtocolOccurrence(occurrences, protocolId, itemId, date) {
  const id = protocolOccurrenceId(protocolId, itemId, date);
  return Array.isArray(occurrences)
    ? occurrences.find((occurrence) => occurrence?.id === id) || null
    : null;
}

export function upsertProtocolOccurrence(occurrences, occurrence) {
  const normalized = normalizeProtocolOccurrence(occurrence);
  if (!Array.isArray(occurrences) || !normalized) return null;
  const next = occurrences.filter(({ id }) => id !== normalized.id);
  next.push(normalized);
  return next;
}

export function readProtocolOccurrences(storage = localStorage) {
  const raw = storage.getItem(PROTOCOL_OCCURRENCES_STORAGE_KEY);
  if (raw === null) return [];
  const collection = normalizeProtocolOccurrenceCollection(JSON.parse(raw));
  if (!collection) throw new Error("Invalid protocol occurrence data.");
  return collection.occurrences;
}

export function writeProtocolOccurrences(storage = localStorage, occurrences) {
  const collection = normalizeProtocolOccurrenceCollection({
    schemaVersion: PROTOCOL_OCCURRENCE_COLLECTION_SCHEMA_VERSION,
    occurrences,
  });
  if (!collection) throw new Error("Invalid protocol occurrence data.");
  storage.setItem(PROTOCOL_OCCURRENCES_STORAGE_KEY, JSON.stringify(collection));
  return collection.occurrences;
}
