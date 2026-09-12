import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createRef, useState } from "react";
import {
  createCapsuleAudioRecorder,
  getCapsuleAudioRecordingSupport,
} from "../services/capsuleAudioRecorder";
import CapsuleAudioRecorder from "./CapsuleAudioRecorder";

jest.mock("../services/capsuleAudioRecorder", () => ({
  createCapsuleAudioRecorder: jest.fn(),
  getCapsuleAudioRecordingSupport: jest.fn(),
  MAX_CAPSULE_RECORDING_DURATION_MS: 300000,
}));

const saved = { id: "voice-pending", kind: "audio", mimeType: "audio/mp4", name: "Voice recording.m4a", bytes: 12, durationMs: 1800 };
const take = { file: new File(["encoded voice"], saved.name, { type: saved.mimeType }), durationMs: 1800, stopReason: "user" };
const controllers = [];
let pause;
let originalCreateUrl;
let originalRevokeUrl;

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function Harness({ initialPending = null, persist = async () => ({ pendingRecording: saved }), keep = async () => ({ ok: true }), discard = async () => ({ ok: true }), recorderRef, ...props }) {
  const [pendingRecording, setPendingRecording] = useState(initialPending);
  return <CapsuleAudioRecorder {...props} ref={recorderRef} pendingRecording={pendingRecording}
    mediaLoader={props.mediaLoader || { load: async (id) => ({ id, url: "blob:shared-voice" }) }}
    onPersistTake={async (...args) => {
      const result = await persist(...args);
      if (result?.pendingRecording) setPendingRecording(result.pendingRecording);
      return result;
    }}
    onKeepTake={async () => { const result = await keep(); if (!result?.error && result !== false) setPendingRecording(null); return result; }}
    onDiscardTake={async () => { const result = await discard(); if (!result?.error && result !== false) setPendingRecording(null); return result; }} />;
}

beforeEach(() => {
  jest.clearAllMocks();
  controllers.length = 0;
  originalCreateUrl = URL.createObjectURL;
  originalRevokeUrl = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => "blob:owned-preview");
  URL.revokeObjectURL = jest.fn();
  pause = jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  getCapsuleAudioRecordingSupport.mockReturnValue({ supported: true, mimeType: "audio/mp4", error: null });
  createCapsuleAudioRecorder.mockImplementation((options) => {
    let state = { status: "idle", elapsedMs: 0, error: null };
    let finishPromise;
    const controller = {
      options,
      getState: () => state,
      emit: (next) => { state = { ...state, ...next }; options.onState(state); },
      start: jest.fn(async () => { options.stopPlayback?.(); controller.emit({ status: "recording" }); }),
      stop: jest.fn((reason = "user") => {
        if (finishPromise) return finishPromise;
        if (state.status !== "recording") return Promise.resolve();
        controller.emit({ status: "stopping", stopReason: reason });
        finishPromise = (async () => {
          controller.emit({ status: "validating" });
          await options.onComplete({ ...take, stopReason: reason });
          controller.emit({ status: "ready" });
        })();
        return finishPromise;
      }),
      cancel: jest.fn(() => controller.emit({ status: "idle" })),
      dispose: jest.fn(() => { if (state.status === "recording") void controller.stop("navigation"); }),
    };
    controllers.push(controller);
    return controller;
  });
});

afterEach(() => {
  pause.mockRestore();
  URL.createObjectURL = originalCreateUrl;
  URL.revokeObjectURL = originalRevokeUrl;
});

async function recordAndStop() {
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Record audio" })));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Stop", exact: true })));
}

