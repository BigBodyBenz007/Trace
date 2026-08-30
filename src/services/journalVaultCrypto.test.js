import { webcrypto } from "crypto";
import { TextDecoder, TextEncoder } from "util";
import {
  createJournalVaultEnvelope,
  decryptJournalVaultWithKey,
  encodeBase64Url,
  generateRecoveryKey,
  generateRecoveryPhrase,
  journalRecoveryFormat,
  JOURNAL_RECOVERY_FORMAT_LEGACY,
  JOURNAL_RECOVERY_FORMAT_MNEMONIC,
  JOURNAL_VAULT_KDF_ITERATIONS,
  normalizeRecoveryPhrase,
  recoverAndRewrapJournalVault,
  rewrapJournalPassphrase,
  rotateJournalRecoveryKey,
  unlockJournalVaultEnvelope,
  validateJournalVaultEnvelope,
} from "./journalVaultCrypto";

if (typeof global.TextEncoder !== "function") global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder !== "function") global.TextDecoder = TextDecoder;

jest.setTimeout(120000);

const cryptoOptions = { cryptoProvider: webcrypto };
const passphrase = "a long private passphrase";
const payload = {
  schemaVersion: 1,
  vaultId: "replaced-by-service",
  contentType: "trace-journal-content",
  domains: {
    journalEntries: JSON.stringify([{ id: "private", body: "unmistakable secret prose" }]),
    journalDraft: JSON.stringify({ body: "unfinished secret thought" }),
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mutateBase64(value) {
  const first = value[0] === "A" ? "B" : "A";
  return `${first}${value.slice(1)}`;
}

async function fixture() {
  const created = await createJournalVaultEnvelope(payload, passphrase, cryptoOptions);
  return {
    ...created,
    payload: { ...payload, vaultId: created.envelope.vaultId },
  };
}

test("AES-GCM vault round-trips with a non-extractable data key and fresh nonces", async () => {
  const created = await fixture();
  const unlocked = await unlockJournalVaultEnvelope(
    created.envelope,
    { type: "passphrase", value: passphrase },
    cryptoOptions
  );
  expect(unlocked.payload).toEqual(payload);
  expect(unlocked.dataKey.extractable).toBe(false);
  const second = await createJournalVaultEnvelope(payload, passphrase, cryptoOptions);
  expect(second.envelope.encryptedVault.cipher.nonce).not.toBe(created.envelope.encryptedVault.cipher.nonce);
  expect(second.envelope.wrappers.passphrase.wrappedKey.nonce).not.toBe(created.envelope.wrappers.passphrase.wrappedKey.nonce);
  expect(second.envelope.wrappers.recovery.wrappedKey.nonce).not.toBe(created.envelope.wrappers.recovery.wrappedKey.nonce);
  expect(second.envelope.wrappers.recovery.kdf.salt).not.toBe(created.envelope.wrappers.recovery.kdf.salt);
  expect(second.recoveryPhrase).not.toBe(created.recoveryPhrase);
});

test("12-word recovery phrases use 128 bits of secure entropy and pass BIP-39 validation", () => {
  const requestedLengths = [];
  const cryptoProvider = {
    subtle: webcrypto.subtle,
    getRandomValues(value) {
      requestedLengths.push(value.byteLength);
      return webcrypto.getRandomValues(value);
    },
  };
  const first = generateRecoveryPhrase(cryptoProvider);
  const second = generateRecoveryPhrase(cryptoProvider);
  expect(first.split(" ")).toHaveLength(12);
  expect(normalizeRecoveryPhrase(first)).toBe(first);
  expect(second).not.toBe(first);
  expect(requestedLengths).toEqual([16, 16]);
});

test("recovery phrase normalization accepts whitespace and capitalization but rejects checksum errors", () => {
  expect(normalizeRecoveryPhrase(
    "  ABANDON abandon\nabandon  abandon abandon abandon abandon abandon abandon abandon abandon ABOUT  "
  )).toBe("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about");
  expect(() => normalizeRecoveryPhrase(
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon ability"
  )).toThrow("Journal unlock failed");
});

test("wrong passphrases and recovery phrases fail closed", async () => {
  const created = await fixture();
  await expect(unlockJournalVaultEnvelope(created.envelope, { type: "passphrase", value: "wrong credential" }, cryptoOptions))
    .rejects.toThrow("Journal unlock failed");
  await expect(unlockJournalVaultEnvelope(created.envelope, { type: "recovery-phrase", value: generateRecoveryPhrase(webcrypto) }, cryptoOptions))
    .rejects.toThrow("Journal unlock failed");
});

test.each([
  ["ciphertext", (value) => { value.encryptedVault.cipher.ciphertext = mutateBase64(value.encryptedVault.cipher.ciphertext); }],
  ["content nonce", (value) => { value.encryptedVault.cipher.nonce = mutateBase64(value.encryptedVault.cipher.nonce); }],
  ["authentication tag", (value) => { value.encryptedVault.cipher.tag = mutateBase64(value.encryptedVault.cipher.tag); }],
  ["PBKDF2 salt", (value) => { value.wrappers.passphrase.kdf.salt = mutateBase64(value.wrappers.passphrase.kdf.salt); }],
  ["wrapper ciphertext", (value) => { value.wrappers.passphrase.wrappedKey.ciphertext = mutateBase64(value.wrappers.passphrase.wrappedKey.ciphertext); }],
  ["AAD-bound vault ID", (value) => { value.vaultId = encodeBase64Url(webcrypto.getRandomValues(new Uint8Array(16))); }],
])("%s tampering is authenticated and rejected", async (label, tamper) => {
  const created = await fixture();
  const changed = clone(created.envelope);
  tamper(changed);
  await expect(unlockJournalVaultEnvelope(changed, { type: "passphrase", value: passphrase }, cryptoOptions))
    .rejects.toThrow();
});

test("malformed base64url and unsupported envelope versions fail validation", async () => {
  const created = await fixture();
  const malformed = clone(created.envelope);
  malformed.encryptedVault.cipher.nonce = "not+base64";
  expect(() => validateJournalVaultEnvelope(malformed)).toThrow("base64url");
  const unsupported = clone(created.envelope);
  unsupported.schemaVersion = 99;
  expect(() => validateJournalVaultEnvelope(unsupported)).toThrow("Unsupported");
  expect(created.envelope.wrappers.passphrase.kdf.iterations).toBeGreaterThanOrEqual(JOURNAL_VAULT_KDF_ITERATIONS);
});

test("versioned envelope validation rejects unauthenticated extra metadata", async () => {
  const created = await fixture();
  expect(() => validateJournalVaultEnvelope({ ...created.envelope, plaintextPreview: "must never persist" })).toThrow("Unsupported");
});

test("versioned HKDF recovery wrapper authenticates the same vault content", async () => {
  const created = await fixture();
  expect(journalRecoveryFormat(created.envelope)).toBe(JOURNAL_RECOVERY_FORMAT_MNEMONIC);
  expect(created.envelope.wrappers.recovery).toMatchObject({
    schemaVersion: 2,
    type: "recovery-phrase",
    format: JOURNAL_RECOVERY_FORMAT_MNEMONIC,
    kdf: { algorithm: "HKDF", hash: "SHA-256", info: "Trace Journal recovery wrapper v1" },
  });
  const byPassphrase = await unlockJournalVaultEnvelope(created.envelope, { type: "passphrase", value: passphrase }, cryptoOptions);
  const byRecovery = await unlockJournalVaultEnvelope(created.envelope, { type: "recovery-phrase", value: created.recoveryPhrase }, cryptoOptions);
  expect(byRecovery.payload).toEqual(byPassphrase.payload);
  expect(await decryptJournalVaultWithKey(created.envelope, byRecovery.dataKey, cryptoOptions)).toEqual(payload);
});

test("HKDF salt and recovery wrapper authentication reject tampering", async () => {
  const created = await fixture();
  const changed = clone(created.envelope);
  changed.wrappers.recovery.kdf.salt = mutateBase64(changed.wrappers.recovery.kdf.salt);
  await expect(unlockJournalVaultEnvelope(
    changed,
    { type: "recovery-phrase", value: created.recoveryPhrase },
    cryptoOptions
  )).rejects.toThrow("Journal unlock failed");
});

test("passphrase rewrap preserves ciphertext and content while invalidating the old passphrase", async () => {
  const created = await fixture();
  const changed = await rewrapJournalPassphrase(
    created.envelope,
    { type: "passphrase", value: passphrase },
    "an entirely new passphrase",
    cryptoOptions
  );
  expect(changed.envelope.encryptedVault).toEqual(created.envelope.encryptedVault);
  await expect(unlockJournalVaultEnvelope(changed.envelope, { type: "passphrase", value: passphrase }, cryptoOptions)).rejects.toThrow();
  expect((await unlockJournalVaultEnvelope(changed.envelope, { type: "passphrase", value: "an entirely new passphrase" }, cryptoOptions)).payload).toEqual(payload);
});

test("recovery rotation uses a fresh phrase and nonce without rewriting vault ciphertext", async () => {
  const created = await fixture();
  const nextRecoveryPhrase = generateRecoveryPhrase(webcrypto);
  const changed = await rotateJournalRecoveryKey(
    created.envelope,
    { type: "passphrase", value: passphrase },
    nextRecoveryPhrase,
    cryptoOptions
  );
  expect(changed.envelope.encryptedVault).toEqual(created.envelope.encryptedVault);
  expect(changed.envelope.wrappers.recovery.wrappedKey.nonce)
    .not.toBe(created.envelope.wrappers.recovery.wrappedKey.nonce);
  await expect(unlockJournalVaultEnvelope(changed.envelope, { type: "recovery-phrase", value: created.recoveryPhrase }, cryptoOptions)).rejects.toThrow();
  expect((await unlockJournalVaultEnvelope(changed.envelope, { type: "recovery-phrase", value: nextRecoveryPhrase }, cryptoOptions)).payload).toEqual(payload);
});

test("recovery unlock immediately rewraps the same data key with a new passphrase", async () => {
  const created = await fixture();
  const changed = await recoverAndRewrapJournalVault(
    created.envelope,
    created.recoveryPhrase,
    "replacement after recovery",
    { ...cryptoOptions, rotateRecovery: false }
  );
  expect(changed.envelope.encryptedVault).toEqual(created.envelope.encryptedVault);
  expect((await unlockJournalVaultEnvelope(changed.envelope, { type: "passphrase", value: "replacement after recovery" }, cryptoOptions)).payload).toEqual(payload);
});

test("legacy long recovery keys remain compatible and rotate only their wrapper to mnemonic format", async () => {
  const legacyRecoveryKey = generateRecoveryKey(webcrypto);
  const created = await createJournalVaultEnvelope(payload, passphrase, {
    ...cryptoOptions,
    recoveryKey: legacyRecoveryKey,
  });
  expect(journalRecoveryFormat(created.envelope)).toBe(JOURNAL_RECOVERY_FORMAT_LEGACY);
  expect((await unlockJournalVaultEnvelope(
    created.envelope,
    { type: "recovery-key", value: legacyRecoveryKey },
    cryptoOptions
  )).payload).toEqual(payload);

  const changed = await rotateJournalRecoveryKey(
    created.envelope,
    { type: "passphrase", value: passphrase },
    undefined,
    cryptoOptions
  );
  expect(changed.envelope.vaultId).toBe(created.envelope.vaultId);
  expect(changed.envelope.encryptedVault).toEqual(created.envelope.encryptedVault);
  expect(changed.envelope.wrappers.passphrase).toEqual(created.envelope.wrappers.passphrase);
  expect(journalRecoveryFormat(changed.envelope)).toBe(JOURNAL_RECOVERY_FORMAT_MNEMONIC);
  await expect(unlockJournalVaultEnvelope(
    changed.envelope,
    { type: "recovery-key", value: legacyRecoveryKey },
    cryptoOptions
  )).rejects.toThrow();
  expect((await unlockJournalVaultEnvelope(
    changed.envelope,
    { type: "recovery-phrase", value: changed.recoveryPhrase },
    cryptoOptions
  )).payload).toEqual(payload);
});

test("serialized encrypted storage contains no Journal plaintext or credentials", async () => {
  const created = await fixture();
  const serialized = JSON.stringify(created.envelope);
  expect(serialized).not.toContain("unmistakable secret prose");
  expect(serialized).not.toContain("unfinished secret thought");
  expect(serialized).not.toContain(passphrase);
  expect(serialized).not.toContain(created.recoveryPhrase);
});
