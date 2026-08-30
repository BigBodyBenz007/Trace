import {
  getAllPhotos,
  openPhotoDatabase,
  replaceAllPhotos,
} from "../storage/photoStorage";
import packageMetadata from "../../package.json";
import { normalizeAppSettings } from "./appSettings";
import { normalizePlannedWorkouts } from "./plannedWorkout";
import { normalizeWorkoutDraft } from "./workoutDraft";
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
  normalizeMedicationDoseOccurrenceCollection,
  normalizeMedicationDoseScheduleCollection,
} from "./medicationDoseSchedule";
import {
  emptyProtocolCompoundOutcomeCollection,
  normalizeProtocolCompoundOutcomeCollection,
} from "./protocolCompoundOutcome";
import {
  encryptBackupJournalWithSession,
  JOURNAL_VAULT_STORAGE_KEY,
  validateJournalVaultPayload,
} from "./journalVault";
import {
  journalRecoveryFormat,
  unlockJournalVaultEnvelope,
  validateJournalVaultEnvelope,
} from "./journalVaultCrypto";

export const TRACE_BACKUP_FORMAT = "trace-backup";
export const TRACE_BACKUP_SCHEMA_VERSION = 2;
export const TRACE_STORAGE_KEYS = Object.freeze([
  "memories",
  "nutritionGoals",
  "userFoods",
  "nutritionEntries",
  "healthMeasurementEntries",
  "appSettings",
  "medicationEntries",
  "medicationCompounds",
  "medicationDoseSchedules",
  "medicationDoseOccurrences",
  "protocols",
  "protocolOccurrences",
  "protocolCompoundOutcomes",
  "injectionSiteEntries",
  "injectionSiteSettings",
  "plannedWorkouts",
  "dailyActions",
  "workoutDraft",
  "workoutEntries",
  "savedExercises",
  "trophyCaseEntries",
  "journalEntries",
  JOURNAL_VAULT_STORAGE_KEY,
]);

const OBJECT_KEYS = new Set(["nutritionGoals", "appSettings"]);
const SPECIAL_KEYS = new Set(["workoutDraft", "dailyActions", "protocolOccurrences", "protocolCompoundOutcomes", "injectionSiteEntries", "injectionSiteSettings", "medicationDoseSchedules", "medicationDoseOccurrences", JOURNAL_VAULT_STORAGE_KEY]);
const ARRAY_KEYS = new Set(TRACE_STORAGE_KEYS.filter(
  (key) => !OBJECT_KEYS.has(key) && !SPECIAL_KEYS.has(key)
));

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

async function encodePhoto(record) {
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
  return {
    ...cloneJson(metadata),
    blob: {
      type: blob.type || "application/octet-stream",
      size: blob.size,
      base64: bytesToBase64(bytes),
    },
  };
}

