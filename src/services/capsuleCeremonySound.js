import { CAPSULE_PRESENTATION } from "./capsulePresentation";

let sharedContext = null;
const PREPARATION_LIMIT_MS = 4000;
const defaultWindow = () => typeof window === "undefined" ? null : window;

function getContext(windowObject) {
  if (sharedContext && sharedContext.state !== "closed") return sharedContext;
  const Context = windowObject?.AudioContext || windowObject?.webkitAudioContext;
  if (!Context) return null;
  try { sharedContext = new Context(); return sharedContext; } catch { return null; }
}

function resume(context) {
  if (!context) return Promise.resolve(false);
  if (context.state === "running") return Promise.resolve(true);
  try { return Promise.resolve(context.resume()).then(() => context.state === "running").catch(() => false); }
  catch { return Promise.resolve(false); }
}

// Call directly from Open or the final in-app Seal confirmation, before awaiting
// persistence. Safari permissions belong to the media element, not just its
// AudioContext. This exact element and embedded audio track are used afterwards.
export function prepareCapsuleCeremony(kind, { sounds = true, volume = 0.65, reducedMotion = false } = {}, windowObject = defaultWindow()) {
  const presentation = CAPSULE_PRESENTATION[kind];
  const documentObject = windowObject?.document;
  if (reducedMotion || !presentation || !documentObject) return null;
  const level = typeof volume === "number" && Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.65;
  const enabled = sounds !== false && level > 0;
  const video = documentObject.createElement("video");
  video.className = "trace-capsule-film__video";
  video.src = presentation.src;
  video.poster = presentation.poster;
  video.preload = "auto";
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("aria-hidden", "true");
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
  video.tabIndex = -1;
  video.muted = true;

  const context = enabled ? getContext(windowObject) : null;
  let source;
  let gain;
  let safeGain = false;
  try {
    if (context?.createGain && context?.createMediaElementSource) {
      gain = context.createGain();
      // Silence is established BEFORE connecting the route or calling play.
      // No success audio can escape while the durable write is still pending.
      gain.gain.value = 0;
      source = context.createMediaElementSource(video);
      source.connect(gain);
      gain.connect(context.destination);
      safeGain = true;
    }
  } catch {
    try { source?.disconnect(); gain?.disconnect(); } catch {}
  }

  let disposed = false;
  let phase = "preparing";
  let generation = 0;
  let startLease = null;
  let preparationSettled = false;
  let preparationTimer;
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  const silence = () => {
    if (gain) gain.gain.value = 0;
    video.muted = true;
    try { video.pause(); } catch {}
  };
  const rewind = () => { try { video.currentTime = 0; } catch {} };
  const finishPreparation = () => {
    if (preparationSettled) return;
    preparationSettled = true;
    clearTimeout(preparationTimer);
    if (!disposed) {
      // Keep an unmuted, zero-gain route blessed by the original gesture. A
      // later unmute is unnecessary when the prepared context is running.
      try { video.pause(); } catch {}
      rewind();
      phase = "ready";
    }
    resolveReady({ audioReady: !disposed && safeGain && context.state === "running" });
  };

  // Both resume and play are initiated synchronously in the user's handler.
  // Without a safe gain node, only muted priming is permitted (iOS may ignore
  // native volume). Never depend on volume=0 to silence pre-persistence media.
  const resumed = resume(context);
  video.muted = !(enabled && safeGain);
  let prime;
  try { prime = Promise.resolve(video.play()); }
  catch { prime = Promise.resolve(); }
  const primed = prime.then(() => {
    if (!preparationSettled || disposed || phase === "ready" || phase === "stopped") {
      try { video.pause(); } catch {}
      rewind();
    }
  }).catch(() => {});
  preparationTimer = setTimeout(finishPreparation, PREPARATION_LIMIT_MS);
  Promise.all([resumed, primed]).then(finishPreparation);

  const controller = {
    video,
    ready,
    get phase() { return phase; },
    start() {
      if (disposed) return Promise.resolve({ cancelled: true });
      if (startLease) return startLease.promise;
      const lease = { generation: ++generation, promise: null };
      startLease = lease;
      const current = () => !disposed && generation === lease.generation;
      lease.promise = (async () => {
        await ready;
        if (!current()) return { cancelled: true };
        rewind();
        video.playbackRate = 1;
        let blocked = enabled && Boolean(source) && (!safeGain || context.state !== "running");
        if (gain) gain.gain.value = enabled && !blocked ? level : 0;
        // iOS uses the gain node for app volume. Do not force media.volume=1
        // or touch system volume; native fallback uses the requested level.
        if (!safeGain) { try { video.volume = level; } catch {} }
        video.muted = !enabled || blocked;
        phase = "starting";
        try {
          await video.play();
        } catch (error) {
          if (!current()) return { cancelled: true };
          if (error?.name !== "NotAllowedError" || video.muted) throw error;
          blocked = true;
          if (gain) gain.gain.value = 0;
          video.muted = true;
          await video.play();
        }
        if (!current()) {
          // Never pause a newer lease that now owns this same element.
          if (disposed || !startLease) silence();
          return { cancelled: true };
        }
        phase = "playing";
        return { blocked };
      })();
      return lease.promise;
    },
    stop() {
      generation += 1;
      startLease = null;
      // StrictMode may release its first effect before success playback starts.
      // Zero-gain priming can finish safely and be reused by the next effect.
      if (!preparationSettled && !disposed) return;
      silence();
      if (!disposed) phase = "stopped";
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.stop();
      phase = "disposed";
      silence();
      finishPreparation();
      try { source?.disconnect(); } catch {}
      try { gain?.disconnect(); } catch {}
      video.remove();
    },
  };
  return controller;
}

export function resetCapsuleCeremonyAudioForTests() { sharedContext = null; }
