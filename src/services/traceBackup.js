import {
  getAllPhotos,
  getAllMedia,
  openPhotoDatabase,
  replaceAllMedia,
  replaceAllPhotos,
} from "../storage/photoStorage";
import packageMetadata from "../../package.json";
import { normalizeAppSettings } from "./appSettings";
import { normalizePlannedWorkouts } from "./plannedWorkout";
import { normalizeWorkoutDraft } from "./workoutDraft";
import { normalizeMemoryDraft } from "./memoryDraft";
import { normalizeTimeCapsule, normalizeTimeCapsuleDraft } from "./timeCapsule";
import { emptyFormDraftCollection, normalizeFormDraftCollection } from "./formDrafts";
import { normalizeWorkoutTemplates } from "./workoutTemplate";
import { normalizeJournalDraft } from "./journalEntry";
import {
  TRACE_BACKUP_STORAGE_KEYS,
  TRACE_RECOVERABLE_TRANSACTION_KEYS,
} from "./storageDomainManifest";
import {
  emptyWaterCollection,
  normalizeWaterCollection,
} from "./waterTracker";
import {
  emptyDailyActionCollection,
  normalizeDailyActionCollection,
} from "./dailyAction";
import {
  emptyProtocolOccurrenceCollection,
  normalizeProtocolOccurrenceCollection,
} from "./protocolOccurrence";
import {
  defaultInjectionSiteSettings,
  emptyInjectionSiteCollection,
  normalizeInjectionSiteCollection,
  normalizeInjectionSiteSettings,
} from "./injectionSite";
import {
  emptyMedicationDoseOccurrenceCollection,
  emptyMedicationDoseScheduleCollection,
  MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY,
  normalizeMedicationDoseOccurrenceCollection,
  normalizeMedicationDoseScheduleCollection,
  recoverPendingMedicationDoseCompletion,
} from "./medicationDoseSchedule";
import {
  emptyProtocolCompoundOutcomeCollection,
  normalizeProtocolCompoundOutcomeCollection,
  PROTOCOL_COMPOUND_TRANSACTION_KEY,
  recoverPendingProtocolCompoundTransaction,
} from "./protocolCompoundOutcome";
import {
  encryptBackupJournalWithSession,
  JOURNAL_VAULT_STORAGE_KEY,
  JOURNAL_VAULT_TRANSACTION_KEY,
  recoverJournalVaultTransaction,
  validateJournalVaultPayload,
} from "./journalVault";
import {
  journalRecoveryFormat,
  unlockJournalVaultEnvelope,
  validateJournalVaultEnvelope,
} from "./journalVaultCrypto";
import {
  normalizeNutritionEntryPortions,
  validateTraceStructuredDomains,
} from "./traceBackupValidation";
import { preserveNutritionRecoveryBeforeReplacement } from "./nutritionEntryStorage";
import {
  sha256Bytes,
  sha256CanonicalJson,
  TRACE_BACKUP_HASH_ALGORITHM,
  TRACE_BACKUP_INTEGRITY_FORMAT,
  TRACE_BACKUP_INTEGRITY_VERSION,
  validateIntegrityManifestShape,
} from "./traceBackupIntegrity";

export const TRACE_BACKUP_FORMAT = "trace-backup";
export const TRACE_BACKUP_SCHEMA_VERSION = 9;
export const TRACE_STORAGE_KEYS = TRACE_BACKUP_STORAGE_KEYS;
export const TRACE_BACKUP_LARGE_WARNING_BYTES = 128 * 1024 * 1024;
const TRACE_BACKUP_MEMORY_RESERVE_BYTES = 16 * 1024 * 1024;
const TRACE_STORAGE_KEYS_V8 = TRACE_STORAGE_KEYS.filter((key) => !["timeCapsules", "timeCapsuleDraft", "timeCapsuleReminders"].includes(key));
const TRACE_STORAGE_KEYS_V7 = TRACE_STORAGE_KEYS_V8.filter((key) => key !== "formDrafts");
const TRACE_STORAGE_KEYS_V6 = TRACE_STORAGE_KEYS_V7.filter((key) => key !== "memoryDraft");
const TRACE_STORAGE_KEYS_V5 = TRACE_STORAGE_KEYS_V6.filter((key) => key !== "workoutTemplates");

const OBJECT_KEYS = new Set(["nutritionGoals", "appSettings"]);
const SPECIAL_KEYS = new Set(["waterEntries", "formDrafts", "memoryDraft", "timeCapsuleDraft", "workoutDraft", "dailyActions", "protocolOccurrences", "protocolCompoundOutcomes", "injectionSiteEntries", "injectionSiteSettings", "medicationDoseSchedules", "medicationDoseOccurrences", "journalDraft", JOURNAL_VAULT_STORAGE_KEY]);
const ARRAY_KEYS = new Set(TRACE_STORAGE_KEYS.filter(
  (key) => !OBJECT_KEYS.has(key) && !SPECIAL_KEYS.has(key)
));
const LEGACY_OPTIONAL_KEYS = new Set(["healthMeasurementEntries", "appSettings", "journalEntries", "journalDraft", JOURNAL_VAULT_STORAGE_KEY, "plannedWorkouts", "workoutTemplates", "waterEntries", "dailyActions", "protocolOccurrences", "protocolCompoundOutcomes", "injectionSiteEntries", "injectionSiteSettings", "medicationDoseSchedules", "medicationDoseOccurrences", "formDrafts", "memoryDraft", "timeCapsules", "timeCapsuleDraft", "timeCapsuleReminders", "workoutDraft"]);
const RECOVERABLE_BACKUP_TRANSACTIONS = Object.freeze([
  {
    key: JOURNAL_VAULT_TRANSACTION_KEY,
    label: "Journal Privacy Lock",
    recover: recoverJournalVaultTransaction,
  },
  {
    key: MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY,
    label: "medication dose",
    recover: recoverPendingMedicationDoseCompletion,
  },
  {
    key: PROTOCOL_COMPOUND_TRANSACTION_KEY,
    label: "Protocol result",
    recover: recoverPendingProtocolCompoundTransaction,
  },
]);

