import { webcrypto } from "crypto";
import { TextDecoder, TextEncoder } from "util";
import {
  changeJournalVaultPassphrase,
  disableJournalVault,
  enableJournalVault,
  journalDraftFromVaultPayload,
  journalEntriesFromVaultPayload,
  JOURNAL_VAULT_STORAGE_KEY,
  JOURNAL_VAULT_TRANSACTION_KEY,
  recoverJournalVaultTransaction,
  resetJournalVault,
  rotateJournalVaultRecovery,
  unlockJournalVault,
} from "./journalVault";
import { generateRecoveryPhrase } from "./journalVaultCrypto";

if (typeof global.TextEncoder !== "function") global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder !== "function") global.TextDecoder = TextDecoder;

jest.setTimeout(120000);

class MemoryStorage {
  constructor(values = {}) {
    this.values = new Map(Object.entries(values));
    this.operations = [];
    this.fail = null;
    this.read = null;
  }
  getItem(key) {
    this.operations.push(["get", key]);
    if (this.fail?.("get", key)) throw new Error("read failed");
    const value = this.values.has(key) ? this.values.get(key) : null;
    return this.read ? this.read(key, value, this.operations) : value;
  }
  setItem(key, value) {
    this.operations.push(["set", key]);
    if (this.fail?.("set", key)) throw new Error("write failed");
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.operations.push(["remove", key]);
    if (this.fail?.("remove", key)) throw new Error("remove failed");
    this.values.delete(key);
  }
}

const passphrase = "a migration passphrase";
const entries = [{
  id: "journal-1",
  schemaVersion: 1,
  visibility: "private",
  title: "Exact title",
  body: "Exact body",
  date: "2026-08-30",
  time: "08:15",
  mood: "Calm",
  tags: ["Exact"],
  createdAt: "2026-08-30T13:15:00.000Z",
  updatedAt: "2026-08-30T13:15:00.000Z",
  futureField: { preserved: true },
}];
const draft = {
  schemaVersion: 1,
  editingId: "journal-1",
  form: { title: "Draft", body: "Unfinished", date: "2026-08-30", time: "09:00", mood: "Calm", tags: "Exact" },
};

function fixtureStorage() {
  return new MemoryStorage({ journalEntries: JSON.stringify(entries), journalDraft: JSON.stringify(draft) });
}

test("existing entries and drafts migrate with exact raw equality and plaintext is removed last", async () => {
  const storage = fixtureStorage();
  const result = await enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto });
  expect(storage.getItem("journalEntries")).toBeNull();
  expect(storage.getItem("journalDraft")).toBeNull();
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).not.toContain("Exact body");
  expect(result.payload.domains.journalEntries).toBe(JSON.stringify(entries));
  expect(result.payload.domains.journalDraft).toBe(JSON.stringify(draft));
  expect(journalEntriesFromVaultPayload(result.payload)[0]).toMatchObject({ id: "journal-1", body: "Exact body" });
  expect(journalDraftFromVaultPayload(result.payload)).toMatchObject({ editingId: "journal-1", form: { body: "Unfinished" } });
  const vaultWrite = storage.operations.findIndex(([operation, key]) => operation === "set" && key === JOURNAL_VAULT_STORAGE_KEY);
  const plaintextRemoval = storage.operations.findIndex(([operation, key]) => operation === "remove" && key === "journalEntries");
  expect(vaultWrite).toBeGreaterThan(-1);
  expect(plaintextRemoval).toBeGreaterThan(vaultWrite);
  expect(storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY)).toBeNull();
});

test.each([
  ["vault write", (operation, key) => operation === "set" && key === JOURNAL_VAULT_STORAGE_KEY],
  ["vault read-back", (operation, key) => operation === "get" && key === JOURNAL_VAULT_STORAGE_KEY],
  ["first plaintext removal", (operation, key) => operation === "remove" && key === "journalEntries"],
])("enable failure at %s restores the complete plaintext snapshot", async (label, shouldFail) => {
  const storage = fixtureStorage();
  let failed = false;
  storage.fail = (operation, key) => {
    if (!failed && shouldFail(operation, key)) {
      failed = true;
      return true;
    }
    return false;
  };
  await expect(enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto })).rejects.toThrow();
  expect(storage.getItem("journalEntries")).toBe(JSON.stringify(entries));
  expect(storage.getItem("journalDraft")).toBe(JSON.stringify(draft));
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBeNull();
});

