import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDateOnly } from "../services/dateOnly";
import { ingestPhotoFiles } from "../services/photoIngestion";
import { prepareCapsuleMediaFiles } from "../services/capsuleMedia";
import { useStoredPhoto } from "./StoredPhoto";
import TimeCapsuleVault, { preloadTimeCapsuleVaultAssets } from "./TimeCapsuleVault";
import {
  prepareCapsuleCeremony,
} from "../services/capsuleCeremonySound";
import TimeCapsuleCeremony from "./TimeCapsuleCeremony";
import CapsuleSealConfirmation from "./CapsuleSealConfirmation";
import {
  TIME_CAPSULE_STATE,
  addCalendarDays,
  addCalendarYears,
  localDateKey,
  timeCapsuleState,
} from "../services/timeCapsule";

const AUDIO_FILE_ACCEPT = ".mp3,.m4a,.aac,.wav,.oga,.ogg,.weba,audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/webm";

function formatDuration(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "";
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function AudioIcon() {
  return <svg aria-hidden="true" className="trace-capsule-audio-card__icon" viewBox="0 0 32 32"><path d="M12 7v15.2a4.7 4.7 0 1 1-2-3.84V10l13-3v12.2a4.7 4.7 0 1 1-2-3.84V4.5L12 7Z" fill="currentColor" /></svg>;
}

function CapsuleMedia({ item, loader, audioNumber = 1, registerPlayback, unregisterPlayback }) {
  const [reloadKey, setReloadKey] = useState(0);
  const [failedPhotoUrl, setFailedPhotoUrl] = useState("");
  const loaded = useStoredPhoto(item, { loader, reloadKey });
  const elementRef = useRef(null);
  useEffect(() => () => {
    elementRef.current?.pause?.();
    if (elementRef.current) unregisterPlayback?.(elementRef.current);
  }, [unregisterPlayback]);
  const retainMediaElement = (element) => {
    if (elementRef.current && elementRef.current !== element) {
      elementRef.current.pause?.();
      unregisterPlayback?.(elementRef.current);
    }
    elementRef.current = element;
    if (element) {
      registerPlayback?.(element);
    }
  };
  if (item.kind === "audio") {
    const duration = formatDuration(item.durationMs);
    const heading = `Audio recording ${audioNumber}`;
    return (
      <article className="trace-capsule-audio-card">
        <header className="trace-capsule-audio-card__header"><AudioIcon /><span><strong>{heading}</strong><span>{item.name}</span></span></header>
        {duration && <p>Duration: {duration}</p>}
        {loaded.url
          ? <audio aria-label={`Play ${heading}: ${item.name}`} controls preload="metadata" ref={retainMediaElement} src={loaded.url} />
          : <p>{loaded.unavailable ? "Audio unavailable." : "Loading audio…"}</p>}
      </article>
    );
  }
  if (item.kind === "photo") {
    const failed = loaded.unavailable || Boolean(loaded.url && loaded.url === failedPhotoUrl);
    if (failed) return (
      <section aria-label={`Photo could not be loaded: ${item.name}`} className="trace-capsule-photo-fallback" role="status">
        <strong>Photo could not be loaded</strong>
        <span>{item.name}</span>
        <button aria-label={`Retry photo ${item.name}`} type="button" onClick={() => { loader?.evict?.(item.id); setReloadKey((value) => value + 1); }}>Retry photo</button>
      </section>
    );
    if (!loaded.url) return <p role="status">Loading photo: {item.name}…</p>;
    return <img alt={item.name} src={loaded.url} className="trace-capsule-media__photo" onError={() => setFailedPhotoUrl(loaded.url)} onLoad={() => setFailedPhotoUrl("")} />;
  }
  if (!loaded.url) return <p>{loaded.unavailable ? "Attachment unavailable." : "Loading attachment…"}</p>;
  return <video aria-label={item.name} controls playsInline preload="metadata" ref={retainMediaElement} src={loaded.url} />;
}

function vaultState(capsule, today) {
  const state = timeCapsuleState(capsule, today);
  if (state === TIME_CAPSULE_STATE.AVAILABLE) return "ready";
  if (state === TIME_CAPSULE_STATE.OPENED) return "opened";
  return "sealed";
}

function audioNumberAt(items, index) {
  return items.slice(0, index + 1).filter(({ kind }) => kind === "audio").length;
}

function visibleState(capsule, today) {
  const state = timeCapsuleState(capsule, today);
  return state === TIME_CAPSULE_STATE.AVAILABLE ? "Ready to open" : state === TIME_CAPSULE_STATE.OPENED ? "Opened" : "Sealed";
}

export default function TimeCapsulesPage({
  capsules,
  draft,
  blockedMessage,
  initialCapsuleId,
  mediaLoader,
  reducedMotion,
  capsuleSounds = true,
  capsuleVolume = 0.65,
  onBack,
  onBeginDraft,
  onPersistDraft,
  onStageMedia,
  onRemoveMedia,
  onDiscardDraft,
  onSeal,
  onOpen,
  onReseal = () => ({ error: "Sealing again is unavailable." }),
  onDelete,
  today = localDateKey(),
}) {
  const [mode, setMode] = useState(initialCapsuleId ? "detail" : "archive");
  const [selectedId, setSelectedId] = useState(initialCapsuleId || null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [form, setForm] = useState(() => draft?.form || { name: "", text: "", openOn: addCalendarYears(today, 1) });
  const [media, setMedia] = useState(() => draft?.media || []);
  const [status, setStatus] = useState(draft ? "Your unfinished Time Capsule draft was restored." : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [openingPending, setOpeningPending] = useState(false);
  const [ceremony, setCeremony] = useState(null);
  const [sealConfirmation, setSealConfirmation] = useState(false);
  const preparedRef = useRef(null);
  const [resealOpen, setResealOpen] = useState(false);
  const [resealOn, setResealOn] = useState(() => addCalendarYears(today, 1));
  const mountedRef = useRef(true);
  const detailHeadingRef = useRef(null);
  const restoreFocusRef = useRef(false);
  const ceremonyTokenRef = useRef(0);
  const viewTokenRef = useRef(0);
  const previousInitialIdRef = useRef(initialCapsuleId);
  const actionInFlightRef = useRef(false);
  const playbackElementsRef = useRef(new Set());
  const registerPlayback = useCallback((element) => playbackElementsRef.current.add(element), []);
  const unregisterPlayback = useCallback((element) => playbackElementsRef.current.delete(element), []);
  const selected = capsules.find(({ id }) => id === selectedId) || null;
  const sorted = useMemo(() => [...capsules].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [capsules]);

  useEffect(() => {
    preloadTimeCapsuleVaultAssets();
  }, []);

  useEffect(() => {
    if (initialCapsuleId && initialCapsuleId !== previousInitialIdRef.current) {
      ceremonyTokenRef.current += 1;
      viewTokenRef.current += 1;
      preparedRef.current?.dispose?.();
      preparedRef.current = null;
      setCeremony(null);
      setSealConfirmation(false);
      setSelectedId(initialCapsuleId);
      setMode("detail");
    }
    previousInitialIdRef.current = initialCapsuleId;
  }, [initialCapsuleId]);

  function stopUserMediaPlayback() {
    playbackElementsRef.current.forEach((element) => { try { element.pause?.(); } catch (error) {} });
  }

  function releasePresentation(prepared = preparedRef.current) {
    prepared?.dispose?.();
    if (preparedRef.current === prepared) preparedRef.current = null;
  }

  function preparePresentation(kind) {
    stopUserMediaPlayback();
    let prepared = null;
    // No playback failure may prevent the underlying persistence operation.
    try { prepared = prepareCapsuleCeremony(kind, { sounds: capsuleSounds, volume: capsuleVolume, reducedMotion }); }
    catch (_) { /* The player will present its static recovery state. */ }
    preparedRef.current = prepared;
    return prepared;
  }

  function finishCeremony(token = ceremonyTokenRef.current) {
    if (token !== ceremonyTokenRef.current) return;
    ceremonyTokenRef.current += 1;
    releasePresentation();
    restoreFocusRef.current = true;
    setCeremony(null);
  }

  function cancelTransientEffects() {
    viewTokenRef.current += 1;
    ceremonyTokenRef.current += 1;
    stopUserMediaPlayback();
    releasePresentation();
    setSealConfirmation(false);
    setCeremony(null);
  }

  function viewIsCurrent(token) {
    return mountedRef.current && token === viewTokenRef.current;
  }

  function actionIsCurrent(token) {
    return mountedRef.current && token === ceremonyTokenRef.current && document.visibilityState !== "hidden";
  }

  function startCeremony(kind, prepared) {
    const token = ++ceremonyTokenRef.current;
    stopUserMediaPlayback();
    setCeremony({ kind, token, prepared });
  }

  useEffect(() => {
    mountedRef.current = true;
    const playbackElements = playbackElementsRef.current;
    return () => {
      mountedRef.current = false;
      preparedRef.current?.dispose?.();
      preparedRef.current = null;
      viewTokenRef.current += 1;
      ceremonyTokenRef.current += 1;
      playbackElements.forEach((element) => { try { element.pause?.(); } catch (error) {} });
    };
  }, []);

  useEffect(() => {
    if (!ceremony && restoreFocusRef.current) {
      restoreFocusRef.current = false;
      if (document.visibilityState !== "hidden") detailHeadingRef.current?.focus({ preventScroll: true });
    }
  }, [ceremony]);

  useEffect(() => {
    const cancel = () => {
      ceremonyTokenRef.current += 1;
      preparedRef.current?.dispose?.();
      preparedRef.current = null;
      setSealConfirmation(false);
      playbackElementsRef.current.forEach((element) => { try { element.pause?.(); } catch (error) {} });
      setCeremony(null);
    };
    const handleVisibility = () => { if (document.visibilityState === "hidden") cancel(); };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", cancel);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", cancel);
    };
  }, []);

  useEffect(() => {
    setResealOpen(false);
    setResealOn(addCalendarYears(today, 1));
  }, [selectedId, today]);

  function updateForm(field, value) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (onPersistDraft(next, media) === false) setError("Trace could not save the latest draft. Keep this page open and retry.");
    else setError("");
  }

  function backToTimeline() {
    if (onPersistDraft(form, media) === false) {
      setError("Trace could not save the latest draft. Retry before leaving so your changes are not lost.");
      return;
    }
    cancelTransientEffects();
    onBack();
  }

  function startDraft() {
    const next = draft?.form || { name: "", text: "", openOn: addCalendarYears(today, 1) };
    const nextMedia = draft?.media || [];
    if (!draft && onBeginDraft(next) === false) { setError("Trace could not start a durable Time Capsule draft."); return; }
    setForm(next); setMedia(nextMedia); setStatus(draft ? "Your unfinished Time Capsule draft was restored." : ""); setMode("edit");
  }

  async function selectFiles(kind, event) {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    input.value = "";
    if (!files.length) return;
    setBusy(true); setError("");
    try {
      let prepared;
      if (kind === "photo") {
        const photos = await ingestPhotoFiles(files, {
          existingCount: media.filter((item) => item.kind === "photo").length,
          existingDraftBytes: media.filter((item) => item.kind === "photo").reduce((sum, item) => sum + item.bytes, 0),
        });
        prepared = photos.photos.map((photo) => ({ ...photo, kind: "photo", mimeType: photo.blob.type, bytes: photo.storedBytes }));
      } else prepared = await prepareCapsuleMediaFiles(files, media);
      const next = await onStageMedia(prepared, form, media);
      setMedia(next); setStatus(`${prepared.length} ${kind}${prepared.length === 1 ? "" : "s"} added.`);
    } catch (reason) {
      setError(reason.message || "Trace could not safely prepare those attachments.");
    } finally { setBusy(false); }
  }

  async function remove(item) {
    setBusy(true); setError("");
    try { setMedia(await onRemoveMedia(item, form, media)); }
    catch (reason) { setError(reason.message || "That attachment could not be removed safely."); }
    finally { setBusy(false); }
  }

  async function discard() {
    const meaningful = form.name.trim() || form.text.trim() || media.length;
    if (meaningful && !window.confirm("Discard this unfinished Time Capsule and its attachments?")) return;
    setBusy(true);
    try { await onDiscardDraft(); setMode("archive"); setMedia([]); setForm({ name: "", text: "", openOn: addCalendarYears(today, 1) }); }
    catch (reason) { setError("Trace could not safely discard this draft. Nothing was removed; try again."); }
    finally { setBusy(false); }
  }

  async function seal() {
    if (actionInFlightRef.current) return;
    setSealConfirmation(false);
    const prepared = preparePresentation("sealing");
    let retained = false;
    const actionToken = ceremonyTokenRef.current;
    const viewToken = viewTokenRef.current;
    actionInFlightRef.current = true;
    setBusy(true); setError("");
    try {
      const result = await onSeal(form, media);
      if (!viewIsCurrent(viewToken)) return;
      if (!result?.value) { setError(result?.error || "This capsule could not be sealed."); return; }
      stopUserMediaPlayback();
      setSelectedId(result.value.id); setMode("detail"); setMedia([]); setStatus("Time Capsule sealed.");
      if (actionIsCurrent(actionToken)) { startCeremony("sealing", prepared); retained = true; }
    } catch (reason) { if (viewIsCurrent(viewToken)) setError(reason.message || "Trace could not seal this capsule. Your draft remains available."); }
    finally { if (!retained) releasePresentation(prepared); actionInFlightRef.current = false; if (mountedRef.current) setBusy(false); }
  }

  async function openSelected() {
    if (actionInFlightRef.current || ceremony) return;
    const prepared = preparePresentation("opening");
    let retained = false;
    const actionToken = ceremonyTokenRef.current;
    const viewToken = viewTokenRef.current;
    actionInFlightRef.current = true;
    setBusy(true); setOpeningPending(true); setError(""); setStatus("");
    try {
      const opened = await onOpen(selected.id);
      if (!viewIsCurrent(viewToken)) return;
      if (!opened) { setError("Trace could not save the opening. The contents remain sealed; try again."); return; }
      if (actionIsCurrent(actionToken)) { startCeremony("opening", prepared); retained = true; }
    } catch (reason) {
      if (viewIsCurrent(viewToken)) setError("Trace could not save the opening. The contents remain sealed; try again.");
    } finally {
      if (!retained) releasePresentation(prepared);
      actionInFlightRef.current = false;
      if (mountedRef.current) { setOpeningPending(false); setBusy(false); }
    }
  }

  async function resealSelected() {
    if (actionInFlightRef.current || ceremony) return;
    const prepared = preparePresentation("sealing");
    let retained = false;
    const actionToken = ceremonyTokenRef.current;
    const viewToken = viewTokenRef.current;
    actionInFlightRef.current = true;
    setBusy(true); setError("");
    try {
      const result = await onReseal(selected.id, resealOn, selected.sealCycle?.number || 1);
      if (!viewIsCurrent(viewToken)) return;
      if (!result?.value) { setError(result?.error || "This capsule could not be sealed again."); return; }
      stopUserMediaPlayback();
      setResealOpen(false);
      setStatus("Time Capsule sealed again for a future opening.");
      if (actionIsCurrent(actionToken)) { startCeremony("sealing", prepared); retained = true; }
    } catch (reason) {
      if (viewIsCurrent(viewToken)) setError(reason.message || "This capsule could not be sealed again. Its opened state is unchanged.");
    } finally { if (!retained) releasePresentation(prepared); actionInFlightRef.current = false; if (mountedRef.current) setBusy(false); }
  }

  if (mode === "edit") return (
    <main className="trace-feature-page trace-feature-page--capsules">
      <header className="trace-feature-page__identity"><p className="trace-feature-page__kicker">For your future self</p><h1>Create Time Capsule</h1></header>
      <button type="button" disabled={busy} onClick={backToTimeline}>Back to Timeline</button>
      {status && <p role="status">{status}</p>}{error && <p role="alert">{error}</p>}
      <section className="trace-feature-surface trace-capsule-editor">
        <label>Visible capsule name<input value={form.name} disabled={busy} onChange={(event) => updateForm("name", event.target.value)} /></label>
        <label>Private message<textarea value={form.text} disabled={busy} onChange={(event) => updateForm("text", event.target.value)} /></label>
        <fieldset><legend>Opening date</legend>
          {[1, 5, 10].map((years) => <button key={years} type="button" disabled={busy} onClick={() => updateForm("openOn", addCalendarYears(today, years))}>{years} year{years === 1 ? "" : "s"}</button>)}
          <label>Custom date<input type="date" min={today} value={form.openOn} disabled={busy} onChange={(event) => updateForm("openOn", event.target.value)} /></label>
          <p>Choose today to make the capsule ready immediately, or choose a future local calendar date.</p>
        </fieldset>
        <p>Up to 12 photos (48 MiB prepared), 3 audio files (20 MiB each), 1 video (75 MiB), and 100 MiB combined.</p>
        <div className="trace-capsule-actions">
          <label>Choose photos<input type="file" accept="image/*" multiple disabled={busy} onChange={(event) => selectFiles("photo", event)} /></label>
          <label>Take photo<input type="file" accept="image/*" capture="environment" disabled={busy} onChange={(event) => selectFiles("photo", event)} /></label>
          <label>Choose audio file<input type="file" accept={AUDIO_FILE_ACCEPT} multiple disabled={busy} onChange={(event) => selectFiles("audio", event)} /></label>
          <label>Choose video<input type="file" accept="video/*" disabled={busy} onChange={(event) => selectFiles("video", event)} /></label>
          <label>Record video<input type="file" accept="video/*" capture="environment" disabled={busy} onChange={(event) => selectFiles("video", event)} /></label>
        </div>
        <p>On iPhone, save or share a Voice Memo to Files first, then choose it here.</p>
        {media.length > 0 && <ul aria-label="Draft attachments" className="trace-capsule-draft-attachments">{media.map((item, index) => <li key={item.id}>
          {item.kind === "audio"
            ? <CapsuleMedia item={item} loader={mediaLoader} audioNumber={audioNumberAt(media, index)} registerPlayback={registerPlayback} unregisterPlayback={unregisterPlayback} />
            : item.kind === "photo"
              ? <CapsuleMedia item={item} loader={mediaLoader} registerPlayback={registerPlayback} unregisterPlayback={unregisterPlayback} />
            : <span>{item.kind}: {item.name} ({Math.ceil(item.bytes / 1024)} KiB)</span>}
          <button type="button" disabled={busy} onClick={() => remove(item)}>Remove</button>
        </li>)}</ul>}
        <div className="trace-capsule-actions"><button type="button" disabled={busy} onClick={() => setSealConfirmation(true)}>Seal Time Capsule</button><button type="button" disabled={busy} onClick={discard}>Discard draft</button></div>
      </section>
      {sealConfirmation && <CapsuleSealConfirmation name={form.name} onConfirm={seal} onCancel={() => setSealConfirmation(false)} />}
    </main>
  );

  if (mode === "detail" && selected) {
    const state = timeCapsuleState(selected, today);
    const opened = state === TIME_CAPSULE_STATE.OPENED;
    return (
      <main className="trace-feature-page trace-feature-page--capsules">
        <nav aria-label="Time Capsule detail navigation" className="trace-capsule-detail-navigation">
          <button type="button" onClick={() => { cancelTransientEffects(); setMode("archive"); setSelectedId(null); }}>Back to Time Capsules</button>
          <button type="button" onClick={() => { cancelTransientEffects(); onBack(); }}>Back to Timeline</button>
        </nav>
        <article className="trace-feature-surface trace-capsule-detail">
          <p className="trace-feature-page__kicker">{visibleState(selected, today)}</p><h1 ref={detailHeadingRef} tabIndex={-1}>{selected.name}</h1><p>Opening date: {formatDateOnly(selected.openOn)}</p>
          {error && <p role="alert">{error}</p>}{status && <p role="status">{status}</p>}
          <div className={`trace-capsule-presentation${ceremony ? " trace-capsule-presentation--ceremony" : ""}`}>
            {ceremony ? <TimeCapsuleCeremony
              key={ceremony.token}
              kind={ceremony.kind}
              prepared={ceremony.prepared}
              sounds={capsuleSounds}
              volume={capsuleVolume}
              reducedMotion={reducedMotion}
              onFinish={() => finishCeremony(ceremony.token)}
            /> : <TimeCapsuleVault state={openingPending ? "sealed" : vaultState(selected, today)} />}
          </div>
          {!ceremony && !opened && state === TIME_CAPSULE_STATE.SEALED && <p>This capsule remains sealed. Its private contents are hidden.</p>}
          {!ceremony && !opened && state === TIME_CAPSULE_STATE.AVAILABLE && <><p>This capsule is ready. Its contents stay hidden until you choose to open it.</p><button type="button" disabled={busy} onClick={openSelected}>Open Capsule</button></>}
          {opened && !ceremony && !busy && <section aria-label="Opened capsule contents"><p className="trace-capsule-private-text">{selected.text}</p><div className="trace-capsule-media">{selected.media.map((item, index) => <CapsuleMedia item={item} key={item.id} loader={mediaLoader} audioNumber={audioNumberAt(selected.media, index)} registerPlayback={registerPlayback} unregisterPlayback={unregisterPlayback} />)}</div></section>}
          {opened && !ceremony && !busy && !resealOpen && <button type="button" disabled={busy} onClick={() => setResealOpen(true)}>Seal again for later</button>}
          {opened && !ceremony && resealOpen && (
            <section aria-label="Seal again for later" className="trace-capsule-reseal">
              <h2>Seal again for later</h2>
              <p>Choose a strictly future local date. Confirming seals this capsule again and hides its contents in Trace. Capsule content cannot be edited here, and previously exported copies are not revoked.</p>
              <div className="trace-capsule-actions">
                {[1, 5, 10].map((years) => <button key={years} type="button" disabled={busy} onClick={() => setResealOn(addCalendarYears(today, years))}>{years} year{years === 1 ? "" : "s"}</button>)}
              </div>
              <label>New opening date<input type="date" min={addCalendarDays(today, 1)} value={resealOn} disabled={busy} onChange={(event) => setResealOn(event.target.value)} /></label>
              <div className="trace-capsule-actions">
                <button type="button" disabled={busy} onClick={resealSelected}>Confirm seal again</button>
                <button type="button" disabled={busy} onClick={() => { setResealOpen(false); setResealOn(addCalendarYears(today, 1)); setError(""); }}>Cancel</button>
              </div>
            </section>
          )}
          <button type="button" disabled={Boolean(ceremony) || busy} onClick={async () => { if (window.confirm(`Delete ${selected.name}? This permanently removes the capsule and its attachments.`) && await onDelete(selected.id)) { setMode("archive"); setSelectedId(null); } }}>Delete Time Capsule</button>
        </article>
      </main>
    );
  }

  return (
    <main className="trace-feature-page trace-feature-page--capsules">
      <header className="trace-feature-page__identity"><p className="trace-feature-page__kicker">Messages across time</p><h1>Time Capsules</h1><p>Seal words and media for today or a future local calendar date.</p></header>
      <nav><button type="button" onClick={onBack}>Back to Timeline</button> <button type="button" disabled={Boolean(blockedMessage)} onClick={startDraft}>{draft ? "Continue draft" : "Create Time Capsule"}</button></nav>
      {blockedMessage && <p role="alert">{blockedMessage}</p>}{status && <p role="status">{status}</p>}
      <section aria-label="Time Capsule archive" className="trace-capsule-archive">
        {sorted.length === 0 ? <p>No Time Capsules yet.</p> : sorted.slice(0, visibleCount).map((capsule) => (
          <article className="trace-feature-surface trace-capsule-card" key={capsule.id}>
            <TimeCapsuleVault state={vaultState(capsule, today)} variant="compact" reducedMotion={reducedMotion} />
            <h2>{capsule.name}</h2><p>{formatDateOnly(capsule.openOn)}</p><strong>{visibleState(capsule, today)}</strong>
            <button type="button" onClick={() => { setStatus(""); setSelectedId(capsule.id); setMode("detail"); }}>View Time Capsule</button>
          </article>
        ))}
        {visibleCount < sorted.length && <button type="button" onClick={() => setVisibleCount((count) => count + 10)}>Show more</button>}
      </section>
    </main>
  );
}
