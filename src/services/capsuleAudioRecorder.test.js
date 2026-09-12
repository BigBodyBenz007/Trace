import {
  createCapsuleAudioRecorder,
  estimateCapsuleAudioRecordingMaxBytes,
  getCapsuleAudioRecordingSupport,
  MAX_CAPSULE_RECORDING_DURATION_MS,
  validateCapsuleAudioRecording,
} from "./capsuleAudioRecorder";
import { APP_LIFECYCLE_PHASE } from "./appLifecycleAdapter";

const flush = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); };
const blob = (size = 12, type = "audio/webm;codecs=opus") => new Blob([new Uint8Array(size)], { type });
const pending = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

function harness(overrides = {}) {
  let recorder;
  let lifecycle;
  const track = new EventTarget();
  track.readyState = "live";
  track.stop = jest.fn(() => { track.readyState = "ended"; });
  const secondaryTrack = { stop: jest.fn() };
  const stream = { getTracks: () => [track, secondaryTrack], getAudioTracks: () => [track] };
  class Recorder {
    static isTypeSupported = jest.fn((mime) => mime.startsWith("audio/webm"));
    constructor(incomingStream, config) {
      this.mimeType = config.mimeType;
      this.state = "inactive";
      this.config = config;
      recorder = this;
    }
    start = jest.fn(() => { this.state = "recording"; });
    stop = jest.fn(() => {
      this.state = "inactive";
      Promise.resolve().then(() => {
        this.ondataavailable?.({ data: this.finalChunk === undefined ? blob() : this.finalChunk });
        this.onstop?.();
      });
    });
    chunk(data) { this.ondataavailable?.({ data }); }
  }
  const complete = jest.fn();
  const states = [];
  const unsubscribe = jest.fn();
  const mediaDevices = { getUserMedia: jest.fn().mockResolvedValue(stream) };
  const documentObject = { createElement: () => ({ canPlayType: () => "probably" }) };
  const options = {
    mediaDevices, MediaRecorderClass: Recorder, documentObject,
    lifecycleAdapter: { subscribe: (callback) => { lifecycle = callback; return unsubscribe; } },
    onComplete: complete, onState: (state) => states.push(state),
    validateRecording: jest.fn().mockResolvedValue({ durationMs: 1250 }),
    ...overrides,
  };
  const controller = createCapsuleAudioRecorder(options);
  return { controller, options, track, secondaryTrack, stream, mediaDevices, complete, states, unsubscribe, Recorder,
    get recorder() { return recorder; },
    background: () => lifecycle({ phase: APP_LIFECYCLE_PHASE.BACKGROUND }),
  };
}

afterEach(() => { jest.useRealTimers(); });

test("capability detection uses supported recordable and playable MIME and offers a file alternative", () => {
  class Recorder { static isTypeSupported = (mime) => mime.startsWith("audio/mp4") || mime.startsWith("audio/webm"); }
  const base = { mediaDevices: { getUserMedia: jest.fn() }, MediaRecorderClass: Recorder, documentObject: null };
  expect(getCapsuleAudioRecordingSupport(base)).toMatchObject({ supported: true, mimeType: "audio/mp4;codecs=mp4a.40.2" });
  expect(getCapsuleAudioRecordingSupport({ ...base, documentObject: { createElement: () => ({ canPlayType: (mime) => mime.startsWith("audio/webm") ? "probably" : "" }) } })).toMatchObject({ supported: true, mimeType: "audio/webm;codecs=opus" });
  expect(getCapsuleAudioRecordingSupport({ ...base, mediaDevices: null })).toMatchObject({ supported: false, error: { code: "recording-unsupported", message: expect.stringContaining("choose an audio file") } });
  expect(getCapsuleAudioRecordingSupport({ ...base, MediaRecorderClass: null }).supported).toBe(false);
  expect(base.mediaDevices.getUserMedia).not.toHaveBeenCalled();
});

test.each([
  ["NotAllowedError", "recording-permission"], ["SecurityError", "recording-permission"],
  ["NotFoundError", "recording-no-microphone"], ["NotReadableError", "recording-hardware"],
])("explains %s and does not mutate a draft or complete a take", async (name, code) => {
  const h = harness({ mediaDevices: { getUserMedia: jest.fn().mockRejectedValue(Object.assign(new Error("failed"), { name })) } });
  expect(await h.controller.start()).toBe(false);
  expect(h.controller.getState()).toMatchObject({ status: "error", error: { code } });
  expect(h.complete).not.toHaveBeenCalled();
  await h.controller.dispose();
});

