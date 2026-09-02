import {
  createJournalVaultEnvelope,
  decryptJournalVaultWithKey,
  encryptJournalVaultPayload,
  journalRecoveryFormat,
  recoverAndRewrapJournalVault,
  rewrapJournalPassphrase,
  rotateJournalRecoveryKey,
  unlockJournalVaultEnvelope,
  validateJournalVaultEnvelope,
} from "./journalVaultCrypto";
import {
  JOURNAL_DRAFT_STORAGE_KEY,
  JOURNAL_ENTRY_STORAGE_KEY,
  JOURNAL_SCHEMA_VERSION,
  readJournalDraft,
  readJournalEntries,
} from "./journalEntry";

export const JOURNAL_VAULT_STORAGE_KEY = "journalVault";
export const JOURNAL_VAULT_TRANSACTION_KEY = "journalVaultTransaction";
export const JOURNAL_VAULT_PAYLOAD_VERSION = 1;
export const JOURNAL_VAULT_TRANSACTION_VERSION = 1;

const JOURNAL_DOMAIN_KEYS = Object.freeze([
  JOURNAL_ENTRY_STORAGE_KEY,
  JOURNAL_DRAFT_STORAGE_KEY,
]);

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function rawStorage(values) {
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
  };
}

function validateRawJournalEntries(raw) {
  if (raw === null) return;
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Invalid Journal entries.");
  const normalized = readJournalEntries(rawStorage({ [JOURNAL_ENTRY_STORAGE_KEY]: raw }));
  if (normalized.length !== parsed.length) throw new Error("Invalid Journal entries.");
}

function validateRawJournalDraft(raw) {
  if (raw === null) return;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
    parsed.schemaVersion !== JOURNAL_SCHEMA_VERSION || !parsed.form || typeof parsed.form !== "object") {
    throw new Error("Invalid Journal draft.");
  }
  if (!readJournalDraft(rawStorage({ [JOURNAL_DRAFT_STORAGE_KEY]: raw }))) {
    throw new Error("Invalid Journal draft.");
  }
}

export function validateJournalVaultPayload(value, expectedVaultId) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
    Object.keys(value).length !== 4 ||
    value.schemaVersion !== JOURNAL_VAULT_PAYLOAD_VERSION ||
    value.contentType !== "trace-journal-content" ||
    typeof value.vaultId !== "string" ||
    (expectedVaultId && value.vaultId !== expectedVaultId) ||
    !value.domains || typeof value.domains !== "object" || Array.isArray(value.domains)) {
    throw new Error("Invalid Journal vault payload.");
  }
  const domainKeys = Object.keys(value.domains).sort();
  if (domainKeys.length !== JOURNAL_DOMAIN_KEYS.length ||
    !domainKeys.every((key, index) => key === [...JOURNAL_DOMAIN_KEYS].sort()[index])) {
    throw new Error("Invalid Journal vault domains.");
  }
  JOURNAL_DOMAIN_KEYS.forEach((key) => {
    if (value.domains[key] !== null && typeof value.domains[key] !== "string") {
      throw new Error("Invalid Journal vault domain.");
    }
  });
  validateRawJournalEntries(value.domains[JOURNAL_ENTRY_STORAGE_KEY]);
  validateRawJournalDraft(value.domains[JOURNAL_DRAFT_STORAGE_KEY]);
  return value;
}

export function createJournalVaultPayload(storage, vaultId) {
  const payload = {
    schemaVersion: JOURNAL_VAULT_PAYLOAD_VERSION,
    vaultId,
    contentType: "trace-journal-content",
    domains: Object.fromEntries(JOURNAL_DOMAIN_KEYS.map((key) => [key, storage.getItem(key)])),
  };
  return validateJournalVaultPayload(payload, vaultId);
}

export function journalEntriesFromVaultPayload(payload) {
  validateJournalVaultPayload(payload, payload?.vaultId);
  return readJournalEntries(rawStorage(payload.domains));
}

export function journalDraftFromVaultPayload(payload) {
  validateJournalVaultPayload(payload, payload?.vaultId);
  return readJournalDraft(rawStorage(payload.domains));
}

