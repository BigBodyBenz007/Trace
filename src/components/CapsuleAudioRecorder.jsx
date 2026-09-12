import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import {
  createCapsuleAudioRecorder,
  getCapsuleAudioRecordingSupport,
  MAX_CAPSULE_RECORDING_DURATION_MS,
} from "../services/capsuleAudioRecorder";
import { CAPSULE_MEDIA_POLICY } from "../services/capsuleMedia";
import { useStoredPhoto } from "./StoredPhoto";
import "./CapsuleAudioRecorder.css";

const ACTIVE_STATES = new Set(["requesting", "recording", "stopping", "validating"]);
const INITIAL_STATE = { status: "idle", elapsedMs: 0, error: null, stopReason: "" };

function elapsedTime(milliseconds) {
  const seconds = Math.max(0, Math.floor((milliseconds || 0) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function operationError(result, fallback) {
  if (result === false || result?.error || result?.ok === false) {
    throw new Error(result?.error?.message || result?.error || fallback);
  }
  return result;
}

function TakeConfirmation({ again, busy, onCancel, onConfirm }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector("button")?.focus();
    return () => { if (previous?.isConnected) previous.focus?.({ preventScroll: true }); };
  }, []);
  return <div className="trace-capsule-overlay">
    <section className="trace-capsule-overlay__dialog trace-capsule-recorder__confirmation" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialogRef}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy) { event.preventDefault(); onCancel(); }
        if (event.key !== "Tab") return;
        const buttons = [...dialogRef.current.querySelectorAll("button:not(:disabled)")];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <h2 id={titleId}>{again ? "Replace this recording?" : "Discard this recording?"}</h2>
      <p>{again ? "This take will be discarded before you record a new one." : "This take will be removed from your draft."} Your other attachments and message will stay saved.</p>
      <div className="trace-capsule-recorder__actions">
        <button type="button" disabled={busy} onClick={onCancel}>Cancel</button>
        <button type="button" disabled={busy} onClick={onConfirm}>{again ? "Discard and record again" : "Confirm discard recording"}</button>
      </div>
    </section>
  </div>;
}

