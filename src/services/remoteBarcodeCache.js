import { canonicalGtinKey, normalizeGtin } from "./productIdentifiers";
import { immutableCopy, normalizeRemoteLookupResult } from "./remoteFoodModel";

export const REMOTE_BARCODE_CACHE_STORAGE_KEY = "remoteBarcodeFoodResponses";
// Version 2 invalidates records normalized before Trace required an explicit,
// trustworthy labeled-serving basis. Those records cannot be safely reinterpreted.
export const REMOTE_BARCODE_CACHE_VERSION = 2;
export const REMOTE_BARCODE_CACHE_MAX_RECORDS = 500;
export const REMOTE_BARCODE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function timestamp(value) {
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function safeNow(clock) {
  const value = Number(clock());
  return Number.isFinite(value) ? value : Date.now();
}

function readRecords(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(REMOTE_BARCODE_CACHE_STORAGE_KEY));
    return parsed?.version === REMOTE_BARCODE_CACHE_VERSION && Array.isArray(parsed.records)
      ? parsed.records
      : [];
  } catch (error) {
    return [];
  }
}

function validEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const normalizedBarcode = normalizeGtin(entry.identifier?.value);
  const key = canonicalGtinKey(normalizedBarcode);
  const storedAt = timestamp(entry.storedAt);
  const expiresAt = timestamp(entry.expiresAt);
  const lastAccessedAt = timestamp(entry.lastAccessedAt);
  const result = normalizeRemoteLookupResult(entry.result);
  if (
    !key
    || entry.key !== key
    || entry.identifier?.scheme !== "gtin"
    || storedAt === null
    || expiresAt === null
    || lastAccessedAt === null
    || expiresAt <= storedAt
    || expiresAt - storedAt > REMOTE_BARCODE_CACHE_TTL_MS
    || !result
    || !["found", "incomplete"].includes(result.status)
    || !result.food?.nutritionBasis
    || canonicalGtinKey(result.identifier?.value) !== key
  ) return null;
  return { ...entry, key, result, storedAt, expiresAt, lastAccessedAt };
}

function writeRecords(storage, records) {
  try {
    storage?.setItem(REMOTE_BARCODE_CACHE_STORAGE_KEY, JSON.stringify({
      version: REMOTE_BARCODE_CACHE_VERSION,
      records: records.map((entry) => ({
        key: entry.key,
        identifier: entry.identifier,
        result: entry.result,
        storedAt: new Date(entry.storedAt).toISOString(),
        expiresAt: new Date(entry.expiresAt).toISOString(),
        lastAccessedAt: new Date(entry.lastAccessedAt).toISOString(),
      })),
    }));
  } catch (error) {
    // Rebuildable cache failures never block a barcode lookup.
  }
}

export function createRemoteBarcodeCache({
  storage,
  clock = Date.now,
  ttlMs = REMOTE_BARCODE_CACHE_TTL_MS,
  maxRecords = REMOTE_BARCODE_CACHE_MAX_RECORDS,
} = {}) {
  const safeLimit = Math.min(
    REMOTE_BARCODE_CACHE_MAX_RECORDS,
    Math.max(1, Number.isInteger(maxRecords) ? maxRecords : REMOTE_BARCODE_CACHE_MAX_RECORDS)
  );
  const safeTtl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : REMOTE_BARCODE_CACHE_TTL_MS;

  function normalizedEntries() {
    const byKey = new Map();
    readRecords(storage).forEach((raw) => {
      const entry = validEntry(raw);
      if (!entry) return;
      const existing = byKey.get(entry.key);
      if (!existing || entry.lastAccessedAt > existing.lastAccessedAt) byKey.set(entry.key, entry);
    });
    return [...byKey.values()]
      .sort((left, right) => right.lastAccessedAt - left.lastAccessedAt)
      .slice(0, safeLimit);
  }

  function get(value, { allowExpired = false } = {}) {
    const key = canonicalGtinKey(value);
    if (!key) return null;
    const now = safeNow(clock);
    const entries = normalizedEntries();
    const entry = entries.find((candidate) => candidate.key === key);
    if (!entry || (!allowExpired && entry.expiresAt <= now)) return null;

    entry.lastAccessedAt = now;
    writeRecords(storage, entries);
    return immutableCopy({
      ...entry.result,
      cache: {
        hit: true,
        stale: entry.expiresAt <= now,
        expiresAt: new Date(entry.expiresAt).toISOString(),
      },
      stale: entry.expiresAt <= now,
    });
  }

  function set(value, result) {
    const normalizedBarcode = normalizeGtin(value);
    const key = canonicalGtinKey(normalizedBarcode);
    const normalizedResult = normalizeRemoteLookupResult(result);
    if (
      !key
      || !normalizedResult
      || !["found", "incomplete"].includes(normalizedResult.status)
      || !normalizedResult.food?.nutritionBasis
      || canonicalGtinKey(normalizedResult.identifier?.value) !== key
    ) return false;

    const now = safeNow(clock);
    const next = normalizedEntries().filter((entry) => entry.key !== key);
    next.push({
      key,
      identifier: { scheme: "gtin", value: normalizedBarcode },
      result: normalizedResult,
      storedAt: now,
      expiresAt: now + safeTtl,
      lastAccessedAt: now,
    });
    next.sort((left, right) => right.lastAccessedAt - left.lastAccessedAt);
    writeRecords(storage, next.slice(0, safeLimit));
    return true;
  }

  return Object.freeze({ get, set });
}
