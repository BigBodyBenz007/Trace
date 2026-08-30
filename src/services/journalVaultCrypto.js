import {
  entropyToMnemonic,
  mnemonicToEntropy,
  validateMnemonic,
} from "@scure/bip39";
import { wordlist as englishWordlist } from "@scure/bip39/wordlists/english";

export const JOURNAL_VAULT_ENVELOPE_VERSION = 1;
export const JOURNAL_VAULT_CONTENT_TYPE = "trace-journal-vault";
export const JOURNAL_VAULT_KDF_ITERATIONS = 600000;
export const JOURNAL_RECOVERY_KEY_BYTES = 32;
export const JOURNAL_RECOVERY_FORMAT_LEGACY = "legacy-random-key-v1";
export const JOURNAL_RECOVERY_FORMAT_MNEMONIC = "bip39-english-12-hkdf-sha256-v1";

const AES_KEY_BYTES = 32;
const AES_NONCE_BYTES = 12;
const AES_TAG_BYTES = 16;
const KDF_SALT_BYTES = 16;
const VAULT_ID_BYTES = 16;
const RECOVERY_ENTROPY_BYTES = 16;
const RECOVERY_WRAPPER_VERSION = 2;
const RECOVERY_HKDF_INFO = "Trace Journal recovery wrapper v1";
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function hasExactKeys(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

export class JournalVaultError extends Error {
  constructor(message = "Journal vault operation failed.") {
    super(message);
    this.name = "JournalVaultError";
  }
}

export class JournalVaultUnlockError extends JournalVaultError {
  constructor() {
    super("Journal unlock failed.");
    this.name = "JournalVaultUnlockError";
  }
}

function cryptoApi(candidate) {
  const value = candidate || window.crypto;
  if (!value?.subtle || typeof value.getRandomValues !== "function") {
    throw new JournalVaultError("Secure browser cryptography is unavailable.");
  }
  return value;
}

function encoder() {
  if (typeof TextEncoder !== "function") {
    throw new JournalVaultError("Secure text encoding is unavailable.");
  }
  return new TextEncoder();
}

function decoder() {
  if (typeof TextDecoder !== "function") {
    throw new JournalVaultError("Secure text decoding is unavailable.");
  }
  return new TextDecoder("utf-8", { fatal: true });
}

function randomBytes(length, cryptoProvider) {
  const bytes = new Uint8Array(length);
  cryptoApi(cryptoProvider).getRandomValues(bytes);
  return bytes;
}

export function encodeBase64Url(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeBase64Url(value, { exactBytes, minimumBytes = 1 } = {}) {
  if (typeof value !== "string" || !value || !BASE64URL_PATTERN.test(value)) {
    throw new JournalVaultError("Malformed base64url data.");
  }
  const remainder = value.length % 4;
  if (remainder === 1) throw new JournalVaultError("Malformed base64url data.");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - remainder) % 4);
  let binary;
  try {
    binary = atob(padded);
  } catch (error) {
    throw new JournalVaultError("Malformed base64url data.");
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (bytes.byteLength < minimumBytes || (exactBytes !== undefined && bytes.byteLength !== exactBytes)) {
    throw new JournalVaultError("Malformed binary field length.");
  }
  if (encodeBase64Url(bytes) !== value) throw new JournalVaultError("Non-canonical base64url data.");
  return bytes;
}

export function formatRecoveryKey(value) {
  const compact = String(value || "").replace(/\s+/g, "");
  return compact.match(/.{1,5}/g)?.join(" ") || "";
}

export function normalizeRecoveryKey(value) {
  const compact = String(value || "").replace(/\s+/g, "");
  decodeBase64Url(compact, { exactBytes: JOURNAL_RECOVERY_KEY_BYTES });
  return compact;
}

export function generateRecoveryKey(cryptoProvider) {
  return encodeBase64Url(randomBytes(JOURNAL_RECOVERY_KEY_BYTES, cryptoProvider));
}

export function normalizeRecoveryPhrase(value) {
  const normalized = String(value || "")
    .normalize("NFKD")
    .trim()
    .toLowerCase()
    .split(/\s+/u)
    .filter(Boolean)
    .join(" ");
  if (normalized.split(" ").length !== 12 || !validateMnemonic(normalized, englishWordlist)) {
    throw new JournalVaultUnlockError();
  }
  const entropy = mnemonicToEntropy(normalized, englishWordlist);
  if (entropy.byteLength !== RECOVERY_ENTROPY_BYTES) {
    entropy.fill(0);
    throw new JournalVaultUnlockError();
  }
  entropy.fill(0);
  return normalized;
}

export function recoveryPhraseToEntropy(value) {
  const normalized = normalizeRecoveryPhrase(value);
  const entropy = mnemonicToEntropy(normalized, englishWordlist);
  if (entropy.byteLength !== RECOVERY_ENTROPY_BYTES) {
    entropy.fill(0);
    throw new JournalVaultUnlockError();
  }
  return entropy;
}

export function generateRecoveryPhrase(cryptoProvider) {
  const entropy = randomBytes(RECOVERY_ENTROPY_BYTES, cryptoProvider);
  try {
    return entropyToMnemonic(entropy, englishWordlist);
  } finally {
    entropy.fill(0);
  }
}

function aadBytes(envelope, purpose) {
  return encoder().encode(JSON.stringify({
    vaultId: envelope.vaultId,
    schemaVersion: envelope.schemaVersion,
    contentType: envelope.contentType,
    purpose,
  }));
}

function validateCipher(value, { expectedCiphertextBytes } = {}) {
  if (!hasExactKeys(value, ["algorithm", "nonce", "ciphertext", "tag"]) || value.algorithm !== "AES-GCM") {
    throw new JournalVaultError("Unsupported Journal cipher metadata.");
  }
  decodeBase64Url(value.nonce, { exactBytes: AES_NONCE_BYTES });
  decodeBase64Url(value.tag, { exactBytes: AES_TAG_BYTES });
  decodeBase64Url(value.ciphertext, {
    ...(expectedCiphertextBytes === undefined ? {} : { exactBytes: expectedCiphertextBytes }),
  });
}

function validatePassphraseWrapper(value) {
  if (!hasExactKeys(value, ["schemaVersion", "type", "kdf", "wrappedKey"]) ||
    value.schemaVersion !== JOURNAL_VAULT_ENVELOPE_VERSION || value.type !== "passphrase") {
    throw new JournalVaultError("Unsupported passphrase wrapper.");
  }
  const kdf = value.kdf;
  if (!hasExactKeys(kdf, ["algorithm", "hash", "iterations", "salt"]) ||
    kdf.algorithm !== "PBKDF2" || kdf.hash !== "SHA-256" ||
    !Number.isSafeInteger(kdf.iterations) || kdf.iterations < JOURNAL_VAULT_KDF_ITERATIONS ||
    kdf.iterations > 2000000) {
    throw new JournalVaultError("Unsupported passphrase KDF metadata.");
  }
  decodeBase64Url(kdf.salt, { minimumBytes: KDF_SALT_BYTES });
  validateCipher(value.wrappedKey, { expectedCiphertextBytes: AES_KEY_BYTES });
}

function validateRecoveryWrapper(value) {
  if (value?.schemaVersion === JOURNAL_VAULT_ENVELOPE_VERSION) {
    if (!hasExactKeys(value, ["schemaVersion", "type", "keyAlgorithm", "wrappedKey"]) ||
      value.type !== "recovery-key" || value.keyAlgorithm !== "AES-256-GCM") {
      throw new JournalVaultError("Unsupported recovery wrapper.");
    }
    validateCipher(value.wrappedKey, { expectedCiphertextBytes: AES_KEY_BYTES });
    return JOURNAL_RECOVERY_FORMAT_LEGACY;
  }
  if (!hasExactKeys(value, ["schemaVersion", "type", "format", "keyAlgorithm", "kdf", "wrappedKey"]) ||
    value.schemaVersion !== RECOVERY_WRAPPER_VERSION || value.type !== "recovery-phrase" ||
    value.format !== JOURNAL_RECOVERY_FORMAT_MNEMONIC || value.keyAlgorithm !== "AES-256-GCM" ||
    !hasExactKeys(value.kdf, ["algorithm", "hash", "salt", "info"]) ||
    value.kdf.algorithm !== "HKDF" || value.kdf.hash !== "SHA-256" ||
    value.kdf.info !== RECOVERY_HKDF_INFO) {
    throw new JournalVaultError("Unsupported recovery wrapper.");
  }
  decodeBase64Url(value.kdf.salt, { minimumBytes: KDF_SALT_BYTES });
  validateCipher(value.wrappedKey, { expectedCiphertextBytes: AES_KEY_BYTES });
  return JOURNAL_RECOVERY_FORMAT_MNEMONIC;
}

export function journalRecoveryFormat(envelope) {
  validateJournalVaultEnvelope(envelope);
  return envelope.wrappers.recovery.schemaVersion === RECOVERY_WRAPPER_VERSION
    ? JOURNAL_RECOVERY_FORMAT_MNEMONIC
    : JOURNAL_RECOVERY_FORMAT_LEGACY;
}

export function validateJournalVaultEnvelope(value) {
  if (!hasExactKeys(value, ["schemaVersion", "vaultId", "contentType", "encryptedVault", "wrappers"]) ||
    value.schemaVersion !== JOURNAL_VAULT_ENVELOPE_VERSION ||
    value.contentType !== JOURNAL_VAULT_CONTENT_TYPE) {
    throw new JournalVaultError("Unsupported Journal vault envelope.");
  }
  decodeBase64Url(value.vaultId, { exactBytes: VAULT_ID_BYTES });
  if (!hasExactKeys(value.encryptedVault, ["schemaVersion", "cipher"]) ||
    value.encryptedVault.schemaVersion !== JOURNAL_VAULT_ENVELOPE_VERSION) {
    throw new JournalVaultError("Unsupported encrypted Journal payload.");
  }
  validateCipher(value.encryptedVault.cipher);
  if (!hasExactKeys(value.wrappers, ["passphrase", "recovery"])) {
    throw new JournalVaultError("Journal key wrappers are missing.");
  }
  validatePassphraseWrapper(value.wrappers.passphrase);
  validateRecoveryWrapper(value.wrappers.recovery);
  return value;
}

async function importAesKey(raw, usages, cryptoProvider, extractable = false) {
  return cryptoApi(cryptoProvider).subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: 256 },
    extractable,
    usages
  );
}

