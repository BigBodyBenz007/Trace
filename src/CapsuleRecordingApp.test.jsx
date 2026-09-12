import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App, { localCalendarDateKey } from "./App";
import { createCapsuleAudioRecorder, getCapsuleAudioRecordingSupport } from "./services/capsuleAudioRecorder";
import { createTimeCapsuleDraft } from "./services/timeCapsule";
import { deleteMedia, getMedia, openPhotoDatabase, putMedia } from "./storage/photoStorage";

// These flows mount the complete App repeatedly and use its durable media path.
jest.setTimeout(15000);

jest.mock("./services/capsuleAudioRecorder", () => ({
  createCapsuleAudioRecorder: jest.fn(),
  getCapsuleAudioRecordingSupport: jest.fn(),
  MAX_CAPSULE_RECORDING_DURATION_MS: 300000,
}));

jest.mock("./storage/photoStorage", () => ({
  clearCompletedMigrationBackup: jest.fn(async () => {}),
  dataUrlToBlob: jest.fn(), deletePhotos: jest.fn(async () => {}), deleteMedia: jest.fn(),
  getMedia: jest.fn(), getAllMedia: jest.fn(async () => []),
  getPhoto: jest.fn(async () => undefined), getAllPhotos: jest.fn(async () => []),
  hasLegacyPhotos: jest.fn(() => false), markLegacyMigrationComplete: jest.fn(async () => {}),
  migrateLegacyPhotos: jest.fn(), openPhotoDatabase: jest.fn(), putPhotos: jest.fn(async () => {}),
  putMedia: jest.fn(), replaceAllMedia: jest.fn(async () => {}), replaceAllPhotos: jest.fn(async () => {}),
}));

let records;
let controllers;
let originalBrowser;
const recordingFile = () => new File(["recorded voice"], "Voice recording.m4a", { type: "audio/mp4" });
const priorAudio = { id: "prior-audio", kind: "audio", name: "Previous.m4a", mimeType: "audio/mp4", bytes: 5, durationMs: 900 };

function savedDraft() { return JSON.parse(localStorage.getItem("timeCapsuleDraft")); }

function seedDraft() {
  const draft = createTimeCapsuleDraft({
    id: "voice-draft", capsuleId: "voice-capsule",
    form: { name: "My recorded capsule", text: "Words to keep", openOn: localCalendarDateKey() }, media: [priorAudio],
  });
  localStorage.setItem("timeCapsuleDraft", JSON.stringify(draft));
  records.set(priorAudio.id, {
    ...priorAudio, capsuleId: draft.capsuleId, capsuleDraftId: draft.id, blob: new Blob(["prior"], { type: priorAudio.mimeType }),
  });
  return draft;
}

async function openEditor() {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Time Capsules", exact: true })); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Continue draft" })); });
  expect(screen.getByLabelText("Private message")).toHaveValue("Words to keep");
}

