import { DOSE_UNIT_OPTIONS, ROUTE_OPTIONS } from "../constants/medicationOptions";
import { normalizeCompoundName } from "./compoundCatalog";

export const MEDICATION_DOSE_SCHEDULES_STORAGE_KEY = "medicationDoseSchedules";
export const MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY = "medicationDoseOccurrences";
export const MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY = "medicationDoseCompletionTransaction";
export const MEDICATION_DOSE_SCHEDULE_COLLECTION_SCHEMA_VERSION = 1;
export const MEDICATION_DOSE_SCHEDULE_SCHEMA_VERSION = 1;
export const MEDICATION_DOSE_OCCURRENCE_COLLECTION_SCHEMA_VERSION = 1;
export const MEDICATION_DOSE_OCCURRENCE_SCHEMA_VERSION = 1;
export const MEDICATION_DOSE_COMPLETION_TRANSACTION_SCHEMA_VERSION = 1;
export const MAX_MEDICATION_DOSE_INTERVAL_DAYS = 365;

export const MEDICATION_DOSE_REPEAT_OPTIONS = Object.freeze([
  { value: "once", label: "One time" },
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Selected weekdays" },
  { value: "interval", label: "Every X days" },
]);

const CLASSIFICATIONS = new Set(["medication", "supplement"]);
const DOSE_UNITS = new Set(DOSE_UNIT_OPTIONS.map(({ value }) => value));
const ROUTES = new Set(ROUTE_OPTIONS.map(({ value }) => value));
const REPEAT_TYPES = new Set(MEDICATION_DOSE_REPEAT_OPTIONS.map(({ value }) => value));
const SCHEDULE_STATUSES = new Set(["active", "ended", "deleted"]);
const OCCURRENCE_STATUSES = new Set(["scheduled", "completed", "skipped", "removed"]);
const COMPOUND_REFERENCE_SOURCES = new Set(["trace-catalog", "user-saved"]);
const DOSE_TRANSACTION_OPERATIONS = new Set(["complete", "undo-completion"]);
const DAY_MS = 24 * 60 * 60 * 1000;

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

export function isValidMedicationDoseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isValidMedicationDoseTime(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  return Boolean(match) && Number(match[1]) < 24 && Number(match[2]) < 60;
}

function dateParts(value) {
  if (!isValidMedicationDoseDate(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

export function medicationDoseDateFromKey(value) {
  const parts = dateParts(value);
  return parts ? new Date(parts.year, parts.month - 1, parts.day) : null;
}

export function medicationDoseDateKey(value = new Date()) {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) return "";
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
}

export function shiftMedicationDoseDate(dateKey, amount) {
  const date = medicationDoseDateFromKey(dateKey);
  if (!date || !Number.isInteger(amount)) return null;
  return medicationDoseDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount));
}

function dateDifference(first, second) {
  const firstParts = dateParts(first);
  const secondParts = dateParts(second);
  if (!firstParts || !secondParts) return null;
  return Math.round(
    (Date.UTC(firstParts.year, firstParts.month - 1, firstParts.day)
      - Date.UTC(secondParts.year, secondParts.month - 1, secondParts.day)) / DAY_MS
  );
}

function normalizedSource(value) {
  if (!isObject(value)) return null;
  const type = text(value.type);
  const id = text(value.id);
  if (!["saved-compound", "medication-entry", "direct-entry"].includes(type) || !id) return null;
  return { type, id };
}

function normalizedReference(value) {
  if (value === null || value === undefined) return null;
  if (
    !isObject(value)
    || !COMPOUND_REFERENCE_SOURCES.has(text(value.source))
    || !text(value.sourceId)
  ) return null;
  const normalized = {
    source: text(value.source),
    sourceId: text(value.sourceId),
  };
  if (value.category !== undefined) {
    if (!meaningfulText(value.category)) return null;
    normalized.category = text(value.category);
  }
  if (value.modified !== undefined) {
    if (typeof value.modified !== "boolean") return null;
    normalized.modified = value.modified;
  }
  return normalized;
}

