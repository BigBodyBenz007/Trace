/* global globalThis */
import { CAPSULE_MEDIA_POLICY, CapsuleMediaError, prepareCapsuleMediaFiles } from "./capsuleMedia";
import { APP_LIFECYCLE_PHASE, webAppLifecycleAdapter } from "./appLifecycleAdapter";
import { PHOTO_STORAGE_SAFETY_POLICY } from "./photoStorageSafety";

export const MAX_CAPSULE_RECORDING_DURATION_MS = 5 * 60 * 1000;
const RECORDING_BIT_RATE = 64000;
const MIME_CANDIDATES = [
  "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus",
  "audio/webm", "audio/ogg;codecs=opus", "audio/ogg",
];
const EXTENSIONS = { "audio/mp4": "m4a", "audio/webm": "weba", "audio/ogg": "ogg", "audio/aac": "aac", "audio/wav": "wav", "audio/mpeg": "mp3" };

function environment(options) {
  return {
    mediaDevices: options.mediaDevices === undefined ? globalThis.navigator?.mediaDevices : options.mediaDevices,
    MediaRecorderClass: options.MediaRecorderClass === undefined ? globalThis.MediaRecorder : options.MediaRecorderClass,
    documentObject: options.documentObject === undefined ? globalThis.document : options.documentObject,
  };
}

function error(message, code) {
  return new CapsuleMediaError(message, code);
}

export function getCapsuleAudioRecordingSupport(options = {}) {
  const { mediaDevices, MediaRecorderClass, documentObject } = environment(options);
  const unsupported = () => ({ supported: false, mimeType: "", error: error(
    "Audio recording is not available in this browser. Try a current browser over HTTPS, or choose an audio file.", "recording-unsupported"
  ) });
  if (typeof mediaDevices?.getUserMedia !== "function" || typeof MediaRecorderClass !== "function" || typeof MediaRecorderClass.isTypeSupported !== "function") return unsupported();
  const audio = documentObject?.createElement?.("audio");
  const mimeType = MIME_CANDIDATES.find((candidate) => {
    try {
      return MediaRecorderClass.isTypeSupported(candidate) && (!audio?.canPlayType || Boolean(audio.canPlayType(candidate)));
    } catch (failure) {
      return false;
    }
  });
  return mimeType ? { supported: true, mimeType, error: null } : unsupported();
}

