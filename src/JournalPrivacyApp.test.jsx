import { webcrypto } from "crypto";
import { TextDecoder, TextEncoder } from "util";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import { writeAppSettings } from "./services/appSettings";
import { enableJournalVault } from "./services/journalVault";

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

test("direct Lock Journal clears the active session without changing encrypted or unrelated data and focuses unlock", async () => {
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

  fireEvent.click(screen.getByRole("button", { name: "Lock Journal" }));
  await screen.findByRole("heading", { name: "Journal locked" });
  expect(document.body).not.toHaveTextContent(secretTitle);
  expect(document.body).not.toHaveTextContent(secretBody);
  expect(screen.getByLabelText("Journal password")).toHaveFocus();
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

test("Turn Off Journal Lock from Journal preserves exact entries and draft and stays usable", async () => {
  await prepareLockedJournal();
  const settingsBefore = localStorage.getItem("appSettings");
  localStorage.setItem("unrelated-domain", " exact unrelated bytes ");
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Open locked Journal" }));
  await unlockFromPage();

  fireEvent.change(screen.getByLabelText("Entry"), { target: { value: "exact unfinished encrypted draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Turn Off Journal Lock" }));
  const dialog = await screen.findByRole("dialog", { name: "Turn Off Journal Lock" });
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