function normalizedDose(value) {
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

function normalizedRoute(value) {
  if (!isObject(value) || !ROUTES.has(value.code)) return null;
  const route = { code: value.code };
  if (value.code === "other") {
    if (!meaningfulText(value.customLabel)) return null;
    route.customLabel = compactText(value.customLabel);
  }
  return route;
}

function normalizedRepeat(value) {
  if (!isObject(value) || !REPEAT_TYPES.has(value.type)) return null;
  if (value.type === "once" || value.type === "daily") return { type: value.type };
  if (value.type === "weekdays") {
    if (!Array.isArray(value.weekdays) || value.weekdays.length === 0) return null;
    const weekdays = [...new Set(value.weekdays.map(Number))].sort((a, b) => a - b);
    if (weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) return null;
    return { type: "weekdays", weekdays };
  }
  const intervalDays = Number(value.intervalDays);
  if (
    !Number.isInteger(intervalDays)
    || intervalDays < 1
    || intervalDays > MAX_MEDICATION_DOSE_INTERVAL_DAYS
  ) return null;
  return { type: "interval", intervalDays };
}

function normalizedRevision(value, scheduleId) {
  if (!isObject(value) || !text(value.id) || !isValidMedicationDoseDate(value.effectiveFrom)) return null;
  if (!meaningfulText(value.name) || !CLASSIFICATIONS.has(value.classification)) return null;
  const dose = normalizedDose(value.dose);
  const route = normalizedRoute(value.route);
  const source = normalizedSource(value.source);
  const repeat = normalizedRepeat(value.repeat);
  const compoundReference = normalizedReference(value.compoundReference);
  if (
    !dose
    || !route
    || !source
    || !repeat
    || (value.compoundReference != null && !compoundReference)
  ) return null;
  if (!isValidMedicationDoseDate(value.startDate) || !isValidMedicationDoseTime(value.time)) return null;
  const endDate = value.endDate === null || value.endDate === undefined || value.endDate === ""
    ? null
    : value.endDate;
  if (endDate !== null && (!isValidMedicationDoseDate(endDate) || endDate < value.startDate)) return null;
  if (repeat.type === "once" && endDate !== null) return null;
  const revisionPrefix = `${scheduleId}:revision:`;
  if (
    !text(value.id).startsWith(revisionPrefix)
    || !/^[1-9]\d*$/.test(text(value.id).slice(revisionPrefix.length))
  ) return null;
  return {
    id: text(value.id),
    effectiveFrom: value.effectiveFrom,
    name: compactText(value.name),
    classification: value.classification,
    dose,
    route,
    notes: text(value.notes),
    source,
    ...(compoundReference ? { compoundReference } : {}),
    repeat,
    startDate: value.startDate,
    endDate,
    time: value.time,
  };
}

export function medicationDoseScheduleId(prefix = "medication-dose-schedule") {
  const value = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${value}`;
}

export function medicationDoseDirectSourceId() {
  return medicationDoseScheduleId("medication-dose-source");
}

function revisionFromDraft(draft, scheduleId, revisionNumber, effectiveFrom) {
  return normalizedRevision({
    id: `${scheduleId}:revision:${revisionNumber}`,
    effectiveFrom,
    name: draft.name,
    classification: draft.classification,
    dose: draft.dose,
    route: draft.route,
    notes: draft.notes,
    source: draft.source,
    compoundReference: draft.compoundReference,
    repeat: draft.repeat,
    startDate: draft.startDate,
    endDate: draft.endDate,
    time: draft.time,
  }, scheduleId);
}

export function getMedicationDoseScheduleError(draft) {
  if (!meaningfulText(draft?.name)) return "Enter a medication or supplement name.";
  if (!CLASSIFICATIONS.has(draft?.classification)) return "Choose Medication or Supplement.";
  if (!normalizedDose(draft?.dose)) return "Enter a valid dose amount and unit.";
  if (!normalizedRoute(draft?.route)) return "The saved route is invalid.";
  if (!normalizedSource(draft?.source)) return "The medication source is invalid.";
  if (!isValidMedicationDoseDate(draft?.startDate)) return "Enter a valid start date.";
  if (!isValidMedicationDoseTime(draft?.time)) return "Enter a valid scheduled time.";
  const repeat = normalizedRepeat(draft?.repeat);
  if (!repeat) {
    if (draft?.repeat?.type === "weekdays") return "Select at least one weekday.";
    if (draft?.repeat?.type === "interval") {
      return `Enter a whole-day interval from 1 to ${MAX_MEDICATION_DOSE_INTERVAL_DAYS}.`;
    }
    return "Choose a valid repeat option.";
  }
  if (draft?.endDate && !isValidMedicationDoseDate(draft.endDate)) return "Enter a valid end date.";
  if (draft?.endDate && draft.endDate < draft.startDate) return "End date cannot be before start date.";
  if (repeat.type === "once" && draft?.endDate) return "One-time schedules do not use an end date.";
  return "";
}

export function normalizeMedicationDoseSchedule(value) {
  if (
    !isObject(value)
    || value.schemaVersion !== MEDICATION_DOSE_SCHEDULE_SCHEMA_VERSION
    || !text(value.id)
    || !SCHEDULE_STATUSES.has(value.status)
    || !Array.isArray(value.revisions)
    || value.revisions.length === 0
    || !validTimestamp(value.createdAt)
    || !validTimestamp(value.updatedAt)
  ) return null;
  const id = text(value.id);
  const revisions = [];
  const revisionIds = new Set();
  let previousDate = null;
  for (const candidate of value.revisions) {
    const revision = normalizedRevision(candidate, id);
    if (
      !revision
      || revisionIds.has(revision.id)
      || (previousDate !== null && revision.effectiveFrom <= previousDate)
    ) return null;
    revisionIds.add(revision.id);
    previousDate = revision.effectiveFrom;
    revisions.push(revision);
  }
  const inactiveFrom = value.inactiveFrom === null || value.inactiveFrom === undefined
    ? null
    : value.inactiveFrom;
  if (inactiveFrom !== null && !isValidMedicationDoseDate(inactiveFrom)) return null;
  if (value.status === "active" && inactiveFrom !== null) return null;
  if (value.status !== "active" && inactiveFrom === null) return null;
  return {
    schemaVersion: MEDICATION_DOSE_SCHEDULE_SCHEMA_VERSION,
    id,
    revisions,
    status: value.status,
    inactiveFrom,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function createMedicationDoseSchedule(
  draft,
  { id = medicationDoseScheduleId(), now = new Date() } = {}
) {
  const timestamp = timestampFromDate(now);
  if (getMedicationDoseScheduleError(draft) || !text(id) || !timestamp) return null;
  const revision = revisionFromDraft(draft, id, 1, draft.startDate);
  if (!revision) return null;
  return normalizeMedicationDoseSchedule({
    schemaVersion: MEDICATION_DOSE_SCHEDULE_SCHEMA_VERSION,
    id,
    revisions: [revision],
    status: "active",
    inactiveFrom: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function updateMedicationDoseSchedule(
  existing,
  draft,
  effectiveFrom,
  now = new Date()
) {
  const schedule = normalizeMedicationDoseSchedule(existing);
  const timestamp = timestampFromDate(now);
  if (
    !schedule
    || schedule.status !== "active"
    || getMedicationDoseScheduleError(draft)
    || !isValidMedicationDoseDate(effectiveFrom)
    || !timestamp
  ) return null;
  const retained = schedule.revisions.filter((revision) => revision.effectiveFrom < effectiveFrom);
  const nextNumber = schedule.revisions.reduce((largest, revision) => {
    const value = Number(revision.id.split(":revision:")[1]);
    return Number.isInteger(value) ? Math.max(largest, value) : largest;
  }, 0) + 1;
  const revision = revisionFromDraft(draft, schedule.id, nextNumber, effectiveFrom);
  if (!revision) return null;
  return normalizeMedicationDoseSchedule({
    ...schedule,
    revisions: [...retained, revision],
    updatedAt: timestamp,
  });
}

function closeMedicationDoseSchedule(existing, status, inactiveFrom, now) {
  const schedule = normalizeMedicationDoseSchedule(existing);
  const timestamp = timestampFromDate(now);
  if (
    !schedule
    || schedule.status !== "active"
    || !["ended", "deleted"].includes(status)
    || !isValidMedicationDoseDate(inactiveFrom)
    || !timestamp
  ) return null;
  return normalizeMedicationDoseSchedule({
    ...schedule,
    status,
    inactiveFrom,
    updatedAt: timestamp,
  });
}

export function endMedicationDoseSchedule(existing, inactiveFrom, now = new Date()) {
  return closeMedicationDoseSchedule(existing, "ended", inactiveFrom, now);
}

export function deleteMedicationDoseSchedule(existing, inactiveFrom, now = new Date()) {
  const schedule = normalizeMedicationDoseSchedule(existing);
  const timestamp = timestampFromDate(now);
  if (
    !schedule
    || !["active", "ended", "deleted"].includes(schedule.status)
    || !isValidMedicationDoseDate(inactiveFrom)
    || !timestamp
  ) return null;
  if (schedule.status === "deleted") return schedule;
  return normalizeMedicationDoseSchedule({
    ...schedule,
    status: "deleted",
    inactiveFrom,
    updatedAt: timestamp,
  });
}

export function currentMedicationDoseRevision(schedule) {
  const normalized = normalizeMedicationDoseSchedule(schedule);
  return normalized?.revisions[normalized.revisions.length - 1] || null;
}

export function medicationDoseRevisionForDate(schedule, dateKey) {
  const normalized = normalizeMedicationDoseSchedule(schedule);
  if (!normalized || !isValidMedicationDoseDate(dateKey)) return null;
  if (
    normalized.inactiveFrom
    && (
      normalized.status === "ended"
        ? dateKey > normalized.inactiveFrom
        : dateKey >= normalized.inactiveFrom
    )
  ) return null;
  const matches = normalized.revisions.filter(({ effectiveFrom }) => effectiveFrom <= dateKey);
  return matches[matches.length - 1] || null;
}

export function medicationDoseRevisionOccursOnDate(revision, dateKey) {
  if (!revision || !isValidMedicationDoseDate(dateKey)) return false;
  if (dateKey < revision.startDate || (revision.endDate && dateKey > revision.endDate)) return false;
  if (revision.repeat.type === "once") return dateKey === revision.startDate;
  if (revision.repeat.type === "daily") return true;
  if (revision.repeat.type === "weekdays") {
    const day = medicationDoseDateFromKey(dateKey).getDay() || 7;
    return revision.repeat.weekdays.includes(day);
  }
  const difference = dateDifference(dateKey, revision.startDate);
  return difference >= 0 && difference % revision.repeat.intervalDays === 0;
}

export function medicationDoseScheduleOccursOnDate(schedule, dateKey) {
  const revision = medicationDoseRevisionForDate(schedule, dateKey);
  return Boolean(revision && medicationDoseRevisionOccursOnDate(revision, dateKey));
}

export function medicationDoseOccurrenceId(scheduleId, originalDate) {
  return `medication-dose-occurrence:${encodeURIComponent(text(scheduleId))}:${originalDate}`;
}

export function medicationDoseHistoryEntryId(occurrenceId) {
  return `medication-dose-history:${encodeURIComponent(text(occurrenceId))}`;
}

function snapshotFromRevision(revision) {
  return {
    name: revision.name,
    classification: revision.classification,
    dose: { ...revision.dose },
    route: { ...revision.route },
    notes: revision.notes,
    source: { ...revision.source },
    ...(revision.compoundReference
      ? { compoundReference: { ...revision.compoundReference } }
      : {}),
    repeat: {
      ...revision.repeat,
      ...(revision.repeat.weekdays ? { weekdays: [...revision.repeat.weekdays] } : {}),
    },
    startDate: revision.startDate,
    endDate: revision.endDate,
  };
}

function normalizedSnapshot(value) {
  if (!isObject(value) || !meaningfulText(value.name) || !CLASSIFICATIONS.has(value.classification)) return null;
  const dose = normalizedDose(value.dose);
  const route = normalizedRoute(value.route);
  const source = normalizedSource(value.source);
  const compoundReference = normalizedReference(value.compoundReference);
  const repeat = normalizedRepeat(value.repeat);
  if (
    !dose
    || !route
    || !source
    || !repeat
    || (value.compoundReference != null && !compoundReference)
    || !isValidMedicationDoseDate(value.startDate)
  ) return null;
  const endDate = value.endDate === null || value.endDate === undefined ? null : value.endDate;
  if (endDate !== null && (!isValidMedicationDoseDate(endDate) || endDate < value.startDate)) return null;
  return {
    name: compactText(value.name),
    classification: value.classification,
    dose,
    route,
    notes: text(value.notes),
    source,
    ...(compoundReference ? { compoundReference } : {}),
    repeat,
    startDate: value.startDate,
    endDate,
  };
}

export function normalizeMedicationDoseOccurrence(value) {
  if (
    !isObject(value)
    || value.schemaVersion !== MEDICATION_DOSE_OCCURRENCE_SCHEMA_VERSION
    || !text(value.scheduleId)
    || !isValidMedicationDoseDate(value.originalDate)
    || !isValidMedicationDoseDate(value.scheduledDate)
    || !isValidMedicationDoseTime(value.time)
    || !OCCURRENCE_STATUSES.has(value.status)
    || !validTimestamp(value.createdAt)
    || !validTimestamp(value.updatedAt)
  ) return null;
  const id = medicationDoseOccurrenceId(value.scheduleId, value.originalDate);
  if (value.id !== id) return null;
  const snapshot = normalizedSnapshot(value.snapshot);
  if (!snapshot) return null;
  const completedAt = value.completedAt ?? null;
  const skippedAt = value.skippedAt ?? null;
  const removedAt = value.removedAt ?? null;
  const rescheduledAt = value.rescheduledAt ?? null;
  const skipReason = text(value.skipReason);
  const customSkipReason = text(value.customSkipReason);
  const historyEntryId = value.historyEntryId == null ? null : text(value.historyEntryId);
  if (value.status === "completed") {
    if (!validTimestamp(completedAt) || !historyEntryId) return null;
  } else if (completedAt || historyEntryId) return null;
  if (value.status === "skipped") {
    if (!validTimestamp(skippedAt)) return null;
  } else if (skippedAt || skipReason || customSkipReason) return null;
  if (customSkipReason && skipReason !== "Other") return null;
  if (value.status === "removed") {
    if (!validTimestamp(removedAt)) return null;
  } else if (removedAt) return null;
  if (value.scheduledDate !== value.originalDate || value.time !== value.originalTime) {
    if (!validTimestamp(rescheduledAt)) return null;
  } else if (rescheduledAt) return null;
  if (!isValidMedicationDoseTime(value.originalTime)) return null;
  return {
    schemaVersion: MEDICATION_DOSE_OCCURRENCE_SCHEMA_VERSION,
    id,
    scheduleId: text(value.scheduleId),
    originalDate: value.originalDate,
    originalTime: value.originalTime,
    scheduledDate: value.scheduledDate,
    time: value.time,
    status: value.status,
    snapshot,
    completedAt,
    skippedAt,
    removedAt,
    rescheduledAt,
    skipReason,
    customSkipReason,
    historyEntryId,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function medicationDoseOccurrenceItem(schedule, originalDate, occurrence = null) {
  const normalizedSchedule = normalizeMedicationDoseSchedule(schedule);
  if (!normalizedSchedule || !isValidMedicationDoseDate(originalDate)) return null;
  const existing = occurrence == null ? null : normalizeMedicationDoseOccurrence(occurrence);
  if (existing) {
    if (existing.scheduleId !== normalizedSchedule.id || existing.originalDate !== originalDate) return null;
    if (
      existing.status === "scheduled"
      && (
        normalizedSchedule.status === "deleted"
        || (
          normalizedSchedule.status === "ended"
          && normalizedSchedule.inactiveFrom
          && existing.scheduledDate > normalizedSchedule.inactiveFrom
        )
      )
    ) return null;
    return { ...existing, occurrence: existing, schedule: normalizedSchedule };
  }
  const revision = medicationDoseRevisionForDate(normalizedSchedule, originalDate);
  if (!revision || !medicationDoseRevisionOccursOnDate(revision, originalDate)) return null;
  return {
    id: medicationDoseOccurrenceId(normalizedSchedule.id, originalDate),
    scheduleId: normalizedSchedule.id,
    originalDate,
    originalTime: revision.time,
    scheduledDate: originalDate,
    time: revision.time,
    status: "scheduled",
    snapshot: snapshotFromRevision(revision),
    occurrence: null,
    schedule: normalizedSchedule,
  };
}

export function medicationDoseOccurrencesForDate(schedules, occurrences, dateKey) {
  if (!Array.isArray(schedules) || !Array.isArray(occurrences) || !isValidMedicationDoseDate(dateKey)) return [];
  const normalizedOccurrences = occurrences.map(normalizeMedicationDoseOccurrence).filter(Boolean);
  const occurrenceByIdentity = new Map(
    normalizedOccurrences.map((occurrence) => [occurrence.id, occurrence])
  );
  const items = [];
  schedules.forEach((schedule) => {
    const normalized = normalizeMedicationDoseSchedule(schedule);
    if (!normalized) return;
    const id = medicationDoseOccurrenceId(normalized.id, dateKey);
    const existing = occurrenceByIdentity.get(id);
    if (existing) {
      if (existing.status !== "removed" && existing.scheduledDate === dateKey) {
        const item = medicationDoseOccurrenceItem(normalized, dateKey, existing);
        if (item) items.push(item);
      }
      return;
    }
    const item = medicationDoseOccurrenceItem(normalized, dateKey);
    if (item) items.push(item);
  });
  normalizedOccurrences.forEach((occurrence) => {
    if (
      occurrence.status === "removed"
      || occurrence.scheduledDate !== dateKey
      || occurrence.originalDate === dateKey
    ) return;
    const schedule = schedules.find((candidate) => (
      normalizeMedicationDoseSchedule(candidate)?.id === occurrence.scheduleId
    ));
    const item = schedule && medicationDoseOccurrenceItem(schedule, occurrence.originalDate, occurrence);
    if (item) items.push(item);
  });
  return items;
}

export function medicationDoseOccurrenceStatusLabel(status) {
  if (status === "scheduled") return "Scheduled";
  if (status === "completed") return "Taken";
  if (status === "skipped") return "Skipped";
  if (status === "removed") return "Removed";
  return "";
}

export function nextMedicationDoseOccurrence(schedule, occurrences, fromDate = medicationDoseDateKey()) {
  const normalizedSchedule = normalizeMedicationDoseSchedule(schedule);
  if (
    !normalizedSchedule
    || normalizedSchedule.status !== "active"
    || !Array.isArray(occurrences)
    || !isValidMedicationDoseDate(fromDate)
  ) return null;
  const normalizedOccurrences = occurrences
    .map(normalizeMedicationDoseOccurrence)
    .filter((occurrence) => occurrence?.scheduleId === normalizedSchedule.id);
  const revision = currentMedicationDoseRevision(normalizedSchedule);
  const nextStoredOccurrence = normalizedOccurrences
    .filter((occurrence) => occurrence.status === "scheduled" && occurrence.scheduledDate >= fromDate)
    .sort((first, second) => (
      first.scheduledDate.localeCompare(second.scheduledDate)
      || first.time.localeCompare(second.time)
    ))[0] || null;
  const generatedThrough = normalizedSchedule.inactiveFrom
    ? shiftMedicationDoseDate(normalizedSchedule.inactiveFrom, -1)
    : revision.endDate;
  const daysUntilStart = Math.max(0, dateDifference(revision.startDate, fromDate));
  const horizonDays = daysUntilStart
    + (normalizedOccurrences.length + 1) * MAX_MEDICATION_DOSE_INTERVAL_DAYS
    + 7;
  let date = fromDate;
  for (let offset = 0; date && offset <= horizonDays; offset += 1) {
    if (generatedThrough && date > generatedThrough) break;
    const next = medicationDoseOccurrencesForDate(
      [normalizedSchedule],
      normalizedOccurrences,
      date
    )
      .filter(({ status }) => status === "scheduled")
      .sort((first, second) => first.time.localeCompare(second.time))[0];
    if (next) return next;
    date = shiftMedicationDoseDate(date, 1);
  }
  return nextStoredOccurrence;
}

export function medicationDoseSchedulePresentation(
  schedule,
  occurrences,
  dateKey = medicationDoseDateKey()
) {
  const normalizedSchedule = normalizeMedicationDoseSchedule(schedule);
  if (!normalizedSchedule || !Array.isArray(occurrences) || !isValidMedicationDoseDate(dateKey)) return null;
  const revision = currentMedicationDoseRevision(normalizedSchedule);
  const normalizedOccurrences = occurrences
    .map(normalizeMedicationDoseOccurrence)
    .filter((occurrence) => occurrence?.scheduleId === normalizedSchedule.id);

  if (revision.repeat.type === "once") {
    const occurrence = normalizedOccurrences.find(({ originalDate }) => originalDate === revision.startDate)
      || medicationDoseOccurrenceItem(normalizedSchedule, revision.startDate);
    return {
      type: "once",
      statusLabel: occurrence
        ? medicationDoseOccurrenceStatusLabel(occurrence.status)
        : "Removed",
      occurrence,
      lifecycleLabel: null,
      todayOccurrence: null,
      nextOccurrence: null,
    };
  }

  const visibleTodayOccurrences = medicationDoseOccurrencesForDate(
    [normalizedSchedule],
    normalizedOccurrences,
    dateKey
  ).sort((first, second) => first.time.localeCompare(second.time));
  const removedTodayOccurrence = normalizedOccurrences
    .filter((occurrence) => occurrence.status === "removed" && occurrence.scheduledDate === dateKey)
    .sort((first, second) => first.time.localeCompare(second.time))[0] || null;
  const todayOccurrence = visibleTodayOccurrences[0] || removedTodayOccurrence;
  const lifecycleLabel = normalizedSchedule.status === "active"
    ? "Active schedule"
    : normalizedSchedule.status === "ended"
      ? "Ended schedule"
      : "Deleted schedule";
  const lifecycleText = normalizedSchedule.status === "active"
    ? "Schedule active"
    : normalizedSchedule.status === "ended"
      ? "Schedule ended"
      : "Schedule deleted";

  return {
    type: "recurring",
    statusLabel: null,
    occurrence: null,
    primaryStatusLabel: normalizedSchedule.status !== "active"
      ? lifecycleLabel
      : todayOccurrence
      ? `${medicationDoseOccurrenceStatusLabel(todayOccurrence.status)} today`
      : lifecycleLabel,
    lifecycleLabel,
    lifecycleText,
    todayOccurrence,
    nextOccurrence: normalizedSchedule.status === "active"
      ? nextMedicationDoseOccurrence(normalizedSchedule, normalizedOccurrences, dateKey)
      : null,
  };
}

function occurrenceFromItem(item, values, now = new Date()) {
  const timestamp = timestampFromDate(now);
  if (!item || !timestamp) return null;
  const existing = item.occurrence ? normalizeMedicationDoseOccurrence(item.occurrence) : null;
  const base = {
    schemaVersion: MEDICATION_DOSE_OCCURRENCE_SCHEMA_VERSION,
    id: medicationDoseOccurrenceId(item.scheduleId, item.originalDate),
    scheduleId: item.scheduleId,
    originalDate: item.originalDate,
    originalTime: item.originalTime,
    scheduledDate: item.scheduledDate,
    time: item.time,
    status: "scheduled",
    snapshot: item.snapshot,
    completedAt: null,
    skippedAt: null,
    removedAt: null,
    rescheduledAt: item.scheduledDate !== item.originalDate || item.time !== item.originalTime
      ? existing?.rescheduledAt || timestamp
      : null,
    skipReason: "",
    customSkipReason: "",
    historyEntryId: null,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
    ...values,
  };
  return normalizeMedicationDoseOccurrence(base);
}

export function completeMedicationDoseOccurrence(item, now = new Date()) {
  if (item?.status === "completed") {
    return normalizeMedicationDoseOccurrence(item.occurrence || item);
  }
  const timestamp = timestampFromDate(now);
  if (!timestamp || item?.status === "removed") return null;
  const id = medicationDoseOccurrenceId(item.scheduleId, item.originalDate);
  return occurrenceFromItem(item, {
    status: "completed",
    completedAt: timestamp,
    skippedAt: null,
    skipReason: "",
    customSkipReason: "",
    historyEntryId: medicationDoseHistoryEntryId(id),
  }, now);
}

export function skipMedicationDoseOccurrence(item, reason = "", customReason = "", now = new Date()) {
  if (["completed", "removed"].includes(item?.status)) return null;
  const timestamp = timestampFromDate(now);
  if (!timestamp || (customReason && reason !== "Other")) return null;
  return occurrenceFromItem(item, {
    status: "skipped",
    skippedAt: timestamp,
    skipReason: text(reason),
    customSkipReason: reason === "Other" ? text(customReason) : "",
  }, now);
}

export function rescheduleMedicationDoseOccurrence(item, scheduledDate, time, now = new Date()) {
  if (
    item?.status === "completed"
    || item?.status === "removed"
    || !isValidMedicationDoseDate(scheduledDate)
    || !isValidMedicationDoseTime(time)
  ) return null;
  const timestamp = timestampFromDate(now);
  if (!timestamp) return null;
  return occurrenceFromItem(item, {
    scheduledDate,
    time,
    status: "scheduled",
    skippedAt: null,
    skipReason: "",
    customSkipReason: "",
    rescheduledAt: scheduledDate !== item.originalDate || time !== item.originalTime ? timestamp : null,
  }, now);
}

export function removeMedicationDoseOccurrence(item, now = new Date()) {
  if (item?.status === "completed" || item?.status === "removed") return null;
  const timestamp = timestampFromDate(now);
  if (!timestamp) return null;
  return occurrenceFromItem(item, {
    status: "removed",
    removedAt: timestamp,
    skippedAt: null,
    skipReason: "",
    customSkipReason: "",
  }, now);
}

export function upsertMedicationDoseOccurrence(occurrences, occurrence) {
  const normalized = normalizeMedicationDoseOccurrence(occurrence);
  if (!Array.isArray(occurrences) || !normalized) return null;
  return [...occurrences.filter(({ id }) => id !== normalized.id), normalized];
}

export function emptyMedicationDoseScheduleCollection() {
  return { schemaVersion: MEDICATION_DOSE_SCHEDULE_COLLECTION_SCHEMA_VERSION, schedules: [] };
}

export function normalizeMedicationDoseScheduleCollection(value) {
  if (
    !isObject(value)
    || value.schemaVersion !== MEDICATION_DOSE_SCHEDULE_COLLECTION_SCHEMA_VERSION
    || !Array.isArray(value.schedules)
  ) return null;
  const ids = new Set();
  const schedules = [];
  for (const candidate of value.schedules) {
    const schedule = normalizeMedicationDoseSchedule(candidate);
    if (!schedule || ids.has(schedule.id)) return null;
    ids.add(schedule.id);
    schedules.push(schedule);
  }
  return { schemaVersion: MEDICATION_DOSE_SCHEDULE_COLLECTION_SCHEMA_VERSION, schedules };
}

export function emptyMedicationDoseOccurrenceCollection() {
  return { schemaVersion: MEDICATION_DOSE_OCCURRENCE_COLLECTION_SCHEMA_VERSION, occurrences: [] };
}

export function normalizeMedicationDoseOccurrenceCollection(value) {
  if (
    !isObject(value)
    || value.schemaVersion !== MEDICATION_DOSE_OCCURRENCE_COLLECTION_SCHEMA_VERSION
    || !Array.isArray(value.occurrences)
  ) return null;
  const ids = new Set();
  const occurrences = [];
  for (const candidate of value.occurrences) {
    const occurrence = normalizeMedicationDoseOccurrence(candidate);
    if (!occurrence || ids.has(occurrence.id)) return null;
    ids.add(occurrence.id);
    occurrences.push(occurrence);
  }
  return { schemaVersion: MEDICATION_DOSE_OCCURRENCE_COLLECTION_SCHEMA_VERSION, occurrences };
}

export function readMedicationDoseSchedules(storage = localStorage) {
  const raw = storage.getItem(MEDICATION_DOSE_SCHEDULES_STORAGE_KEY);
  if (raw === null) return [];
  const collection = normalizeMedicationDoseScheduleCollection(JSON.parse(raw));
  if (!collection) throw new Error("Invalid medication dose schedule data.");
  return collection.schedules;
}

export function writeMedicationDoseSchedules(storage = localStorage, schedules) {
  const collection = normalizeMedicationDoseScheduleCollection({
    schemaVersion: MEDICATION_DOSE_SCHEDULE_COLLECTION_SCHEMA_VERSION,
    schedules,
  });
  if (!collection) throw new Error("Invalid medication dose schedule data.");
  storage.setItem(MEDICATION_DOSE_SCHEDULES_STORAGE_KEY, JSON.stringify(collection));
  return collection.schedules;
}

export function readMedicationDoseOccurrences(storage = localStorage) {
  const raw = storage.getItem(MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY);
  if (raw === null) return [];
  const collection = normalizeMedicationDoseOccurrenceCollection(JSON.parse(raw));
  if (!collection) throw new Error("Invalid medication dose occurrence data.");
  return collection.occurrences;
}

export function writeMedicationDoseOccurrences(storage = localStorage, occurrences) {
  const collection = normalizeMedicationDoseOccurrenceCollection({
    schemaVersion: MEDICATION_DOSE_OCCURRENCE_COLLECTION_SCHEMA_VERSION,
    occurrences,
  });
  if (!collection) throw new Error("Invalid medication dose occurrence data.");
  storage.setItem(MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY, JSON.stringify(collection));
  return collection.occurrences;
}

export function formatMedicationDoseRepeat(repeat) {
  const normalized = normalizedRepeat(repeat);
  if (!normalized) return "";
  if (normalized.type === "once") return "One time";
  if (normalized.type === "daily") return "Every day";
  if (normalized.type === "interval") return `Every ${normalized.intervalDays} days`;
  const labels = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return normalized.weekdays.map((day) => labels[day]).join(", ");
}

function medicationDoseItemsForDuplicateCheck(schedules, occurrences, dateKey) {
  const items = medicationDoseOccurrencesForDate(schedules, occurrences, dateKey);
  if (!Array.isArray(occurrences)) return items;
  const ids = new Set(items.map(({ id }) => id));
  occurrences.map(normalizeMedicationDoseOccurrence).filter(Boolean).forEach((occurrence) => {
    if (occurrence.scheduledDate === dateKey && !ids.has(occurrence.id)) {
      items.push(occurrence);
      ids.add(occurrence.id);
    }
  });
  return items;
}

export function findMedicationDoseDuplicate(
  schedules,
  occurrences,
  candidate,
  { excludeScheduleId = null, excludeOccurrenceId = null, horizonDays = 366 } = {}
) {
  const schedule = normalizeMedicationDoseSchedule(candidate);
  if (!schedule) return null;
  const revision = currentMedicationDoseRevision(schedule);
  let date = revision.startDate > revision.effectiveFrom
    ? revision.startDate
    : revision.effectiveFrom;
  const horizonEnd = shiftMedicationDoseDate(date, horizonDays);
  const lastDate = revision.endDate && revision.endDate < horizonEnd
    ? revision.endDate
    : horizonEnd;
  while (date && date <= lastDate) {
    if (medicationDoseScheduleOccursOnDate(schedule, date)) {
      const existing = medicationDoseItemsForDuplicateCheck(schedules, occurrences, date).find((item) => {
        if (item.scheduleId === excludeScheduleId || item.id === excludeOccurrenceId) return false;
        if (item.time !== revision.time) return false;
        const sameSource = item.snapshot.source?.id && revision.source?.id
          ? item.snapshot.source.id === revision.source.id
          : false;
        return sameSource || normalizeCompoundName(item.snapshot.name) === normalizeCompoundName(revision.name);
      });
      if (existing) return { existing, date, time: revision.time };
    }
    date = shiftMedicationDoseDate(date, 1);
  }
  return null;
}

export function findMedicationDoseOccurrenceDuplicate(
  schedules,
  occurrences,
  candidate,
  { excludeOccurrenceId = null } = {}
) {
  if (
    !candidate?.snapshot
    || !isValidMedicationDoseDate(candidate.scheduledDate)
    || !isValidMedicationDoseTime(candidate.time)
  ) return null;
  return medicationDoseItemsForDuplicateCheck(
    schedules,
    occurrences,
    candidate.scheduledDate
  ).find((item) => {
    if (item.id === excludeOccurrenceId || item.time !== candidate.time) return false;
    const candidateSourceId = candidate.snapshot.source?.id;
    const itemSourceId = item.snapshot.source?.id;
    return candidateSourceId && itemSourceId
      ? candidateSourceId === itemSourceId
      : normalizeCompoundName(item.snapshot.name) === normalizeCompoundName(candidate.snapshot.name);
  }) || null;
}

export function createMedicationHistoryEntryForDose(occurrence, now = new Date()) {
  const normalized = normalizeMedicationDoseOccurrence(occurrence);
  const timestamp = timestampFromDate(now);
  if (!normalized || normalized.status !== "completed" || !timestamp) return null;
  return {
    id: normalized.historyEntryId,
    schemaVersion: 1,
    name: normalized.snapshot.name,
    dose: { ...normalized.snapshot.dose },
    route: { ...normalized.snapshot.route },
    occurredAt: timestamp,
    notes: normalized.snapshot.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(normalized.snapshot.compoundReference
      ? { compoundReference: { ...normalized.snapshot.compoundReference } }
      : {}),
    scheduledDoseOccurrenceId: normalized.id,
    scheduledDoseScheduleId: normalized.scheduleId,
    scheduledFor: { date: normalized.scheduledDate, time: normalized.time },
  };
}

function restoreRaw(storage, key, raw) {
  if (raw === null) storage.removeItem(key);
  else storage.setItem(key, raw);
}

function persistMedicationDoseTransaction({
  storage,
  id,
  operation,
  nextEntries,
  nextOccurrences,
}) {
  const previousEntriesRaw = storage.getItem("medicationEntries");
  const previousOccurrencesRaw = storage.getItem(MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY);
  const nextEntriesRaw = JSON.stringify(nextEntries);
  const nextOccurrencesRaw = JSON.stringify({
    schemaVersion: MEDICATION_DOSE_OCCURRENCE_COLLECTION_SCHEMA_VERSION,
    occurrences: nextOccurrences,
  });
  const transaction = {
    schemaVersion: MEDICATION_DOSE_COMPLETION_TRANSACTION_SCHEMA_VERSION,
    id,
    operation,
    previous: { medicationEntries: previousEntriesRaw, medicationDoseOccurrences: previousOccurrencesRaw },
    next: { medicationEntries: nextEntriesRaw, medicationDoseOccurrences: nextOccurrencesRaw },
  };

  storage.setItem(MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY, JSON.stringify(transaction));
  try {
    storage.setItem("medicationEntries", nextEntriesRaw);
    storage.setItem(MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY, nextOccurrencesRaw);
    storage.removeItem(MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY);
  } catch (error) {
    let rolledBack = true;
    try {
      restoreRaw(storage, "medicationEntries", previousEntriesRaw);
      restoreRaw(storage, MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY, previousOccurrencesRaw);
      storage.removeItem(MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY);
    } catch (rollbackError) {
      rolledBack = false;
    }
    const action = operation === "undo-completion"
      ? "Medication dose completion undo"
      : "Medication dose completion";
    const failure = new Error(
      rolledBack
        ? `${action} could not be saved; previous data was restored.`
        : `${action} is pending recovery. Do not close this page.`
    );
    failure.cause = error;
    throw failure;
  }
}

export function persistMedicationDoseCompletion({
  storage = localStorage,
  medicationEntries,
  occurrences,
  item,
  now = new Date(),
}) {
  if (item?.status === "completed") {
    const completed = completeMedicationDoseOccurrence(item, now);
    if (!completed) return null;
    const historyEntry = medicationEntries.find(
      (entry) => entry.id === completed.historyEntryId
        && entry.scheduledDoseOccurrenceId === completed.id
    );
    return {
      medicationEntries,
      occurrences,
      occurrence: completed,
      historyEntry,
      alreadyCompleted: true,
    };
  }
  const occurrence = completeMedicationDoseOccurrence(item, now);
  if (!occurrence) return null;
  const historyById = medicationEntries.find((entry) => entry.id === occurrence.historyEntryId);
  const historyByOccurrence = medicationEntries.find(
    (entry) => entry.scheduledDoseOccurrenceId === occurrence.id
  );
  if (
    (historyById && historyById.scheduledDoseOccurrenceId !== occurrence.id)
    || (historyByOccurrence && historyByOccurrence.id !== occurrence.historyEntryId)
  ) return null;
  const existingHistory = historyByOccurrence || historyById;
  const historyEntry = existingHistory || createMedicationHistoryEntryForDose(occurrence, now);
  if (!historyEntry) return null;
  const nextEntries = existingHistory ? [...medicationEntries] : [...medicationEntries, historyEntry];
  const nextOccurrences = upsertMedicationDoseOccurrence(occurrences, occurrence);
  if (!nextOccurrences) return null;

  persistMedicationDoseTransaction({
    storage,
    id: occurrence.id,
    operation: "complete",
    nextEntries,
    nextOccurrences,
  });
  return { medicationEntries: nextEntries, occurrences: nextOccurrences, occurrence, historyEntry, alreadyCompleted: false };
}

export function undoMedicationDoseCompletion(item, now = new Date()) {
  const occurrence = normalizeMedicationDoseOccurrence(item?.occurrence || item);
  const timestamp = timestampFromDate(now);
  if (!occurrence || !timestamp) return null;
  if (occurrence.status === "scheduled") return occurrence;
  if (occurrence.status !== "completed") return null;
  return normalizeMedicationDoseOccurrence({
    ...occurrence,
    status: "scheduled",
    completedAt: null,
    historyEntryId: null,
    updatedAt: timestamp,
  });
}

export function persistMedicationDoseCompletionUndo({
  storage = localStorage,
  medicationEntries,
  occurrences,
  item,
  now = new Date(),
}) {
  if (!Array.isArray(medicationEntries) || !Array.isArray(occurrences)) return null;
  const completed = normalizeMedicationDoseOccurrence(item?.occurrence || item);
  if (!completed) return null;
  if (completed.status === "scheduled") {
    return {
      medicationEntries,
      occurrences,
      occurrence: completed,
      removedHistoryEntry: null,
      alreadyUndone: true,
    };
  }
  if (completed.status !== "completed") return null;
  const occurrence = undoMedicationDoseCompletion(completed, now);
  if (!occurrence) return null;
  const linkedHistoryEntry = medicationEntries.find((entry) => (
    entry.id === completed.historyEntryId
    && entry.scheduledDoseOccurrenceId === completed.id
    && entry.scheduledDoseScheduleId === completed.scheduleId
  )) || null;
  const nextEntries = linkedHistoryEntry
    ? medicationEntries.filter((entry) => entry !== linkedHistoryEntry)
    : [...medicationEntries];
  const nextOccurrences = upsertMedicationDoseOccurrence(occurrences, occurrence);
  if (!nextOccurrences) return null;

  persistMedicationDoseTransaction({
    storage,
    id: occurrence.id,
    operation: "undo-completion",
    nextEntries,
    nextOccurrences,
  });
  return {
    medicationEntries: nextEntries,
    occurrences: nextOccurrences,
    occurrence,
    removedHistoryEntry: linkedHistoryEntry,
    alreadyUndone: false,
  };
}

export function recoverPendingMedicationDoseCompletion(storage = localStorage) {
  const raw = storage.getItem(MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY);
  if (raw === null) return false;
  const transaction = JSON.parse(raw);
  if (
    !isObject(transaction)
    || transaction.schemaVersion !== MEDICATION_DOSE_COMPLETION_TRANSACTION_SCHEMA_VERSION
    || (transaction.operation !== undefined && !DOSE_TRANSACTION_OPERATIONS.has(transaction.operation))
    || !isObject(transaction.previous)
    || !(transaction.previous.medicationEntries === null
      || typeof transaction.previous.medicationEntries === "string")
    || !(transaction.previous.medicationDoseOccurrences === null
      || typeof transaction.previous.medicationDoseOccurrences === "string")
    || !isObject(transaction.next)
    || typeof transaction.next.medicationEntries !== "string"
    || typeof transaction.next.medicationDoseOccurrences !== "string"
  ) throw new Error("Invalid pending medication dose completion transaction.");
  const pendingMedicationEntries = JSON.parse(transaction.next.medicationEntries);
  const pendingOccurrences = normalizeMedicationDoseOccurrenceCollection(
    JSON.parse(transaction.next.medicationDoseOccurrences)
  );
  if (!Array.isArray(pendingMedicationEntries) || !pendingOccurrences) {
    throw new Error("Invalid pending medication dose completion transaction.");
  }
  try {
    storage.setItem("medicationEntries", transaction.next.medicationEntries);
    storage.setItem(MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY, transaction.next.medicationDoseOccurrences);
    storage.removeItem(MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY);
  } catch (error) {
    let rolledBack = true;
    try {
      restoreRaw(storage, "medicationEntries", transaction.previous.medicationEntries);
      restoreRaw(storage, MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY, transaction.previous.medicationDoseOccurrences);
      storage.removeItem(MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY);
    } catch (rollbackError) {
      rolledBack = false;
    }
    const failure = new Error(
      rolledBack
        ? "Pending medication dose update could not be recovered; previous data was restored."
        : "Medication dose update is still pending recovery."
    );
    failure.cause = error;
    throw failure;
  }
  return true;
}