function microphoneError(failure) {
  if (failure?.code?.startsWith?.("recording-")) return failure;
  if (["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(failure?.name)) {
    return error("Microphone access was denied or dismissed. Allow microphone access in your browser's site settings, then try again, or choose an audio file.", "recording-permission");
  }
  if (["NotFoundError", "DevicesNotFoundError", "OverconstrainedError"].includes(failure?.name)) {
    return error("No microphone is available. Connect or enable a microphone, then try again, or choose an audio file.", "recording-no-microphone");
  }
  if (["NotReadableError", "TrackStartError", "AbortError"].includes(failure?.name)) {
    return error("Trace could not use the microphone. Close other apps using it and try again, or choose an audio file.", "recording-hardware");
  }
  return error("The recording could not be completed. Your other draft content is safe. Try again or choose an audio file.", "recording-failed");
}

export async function estimateCapsuleAudioRecordingMaxBytes(maxBytes, {
  navigatorObject = globalThis.navigator,
} = {}) {
  try {
    const estimate = await navigatorObject?.storage?.estimate?.();
    const usage = Number(estimate?.usage);
    const quota = Number(estimate?.quota);
    if (!Number.isFinite(usage) || usage < 0 || !Number.isFinite(quota) || quota < usage) return maxBytes;
    const { minimumFreeAfterWriteBytes, writeOverheadMultiplier } = PHOTO_STORAGE_SAFETY_POLICY;
    return Math.max(0, Math.min(maxBytes, Math.floor((quota - usage - minimumFreeAfterWriteBytes) / writeOverheadMultiplier)));
  } catch (failure) {
    // Browsers may withhold quota estimates. The normal transactional media
    // writer still checks quota and keeps failed persistence retryable.
    return maxBytes;
  }
}

function readArrayBuffer(file) {
  if (file.arrayBuffer) return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// Decode the completed container, never an individual timeslice. Metadata alone
// does not establish that a recording contains a usable audio track.
export async function validateCapsuleAudioRecording(file, options = {}) {
  const AudioContextClass = options.AudioContextClass === undefined
    ? globalThis.AudioContext || globalThis.webkitAudioContext : options.AudioContextClass;
  if (!AudioContextClass) throw error("This browser cannot validate the recording. Try a current browser or choose an audio file.", "recording-playback-unsupported");
  let context;
  let timeout;
  let validationEnded = false;
  try {
    const decoded = await Promise.race([
      (async () => {
        const data = await readArrayBuffer(file);
        if (validationEnded) return null;
        context = new AudioContextClass();
        return new Promise((resolve, reject) => {
          const result = context.decodeAudioData(data, resolve, reject);
          result?.then?.(resolve, reject);
        });
      })(),
      new Promise((resolve, reject) => {
        timeout = setTimeout(() => reject(error("This recording took too long to validate. Try recording again.", "recording-validation-timeout")), options.timeoutMs || CAPSULE_MEDIA_POLICY.validationTimeoutMs);
      }),
    ]);
    if (!decoded?.numberOfChannels || !decoded.length || !Number.isFinite(decoded.duration) || decoded.duration <= 0) {
      throw error("No usable audio was recorded. Check your microphone and record again.", "recording-empty");
    }
    const durationMs = Math.round(decoded.duration * 1000);
    // A codec may include a final partial frame. Longer resumed recordings must
    // not silently bypass the five-minute limit if OS suspension delayed timers.
    if (durationMs > (options.maxDurationMs || MAX_CAPSULE_RECORDING_DURATION_MS) + 1000) {
      throw error("This recording ran past the five-minute limit while the app was interrupted. Please record a shorter take.", "recording-duration-limit");
    }
    return { durationMs };
  } catch (failure) {
    if (failure instanceof CapsuleMediaError) throw failure;
    throw error("This browser could not decode the recorded audio. Try recording again or choose an audio file.", "recording-unreadable");
  } finally {
    validationEnded = true;
    clearTimeout(timeout);
    try { await context?.close?.(); } catch (failure) { /* Already closed during suspension. */ }
  }
}

function stopTracks(stream) {
  stream?.getTracks?.().forEach((track) => {
    try { track.stop(); } catch (failure) { /* Release every remaining track. */ }
  });
}

/** A single editor's recorder. Durable pending-take ownership belongs to the draft. */
export function createCapsuleAudioRecorder(options = {}) {
  const env = environment(options);
  const maxDurationMs = Math.min(options.maxDurationMs || MAX_CAPSULE_RECORDING_DURATION_MS, MAX_CAPSULE_RECORDING_DURATION_MS);
  const maxBytes = Math.max(0, Math.min(options.maxBytes ?? CAPSULE_MEDIA_POLICY.maxAudioBytes, CAPSULE_MEDIA_POLICY.maxAudioBytes));
  const now = options.now || Date.now;
  let state = { status: "idle", elapsedMs: 0, stopReason: null, error: null };
  let session = null;
  let sequence = 0;
  let disposed = false;

  function update(patch) {
    state = { ...state, ...patch };
    if (!disposed) options.onState?.(state);
  }

  function release(take) {
    clearInterval(take.tick);
    clearTimeout(take.deadline);
    take.detachTracks?.forEach((detach) => detach());
    take.detachTracks = [];
    stopTracks(take.stream);
    take.stream = null;
  }

  function settle(take, result = null) {
    clearTimeout(take.stopTimeout);
    take.chunks = [];
    take.resolve(result);
  }

  function fail(take, failure) {
    if (take.finished || take.id !== sequence) return;
    take.finished = true;
    release(take);
    try { if (take.recorder?.state !== "inactive") take.recorder?.stop(); } catch (ignored) { /* Tracks are already released. */ }
    update({ status: "error", error: failure instanceof CapsuleMediaError ? failure : microphoneError(failure) });
    settle(take);
  }

  async function finish(take) {
    if (take.finished || take.finalizing || take.id !== sequence) return;
    take.finalizing = true;
    release(take);
    clearTimeout(take.stopTimeout);
    update({ status: "validating" });
    try {
      if (!take.bytes) throw error("No audio was recorded. Record for a little longer and try again.", "recording-empty");
      const actualMime = String(take.chunkMime || take.recorder.mimeType || take.mimeType).split(";")[0].trim().toLowerCase();
      const extension = EXTENSIONS[actualMime];
      if (!extension) throw error("This browser produced an unsupported recording format. Choose an audio file instead.", "recording-playback-unsupported");
      const file = new File(take.chunks, `Voice message ${new Date(now()).toISOString().replace(/[:.]/g, "-")}.${extension}`, { type: actualMime });
      take.chunks = [];
      const probe = options.validateRecording || ((candidate) => validateCapsuleAudioRecording(candidate, { maxDurationMs }));
      const [prepared] = await prepareCapsuleMediaFiles([file], [], { probe });
      if (take.id !== sequence || take.finished) return;
      const result = { file, durationMs: prepared.durationMs, stopReason: state.stopReason || "user" };
      await options.onComplete?.(result);
      if (take.id !== sequence || take.finished) return;
      take.finished = true;
      update({ status: "ready", error: null });
      settle(take, result);
    } catch (failure) {
      fail(take, failure);
    }
  }

  function stop(reason = "user") {
    const take = session;
    if (!take || take.finished) return Promise.resolve(null);
    if (take.stopping || take.finalizing) return take.completion;
    take.stopping = true;
    update({ status: "stopping", stopReason: reason, elapsedMs: take.startedAt === undefined ? 0 : Math.min(maxDurationMs, Math.max(0, now() - take.startedAt)) });
    if (!take.recorder) {
      // Permission can resolve after navigation. Its eventual stream is released
      // by the stale-request guard in start().
      take.finished = true;
      sequence += 1;
      release(take);
      update({ status: "idle" });
      settle(take);
      return take.completion;
    }
    try {
      if (take.recorder.state !== "inactive") take.recorder.stop();
      else finish(take);
      release(take);
      if (!take.finalizing && !take.finished) {
        take.stopTimeout = setTimeout(() => fail(take, error("The browser did not finish the recording. Please try again.", "recording-stop-timeout")), CAPSULE_MEDIA_POLICY.validationTimeoutMs);
      }
    } catch (failure) {
      fail(take, failure);
    }
    return take.completion;
  }

  function cancel() {
    const take = session;
    sequence += 1;
    if (take) {
      take.finished = true;
      release(take);
      try { if (take.recorder?.state !== "inactive") take.recorder?.stop(); } catch (failure) { /* Tracks are already released. */ }
      settle(take);
    }
    session = null;
    update({ status: "idle", elapsedMs: 0, stopReason: null, error: null });
  }

  async function start() {
    if (disposed || (session && !session.finished)) return false;
    const support = getCapsuleAudioRecordingSupport(env);
    if (!support.supported) { update({ status: "error", error: support.error }); return false; }
    if (!maxBytes) { update({ status: "error", error: error("There is no room for another recording in this capsule. Remove an attachment first.", "recording-size-limit") }); return false; }
    const take = { id: ++sequence, chunks: [], bytes: 0, mimeType: support.mimeType, finished: false };
    take.completion = new Promise((resolve) => { take.resolve = resolve; });
    session = take;
    update({ status: "requesting", elapsedMs: 0, stopReason: null, error: null });
    try {
      options.stopPlayback?.();
      take.maxBytes = await estimateCapsuleAudioRecordingMaxBytes(maxBytes, {
        navigatorObject: options.navigatorObject === undefined ? globalThis.navigator : options.navigatorObject,
      });
      if (take.id !== sequence || take.finished || disposed) return false;
      if (!take.maxBytes) throw error("There is not enough available browser storage to record audio. Free some device or browser storage, then try again. Your draft is safe.", "recording-storage-limit");
      update({ maxBytes: take.maxBytes });
      const stream = await env.mediaDevices.getUserMedia({ audio: true, video: false });
      if (take.id !== sequence || take.finished || disposed) { stopTracks(stream); return false; }
      take.stream = stream;
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length || audioTracks.every((track) => track.readyState === "ended")) {
        throw error("The microphone disconnected before recording began. Reconnect it and try again.", "recording-no-microphone");
      }
      take.recorder = new env.MediaRecorderClass(stream, { mimeType: take.mimeType, audioBitsPerSecond: RECORDING_BIT_RATE });
      take.recorder.ondataavailable = ({ data }) => {
        if (take.id !== sequence || take.finished || take.finalizing || !data?.size) return;
        if (take.bytes + data.size > take.maxBytes) {
          fail(take, error("The recording reached the available file-size limit. Please record a shorter take or remove another attachment.", "recording-size-limit"));
          return;
        }
        take.bytes += data.size;
        if (data.type) take.chunkMime = data.type;
        take.chunks.push(data);
        // Reserve space for final container data; never truncate encoded chunks.
        const headroom = Math.min(32768, Math.floor(take.maxBytes / 10));
        if (!take.stopping && take.bytes >= take.maxBytes - headroom) stop("size-limit");
      };
      take.recorder.onstop = () => finish(take);
      take.recorder.onerror = (event) => fail(take, event?.error);
      take.detachTracks = audioTracks.flatMap((track) => ["ended", "mute"].map((type) => {
        const listener = () => stop("microphone-interrupted");
        track.addEventListener?.(type, listener);
        return () => track.removeEventListener?.(type, listener);
      }));
      take.recorder.start(1000);
      take.startedAt = now();
      update({ status: "recording" });
      take.tick = setInterval(() => {
        if (take.id !== sequence || take.stopping || take.finished) return;
        const elapsedMs = Math.max(0, now() - take.startedAt);
        update({ elapsedMs: Math.min(maxDurationMs, elapsedMs) });
        if (elapsedMs >= maxDurationMs) stop("time-limit");
      }, 250);
      take.deadline = setTimeout(() => stop("time-limit"), maxDurationMs);
      return true;
    } catch (failure) {
      fail(take, failure);
      return false;
    }
  }

  const unsubscribe = (options.lifecycleAdapter || webAppLifecycleAdapter).subscribe(({ phase }) => {
    if ([APP_LIFECYCLE_PHASE.BACKGROUND, APP_LIFECYCLE_PHASE.SUSPENDING].includes(phase)) stop("background");
  });

  function dispose() {
    if (disposed) return session?.completion || Promise.resolve(null);
    disposed = true;
    unsubscribe?.();
    return stop("editor-exit");
  }

  return Object.freeze({ start, stop, cancel, dispose, getState: () => state });
}