export function updateJournalVaultDomain(payload, key, rawValue) {
  if (!JOURNAL_DOMAIN_KEYS.includes(key)) throw new Error("Unsupported Journal vault domain.");
  const next = {
    ...payload,
    domains: { ...payload.domains, [key]: rawValue },
  };
  return validateJournalVaultPayload(next, payload.vaultId);
}

export function serializeJournalVaultEnvelope(envelope) {
  validateJournalVaultEnvelope(envelope);
  return JSON.stringify(envelope);
}

export function parseJournalVaultEnvelope(raw) {
  if (typeof raw !== "string" || !raw) throw new Error("Journal vault is missing.");
  const parsed = JSON.parse(raw);
  validateJournalVaultEnvelope(parsed);
  return parsed;
}

export function readJournalVaultEnvelope(storage = localStorage) {
  const raw = storage.getItem(JOURNAL_VAULT_STORAGE_KEY);
  return raw === null ? null : parseJournalVaultEnvelope(raw);
}

export function journalVaultStorageState(storage = localStorage) {
  const raw = storage.getItem(JOURNAL_VAULT_STORAGE_KEY);
  if (raw === null) {
    return { enabled: false, envelope: null, malformed: false, recoveryFormat: null };
  }
  try {
    const envelope = parseJournalVaultEnvelope(raw);
    return {
      enabled: true,
      envelope,
      malformed: false,
      recoveryFormat: journalRecoveryFormat(envelope),
    };
  } catch (error) {
    return { enabled: true, envelope: null, malformed: true, recoveryFormat: null };
  }
}

function restoreRaw(storage, key, raw) {
  if (raw === null) storage.removeItem(key);
  else storage.setItem(key, raw);
}

function writeTransaction(storage, transaction) {
  const serialized = JSON.stringify(transaction);
  storage.setItem(JOURNAL_VAULT_TRANSACTION_KEY, serialized);
  if (storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY) !== serialized) {
    throw new Error("Journal vault transaction could not be verified.");
  }
  return serialized;
}

function clearTransaction(storage) {
  storage.removeItem(JOURNAL_VAULT_TRANSACTION_KEY);
  if (storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY) !== null) {
    throw new Error("Journal vault transaction cleanup could not be verified.");
  }
}

function assertTransaction(storage, serialized) {
  if (storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY) !== serialized) {
    throw new Error("Journal vault transaction changed before completion.");
  }
}