test("records only on start, stops competing playback, validates the complete file, and waits for persistence", async () => {
  const saved = pending();
  const stopPlayback = jest.fn();
  const h = harness({ stopPlayback, onComplete: jest.fn(() => saved.promise) });
  expect(h.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  await h.controller.start();
  expect(stopPlayback.mock.invocationCallOrder[0]).toBeLessThan(h.mediaDevices.getUserMedia.mock.invocationCallOrder[0]);
  expect(h.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
  expect(h.recorder.start).toHaveBeenCalledWith(1000);
  h.recorder.chunk(blob(5));
  const stopping = h.controller.stop();
  const duplicate = h.controller.stop();
  expect(stopping).toBe(duplicate);
  await flush();
  expect(h.track.stop).toHaveBeenCalledTimes(1);
  expect(h.secondaryTrack.stop).toHaveBeenCalledTimes(1);
  expect(h.options.validateRecording).toHaveBeenCalledTimes(1);
  expect(h.options.onComplete).toHaveBeenCalledTimes(1);
  const take = h.options.onComplete.mock.calls[0][0];
  expect(take).toMatchObject({ durationMs: 1250, stopReason: "user", file: { size: 17, type: "audio/webm", name: expect.stringMatching(/\.weba$/) } });
  expect(h.controller.getState().status).toBe("validating");
  saved.resolve();
  expect(await stopping).toBe(take);
  expect(h.controller.getState().status).toBe("ready");
  expect(h.recorder.stop).toHaveBeenCalledTimes(1);
  await h.controller.dispose();
});

test("names the file from actual output MIME instead of the requested container", async () => {
  const h = harness();
  await h.controller.start();
  h.recorder.mimeType = "audio/mp4;codecs=mp4a.40.2";
  h.recorder.finalChunk = blob(20, "audio/mp4");
  const { file } = await h.controller.stop();
  expect(file.type).toBe("audio/mp4");
  expect(file.name).toMatch(/\.m4a$/);
  await h.controller.dispose();
});

test("rapid starts issue one microphone request and cancel releases permission granted late", async () => {
  const permission = pending();
  const h = harness({ mediaDevices: { getUserMedia: jest.fn(() => permission.promise) } });
  const starting = h.controller.start();
  expect(await h.controller.start()).toBe(false);
  await flush();
  expect(h.options.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  h.controller.cancel();
  expect(h.controller.getState().status).toBe("idle");
  permission.resolve(h.stream);
  expect(await starting).toBe(false);
  expect(h.track.stop).toHaveBeenCalledTimes(1);
  expect(h.secondaryTrack.stop).toHaveBeenCalledTimes(1);
  expect(h.complete).not.toHaveBeenCalled();
  await h.controller.dispose();
});

test("cancel invalidates a completed container still being decoded", async () => {
  const validation = pending();
  const h = harness({ validateRecording: () => validation.promise });
  await h.controller.start();
  const stopped = h.controller.stop();
  await flush();
  h.controller.cancel();
  validation.resolve({ durationMs: 1000 });
  await stopped;
  await flush();
  expect(h.complete).not.toHaveBeenCalled();
  expect(h.controller.getState().status).toBe("idle");
  await h.controller.dispose();
});

test("five-minute deadline finalizes and releases every track automatically", async () => {
  jest.useFakeTimers();
  const h = harness();
  await h.controller.start();
  jest.advanceTimersByTime(MAX_CAPSULE_RECORDING_DURATION_MS);
  await flush();
  expect(h.complete).toHaveBeenCalledWith(expect.objectContaining({ stopReason: "time-limit" }));
  expect(h.track.stop).toHaveBeenCalledTimes(1);
  expect(h.controller.getState()).toMatchObject({ status: "ready", elapsedMs: MAX_CAPSULE_RECORDING_DURATION_MS });
  await h.controller.dispose();
});

test("byte limit leaves final-container headroom and never returns a truncated oversized file", async () => {
  const h = harness({ maxBytes: 100 });
  await h.controller.start();
  h.recorder.finalChunk = blob(9);
  h.recorder.chunk(blob(91));
  await flush();
  expect(h.complete).toHaveBeenCalledWith(expect.objectContaining({ stopReason: "size-limit", file: expect.objectContaining({ size: 100 }) }));
  await h.controller.dispose();
  const oversized = harness({ maxBytes: 100 });
  await oversized.controller.start();
  oversized.recorder.chunk(blob(101));
  await flush();
  expect(oversized.complete).not.toHaveBeenCalled();
  expect(oversized.controller.getState()).toMatchObject({ status: "error", error: { code: "recording-size-limit" } });
  expect(oversized.track.stop).toHaveBeenCalledTimes(1);
  await oversized.controller.dispose();
});

test("no available bytes rejects before microphone permission", async () => {
  const h = harness({ maxBytes: 0 });
  expect(await h.controller.start()).toBe(false);
  expect(h.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  expect(h.controller.getState().error.code).toBe("recording-size-limit");
  await h.controller.dispose();
});

test.each(["background", "track", "exit"])("%s interruption stops and attempts finalization", async (kind) => {
  const h = harness();
  await h.controller.start();
  const previousStates = h.states.length;
  if (kind === "background") h.background();
  if (kind === "track") h.track.dispatchEvent(new Event("ended"));
  if (kind === "exit") await h.controller.dispose();
  await flush();
  expect(h.complete).toHaveBeenCalledWith(expect.objectContaining({ stopReason: { background: "background", track: "microphone-interrupted", exit: "editor-exit" }[kind] }));
  expect(h.track.stop).toHaveBeenCalledTimes(1);
  if (kind === "exit") expect(h.states).toHaveLength(previousStates);
  await h.controller.dispose();
  expect(h.unsubscribe).toHaveBeenCalledTimes(1);
});

test("background cancels an unanswered microphone request without leaking its eventual stream", async () => {
  const permission = pending();
  const h = harness({ mediaDevices: { getUserMedia: () => permission.promise } });
  const start = h.controller.start();
  await flush();
  h.background();
  permission.resolve(h.stream);
  await start;
  expect(h.track.stop).toHaveBeenCalledTimes(1);
  expect(h.controller.getState().status).toBe("idle");
  expect(h.complete).not.toHaveBeenCalled();
  await h.controller.dispose();
});

test("empty data, recorder errors, and decode failure clean up without delivering invalid takes", async () => {
  for (const scenario of ["empty", "recorder", "decode"]) {
    const h = harness(scenario === "decode" ? { validateRecording: jest.fn().mockRejectedValue(new Error("bad audio")) } : {});
    await h.controller.start();
    if (scenario === "empty") h.recorder.finalChunk = blob(0);
    if (scenario === "recorder") h.recorder.onerror({ error: new Error("hardware failure") });
    await h.controller.stop();
    await flush();
    expect(h.controller.getState().status).toBe("error");
    expect(h.complete).not.toHaveBeenCalled();
    expect(h.track.stop).toHaveBeenCalledTimes(1);
    await h.controller.dispose();
  }
});

test("missing stop event times out after releasing the microphone", async () => {
  jest.useFakeTimers();
  const h = harness();
  await h.controller.start();
  h.recorder.stop = jest.fn(() => { h.recorder.state = "inactive"; });
  const stopped = h.controller.stop();
  expect(h.track.stop).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(8000);
  await stopped;
  expect(h.controller.getState().error.code).toBe("recording-stop-timeout");
  await h.controller.dispose();
});

function decoder(decoded) {
  const close = jest.fn().mockResolvedValue();
  const decodeAudioData = jest.fn().mockResolvedValue(decoded);
  const AudioContextClass = jest.fn().mockImplementation(() => ({ close, decodeAudioData }));
  const file = { arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(32)) };
  return { AudioContextClass, close, decodeAudioData, file };
}

test("completed recording validation requires decoded channels, frames, and duration; always closes its own context", async () => {
  const good = decoder({ numberOfChannels: 1, length: 48000, duration: 1 });
  await expect(validateCapsuleAudioRecording(good.file, good)).resolves.toEqual({ durationMs: 1000 });
  expect(good.decodeAudioData).toHaveBeenCalledWith(expect.any(ArrayBuffer), expect.any(Function), expect.any(Function));
  expect(good.close).toHaveBeenCalledTimes(1);
  for (const decoded of [{ numberOfChannels: 0, length: 10, duration: 1 }, { numberOfChannels: 1, length: 0, duration: 1 }, { numberOfChannels: 1, length: 1, duration: Infinity }]) {
    const bad = decoder(decoded);
    await expect(validateCapsuleAudioRecording(bad.file, bad)).rejects.toMatchObject({ code: "recording-empty" });
    expect(bad.close).toHaveBeenCalledTimes(1);
  }
});

test("decode rejection, unsupported playback validation, and overlong interruption are actionable", async () => {
  const failed = decoder(null);
  failed.decodeAudioData.mockRejectedValue(new Error("decode failed"));
  await expect(validateCapsuleAudioRecording(failed.file, failed)).rejects.toMatchObject({ code: "recording-unreadable" });
  expect(failed.close).toHaveBeenCalledTimes(1);
  await expect(validateCapsuleAudioRecording(failed.file, { AudioContextClass: null })).rejects.toMatchObject({ code: "recording-playback-unsupported" });
  const long = decoder({ numberOfChannels: 1, length: 10, duration: 302 });
  await expect(validateCapsuleAudioRecording(long.file, long)).rejects.toMatchObject({ code: "recording-duration-limit" });
});

test("a validation timeout cannot create a leaked audio context when file reading finishes late", async () => {
  jest.useFakeTimers();
  const read = pending();
  const h = decoder({ numberOfChannels: 1, length: 1, duration: 1 });
  h.file.arrayBuffer = () => read.promise;
  const validating = validateCapsuleAudioRecording(h.file, h);
  const rejection = expect(validating).rejects.toMatchObject({ code: "recording-validation-timeout" });
  jest.advanceTimersByTime(8000);
  await rejection;
  read.resolve(new ArrayBuffer(4));
  await flush();
  expect(h.AudioContextClass).not.toHaveBeenCalled();
});

test("storage quota estimate reduces recording bytes using the shared storage reserve and overhead", async () => {
  const storage = { estimate: jest.fn().mockResolvedValue({ usage: 100, quota: 100 + 5 * 1024 * 1024 + 115 }), persist: jest.fn() };
  const h = harness({ maxBytes: 1000, navigatorObject: { storage } });
  expect(storage.estimate).not.toHaveBeenCalled();
  await h.controller.start();
  expect(h.controller.getState().maxBytes).toBe(100);
  expect(storage.persist).not.toHaveBeenCalled();
  h.recorder.finalChunk = blob(9);
  h.recorder.chunk(blob(91));
  await flush();
  expect(h.complete).toHaveBeenCalledWith(expect.objectContaining({ stopReason: "size-limit", file: expect.objectContaining({ size: 100 }) }));
  await h.controller.dispose();
});

test("no quota headroom fails before requesting microphone permission", async () => {
  const h = harness({ navigatorObject: { storage: { estimate: async () => ({ usage: 100, quota: 200 }) } } });
  expect(await h.controller.start()).toBe(false);
  expect(h.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  expect(h.controller.getState().error.code).toBe("recording-storage-limit");
  await h.controller.dispose();
});

test.each([undefined, { usage: -1, quota: 100 }, { usage: 200, quota: 100 }])("unavailable or malformed quota estimates preserve attachment budget (%p)", async (estimate) => {
  await expect(estimateCapsuleAudioRecordingMaxBytes(123, { navigatorObject: { storage: { estimate: async () => estimate } } })).resolves.toBe(123);
});

test("an estimate failure is optional and canceled preflight never requests the microphone", async () => {
  await expect(estimateCapsuleAudioRecordingMaxBytes(123, { navigatorObject: { storage: { estimate: async () => { throw new Error("private mode"); } } } })).resolves.toBe(123);
  const quota = pending();
  const h = harness({ navigatorObject: { storage: { estimate: () => quota.promise } } });
  const starting = h.controller.start();
  h.controller.cancel();
  quota.resolve({ usage: 1, quota: 10000000 });
  await starting;
  expect(h.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  await h.controller.dispose();
});