test.each([
  ["transaction read-back", (operation, key, operations) => operation === "get" && key === JOURNAL_VAULT_TRANSACTION_KEY && operations.filter(([name, item]) => name === "get" && item === key).length === 2],
  ["draft plaintext removal", (operation, key) => operation === "remove" && key === "journalDraft"],
  ["transaction cleanup", (operation, key) => operation === "remove" && key === JOURNAL_VAULT_TRANSACTION_KEY],
])("enable failure at %s also restores every exact plaintext domain", async (label, shouldFail) => {
  const storage = fixtureStorage();
  let failed = false;
  storage.fail = (operation, key) => {
    if (!failed && shouldFail(operation, key, storage.operations)) {
      failed = true;
      return true;
    }
    return false;
  };
  await expect(enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto })).rejects.toThrow();
  expect(storage.getItem("journalEntries")).toBe(JSON.stringify(entries));
  expect(storage.getItem("journalDraft")).toBe(JSON.stringify(draft));
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBeNull();
});

test("authenticated read-back verification failure rolls setup back before plaintext removal", async () => {
  const storage = fixtureStorage();
  let corrupted = false;
  storage.read = (key, value, operations) => {
    const vaultReads = operations.filter(([operation, item]) => operation === "get" && item === JOURNAL_VAULT_STORAGE_KEY).length;
    if (!corrupted && key === JOURNAL_VAULT_STORAGE_KEY && value && vaultReads >= 2) {
      corrupted = true;
      const envelope = JSON.parse(value);
      const tag = envelope.encryptedVault.cipher.tag;
      envelope.encryptedVault.cipher.tag = `${tag[0] === "A" ? "B" : "A"}${tag.slice(1)}`;
      return JSON.stringify(envelope);
    }
    return value;
  };
  await expect(enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto })).rejects.toThrow();
  expect(storage.getItem("journalEntries")).toBe(JSON.stringify(entries));
  expect(storage.getItem("journalDraft")).toBe(JSON.stringify(draft));
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBeNull();
});

test("interrupted enable deterministically restores plaintext on startup", () => {
  const storage = new MemoryStorage({
    [JOURNAL_VAULT_STORAGE_KEY]: "partial-vault",
    [JOURNAL_VAULT_TRANSACTION_KEY]: JSON.stringify({
      schemaVersion: 1,
      operation: "enable",
      previous: { journalEntries: JSON.stringify(entries), journalDraft: JSON.stringify(draft) },
    }),
  });
  expect(recoverJournalVaultTransaction(storage)).toBe(true);
  expect(storage.getItem("journalEntries")).toBe(JSON.stringify(entries));
  expect(storage.getItem("journalDraft")).toBe(JSON.stringify(draft));
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBeNull();
  expect(storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY)).toBeNull();
});

test("disable restores exact legacy domains before deleting the encrypted vault", async () => {
  const storage = fixtureStorage();
  await enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto });
  await disableJournalVault(storage, { type: "passphrase", value: passphrase }, { cryptoProvider: webcrypto });
  expect(storage.getItem("journalEntries")).toBe(JSON.stringify(entries));
  expect(storage.getItem("journalDraft")).toBe(JSON.stringify(draft));
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBeNull();
});

test("wrong authentication cannot start disable migration", async () => {
  const storage = fixtureStorage();
  await enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto });
  const vault = storage.getItem(JOURNAL_VAULT_STORAGE_KEY);
  await expect(disableJournalVault(storage, { type: "passphrase", value: "wrong passphrase" }, { cryptoProvider: webcrypto })).rejects.toThrow();
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBe(vault);
  expect(storage.getItem("journalEntries")).toBeNull();
});

test("interrupted disable rolls back to encrypted state without keeping plaintext", async () => {
  const storage = fixtureStorage();
  const enabled = await enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto });
  storage.setItem("journalEntries", JSON.stringify(entries));
  storage.setItem("journalDraft", JSON.stringify(draft));
  storage.setItem(JOURNAL_VAULT_TRANSACTION_KEY, JSON.stringify({
    schemaVersion: 1,
    operation: "disable",
    previousVault: JSON.stringify(enabled.envelope),
  }));
  storage.removeItem(JOURNAL_VAULT_STORAGE_KEY);
  recoverJournalVaultTransaction(storage);
  expect(storage.getItem("journalEntries")).toBeNull();
  expect(storage.getItem("journalDraft")).toBeNull();
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBe(JSON.stringify(enabled.envelope));
  expect((await unlockJournalVault(storage, { type: "passphrase", value: passphrase }, { cryptoProvider: webcrypto })).payload.domains.journalEntries).toBe(JSON.stringify(entries));
});