export function recoverJournalVaultTransaction(storage = localStorage) {
  const raw = storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY);
  if (raw === null) return false;
  let transaction;
  try {
    transaction = JSON.parse(raw);
  } catch (error) {
    throw new Error("The interrupted Journal privacy transaction is malformed.");
  }
  if (!transaction || transaction.schemaVersion !== JOURNAL_VAULT_TRANSACTION_VERSION) {
    throw new Error("The interrupted Journal privacy transaction is unsupported.");
  }
  if (transaction.operation === "reset") {
    if (Object.keys(transaction).length !== 2) {
      throw new Error("The interrupted Journal privacy transaction is malformed.");
    }
    [...JOURNAL_DOMAIN_KEYS, JOURNAL_VAULT_STORAGE_KEY].forEach((key) => storage.removeItem(key));
    if ([...JOURNAL_DOMAIN_KEYS, JOURNAL_VAULT_STORAGE_KEY]
      .some((key) => storage.getItem(key) !== null)) {
      throw new Error("Journal reset recovery verification failed.");
    }
    clearTransaction(storage);
    return true;
  }
  if (transaction.operation === "enable") {
    if (Object.keys(transaction).length !== 3 || !transaction.previous ||
      Object.keys(transaction.previous).length !== JOURNAL_DOMAIN_KEYS.length ||
      JOURNAL_DOMAIN_KEYS.some((key) =>
      !Object.prototype.hasOwnProperty.call(transaction.previous, key) ||
      (transaction.previous[key] !== null && typeof transaction.previous[key] !== "string")
    )) {
      throw new Error("The interrupted Journal privacy transaction is malformed.");
    }
    validateRawJournalEntries(transaction.previous[JOURNAL_ENTRY_STORAGE_KEY]);
    validateRawJournalDraft(transaction.previous[JOURNAL_DRAFT_STORAGE_KEY]);
    JOURNAL_DOMAIN_KEYS.forEach((key) => restoreRaw(storage, key, transaction.previous[key]));
    storage.removeItem(JOURNAL_VAULT_STORAGE_KEY);
  } else if (transaction.operation === "disable" || transaction.operation === "replace") {
    if (Object.keys(transaction).length !== 3 ||
      (transaction.previousVault !== null && typeof transaction.previousVault !== "string")) {
      throw new Error("The interrupted Journal privacy transaction is malformed.");
    }
    if (transaction.previousVault !== null) parseJournalVaultEnvelope(transaction.previousVault);
    if (transaction.operation === "disable") {
      JOURNAL_DOMAIN_KEYS.forEach((key) => storage.removeItem(key));
    }
    restoreRaw(storage, JOURNAL_VAULT_STORAGE_KEY, transaction.previousVault ?? null);
  } else {
    throw new Error("The interrupted Journal privacy transaction is unsupported.");
  }
  if (transaction.operation === "enable") {
    JOURNAL_DOMAIN_KEYS.forEach((key) => {
      if (storage.getItem(key) !== transaction.previous[key]) throw new Error("Journal recovery verification failed.");
    });
    if (storage.getItem(JOURNAL_VAULT_STORAGE_KEY) !== null) throw new Error("Journal recovery verification failed.");
  } else {
    if (storage.getItem(JOURNAL_VAULT_STORAGE_KEY) !== (transaction.previousVault ?? null)) {
      throw new Error("Journal recovery verification failed.");
    }
    if (transaction.operation === "disable" && JOURNAL_DOMAIN_KEYS.some((key) => storage.getItem(key) !== null)) {
      throw new Error("Journal recovery verification failed.");
    }
  }
  clearTransaction(storage);
  return true;
}

function rollbackEnable(storage, transaction) {
  JOURNAL_DOMAIN_KEYS.forEach((key) => restoreRaw(storage, key, transaction.previous[key]));
  JOURNAL_DOMAIN_KEYS.forEach((key) => {
    if (storage.getItem(key) !== transaction.previous[key]) throw new Error("Journal setup rollback verification failed.");
  });
  storage.removeItem(JOURNAL_VAULT_STORAGE_KEY);
  if (storage.getItem(JOURNAL_VAULT_STORAGE_KEY) !== null) throw new Error("Journal setup rollback verification failed.");
  clearTransaction(storage);
}

