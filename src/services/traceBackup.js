import {
  getAllPhotos,
  openPhotoDatabase,
  replaceAllPhotos,
} from "../storage/photoStorage";
import packageMetadata from "../../package.json";
import { normalizeAppSettings } from "./appSettings";
import { normalizePlannedWorkouts } from "./plannedWorkout";
import { normalizeWorkoutDraft } from "./workoutDraft";
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
import {
  sha256Bytes,
  sha256CanonicalJson,
  TRACE_BACKUP_HASH_ALGORITHM,
  TRACE_BACKUP_INTEGRITY_FORMAT,
  TRACE_BACKUP_INTEGRITY_VERSION,
  validateIntegrityManifestShape,
} from "./traceBackupIntegrity";

export const TRACE_BACKUP_FORMAT = "trace-backup";
export const TRACE_BACKUP_SCHEMA_VERSION = 6;
export const TRACE_STORAGE_KEYS = TRACE_BACKUP_STORAGE_KEYS;
const TRACE_STORAGE_KEYS_V5 = TRACE_STORAGE_KEYS.filter((key) => key !== "workoutTemplates");

const OBJECT_KEYS = new Set(["nutritionGoals", "appSettings"]);
const SPECIAL_KEYS = new Set(["waterEntries", "workoutDraft", "dailyActions", "protocolOccurrences", "protocolCompoundOutcomes", "injectionSiteEntries", "injectionSiteSettings", "medicationDoseSchedules", "medicationDoseOccurrences", "journalDraft", JOURNAL_VAULT_STORAGE_KEY]);
const ARRAY_KEYS = new Set(TRACE_STORAGE_KEYS.filter(
  (key) => !OBJECT_KEYS.has(key) && !SPECIAL_KEYS.has(key)
));
const LEGACY_OPTIONAL_KEYS = new Set(["healthMeasurementEntries", "appSettings", "journalEntries", "journalDraft", JOURNAL_VAULT_STORAGE_KEY, "plannedWorkouts", "workoutTemplates", "waterEntries", "dailyActions", "protocolOccurrences", "protocolCompoundOutcomes", "injectionSiteEntries", "injectionSiteSettings", "medicationDoseSchedules", "medicationDoseOccurrences", "workoutDraft"]);
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

function storageKeysForSchema(schemaVersion) {
  return schemaVersion >= 6 ? TRACE_STORAGE_KEYS : TRACE_STORAGE_KEYS_V5;
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

export function summarizeTraceBackup(backup) {
  const data = backup.data.structured;
  return {
    memories: data.memories?.length || 0,
    photos: backup.data.photos.length,
    nutritionEntries: data.nutritionEntries?.length || 0,
    waterEntries: data.waterEntries?.entries?.length || 0,
    healthMeasurementEntries: data.healthMeasurementEntries?.length || 0,
    plannedWorkouts: data.plannedWorkouts?.length || 0,
    workoutTemplates: data.workoutTemplates?.length || 0,
    dailyActions: data.dailyActions?.actions?.length || 0,
    activeWorkoutDraft: Boolean(data.workoutDraft),
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
    validateIntegrityManifestShape(value.integrity, expectedStorageKeys);
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
  } catch (error) {
    throw integrityFailure(error);
  }
}

function validateAndNormalizeBackup(value) {
  const normalizedBackup = cloneJson(value);
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
  return { backup: normalizedBackup, summary: summarizeTraceBackup(normalizedBackup) };
}

export function validateTraceBackup(value, { cryptoProvider } = {}) {
  if (!value || value.format !== TRACE_BACKUP_FORMAT) throw new Error("This is not a Trace backup.");
  if (!Number.isInteger(value.schemaVersion)) throw new Error("The Trace backup version is missing.");
  if (value.schemaVersion > TRACE_BACKUP_SCHEMA_VERSION) {
    throw new Error("This Trace backup was created by a newer, unsupported backup version.");
  }
  if (![1, 2, 3, 4, 5, TRACE_BACKUP_SCHEMA_VERSION].includes(value.schemaVersion)) throw new Error("This Trace backup version is unsupported.");
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
  recoverPendingBackupTransactions(storage);
  const database = await openDatabase();
  const photos = await getAllPhotos(database);
  assertNoPendingBackupTransactions(storage);
  const structured = readStructuredData(storage);
  if (Array.isArray(structured.nutritionEntries)) {
    structured.nutritionEntries = normalizeNutritionEntryPortions(structured.nutritionEntries);
  }
  assertNoPendingBackupTransactions(storage);
  const encodedPhotoResults = await Promise.all(photos.map((photo) => encodePhoto(photo, cryptoProvider)));
  assertNoPendingBackupTransactions(storage);
  const encodedPhotos = encodedPhotoResults.map(({ photo }) => photo);
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
    },
  };
  const validated = await validateTraceBackup(backup, { cryptoProvider });
  assertNoPendingBackupTransactions(storage);
  return validated.backup;
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
  const restoredPhotos = backup.data.photos.map(decodePhoto);
  try {
    restoreStructuredSnapshot(storage, Object.fromEntries(
      TRACE_STORAGE_KEYS.map((key) => [key, backup.data.structured[key] == null
        ? null
        : JSON.stringify(backup.data.structured[key])])
    ));
    await replaceAllPhotos(database, restoredPhotos);
  } catch (error) {
    let rollbackFailed = false;
    try { restoreStructuredSnapshot(storage, previousStructured); } catch (rollbackError) { rollbackFailed = true; }
    try { await replaceAllPhotos(database, previousPhotos); } catch (rollbackError) { rollbackFailed = true; }
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
