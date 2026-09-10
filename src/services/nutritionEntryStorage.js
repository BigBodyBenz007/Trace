import { normalizeAndValidateNutritionEntry } from "./traceBackupValidation";

export const NUTRITION_ENTRIES_STORAGE_KEY = "nutritionEntries";
export const NUTRITION_RECOVERY_STORAGE_KEY = "nutritionEntriesRecovery";
export const NUTRITION_RECOVERY_SCHEMA_VERSION = 1;

export const NUTRITION_STORAGE_STATUS = Object.freeze({
  READY: "ready",
  PARTIAL: "partial",
  BLOCKED: "blocked",
});

export const NUTRITION_MUTATION_STATUS = Object.freeze({
  SAVED: "saved",
  BLOCKED: "blocked",
  CONFLICT: "conflict",
  ERROR: "error",
  NOT_FOUND: "not-found",
  INVALID: "invalid",
});

function emptyRecoveryCollection() {
  return { schemaVersion: NUTRITION_RECOVERY_SCHEMA_VERSION, snapshots: [] };
}

function isRecoverySnapshot(value) {
  return Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.raw === "string" &&
    typeof value.damageKey === "string" &&
    typeof value.capturedAt === "string" &&
    !Number.isNaN(Date.parse(value.capturedAt));
}

export function normalizeNutritionRecoveryCollection(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.schemaVersion !== NUTRITION_RECOVERY_SCHEMA_VERSION || !Array.isArray(value.snapshots)) return null;
  if (!value.snapshots.every(isRecoverySnapshot)) return null;
  return {
    schemaVersion: NUTRITION_RECOVERY_SCHEMA_VERSION,
    snapshots: value.snapshots.map((snapshot) => ({ ...snapshot })),
  };
}

export function readNutritionRecoveryCollection(storage = localStorage) {
  const raw = storage.getItem(NUTRITION_RECOVERY_STORAGE_KEY);
  if (raw === null) return emptyRecoveryCollection();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error("The preserved Nutrition recovery data is malformed.");
  }
  const normalized = normalizeNutritionRecoveryCollection(parsed);
  if (!normalized) throw new Error("The preserved Nutrition recovery data is malformed.");
  return normalized;
}

function recoveryState(storage) {
  try {
    const collection = readNutritionRecoveryCollection(storage);
    return {
      available: collection.snapshots.length > 0,
      collection,
      error: null,
      raw: collection.snapshots[collection.snapshots.length - 1]?.raw ?? null,
    };
  } catch (error) {
    let available = false;
    try {
      available = storage.getItem(NUTRITION_RECOVERY_STORAGE_KEY) !== null;
    } catch (storageError) {
      // The source reader will separately report storage access failures.
    }
    return { available, collection: null, error, raw: null };
  }
}

function matchingRecoveryRaw(recovery, damageKey, currentRaw) {
  if (recovery.collection) {
    for (let index = recovery.collection.snapshots.length - 1; index >= 0; index -= 1) {
      if (recovery.collection.snapshots[index].damageKey === damageKey) {
        return recovery.collection.snapshots[index].raw;
      }
    }
  }
  return currentRaw;
}

function blockedReport(raw, reason, storage) {
  const recovery = recoveryState(storage);
  const damageKey = raw === null ? "blocked:storage-unavailable" : `blocked:${stringFingerprint(raw)}`;
  return {
    status: NUTRITION_STORAGE_STATUS.BLOCKED,
    entries: [],
    damagedCount: null,
    mutationBlocked: true,
    reason,
    raw,
    sourceEntries: null,
    slots: [],
    damageKey,
    recoveryAvailable: recovery.available || raw !== null,
    recoveryError: recovery.error,
    recoveryRaw: matchingRecoveryRaw(recovery, damageKey, raw),
  };
}

function duplicateIds(values) {
  const counts = new Map();
  values.forEach((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.id !== "string" || !value.id) return;
    counts.set(value.id, (counts.get(value.id) || 0) + 1);
  });
  return new Set([...counts].filter(([, count]) => count > 1).map(([id]) => id));
}

function damagedValueKey(value) {
  return JSON.stringify(value);
}

