import { webcrypto } from "crypto";
import { TextDecoder, TextEncoder } from "util";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import { writeAppSettings } from "./services/appSettings";
import { writeJournalDraft } from "./services/journalEntry";
import { enableJournalVault, unlockJournalVault } from "./services/journalVault";
import { APP_LIFECYCLE_PHASE } from "./services/appLifecycleAdapter";

jest.mock("./storage/photoStorage", () => ({
  clearCompletedMigrationBackup: jest.fn(),
  dataUrlToBlob: jest.fn(),
  deletePhotos: jest.fn(),
  getPhoto: jest.fn(),
  getAllPhotos: jest.fn(),
  hasLegacyPhotos: jest.fn(() => false),
  markLegacyMigrationComplete: jest.fn(),
  migrateLegacyPhotos: jest.fn(),
  openPhotoDatabase: jest.fn(() => new Promise(() => {})),
  putPhotos: jest.fn(),
  replaceAllPhotos: jest.fn(),
}));

if (typeof global.TextEncoder !== "function") global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder !== "function") global.TextDecoder = TextDecoder;

jest.setTimeout(120000);

const passphrase = "app integration passphrase";
const secretTitle = "private title hidden while locked";
const secretBody = "private body hidden while locked";

class MockBroadcastChannel {
  static instances = [];
  constructor(name) {
    this.name = name;
    this.messages = [];
    this.listeners = new Set();
    MockBroadcastChannel.instances.push(this);
  }
  addEventListener(type, listener) { if (type === "message") this.listeners.add(listener); }
  removeEventListener(type, listener) { if (type === "message") this.listeners.delete(listener); }
  postMessage(message) { this.messages.push(message); }
  emit(message) { this.listeners.forEach((listener) => listener({ data: message })); }
  close() {}
}

function journalEntry() {
  return {
    id: "journal-secret",
    schemaVersion: 1,
    visibility: "private",
    title: secretTitle,
    body: secretBody,
    date: "2026-08-30",
    time: "12:00",
    mood: "Calm",
    tags: ["hidden-topic"],
    createdAt: "2026-08-30T17:00:00.000Z",
    updatedAt: "2026-08-30T17:00:00.000Z",
  };
}

async function prepareLockedJournal(autoLockMinutes = 5) {
  localStorage.setItem("journalEntries", JSON.stringify([journalEntry()]));
  writeAppSettings(localStorage, { journalPrivacy: { autoLockMinutes } });
  return enableJournalVault({ storage: localStorage, passphrase, cryptoProvider: webcrypto });
}

async function unlockFromPage() {
  fireEvent.change(screen.getByLabelText("Journal password"), { target: { value: passphrase } });
  fireEvent.click(screen.getByRole("button", { name: "Unlock Journal" }));
  await screen.findByRole("heading", { name: "Journal" }, { timeout: 15000 });
}

function lifecycleHarness() {
  const subscribers = new Set();
  return {
    adapter: {
      subscribe: jest.fn((subscriber) => {
        subscribers.add(subscriber);
        return () => subscribers.delete(subscriber);
      }),
    },
    emit(phase, persisted = false) {
      act(() => {
        Array.from(subscribers).forEach((subscriber) => subscriber({ phase, persisted }));
      });
    },
  };
}

let visibilityDescriptor;

beforeEach(() => {
  localStorage.clear();
  MockBroadcastChannel.instances = [];
  Object.defineProperty(global, "crypto", { configurable: true, value: webcrypto });
  Object.defineProperty(global, "BroadcastChannel", { configurable: true, value: MockBroadcastChannel });
  window.requestAnimationFrame = (callback) => { callback(); return 1; };
  window.cancelAnimationFrame = jest.fn();
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  visibilityDescriptor = Object.getOwnPropertyDescriptor(document, "visibilityState");
});

afterEach(() => {
  if (visibilityDescriptor) Object.defineProperty(document, "visibilityState", visibilityDescriptor);
  else delete document.visibilityState;
});

