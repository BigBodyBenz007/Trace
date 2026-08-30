import { DOSE_UNIT_OPTIONS, ROUTE_OPTIONS } from "../constants/medicationOptions";
import { isValidLocalDate } from "./protocol";
import {
  completeProtocolOccurrence,
  normalizeProtocolOccurrenceCollection,
} from "./protocolOccurrence";

export const PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY = "protocolCompoundOutcomes";
export const PROTOCOL_COMPOUND_TRANSACTION_KEY = "protocolCompoundOutcomeTransaction";
export const PROTOCOL_COMPOUND_OUTCOME_COLLECTION_SCHEMA_VERSION = 1;
export const PROTOCOL_COMPOUND_OUTCOME_SCHEMA_VERSION = 1;
export const PROTOCOL_COMPOUND_TRANSACTION_SCHEMA_VERSION = 1;

const COMPONENT_STATUSES = new Set(["not-yet", "taken", "skipped"]);
const TRANSACTION_OPERATIONS = new Set(["save-results", "undo-taken", "undo-skip"]);
const DOSE_UNITS = new Set(DOSE_UNIT_OPTIONS.map(({ value }) => value));
const ROUTES = new Set(ROUTE_OPTIONS.map(({ value }) => value));

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return String(value ?? "").trim();
}

function compactText(value) {
  return text(value).replace(/\s+/g, " ");
}

function meaningfulText(value) {
  return /[a-z0-9]/i.test(text(value));
}

function validTimestamp(value) {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(Date.parse(value));
}

function timestampFromDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : null;
}

function normalizeDose(value) {
  if (!isObject(value)) return null;
  const amount = Number(value.amount);
  if (!Number.isFinite(amount) || amount <= 0 || !DOSE_UNITS.has(value.unit)) return null;
  const dose = { amount, unit: value.unit };
  if (value.unit === "custom") {
    if (!meaningfulText(value.customUnit)) return null;
    dose.customUnit = compactText(value.customUnit);
  }
  return dose;
}

function normalizeRoute(value) {
  if (!isObject(value) || !ROUTES.has(value.code)) return null;
  const route = { code: value.code };
  if (value.code === "other") {
    if (!meaningfulText(value.customLabel)) return null;
    route.customLabel = compactText(value.customLabel);
  }
  return route;
}

function normalizeReference(value) {
  if (value == null) return null;
  if (!isObject(value) || !text(value.source) || !text(value.sourceId)) return null;
  return JSON.parse(JSON.stringify(value));
}

function normalizeSchedule(value) {
  if (!isObject(value) || value.type !== "weekly-days" || !Array.isArray(value.weekdays)) return null;
  const weekdays = [...new Set(value.weekdays.map(Number))].sort((first, second) => first - second);
  if (weekdays.length === 0 || weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) return null;
  const schedule = { type: "weekly-days", weekdays };
  if (value.time != null && text(value.time)) schedule.time = text(value.time);
  return schedule;
}

function normalizeSnapshot(value) {
  if (!isObject(value) || !meaningfulText(value.name)) return null;
  const dose = normalizeDose(value.dose);
  const route = normalizeRoute(value.route);
  const schedule = normalizeSchedule(value.schedule);
  const compoundReference = normalizeReference(value.compoundReference);
  if (!dose || !route || !schedule || (value.compoundReference != null && !compoundReference)) return null;
  return {
    name: compactText(value.name),
    dose,
    route,
    notes: text(value.notes),
    schedule,
    ...(compoundReference ? { compoundReference } : {}),
  };
}

function normalizeComponent(value) {
  if (!isObject(value) || !text(value.id) || !COMPONENT_STATUSES.has(value.status)) return null;
  const snapshot = normalizeSnapshot(value.snapshot);
  if (!snapshot) return null;
  const sourceItemId = value.sourceItemId == null ? null : text(value.sourceItemId);
  const historyEntryId = value.historyEntryId == null ? null : text(value.historyEntryId);
  const takenAt = value.takenAt ?? null;
  const skippedAt = value.skippedAt ?? null;
  if (value.status === "taken") {
    if (!historyEntryId || !validTimestamp(takenAt) || skippedAt) return null;
  } else if (historyEntryId || takenAt) return null;
  if (value.status === "skipped") {
    if (!validTimestamp(skippedAt)) return null;
  } else if (skippedAt) return null;
  return {
    id: text(value.id),
    sourceItemId,
    snapshot,
    status: value.status,
    historyEntryId,
    takenAt,
    skippedAt,
  };
}

