// Approved recordings contain their own synchronized audio track. This module
// only unlocks browser audio and applies volume; it never generates sounds.
let sharedContext = null;
let mediaRoutes = new WeakMap();

function audioContext(windowObject) {
  if (sharedContext && sharedContext.state !== "closed") return sharedContext;
  const Context = windowObject?.AudioContext || windowObject?.webkitAudioContext;
  if (!Context) return null;
  try { sharedContext = new Context(); return sharedContext; }
  catch { return null; }
}

function resume(context) {
  if (!context) return Promise.resolve(true);
  if (context.state === "running") return Promise.resolve(true);
  try { return Promise.resolve(context.resume()).then(() => context.state === "running").catch(() => false); }
  catch { return Promise.resolve(false); }
}

// Called in the original Open/Seal gesture before awaiting the durable write.
// Resuming a context does not play the success ceremony early.
export function prepareCapsuleCeremonyAudio(enabled = true, windowObject = typeof window === "undefined" ? null : window) {
  if (!enabled) return null;
  const context = audioContext(windowObject);
  return context ? { context, ready: resume(context) } : null;
}

export function attachCapsuleCeremonyAudio(media, prepared) {
  let route = mediaRoutes.get(media);
  const context = route?.context || prepared?.context;
  if (!route && context?.createMediaElementSource && context?.createGain) {
    let source;
    let gain;
    try {
      // A media element can only have one source node, including StrictMode's
      // effect cleanup/remount. Retain that node and reconnect it on reuse.
      gain = context.createGain();
      source = context.createMediaElementSource(media);
      route = { context, source, gain, owner: null };
      mediaRoutes.set(media, route);
    } catch {
      try { source?.disconnect(); gain?.disconnect(); } catch {}
    }
  }
  const owner = Symbol("capsule audio owner");
  let stopped = false;
  let connected = true;
  if (route) {
    route.owner = owner;
    try {
      route.source.connect(route.gain);
      route.gain.connect(route.context.destination);
    } catch {
      connected = false;
      route.gain.gain.value = 0;
      try { route.source.disconnect(); route.gain.disconnect(); } catch {}
    }
  }
  return {
    isReady: () => connected && (!route || route.context.state === "running"),
    resumeFromGesture: () => connected ? resume(route?.context) : Promise.resolve(false),
    setVolume(value) {
      if (stopped) return;
      const volume = Math.min(1, Math.max(0, Number(value) || 0));
      if (route) {
        media.volume = 1;
        route.gain.gain.value = volume;
      } else media.volume = volume;
    },
    stop() {
      if (stopped) return;
      stopped = true;
      if (route && route.owner === owner) {
        route.gain.gain.value = 0;
        try { route.source.disconnect(); } catch {}
        try { route.gain.disconnect(); } catch {}
        route.owner = null;
      }
    },
  };
}

export function resetCapsuleCeremonyAudioForTests() {
  sharedContext = null;
  mediaRoutes = new WeakMap();
}