async function encryptBytes(key, plaintext, envelope, purpose, cryptoProvider) {
  const api = cryptoApi(cryptoProvider);
  const nonce = randomBytes(AES_NONCE_BYTES, api);
  const encrypted = new Uint8Array(await api.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, additionalData: aadBytes(envelope, purpose), tagLength: 128 },
    key,
    plaintext
  ));
  const ciphertext = encrypted.subarray(0, encrypted.length - AES_TAG_BYTES);
  const tag = encrypted.subarray(encrypted.length - AES_TAG_BYTES);
  return {
    algorithm: "AES-GCM",
    nonce: encodeBase64Url(nonce),
    ciphertext: encodeBase64Url(ciphertext),
    tag: encodeBase64Url(tag),
  };
}

async function decryptBytes(key, cipher, envelope, purpose, cryptoProvider) {
  validateCipher(cipher);
  const ciphertext = decodeBase64Url(cipher.ciphertext);
  const tag = decodeBase64Url(cipher.tag, { exactBytes: AES_TAG_BYTES });
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);
  return new Uint8Array(await cryptoApi(cryptoProvider).subtle.decrypt(
    {
      name: "AES-GCM",
      iv: decodeBase64Url(cipher.nonce, { exactBytes: AES_NONCE_BYTES }),
      additionalData: aadBytes(envelope, purpose),
      tagLength: 128,
    },
    key,
    combined
  ));
}