test.each([
  ["plaintext entry write", (operation, key) => operation === "set" && key === "journalEntries"],
  ["plaintext draft write", (operation, key) => operation === "set" && key === "journalDraft"],
  ["encrypted vault removal", (operation, key) => operation === "remove" && key === JOURNAL_VAULT_STORAGE_KEY],
  ["transaction cleanup", (operation, key) => operation === "remove" && key === JOURNAL_VAULT_TRANSACTION_KEY],
])("disable failure at %s rolls completely back to encrypted state", async (label, shouldFail) => {
  const storage = fixtureStorage();
  await enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto });
  const previousVault = storage.getItem(JOURNAL_VAULT_STORAGE_KEY);
  let failed = false;
  storage.fail = (operation, key) => {
    if (!failed && shouldFail(operation, key)) {
      failed = true;
      return true;
    }
    return false;
  };
  await expect(disableJournalVault(storage, { type: "passphrase", value: passphrase }, { cryptoProvider: webcrypto })).rejects.toThrow();
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBe(previousVault);
  expect(storage.getItem("journalEntries")).toBeNull();
  expect(storage.getItem("journalDraft")).toBeNull();
});

test("interrupted encrypted replacement restores the previous verified vault on startup", async () => {
  const storage = fixtureStorage();
  const enabled = await enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto });
  const previousVault = JSON.stringify(enabled.envelope);
  storage.setItem(JOURNAL_VAULT_STORAGE_KEY, previousVault.replace(/.$/, ""));
  storage.setItem(JOURNAL_VAULT_TRANSACTION_KEY, JSON.stringify({
    schemaVersion: 1,
    operation: "replace",
    previousVault,
  }));
  expect(recoverJournalVaultTransaction(storage)).toBe(true);
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBe(previousVault);
  expect(storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY)).toBeNull();
});

test("atomic passphrase replacement preserves ciphertext and content", async () => {
  const storage = fixtureStorage();
  await enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto });
  const before = JSON.parse(storage.getItem(JOURNAL_VAULT_STORAGE_KEY));
  await changeJournalVaultPassphrase(
    storage,
    { type: "passphrase", value: passphrase },
    "a replacement migration passphrase",
    { cryptoProvider: webcrypto }
  );
  const after = JSON.parse(storage.getItem(JOURNAL_VAULT_STORAGE_KEY));
  expect(after.encryptedVault).toEqual(before.encryptedVault);
  await expect(unlockJournalVault(storage, { type: "passphrase", value: passphrase }, { cryptoProvider: webcrypto })).rejects.toThrow();
  expect((await unlockJournalVault(storage, { type: "passphrase", value: "a replacement migration passphrase" }, { cryptoProvider: webcrypto })).payload.domains.journalEntries).toBe(JSON.stringify(entries));
  expect(storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY)).toBeNull();
});

test("atomic recovery rotation verifies the new wrapper before invalidating the old phrase", async () => {
  const storage = fixtureStorage();
  const enabled = await enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto });
  const nextRecoveryPhrase = generateRecoveryPhrase(webcrypto);
  const before = JSON.parse(storage.getItem(JOURNAL_VAULT_STORAGE_KEY));
  await rotateJournalVaultRecovery(
    storage,
    { type: "passphrase", value: passphrase },
    nextRecoveryPhrase,
    { cryptoProvider: webcrypto }
  );
  const after = JSON.parse(storage.getItem(JOURNAL_VAULT_STORAGE_KEY));
  expect(after.encryptedVault).toEqual(before.encryptedVault);
  await expect(unlockJournalVault(storage, { type: "recovery-phrase", value: enabled.recoveryPhrase }, { cryptoProvider: webcrypto })).rejects.toThrow();
  expect((await unlockJournalVault(storage, { type: "recovery-phrase", value: nextRecoveryPhrase }, { cryptoProvider: webcrypto })).payload.domains.journalDraft).toBe(JSON.stringify(draft));
});