function decodePhoto(record) {
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
  return { ...cloneJson(metadata), blob: new Blob([bytes], { type: encoded.type }) };
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
      if (key === "workoutDraft") {
        if (parsed === null) return [key, null];
        const normalized = normalizeWorkoutDraft(parsed);
        if (!normalized) throw new Error("Invalid workout draft data.");
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

function validateStructuredData(structuredData) {
  if (!structuredData || typeof structuredData !== "object" || Array.isArray(structuredData)) {
    throw new Error("The backup is missing its structured Trace data.");
  }
  TRACE_STORAGE_KEYS.forEach((key) => {
    const value = structuredData[key];
    if (value === null || (["healthMeasurementEntries", "appSettings", "journalEntries", JOURNAL_VAULT_STORAGE_KEY, "plannedWorkouts", "dailyActions", "protocolOccurrences", "protocolCompoundOutcomes", "injectionSiteEntries", "injectionSiteSettings", "medicationDoseSchedules", "medicationDoseOccurrences", "workoutDraft"].includes(key) && value === undefined)) return;
    if (ARRAY_KEYS.has(key) && !Array.isArray(value)) {
      throw new Error(`The backup contains invalid ${key} data.`);
    }
    if (OBJECT_KEYS.has(key) && (typeof value !== "object" || Array.isArray(value))) {
      throw new Error(`The backup contains invalid ${key} data.`);
    }
  });
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
  if (structuredData[JOURNAL_VAULT_STORAGE_KEY] != null) {
    validateJournalVaultEnvelope(structuredData[JOURNAL_VAULT_STORAGE_KEY]);
    if (structuredData.journalEntries != null) {
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
    healthMeasurementEntries: data.healthMeasurementEntries?.length || 0,
    plannedWorkouts: data.plannedWorkouts?.length || 0,
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
    encryptedJournal: Boolean(data[JOURNAL_VAULT_STORAGE_KEY]),
    journalRecoveryFormat: data[JOURNAL_VAULT_STORAGE_KEY]
      ? journalRecoveryFormat(data[JOURNAL_VAULT_STORAGE_KEY])
      : null,
  };
}

export function validateTraceBackup(value) {
  if (!value || value.format !== TRACE_BACKUP_FORMAT) throw new Error("This is not a Trace backup.");
  if (!Number.isInteger(value.schemaVersion)) throw new Error("The Trace backup version is missing.");
  if (value.schemaVersion > TRACE_BACKUP_SCHEMA_VERSION) {
    throw new Error("This Trace backup was created by a newer, unsupported backup version.");
  }
  if (![1, TRACE_BACKUP_SCHEMA_VERSION].includes(value.schemaVersion)) throw new Error("This Trace backup version is unsupported.");
  if (!value.createdAt || Number.isNaN(Date.parse(value.createdAt))) throw new Error("The Trace backup timestamp is invalid.");
  validateStructuredData(value.data?.structured);
  const normalizedBackup = cloneJson(value);
  normalizedBackup.schemaVersion = TRACE_BACKUP_SCHEMA_VERSION;
  if (normalizedBackup.data.structured[JOURNAL_VAULT_STORAGE_KEY] === undefined) {
    normalizedBackup.data.structured[JOURNAL_VAULT_STORAGE_KEY] = null;
  }
  if (normalizedBackup.data.structured.appSettings != null) {
    normalizedBackup.data.structured.appSettings = normalizeAppSettings(
      normalizedBackup.data.structured.appSettings
    );
  }
  if (normalizedBackup.data.structured.plannedWorkouts != null) {
    normalizedBackup.data.structured.plannedWorkouts = normalizePlannedWorkouts(
      normalizedBackup.data.structured.plannedWorkouts
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
    decodePhoto(photo);
  });
  const missingReference = photoReferenceIds(normalizedBackup.data.structured).find((id) => !photoIds.has(id));
  if (missingReference) throw new Error(`The backup is missing referenced photo ${missingReference}.`);
  return { backup: normalizedBackup, summary: summarizeTraceBackup(normalizedBackup) };
}

export async function createTraceBackup({
  storage = localStorage,
  openDatabase = openPhotoDatabase,
  now = () => new Date(),
  appVersion = packageMetadata.version,
} = {}) {
  const database = await openDatabase();
  const photos = await getAllPhotos(database);
  const backup = {
    format: TRACE_BACKUP_FORMAT,
    schemaVersion: TRACE_BACKUP_SCHEMA_VERSION,
    createdAt: now().toISOString(),
    app: { name: "Trace", version: appVersion },
    data: {
      structured: readStructuredData(storage),
      photos: await Promise.all(photos.map(encodePhoto)),
    },
  };
  return validateTraceBackup(backup).backup;
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
} = {}) {
  if (!confirmed) throw new Error("Restore confirmation is required.");
  const validated = validateTraceBackup(value);
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
      backup.data.structured.journalEntries || []
    );
    backup.data.structured.journalEntries = null;
  }
  validateStructuredData(backup.data.structured);
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

export function parseTraceBackupText(text) {
  let value;
  try { value = JSON.parse(text); } catch (error) { throw new Error("The selected file is not valid JSON."); }
  return validateTraceBackup(value);
}