async function derivePassphraseKey(passphrase, kdf, usages, cryptoProvider) {
  if (typeof passphrase !== "string") throw new JournalVaultUnlockError();
  const api = cryptoApi(cryptoProvider);
  const passphraseBytes = encoder().encode(passphrase);
  const saltBytes = decodeBase64Url(kdf.salt, { minimumBytes: KDF_SALT_BYTES });
  try {
    const material = await api.subtle.importKey(
      "raw",
      passphraseBytes,
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return api.subtle.deriveKey(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        iterations: kdf.iterations,
        salt: saltBytes,
      },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      usages
    );
  } finally {
    passphraseBytes.fill(0);
    saltBytes.fill(0);
  }
}

async function deriveRecoveryPhraseKey(recoveryPhrase, kdf, usages, cryptoProvider) {
  const api = cryptoApi(cryptoProvider);
  const entropy = recoveryPhraseToEntropy(recoveryPhrase);
  const salt = decodeBase64Url(kdf.salt, { minimumBytes: KDF_SALT_BYTES });
  const info = encoder().encode(kdf.info);
  try {
    const material = await api.subtle.importKey(
      "raw",
      entropy,
      "HKDF",
      false,
      ["deriveKey"]
    );
    return api.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt,
        info,
      },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      usages
    );
  } finally {
    entropy.fill(0);
    salt.fill(0);
    info.fill(0);
  }
}

