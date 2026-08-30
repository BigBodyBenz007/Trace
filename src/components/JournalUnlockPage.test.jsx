import { webcrypto } from "crypto";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { JOURNAL_RECOVERY_FORMAT_LEGACY } from "../services/journalVaultCrypto";
import JournalUnlockPage from "./JournalUnlockPage";
import {
  JOURNAL_PASSWORD_ACKNOWLEDGMENT,
  JOURNAL_PASSWORD_LOSS_WARNING,
  JOURNAL_PASSWORD_SAVE_HELPER,
} from "./JournalPasswordSaveControls";

beforeEach(() => {
  Object.defineProperty(global, "crypto", { configurable: true, value: webcrypto });
  jest.clearAllMocks();
});

function renderUnlock(props = {}) {
  return render(<JournalUnlockPage onUnlock={jest.fn()} onRecover={jest.fn()} onBack={jest.fn()} onReset={jest.fn()} onDownloadBackup={jest.fn()} {...props} />);
}

test("locked Journal renders unlock controls without Journal content or metadata", () => {
  renderUnlock();
  expect(screen.getByRole("heading", { name: "Journal locked" })).toBeInTheDocument();
  expect(screen.getByLabelText("Journal password")).toHaveAttribute("autocomplete", "current-password");
  expect(screen.getByLabelText("Journal password")).toHaveAttribute("name", "password");
  expect(screen.getByLabelText("Journal password")).toHaveAttribute("type", "password");
  expect(screen.getByRole("button", { name: "Use recovery phrase" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Lost your Journal password and recovery phrase?" })).toBeInTheDocument();
  expect(screen.getByText(/Trace support, an administrator, or reinstalling the app cannot recover the encrypted Journal/)).toBeInTheDocument();
  expect(screen.getByText(/An encrypted backup does not bypass the need for the Journal password or recovery phrase/)).toBeInTheDocument();
  expect(screen.queryByText("private title that must not leak")).not.toBeInTheDocument();
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
});

test("wrong credentials use one generic error and prevent rapid double submission", async () => {
  let rejectUnlock;
  const onUnlock = jest.fn(() => new Promise((resolve, reject) => { rejectUnlock = reject; }));
  renderUnlock({ onUnlock });
  fireEvent.change(screen.getByLabelText("Journal password"), { target: { value: "wrong secret" } });
  fireEvent.click(screen.getByRole("button", { name: "Unlock Journal" }));
  expect(screen.getByRole("button", { name: "Unlocking…" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Unlocking…" }));
  expect(onUnlock).toHaveBeenCalledTimes(1);
  rejectUnlock(new Error("specific authentication tag detail"));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Journal could not be unlocked"));
  expect(screen.getByRole("alert")).not.toHaveTextContent("authentication tag");
});

test("repeated failures add a short in-session delay without permanent lockout", async () => {
  const onUnlock = jest.fn(async () => { throw new Error("wrong"); });
  renderUnlock({ onUnlock });
  fireEvent.change(screen.getByLabelText("Journal password"), { target: { value: "wrong one" } });
  fireEvent.click(screen.getByRole("button", { name: "Unlock Journal" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Unlock Journal" })).not.toBeDisabled());
  fireEvent.change(screen.getByLabelText("Journal password"), { target: { value: "wrong two" } });
  fireEvent.click(screen.getByRole("button", { name: "Unlock Journal" }));
  await waitFor(() => expect(screen.getByText("Please wait briefly before trying again.")).toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("button", { name: "Unlock Journal" })).not.toBeDisabled(), { timeout: 1000 });
});

test("recovery accepts the complete phrase and can rotate the recovery wrapper", async () => {
  const onRecover = jest.fn(async () => {});
  renderUnlock({ onRecover });
  fireEvent.click(screen.getByRole("button", { name: "Use recovery phrase" }));
  fireEvent.change(screen.getByLabelText("Recovery phrase"), { target: { value: "old recovery credential" } });
  fireEvent.change(screen.getByLabelText("New Journal password"), { target: { value: "new recovery passphrase" } });
  fireEvent.change(screen.getByLabelText("Confirm new Journal password"), { target: { value: "new recovery passphrase" } });
  expect(screen.getByLabelText("New Journal password")).toHaveAttribute("autocomplete", "new-password");
  expect(screen.getByLabelText("New Journal password")).toHaveAttribute("name", "password");
  expect(screen.getByRole("button", { name: "Copy Journal Password" })).toBeInTheDocument();
  expect(screen.getByText(JOURNAL_PASSWORD_SAVE_HELPER)).toBeInTheDocument();
  expect(screen.getByText(JOURNAL_PASSWORD_LOSS_WARNING)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(JOURNAL_PASSWORD_ACKNOWLEDGMENT));
  const nextRecoveryPhrase = screen.getByLabelText("Recovery phrase for manual selection").value;
  fireEvent.click(screen.getByLabelText("I saved my recovery phrase and understand that if I lose both it and my Journal password, my existing Journal cannot be recovered."));
  fireEvent.click(screen.getByRole("button", { name: "Recover and Unlock" }));
  await waitFor(() => expect(onRecover).toHaveBeenCalledWith({
    recoveryCredential: "old recovery credential",
    newPassphrase: "new recovery passphrase",
    rotateRecovery: true,
    nextRecoveryPhrase,
  }));
});

test("recovery requires password acknowledgment and preserves the pasted password after validation failure", () => {
  const onRecover = jest.fn();
  renderUnlock({ onRecover });
  fireEvent.click(screen.getByRole("button", { name: "Use recovery phrase" }));
  const pastedPassword = "pasted recovery password 13!";
  fireEvent.change(screen.getByLabelText("Recovery phrase"), { target: { value: "old recovery credential" } });
  fireEvent.change(screen.getByLabelText("New Journal password"), { target: { value: pastedPassword } });
  fireEvent.change(screen.getByLabelText("Confirm new Journal password"), { target: { value: "does not match" } });
  fireEvent.click(screen.getByLabelText("Replace with a new 12-word recovery phrase (strongly recommended)"));
  fireEvent.click(screen.getByRole("button", { name: "Recover and Unlock" }));
  expect(screen.getByRole("alert")).toHaveTextContent("do not match");
  expect(screen.getByLabelText("New Journal password")).toHaveValue(pastedPassword);
  fireEvent.change(screen.getByLabelText("Confirm new Journal password"), { target: { value: pastedPassword } });
  fireEvent.click(screen.getByRole("button", { name: "Recover and Unlock" }));
  expect(screen.getByRole("alert")).toHaveTextContent("saved your Journal password");
  expect(onRecover).not.toHaveBeenCalled();
});

test("legacy recovery labels appear only for a legacy wrapper", () => {
  renderUnlock({ recoveryFormat: JOURNAL_RECOVERY_FORMAT_LEGACY });
  fireEvent.click(screen.getByRole("button", { name: "Use legacy recovery key" }));
  expect(screen.getByLabelText("Legacy recovery key")).toBeInTheDocument();
  expect(screen.queryByLabelText("Recovery phrase")).not.toBeInTheDocument();
});

test("destructive reset requires exact confirmation, supports backup first, and cancel restores focus", async () => {
  const onReset = jest.fn(async () => {});
  const onDownloadBackup = jest.fn(async () => {});
  renderUnlock({ onReset, onDownloadBackup });
  const trigger = screen.getByRole("button", { name: "Erase Journal and Start Fresh" });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Reset Journal and start fresh?" });
  expect(within(dialog).getByText(/permanently destroys the existing encrypted Journal and starts a new empty one/)).toBeInTheDocument();
  expect(within(dialog).getByText(/Trace has no way to retrieve either credential/)).toBeInTheDocument();
  expect(within(dialog).getByText(/encrypted backup does not bypass the need for the Journal password or recovery phrase/)).toBeInTheDocument();
  const erase = within(dialog).getByRole("button", { name: "Erase Journal and Start Fresh" });
  expect(erase).toBeDisabled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Download Trace Backup First" }));
  await waitFor(() => expect(onDownloadBackup).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText(/Type ERASE JOURNAL/), { target: { value: "erase journal" } });
  expect(erase).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/Type ERASE JOURNAL/), { target: { value: "ERASE JOURNAL" } });
  expect(erase).not.toBeDisabled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(onReset).not.toHaveBeenCalled();
  expect(trigger).toHaveFocus();
});