const CapsuleAudioRecorder = forwardRef(function CapsuleAudioRecorder({
  pendingRecording = null,
  retryTake = null,
  mediaLoader,
  onPersistTake,
  onKeepTake,
  onDiscardTake,
  onActivityChange,
  stopPlayback,
  registerPlayback,
  unregisterPlayback,
  lifecycleAdapter,
  maxBytes = CAPSULE_MEDIA_POLICY.maxAudioBytes,
  disabledReason = "",
  disabled = false,
}, forwardedRef) {
  const [support] = useState(getCapsuleAudioRecordingSupport);
  const [recorderState, setRecorderState] = useState(INITIAL_STATE);
  const [localTake, setLocalTake] = useState(null);
  const [savedTake, setSavedTake] = useState(null);
  const [localUrl, setLocalUrl] = useState("");
  const [operation, setOperation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [playbackError, setPlaybackError] = useState(false);
  const mountedRef = useRef(true);
  const controllerRef = useRef(null);
  const takeRef = useRef(null);
  const operationRef = useRef(false);
  const mutationRef = useRef(false);
  const persistenceRef = useRef(null);
  const audioRef = useRef(null);
  const sequenceRef = useRef(0);
  const currentProps = useRef(null);
  currentProps.current = { pendingRecording, onPersistTake, onKeepTake, onDiscardTake, onActivityChange, stopPlayback, lifecycleAdapter, maxBytes, disabledReason, disabled };
  const headingId = useId();
  const limitId = useId();
  const durableTake = pendingRecording || savedTake;
  const loaded = useStoredPhoto(durableTake, { loader: mediaLoader });
  const previewUrl = localUrl || (loaded.id === durableTake?.id ? loaded.url : "");
  const active = ACTIVE_STATES.has(recorderState.status);
  const unresolved = active || Boolean(localTake || durableTake || operation);

  const pausePreview = useCallback(() => {
    try { audioRef.current?.pause?.(); } catch (_) { /* A detached preview may already be gone. */ }
  }, []);

  const retainPreview = useCallback((element) => {
    if (audioRef.current && audioRef.current !== element) {
      pausePreview();
      unregisterPlayback?.(audioRef.current);
    }
    audioRef.current = element;
    if (element) registerPlayback?.(element);
  }, [pausePreview, registerPlayback, unregisterPlayback]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pausePreview();
      // Finalization still calls onPersistTake after navigation. It must finish
      // against the original draft, even though UI updates are now suppressed.
      controllerRef.current?.dispose();
    };
  }, [pausePreview]);

  useEffect(() => { onActivityChange?.(unresolved); }, [onActivityChange, unresolved]);

  useEffect(() => {
    // A prior editor instance can finish persisting after this one restored
    // the App's session-only take. Reconcile that same take with its saved ref.
    if (pendingRecording?.id && takeRef.current?.id === pendingRecording.id) {
      takeRef.current = null;
      setLocalTake(null);
      setError("");
      setMessage("Recording saved in this draft for review. Keep it or discard it before sealing.");
      return;
    }
    if (!retryTake?.file || pendingRecording || takeRef.current) return;
    takeRef.current = retryTake;
    setLocalTake(retryTake);
    setError("This recording has not been saved yet and is only available in this session. Retry saving before leaving.");
  }, [retryTake, pendingRecording]);

  useEffect(() => {
    if (!localTake?.file || typeof URL.createObjectURL !== "function") { setLocalUrl(""); return undefined; }
    const url = URL.createObjectURL(localTake.file);
    setLocalUrl(url);
    return () => {
      pausePreview();
      URL.revokeObjectURL(url);
    };
  }, [localTake, pausePreview]);

  useEffect(() => { setPlaybackError(false); }, [previewUrl]);

  function updateState(next, token) {
    if (mountedRef.current && token === sequenceRef.current) {
      // Backgrounding can invalidate a pending permission request long before
      // the browser answers it. Permit a fresh gesture after cancellation.
      if (["idle", "error"].includes(next.status) && !mutationRef.current) operationRef.current = false;
      setRecorderState(next);
    }
  }

  async function persistTake(take, persist = currentProps.current.onPersistTake) {
    if (persistenceRef.current) return persistenceRef.current;
    if (!take?.file) return false;
    const pending = (async () => {
      if (mountedRef.current) { setOperation("saving"); setError(""); }
      try {
        if (!persist) throw new Error("Recording storage is unavailable.");
        const result = operationError(await persist(take.file, { durationMs: take.durationMs, stopReason: take.stopReason }), "Trace could not save this recording.");
        if (!result?.pendingRecording) throw new Error("Trace could not confirm that this recording was saved.");
        if (takeRef.current === take) takeRef.current = null;
        if (mountedRef.current) {
          setSavedTake(result.pendingRecording);
          setLocalTake(null);
          setMessage("Recording saved in this draft for review. Keep it or discard it before sealing.");
        }
        return true;
      } catch (failure) {
        if (mountedRef.current) setError(`${failure?.message || "Trace could not save this recording."} This take is only available in this session. Retry saving before leaving.`);
        return false;
      } finally {
        if (mountedRef.current) setOperation("");
      }
    })();
    persistenceRef.current = pending;
    try { return await pending; } finally { if (persistenceRef.current === pending) persistenceRef.current = null; }
  }

  async function beginRecording({ replacing = false } = {}) {
    const props = currentProps.current;
    if (operationRef.current || ACTIVE_STATES.has(controllerRef.current?.getState().status) || (!replacing && (props.pendingRecording || savedTake || takeRef.current))) return;
    if (!support.supported || props.disabled || props.disabledReason || !(props.maxBytes > 0)) return;
    operationRef.current = true;
    pausePreview();
    setError(""); setMessage(""); setSavedTake(null); setLocalTake(null);
    controllerRef.current?.dispose();
    const token = ++sequenceRef.current;
    // Capture this draft's writer. A later draft must never receive a late take.
    const persist = props.onPersistTake;
    const controller = createCapsuleAudioRecorder({
      maxBytes: props.maxBytes,
      stopPlayback: props.stopPlayback,
      ...(props.lifecycleAdapter ? { lifecycleAdapter: props.lifecycleAdapter } : {}),
      onState: (state) => updateState(state, token),
      onComplete: async (take) => {
        if (token !== sequenceRef.current) return;
        takeRef.current = take;
        if (mountedRef.current) setLocalTake(take);
        await persistTake(take, persist);
      },
    });
    controllerRef.current = controller;
    setRecorderState({ ...INITIAL_STATE, status: "requesting" });
    try { await controller.start(); }
    catch (failure) { if (mountedRef.current && token === sequenceRef.current) setError(failure?.message || "Trace could not start recording. Try again or choose an audio file."); }
    finally { if (token === sequenceRef.current) operationRef.current = false; }
  }

  async function finishAndPersist() {
    // A keep/discard writer can already have updated the durable draft while
    // its result has not reached the editor. Do not save stale attachment refs.
    if (mutationRef.current) return false;
    await controllerRef.current?.stop("navigation");
    if (persistenceRef.current) await persistenceRef.current;
    return !takeRef.current && !mutationRef.current;
  }

  useImperativeHandle(forwardedRef, () => ({ finishAndPersist }));

  async function stopRecording() {
    if (!controllerRef.current || !["recording", "requesting"].includes(controllerRef.current.getState().status)) return;
    pausePreview();
    await controllerRef.current.stop("user");
  }

  function cancelRequest() {
    controllerRef.current?.cancel();
    sequenceRef.current += 1;
    operationRef.current = false;
    setRecorderState(INITIAL_STATE);
  }

  async function keepTake() {
    if (operationRef.current || persistenceRef.current || takeRef.current || !durableTake) return;
    operationRef.current = true;
    mutationRef.current = true;
    setOperation("keeping"); setError(""); pausePreview();
    try {
      if (!currentProps.current.onKeepTake) throw new Error("Recording storage is unavailable.");
      operationError(await currentProps.current.onKeepTake(), "Trace could not keep this recording.");
      if (mountedRef.current) {
        setSavedTake(null); setRecorderState(INITIAL_STATE);
        setMessage("Recording added to your capsule attachments.");
      }
    } catch (failure) {
      if (mountedRef.current) setError(failure?.message || "Trace could not keep this recording. Your take is still saved for review.");
    } finally {
      mutationRef.current = false;
      operationRef.current = false;
      if (mountedRef.current) setOperation("");
    }
  }

  async function removeTake() {
    if (operationRef.current || persistenceRef.current) return;
    const again = confirmation === "again";
    operationRef.current = true;
    mutationRef.current = true;
    setOperation("discarding"); setError(""); pausePreview();
    let removed = false;
    try {
      if (!currentProps.current.onDiscardTake) throw new Error("Recording storage is unavailable.");
      operationError(await currentProps.current.onDiscardTake(), "Trace could not discard this recording.");
      takeRef.current = null;
      controllerRef.current?.cancel();
      sequenceRef.current += 1;
      removed = true;
      if (mountedRef.current) {
        setLocalTake(null); setSavedTake(null); setConfirmation(null); setRecorderState(INITIAL_STATE);
        setMessage(again ? "" : "Recording discarded.");
      }
    } catch (failure) {
      if (mountedRef.current) { setConfirmation(null); setError(failure?.message || "Trace could not discard this recording. Your take is still saved."); }
    } finally {
      mutationRef.current = false;
      operationRef.current = false;
      if (mountedRef.current) setOperation("");
    }
    if (again && removed && mountedRef.current) await beginRecording({ replacing: true });
  }

  const shownError = error || recorderState.error?.message;
  const stopMessage = {
    "time-limit": "Recording stopped at the five-minute limit.",
    "size-limit": "Recording stopped at the available size limit.",
    background: "Recording stopped when Trace went into the background.",
    navigation: "Recording stopped when you left the editor.",
    "editor-exit": "Recording stopped when you left the editor.",
    "microphone-interrupted": "The microphone was interrupted. Review the audio that was captured.",
    "track-ended": "The microphone disconnected. Review the audio that was captured.",
  }[recorderState.stopReason];
  const sizeLimit = Math.min(CAPSULE_MEDIA_POLICY.maxAudioBytes, Math.max(0, maxBytes), recorderState.maxBytes ?? maxBytes);

  return <section className="trace-capsule-recorder" aria-labelledby={headingId}>
    <h3 id={headingId}>Record a voice message</h3>
    <p id={limitId} className="trace-capsule-recorder__hint">Up to {MAX_CAPSULE_RECORDING_DURATION_MS / 60000} minutes, or {Number((sizeLimit / 1024 / 1024).toFixed(1))} MiB of available space, whichever comes first. Available device storage may reduce this limit. Recording stops automatically at the limit.</p>
    <p className="trace-capsule-recorder__hint">When you leave or lock your screen, Trace tries to stop and save the take. Unfinished audio may be lost if your device closes Trace abruptly.</p>
    {!support.supported && <p>{support.error?.message || support.error || "Audio recording is unavailable in this browser. Try an updated browser with microphone support, or choose an audio file below."}</p>}
    {disabledReason && !durableTake && !localTake && <p>{disabledReason}</p>}
    {!active && !durableTake && !localTake && <button type="button" aria-describedby={limitId} disabled={disabled || !support.supported || Boolean(disabledReason) || sizeLimit <= 0 || Boolean(operation)} onClick={() => beginRecording()}>Record audio</button>}
    {recorderState.status === "requesting" && <div className="trace-capsule-recorder__actions"><p role="status">Allow microphone access to record your message.</p><button type="button" onClick={cancelRequest}>Cancel microphone request</button></div>}
    {recorderState.status === "recording" && <div className="trace-capsule-recorder__actions">
      <p className="trace-capsule-recorder__recording"><span className="trace-capsule-recorder__dot" aria-hidden="true" /><strong role="status">Recording</strong> <span role="timer" aria-label="Recording elapsed time">{elapsedTime(recorderState.elapsedMs)}</span></p>
      <button type="button" onClick={stopRecording}>Stop</button>
    </div>}
    {["stopping", "validating"].includes(recorderState.status) && <p role="status">{recorderState.status === "validating" ? "Checking your recording…" : "Finishing your recording…"}</p>}
    {(durableTake || localTake) && <div className="trace-capsule-recorder__take">
      <h4>Review your recording</h4>
      {previewUrl ? <audio aria-label="Preview your recording" ref={retainPreview} controls preload="metadata" src={previewUrl} onError={() => setPlaybackError(true)} /> : <p role="status">{loaded.unavailable ? "This saved recording could not be loaded. Your take is still in the draft." : "Loading recording…"}</p>}
      {playbackError && <p role="alert">This browser could not play the recording. Try opening Trace in a browser that supports this audio format.</p>}
      {stopMessage && <p>{stopMessage}</p>}
      {operation === "saving" && <p role="status">Saving your recording before you leave…</p>}
      {!localTake && durableTake && !message && <p>Saved recording restored for review. Keep it or discard it before sealing.</p>}
      <div className="trace-capsule-recorder__actions">
        {localTake && !operation && <button type="button" disabled={disabled} onClick={() => persistTake(takeRef.current)}>Retry saving recording</button>}
        <button type="button" disabled={disabled || Boolean(localTake || operation || active)} onClick={keepTake}>Keep recording</button>
        <button type="button" disabled={disabled || Boolean(operation || active) || !support.supported} onClick={() => setConfirmation("again")}>Record again</button>
        <button type="button" disabled={disabled || Boolean(operation || active)} onClick={() => setConfirmation("discard")}>Discard recording</button>
      </div>
    </div>}
    {shownError && <p role="alert">{shownError}</p>}
    {message && <p role="status">{message}</p>}
    {confirmation && <TakeConfirmation again={confirmation === "again"} busy={Boolean(operation)} onCancel={() => setConfirmation(null)} onConfirm={removeTake} />}
  </section>;
});

export default CapsuleAudioRecorder;