function pendingTransactionError(label, error) {
  const detail = error?.message ? ` Automatic recovery could not finish: ${error.message}` : "";
  return new Error(
    `Backup is blocked because an interrupted ${label} transaction is still pending.${detail}`
  );
}

export function recoverPendingBackupTransactions(storage = localStorage) {
  RECOVERABLE_BACKUP_TRANSACTIONS.forEach(({ key, label, recover }) => {
    if (storage.getItem(key) === null) return;
    try {
      recover(storage);
    } catch (error) {
      if (storage.getItem(key) !== null) throw pendingTransactionError(label, error);
    }
    if (storage.getItem(key) !== null) throw pendingTransactionError(label);
  });
}

function assertNoPendingBackupTransactions(storage) {
  const pending = RECOVERABLE_BACKUP_TRANSACTIONS.find(({ key }) => storage.getItem(key) !== null);
  if (pending) throw pendingTransactionError(pending.label);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function encodePhoto(record, cryptoProvider) {
  if (!record?.id || !(record.blob instanceof Blob)) {
    throw new Error("A stored Trace photo is malformed.");
  }
  const buffer = typeof record.blob.arrayBuffer === "function"
    ? await record.blob.arrayBuffer()
    : await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("Trace could not read a stored photo."));
      reader.readAsArrayBuffer(record.blob);
    });
  const bytes = new Uint8Array(buffer);
  const { blob, ...metadata } = record;
  const photo = {
    ...cloneJson(metadata),
    blob: {
      type: blob.type || "application/octet-stream",
      size: bytes.byteLength,
      base64: bytesToBase64(bytes),
    },
  };
  return {
    photo,
    integrity: {
      id: String(record.id),
      size: bytes.byteLength,
      digest: await sha256Bytes(bytes, cryptoProvider),
    },
  };
}

function utf8ByteLength(value) {
  if (typeof TextEncoder === "function") return new TextEncoder().encode(value).byteLength;
  if (typeof Blob === "function") return new Blob([value]).size;
  return unescape(encodeURIComponent(value)).length;
}

function encodedBase64Length(byteLength) {
  return 4 * Math.ceil(byteLength / 3);
}

function estimateBinaryRecords(records, label) {
  let bytes = 0; let encodedBytes = 0; let largestBytes = 0;
  records.forEach((record) => {
    if (!record?.id || !(record.blob instanceof Blob)) throw new Error(`A stored Trace ${label} is malformed.`);
    const { blob, ...metadata } = record;
    bytes += blob.size; largestBytes = Math.max(largestBytes, blob.size);
    encodedBytes += utf8ByteLength(JSON.stringify({ ...cloneJson(metadata), blob: { type: blob.type || "application/octet-stream", size: blob.size, base64: "" } })) + encodedBase64Length(blob.size);
  });
  return { bytes, encodedBytes, largestBytes };
}

function estimateBackupFromSource(structured, photos, media = []) {
  const structuredBytes = utf8ByteLength(JSON.stringify(structured));
  const photoEstimate = estimateBinaryRecords(photos, "photo");
  const mediaEstimate = estimateBinaryRecords(media, "media attachment");
  const manifestAndEnvelopeBytes = 2048 + (photos.length + media.length) * 180;
  const estimatedBytes = structuredBytes + photoEstimate.encodedBytes + mediaEstimate.encodedBytes + manifestAndEnvelopeBytes;
  return {
    estimatedBytes,
    structuredBytes,
    photoBytes: photoEstimate.bytes,
    mediaBytes: mediaEstimate.bytes,
    encodedPhotoBytes: photoEstimate.encodedBytes,
    encodedMediaBytes: mediaEstimate.encodedBytes,
    largestPhotoBytes: photoEstimate.largestBytes,
    largestMediaBytes: mediaEstimate.largestBytes,
    photoCount: photos.length,
    mediaCount: media.length,
    isLarge: estimatedBytes >= TRACE_BACKUP_LARGE_WARNING_BYTES,
  };
}

function defaultPerformance() {
  return typeof performance === "undefined" ? undefined : performance;
}

function assertBackupMemorySafety(estimate, performanceObject = defaultPerformance()) {
  const memory = performanceObject?.memory;
  const limit = Number(memory?.jsHeapSizeLimit);
  const used = Number(memory?.usedJSHeapSize);
  if (!Number.isFinite(limit) || !Number.isFinite(used) || limit <= used) return;
  const available = limit - used;
  const required = estimate.estimatedBytes +
    Math.max(estimate.largestPhotoBytes, estimate.largestMediaBytes || 0) * 3 +
    estimate.structuredBytes * 2 +
    TRACE_BACKUP_MEMORY_RESERVE_BYTES;
  if (available < required) {
    throw new Error(
      "This browser does not report enough working memory to safely assemble the backup. Close other tabs or apps, restart Trace, and try again. No backup file was created and saved data was not changed."
    );
  }
}

async function readBackupSource(storage, openDatabase) {
  recoverPendingBackupTransactions(storage);
  const database = await openDatabase();
  const photos = await getAllPhotos(database);
  const media = await getAllMedia(database);
  assertNoPendingBackupTransactions(storage);
  const structured = readStructuredData(storage);
  if (Array.isArray(structured.nutritionEntries)) {
    structured.nutritionEntries = normalizeNutritionEntryPortions(structured.nutritionEntries);
  }
  assertNoPendingBackupTransactions(storage);
  return { structured, photos, media };
}

export function formatTraceBackupSize(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${value} bytes`;
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KiB`;
  const mib = value / (1024 * 1024);
  return `${mib >= 10 ? Math.ceil(mib) : mib.toFixed(1)} MiB`;
}

export async function estimateTraceBackupSize({
  storage = localStorage,
  openDatabase = openPhotoDatabase,
} = {}) {
  const { structured, photos, media } = await readBackupSource(storage, openDatabase);
  return estimateBackupFromSource(structured, photos, media);
}

