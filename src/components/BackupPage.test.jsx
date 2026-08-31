import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import BackupPage from "./BackupPage";
import {
  createTraceBackup,
  parseTraceBackupText,
  restoreTraceBackup,
  traceBackupFilename,
} from "../services/traceBackup";

jest.mock("../services/traceBackup", () => ({
  createTraceBackup: jest.fn(),
  parseTraceBackupText: jest.fn(),
  restoreTraceBackup: jest.fn(),
  traceBackupFilename: jest.fn(() => "trace-backup-test.json"),
}));

const summary = {
  memories: 2, photos: 3, nutritionEntries: 4, waterEntries: 5, healthMeasurementEntries: 12, workouts: 5,
  plannedWorkouts: 13, activeWorkoutDraft: true,
  dailyActions: 14,
  medicationDoseSchedules: 17,
  medicationDoseOccurrences: 18,
  protocolOccurrences: 15,
  protocolCompoundOutcomes: 19,
  injectionSiteEntries: 16,
  medicationEntries: 6, protocols: 7, trophyCaseEntries: 8,
  savedExercises: 9, savedCompounds: 10, userFoods: 11, journalEntries: 12,
};
const parsed = { backup: { createdAt: "2026-08-12T00:00:00.000Z" }, summary };

beforeEach(() => {
  jest.clearAllMocks();
  traceBackupFilename.mockReturnValue("trace-backup-test.json");
  window.confirm = jest.fn(() => true);
});

function mockNavigator(values) {
  const originals = Object.fromEntries(
    Object.keys(values).map((key) => [key, Object.getOwnPropertyDescriptor(navigator, key)])
  );
  Object.entries(values).forEach(([key, value]) => {
    Object.defineProperty(navigator, key, { configurable: true, value });
  });
  return () => {
    Object.entries(originals).forEach(([key, descriptor]) => {
      if (descriptor) Object.defineProperty(navigator, key, descriptor);
      else delete navigator[key];
    });
  };
}

test("separates navigation from the paired archive actions without changing handlers", () => {
  const onBack = jest.fn();
  render(<BackupPage onBack={onBack} buttonStyle={{}} containerStyle={{}} />);
  expect(screen.getByRole("heading", { name: "Backup & Restore" }).closest("main")).toHaveClass("trace-feature-page--backup");
  const navigation = screen.getByRole("navigation", { name: "Backup navigation" });
  const archiveActions = screen.getByRole("region", { name: "Archive actions" });
  const back = within(navigation).getByRole("button", { name: "Back to Timeline" });
  const download = within(archiveActions).getByRole("button", { name: "Download Trace Backup" });
  const select = within(archiveActions).getByRole("button", { name: "Select Backup to Restore" });
  expect(within(navigation).queryByRole("button", { name: "Download Trace Backup" })).not.toBeInTheDocument();
  expect(within(navigation).queryByRole("button", { name: "Select Backup to Restore" })).not.toBeInTheDocument();
  expect(download).toHaveClass("trace-action--primary");
  expect(select).toHaveClass("trace-action--brass");

  const fileInput = document.querySelector('input[type="file"]');
  const inputClick = jest.spyOn(fileInput, "click");
  fireEvent.click(back);
  fireEvent.click(select);
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(inputClick).toHaveBeenCalledTimes(1);
  inputClick.mockRestore();
});

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