async function recordAndStop() {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Record audio", exact: true })); });
  expect(screen.getByRole("button", { name: "Seal Time Capsule", exact: true })).toBeDisabled();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Stop", exact: true })); });
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  records = new Map();
  controllers = [];
  originalBrowser = {
    createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL,
    requestAnimationFrame: window.requestAnimationFrame, cancelAnimationFrame: window.cancelAnimationFrame,
    scrollTo: window.scrollTo, scrollIntoView: Element.prototype.scrollIntoView, matchMedia: window.matchMedia,
  };
  let objectUrlNumber = 0;
  URL.createObjectURL = jest.fn(() => `blob:capsule-recording-${++objectUrlNumber}`);
  URL.revokeObjectURL = jest.fn();
  window.requestAnimationFrame = (callback) => { callback(); return 1; };
  window.cancelAnimationFrame = jest.fn();
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
  window.matchMedia = jest.fn((query) => ({ matches: query.includes("prefers-reduced-motion"), addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  jest.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  jest.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  openPhotoDatabase.mockResolvedValue({ name: "capsule-recording-app-database" });
  getMedia.mockImplementation(async (database, id) => records.get(id));
  putMedia.mockImplementation(async (database, values) => { values.forEach((record) => records.set(record.id, record)); });
  deleteMedia.mockImplementation(async (database, ids) => { ids.forEach((id) => records.delete(id)); });
  getCapsuleAudioRecordingSupport.mockReturnValue({ supported: true, mimeType: "audio/mp4", error: null });
  createCapsuleAudioRecorder.mockImplementation((options) => {
    let state = { status: "idle", elapsedMs: 0, error: null };
    let completion;
    const controller = {
      options,
      getState: () => state,
      emit: (next) => { state = { ...state, ...next }; options.onState(state); },
      start: jest.fn(async () => { options.stopPlayback?.(); controller.emit({ status: "recording", elapsedMs: 1500 }); }),
      stop: jest.fn((stopReason = "user") => {
        if (completion) return completion;
        if (state.status !== "recording") return Promise.resolve();
        controller.emit({ status: "stopping", stopReason });
        completion = (async () => {
          controller.emit({ status: "validating" });
          await options.onComplete({ file: recordingFile(), durationMs: 1500, stopReason });
          controller.emit({ status: "ready" });
        })();
        return completion;
      }),
      cancel: jest.fn(() => controller.emit({ status: "idle" })),
      dispose: jest.fn(() => { if (state.status === "recording") void controller.stop("navigation"); }),
    };
    controllers.push(controller);
    return controller;
  });
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
  URL.createObjectURL = originalBrowser.createObjectURL;
  URL.revokeObjectURL = originalBrowser.revokeObjectURL;
  window.requestAnimationFrame = originalBrowser.requestAnimationFrame;
  window.cancelAnimationFrame = originalBrowser.cancelAnimationFrame;
  window.scrollTo = originalBrowser.scrollTo;
  Element.prototype.scrollIntoView = originalBrowser.scrollIntoView;
  window.matchMedia = originalBrowser.matchMedia;
});

test("records into a durable pending draft, restores review across navigation/reload, and keeps one playable attachment", async () => {
  const original = seedDraft();
  const app = render(<App />);
  await openEditor();
  expect(createCapsuleAudioRecorder).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Choose audio file")).not.toHaveAttribute("capture");
  await recordAndStop();
  const pending = savedDraft().pendingRecording;
  expect(pending).toMatchObject({ kind: "audio", mimeType: "audio/mp4", name: "Voice recording.m4a", durationMs: 1500 });
  expect(savedDraft()).toMatchObject({ form: original.form, media: [priorAudio] });
  expect(records.size).toBe(2);
  expect(putMedia).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Seal Time Capsule", exact: true })).toBeDisabled();
  expect(screen.getByLabelText("Preview your recording")).toHaveAttribute("controls");
  expect(screen.getByLabelText("Preview your recording")).not.toHaveAttribute("autoplay");
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" })); });
  await openEditor();
  expect(await screen.findByLabelText("Preview your recording")).toHaveAttribute("src", expect.stringContaining("blob:"));
  expect(savedDraft().pendingRecording.id).toBe(pending.id);
  app.unmount();
  render(<App />);
  await openEditor();
  expect(await screen.findByLabelText("Preview your recording")).toHaveAttribute("src", expect.stringContaining("blob:"));
  expect(createCapsuleAudioRecorder).toHaveBeenCalledTimes(1);
  const originalBlob = records.get(pending.id).blob;
  const keep = screen.getByRole("button", { name: "Keep recording" });
  await act(async () => { fireEvent.click(keep); fireEvent.click(keep); });
  expect(savedDraft()).not.toHaveProperty("pendingRecording");
  expect(savedDraft().media.map(({ id }) => id)).toEqual([priorAudio.id, pending.id]);
  expect(records.get(pending.id).blob).toBe(originalBlob);
  expect(putMedia).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Seal Time Capsule", exact: true })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Seal Time Capsule", exact: true }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Confirm seal Time Capsule" })); });
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  expect(savedDraft()).toBeNull();
  expect(JSON.parse(localStorage.getItem("timeCapsules"))[0].media.map(({ id }) => id)).toEqual([priorAudio.id, pending.id]);
  expect(records.get(pending.id)).not.toHaveProperty("capsuleDraftId");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Open Capsule" })); });
  fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
  const contents = screen.getByRole("region", { name: "Opened capsule contents" });
  expect(within(contents).getByText("Words to keep")).toBeInTheDocument();
  expect(within(contents).getByText("Audio recording 1")).toBeInTheDocument();
  expect(within(contents).getByText("Audio recording 2")).toBeInTheDocument();
  const playback = await within(contents).findByLabelText("Play Audio recording 2: Voice recording.m4a");
  expect(playback).toHaveAttribute("controls");
  expect(playback).toHaveAttribute("src", expect.stringContaining("blob:"));
  expect(playback).not.toHaveAttribute("autoplay");
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  await playback.play();
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  expect(records.size).toBe(2);
});

test("failed pending persistence preserves the draft and restores its retryable take after App navigation", async () => {
  const original = seedDraft();
  render(<App />);
  await openEditor();
  const realSet = Storage.prototype.setItem;
  let failRecordingSave = true;
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(function setItem(key, value) {
    if (key === "timeCapsuleDraft" && JSON.parse(value).pendingRecording && failRecordingSave) {
      throw new DOMException("Browser storage is full", "QuotaExceededError");
    }
    return realSet.call(this, key, value);
  });
  await recordAndStop();
  expect(savedDraft()).toEqual(original);
  expect(records.size).toBe(1);
  expect(screen.getByText(/only available in this session/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Seal Time Capsule", exact: true })).toBeDisabled();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Back to Timeline" })); });
  expect(screen.getByText(/Finish saving or reviewing your recording before leaving/i)).toBeInTheDocument();
  // Browser history can leave the editor independently of its safe Back button.
  await act(async () => { fireEvent.popState(window, { state: null }); });
  await openEditor();
  expect(await screen.findByLabelText("Preview your recording")).toHaveAttribute("src", expect.stringContaining("blob:"));
  expect(screen.getByRole("button", { name: "Retry saving recording" })).toBeEnabled();
  failRecordingSave = false;
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry saving recording" })); });
  expect(savedDraft()).toMatchObject({ form: original.form, media: original.media, pendingRecording: { kind: "audio" } });
  expect(records.size).toBe(2);
  expect(createCapsuleAudioRecorder).toHaveBeenCalledTimes(1);
  expect(putMedia.mock.calls[0][1][0].id).toBe(putMedia.mock.calls[1][1][0].id);
});

test("leaving an active recording finalizes against its original App draft without losing other attachments", async () => {
  const original = seedDraft();
  render(<App />);
  await openEditor();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Record audio", exact: true })); });
  await act(async () => { fireEvent.popState(window, { state: null }); });
  await waitFor(() => expect(savedDraft().pendingRecording).toMatchObject({ kind: "audio", durationMs: 1500 }));
  expect(savedDraft()).toMatchObject({ form: original.form, media: original.media });
  expect(controllers[0].stop).toHaveBeenCalledWith("navigation");
  expect(controllers[0].dispose).toHaveBeenCalled();
  await openEditor();
  expect(await screen.findByLabelText("Preview your recording")).toHaveAttribute("src", expect.stringContaining("blob:"));
  expect(createCapsuleAudioRecorder).toHaveBeenCalledTimes(1);
  expect(records.size).toBe(2);
});