function storageKeysForSchema(schemaVersion) {
  if (schemaVersion >= 9) return TRACE_STORAGE_KEYS;
  if (schemaVersion === 8) return TRACE_STORAGE_KEYS_V8;
  if (schemaVersion === 7) return TRACE_STORAGE_KEYS_V7;
  if (schemaVersion === 6) return TRACE_STORAGE_KEYS_V6;
  return TRACE_STORAGE_KEYS_V5;
}

function decodePhotoBytes(record) {
  const encoded = record?.blob;
  if (!record?.id || !encoded || typeof encoded.base64 !== "string" || typeof encoded.type !== "string") {
    throw new Error("The backup contains a malformed photo.");
  }
  let bytes;
  try {
    bytes = base64ToBytes(encoded.base64);
  } catch (error) {
    throw new Error("The backup contains invalid photo data.");
  }
  if (Number.isFinite(encoded.size) && bytes.byteLength !== encoded.size) {
    throw new Error("A backup photo did not match its recorded size.");
  }
  const metadata = { ...record };
  delete metadata.blob;
  return { metadata: cloneJson(metadata), bytes, type: encoded.type };
}

function decodePhoto(record) {
  const decoded = decodePhotoBytes(record);
  return { ...decoded.metadata, blob: new Blob([decoded.bytes], { type: decoded.type }) };
}

function readStructuredData(storage) {
  let protocols = [];
  try {
    const rawProtocols = storage.getItem("protocols");
    protocols = rawProtocols ? JSON.parse(rawProtocols) : [];
    if (!Array.isArray(protocols)) protocols = [];
  } catch (error) { protocols = []; }
  return Object.fromEntries(TRACE_STORAGE_KEYS.map((key) => {
    const raw = storage.getItem(key);
    if (raw === null && key === "dailyActions") {
      return [key, emptyDailyActionCollection()];
    }
    if (raw === null && key === "waterEntries") {
      return [key, emptyWaterCollection()];
    }
    if (raw === null && key === "protocolOccurrences") {
      return [key, emptyProtocolOccurrenceCollection()];
    }
    if (raw === null && key === "protocolCompoundOutcomes") {
      return [key, emptyProtocolCompoundOutcomeCollection()];
    }
    if (raw === null && key === "medicationDoseSchedules") {
      return [key, emptyMedicationDoseScheduleCollection()];
    }
    if (raw === null && key === "medicationDoseOccurrences") {
      return [key, emptyMedicationDoseOccurrenceCollection()];
    }
    if (raw === null && key === "injectionSiteEntries") {
      return [key, emptyInjectionSiteCollection()];
    }
    if (raw === null && key === "injectionSiteSettings") {
      return [key, defaultInjectionSiteSettings()];
    }
    if (raw === null && key === "formDrafts") {
      return [key, emptyFormDraftCollection()];
    }
    if (raw === null) return [key, null];
    try {
      const parsed = JSON.parse(raw);
      if (key === "waterEntries") {
        const normalized = normalizeWaterCollection(parsed);
        if (!normalized) throw new Error("Invalid water entry data.");
        return [key, normalized];
      }
      if (key === "workoutDraft") {
        if (parsed === null) return [key, null];
        const normalized = normalizeWorkoutDraft(parsed);
        if (!normalized) throw new Error("Invalid workout draft data.");
        return [key, normalized];
      }
      if (key === "memoryDraft") {
        const normalized = normalizeMemoryDraft(parsed);
        if (!normalized) throw new Error("Invalid unfinished Memory draft data.");
        return [key, normalized];
      }
      if (key === "timeCapsuleDraft") {
        if (parsed === null) return [key, null];
        const normalized = normalizeTimeCapsuleDraft(parsed);
        if (!normalized) throw new Error("Invalid unfinished Time Capsule draft data.");
        return [key, normalized];
      }
      if (key === "timeCapsules") {
        if (!Array.isArray(parsed)) throw new Error("Invalid Time Capsule data.");
        const normalized = parsed.map(normalizeTimeCapsule);
        if (normalized.some((capsule) => !capsule) || new Set(normalized.map(({ id }) => id)).size !== normalized.length) {
          throw new Error("Invalid Time Capsule data.");
        }
        return [key, normalized];
      }
      if (key === "formDrafts") {
        const normalized = normalizeFormDraftCollection(parsed);
        if (!normalized) throw new Error("Invalid unfinished form draft data.");
        return [key, normalized];
      }
      if (key === "journalDraft") {
        const normalized = normalizeJournalDraft(parsed);
        if (!normalized) throw new Error("Invalid Journal draft data.");
        return [key, normalized];
      }
      if (key === "dailyActions") {
        const normalized = normalizeDailyActionCollection(parsed);
        if (!normalized) throw new Error("Invalid daily action data.");
        return [key, normalized];
      }
      if (key === "protocolOccurrences") {
        const normalized = normalizeProtocolOccurrenceCollection(parsed);
        if (!normalized) throw new Error("Invalid protocol occurrence data.");
        return [key, normalized];
      }
      if (key === "protocolCompoundOutcomes") {
        const normalized = normalizeProtocolCompoundOutcomeCollection(parsed);
        if (!normalized) throw new Error("Invalid protocol compound outcome data.");
        return [key, normalized];
      }
      if (key === "medicationDoseSchedules") {
        const normalized = normalizeMedicationDoseScheduleCollection(parsed);
        if (!normalized) throw new Error("Invalid medication dose schedule data.");
        return [key, normalized];
      }
      if (key === "medicationDoseOccurrences") {
        const normalized = normalizeMedicationDoseOccurrenceCollection(parsed);
        if (!normalized) throw new Error("Invalid medication dose occurrence data.");
        return [key, normalized];
      }
      if (key === "injectionSiteEntries") {
        const normalized = normalizeInjectionSiteCollection(parsed, protocols);
        if (!normalized) throw new Error("Invalid injection site data.");
        return [key, normalized];
      }
      if (key === "injectionSiteSettings") {
        const normalized = normalizeInjectionSiteSettings(parsed);
        if (!normalized) throw new Error("Invalid injection site settings.");
        return [key, normalized];
      }
      if (key === JOURNAL_VAULT_STORAGE_KEY) {
        validateJournalVaultEnvelope(parsed);
        return [key, parsed];
      }
      return [key, key === "appSettings" ? normalizeAppSettings(parsed) : parsed];
    } catch (error) {
      throw new Error(`Trace could not export malformed ${key} data.`);
    }
  }));
}

