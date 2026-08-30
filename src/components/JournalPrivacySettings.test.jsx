import { webcrypto } from "crypto";
import fs from "fs";
import path from "path";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { APP_THEMES } from "../services/appThemes";
import { JOURNAL_RECOVERY_FORMAT_LEGACY } from "../services/journalVaultCrypto";
import JournalPrivacySettings from "./JournalPrivacySettings";

const callbacks = {
  onAutoLockChange: jest.fn(),
  onEnable: jest.fn(async () => {}),
  onChangePassphrase: jest.fn(async () => {}),
  onRotateRecovery: jest.fn(async () => {}),
  onLock: jest.fn(),
  onDisable: jest.fn(async () => {}),
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(global, "crypto", { configurable: true, value: webcrypto });
});

test("Journal Lock is optional and canceling setup changes nothing", () => {
  render(<JournalPrivacySettings enabled={false} unlocked={false} {...callbacks} />);
  expect(screen.getByText(/Journal Lock:/)).toHaveTextContent("Off");
  fireEvent.click(screen.getByRole("button", { name: "Set up Journal Lock" }));
  expect(screen.getByRole("dialog", { name: "Set up Journal Lock" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Journal password"), { target: { value: "long enough canceled passphrase" } });
  fireEvent.change(screen.getByLabelText("Confirm Journal password"), { target: { value: "long enough canceled passphrase" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(callbacks.onEnable).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("privacy dialog is named, traps focus, closes safely with Escape, and restores focus", () => {
  render(<JournalPrivacySettings enabled={false} unlocked={false} {...callbacks} />);
  const setup = screen.getByRole("button", { name: "Set up Journal Lock" });
  setup.focus();
  fireEvent.click(setup);
  const dialog = screen.getByRole("dialog", { name: "Set up Journal Lock" });
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(screen.getByLabelText("Journal password")).toHaveFocus();
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(setup).toHaveFocus();
});

test("setup requires matching passphrases and recovery-phrase acknowledgment", async () => {
  render(<JournalPrivacySettings enabled={false} unlocked={false} {...callbacks} />);
  fireEvent.click(screen.getByRole("button", { name: "Set up Journal Lock" }));
  fireEvent.change(screen.getByLabelText("Journal password"), { target: { value: "twelve characters plus" } });
  fireEvent.change(screen.getByLabelText("Confirm Journal password"), { target: { value: "different passphrase" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByRole("alert")).toHaveTextContent("do not match");

  fireEvent.change(screen.getByLabelText("Confirm Journal password"), { target: { value: "twelve characters plus" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByRole("heading", { name: "Your Journal Recovery Phrase" })).toBeInTheDocument();
  expect(within(screen.getByTestId("journal-recovery-phrase")).getAllByRole("listitem")).toHaveLength(12);
  const recoveryPhrase = screen.getByLabelText("Recovery phrase for manual selection").value;
  const finish = screen.getByRole("button", { name: "Confirm and Enable Lock" });
  expect(finish).toBeDisabled();
  fireEvent.click(screen.getByLabelText("I saved my recovery phrase and understand that if I lose both it and my Journal password, my existing Journal cannot be recovered."));
  fireEvent.click(finish);
  await waitFor(() => expect(callbacks.onEnable).toHaveBeenCalledWith({
    passphrase: "twelve characters plus",
    recoveryPhrase,
  }));
  expect(screen.getByRole("status")).toHaveTextContent("Journal Lock enabled");
});

test("recovery phrase copy failure leaves a selectable manual fallback", async () => {
  Object.defineProperty(window.navigator, "clipboard", { configurable: true, value: undefined });
  render(<JournalPrivacySettings enabled={false} unlocked={false} {...callbacks} />);
  fireEvent.click(screen.getByRole("button", { name: "Set up Journal Lock" }));
  fireEvent.change(screen.getByLabelText("Journal password"), { target: { value: "twelve characters plus" } });
  fireEvent.change(screen.getByLabelText("Confirm Journal password"), { target: { value: "twelve characters plus" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  const fallback = screen.getByLabelText("Recovery phrase for manual selection");
  expect(fallback).toHaveAttribute("readonly");
  expect(fallback.value.split(" ")).toHaveLength(12);
  fireEvent.click(screen.getByRole("button", { name: "Copy Recovery Phrase" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Select and copy");
});

test("unlocked settings expose non-destructive controls and allowed auto-lock choices", async () => {
  render(<JournalPrivacySettings enabled unlocked autoLockMinutes={5} {...callbacks} />);
  expect(screen.getByText(/Journal Lock:/)).toHaveTextContent("On · Unlocked");
  expect(screen.getByRole("button", { name: "Change Journal Password" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Replace Recovery Phrase" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Lock Now" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Turn Off Journal Lock" })).not.toHaveClass("trace-action--danger");
  fireEvent.change(screen.getByLabelText("Auto-lock while visible"), { target: { value: "15" } });
  expect(callbacks.onAutoLockChange).toHaveBeenCalledWith(15);
  fireEvent.click(screen.getByRole("button", { name: "Lock Now" }));
  await waitFor(() => expect(callbacks.onLock).toHaveBeenCalledTimes(1));
});

test("legacy vaults alone expose legacy-key labels and the 12-word replacement action", () => {
  render(<JournalPrivacySettings enabled unlocked recoveryFormat={JOURNAL_RECOVERY_FORMAT_LEGACY} {...callbacks} />);
  expect(screen.getByRole("button", { name: "Replace with 12-Word Recovery Phrase" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Change Journal Password" }));
  expect(screen.getByLabelText("Use legacy recovery key")).toBeInTheDocument();
  expect(screen.queryByLabelText("Use recovery phrase")).not.toBeInTheDocument();
});

test("change-passphrase and shared turn-off dialogs require a credential", async () => {
  render(<JournalPrivacySettings enabled unlocked autoLockMinutes={5} {...callbacks} />);
  fireEvent.click(screen.getByRole("button", { name: "Change Journal Password" }));
  fireEvent.change(screen.getByLabelText("Current Journal password"), { target: { value: "current credential" } });
  fireEvent.change(screen.getByLabelText("New Journal password"), { target: { value: "replacement passphrase" } });
  fireEvent.change(screen.getByLabelText("Confirm new Journal password"), { target: { value: "replacement passphrase" } });
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Change Journal Password" }));
  await waitFor(() => expect(callbacks.onChangePassphrase).toHaveBeenCalledWith(
    { type: "passphrase", value: "current credential" },
    "replacement passphrase"
  ));

  fireEvent.click(screen.getByRole("button", { name: "Turn Off Journal Lock" }));
  expect(screen.getByText("Your Journal entries will remain intact, but they will no longer be encrypted on this device or in future plaintext backups.")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Current Journal password"), { target: { value: "current credential" } });
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Turn Off Journal Lock" }));
  await waitFor(() => expect(callbacks.onDisable).toHaveBeenCalledWith({ type: "passphrase", value: "current credential" }));
  expect(screen.getByRole("status")).toHaveTextContent("Journal Lock turned off.");
});

test("privacy surfaces use shared theme tokens and contain recovery content at mobile widths in all six themes", () => {
  expect(APP_THEMES).toHaveLength(6);
  APP_THEMES.forEach(({ id }) => {
    document.documentElement.setAttribute("data-trace-theme", id);
    const view = render(<JournalPrivacySettings enabled={false} unlocked={false} {...callbacks} />);
    expect(screen.getByRole("heading", { name: "Journal Privacy" })).toBeInTheDocument();
    view.unmount();
  });
  const css = fs.readFileSync(path.join(process.cwd(), "src", "index.css"), "utf8");
  expect(css).toMatch(/\.journal-privacy-card,[\s\S]*?background:\s*var\(--trace-surface/);
  expect(css).toMatch(/\.journal-recovery-words\s*\{[\s\S]*?repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  expect(css).toMatch(/@media\s*\(max-width:\s*430px\)[\s\S]*?\.journal-recovery-words\s*\{[\s\S]*?repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});