test("recovery rotation write failure preserves the original wrapper exactly", async () => {
  const storage = fixtureStorage();
  const enabled = await enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto });
  const previousVault = storage.getItem(JOURNAL_VAULT_STORAGE_KEY);
  let failed = false;
  storage.fail = (operation, key) => {
    if (!failed && operation === "set" && key === JOURNAL_VAULT_STORAGE_KEY) {
      failed = true;
      return true;
    }
    return false;
  };
  await expect(rotateJournalVaultRecovery(
    storage,
    { type: "passphrase", value: passphrase },
    generateRecoveryPhrase(webcrypto),
    { cryptoProvider: webcrypto }
  )).rejects.toThrow();
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBe(previousVault);
  expect(storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY)).toBeNull();
  expect((await unlockJournalVault(
    storage,
    { type: "recovery-phrase", value: enabled.recoveryPhrase },
    { cryptoProvider: webcrypto }
  )).payload.domains.journalEntries).toBe(JSON.stringify(entries));
});

test("destructive reset removes only Journal storage and preserves unrelated bytes", async () => {
  const storage = fixtureStorage();
  const appSettings = "{\"future\":true,\"themeId\":\"forest\"}";
  const unrelated = "  exact unrelated bytes  ";
  storage.setItem("appSettings", appSettings);
  storage.setItem("memories", unrelated);
  await enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto });

  expect(resetJournalVault(storage)).toBe(true);
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBeNull();
  expect(storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY)).toBeNull();
  expect(storage.getItem("journalEntries")).toBeNull();
  expect(storage.getItem("journalDraft")).toBeNull();
  expect(storage.getItem("appSettings")).toBe(appSettings);
  expect(storage.getItem("memories")).toBe(unrelated);
});

test("destructive reset permits malformed vault and transaction storage", () => {
  const storage = new MemoryStorage({
    [JOURNAL_VAULT_STORAGE_KEY]: "malformed vault",
    [JOURNAL_VAULT_TRANSACTION_KEY]: "malformed transaction",
    journalEntries: "malformed plaintext entries",
    journalDraft: "malformed plaintext draft",
    protocols: "preserve this",
  });
  expect(resetJournalVault(storage)).toBe(true);
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBeNull();
  expect(storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY)).toBeNull();
  expect(storage.getItem("journalEntries")).toBeNull();
  expect(storage.getItem("journalDraft")).toBeNull();
  expect(storage.getItem("protocols")).toBe("preserve this");
});

test("destructive reset write failure restores the exact encrypted and unrelated state", async () => {
  const storage = fixtureStorage();
  await enableJournalVault({ storage, passphrase, cryptoProvider: webcrypto });
  const previousVault = storage.getItem(JOURNAL_VAULT_STORAGE_KEY);
  storage.setItem("memories", "unrelated bytes");
  let failed = false;
  storage.fail = (operation, key) => {
    if (!failed && operation === "remove" && key === JOURNAL_VAULT_STORAGE_KEY) {
      failed = true;
      return true;
    }
    return false;
  };
  expect(() => resetJournalVault(storage)).toThrow();
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBe(previousVault);
  expect(storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY)).toBeNull();
  expect(storage.getItem("journalEntries")).toBeNull();
  expect(storage.getItem("journalDraft")).toBeNull();
  expect(storage.getItem("memories")).toBe("unrelated bytes");
});

test("startup recovery completes an interrupted authorized Journal reset", () => {
  const storage = new MemoryStorage({
    [JOURNAL_VAULT_STORAGE_KEY]: "partially removed malformed vault",
    [JOURNAL_VAULT_TRANSACTION_KEY]: JSON.stringify({ schemaVersion: 1, operation: "reset" }),
    journalEntries: JSON.stringify(entries),
    journalDraft: JSON.stringify(draft),
    appSettings: "exact settings",
  });
  expect(recoverJournalVaultTransaction(storage)).toBe(true);
  expect(storage.getItem(JOURNAL_VAULT_STORAGE_KEY)).toBeNull();
  expect(storage.getItem(JOURNAL_VAULT_TRANSACTION_KEY)).toBeNull();
  expect(storage.getItem("journalEntries")).toBeNull();
  expect(storage.getItem("journalDraft")).toBeNull();
  expect(storage.getItem("appSettings")).toBe("exact settings");
});