function validateStructuredData(structuredData, schemaVersion = TRACE_BACKUP_SCHEMA_VERSION) {
  if (!structuredData || typeof structuredData !== "object" || Array.isArray(structuredData)) {
    throw new Error("The backup is missing its structured Trace data.");
  }
  if (schemaVersion >= 4) {
    const missingKey = storageKeysForSchema(schemaVersion).find((key) =>
      !Object.prototype.hasOwnProperty.call(structuredData, key)
    );
    if (missingKey) throw new Error(`The backup is missing its ${missingKey} data.`);
  }
  const excludedKey = TRACE_RECOVERABLE_TRANSACTION_KEYS.find((key) =>
    Object.prototype.hasOwnProperty.call(structuredData, key)
  );
  if (excludedKey) throw new Error("The backup contains internal transaction recovery data.");
  TRACE_STORAGE_KEYS.forEach((key) => {
    const value = structuredData[key];
    if (value === null || (LEGACY_OPTIONAL_KEYS.has(key) && value === undefined)) return;
    if (ARRAY_KEYS.has(key) && !Array.isArray(value)) {
      throw new Error(`The backup contains invalid ${key} data.`);
    }
    if (OBJECT_KEYS.has(key) && (typeof value !== "object" || Array.isArray(value))) {
      throw new Error(`The backup contains invalid ${key} data.`);
    }
  });
  if (
    structuredData.waterEntries !== undefined &&
    structuredData.waterEntries !== null &&
    !normalizeWaterCollection(structuredData.waterEntries)
  ) {
    throw new Error("The backup contains invalid water entry data.");
  }
  if (Array.isArray(structuredData.journalEntries)) {
    const ids = new Set();
    structuredData.journalEntries.forEach((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry) ||
        !entry.id || ids.has(String(entry.id)) || entry.visibility !== "private" ||
        !String(entry.body || "").trim() || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date || "") ||
        !/^\d{2}:\d{2}$/.test(entry.time || "") || !entry.createdAt || Number.isNaN(Date.parse(entry.createdAt)) ||
        !entry.updatedAt || Number.isNaN(Date.parse(entry.updatedAt))) {
        throw new Error("The backup contains invalid Journal data.");
      }
      ids.add(String(entry.id));
    });
  }
  if (
    structuredData.journalDraft !== undefined &&
    structuredData.journalDraft !== null &&
    !normalizeJournalDraft(structuredData.journalDraft)
  ) {
    throw new Error("The backup contains invalid Journal draft data.");
  }
  if (structuredData[JOURNAL_VAULT_STORAGE_KEY] != null) {
    validateJournalVaultEnvelope(structuredData[JOURNAL_VAULT_STORAGE_KEY]);
    if (structuredData.journalEntries != null || structuredData.journalDraft != null) {
      throw new Error("The backup mixes encrypted and plaintext Journal data.");
    }
  }
  if (
    structuredData.plannedWorkouts !== undefined &&
    structuredData.plannedWorkouts !== null &&
    !normalizePlannedWorkouts(structuredData.plannedWorkouts)
  ) {
    throw new Error("The backup contains invalid planned workout data.");
  }
  if (
    structuredData.workoutTemplates !== undefined &&
    structuredData.workoutTemplates !== null &&
    !normalizeWorkoutTemplates(structuredData.workoutTemplates)
  ) {
    throw new Error("The backup contains invalid workout template data.");
  }
  if (
    structuredData.formDrafts !== undefined &&
    structuredData.formDrafts !== null &&
    !normalizeFormDraftCollection(structuredData.formDrafts)
  ) {
    throw new Error("The backup contains invalid unfinished form draft data.");
  }
  if (
    structuredData.memoryDraft !== undefined &&
    structuredData.memoryDraft !== null &&
    !normalizeMemoryDraft(structuredData.memoryDraft)
  ) {
    throw new Error("The backup contains invalid unfinished Memory draft data.");
  }
  if (
    structuredData.workoutDraft !== undefined &&
    structuredData.workoutDraft !== null &&
    !normalizeWorkoutDraft(structuredData.workoutDraft)
  ) {
    throw new Error("The backup contains invalid active workout draft data.");
  }
  if (
    structuredData.dailyActions !== undefined &&
    structuredData.dailyActions !== null &&
    !normalizeDailyActionCollection(structuredData.dailyActions)
  ) {
    throw new Error("The backup contains invalid daily action data.");
  }
  if (
    structuredData.protocolOccurrences !== undefined &&
    structuredData.protocolOccurrences !== null &&
    !normalizeProtocolOccurrenceCollection(structuredData.protocolOccurrences)
  ) {
    throw new Error("The backup contains invalid protocol occurrence data.");
  }
  if (
    structuredData.protocolCompoundOutcomes !== undefined &&
    structuredData.protocolCompoundOutcomes !== null &&
    !normalizeProtocolCompoundOutcomeCollection(structuredData.protocolCompoundOutcomes)
  ) {
    throw new Error("The backup contains invalid Protocol compound outcome data.");
  }
  if (
    structuredData.medicationDoseSchedules !== undefined &&
    structuredData.medicationDoseSchedules !== null &&
    !normalizeMedicationDoseScheduleCollection(structuredData.medicationDoseSchedules)
  ) {
    throw new Error("The backup contains invalid medication dose schedule data.");
  }
  if (
    structuredData.medicationDoseOccurrences !== undefined &&
    structuredData.medicationDoseOccurrences !== null &&
    !normalizeMedicationDoseOccurrenceCollection(structuredData.medicationDoseOccurrences)
  ) {
    throw new Error("The backup contains invalid medication dose occurrence data.");
  }
  if (
    structuredData.injectionSiteEntries !== undefined &&
    structuredData.injectionSiteEntries !== null &&
    !normalizeInjectionSiteCollection(structuredData.injectionSiteEntries, structuredData.protocols || [])
  ) {
    throw new Error("The backup contains invalid injection site data.");
  }
  if (
    structuredData.injectionSiteSettings !== undefined &&
    structuredData.injectionSiteSettings !== null &&
    !normalizeInjectionSiteSettings(structuredData.injectionSiteSettings)
  ) {
    throw new Error("The backup contains invalid injection site settings.");
  }
  validateTraceStructuredDomains(structuredData);
}