test("disabled Journal keeps Set Up Journal Lock beside the heading at 1280px", () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Open Journal" }));

  const journalHeader = screen.getByRole("heading", { name: "Journal" }).closest("header");
  expect(journalHeader).toHaveClass("journal-page__header--with-action");
  expect(within(journalHeader).getByRole("button", { name: "Set Up Journal Lock" })).toBeInTheDocument();
});

test.each([390, 430])("disabled Journal keeps its full heading above a contained setup action at %ipx", (width) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Open Journal" }));

  const journalHeader = screen.getByRole("heading", { name: "Journal" }).closest("header");
  const setupAction = within(journalHeader).getByRole("button", { name: "Set Up Journal Lock" });
  expect(journalHeader).toHaveClass("journal-page__header--with-action");
  expect(setupAction).toHaveClass("journal-page__privacy-action");
  expect(setupAction.parentElement).toBe(journalHeader);
  expect(journalHeader.nextElementSibling).toHaveClass("journal-page__navigation");
  expect(screen.queryByRole("button", { name: "Lock Journal" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Unlock Journal" })).not.toBeInTheDocument();
});

test("Journal setup at 390px preserves entries and drafts, verifies both credentials, and transitions through unlocked and locked states", async () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  const setupPassword = "inside Journal password";
  const draft = {
    editingId: null,
    form: {
      title: "Exact setup draft",
      body: "Preserve this draft during Journal setup",
      date: "2026-08-30",
      time: "09:45",
      mood: "Calm",
      tags: "setup, private",
    },
  };
  localStorage.setItem("journalEntries", JSON.stringify([journalEntry()]));
  writeJournalDraft(localStorage, draft);

  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Open Journal" }));
  const initialHeader = screen.getByRole("heading", { name: "Journal" }).closest("header");
  fireEvent.click(within(initialHeader).getByRole("button", { name: "Set Up Journal Lock" }));

  let dialog = screen.getByRole("dialog", { name: "Set up Journal Lock" });
  const setupPasswordField = within(dialog).getByLabelText("Journal password");
  const setupConfirmationField = within(dialog).getByLabelText("Confirm Journal password");
  expect(setupPasswordField).toHaveFocus();
  fireEvent.change(setupPasswordField, { target: { value: setupPassword } });
  setupConfirmationField.focus();
  fireEvent.change(setupConfirmationField, { target: { value: setupPassword } });
  expect(setupConfirmationField).toHaveFocus();
  fireEvent.click(within(dialog).getByLabelText("I saved my Journal password and understand that Trace cannot recover it."));
  fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));

  dialog = screen.getByRole("dialog", { name: "Set up Journal Lock" });
  expect(within(dialog).getByRole("heading", { name: "Your Journal Recovery Phrase" })).toBeInTheDocument();
  expect(within(dialog).getAllByRole("listitem")).toHaveLength(12);
  const recoveryPhrase = within(dialog).getByLabelText("Recovery phrase for manual selection").value;
  expect(recoveryPhrase.trim().split(/\s+/u)).toHaveLength(12);
  fireEvent.click(within(dialog).getByLabelText("I saved my recovery phrase and understand that if I lose both it and my Journal password, my existing Journal cannot be recovered."));
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm and Enable Lock" }));

  const lockAction = await screen.findByRole("button", { name: "Lock Journal" }, { timeout: 20000 });
  const unlockedHeader = screen.getByRole("heading", { name: "Journal" }).closest("header");
  expect(lockAction).toBe(within(unlockedHeader).getByRole("button", { name: "Lock Journal" }));
  expect(unlockedHeader).toHaveClass("journal-page__header--with-action");
  expect(screen.queryByRole("button", { name: "Set Up Journal Lock" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Unlock Journal" })).not.toBeInTheDocument();
  expect(screen.getByText(secretTitle)).toBeInTheDocument();
  expect(screen.getByLabelText("Title")).toHaveValue(draft.form.title);
  expect(screen.getByLabelText("Entry")).toHaveValue(draft.form.body);
  expect(localStorage.getItem("journalEntries")).toBeNull();
  expect(localStorage.getItem("journalDraft")).toBeNull();
  expect(localStorage.getItem("journalVault")).not.toBeNull();

  const passwordSession = await unlockJournalVault(
    localStorage,
    { type: "passphrase", value: setupPassword },
    { cryptoProvider: webcrypto }
  );
  expect(JSON.parse(passwordSession.payload.domains.journalEntries)).toEqual([journalEntry()]);
  expect(JSON.parse(passwordSession.payload.domains.journalDraft)).toEqual({ schemaVersion: 1, ...draft });
  const recoverySession = await unlockJournalVault(
    localStorage,
    { type: "recovery-phrase", value: recoveryPhrase },
    { cryptoProvider: webcrypto }
  );
  expect(recoverySession.payload.domains).toEqual(passwordSession.payload.domains);

  fireEvent.click(lockAction);
  await screen.findByRole("button", { name: "Open locked Journal" });
  expect(screen.getByRole("status")).toHaveTextContent("Journal locked.");
  expect(screen.queryByRole("heading", { name: "Journal locked" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Journal password")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Set Up Journal Lock" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Lock Journal" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Open locked Journal" }));
  const cleanPasswordField = screen.getByLabelText("Journal password");
  expect(cleanPasswordField).toHaveValue("");
  expect(cleanPasswordField).toHaveFocus();
  fireEvent.input(cleanPasswordField, { target: { value: setupPassword } });
  expect(screen.getByRole("heading", { name: "Journal locked" })).toBeInTheDocument();
  expect(screen.queryByText(secretTitle)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Unlock Journal" }));
  const relockedAction = await screen.findByRole("button", { name: "Lock Journal" }, { timeout: 15000 });
  expect(relockedAction).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Set Up Journal Lock" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Unlock Journal" })).not.toBeInTheDocument();
  expect(screen.getByText(secretTitle)).toBeInTheDocument();
  expect(screen.getByLabelText("Entry")).toHaveValue(draft.form.body);
  fireEvent.click(relockedAction);
  await screen.findByRole("button", { name: "Open locked Journal" });
  expect(screen.queryByRole("heading", { name: "Journal locked" })).not.toBeInTheDocument();
});