test("requests recording only after a click, shows elapsed time, saves before Keep, and never autoplays", async () => {
  const saving = deferred();
  const persist = jest.fn(() => saving.promise);
  const keep = jest.fn(async () => ({ ok: true }));
  const stopPlayback = jest.fn();
  const onActivityChange = jest.fn();
  render(<Harness persist={persist} keep={keep} stopPlayback={stopPlayback} onActivityChange={onActivityChange} />);
  expect(createCapsuleAudioRecorder).not.toHaveBeenCalled();
  expect(screen.getByText(/Up to 5 minutes, or 20 MiB/)).toBeInTheDocument();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Record audio" })));
  expect(stopPlayback).toHaveBeenCalledTimes(1);
  expect(onActivityChange).toHaveBeenLastCalledWith(true);
  act(() => controllers[0].emit({ elapsedMs: 65000 }));
  expect(screen.getByRole("timer", { name: "Recording elapsed time" })).toHaveTextContent("1:05");
  fireEvent.click(screen.getByRole("button", { name: "Stop", exact: true }));
  expect(persist).toHaveBeenCalledWith(take.file, { durationMs: 1800, stopReason: "user" });
  expect(screen.getByRole("button", { name: "Keep recording" })).toBeDisabled();
  expect(screen.getByLabelText("Preview your recording")).toHaveAttribute("controls");
  expect(screen.getByLabelText("Preview your recording")).not.toHaveAttribute("autoplay");
  await act(async () => saving.resolve({ pendingRecording: saved }));
  expect(screen.getByText(/Recording saved in this draft/)).toBeInTheDocument();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Keep recording" })));
  expect(keep).toHaveBeenCalledTimes(1);
  expect(persist).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Record audio" })).toBeEnabled();
  expect(onActivityChange).toHaveBeenLastCalledWith(false);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:owned-preview");
  expect(URL.revokeObjectURL).not.toHaveBeenCalledWith("blob:shared-voice");
});

test("restores a durable pending take without requesting the microphone or duplicating storage", async () => {
  const persist = jest.fn();
  const mediaLoader = { load: jest.fn(async (id) => ({ id, url: "blob:restored" })) };
  const registerPlayback = jest.fn();
  const unregisterPlayback = jest.fn();
  const { unmount } = render(<Harness initialPending={saved} persist={persist} mediaLoader={mediaLoader} registerPlayback={registerPlayback} unregisterPlayback={unregisterPlayback} />);
  const preview = await screen.findByLabelText("Preview your recording");
  expect(preview).toHaveAttribute("src", "blob:restored");
  expect(registerPlayback).toHaveBeenCalledWith(preview);
  expect(screen.getByText(/Saved recording restored for review/)).toBeInTheDocument();
  expect(createCapsuleAudioRecorder).not.toHaveBeenCalled();
  expect(persist).not.toHaveBeenCalled();
  unmount();
  expect(pause).toHaveBeenCalled();
  expect(unregisterPlayback).toHaveBeenCalledWith(preview);
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
});

test("confirms before discard, allows cancellation with Escape, and restores keyboard focus", async () => {
  const discard = jest.fn(async () => ({ ok: true }));
  render(<Harness initialPending={saved} discard={discard} />);
  const button = screen.getByRole("button", { name: "Discard recording", exact: true });
  button.focus();
  fireEvent.click(button);
  expect(discard).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog", { name: "Discard this recording?" });
  expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(button).toHaveFocus();
  fireEvent.click(button);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Confirm discard recording" })));
  expect(discard).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Record audio" })).toBeEnabled();
});

test("re-recording requires confirmation and successful removal before accessing the microphone", async () => {
  const removal = deferred();
  const discard = jest.fn(() => removal.promise);
  render(<Harness initialPending={saved} discard={discard} />);
  fireEvent.click(screen.getByRole("button", { name: "Record again" }));
  expect(createCapsuleAudioRecorder).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Discard and record again" }));
  expect(discard).toHaveBeenCalledTimes(1);
  expect(createCapsuleAudioRecorder).not.toHaveBeenCalled();
  await act(async () => removal.resolve({ ok: true }));
  expect(createCapsuleAudioRecorder).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Stop", exact: true })).toBeEnabled();
  await act(async () => controllers[0].cancel());
});

test("a failed discard preserves the saved take and never starts another recording", async () => {
  render(<Harness initialPending={saved} discard={async () => { throw new Error("Storage is busy."); }} />);
  fireEvent.click(screen.getByRole("button", { name: "Record again" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Discard and record again" })));
  expect(screen.getByRole("alert")).toHaveTextContent("Storage is busy.");
  expect(screen.getByRole("button", { name: "Keep recording" })).toBeEnabled();
  expect(createCapsuleAudioRecorder).not.toHaveBeenCalled();
});

test("failed persistence keeps a playable take retryable and blocks navigation until saved", async () => {
  const recorderRef = createRef();
  const persist = jest.fn().mockRejectedValueOnce(new Error("There is not enough device storage.")).mockResolvedValue({ pendingRecording: saved });
  render(<Harness persist={persist} recorderRef={recorderRef} />);
  await recordAndStop();
  expect(screen.getByRole("alert")).toHaveTextContent("only available in this session");
  expect(screen.getByLabelText("Preview your recording")).toHaveAttribute("src", "blob:owned-preview");
  expect(screen.getByRole("button", { name: "Keep recording" })).toBeDisabled();
  await expect(recorderRef.current.finishAndPersist()).resolves.toBe(false);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Retry saving recording" })));
  expect(persist.mock.calls[1][0]).toBe(persist.mock.calls[0][0]);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  await expect(recorderRef.current.finishAndPersist()).resolves.toBe(true);
});

test("an App-owned retry take restores in the current session and can be explicitly discarded", async () => {
  const discard = jest.fn(async () => ({ ok: true }));
  render(<Harness retryTake={{ ...take, draftId: "draft-1" }} discard={discard} />);
  expect(screen.getByRole("alert")).toHaveTextContent("not been saved yet");
  expect(screen.getByRole("button", { name: "Retry saving recording" })).toBeEnabled();
  expect(createCapsuleAudioRecorder).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Discard recording", exact: true }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Confirm discard recording" })));
  expect(discard).toHaveBeenCalledTimes(1);
  expect(screen.queryByLabelText("Preview your recording")).not.toBeInTheDocument();
});

