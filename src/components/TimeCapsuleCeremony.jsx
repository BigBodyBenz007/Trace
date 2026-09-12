import React, { useEffect, useRef, useState } from "react";
import { CAPSULE_PRESENTATION } from "../services/capsulePresentation";
import { attachCapsuleCeremonyAudio } from "../services/capsuleCeremonySound";

const FALLBACK_HOLD_MS = 2500;
const STALL_LIMIT_MS = 4000;

export default function TimeCapsuleCeremony({ kind, preparedAudio, sounds = true, reducedMotion = false, onFinish }) {
  const presentation = CAPSULE_PRESENTATION[kind];
  const videoRef = useRef(null);
  const skipRef = useRef(null);
  const finishRef = useRef(onFinish);
  const playbackRef = useRef(null);
  const optionsRef = useRef({ sounds, volume: 0.65 });
  const [volume, setVolume] = useState(0.65);
  const [fallback, setFallback] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  finishRef.current = onFinish;
  optionsRef.current = { sounds, volume };

  useEffect(() => {
    const video = videoRef.current;
    let alive = true;
    let finished = false;
    let failed = false;
    let hardTimer;
    let stallTimer;
    let fallbackTimer;
    let audio;
    let blocked = false;
    const current = () => alive && !finished && !failed;
    const clearTimers = () => {
      clearTimeout(hardTimer);
      clearTimeout(stallTimer);
      clearTimeout(fallbackTimer);
    };
    const stop = () => {
      if (video) { video.muted = true; try { video.pause(); } catch {} }
      audio?.stop();
    };
    const finish = () => {
      if (!alive || finished) return;
      finished = true;
      clearTimers();
      stop();
      finishRef.current?.();
    };
    const fail = () => {
      if (!current()) return;
      failed = true;
      clearTimers();
      stop();
      setFallback(true);
      setPlaying(false);
      setSoundBlocked(false);
      // Continue is available immediately; even a missing ended event or hung
      // play promise must never hold capsule controls indefinitely.
      fallbackTimer = setTimeout(finish, FALLBACK_HOLD_MS);
    };
    const syncAudio = () => {
      if (!current() || !video) return;
      const options = optionsRef.current;
      audio?.setVolume(options.sounds && !blocked ? options.volume : 0);
      video.muted = !options.sounds || options.volume === 0 || blocked;
    };
    const play = async (allowMutedRetry = true) => {
      if (!current() || !video) return;
      syncAudio();
      try {
        await video.play();
        // A pending play can resolve after navigation. Do not stop a newer
        // StrictMode effect that now owns this same media element.
        if (!current()) {
          if (playbackRef.current?.video !== video || playbackRef.current?.finish === finish) stop();
          return;
        }
      } catch (error) {
        if (!current()) return;
        if (error?.name === "NotAllowedError" && allowMutedRetry && !video.muted) {
          blocked = true;
          setSoundBlocked(true);
          await play(false);
        } else fail();
      }
    };
    const enableSound = () => {
      if (!current() || !video || !optionsRef.current.sounds) return;
      // Begin both calls in this click handler, before awaiting anything.
      // Safari can require a new gesture to unmute after async persistence.
      const ready = audio?.resumeFromGesture() || Promise.resolve(true);
      blocked = false;
      setSoundBlocked(false);
      syncAudio();
      play().catch(fail);
      ready.then(running => {
        if (!current() || running) return;
        blocked = true;
        syncAudio();
        setSoundBlocked(true);
      });
    };
    const stalled = () => {
      if (!current()) return;
      clearTimeout(stallTimer);
      stallTimer = setTimeout(fail, STALL_LIMIT_MS);
    };
    const progress = () => {
      if (!current()) return;
      clearTimeout(stallTimer);
      if (video.currentTime >= presentation.duration - 0.025) finish();
    };
    const started = () => {
      if (!current()) { stop(); return; }
      clearTimeout(stallTimer);
      setPlaying(true);
    };
    const interrupt = () => finish();
    const visibilityChanged = () => { if (document.visibilityState === "hidden") interrupt(); };
    playbackRef.current = { video, finish, syncAudio, enableSound };
    setFallback(false);
    setPlaying(false);
    setSoundBlocked(false);
    skipRef.current?.focus({ preventScroll: true });
    // Keep the complete presentation and its controls in view when replacing
    // the shorter static endpoint. This scroll does not animate the artwork.
    skipRef.current?.closest("figure")?.scrollIntoView?.({ block: "nearest", behavior: "auto" });
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("pagehide", interrupt);
    document.addEventListener("freeze", interrupt);

    if (reducedMotion) {
      hardTimer = setTimeout(finish, 500);
    } else if (video) {
      try { audio = attachCapsuleCeremonyAudio(video, preparedAudio); }
      catch { fail(); }
      if (!audio) return () => {
        alive = false;
        clearTimers();
        stop();
        document.removeEventListener("visibilitychange", visibilityChanged);
        window.removeEventListener("pagehide", interrupt);
        document.removeEventListener("freeze", interrupt);
        if (playbackRef.current?.finish === finish) playbackRef.current = null;
      };
      blocked = Boolean(optionsRef.current.sounds && !audio.isReady());
      setSoundBlocked(blocked);
      video.addEventListener("ended", finish);
      video.addEventListener("error", fail);
      video.addEventListener("waiting", stalled);
      video.addEventListener("stalled", stalled);
      video.addEventListener("playing", started);
      video.addEventListener("timeupdate", progress);
      hardTimer = setTimeout(fail, (presentation.duration * 1000) + STALL_LIMIT_MS);
      stalled();
      // StrictMode cancels its first effect before this microtask, avoiding
      // two play attempts or duplicate audible playback.
      Promise.resolve().then(() => {
        if (current() && document.visibilityState !== "hidden") return play();
        if (current()) finish();
        return undefined;
      }).catch(fail);
    }

    return () => {
      alive = false;
      clearTimers();
      stop();
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("pagehide", interrupt);
      document.removeEventListener("freeze", interrupt);
      if (video) {
        video.removeEventListener("ended", finish);
        video.removeEventListener("error", fail);
        video.removeEventListener("waiting", stalled);
        video.removeEventListener("stalled", stalled);
        video.removeEventListener("playing", started);
        video.removeEventListener("timeupdate", progress);
      }
      if (playbackRef.current?.finish === finish) playbackRef.current = null;
    };
  }, [kind, presentation, preparedAudio, reducedMotion]);

  useEffect(() => { playbackRef.current?.syncAudio(); }, [sounds, volume]);

  const resting = reducedMotion || fallback;
  const endpointLabel = kind === "opening" ? "Opened Time Capsule vault" : "Sealed Time Capsule vault";
  const status = fallback ? "The animation could not play. Your capsule is saved."
    : kind === "opening" ? "Your moment is opening…" : "Your memories are being sealed…";
  const changeVolume = event => {
    const next = Number(event.target.value) / 100;
    const previous = optionsRef.current.volume;
    optionsRef.current = { sounds, volume: next };
    setVolume(next);
    if (previous === 0 && next > 0) playbackRef.current?.enableSound();
    else playbackRef.current?.syncAudio();
  };

  return (
    <figure className="trace-capsule-film" data-capsule-ceremony={kind} data-capsule-playback={resting ? "endpoint" : playing ? "playing" : "loading"} aria-label={kind === "opening" ? "Time Capsule opening" : "Time Capsule sealing"}>
      {resting && <img className="trace-capsule-film__endpoint" src={presentation.end} alt={endpointLabel} draggable="false" />}
      {!reducedMotion && <video
        ref={videoRef}
        className="trace-capsule-film__video"
        src={presentation.src}
        poster={presentation.poster}
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
        aria-hidden="true"
        hidden={fallback}
      />}
      <figcaption className="trace-capsule-film__caption">
        <p className="trace-capsule-film__status" role="status">{status}</p>
        <div className="trace-capsule-film__controls">
          <button ref={skipRef} type="button" onClick={() => playbackRef.current?.finish()}>{fallback ? "Continue" : "Skip animation"}</button>
          {!resting && sounds && soundBlocked && <button type="button" onClick={() => playbackRef.current?.enableSound()}>Enable sound</button>}
          {!resting && sounds && <label className="trace-capsule-film__volume">Volume
            <input aria-label="Capsule ceremony volume" type="range" min="0" max="100" step="1" value={Math.round(volume * 100)} onChange={changeVolume} />
            <output>{Math.round(volume * 100)}%</output>
          </label>}
          {!resting && !sounds && <span>Sound off</span>}
        </div>
      </figcaption>
    </figure>
  );
}