export async function enableJournalVault({
  storage = localStorage,
  passphrase,
  recoveryPhrase,
  recoveryKey,
  cryptoProvider,
} = {}) {
  if (storage.getItem(JOURNAL_VAULT_STORAGE_KEY) !== null) throw new Error("Journal lock is already enabled.");
  if (storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY) !== null) {
    throw new Error("Another Journal privacy operation must finish or recover first.");
  }
  const transaction = {
    schemaVersion: JOURNAL_VAULT_TRANSACTION_VERSION,
    operation: "enable",
    previous: Object.fromEntries(JOURNAL_DOMAIN_KEYS.map((key) => [key, storage.getItem(key)])),
  };
  try {
    validateRawJournalEntries(transaction.previous[JOURNAL_ENTRY_STORAGE_KEY]);
    validateRawJournalDraft(transaction.previous[JOURNAL_DRAFT_STORAGE_KEY]);
    const serializedTransaction = writeTransaction(storage, transaction);
    const placeholderPayload = {
      schemaVersion: JOURNAL_VAULT_PAYLOAD_VERSION,
      vaultId: "pending",
      contentType: "trace-journal-content",
      domains: cloneJson(transaction.previous),
    };
    const created = await createJournalVaultEnvelope(placeholderPayload, passphrase, {
      cryptoProvider,
      recoveryPhrase,
      recoveryKey,
    });
    created.payload.vaultId = created.envelope.vaultId;
    created.envelope = await encryptJournalVaultPayload(
      created.envelope,
      created.dataKey,
      created.payload,
      { cryptoProvider }
    );
    assertTransaction(storage, serializedTransaction);
    storage.setItem(JOURNAL_VAULT_STORAGE_KEY, serializeJournalVaultEnvelope(created.envelope));
    const persisted = readJournalVaultEnvelope(storage);
    const verified = await unlockJournalVaultEnvelope(
      persisted,
      { type: "passphrase", value: passphrase },
      { cryptoProvider }
    );
    validateJournalVaultPayload(verified.payload, persisted.vaultId);
    const recoveryVerified = await unlockJournalVaultEnvelope(
      persisted,
      {
        type: created.recoveryPhrase ? "recovery-phrase" : "recovery-key",
        value: created.recoveryPhrase || created.recoveryKey,
      },
      { cryptoProvider }
    );
    validateJournalVaultPayload(recoveryVerified.payload, persisted.vaultId);
    if (JSON.stringify(verified.payload.domains) !== JSON.stringify(transaction.previous)) {
      throw new Error("Journal vault verification failed.");
    }
    JOURNAL_DOMAIN_KEYS.forEach((key) => storage.removeItem(key));
    if (JOURNAL_DOMAIN_KEYS.some((key) => storage.getItem(key) !== null)) {
      throw new Error("Plaintext Journal cleanup could not be verified.");
    }
    assertTransaction(storage, serializedTransaction);
    clearTransaction(storage);
    return {
      envelope: persisted,
      recoveryPhrase: created.recoveryPhrase,
      recoveryKey: created.recoveryKey,
      recoveryFormat: created.recoveryFormat,
      dataKey: verified.dataKey,
      payload: verified.payload,
    };
  } catch (error) {
    try {
      rollbackEnable(storage, transaction);
    } catch (rollbackError) {
      throw new Error("Journal lock setup failed and automatic recovery could not complete. Keep this page open.");
    }
    throw error;
  }
}

async function replaceEnvelopeAtomically(storage, nextEnvelope, verify, expectedVaultRaw) {
  if (storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY) !== null) {
    throw new Error("Another Journal privacy operation must finish or recover first.");
  }
  const previousVault = storage.getItem(JOURNAL_VAULT_STORAGE_KEY);
  if (expectedVaultRaw !== undefined && previousVault !== expectedVaultRaw) {
    throw new Error("Journal vault changed in another tab.");
  }
  const transaction = {
    schemaVersion: JOURNAL_VAULT_TRANSACTION_VERSION,
    operation: "replace",
    previousVault,
  };
  try {
    const serializedTransaction = writeTransaction(storage, transaction);
    storage.setItem(JOURNAL_VAULT_STORAGE_KEY, serializeJournalVaultEnvelope(nextEnvelope));
    const persisted = readJournalVaultEnvelope(storage);
    await verify(persisted);
    assertTransaction(storage, serializedTransaction);
    clearTransaction(storage);
    return persisted;
  } catch (error) {
    try {
      restoreRaw(storage, JOURNAL_VAULT_STORAGE_KEY, previousVault);
      if (storage.getItem(JOURNAL_VAULT_STORAGE_KEY) !== previousVault) {
        throw new Error("Journal vault rollback verification failed.");
      }
      clearTransaction(storage);
    } catch (rollbackError) {
      throw new Error("Journal vault update failed and automatic recovery could not complete. Keep this page open.");
    }
    throw error;
  }
}

export async function unlockJournalVault(storage, credential, { cryptoProvider } = {}) {
  const envelope = readJournalVaultEnvelope(storage);
  if (!envelope) throw new Error("Journal lock is not enabled.");
  const session = await unlockJournalVaultEnvelope(envelope, credential, { cryptoProvider });
  validateJournalVaultPayload(session.payload, envelope.vaultId);
  return session;
}

export async function persistUnlockedJournalVault(storage, session, payload, { cryptoProvider } = {}) {
  validateJournalVaultPayload(payload, session.envelope.vaultId);
  const nextEnvelope = await encryptJournalVaultPayload(
    session.envelope,
    session.dataKey,
    payload,
    { cryptoProvider }
  );
  const persisted = await replaceEnvelopeAtomically(storage, nextEnvelope, async (readBack) => {
    const verifiedPayload = await decryptJournalVaultWithKey(readBack, session.dataKey, { cryptoProvider });
    validateJournalVaultPayload(verifiedPayload, readBack.vaultId);
    if (JSON.stringify(verifiedPayload) !== JSON.stringify(payload)) {
      throw new Error("Journal vault persistence verification failed.");
    }
  }, serializeJournalVaultEnvelope(session.envelope));
  return { ...session, envelope: persisted, payload };
}