test.each([1280, 390])("direct Lock Journal at %ipx returns to Timeline, clears the session, and requires a fresh explicit unlock", async (width) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  await prepareLockedJournal();
  render(<App />);
  expect(screen.getByRole("button", { name: "Open locked Journal" })).toBeInTheDocument();
  expect(document.body).not.toHaveTextContent(secretTitle);
  expect(document.body).not.toHaveTextContent(secretBody);

  fireEvent.click(screen.getByRole("button", { name: "Open locked Journal" }));
  expect(screen.getByRole("heading", { name: "Journal locked" })).toBeInTheDocument();
  expect(screen.getByLabelText("Journal password")).toHaveFocus();
  expect(document.body).not.toHaveTextContent(secretTitle);
  await unlockFromPage();
  const journalHeading = screen.getByRole("heading", { name: "Journal" });
  const journalHeader = journalHeading.closest("header");
  const mobileLockAction = within(journalHeader).getByRole("button", { name: "Lock Journal" });
  expect(journalHeader).toHaveClass("journal-page__header--with-action");
  expect(screen.getByText(secretTitle)).toBeInTheDocument();
  expect(screen.getByText(secretBody)).toBeInTheDocument();
  expect(localStorage.getItem("journalEntries")).toBeNull();
  fireEvent.change(screen.getByPlaceholderText("Search Journal..."), { target: { value: "hidden-topic" } });
  expect(screen.getByText(secretTitle)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  fireEvent.change(screen.getByLabelText("Entry"), { target: { value: "updated encrypted body" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await screen.findByText("updated encrypted body", {}, { timeout: 15000 });
  await screen.findByRole("button", { name: "Save Journal Entry" });
  expect(localStorage.getItem("journalEntries")).toBeNull();
  expect(localStorage.getItem("journalVault")).not.toContain("updated encrypted body");
  const vaultBeforeLock = localStorage.getItem("journalVault");
  const settingsBeforeLock = localStorage.getItem("appSettings");
  localStorage.setItem("journal-lock-unrelated", "exact unrelated bytes");

  fireEvent.click(mobileLockAction);
  await screen.findByRole("button", { name: "Open locked Journal" });
  expect(screen.getByRole("status")).toHaveTextContent("Journal locked.");
  expect(screen.queryByRole("heading", { name: "Journal locked" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Journal password")).not.toBeInTheDocument();
  expect(document.body).not.toHaveTextContent(secretTitle);
  expect(document.body).not.toHaveTextContent(secretBody);
  expect(localStorage.getItem("journalVault")).toBe(vaultBeforeLock);
  expect(localStorage.getItem("journalVaultTransaction")).toBeNull();
  expect(localStorage.getItem("journalEntries")).toBeNull();
  expect(localStorage.getItem("journalDraft")).toBeNull();
  expect(localStorage.getItem("appSettings")).toBe(settingsBeforeLock);
  expect(localStorage.getItem("journal-lock-unrelated")).toBe("exact unrelated bytes");
  const channel = MockBroadcastChannel.instances[0];
  expect(channel.messages.at(-1)).toEqual({ schemaVersion: 1, type: "lock" });
  expect(JSON.stringify(channel.messages)).not.toContain(secretBody);
  expect(JSON.stringify(channel.messages)).not.toContain(passphrase);

  fireEvent.click(screen.getByRole("button", { name: "Open locked Journal" }));
  const reopenedPassword = screen.getByLabelText("Journal password");
  expect(reopenedPassword).toHaveValue("");
  fireEvent.input(reopenedPassword, { target: { value: passphrase } });
  await waitFor(() => expect(screen.getByRole("heading", { name: "Journal locked" })).toBeInTheDocument());
  expect(document.body).not.toHaveTextContent(secretBody);
  expect(screen.queryByRole("button", { name: "Lock Journal" })).not.toBeInTheDocument();
  expect(localStorage.getItem("journalVault")).toBe(vaultBeforeLock);

  fireEvent.submit(reopenedPassword.closest("form"));
  const unlockedLockAction = await screen.findByRole("button", { name: "Lock Journal" }, { timeout: 15000 });
  expect(unlockedLockAction).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Journal" })).toBeInTheDocument();
  expect(screen.getByText(secretTitle)).toBeInTheDocument();
  expect(localStorage.getItem("journalVault")).toBe(vaultBeforeLock);
  expect(localStorage.getItem("journal-lock-unrelated")).toBe("exact unrelated bytes");

  fireEvent.click(unlockedLockAction);
  await screen.findByRole("button", { name: "Open locked Journal" });
});

test("visibility, pagehide, inactivity, and cross-tab Lock Now each clear rendered Journal data", async () => {
  await prepareLockedJournal(1);
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Open locked Journal" }));
  await unlockFromPage();

  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  fireEvent(document, new Event("visibilitychange"));
  await screen.findByRole("heading", { name: "Journal locked" });
  expect(document.body).not.toHaveTextContent(secretBody);

  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  await unlockFromPage();
  fireEvent(window, new Event("pagehide"));
  await screen.findByRole("heading", { name: "Journal locked" });

  await unlockFromPage();
  let inactivityCallback;
  const nativeSetTimeout = global.setTimeout;
  const timerSpy = jest.spyOn(global, "setTimeout").mockImplementation((callback, delay, ...args) => {
    if (delay === 60000) {
      inactivityCallback = callback;
      return 90001;
    }
    return nativeSetTimeout(callback, delay, ...args);
  });
  fireEvent.keyDown(window, { key: "Shift" });
  expect(timerSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
  timerSpy.mockRestore();
  expect(screen.getByRole("heading", { name: "Journal" })).toBeInTheDocument();
  act(() => inactivityCallback());
  expect(screen.getByRole("heading", { name: "Journal locked" })).toBeInTheDocument();

  await unlockFromPage();
  const channel = MockBroadcastChannel.instances[0];
  act(() => channel.emit({ schemaVersion: 1, type: "lock" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Journal locked" })).toBeInTheDocument());
  expect(document.body).not.toHaveTextContent(secretTitle);
});

test("normalized lifecycle background locks once and foreground or resume never unlocks Journal", async () => {
  await prepareLockedJournal();
  const lifecycle = lifecycleHarness();
  render(<App lifecycleAdapter={lifecycle.adapter} />);
  fireEvent.click(screen.getByRole("button", { name: "Open locked Journal" }));
  await unlockFromPage();

  lifecycle.emit(APP_LIFECYCLE_PHASE.ACTIVE);
  lifecycle.emit(APP_LIFECYCLE_PHASE.RESUMED, true);
  expect(screen.getByRole("heading", { name: "Journal" })).toBeInTheDocument();

  lifecycle.emit(APP_LIFECYCLE_PHASE.BACKGROUND);
  await screen.findByRole("heading", { name: "Journal locked" });
  const channel = MockBroadcastChannel.instances[0];
  expect(channel.messages.filter(({ type }) => type === "lock")).toHaveLength(1);

  lifecycle.emit(APP_LIFECYCLE_PHASE.SUSPENDING, true);
  lifecycle.emit(APP_LIFECYCLE_PHASE.ACTIVE);
  lifecycle.emit(APP_LIFECYCLE_PHASE.RESUMED, true);
  expect(screen.getByRole("heading", { name: "Journal locked" })).toBeInTheDocument();
  expect(channel.messages.filter(({ type }) => type === "lock")).toHaveLength(1);
});

test("plaintext Journal remains available across normalized lifecycle events", () => {
  localStorage.setItem("journalEntries", JSON.stringify([journalEntry()]));
  const lifecycle = lifecycleHarness();
  render(<App lifecycleAdapter={lifecycle.adapter} />);
  fireEvent.click(screen.getByRole("button", { name: "Open Journal" }));

  lifecycle.emit(APP_LIFECYCLE_PHASE.BACKGROUND);
  lifecycle.emit(APP_LIFECYCLE_PHASE.SUSPENDING);
  lifecycle.emit(APP_LIFECYCLE_PHASE.RESUMED, true);

  expect(screen.getByRole("heading", { name: "Journal" })).toBeInTheDocument();
  expect(screen.getByText(secretTitle)).toBeInTheDocument();
  expect(lifecycle.adapter.subscribe).not.toHaveBeenCalled();
});

test("Turn Off Journal Lock from Journal preserves exact entries and draft and stays usable", async () => {
  await prepareLockedJournal();
  const settingsBefore = localStorage.getItem("appSettings");
  localStorage.setItem("unrelated-domain", " exact unrelated bytes ");
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Open locked Journal" }));
  await unlockFromPage();

  fireEvent.change(screen.getByLabelText("Entry"), { target: { value: "exact unfinished encrypted draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Turn Off Journal Lock" }));
  const dialog = await screen.findByRole("dialog", { name: "Turn Off Journal Lock" }, { timeout: 15000 });
  fireEvent.change(within(dialog).getByLabelText("Current Journal password"), { target: { value: passphrase } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Turn Off Journal Lock" }));

  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Journal Lock turned off."), { timeout: 15000 });
  expect(screen.getByRole("heading", { name: "Journal" })).toBeInTheDocument();
  expect(localStorage.getItem("journalVault")).toBeNull();
  expect(localStorage.getItem("journalVaultTransaction")).toBeNull();
  expect(localStorage.getItem("journalEntries")).toBe(JSON.stringify([journalEntry()]));
  expect(JSON.parse(localStorage.getItem("journalDraft")).form.body).toBe("exact unfinished encrypted draft");
  expect(localStorage.getItem("appSettings")).toBe(settingsBefore);
  expect(localStorage.getItem("unrelated-domain")).toBe(" exact unrelated bytes ");
  const channel = MockBroadcastChannel.instances[0];
  expect(channel.messages.at(-1)).toEqual({ schemaVersion: 1, type: "disabled" });
  expect(JSON.stringify(channel.messages)).not.toContain(passphrase);
});

test("lost-credential reset erases only Journal data and permits an immediate fresh entry", async () => {
  await prepareLockedJournal();
  const settingsBefore = localStorage.getItem("appSettings");
  localStorage.setItem("protocols", " exact protocol bytes ");
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Open locked Journal" }));
  const trigger = screen.getByRole("button", { name: "Erase Journal and Start Fresh" });
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Reset Journal and start fresh?" });
  fireEvent.change(within(dialog).getByLabelText(/Type ERASE JOURNAL/), { target: { value: "ERASE JOURNAL" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Erase Journal and Start Fresh" }));

  await screen.findByRole("heading", { name: "Journal" });
  expect(localStorage.getItem("journalVault")).toBeNull();
  expect(localStorage.getItem("journalVaultTransaction")).toBeNull();
  expect(localStorage.getItem("journalEntries")).toBeNull();
  expect(localStorage.getItem("journalDraft")).toBeNull();
  expect(localStorage.getItem("appSettings")).toBe(settingsBefore);
  expect(localStorage.getItem("protocols")).toBe(" exact protocol bytes ");
  expect(screen.queryByRole("heading", { name: "Journal Lock: On" })).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Entry"), { target: { value: "first fresh entry" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Journal Entry" }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem("journalEntries"))).toHaveLength(1));
  expect(JSON.parse(localStorage.getItem("journalEntries"))[0].body).toBe("first fresh entry");
  const channel = MockBroadcastChannel.instances[0];
  expect(channel.messages.at(-1)).toEqual({ schemaVersion: 1, type: "journal-reset" });
  expect(JSON.stringify(channel.messages)).not.toContain(secretBody);
});

test("malformed locked vault can be reset without authentication while unrelated data remains", async () => {
  localStorage.setItem("journalVault", "malformed encrypted vault");
  localStorage.setItem("journalVaultTransaction", "malformed recovery journal");
  localStorage.setItem("memories", "not touched");
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Open locked Journal" }));
  expect(screen.getByText(/cannot be unlocked here/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Erase Journal and Start Fresh" }));
  const dialog = screen.getByRole("dialog", { name: "Reset Journal and start fresh?" });
  fireEvent.change(within(dialog).getByLabelText(/Type ERASE JOURNAL/), { target: { value: "ERASE JOURNAL" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Erase Journal and Start Fresh" }));
  await screen.findByRole("heading", { name: "Journal" });
  expect(localStorage.getItem("journalVault")).toBeNull();
  expect(localStorage.getItem("journalVaultTransaction")).toBeNull();
  expect(localStorage.getItem("memories")).toBe("not touched");
});

test("cross-tab Journal reset invalidates the stale unlocked session without broadcasting secrets", async () => {
  await prepareLockedJournal();
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Open locked Journal" }));
  await unlockFromPage();
  expect(screen.getByText(secretTitle)).toBeInTheDocument();
  localStorage.removeItem("journalVault");
  localStorage.removeItem("journalVaultTransaction");
  localStorage.removeItem("journalEntries");
  localStorage.removeItem("journalDraft");
  const channel = MockBroadcastChannel.instances[0];
  act(() => channel.emit({ schemaVersion: 1, type: "journal-reset" }));
  await waitFor(() => expect(screen.queryByText(secretTitle)).not.toBeInTheDocument());
  expect(screen.queryByRole("heading", { name: "Journal Lock: On" })).not.toBeInTheDocument();
  expect(screen.getByText("Your Journal is ready when you are.")).toBeInTheDocument();
  expect(JSON.stringify({ schemaVersion: 1, type: "journal-reset" })).not.toContain(secretBody);
});