test("explicit export downloads one self-contained backup file", async () => {
  const backup = { createdAt: "2026-08-12T00:00:00.000Z", data: { structured: {}, photos: [] } };
  createTraceBackup.mockResolvedValue(backup);
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => "blob:trace-backup");
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(<BackupPage onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  fireEvent.click(screen.getByRole("button", { name: "Download Trace Backup" }));
  expect(await screen.findByText("Trace backup downloaded. Your current data was not changed.")).toBeInTheDocument();
  expect(createTraceBackup).toHaveBeenCalledTimes(1);
  expect(click).toHaveBeenCalledTimes(1);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:trace-backup");
  click.mockRestore();
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

test("desktop export retains the complete JSON backup filename and MIME type", async () => {
  const backup = {
    createdAt: "2026-08-12T00:00:00.000Z",
    data: {
      structured: { memories: [{ id: "memory-1" }], workouts: [{ id: "workout-1" }], settings: { theme: "dark" } },
      photos: [{ id: "photo-1", memoryId: "memory-1", data: "complete-photo-data" }],
    },
  };
  createTraceBackup.mockResolvedValue(backup);
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => "blob:complete-backup");
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(<BackupPage onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);

  fireEvent.click(screen.getByRole("button", { name: "Download Trace Backup" }));
  await screen.findByText("Trace backup downloaded. Your current data was not changed.");

  const file = URL.createObjectURL.mock.calls[0][0];
  expect(file.name).toBe("trace-backup-test.json");
  expect(file.type).toBe("application/json");
  expect(JSON.parse(await readFileText(file))).toEqual(backup);
  expect(click).toHaveBeenCalledTimes(1);
  click.mockRestore();
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

test("iPhone export opens the native file share sheet with the complete JSON file", async () => {
  const backup = {
    createdAt: "2026-08-12T00:00:00.000Z",
    data: { structured: { memories: [{ id: "memory-1" }], settings: { units: "metric" } }, photos: [{ id: "photo-1", data: "full-photo" }] },
  };
  createTraceBackup.mockResolvedValue(backup);
  const share = jest.fn().mockResolvedValue(undefined);
  const canShare = jest.fn(() => true);
  const restoreNavigator = mockNavigator({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    platform: "iPhone",
    maxTouchPoints: 5,
    canShare,
    share,
  });
  const originalCreateObjectURL = URL.createObjectURL;
  URL.createObjectURL = jest.fn();
  render(<BackupPage onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);

  fireEvent.click(screen.getByRole("button", { name: "Download Trace Backup" }));
  expect(await screen.findByText(/Tap Save Backup to Files/)).toBeInTheDocument();
  expect(screen.queryByText("Trace backup downloaded. Your current data was not changed.")).not.toBeInTheDocument();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  expect(share).not.toHaveBeenCalled();
  const saveActions = screen.getAllByRole("button", { name: "Save Backup to Files" });
  expect(saveActions).toHaveLength(1);
  fireEvent.click(saveActions[0]);
  expect(await screen.findByText(/Choose Save to Files/)).toBeInTheDocument();

  const [{ files }] = share.mock.calls[0];
  expect(canShare).toHaveBeenCalledWith({ files });
  expect(files).toHaveLength(1);
  expect(files[0].name).toBe("trace-backup-test.json");
  expect(files[0].type).toBe("application/json");
  expect(JSON.parse(await readFileText(files[0]))).toEqual(backup);
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  URL.createObjectURL = originalCreateObjectURL;
  restoreNavigator();
});

test("iPhone export clearly explains when file sharing is unavailable", async () => {
  createTraceBackup.mockResolvedValue({ createdAt: "2026-08-12T00:00:00.000Z", data: { structured: {}, photos: [] } });
  const share = jest.fn();
  const restoreNavigator = mockNavigator({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    platform: "iPhone",
    maxTouchPoints: 5,
    canShare: jest.fn(() => false),
    share,
  });
  const originalCreateObjectURL = URL.createObjectURL;
  URL.createObjectURL = jest.fn();
  render(<BackupPage onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);

  fireEvent.click(screen.getByRole("button", { name: "Download Trace Backup" }));
  await screen.findByText(/Tap Save Backup to Files/);
  fireEvent.click(screen.getByRole("button", { name: "Save Backup to Files" }));
  expect(await screen.findByText(/cannot open the Save to Files sheet/)).toBeInTheDocument();
  expect(share).not.toHaveBeenCalled();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  URL.createObjectURL = originalCreateObjectURL;
  restoreNavigator();
});

test("validates a selected backup and previews counts without restoring", async () => {
  parseTraceBackupText.mockReturnValue(parsed);
  render(<BackupPage onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [new File(["backup"], "trace.json", { type: "application/json" })] } });
  expect(await screen.findByRole("heading", { name: "Review Backup" })).toBeInTheDocument();
  expect(screen.getByText("Memories: 2")).toBeInTheDocument();
  expect(screen.getByText("Photos: 3")).toBeInTheDocument();
  expect(screen.getByText("Water entries: 5")).toBeInTheDocument();
  expect(screen.getByText("Planned workouts: 13")).toBeInTheDocument();
  expect(screen.getByText("Daily actions: 14")).toBeInTheDocument();
  expect(screen.getByText("Scheduled doses: 17")).toBeInTheDocument();
  expect(screen.getByText("Dose occurrence changes: 18")).toBeInTheDocument();
  expect(screen.getByText("Protocol daily statuses: 15")).toBeInTheDocument();
  expect(screen.getByText("Protocol compound results: 19")).toBeInTheDocument();
  expect(screen.getByText("Injection shots: 16")).toBeInTheDocument();
  expect(screen.getByText("Active workout draft: Included — it will replace any current active workout draft")).toBeInTheDocument();
  expect(screen.getByText("No Trace data has been changed yet.")).toBeInTheDocument();
  expect(restoreTraceBackup).not.toHaveBeenCalled();
});

test("requires explicit browser confirmation before applying a full restore", async () => {
  parseTraceBackupText.mockReturnValue(parsed);
  window.confirm.mockReturnValue(false);
  render(<BackupPage onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File(["backup"], "trace.json")] },
  });
  await screen.findByRole("heading", { name: "Review Backup" });
  fireEvent.click(screen.getByRole("button", { name: "Confirm Full Restore" }));
  expect(window.confirm).toHaveBeenCalledWith(
    "Replace all current Trace data with this backup? Any current active workout draft will be replaced by the active draft in this backup. This cannot be merged."
  );
  expect(restoreTraceBackup).not.toHaveBeenCalled();
});