export async function changeJournalVaultPassphrase(
  storage,
  credential,
  newPassphrase,
  { cryptoProvider } = {}
) {
  const current = readJournalVaultEnvelope(storage);
  const expectedVaultRaw = serializeJournalVaultEnvelope(current);
  const changed = await rewrapJournalPassphrase(current, credential, newPassphrase, { cryptoProvider });
  const persisted = await replaceEnvelopeAtomically(storage, changed.envelope, async (readBack) => {
    const verified = await unlockJournalVaultEnvelope(
      readBack,
      { type: "passphrase", value: newPassphrase },
      { cryptoProvider }
    );
    validateJournalVaultPayload(verified.payload, readBack.vaultId);
  }, expectedVaultRaw);
  return { ...changed, envelope: persisted };
}

export async function rotateJournalVaultRecovery(
  storage,
  credential,
  recoveryPhrase,
  { cryptoProvider } = {}
) {
  const current = readJournalVaultEnvelope(storage);
  const expectedVaultRaw = serializeJournalVaultEnvelope(current);
  const changed = await rotateJournalRecoveryKey(
    current,
    credential,
    recoveryPhrase,
    { cryptoProvider }
  );
  const persisted = await replaceEnvelopeAtomically(storage, changed.envelope, async (readBack) => {
    const verified = await unlockJournalVaultEnvelope(
      readBack,
      { type: "recovery-phrase", value: changed.recoveryPhrase },
      { cryptoProvider }
    );
    validateJournalVaultPayload(verified.payload, readBack.vaultId);
  }, expectedVaultRaw);
  return { ...changed, envelope: persisted };
}

export async function recoverJournalVaultAccess(
  storage,
  recoveryCredential,
  newPassphrase,
  options = {}
) {
  const current = readJournalVaultEnvelope(storage);
  const expectedVaultRaw = serializeJournalVaultEnvelope(current);
  const changed = await recoverAndRewrapJournalVault(
    current,
    recoveryCredential,
    newPassphrase,
    options
  );
  const persisted = await replaceEnvelopeAtomically(storage, changed.envelope, async (readBack) => {
    const verified = await unlockJournalVaultEnvelope(
      readBack,
      { type: "passphrase", value: newPassphrase },
      options
    );
    validateJournalVaultPayload(verified.payload, readBack.vaultId);
    if (changed.recoveryPhrase) {
      const recoveryVerified = await unlockJournalVaultEnvelope(
        readBack,
        { type: "recovery-phrase", value: changed.recoveryPhrase },
        options
      );
      validateJournalVaultPayload(recoveryVerified.payload, readBack.vaultId);
    }
  }, expectedVaultRaw);
  return { ...changed, envelope: persisted };
}

