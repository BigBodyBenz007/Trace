import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BackupPage from "./BackupPage";
import {
  createTraceBackup,
  parseTraceBackupText,
  restoreTraceBackup,
} from "../services/traceBackup";

jest.mock("../services/traceBackup", () => ({
  createTraceBackup: jest.fn(),
  parseTraceBackupText: jest.fn(),
  restoreTraceBackup: jest.fn(),
  traceBackupFilename: jest.fn(() => "trace-backup-test.json"),
}));

const summary = {
  memories: 2, photos: 3, nutritionEntries: 4, workouts: 5,
  medicationEntries: 6, protocols: 7, trophyCaseEntries: 8,
  savedExercises: 9, savedCompounds: 10, userFoods: 11,
};
const parsed = { backup: { createdAt: "2026-08-12T00:00:00.000Z" }, summary };

beforeEach(() => {
  jest.clearAllMocks();
  window.confirm = jest.fn(() => true);
});

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

test("validates a selected backup and previews counts without restoring", async () => {
  parseTraceBackupText.mockReturnValue(parsed);
  render(<BackupPage onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} />);
  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [new File(["backup"], "trace.json", { type: "application/json" })] } });
  expect(await screen.findByRole("heading", { name: "Review Backup" })).toBeInTheDocument();
  expect(screen.getByText("Memories: 2")).toBeInTheDocument();
  expect(screen.getByText("Photos: 3")).toBeInTheDocument();
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
  expect(window.confirm).toHaveBeenCalled();
  expect(restoreTraceBackup).not.toHaveBeenCalled();
});

test("confirmed restore applies the validated backup and reloads Trace", async () => {
  parseTraceBackupText.mockReturnValue(parsed);
  restoreTraceBackup.mockResolvedValue(summary);
  const onRestoreComplete = jest.fn();
  render(<BackupPage onBack={jest.fn()} buttonStyle={{}} containerStyle={{}} onRestoreComplete={onRestoreComplete} />);
  fireEvent.change(document.querySelector('input[type="file"]'), {
    target: { files: [new File(["backup"], "trace.json")] },
  });
  await screen.findByRole("heading", { name: "Review Backup" });
  fireEvent.click(screen.getByRole("button", { name: "Confirm Full Restore" }));
  await waitFor(() => expect(restoreTraceBackup).toHaveBeenCalledWith(parsed.backup, { confirmed: true }));
  expect(onRestoreComplete).toHaveBeenCalled();
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