function photoReferenceIds(structuredData) {
  const ids = [];
  (structuredData.memoryDraft?.photos || []).forEach((photo) => {
    const id = typeof photo === "string" ? photo : photo?.id;
    if (id) ids.push(id);
  });
  (structuredData.memories || []).forEach((memory) => {
    (memory.images || []).forEach((value) => {
      if (typeof value === "string" && !value.startsWith("data:")) ids.push(value);
    });
  });
  (structuredData.workoutEntries || []).forEach((workout) => {
    (workout.photos || []).forEach((value) => {
      const id = typeof value === "string" ? value : value?.id;
      if (id) ids.push(id);
    });
  });
  return ids;
}

function capsuleMediaOwners(structuredData) {
  const owners = new Map();
  let duplicateId = null;
  (structuredData.timeCapsules || []).forEach((capsule) => capsule.media.forEach((reference) => {
    const { id, kind } = reference;
    if (owners.has(id)) duplicateId = id;
    owners.set(id, { capsuleId: capsule.id, kind, reference });
  }));
  (structuredData.timeCapsuleDraft?.media || []).forEach((reference) => {
    const { id, kind } = reference;
    if (owners.has(id)) duplicateId = id;
    owners.set(id, {
      capsuleId: structuredData.timeCapsuleDraft.capsuleId,
      capsuleDraftId: structuredData.timeCapsuleDraft.id,
      kind,
      reference,
    });
  });
  return { owners, duplicateId };
}

export function summarizeTraceBackup(backup) {
  const data = backup.data.structured;
  return {
    memories: data.memories?.length || 0,
    photos: backup.data.photos.length,
    timeCapsules: data.timeCapsules?.length || 0,
    capsuleMedia: backup.data.media?.length || 0,
    activeTimeCapsuleDraft: Boolean(data.timeCapsuleDraft),
    nutritionEntries: data.nutritionEntries?.length || 0,
    waterEntries: data.waterEntries?.entries?.length || 0,
    healthMeasurementEntries: data.healthMeasurementEntries?.length || 0,
    plannedWorkouts: data.plannedWorkouts?.length || 0,
    workoutTemplates: data.workoutTemplates?.length || 0,
    dailyActions: data.dailyActions?.actions?.length || 0,
    activeWorkoutDraft: Boolean(data.workoutDraft),
    activeMemoryDraft: Boolean(data.memoryDraft),
    activeFormDrafts: data.formDrafts?.entries?.length || 0,
    workouts: data.workoutEntries?.length || 0,
    medicationEntries: data.medicationEntries?.length || 0,
    medicationDoseSchedules: data.medicationDoseSchedules?.schedules?.length || 0,
    medicationDoseOccurrences: data.medicationDoseOccurrences?.occurrences?.length || 0,
    protocols: data.protocols?.length || 0,
    protocolOccurrences: data.protocolOccurrences?.occurrences?.length || 0,
    protocolCompoundOutcomes: data.protocolCompoundOutcomes?.occurrences?.length || 0,
    injectionSiteEntries: data.injectionSiteEntries?.shots?.length || 0,
    trophyCaseEntries: data.trophyCaseEntries?.length || 0,
    savedExercises: data.savedExercises?.length || 0,
    savedCompounds: data.medicationCompounds?.length || 0,
    userFoods: data.userFoods?.length || 0,
    journalEntries: data[JOURNAL_VAULT_STORAGE_KEY] ? null : (data.journalEntries?.length || 0),
    journalDraft: data[JOURNAL_VAULT_STORAGE_KEY] ? null : Boolean(data.journalDraft),
    encryptedJournal: Boolean(data[JOURNAL_VAULT_STORAGE_KEY]),
    journalRecoveryFormat: data[JOURNAL_VAULT_STORAGE_KEY]
      ? journalRecoveryFormat(data[JOURNAL_VAULT_STORAGE_KEY])
      : null,
  };
}

const INTEGRITY_FAILURE_MESSAGE = "This Trace backup failed its integrity check. Existing Trace data was not changed.";

function integrityFailure(error) {
  const detail = error?.message ? ` ${error.message}` : "";
  return new Error(`${INTEGRITY_FAILURE_MESSAGE}${detail}`);
}

async function verifyBackupIntegrity(value, cryptoProvider) {
  try {
    const expectedStorageKeys = storageKeysForSchema(value.schemaVersion);
    const includeMedia = value.schemaVersion >= 9;
    validateIntegrityManifestShape(value.integrity, expectedStorageKeys, { includeMedia });
    if (!value.data?.structured || typeof value.data.structured !== "object" || Array.isArray(value.data.structured)) {
      throw new Error("The backup is missing its structured Trace data.");
    }
    const actualDomains = Object.keys(value.data.structured).sort();
    const expectedDomains = [...expectedStorageKeys].sort();
    if (actualDomains.length !== expectedDomains.length ||
      actualDomains.some((domain, index) => domain !== expectedDomains[index])) {
      throw new Error("The backup structured payload does not match its domain inventory.");
    }
    if (!Array.isArray(value.data?.photos)) throw new Error("The backup is missing its photo collection.");
    if (includeMedia && !Array.isArray(value.data?.media)) throw new Error("The backup is missing its media collection.");
    if (value.integrity.photos.count !== value.data.photos.length) {
      throw new Error("The backup photo count does not match its integrity manifest.");
    }
    const structuredDigest = await sha256CanonicalJson(value.data?.structured, cryptoProvider);
    if (structuredDigest !== value.integrity.structured.digest) {
      throw new Error("The structured Trace data digest does not match.");
    }
    for (let index = 0; index < value.data.photos.length; index += 1) {
      const photo = value.data.photos[index];
      const expected = value.integrity.photos.entries[index];
      if (!photo?.id || photo.id !== expected?.id) {
        throw new Error("The backup photo order or identity does not match its integrity manifest.");
      }
      const decoded = decodePhotoBytes(photo);
      if (decoded.bytes.byteLength !== expected.size) {
        throw new Error(`Backup photo ${photo.id} does not match its integrity size.`);
      }
      const digest = await sha256Bytes(decoded.bytes, cryptoProvider);
      if (digest !== expected.digest) {
        throw new Error(`Backup photo ${photo.id} does not match its integrity digest.`);
      }
    }
    if (includeMedia) {
      if (value.integrity.media.count !== value.data.media.length) throw new Error("The backup media count does not match its integrity manifest.");
      for (let index = 0; index < value.data.media.length; index += 1) {
        const media = value.data.media[index];
        const expected = value.integrity.media.entries[index];
        if (!media?.id || media.id !== expected?.id) throw new Error("The backup media order or identity does not match its integrity manifest.");
        const decoded = decodePhotoBytes(media);
        if (decoded.bytes.byteLength !== expected.size || await sha256Bytes(decoded.bytes, cryptoProvider) !== expected.digest) {
          throw new Error(`Backup media ${media.id} does not match its integrity data.`);
        }
      }
    }
  } catch (error) {
    throw integrityFailure(error);
  }
}

