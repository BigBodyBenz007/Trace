export const TRACE_BACKUP_INTEGRITY_FORMAT = "trace-backup-integrity";
export const TRACE_BACKUP_INTEGRITY_VERSION = 1;
export const TRACE_BACKUP_HASH_ALGORITHM = "SHA-256";

const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

export function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Backup data contains a non-finite number.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => {
      if (value[key] === undefined) throw new Error("Backup data contains an undefined value.");
      return `${JSON.stringify(key)}:${canonicalJson(value[key])}`;
    }).join(",")}}`;
  }
  throw new Error("Backup data contains an unsupported value.");
}

function cryptoApi(candidate) {
  const value = candidate || window.crypto;
  if (!value?.subtle || typeof value.subtle.digest !== "function") {
    throw new Error("Secure browser hashing is unavailable.");
  }
  return value;
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Bytes(bytes, cryptoProvider) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return toHex(await cryptoApi(cryptoProvider).subtle.digest(TRACE_BACKUP_HASH_ALGORITHM, input));
}

export async function sha256CanonicalJson(value, cryptoProvider) {
  if (typeof TextEncoder !== "function") throw new Error("Secure text encoding is unavailable.");
  return sha256Bytes(new TextEncoder().encode(canonicalJson(value)), cryptoProvider);
}

export function validateIntegrityManifestShape(integrity, expectedDomains) {
  if (!hasExactKeys(integrity, ["format", "version", "algorithm", "structured", "photos"]) ||
    integrity.format !== TRACE_BACKUP_INTEGRITY_FORMAT ||
    integrity.version !== TRACE_BACKUP_INTEGRITY_VERSION ||
    integrity.algorithm !== TRACE_BACKUP_HASH_ALGORITHM) {
    throw new Error("The backup integrity metadata is missing or malformed.");
  }
  if (!hasExactKeys(integrity.structured, ["digest", "domainCount", "domains"]) ||
    !SHA256_HEX_PATTERN.test(integrity.structured.digest) ||
    !Number.isSafeInteger(integrity.structured.domainCount) ||
    !Array.isArray(integrity.structured.domains)) {
    throw new Error("The backup structured integrity metadata is malformed.");
  }
  if (integrity.structured.domainCount !== expectedDomains.length ||
    integrity.structured.domains.length !== expectedDomains.length ||
    integrity.structured.domains.some((domain, index) => domain !== expectedDomains[index])) {
    throw new Error("The backup structured-domain inventory does not match Trace.");
  }
  if (!hasExactKeys(integrity.photos, ["count", "entries"]) ||
    !Number.isSafeInteger(integrity.photos.count) || integrity.photos.count < 0 ||
    !Array.isArray(integrity.photos.entries)) {
    throw new Error("The backup photo integrity metadata is malformed.");
  }
  const ids = new Set();
  integrity.photos.entries.forEach((entry) => {
    if (!hasExactKeys(entry, ["id", "size", "digest"]) ||
      typeof entry.id !== "string" || !entry.id || ids.has(entry.id) ||
      !Number.isSafeInteger(entry.size) || entry.size < 0 ||
      !SHA256_HEX_PATTERN.test(entry.digest)) {
      throw new Error("The backup photo integrity entries are malformed or duplicated.");
    }
    ids.add(entry.id);
  });
  if (integrity.photos.count !== integrity.photos.entries.length) {
    throw new Error("The backup photo integrity count does not match its entries.");
  }
}