test("locked encrypted backup preview exposes no Journal count or details and warns before replacement", async () => {
  parseTraceBackupText.mockReturnValue({
    ...parsed,
    summary: { ...summary, encryptedJournal: true, journalEntries: null },
  });
  window.confirm.mockReturnValue(false);
  render(<BackupPage journalLockEnabled onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File(["encrypted backup"], "trace.json")] },
  });
  await screen.findByRole("heading", { name: "Review Backup" });
  expect(screen.getByText("Encrypted Journal included")).toBeInTheDocument();
  expect(screen.queryByText(/Journal entries:/)).not.toBeInTheDocument();
  expect(screen.getByText(/backup's Journal password or recovery phrase will be required/i)).toBeInTheDocument();
  const backupPasswordInput = screen.getByLabelText("Backup Journal password", { selector: 'input[type="password"]' });
  fireEvent.change(backupPasswordInput, { target: { value: "backup passphrase" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm Full Restore" }));
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("encrypted Journal in the backup will replace the current Journal"));
  expect(restoreTraceBackup).not.toHaveBeenCalled();
  expect(backupPasswordInput).toHaveValue("");
});

test("encrypted restore passes the selected backup recovery phrase only after explicit confirmation", async () => {
  const encryptedParsed = {
    ...parsed,
    summary: { ...summary, encryptedJournal: true, journalEntries: null },
  };
  parseTraceBackupText.mockReturnValue(encryptedParsed);
  restoreTraceBackup.mockResolvedValue(encryptedParsed.summary);
  window.confirm.mockReturnValue(true);
  render(<BackupPage journalLockEnabled onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File(["encrypted backup"], "trace.json")] },
  });
  await screen.findByRole("heading", { name: "Review Backup" });
  fireEvent.click(screen.getByLabelText("Backup recovery phrase"));
  fireEvent.change(screen.getByLabelText("Backup Journal recovery phrase"), { target: { value: "complete recovery phrase" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm Full Restore" }));
  await waitFor(() => expect(restoreTraceBackup).toHaveBeenCalledWith(encryptedParsed.backup, {
    confirmed: true,
    journalVaultSession: null,
    backupJournalCredential: { type: "recovery-key", value: "complete recovery phrase" },
  }));
});

test("encrypted legacy backup alone uses legacy recovery-key labels", async () => {
  parseTraceBackupText.mockReturnValue({
    ...parsed,
    summary: {
      ...summary,
      encryptedJournal: true,
      journalEntries: null,
      journalRecoveryFormat: "legacy-random-key-v1",
    },
  });
  render(<BackupPage journalLockEnabled onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File(["legacy encrypted backup"], "trace.json")] },
  });
  await screen.findByRole("heading", { name: "Review Backup" });
  expect(screen.getByLabelText("Backup legacy recovery key")).toBeInTheDocument();
  expect(screen.queryByLabelText("Backup recovery phrase")).not.toBeInTheDocument();
});