function validateAndNormalizeBackup(value) {
  const normalizedBackup = cloneJson(value);
  if (value.schemaVersion < 9) normalizedBackup.data.media = [];
  if (Array.isArray(normalizedBackup.data?.structured?.nutritionEntries)) {
    normalizedBackup.data.structured.nutritionEntries = normalizeNutritionEntryPortions(
      normalizedBackup.data.structured.nutritionEntries
    );
  }
  validateStructuredData(normalizedBackup.data?.structured, value.schemaVersion);
  TRACE_STORAGE_KEYS.forEach((key) => {
    if (
      normalizedBackup.data.structured[key] === undefined &&
      (value.schemaVersion < 5 || storageKeysForSchema(value.schemaVersion).includes(key))
    ) {
      normalizedBackup.data.structured[key] = null;
    }
  });
  if (normalizedBackup.data.structured.appSettings != null) {
    normalizedBackup.data.structured.appSettings = normalizeAppSettings(
      normalizedBackup.data.structured.appSettings
    );
  }
  normalizedBackup.data.structured.waterEntries = normalizeWaterCollection(
    normalizedBackup.data.structured.waterEntries ?? emptyWaterCollection()
  );
  if (normalizedBackup.data.structured.plannedWorkouts != null) {
    normalizedBackup.data.structured.plannedWorkouts = normalizePlannedWorkouts(
      normalizedBackup.data.structured.plannedWorkouts
    );
  }
  if (normalizedBackup.data.structured.workoutTemplates != null) {
    normalizedBackup.data.structured.workoutTemplates = normalizeWorkoutTemplates(
      normalizedBackup.data.structured.workoutTemplates
    );
  }
  if (normalizedBackup.data.structured.workoutDraft != null) {
    normalizedBackup.data.structured.workoutDraft = normalizeWorkoutDraft(
      normalizedBackup.data.structured.workoutDraft
    );
  }
  if (normalizedBackup.data.structured.memoryDraft != null) {
    normalizedBackup.data.structured.memoryDraft = normalizeMemoryDraft(
      normalizedBackup.data.structured.memoryDraft
    );
  }
  if (normalizedBackup.data.structured.timeCapsuleDraft != null) {
    normalizedBackup.data.structured.timeCapsuleDraft = normalizeTimeCapsuleDraft(
      normalizedBackup.data.structured.timeCapsuleDraft
    );
  }
  if (normalizedBackup.data.structured.timeCapsules != null) {
    normalizedBackup.data.structured.timeCapsules = normalizedBackup.data.structured.timeCapsules
      .map(normalizeTimeCapsule);
  }
  if (
    Object.prototype.hasOwnProperty.call(normalizedBackup.data.structured, "formDrafts") ||
    storageKeysForSchema(value.schemaVersion).includes("formDrafts")
  ) {
    normalizedBackup.data.structured.formDrafts = normalizeFormDraftCollection(
      normalizedBackup.data.structured.formDrafts ?? emptyFormDraftCollection()
    );
  }
  normalizedBackup.data.structured.dailyActions = normalizeDailyActionCollection(
    normalizedBackup.data.structured.dailyActions ?? emptyDailyActionCollection()
  );
  normalizedBackup.data.structured.protocolOccurrences = normalizeProtocolOccurrenceCollection(
    normalizedBackup.data.structured.protocolOccurrences ?? emptyProtocolOccurrenceCollection()
  );
  normalizedBackup.data.structured.protocolCompoundOutcomes = normalizeProtocolCompoundOutcomeCollection(
    normalizedBackup.data.structured.protocolCompoundOutcomes ?? emptyProtocolCompoundOutcomeCollection()
  );
  normalizedBackup.data.structured.medicationDoseSchedules = normalizeMedicationDoseScheduleCollection(
    normalizedBackup.data.structured.medicationDoseSchedules ?? emptyMedicationDoseScheduleCollection()
  );
  normalizedBackup.data.structured.medicationDoseOccurrences = normalizeMedicationDoseOccurrenceCollection(
    normalizedBackup.data.structured.medicationDoseOccurrences ?? emptyMedicationDoseOccurrenceCollection()
  );
  normalizedBackup.data.structured.injectionSiteEntries = normalizeInjectionSiteCollection(
    normalizedBackup.data.structured.injectionSiteEntries ?? emptyInjectionSiteCollection(),
    normalizedBackup.data.structured.protocols || []
  );
  normalizedBackup.data.structured.injectionSiteSettings = normalizeInjectionSiteSettings(
    normalizedBackup.data.structured.injectionSiteSettings ?? defaultInjectionSiteSettings()
  );
  if (!Array.isArray(value.data?.photos)) throw new Error("The backup is missing its photo collection.");
  const photoIds = new Set();
  value.data.photos.forEach((photo) => {
    if (!photo?.id || photoIds.has(photo.id)) throw new Error("The backup contains duplicate or missing photo IDs.");
    photoIds.add(photo.id);
    if (value.schemaVersion < 5) decodePhoto(photo);
  });
  const missingReference = photoReferenceIds(normalizedBackup.data.structured).find((id) => !photoIds.has(id));
  if (missingReference) throw new Error(`The backup is missing referenced photo ${missingReference}.`);
  if (!Array.isArray(normalizedBackup.data.media)) throw new Error("The backup is missing its media collection.");
  const { owners, duplicateId } = capsuleMediaOwners(normalizedBackup.data.structured);
  if (duplicateId) throw new Error(`Backup media ${duplicateId} is referenced by more than one capsule owner.`);
  const mediaIds = new Set();
  normalizedBackup.data.media.forEach((media) => {
    if (!media?.id || mediaIds.has(media.id)) throw new Error("The backup contains duplicate or missing media IDs.");
    mediaIds.add(media.id);
    const owner = owners.get(media.id);
    if (!owner || media.capsuleId !== owner.capsuleId || media.kind !== owner.kind ||
      (owner.capsuleDraftId && media.capsuleDraftId !== owner.capsuleDraftId) ||
      media.name !== owner.reference.name || media.mimeType !== owner.reference.mimeType ||
      media.bytes !== owner.reference.bytes || media.blob?.size !== owner.reference.bytes) {
      throw new Error(`Backup media ${media.id} has invalid ownership metadata.`);
    }
  });
  const missingMedia = [...owners.keys()].find((id) => !mediaIds.has(id));
  if (missingMedia) throw new Error(`The backup is missing referenced media ${missingMedia}.`);
  const capsuleIds = new Set((normalizedBackup.data.structured.timeCapsules || []).map(({ id }) => id));
  const orphanReminder = (normalizedBackup.data.structured.timeCapsuleReminders || [])
    .find(({ capsuleId }) => !capsuleIds.has(capsuleId));
  if (orphanReminder) throw new Error(`The backup contains a reminder for missing Time Capsule ${orphanReminder.capsuleId}.`);
  return { backup: normalizedBackup, summary: summarizeTraceBackup(normalizedBackup) };
}