async function createPassphraseWrapper(rawDataKey, passphrase, envelope, cryptoProvider) {
  if (typeof passphrase !== "string" || passphrase.length < 12) {
    throw new JournalVaultError("Passphrase must be at least 12 characters.");
  }
  const kdf = {
    algorithm: "PBKDF2",
    hash: "SHA-256",
    iterations: JOURNAL_VAULT_KDF_ITERATIONS,
    salt: encodeBase64Url(randomBytes(KDF_SALT_BYTES, cryptoProvider)),
  };
  const wrappingKey = await derivePassphraseKey(passphrase, kdf, ["encrypt"], cryptoProvider);
  return {
    schemaVersion: JOURNAL_VAULT_ENVELOPE_VERSION,
    type: "passphrase",
    kdf,
    wrappedKey: await encryptBytes(wrappingKey, rawDataKey, envelope, "wrap:passphrase", cryptoProvider),
  };
}

async function createLegacyRecoveryWrapper(rawDataKey, recoveryKey, envelope, cryptoProvider) {
  const normalized = normalizeRecoveryKey(recoveryKey);
  const wrappingBytes = decodeBase64Url(normalized, { exactBytes: JOURNAL_RECOVERY_KEY_BYTES });
  try {
    const wrappingKey = await importAesKey(wrappingBytes, ["encrypt"], cryptoProvider);
    return {
      schemaVersion: JOURNAL_VAULT_ENVELOPE_VERSION,
      type: "recovery-key",
      keyAlgorithm: "AES-256-GCM",
      wrappedKey: await encryptBytes(wrappingKey, rawDataKey, envelope, "wrap:recovery", cryptoProvider),
    };
  } finally {
    wrappingBytes.fill(0);
  }
}

async function createRecoveryPhraseWrapper(rawDataKey, recoveryPhrase, envelope, cryptoProvider) {
  const normalized = normalizeRecoveryPhrase(recoveryPhrase);
  const kdf = {
    algorithm: "HKDF",
    hash: "SHA-256",
    salt: encodeBase64Url(randomBytes(KDF_SALT_BYTES, cryptoProvider)),
    info: RECOVERY_HKDF_INFO,
  };
  const wrappingKey = await deriveRecoveryPhraseKey(normalized, kdf, ["encrypt"], cryptoProvider);
  return {
    schemaVersion: RECOVERY_WRAPPER_VERSION,
    type: "recovery-phrase",
    format: JOURNAL_RECOVERY_FORMAT_MNEMONIC,
    keyAlgorithm: "AES-256-GCM",
    kdf,
    wrappedKey: await encryptBytes(
      wrappingKey,
      rawDataKey,
      envelope,
      "wrap:recovery-phrase:v1",
      cryptoProvider
    ),
  };
}

async function unwrapRawDataKey(envelope, credential, cryptoProvider) {
  validateJournalVaultEnvelope(envelope);
  try {
    if (credential?.type === "passphrase") {
      const wrapper = envelope.wrappers.passphrase;
      const key = await derivePassphraseKey(credential.value, wrapper.kdf, ["decrypt"], cryptoProvider);
      return await decryptBytes(key, wrapper.wrappedKey, envelope, "wrap:passphrase", cryptoProvider);
    }
    if (credential?.type === "recovery-key" || credential?.type === "recovery-phrase") {
      const wrapper = envelope.wrappers.recovery;
      const format = validateRecoveryWrapper(wrapper);
      if (format === JOURNAL_RECOVERY_FORMAT_MNEMONIC) {
        const key = await deriveRecoveryPhraseKey(
          credential.value,
          wrapper.kdf,
          ["decrypt"],
          cryptoProvider
        );
        return await decryptBytes(
          key,
          wrapper.wrappedKey,
          envelope,
          "wrap:recovery-phrase:v1",
          cryptoProvider
        );
      }
      const normalized = normalizeRecoveryKey(credential.value);
      const wrappingBytes = decodeBase64Url(normalized, { exactBytes: JOURNAL_RECOVERY_KEY_BYTES });
      try {
        const key = await importAesKey(wrappingBytes, ["decrypt"], cryptoProvider);
        return await decryptBytes(key, wrapper.wrappedKey, envelope, "wrap:recovery", cryptoProvider);
      } finally {
        wrappingBytes.fill(0);
      }
    }
  } catch (error) {
    throw new JournalVaultUnlockError();
  }
  throw new JournalVaultUnlockError();
}