function stringFingerprint(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${value.length}:${hash >>> 0}`;
}

export function readNutritionEntries(storage = localStorage) {
  let raw;
  try {
    raw = storage.getItem(NUTRITION_ENTRIES_STORAGE_KEY);
  } catch (error) {
    return blockedReport(null, "storage-unavailable", storage);
  }
  if (raw === null) {
    const recovery = recoveryState(storage);
    return {
      status: NUTRITION_STORAGE_STATUS.READY,
      entries: [],
      damagedCount: 0,
      mutationBlocked: false,
      reason: null,
      raw: null,
      sourceEntries: [],
      slots: [],
      damageKey: null,
      recoveryAvailable: recovery.available,
      recoveryError: recovery.error,
      recoveryRaw: recovery.raw,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return blockedReport(raw, "malformed-json", storage);
  }
  if (!Array.isArray(parsed)) return blockedReport(raw, "not-array", storage);

  const duplicates = duplicateIds(parsed);
  const slots = parsed.map((value, index) => {
    if (value && typeof value === "object" && !Array.isArray(value) && duplicates.has(value.id)) {
      return { index, valid: false, rawValue: value, reason: "duplicate-id" };
    }
    try {
      const entry = normalizeAndValidateNutritionEntry(value);
      return { index, valid: true, rawValue: value, entry };
    } catch (error) {
      return { index, valid: false, rawValue: value, reason: "invalid-record" };
    }
  });
  const damagedSlots = slots.filter((slot) => !slot.valid);
  const recovery = recoveryState(storage);
  const status = damagedSlots.length ? NUTRITION_STORAGE_STATUS.PARTIAL : NUTRITION_STORAGE_STATUS.READY;
  const damageKey = damagedSlots.length
    ? `records:${stringFingerprint(JSON.stringify(damagedSlots.map((slot) => [slot.reason, damagedValueKey(slot.rawValue)])))}`
    : null;
  return {
    status,
    entries: slots.filter((slot) => slot.valid).map((slot) => slot.entry),
    damagedCount: damagedSlots.length,
    mutationBlocked: false,
    reason: null,
    raw,
    sourceEntries: parsed,
    slots,
    damageKey,
    recoveryAvailable: recovery.available || damagedSlots.length > 0,
    recoveryError: recovery.error,
    recoveryRaw: damagedSlots.length
      ? matchingRecoveryRaw(recovery, damageKey, raw)
      : recovery.raw,
  };
}

function preserveRecoverySnapshot(storage, report, now) {
  if (report.status === NUTRITION_STORAGE_STATUS.READY || report.raw === null) return;
  const collection = readNutritionRecoveryCollection(storage);
  if (collection.snapshots.some((snapshot) => snapshot.damageKey === report.damageKey)) return;
  const next = {
    schemaVersion: NUTRITION_RECOVERY_SCHEMA_VERSION,
    snapshots: [
      ...collection.snapshots,
      {
        capturedAt: now().toISOString(),
        damageKey: report.damageKey,
        raw: report.raw,
      },
    ],
  };
  const serialized = JSON.stringify(next);
  storage.setItem(NUTRITION_RECOVERY_STORAGE_KEY, serialized);
  if (storage.getItem(NUTRITION_RECOVERY_STORAGE_KEY) !== serialized) {
    throw new Error("The original Nutrition data could not be verified after preservation.");
  }
}

export function preserveNutritionRecoveryBeforeReplacement(storage = localStorage, {
  now = () => new Date(),
} = {}) {
  const report = readNutritionEntries(storage);
  if (report.status === NUTRITION_STORAGE_STATUS.READY) return report;
  if (report.raw === null) {
    throw new Error("Trace could not read the current Nutrition source before replacement.");
  }
  preserveRecoverySnapshot(storage, report, now);
  return readNutritionEntries(storage);
}

function result(status, report, message = "") {
  return { status, report, message };
}

function writeMutation(storage, mutate, { now = () => new Date() } = {}) {
  const report = readNutritionEntries(storage);
  if (report.status === NUTRITION_STORAGE_STATUS.BLOCKED) {
    return result(
      NUTRITION_MUTATION_STATUS.BLOCKED,
      report,
      "Nutrition saving is blocked because the saved Nutrition data cannot be read. Download the raw Nutrition recovery file before repairing it."
    );
  }

  let nextEntries;
  try {
    nextEntries = mutate(report);
  } catch (error) {
    return result(
      NUTRITION_MUTATION_STATUS.INVALID,
      report,
      "The Nutrition change was not saved because its values are invalid. Review the entry and try again."
    );
  }
  if (!nextEntries) {
    return result(NUTRITION_MUTATION_STATUS.NOT_FOUND, report, "The saved Nutrition entry changed or is no longer available. Reopen Nutrition and try again.");
  }

  try {
    preserveRecoverySnapshot(storage, report, now);
  } catch (error) {
    return result(
      NUTRITION_MUTATION_STATUS.ERROR,
      report,
      "Trace could not preserve the original damaged Nutrition data, so no Nutrition changes were saved. Check available storage and try again."
    );
  }

  try {
    if (storage.getItem(NUTRITION_ENTRIES_STORAGE_KEY) !== report.raw) {
      return result(
        NUTRITION_MUTATION_STATUS.CONFLICT,
        report,
        "Saved Nutrition changed before this update could finish. No changes were saved; reopen Nutrition and try again."
      );
    }
    storage.setItem(NUTRITION_ENTRIES_STORAGE_KEY, JSON.stringify(nextEntries));
    return result(NUTRITION_MUTATION_STATUS.SAVED, readNutritionEntries(storage));
  } catch (error) {
    return result(
      NUTRITION_MUTATION_STATUS.ERROR,
      report,
      "Trace could not write the Nutrition change. Nothing was changed; keep this form open and try again."
    );
  }
}

export function appendNutritionEntry(storage, entry, {
  createId,
  now,
} = {}) {
  return writeMutation(storage, (report) => {
    const existingIds = new Set(report.sourceEntries
      .map((value) => value && typeof value === "object" && !Array.isArray(value) ? value.id : null)
      .filter((id) => typeof id === "string" && id));
    const id = createId(existingIds);
    const nextEntry = normalizeAndValidateNutritionEntry({ ...entry, id });
    return [...report.sourceEntries, nextEntry];
  }, { now });
}

export function updateStoredNutritionEntry(storage, id, entry, options) {
  return writeMutation(storage, (report) => {
    const slot = report.slots.find((candidate) => candidate.valid && candidate.entry.id === id);
    if (!slot) return null;
    const nextEntry = normalizeAndValidateNutritionEntry({ ...slot.rawValue, ...entry, id });
    return report.sourceEntries.map((value, index) => index === slot.index ? nextEntry : value);
  }, options);
}

export function deleteStoredNutritionEntry(storage, id, options) {
  return writeMutation(storage, (report) => {
    const slot = report.slots.find((candidate) => candidate.valid && candidate.entry.id === id);
    if (!slot) return null;
    return report.sourceEntries.filter((value, index) => index !== slot.index);
  }, options);
}

export function nutritionRecoveryFilename(createdAt = new Date()) {
  return `trace-nutrition-recovery-${createdAt.toISOString().replace(/[:.]/g, "-")}.txt`;
}