test("preview and confirmation explain that a backup without a draft removes the current draft", async () => {
  parseTraceBackupText.mockReturnValue({
    ...parsed,
    summary: { ...summary, activeWorkoutDraft: false },
  });
  window.confirm.mockReturnValue(false);
  render(<BackupPage onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File(["backup"], "trace.json")] },
  });
  await screen.findByRole("heading", { name: "Review Backup" });
  expect(screen.getByText("Active workout draft: None — any current active workout draft will be removed")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Confirm Full Restore" }));
  expect(window.confirm).toHaveBeenCalledWith(
    "Replace all current Trace data with this backup? Any current active workout draft will be removed because this backup has none. This cannot be merged."
  );
  expect(restoreTraceBackup).not.toHaveBeenCalled();
});

test("confirmed restore shows success only after the complete restore resolves", async () => {
  parseTraceBackupText.mockReturnValue(parsed);
  let finishRestore;
  restoreTraceBackup.mockReturnValue(new Promise((resolve) => { finishRestore = resolve; }));
  const onBack = jest.fn();
  const onRestoreComplete = jest.fn();
  const onRestoreStarting = jest.fn();
  render(<BackupPage onBack={onBack} onRestoreStarting={onRestoreStarting} onRestoreComplete={onRestoreComplete} buttonStyle={{}} containerStyle={{}} />);
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File(["backup"], "trace.json")] },
  });
  await screen.findByRole("heading", { name: "Review Backup" });
  fireEvent.click(screen.getByRole("button", { name: "Confirm Full Restore" }));
  await waitFor(() => expect(restoreTraceBackup).toHaveBeenCalledWith(parsed.backup, { confirmed: true, journalVaultSession: null }));
  expect(onRestoreStarting).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("heading", { name: "✓ Trace restored successfully" })).not.toBeInTheDocument();
  expect(onRestoreComplete).not.toHaveBeenCalled();
  finishRestore(summary);
  expect(await screen.findByRole("heading", { name: "✓ Trace restored successfully" })).toBeInTheDocument();
  expect(onRestoreComplete).toHaveBeenCalledWith(summary);
  expect(screen.getByText("Your backup has been completely restored.")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Back to Timeline" }).at(-1));
  expect(onBack).toHaveBeenCalled();
});

test("failed restore shows persistent failure and no success state", async () => {
  parseTraceBackupText.mockReturnValue(parsed);
  restoreTraceBackup.mockRejectedValue(new Error("Trace restore failed and the previous data was restored: photo write failed"));
  render(<BackupPage onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File(["backup"], "trace.json")] },
  });
  await screen.findByRole("heading", { name: "Review Backup" });
  fireEvent.click(screen.getByRole("button", { name: "Confirm Full Restore" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Trace restore could not be completed. Trace restore failed and the previous data was restored");
  expect(screen.queryByRole("heading", { name: "✓ Trace restored successfully" })).not.toBeInTheDocument();
});

test("invalid selected files show an error and never expose confirmation", async () => {
  parseTraceBackupText.mockImplementation(() => { throw new Error("This is not a Trace backup."); });
  render(<BackupPage onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File(["bad"], "bad.json")] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("This is not a Trace backup");
  expect(screen.queryByRole("button", { name: "Confirm Full Restore" })).not.toBeInTheDocument();
});