export function validateTraceBackup(value, { cryptoProvider } = {}) {
  if (!value || value.format !== TRACE_BACKUP_FORMAT) throw new Error("This is not a Trace backup.");
  if (!Number.isInteger(value.schemaVersion)) throw new Error("The Trace backup version is missing.");
  if (value.schemaVersion > TRACE_BACKUP_SCHEMA_VERSION) {
    throw new Error("This Trace backup was created by a newer, unsupported backup version.");
  }
  if (![1, 2, 3, 4, 5, 6, 7, 8, TRACE_BACKUP_SCHEMA_VERSION].includes(value.schemaVersion)) throw new Error("This Trace backup version is unsupported.");
  if (!value.createdAt || Number.isNaN(Date.parse(value.createdAt))) throw new Error("The Trace backup timestamp is invalid.");
  if (value.schemaVersion < 5) return validateAndNormalizeBackup(value);
  return verifyBackupIntegrity(value, cryptoProvider).then(async () => {
    const validated = validateAndNormalizeBackup(value);
    validated.backup.integrity.structured.digest = await sha256CanonicalJson(
      validated.backup.data.structured,
      cryptoProvider
    );
    return validated;
  });
}

export async function createTraceBackup({
  storage = localStorage,
  openDatabase = openPhotoDatabase,
  now = () => new Date(),
  appVersion = packageMetadata.version,
  cryptoProvider,
} = {}) {
  const { structured, photos, media } = await readBackupSource(storage, openDatabase);
  const encodedPhotoResults = [];
  for (const photo of photos) {
    encodedPhotoResults.push(await encodePhoto(photo, cryptoProvider));
  }
  const encodedMediaResults = [];
  for (const item of media) encodedMediaResults.push(await encodePhoto(item, cryptoProvider));
  assertNoPendingBackupTransactions(storage);
  const encodedPhotos = encodedPhotoResults.map(({ photo }) => photo);
  const encodedMedia = encodedMediaResults.map(({ photo }) => photo);
  const structuredDigest = await sha256CanonicalJson(structured, cryptoProvider);
  assertNoPendingBackupTransactions(storage);
  const backup = {
    format: TRACE_BACKUP_FORMAT,
    schemaVersion: TRACE_BACKUP_SCHEMA_VERSION,
    createdAt: now().toISOString(),
    app: { name: "Trace", version: appVersion },
    data: {
      structured,
      photos: encodedPhotos,
      media: encodedMedia,
    },
    integrity: {
      format: TRACE_BACKUP_INTEGRITY_FORMAT,
      version: TRACE_BACKUP_INTEGRITY_VERSION,
      algorithm: TRACE_BACKUP_HASH_ALGORITHM,
      structured: {
        digest: structuredDigest,
        domainCount: TRACE_STORAGE_KEYS.length,
        domains: [...TRACE_STORAGE_KEYS],
      },
      photos: {
        count: encodedPhotos.length,
        entries: encodedPhotoResults.map(({ integrity }) => integrity),
      },
      media: {
        count: encodedMedia.length,
        entries: encodedMediaResults.map(({ integrity }) => integrity),
      },
    },
  };
  const validated = await validateTraceBackup(backup, { cryptoProvider });
  assertNoPendingBackupTransactions(storage);
  return validated.backup;
}