export function protocolCompoundOutcomeId(protocolId, date) {
  return `protocol-compound-outcome:${encodeURIComponent(text(protocolId))}:${date}`;
}

export function protocolCompoundComponentId(protocolId, item, index) {
  return text(item?.id) || `protocol-outcome-component:${encodeURIComponent(text(protocolId))}:${index + 1}`;
}

export function protocolCompoundHistoryEntryId(outcomeId, componentId) {
  return `protocol-compound-history:${encodeURIComponent(text(outcomeId))}:${encodeURIComponent(text(componentId))}`;
}

export function normalizeProtocolCompoundOutcome(value) {
  if (
    !isObject(value)
    || value.schemaVersion !== PROTOCOL_COMPOUND_OUTCOME_SCHEMA_VERSION
    || !text(value.protocolId)
    || !isValidLocalDate(value.date)
    || !meaningfulText(value.protocolSnapshot?.name)
    || !Array.isArray(value.components)
    || value.components.length === 0
    || !validTimestamp(value.createdAt)
    || !validTimestamp(value.updatedAt)
  ) return null;
  const id = protocolCompoundOutcomeId(value.protocolId, value.date);
  if (value.id !== id) return null;
  const componentIds = new Set();
  const components = [];
  for (const candidate of value.components) {
    const component = normalizeComponent(candidate);
    if (!component || componentIds.has(component.id)) return null;
    componentIds.add(component.id);
    components.push(component);
  }
  return {
    schemaVersion: PROTOCOL_COMPOUND_OUTCOME_SCHEMA_VERSION,
    id,
    protocolId: text(value.protocolId),
    date: value.date,
    protocolSnapshot: {
      name: compactText(value.protocolSnapshot.name),
      notes: text(value.protocolSnapshot.notes),
    },
    components,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function emptyProtocolCompoundOutcomeCollection() {
  return { schemaVersion: PROTOCOL_COMPOUND_OUTCOME_COLLECTION_SCHEMA_VERSION, occurrences: [] };
}

export function normalizeProtocolCompoundOutcomeCollection(value) {
  if (
    !isObject(value)
    || value.schemaVersion !== PROTOCOL_COMPOUND_OUTCOME_COLLECTION_SCHEMA_VERSION
    || !Array.isArray(value.occurrences)
  ) return null;
  const ids = new Set();
  const occurrences = [];
  for (const candidate of value.occurrences) {
    const outcome = normalizeProtocolCompoundOutcome(candidate);
    if (!outcome || ids.has(outcome.id)) return null;
    ids.add(outcome.id);
    occurrences.push(outcome);
  }
  return { schemaVersion: PROTOCOL_COMPOUND_OUTCOME_COLLECTION_SCHEMA_VERSION, occurrences };
}

export function createProtocolCompoundOutcome(protocol, items, date, now = new Date()) {
  const timestamp = timestampFromDate(now);
  if (
    !protocol?.id
    || !meaningfulText(protocol.name)
    || !Array.isArray(items)
    || items.length === 0
    || !isValidLocalDate(date)
    || !timestamp
  ) return null;
  const components = items.map((item, index) => ({
    id: protocolCompoundComponentId(protocol.id, item, index),
    sourceItemId: text(item?.id) || null,
    snapshot: {
      name: item?.compound?.name,
      dose: item?.dose,
      route: item?.route,
      notes: item?.notes || "",
      schedule: item?.schedule,
      ...(item?.compound?.reference
        ? { compoundReference: item.compound.reference }
        : {}),
    },
    status: "not-yet",
    historyEntryId: null,
    takenAt: null,
    skippedAt: null,
  }));
  return normalizeProtocolCompoundOutcome({
    schemaVersion: PROTOCOL_COMPOUND_OUTCOME_SCHEMA_VERSION,
    id: protocolCompoundOutcomeId(protocol.id, date),
    protocolId: protocol.id,
    date,
    protocolSnapshot: { name: protocol.name, notes: protocol.notes || "" },
    components,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function findProtocolCompoundOutcome(outcomes, protocolId, date) {
  const id = protocolCompoundOutcomeId(protocolId, date);
  return Array.isArray(outcomes)
    ? outcomes.find((outcome) => outcome?.id === id) || null
    : null;
}

export function protocolCompoundOutcomeStatus(outcome) {
  const normalized = normalizeProtocolCompoundOutcome(outcome);
  if (!normalized) return "scheduled";
  const notYet = normalized.components.filter(({ status }) => status === "not-yet").length;
  if (notYet === normalized.components.length) return "scheduled";
  if (notYet > 0) return "partial";
  return "completed";
}

export function protocolCompoundOutcomeCounts(outcome) {
  const normalized = normalizeProtocolCompoundOutcome(outcome);
  const counts = { taken: 0, skipped: 0, notYet: 0 };
  normalized?.components.forEach(({ status }) => {
    if (status === "taken") counts.taken += 1;
    else if (status === "skipped") counts.skipped += 1;
    else counts.notYet += 1;
  });
  return counts;
}

function upsertOutcome(outcomes, outcome) {
  const normalized = normalizeProtocolCompoundOutcome(outcome);
  if (!Array.isArray(outcomes) || !normalized) return null;
  return [...outcomes.filter(({ id }) => id !== normalized.id), normalized];
}

function parentItemId(component) {
  return component.sourceItemId || component.id;
}

function nextParentOccurrences(protocolOccurrences, outcome, resolved, now) {
  const componentItemIds = new Set(outcome.components.map(parentItemId));
  let next = protocolOccurrences.filter((occurrence) => !(
    occurrence.protocolId === outcome.protocolId
    && occurrence.date === outcome.date
    && componentItemIds.has(occurrence.itemId)
  ));
  if (!resolved) return next;
  for (const component of outcome.components) {
    const itemId = parentItemId(component);
    const occurrence = completeProtocolOccurrence(null, {
      protocolId: outcome.protocolId,
      itemId,
      date: outcome.date,
    }, now);
    if (!occurrence) return null;
    next.push(occurrence);
  }
  return normalizeProtocolOccurrenceCollection({ schemaVersion: 1, occurrences: next })?.occurrences || null;
}

function createHistoryEntry(outcome, component, now) {
  const timestamp = timestampFromDate(now);
  if (!timestamp) return null;
  return {
    id: protocolCompoundHistoryEntryId(outcome.id, component.id),
    schemaVersion: 1,
    name: component.snapshot.name,
    dose: { ...component.snapshot.dose },
    route: { ...component.snapshot.route },
    occurredAt: timestamp,
    notes: component.snapshot.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(component.snapshot.compoundReference
      ? { compoundReference: { ...component.snapshot.compoundReference } }
      : {}),
    protocolId: outcome.protocolId,
    protocolOccurrenceDate: outcome.date,
    protocolComponentId: component.id,
    protocolItemId: component.sourceItemId,
    protocolCompoundOutcomeId: outcome.id,
    protocolSourceSnapshot: {
      protocolName: outcome.protocolSnapshot.name,
      protocolNotes: outcome.protocolSnapshot.notes,
      component: JSON.parse(JSON.stringify(component.snapshot)),
    },
  };
}

function restoreRaw(storage, key, raw) {
  if (raw === null) storage.removeItem(key);
  else storage.setItem(key, raw);
}

function persistTransaction({ storage, id, operation, medicationEntries, outcomes, protocolOccurrences }) {
  const previous = {
    medicationEntries: storage.getItem("medicationEntries"),
    protocolCompoundOutcomes: storage.getItem(PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY),
    protocolOccurrences: storage.getItem("protocolOccurrences"),
  };
  const next = {
    medicationEntries: JSON.stringify(medicationEntries),
    protocolCompoundOutcomes: JSON.stringify({
      schemaVersion: PROTOCOL_COMPOUND_OUTCOME_COLLECTION_SCHEMA_VERSION,
      occurrences: outcomes,
    }),
    protocolOccurrences: JSON.stringify({ schemaVersion: 1, occurrences: protocolOccurrences }),
  };
  const transaction = {
    schemaVersion: PROTOCOL_COMPOUND_TRANSACTION_SCHEMA_VERSION,
    id,
    operation,
    previous,
    next,
  };
  storage.setItem(PROTOCOL_COMPOUND_TRANSACTION_KEY, JSON.stringify(transaction));
  try {
    storage.setItem("medicationEntries", next.medicationEntries);
    storage.setItem(PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY, next.protocolCompoundOutcomes);
    storage.setItem("protocolOccurrences", next.protocolOccurrences);
    storage.removeItem(PROTOCOL_COMPOUND_TRANSACTION_KEY);
  } catch (error) {
    let rolledBack = true;
    try {
      restoreRaw(storage, "medicationEntries", previous.medicationEntries);
      restoreRaw(storage, PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY, previous.protocolCompoundOutcomes);
      restoreRaw(storage, "protocolOccurrences", previous.protocolOccurrences);
      storage.removeItem(PROTOCOL_COMPOUND_TRANSACTION_KEY);
    } catch (rollbackError) {
      rolledBack = false;
    }
    const failure = new Error(
      rolledBack
        ? "Protocol results could not be saved; previous data was restored."
        : "Protocol results are pending recovery. Do not close this page."
    );
    failure.cause = error;
    throw failure;
  }
}

export function persistProtocolCompoundResults({
  storage = localStorage,
  outcomes,
  protocolOccurrences,
  medicationEntries,
  candidate,
  decisions,
  now = new Date(),
}) {
  if (!Array.isArray(outcomes) || !Array.isArray(protocolOccurrences) || !Array.isArray(medicationEntries)) return null;
  const incoming = normalizeProtocolCompoundOutcome(candidate);
  const timestamp = timestampFromDate(now);
  if (!incoming || !timestamp || !isObject(decisions)) return null;
  const existing = findProtocolCompoundOutcome(outcomes, incoming.protocolId, incoming.date);
  const base = normalizeProtocolCompoundOutcome(existing || incoming);
  let nextEntries = [...medicationEntries];
  const components = [];
  for (const component of base.components) {
    if (component.status !== "not-yet") {
      components.push(component);
      continue;
    }
    const status = decisions[component.id] || "not-yet";
    if (!COMPONENT_STATUSES.has(status)) return null;
    if (status === "taken") {
      const historyEntryId = protocolCompoundHistoryEntryId(base.id, component.id);
      const byId = nextEntries.find((entry) => entry.id === historyEntryId);
      const byLink = nextEntries.find((entry) => (
        entry.protocolCompoundOutcomeId === base.id
        && entry.protocolComponentId === component.id
      ));
      if (
        (byId && (byId.protocolCompoundOutcomeId !== base.id || byId.protocolComponentId !== component.id))
        || (byLink && byLink.id !== historyEntryId)
      ) return null;
      const historyEntry = byId || byLink || createHistoryEntry(base, component, now);
      if (!historyEntry) return null;
      if (!byId && !byLink) nextEntries.push(historyEntry);
      components.push({ ...component, status, historyEntryId, takenAt: timestamp, skippedAt: null });
    } else if (status === "skipped") {
      components.push({ ...component, status, historyEntryId: null, takenAt: null, skippedAt: timestamp });
    } else {
      components.push(component);
    }
  }
  const outcome = normalizeProtocolCompoundOutcome({
    ...base,
    components,
    updatedAt: timestamp,
  });
  const nextOutcomes = upsertOutcome(outcomes, outcome);
  const resolved = outcome.components.every(({ status }) => status !== "not-yet");
  const nextProtocolOccurrences = nextParentOccurrences(protocolOccurrences, outcome, resolved, now);
  if (!nextOutcomes || !nextProtocolOccurrences) return null;
  persistTransaction({
    storage,
    id: outcome.id,
    operation: "save-results",
    medicationEntries: nextEntries,
    outcomes: nextOutcomes,
    protocolOccurrences: nextProtocolOccurrences,
  });
  return {
    medicationEntries: nextEntries,
    outcomes: nextOutcomes,
    protocolOccurrences: nextProtocolOccurrences,
    outcome,
    status: protocolCompoundOutcomeStatus(outcome),
  };
}

export function persistProtocolCompoundUndo({
  storage = localStorage,
  outcomes,
  protocolOccurrences,
  medicationEntries,
  outcomeId,
  componentId,
  now = new Date(),
}) {
  if (!Array.isArray(outcomes) || !Array.isArray(protocolOccurrences) || !Array.isArray(medicationEntries)) return null;
  const existing = outcomes.find(({ id }) => id === outcomeId);
  const normalized = normalizeProtocolCompoundOutcome(existing);
  const timestamp = timestampFromDate(now);
  if (!normalized || !timestamp) return null;
  const target = normalized.components.find(({ id }) => id === componentId);
  if (!target) return null;
  if (target.status === "not-yet") {
    return { medicationEntries, outcomes, protocolOccurrences, outcome: normalized, alreadyUndone: true };
  }
  let nextEntries = [...medicationEntries];
  if (target.status === "taken") {
    nextEntries = medicationEntries.filter((entry) => !(
      entry.id === target.historyEntryId
      && entry.protocolCompoundOutcomeId === normalized.id
      && entry.protocolId === normalized.protocolId
      && entry.protocolOccurrenceDate === normalized.date
      && entry.protocolComponentId === target.id
    ));
  }
  const outcome = normalizeProtocolCompoundOutcome({
    ...normalized,
    components: normalized.components.map((component) => component.id === target.id
      ? { ...component, status: "not-yet", historyEntryId: null, takenAt: null, skippedAt: null }
      : component),
    updatedAt: timestamp,
  });
  const nextOutcomes = upsertOutcome(outcomes, outcome);
  const nextProtocolOccurrences = nextParentOccurrences(protocolOccurrences, outcome, false, now);
  if (!nextOutcomes || !nextProtocolOccurrences) return null;
  persistTransaction({
    storage,
    id: `${outcome.id}:${target.id}`,
    operation: target.status === "taken" ? "undo-taken" : "undo-skip",
    medicationEntries: nextEntries,
    outcomes: nextOutcomes,
    protocolOccurrences: nextProtocolOccurrences,
  });
  return {
    medicationEntries: nextEntries,
    outcomes: nextOutcomes,
    protocolOccurrences: nextProtocolOccurrences,
    outcome,
    alreadyUndone: false,
  };
}

export function readProtocolCompoundOutcomes(storage = localStorage) {
  const raw = storage.getItem(PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY);
  if (raw === null) return [];
  const collection = normalizeProtocolCompoundOutcomeCollection(JSON.parse(raw));
  if (!collection) throw new Error("Invalid protocol compound outcome data.");
  return collection.occurrences;
}

export function recoverPendingProtocolCompoundTransaction(storage = localStorage) {
  const raw = storage.getItem(PROTOCOL_COMPOUND_TRANSACTION_KEY);
  if (raw === null) return false;
  const transaction = JSON.parse(raw);
  const rawOrNull = (value) => value === null || typeof value === "string";
  if (
    !isObject(transaction)
    || transaction.schemaVersion !== PROTOCOL_COMPOUND_TRANSACTION_SCHEMA_VERSION
    || !TRANSACTION_OPERATIONS.has(transaction.operation)
    || !isObject(transaction.previous)
    || !isObject(transaction.next)
    || !rawOrNull(transaction.previous.medicationEntries)
    || !rawOrNull(transaction.previous.protocolCompoundOutcomes)
    || !rawOrNull(transaction.previous.protocolOccurrences)
    || typeof transaction.next.medicationEntries !== "string"
    || typeof transaction.next.protocolCompoundOutcomes !== "string"
    || typeof transaction.next.protocolOccurrences !== "string"
  ) throw new Error("Invalid pending Protocol compound transaction.");
  const entries = JSON.parse(transaction.next.medicationEntries);
  const outcomes = normalizeProtocolCompoundOutcomeCollection(JSON.parse(transaction.next.protocolCompoundOutcomes));
  const occurrences = normalizeProtocolOccurrenceCollection(JSON.parse(transaction.next.protocolOccurrences));
  if (!Array.isArray(entries) || !outcomes || !occurrences) {
    throw new Error("Invalid pending Protocol compound transaction.");
  }
  try {
    storage.setItem("medicationEntries", transaction.next.medicationEntries);
    storage.setItem(PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY, transaction.next.protocolCompoundOutcomes);
    storage.setItem("protocolOccurrences", transaction.next.protocolOccurrences);
    storage.removeItem(PROTOCOL_COMPOUND_TRANSACTION_KEY);
  } catch (error) {
    let rolledBack = true;
    try {
      restoreRaw(storage, "medicationEntries", transaction.previous.medicationEntries);
      restoreRaw(storage, PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY, transaction.previous.protocolCompoundOutcomes);
      restoreRaw(storage, "protocolOccurrences", transaction.previous.protocolOccurrences);
      storage.removeItem(PROTOCOL_COMPOUND_TRANSACTION_KEY);
    } catch (rollbackError) {
      rolledBack = false;
    }
    const failure = new Error(
      rolledBack
        ? "Pending Protocol results could not be recovered; previous data was restored."
        : "Protocol results are still pending recovery."
    );
    failure.cause = error;
    throw failure;
  }
  return true;
}