test("a remounted session take switches to its matching durable reference when earlier persistence finishes", async () => {
  const persist = jest.fn();
  const retryTake = { ...take, id: saved.id, draftId: "draft-1" };
  const { rerender } = render(<CapsuleAudioRecorder retryTake={retryTake} onPersistTake={persist} />);
  expect(screen.getByRole("button", { name: "Keep recording" })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("not been saved yet");
  rerender(<CapsuleAudioRecorder pendingRecording={{ ...saved, url: "blob:durable-take" }} retryTake={null} onPersistTake={persist} />);
  expect(await screen.findByLabelText("Preview your recording")).toHaveAttribute("src", "blob:durable-take");
  expect(screen.getByRole("button", { name: "Keep recording" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Retry saving recording" })).not.toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(persist).not.toHaveBeenCalled();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:owned-preview");
  expect(URL.revokeObjectURL).not.toHaveBeenCalledWith("blob:durable-take");
});

test("ignores duplicate start, stop, retry, and Keep actions while each operation is pending", async () => {
  const saving = deferred();
  const keeping = deferred();
  const persist = jest.fn(() => saving.promise);
  const keep = jest.fn(() => keeping.promise);
  render(<Harness persist={persist} keep={keep} />);
  const record = screen.getByRole("button", { name: "Record audio" });
  await act(async () => { fireEvent.click(record); fireEvent.click(record); });
  expect(createCapsuleAudioRecorder).toHaveBeenCalledTimes(1);
  const stop = screen.getByRole("button", { name: "Stop", exact: true });
  fireEvent.click(stop); fireEvent.click(stop);
  expect(persist).toHaveBeenCalledTimes(1);
  await act(async () => saving.resolve({ pendingRecording: saved }));
  const keepButton = screen.getByRole("button", { name: "Keep recording" });
  fireEvent.click(keepButton); fireEvent.click(keepButton);
  expect(keep).toHaveBeenCalledTimes(1);
  await act(async () => keeping.resolve({ ok: true }));
});

test("reports unsupported recording without microphone access and preserves pending review", async () => {
  getCapsuleAudioRecordingSupport.mockReturnValue({ supported: false, error: new Error("Use an updated browser or choose an audio file below.") });
  const { rerender } = render(<Harness />);
  expect(screen.getByRole("button", { name: "Record audio" })).toBeDisabled();
  expect(screen.getByText(/Use an updated browser/)).toBeInTheDocument();
  expect(createCapsuleAudioRecorder).not.toHaveBeenCalled();
  rerender(<CapsuleAudioRecorder pendingRecording={{ ...saved, url: "blob:restored" }} onKeepTake={async () => ({ ok: true })} />);
  expect(screen.getByRole("button", { name: "Keep recording" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Record again" })).toBeDisabled();
});

test("shows permission errors and permits retry without changing existing draft state", async () => {
  const persist = jest.fn();
  render(<Harness persist={persist} />);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Record audio" })));
  act(() => controllers[0].emit({ status: "error", error: new Error("Microphone access was denied. Allow microphone access in your browser settings, then try again.") }));
  expect(screen.getByRole("alert")).toHaveTextContent("Allow microphone access");
  expect(screen.getByRole("button", { name: "Record audio" })).toBeEnabled();
  expect(persist).not.toHaveBeenCalled();
});

test("canceling a permission request allows a fresh attempt and ignores the late request state", async () => {
  const request = deferred();
  const originalFactory = createCapsuleAudioRecorder.getMockImplementation();
  createCapsuleAudioRecorder.mockImplementationOnce((options) => {
    const controller = originalFactory(options);
    controller.start.mockImplementation(async () => {
      controller.emit({ status: "requesting" });
      await request.promise;
      controller.emit({ status: "error", error: new Error("Old permission request failed") });
    });
    return controller;
  });
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Record audio" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel microphone request" }));
  expect(controllers[0].cancel).toHaveBeenCalledTimes(1);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Record audio" })));
  expect(controllers).toHaveLength(2);
  await act(async () => request.resolve());
  expect(screen.queryByText("Old permission request failed")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Stop", exact: true })).toBeEnabled();
  await act(async () => controllers[1].cancel());
});

test("a background-canceled permission request does not block a fresh recording gesture", async () => {
  const permission = deferred();
  const originalFactory = createCapsuleAudioRecorder.getMockImplementation();
  createCapsuleAudioRecorder.mockImplementationOnce((options) => {
    const controller = originalFactory(options);
    controller.start.mockImplementation(async () => {
      controller.emit({ status: "requesting" });
      await permission.promise;
      controller.emit({ status: "error", error: new Error("Stale permission response") });
    });
    return controller;
  });
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Record audio" }));
  act(() => controllers[0].emit({ status: "idle", stopReason: "background" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Record audio" })));
  expect(controllers).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Stop", exact: true })).toBeEnabled();
  await act(async () => permission.resolve());
  expect(screen.queryByText("Stale permission response")).not.toBeInTheDocument();
  await act(async () => controllers[1].cancel());
});

test("a failed Keep preserves the pending take and can be retried without storing the blob again", async () => {
  const keep = jest.fn().mockRejectedValueOnce(new Error("Draft could not be saved.")).mockResolvedValue({ ok: true });
  const persist = jest.fn();
  render(<Harness initialPending={saved} keep={keep} persist={persist} />);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Keep recording" })));
  expect(screen.getByRole("alert")).toHaveTextContent("Draft could not be saved.");
  expect(screen.getByRole("button", { name: "Keep recording" })).toBeEnabled();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Keep recording" })));
  expect(keep).toHaveBeenCalledTimes(2);
  expect(persist).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Record audio" })).toBeEnabled();
});

test("passes available byte limits and the App lifecycle adapter to the controller", async () => {
  const lifecycleAdapter = { subscribe: jest.fn() };
  render(<Harness maxBytes={2 * 1024 * 1024} lifecycleAdapter={lifecycleAdapter} />);
  expect(screen.getByText(/or 2 MiB of available space/)).toBeInTheDocument();
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Record audio" })));
  expect(createCapsuleAudioRecorder.mock.calls[0][0]).toEqual(expect.objectContaining({ maxBytes: 2097152, lifecycleAdapter }));
  await act(async () => controllers[0].stop("background"));
  expect(screen.getByText("Recording stopped when Trace went into the background.")).toBeInTheDocument();
});

test("unmount finalizes recording using the captured draft writer and releases the preview only", async () => {
  const saving = deferred();
  const persist = jest.fn(() => saving.promise);
  const { unmount } = render(<Harness persist={persist} />);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Record audio" })));
  unmount();
  expect(controllers[0].dispose).toHaveBeenCalledTimes(1);
  expect(persist).toHaveBeenCalledWith(take.file, { durationMs: 1800, stopReason: "navigation" });
  await act(async () => saving.resolve({ pendingRecording: saved }));
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test("stale controller callbacks cannot overwrite a replacement take", async () => {
  render(<Harness />);
  await recordAndStop();
  const first = controllers[0];
  fireEvent.click(screen.getByRole("button", { name: "Record again" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Discard and record again" })));
  act(() => first.emit({ status: "error", error: new Error("Late old recorder error") }));
  expect(screen.queryByText("Late old recorder error")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Stop", exact: true })).toBeInTheDocument();
  await act(async () => controllers[1].cancel());
});

test("waits for finalization and durable persistence before allowing navigation", async () => {
  const saving = deferred();
  const recorderRef = createRef();
  render(<Harness persist={() => saving.promise} recorderRef={recorderRef} />);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Record audio" })));
  let navigation;
  act(() => { navigation = recorderRef.current.finishAndPersist(); });
  const finished = jest.fn();
  navigation.then(finished);
  expect(finished).not.toHaveBeenCalled();
  await act(async () => saving.resolve({ pendingRecording: saved }));
  await waitFor(() => expect(finished).toHaveBeenCalledWith(true));
});
