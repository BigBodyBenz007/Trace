import React, { useEffect, useRef, useState } from "react";
import { CAPSULE_PRESENTATION } from "../services/capsulePresentation";
import { prepareCapsuleCeremony } from "../services/capsuleCeremonySound";

const SETTLED_HOLD_MS = 800;
const STARTUP_LIMIT_MS = 12000;
const PROGRESS_LIMIT_MS = 6000;
const ABSOLUTE_LIMIT_MS = 30000;
const FALLBACK_HOLD_MS = 2500;

export default function TimeCapsuleCeremony({ kind, prepared, sounds = true, volume = 0.65, reducedMotion = false, onFinish }) {
  const presentation = CAPSULE_PRESENTATION[kind];
  const mediaHostRef = useRef(null);
  const skipRef = useRef(null);
  const finishRef = useRef(onFinish);
  const playbackRef = useRef(null);
  const optionsRef = useRef({ sounds, volume });
  const [fallback, setFallback] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [phase, setPhase] = useState("loading");
  finishRef.current = onFinish;
  optionsRef.current = { sounds, volume };

  useEffect(() => {
    // Production passes the exact element prepared by the original gesture.
    // The local fallback permits safe visuals if preparation was unavailable.
    let controller = prepared || null;
    if (!controller && !reducedMotion) {
      try { controller = prepareCapsuleCeremony(kind, optionsRef.current); }
      catch { /* The static endpoint below also covers failed media initialization. */ }
    }
    const video = controller?.video;
    let alive = true;
    let finished = false;
    let failed = false;
    let settled = false;
    let hasProgress = false;
    let lastPosition = 0;
    let lastProgressAt = Date.now();
    const mountedAt = Date.now();
    let monitor;
    let releaseTimer;
    let endGraceTimer;
    const current = () => alive && !finished && !failed;
    const clearTimers = () => {
      clearInterval(monitor);
      clearTimeout(releaseTimer);
      clearTimeout(endGraceTimer);
    };
    const finish = () => {
      if (!alive || finished) return;
      finished = true;
      clearTimers();
      controller?.stop();
      finishRef.current?.();
    };
    const fail = () => {
      if (!current() || settled) return;
      failed = true;
      clearTimers();
      controller?.stop();
      if (video) video.hidden = true;
      setFallback(true);
      setPhase("endpoint");
      setSoundBlocked(false);
      releaseTimer = setTimeout(finish, FALLBACK_HOLD_MS);
    };
    const settle = () => {
      if (!current() || settled) return;
      settled = true;
      clearTimers();
      setPhase("settled");
      // Preserve the last frame and allow the final audio output to drain.
      // Do not pause/mute/disconnect at duration-epsilon or immediately on ended.
      releaseTimer = setTimeout(finish, SETTLED_HOLD_MS);
    };
    const successPlayback = () => ["starting", "playing"].includes(controller?.phase);
    const ended = () => {
      if (!successPlayback()) return;
      if (Number.isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration) return;
      settle();
    };
    const observe = () => {
      if (!current() || settled || !video) return;
      const now = Date.now();
      if (successPlayback()) {
        if (video.currentTime > lastPosition) {
          hasProgress = true;
          lastPosition = video.currentTime;
          lastProgressAt = now;
          setPhase("playing");
        }
        if (video.ended) { settle(); return; }
        if (Number.isFinite(video.duration) && video.duration > 0 && video.currentTime >= video.duration && !endGraceTimer) {
          // Missing ended event: require the actual end, then an output grace
          // period. Never use an approximate configured duration to cut audio.
          endGraceTimer = setTimeout(settle, 250);
          return;
        }
      }
      if ((!hasProgress && now - mountedAt >= STARTUP_LIMIT_MS)
        || (hasProgress && now - lastProgressAt >= PROGRESS_LIMIT_MS)
        || now - mountedAt >= ABSOLUTE_LIMIT_MS) fail();
    };
    const started = () => {
      if (!current()) { controller?.stop(); return; }
      if (successPlayback()) {
        video.style.visibility = "visible";
        setPhase("playing");
      }
    };
    const interrupt = () => finish();
    const visibilityChanged = () => { if (document.visibilityState === "hidden") interrupt(); };
    playbackRef.current = { finish };
    setFallback(false);
    setSoundBlocked(false);
    setPhase(reducedMotion ? "endpoint" : "loading");
    skipRef.current?.focus({ preventScroll: true });
    skipRef.current?.closest("figure")?.scrollIntoView?.({ block: "nearest", behavior: "auto" });
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("pagehide", interrupt);
    document.addEventListener("freeze", interrupt);

    if (reducedMotion) {
      releaseTimer = setTimeout(finish, 500);
    } else if (video && mediaHostRef.current) {
      video.hidden = false;
      video.style.visibility = "hidden";
      mediaHostRef.current.appendChild(video);
      video.addEventListener("ended", ended);
      video.addEventListener("error", fail);
      video.addEventListener("playing", started);
      video.addEventListener("timeupdate", observe);
      monitor = setInterval(observe, 200);
      // StrictMode releases its first effect before this microtask. The same
      // prepared element is adopted again, but success playback starts once.
      Promise.resolve().then(async () => {
        if (!current()) return;
        if (document.visibilityState === "hidden") { finish(); return; }
        const result = await controller.start();
        if (!current() || result?.cancelled) return;
        video.style.visibility = "visible";
        setPhase("playing");
        setSoundBlocked(Boolean(result?.blocked));
        observe();
      }).catch(fail);
    } else fail();

    return () => {
      alive = false;
      clearTimers();
      controller?.stop();
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("pagehide", interrupt);
      document.removeEventListener("freeze", interrupt);
      if (video) {
        video.removeEventListener("ended", ended);
        video.removeEventListener("error", fail);
        video.removeEventListener("playing", started);
        video.removeEventListener("timeupdate", observe);
        video.remove();
      }
      if (!prepared) controller?.dispose();
      if (playbackRef.current?.finish === finish) playbackRef.current = null;
    };
  }, [kind, prepared, reducedMotion]);

  const resting = reducedMotion || fallback;
  const endpointLabel = kind === "opening" ? "Opened Time Capsule vault" : "Sealed Time Capsule vault";
  const status = fallback ? "The animation could not play. Your capsule is saved."
    : phase === "settled" ? (kind === "opening" ? "Your capsule is open." : "Your capsule is sealed.")
      : kind === "opening" ? "Your moment is opening…" : "Your memories are being sealed…";

  return (
    <figure className="trace-capsule-film" data-capsule-ceremony={kind} data-capsule-playback={phase} aria-label={kind === "opening" ? "Time Capsule opening" : "Time Capsule sealing"}>
      {resting && <img className="trace-capsule-film__endpoint" src={presentation.end} alt={endpointLabel} draggable="false" />}
      {!reducedMotion && <div className="trace-capsule-film__media" ref={mediaHostRef} hidden={fallback}
        style={{ aspectRatio: "8 / 7", backgroundImage: `url("${presentation.poster}")`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" }} />}
      <figcaption className="trace-capsule-film__caption">
        <p className="trace-capsule-film__status" role="status">{status}</p>
        <div className="trace-capsule-film__controls">
          <button ref={skipRef} type="button" onClick={() => playbackRef.current?.finish()}>{fallback ? "Continue" : "Skip animation"}</button>
          {!resting && soundBlocked && <span>Sound was blocked by this browser. The animation will continue silently.</span>}
          {!resting && (!sounds || volume === 0) && <span>Sound off</span>}
        </div>
      </figcaption>
    </figure>
  );
}