export async function createTraceBackupArchive({
  storage = localStorage,
  openDatabase = openPhotoDatabase,
  now = () => new Date(),
  appVersion = packageMetadata.version,
  cryptoProvider,
  performanceObject = defaultPerformance(),
  BlobConstructor = typeof Blob === "undefined" ? null : Blob,
} = {}) {
  const { structured, photos, media } = await readBackupSource(storage, openDatabase);
  const estimate = estimateBackupFromSource(structured, photos, media);
  assertBackupMemorySafety(estimate, performanceObject);
  if (typeof BlobConstructor !== "function") {
    throw new Error("This browser cannot assemble a Trace backup file.");
  }

  const createdAt = now().toISOString();
  const header = {
    format: TRACE_BACKUP_FORMAT,
    schemaVersion: TRACE_BACKUP_SCHEMA_VERSION,
    createdAt,
    app: { name: "Trace", version: appVersion },
  };
  const structuredDigest = await sha256CanonicalJson(structured, cryptoProvider);
  const parts = [
    `${JSON.stringify(header).slice(0, -1)},"data":{"structured":${JSON.stringify(structured)},"photos":[`,
  ];
  const photoIntegrity = [];
  for (let index = 0; index < photos.length; index += 1) {
    const encoded = await encodePhoto(photos[index], cryptoProvider);
    if (index > 0) parts.push(",");
    parts.push(JSON.stringify(encoded.photo));
    photoIntegrity.push(encoded.integrity);
    assertNoPendingBackupTransactions(storage);
  }
  parts.push(`],"media":[`);
  const mediaIntegrity = [];
  for (let index = 0; index < media.length; index += 1) {
    const encoded = await encodePhoto(media[index], cryptoProvider);
    if (index > 0) parts.push(",");
    parts.push(JSON.stringify(encoded.photo));
    mediaIntegrity.push(encoded.integrity);
    assertNoPendingBackupTransactions(storage);
  }
  const integrity = {
    format: TRACE_BACKUP_INTEGRITY_FORMAT,
    version: TRACE_BACKUP_INTEGRITY_VERSION,
    algorithm: TRACE_BACKUP_HASH_ALGORITHM,
    structured: {
      digest: structuredDigest,
      domainCount: TRACE_STORAGE_KEYS.length,
      domains: [...TRACE_STORAGE_KEYS],
    },
    photos: { count: photoIntegrity.length, entries: photoIntegrity },
    media: { count: mediaIntegrity.length, entries: mediaIntegrity },
  };
  validateIntegrityManifestShape(integrity, TRACE_STORAGE_KEYS, { includeMedia: true });
  parts.push(`]},"integrity":${JSON.stringify(integrity)}}`);
  const contents = new BlobConstructor(parts, { type: "application/json" });
  assertNoPendingBackupTransactions(storage);
  return {
    createdAt,
    contents,
    actualBytes: contents.size,
    estimate,
  };
}

export function traceBackupFilename(createdAt = new Date()) {
  const timestamp = createdAt.toISOString().replace(/[:.]/g, "-");
  return `trace-backup-${timestamp}.json`;
}

function restoreStructuredSnapshot(storage, snapshot) {
  TRACE_STORAGE_KEYS.forEach((key) => {
    const raw = snapshot[key];
    if (raw === null) storage.removeItem(key);
    else storage.setItem(key, raw);
  });
}

export async function restoreTraceBackup(value, {
  confirmed = false,
  storage = localStorage,
  openDatabase = openPhotoDatabase,
  journalVaultSession = null,
  backupJournalCredential = null,
  cryptoProvider,
} = {}) {
  if (!confirmed) throw new Error("Restore confirmation is required.");
  const validated = await validateTraceBackup(value, { cryptoProvider });
  const backup = validated.backup;
  const backupVault = backup.data.structured[JOURNAL_VAULT_STORAGE_KEY];
  if (backupVault) {
    if (!backupJournalCredential) {
      throw new Error("Verify the encrypted Journal backup before restoring it.");
    }
    const verified = await unlockJournalVaultEnvelope(backupVault, backupJournalCredential);
    validateJournalVaultPayload(verified.payload, backupVault.vaultId);
  }
  const currentVaultRaw = storage.getItem(JOURNAL_VAULT_STORAGE_KEY);
  if (currentVaultRaw !== null && !backup.data.structured[JOURNAL_VAULT_STORAGE_KEY]) {
    if (!journalVaultSession || JSON.stringify(journalVaultSession.envelope) !== currentVaultRaw) {
      throw new Error("Unlock the current Journal before restoring plaintext Journal data.");
    }
    backup.data.structured[JOURNAL_VAULT_STORAGE_KEY] = await encryptBackupJournalWithSession(
      journalVaultSession,
      backup.data.structured.journalEntries || [],
      backup.data.structured.journalDraft
    );
    backup.data.structured.journalEntries = null;
    backup.data.structured.journalDraft = null;
  }
  validateStructuredData(backup.data.structured, backup.schemaVersion);
  const summary = summarizeTraceBackup(backup);
  const database = await openDatabase();
  const previousStructured = Object.fromEntries(TRACE_STORAGE_KEYS.map((key) => [key, storage.getItem(key)]));
  const previousPhotos = await getAllPhotos(database);
  const previousMedia = await getAllMedia(database);
  const restoredPhotos = backup.data.photos.map(decodePhoto);
  const restoredMedia = (backup.data.media || []).map(decodePhoto);
  try {
    preserveNutritionRecoveryBeforeReplacement(storage);
  } catch (error) {
    throw new Error(
      `Trace stopped the restore before changing data because the current damaged Nutrition source could not be preserved. Check available storage and try again. ${error.message}`
    );
  }
  try {
    restoreStructuredSnapshot(storage, Object.fromEntries(
      TRACE_STORAGE_KEYS.map((key) => [key, backup.data.structured[key] == null
        ? null
        : JSON.stringify(backup.data.structured[key])])
    ));
    await replaceAllPhotos(database, restoredPhotos);
    await replaceAllMedia(database, restoredMedia);
  } catch (error) {
    let rollbackFailed = false;
    try { restoreStructuredSnapshot(storage, previousStructured); } catch (rollbackError) { rollbackFailed = true; }
    try { await replaceAllPhotos(database, previousPhotos); } catch (rollbackError) { rollbackFailed = true; }
    try { await replaceAllMedia(database, previousMedia); } catch (rollbackError) { rollbackFailed = true; }
    if (rollbackFailed) {
      throw new Error("Trace restore failed and its automatic rollback could not be completed. Do not close this page.");
    }
    throw new Error(`Trace restore failed and the previous data was restored: ${error.message}`);
  }
  return summary;
}

export async function parseTraceBackupText(text, options) {
  let value;
  try { value = JSON.parse(text); } catch (error) { throw new Error("The selected file is not valid JSON."); }
  return validateTraceBackup(value, options);
}
