import { webcrypto } from "crypto";
import { TextDecoder, TextEncoder } from "util";
import {
  createTraceBackup,
  restoreTraceBackup,
  validateTraceBackup,
} from "./traceBackup";
import {
  enableJournalVault,
  JOURNAL_VAULT_STORAGE_KEY,
  JOURNAL_VAULT_TRANSACTION_KEY,
  unlockJournalVault,
} from "./journalVault";

if (typeof global.TextEncoder !== "function") global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder !== "function") global.TextDecoder = TextDecoder;

jest.setTimeout(120000);

beforeEach(() => {
  Object.defineProperty(global, "crypto", { configurable: true, value: webcrypto });
});

class MemoryStorage {
  constructor(values = {}) { this.values = new Map(Object.entries(values)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

function emptyPhotoDatabase() {
  let records = [];
  return {
    transaction(storeName, mode) {
      let next = [...records];
      const transaction = {
        objectStore() {
          return {
            getAll() {
              const request = {};
              setTimeout(() => {
                request.result = [...records];
                request.onsuccess?.();
              }, 0);
              return request;
            },
            clear() { next = []; },
            put(record) { next.push(record); },
          };
        },
      };
      if (mode === "readwrite") setTimeout(() => {
        records = next;
        transaction.oncomplete?.();
      }, 0);
      return transaction;
    },
  };
}

function entry(id, body) {
  return {
    id,
    schemaVersion: 1,
    visibility: "private",
    title: `${body} title`,
    body,
    date: "2026-08-30",
    time: "12:00",
    tags: ["private-topic"],
    createdAt: "2026-08-30T17:00:00.000Z",
    updatedAt: "2026-08-30T17:00:00.000Z",
  };
}

const passphrase = "backup privacy passphrase";

test("encrypted backup includes only the vault and non-secret metadata, never plaintext", async () => {
  const privateEntry = entry("journal-private", "backup-only secret body");
  const storage = new MemoryStorage({
    journalEntries: JSON.stringify([privateEntry]),
    journalDraft: JSON.stringify({ schemaVersion: 1, editingId: null, form: { title: "draft secret", body: "draft secret body", date: "2026-08-30", time: "12:01", mood: "", tags: "" } }),
  });
  const enabled = await enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto });
  const backup = await createTraceBackup({ storage, openDatabase: async () => emptyPhotoDatabase() });
  const serialized = JSON.stringify(backup);
  expect(backup.data.structured[JOURNAL_VAULT_STORAGE_KEY]).toEqual(enabled.envelope);
  expect(backup.data.structured.journalEntries).toBeNull();
  expect(backup.data.structured.journalDraft).toBeNull();
  expect(serialized).not.toContain("backup-only secret body");
  expect(serialized).not.toContain("draft secret body");
  expect(serialized).not.toContain(passphrase);
  expect(serialized).not.toContain(enabled.recoveryPhrase);
  expect((await validateTraceBackup(backup)).summary).toMatchObject({
    encryptedJournal: true,
    journalEntries: null,
    journalDraft: null,
    journalRecoveryFormat: "bip39-english-12-hkdf-sha256-v1",
  });
});

test("encrypted backup refuses an unrecoverable Journal transaction without leaking it", async () => {
  const storage = new MemoryStorage({
    journalEntries: JSON.stringify([entry("journal-private", "backup-only secret body")]),
  });
  await enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto });
  storage.setItem(JOURNAL_VAULT_TRANSACTION_KEY, JSON.stringify({ shouldNeverExport: "transaction secret" }));

  await expect(createTraceBackup({
    storage,
    openDatabase: async () => emptyPhotoDatabase(),
  })).rejects.toThrow("Journal Privacy Lock transaction is still pending");
  expect(storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY)).toContain("transaction secret");
});

test("encrypted restore replaces the current Journal and remains locked at rest", async () => {
  const source = new MemoryStorage({ journalEntries: JSON.stringify([entry("backup", "restored encrypted secret")]) });
  await enableJournalVault({ storage: source, passphrase, cryptoProvider: webcrypto });
  const backup = await createTraceBackup({ storage: source, openDatabase: async () => emptyPhotoDatabase() });
  const target = new MemoryStorage({ journalEntries: JSON.stringify([entry("old", "old plaintext")]) });
  await restoreTraceBackup(backup, {
    confirmed: true,
    storage: target,
    openDatabase: async () => emptyPhotoDatabase(),
    backupJournalCredential: { type: "passphrase", value: passphrase },
  });
  expect(target.getItem("journalEntries")).toBeNull();
  expect(target.getItem(JOURNAL_VAULT_STORAGE_KEY)).not.toContain("restored encrypted secret");
  const unlocked = await unlockJournalVault(target, { type: "passphrase", value: passphrase }, { cryptoProvider: webcrypto });
  expect(unlocked.payload.domains.journalEntries).toContain("restored encrypted secret");
});