async function decryptPayloadWithKey(envelope, dataKey, cryptoProvider) {
  try {
    const bytes = await decryptBytes(
      dataKey,
      envelope.encryptedVault.cipher,
      envelope,
      "vault:content",
      cryptoProvider
    );
    try {
      return JSON.parse(decoder().decode(bytes));
    } finally {
      bytes.fill(0);
    }
  } catch (error) {
    throw new JournalVaultUnlockError();
  }
}

export async function createJournalVaultEnvelope(
  payload,
  passphrase,
  { cryptoProvider, recoveryPhrase: suppliedRecoveryPhrase, recoveryKey: suppliedRecoveryKey } = {}
) {
  const api = cryptoApi(cryptoProvider);
  const rawDataKey = randomBytes(AES_KEY_BYTES, api);
  if (suppliedRecoveryPhrase && suppliedRecoveryKey) {
    throw new JournalVaultError("Choose one Journal recovery credential format.");
  }
  const recoveryKey = suppliedRecoveryKey ? normalizeRecoveryKey(suppliedRecoveryKey) : null;
  const recoveryPhrase = recoveryKey
    ? null
    : suppliedRecoveryPhrase
      ? normalizeRecoveryPhrase(suppliedRecoveryPhrase)
      : generateRecoveryPhrase(api);
  const envelope = {
    schemaVersion: JOURNAL_VAULT_ENVELOPE_VERSION,
    vaultId: encodeBase64Url(randomBytes(VAULT_ID_BYTES, api)),
    contentType: JOURNAL_VAULT_CONTENT_TYPE,
  };
  try {
    const dataKey = await importAesKey(rawDataKey, ["encrypt", "decrypt"], api);
    const plaintext = encoder().encode(JSON.stringify(payload));
    try {
      envelope.encryptedVault = {
        schemaVersion: JOURNAL_VAULT_ENVELOPE_VERSION,
        cipher: await encryptBytes(dataKey, plaintext, envelope, "vault:content", api),
      };
    } finally {
      plaintext.fill(0);
    }
    envelope.wrappers = {
      passphrase: await createPassphraseWrapper(rawDataKey, passphrase, envelope, api),
      recovery: recoveryKey
        ? await createLegacyRecoveryWrapper(rawDataKey, recoveryKey, envelope, api)
        : await createRecoveryPhraseWrapper(rawDataKey, recoveryPhrase, envelope, api),
    };
    validateJournalVaultEnvelope(envelope);
    return {
      envelope,
      recoveryPhrase,
      recoveryKey,
      recoveryFormat: recoveryKey
        ? JOURNAL_RECOVERY_FORMAT_LEGACY
        : JOURNAL_RECOVERY_FORMAT_MNEMONIC,
      dataKey,
      payload,
    };
  } finally {
    rawDataKey.fill(0);
  }
}

export async function unlockJournalVaultEnvelope(envelope, credential, { cryptoProvider } = {}) {
  const api = cryptoApi(cryptoProvider);
  let rawDataKey;
  try {
    rawDataKey = await unwrapRawDataKey(envelope, credential, api);
    if (rawDataKey.byteLength !== AES_KEY_BYTES) throw new JournalVaultUnlockError();
    const dataKey = await importAesKey(rawDataKey, ["encrypt", "decrypt"], api);
    const payload = await decryptPayloadWithKey(envelope, dataKey, api);
    return { envelope, dataKey, payload };
  } catch (error) {
    if (error instanceof JournalVaultError) throw error;
    throw new JournalVaultUnlockError();
  } finally {
    rawDataKey?.fill(0);
  }
}

export async function decryptJournalVaultWithKey(envelope, dataKey, { cryptoProvider } = {}) {
  validateJournalVaultEnvelope(envelope);
  return decryptPayloadWithKey(envelope, dataKey, cryptoProvider);
}

