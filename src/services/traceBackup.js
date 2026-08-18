import {
  getAllPhotos,
  openPhotoDatabase,
  replaceAllPhotos,
} from "../storage/photoStorage";
import packageMetadata from "../../package.json";

export const TRACE_BACKUP_FORMAT = "trace-backup";
export const TRACE_BACKUP_SCHEMA_VERSION = 1;
export const TRACE_STORAGE_KEYS = Object.freeze([
  "memories",
  "nutritionGoals",
  "userFoods",
  "nutritionEntries",
  "healthMeasurementEntries",
  "appSettings",
  "medicationEntries",
  "medicationCompounds",
  "protocols",
  "workoutEntries",
  "savedExercises",
  "trophyCaseEntries",
  "journalEntries",
]);

const OBJECT_KEYS = new Set(["nutritionGoals", "appSettings"]);
const ARRAY_KEYS = new Set(TRACE_STORAGE_KEYS.filter((key) => !OBJECT_KEYS.has(key)));

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
  return Object.fromEntries(TRACE_STORAGE_KEYS.map((key) => {
    const raw = storage.getItem(key);
    if (raw === null) return [key, null];
    try {
      return [key, JSON.parse(raw)];
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
    if (value === null || (["healthMeasurementEntries", "appSettings", "journalEntries"].includes(key) && value === undefined)) return;
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
    workouts: data.workoutEntries?.length || 0,
    medicationEntries: data.medicationEntries?.length || 0,
    protocols: data.protocols?.length || 0,
    trophyCaseEntries: data.trophyCaseEntries?.length || 0,
    savedExercises: data.savedExercises?.length || 0,
    savedCompounds: data.medicationCompounds?.length || 0,
    userFoods: data.userFoods?.length || 0,
    journalEntries: data.journalEntries?.length || 0,
  };
}

export function validateTraceBackup(value) {
  if (!value || value.format !== TRACE_BACKUP_FORMAT) throw new Error("This is not a Trace backup.");
  if (!Number.isInteger(value.schemaVersion)) throw new Error("The Trace backup version is missing.");
  if (value.schemaVersion > TRACE_BACKUP_SCHEMA_VERSION) {
    throw new Error("This Trace backup was created by a newer, unsupported backup version.");
  }
  if (value.schemaVersion !== TRACE_BACKUP_SCHEMA_VERSION) throw new Error("This Trace backup version is unsupported.");
  if (!value.createdAt || Number.isNaN(Date.parse(value.createdAt))) throw new Error("The Trace backup timestamp is invalid.");
  validateStructuredData(value.data?.structured);
  if (!Array.isArray(value.data?.photos)) throw new Error("The backup is missing its photo collection.");
  const photoIds = new Set();
  value.data.photos.forEach((photo) => {
    if (!photo?.id || photoIds.has(photo.id)) throw new Error("The backup contains duplicate or missing photo IDs.");
    photoIds.add(photo.id);
    decodePhoto(photo);
  });
  const missingReference = photoReferenceIds(value.data.structured).find((id) => !photoIds.has(id));
  if (missingReference) throw new Error(`The backup is missing referenced photo ${missingReference}.`);
  return { backup: cloneJson(value), summary: summarizeTraceBackup(value) };
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
  validateTraceBackup(backup);
  return backup;
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
} = {}) {
  if (!confirmed) throw new Error("Restore confirmation is required.");
  const { backup, summary } = validateTraceBackup(value);
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