test("malformed encrypted backups are rejected before storage or photo mutation", async () => {
  const source = new MemoryStorage({ journalEntries: JSON.stringify([entry("backup", "tamper target")]) });
  await enableJournalVault({ storage: source, passphrase, cryptoProvider: webcrypto });
  const backup = await createTraceBackup({ storage: source, openDatabase: async () => emptyPhotoDatabase() });
  const corrupted = JSON.parse(JSON.stringify(backup));
  corrupted.data.structured[JOURNAL_VAULT_STORAGE_KEY].encryptedVault.cipher.tag = "not+base64";
  const target = new MemoryStorage({ sentinel: "unchanged" });
  const openDatabase = jest.fn(async () => emptyPhotoDatabase());
  await expect(restoreTraceBackup(corrupted, { confirmed: true, storage: target, openDatabase })).rejects.toThrow();
  expect(target.getItem("sentinel")).toBe("unchanged");
  expect(openDatabase).not.toHaveBeenCalled();
});

test("authenticated corruption and a wrong backup credential are rejected before restore mutation", async () => {
  const source = new MemoryStorage({ journalEntries: JSON.stringify([entry("backup", "authenticated tamper target")]) });
  await enableJournalVault({ storage: source, passphrase, cryptoProvider: webcrypto });
  const backup = await createTraceBackup({ storage: source, openDatabase: async () => emptyPhotoDatabase() });
  const target = new MemoryStorage({ sentinel: "unchanged" });
  const openDatabase = jest.fn(async () => emptyPhotoDatabase());

  await expect(restoreTraceBackup(backup, {
    confirmed: true,
    storage: target,
    openDatabase,
    backupJournalCredential: { type: "passphrase", value: "definitely the wrong passphrase" },
  })).rejects.toThrow();
  expect(target.getItem("sentinel")).toBe("unchanged");
  expect(openDatabase).not.toHaveBeenCalled();

  const corrupted = JSON.parse(JSON.stringify(backup));
  const tag = corrupted.data.structured[JOURNAL_VAULT_STORAGE_KEY].encryptedVault.cipher.tag;
  corrupted.data.structured[JOURNAL_VAULT_STORAGE_KEY].encryptedVault.cipher.tag = `${tag[0] === "A" ? "B" : "A"}${tag.slice(1)}`;
  await expect(restoreTraceBackup(corrupted, {
    confirmed: true,
    storage: target,
    openDatabase,
    backupJournalCredential: { type: "passphrase", value: passphrase },
  })).rejects.toThrow();
  expect(target.getItem("sentinel")).toBe("unchanged");
  expect(openDatabase).not.toHaveBeenCalled();
});

test("legacy plaintext backup restoration over an enabled vault requires an unlocked session and re-encrypts under the current key", async () => {
  const legacyDraft = {
    schemaVersion: 1,
    editingId: null,
    form: {
      title: "Legacy unfinished",
      body: "legacy draft secret",
      date: "2026-08-30",
      time: "12:01",
      mood: "Calm",
      tags: "private",
    },
  };
  const legacySource = new MemoryStorage({
    journalEntries: JSON.stringify([entry("legacy", "legacy restored secret")]),
    journalDraft: JSON.stringify(legacyDraft),
  });
  const legacyBackup = await createTraceBackup({ storage: legacySource, openDatabase: async () => emptyPhotoDatabase() });
  const current = new MemoryStorage({ journalEntries: JSON.stringify([entry("current", "current secret")]) });
  const session = await enableJournalVault({ storage: current, passphrase, cryptoProvider: webcrypto });
  const previousVault = current.getItem(JOURNAL_VAULT_STORAGE_KEY);

  await expect(restoreTraceBackup(legacyBackup, {
    confirmed: true,
    storage: current,
    openDatabase: async () => emptyPhotoDatabase(),
  })).rejects.toThrow("Unlock the current Journal");
  expect(current.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBe(previousVault);

  await restoreTraceBackup(legacyBackup, {
    confirmed: true,
    storage: current,
    openDatabase: async () => emptyPhotoDatabase(),
    journalVaultSession: session,
  });
  expect(current.getItem("journalEntries")).toBeNull();
  expect(current.getItem("journalDraft")).toBeNull();
  const unlocked = await unlockJournalVault(current, { type: "passphrase", value: passphrase }, { cryptoProvider: webcrypto });
  expect(unlocked.payload.domains.journalEntries).toContain("legacy restored secret");
  expect(unlocked.payload.domains.journalEntries).not.toContain("current secret");
  expect(unlocked.payload.domains.journalDraft).toBe(JSON.stringify(legacyDraft));
});

test("version-one backups without privacy settings remain plaintext when no lock is enabled", async () => {
  const source = new MemoryStorage({ journalEntries: JSON.stringify([entry("old", "compatible plaintext")]) });
  const current = await createTraceBackup({ storage: source, openDatabase: async () => emptyPhotoDatabase() });
  const old = JSON.parse(JSON.stringify(current));
  old.schemaVersion = 1;
  delete old.data.structured[JOURNAL_VAULT_STORAGE_KEY];
  const target = new MemoryStorage();
  await restoreTraceBackup(old, { confirmed: true, storage: target, openDatabase: async () => emptyPhotoDatabase() });
  expect(target.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBeNull();
  expect(target.getItem("journalEntries")).toContain("compatible plaintext");
});