export async function encryptJournalVaultPayload(envelope, dataKey, payload, { cryptoProvider } = {}) {
  validateJournalVaultEnvelope(envelope);
  const plaintext = encoder().encode(JSON.stringify(payload));
  try {
    const next = {
      ...envelope,
      encryptedVault: {
        schemaVersion: JOURNAL_VAULT_ENVELOPE_VERSION,
        cipher: await encryptBytes(dataKey, plaintext, envelope, "vault:content", cryptoProvider),
      },
    };
    validateJournalVaultEnvelope(next);
    return next;
  } finally {
    plaintext.fill(0);
  }
}

async function authenticateForRewrap(envelope, credential, cryptoProvider) {
  const rawDataKey = await unwrapRawDataKey(envelope, credential, cryptoProvider);
  try {
    const dataKey = await importAesKey(rawDataKey, ["encrypt", "decrypt"], cryptoProvider);
    const payload = await decryptPayloadWithKey(envelope, dataKey, cryptoProvider);
    return { rawDataKey, dataKey, payload };
  } catch (error) {
    rawDataKey.fill(0);
    throw error;
  }
}

export async function rewrapJournalPassphrase(envelope, credential, newPassphrase, { cryptoProvider } = {}) {
  const authenticated = await authenticateForRewrap(envelope, credential, cryptoProvider);
  try {
    const next = {
      ...envelope,
      wrappers: {
        ...envelope.wrappers,
        passphrase: await createPassphraseWrapper(
          authenticated.rawDataKey,
          newPassphrase,
          envelope,
          cryptoProvider
        ),
      },
    };
    validateJournalVaultEnvelope(next);
    return { envelope: next, dataKey: authenticated.dataKey, payload: authenticated.payload };
  } finally {
    authenticated.rawDataKey.fill(0);
  }
}

export async function rotateJournalRecoveryKey(envelope, credential, recoveryPhrase, { cryptoProvider } = {}) {
  const authenticated = await authenticateForRewrap(envelope, credential, cryptoProvider);
  const nextRecoveryPhrase = recoveryPhrase
    ? normalizeRecoveryPhrase(recoveryPhrase)
    : generateRecoveryPhrase(cryptoProvider);
  try {
    const next = {
      ...envelope,
      wrappers: {
        ...envelope.wrappers,
        recovery: await createRecoveryPhraseWrapper(
          authenticated.rawDataKey,
          nextRecoveryPhrase,
          envelope,
          cryptoProvider
        ),
      },
    };
    validateJournalVaultEnvelope(next);
    return {
      envelope: next,
      recoveryPhrase: nextRecoveryPhrase,
      recoveryFormat: JOURNAL_RECOVERY_FORMAT_MNEMONIC,
      dataKey: authenticated.dataKey,
      payload: authenticated.payload,
    };
  } finally {
    authenticated.rawDataKey.fill(0);
  }
}

export async function recoverAndRewrapJournalVault(
  envelope,
  recoveryCredential,
  newPassphrase,
  { rotateRecovery = false, nextRecoveryPhrase, cryptoProvider } = {}
) {
  const authenticated = await authenticateForRewrap(
    envelope,
    { type: "recovery-key", value: recoveryCredential },
    cryptoProvider
  );
  const rotatedPhrase = rotateRecovery
    ? (nextRecoveryPhrase
      ? normalizeRecoveryPhrase(nextRecoveryPhrase)
      : generateRecoveryPhrase(cryptoProvider))
    : null;
  try {
    const passphraseWrapper = await createPassphraseWrapper(
      authenticated.rawDataKey,
      newPassphrase,
      envelope,
      cryptoProvider
    );
    const recoveryWrapper = rotateRecovery
      ? await createRecoveryPhraseWrapper(
        authenticated.rawDataKey,
        rotatedPhrase,
        envelope,
        cryptoProvider
      )
      : envelope.wrappers.recovery;
    const next = {
      ...envelope,
      wrappers: { passphrase: passphraseWrapper, recovery: recoveryWrapper },
    };
    validateJournalVaultEnvelope(next);
    return {
      envelope: next,
      recoveryPhrase: rotatedPhrase,
      recoveryFormat: rotateRecovery
        ? JOURNAL_RECOVERY_FORMAT_MNEMONIC
        : journalRecoveryFormat(envelope),
      dataKey: authenticated.dataKey,
      payload: authenticated.payload,
    };
  } finally {
    authenticated.rawDataKey.fill(0);
  }
}