export async function disableJournalVault(
  storage,
  credential,
  { cryptoProvider } = {}
) {
  if (storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY) !== null) {
    throw new Error("Another Journal privacy operation must finish or recover first.");
  }
  const previousVault = storage.getItem(JOURNAL_VAULT_STORAGE_KEY);
  const envelope = parseJournalVaultEnvelope(previousVault);
  const unlocked = await unlockJournalVaultEnvelope(envelope, credential, { cryptoProvider });
  validateJournalVaultPayload(unlocked.payload, envelope.vaultId);
  const transaction = {
    schemaVersion: JOURNAL_VAULT_TRANSACTION_VERSION,
    operation: "disable",
    previousVault,
  };
  if (storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY) !== null) {
    throw new Error("Another Journal privacy operation must finish or recover first.");
  }
  if (storage.getItem(JOURNAL_VAULT_STORAGE_KEY) !== previousVault) {
    throw new Error("Journal vault changed in another tab.");
  }
  try {
    const serializedTransaction = writeTransaction(storage, transaction);
    JOURNAL_DOMAIN_KEYS.forEach((key) => restoreRaw(storage, key, unlocked.payload.domains[key]));
    JOURNAL_DOMAIN_KEYS.forEach((key) => {
      if (storage.getItem(key) !== unlocked.payload.domains[key]) {
        throw new Error("Plaintext Journal restoration could not be verified.");
      }
    });
    storage.removeItem(JOURNAL_VAULT_STORAGE_KEY);
    if (storage.getItem(JOURNAL_VAULT_STORAGE_KEY) !== null) {
      throw new Error("Encrypted Journal cleanup could not be verified.");
    }
    assertTransaction(storage, serializedTransaction);
    clearTransaction(storage);
    return {
      entries: journalEntriesFromVaultPayload(unlocked.payload),
      draft: journalDraftFromVaultPayload(unlocked.payload),
    };
  } catch (error) {
    try {
      JOURNAL_DOMAIN_KEYS.forEach((key) => storage.removeItem(key));
      if (JOURNAL_DOMAIN_KEYS.some((key) => storage.getItem(key) !== null)) {
        throw new Error("Journal lock disable rollback verification failed.");
      }
      restoreRaw(storage, JOURNAL_VAULT_STORAGE_KEY, previousVault);
      if (storage.getItem(JOURNAL_VAULT_STORAGE_KEY) !== previousVault) {
        throw new Error("Journal lock disable rollback verification failed.");
      }
      clearTransaction(storage);
    } catch (rollbackError) {
      throw new Error("Journal lock disable failed and automatic recovery could not complete. Keep this page open.");
    }
    throw error;
  }
}

export function resetJournalVault(storage = localStorage) {
  const keys = [JOURNAL_VAULT_STORAGE_KEY, ...JOURNAL_DOMAIN_KEYS];
  const previous = Object.fromEntries(keys.map((key) => [key, storage.getItem(key)]));
  const previousTransaction = storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY);
  const transaction = {
    schemaVersion: JOURNAL_VAULT_TRANSACTION_VERSION,
    operation: "reset",
  };
  try {
    writeTransaction(storage, transaction);
    keys.forEach((key) => storage.removeItem(key));
    if (keys.some((key) => storage.getItem(key) !== null)) {
      throw new Error("Journal reset verification failed.");
    }
    clearTransaction(storage);
    return true;
  } catch (error) {
    try {
      keys.forEach((key) => restoreRaw(storage, key, previous[key]));
      restoreRaw(storage, JOURNAL_VAULT_TRANSACTION_KEY, previousTransaction);
      if (keys.some((key) => storage.getItem(key) !== previous[key]) ||
        storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY) !== previousTransaction) {
        throw new Error("Journal reset rollback verification failed.");
      }
    } catch (rollbackError) {
      throw new Error("Journal reset failed and automatic recovery could not complete. Keep this page open.");
    }
    throw error;
  }
}

export function createVaultPayloadFromBackupEntries(envelope, journalEntries, journalDraft = null) {
  const domains = {
    [JOURNAL_ENTRY_STORAGE_KEY]: journalEntries == null ? null : JSON.stringify(journalEntries),
    [JOURNAL_DRAFT_STORAGE_KEY]: journalDraft == null ? null : JSON.stringify(journalDraft),
  };
  return validateJournalVaultPayload({
    schemaVersion: JOURNAL_VAULT_PAYLOAD_VERSION,
    vaultId: envelope.vaultId,
    contentType: "trace-journal-content",
    domains,
  }, envelope.vaultId);
}

export async function encryptBackupJournalWithSession(
  session,
  journalEntries,
  journalDraft = null,
  { cryptoProvider } = {}
) {
  const payload = createVaultPayloadFromBackupEntries(session.envelope, journalEntries, journalDraft);
  const envelope = await encryptJournalVaultPayload(
    session.envelope,
    session.dataKey,
    payload,
    { cryptoProvider }
  );
  const verified = await decryptJournalVaultWithKey(envelope, session.dataKey, { cryptoProvider });
  validateJournalVaultPayload(verified, envelope.vaultId);
  return envelope;
}
