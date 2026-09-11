import { useEffect, useMemo, useRef, useState } from "react";
import { formatDateOnly } from "../services/dateOnly";
import { ingestPhotoFiles } from "../services/photoIngestion";
import { prepareCapsuleMediaFiles } from "../services/capsuleMedia";
import { useStoredPhoto } from "./StoredPhoto";
import {
  TIME_CAPSULE_STATE,
  addCalendarDays,
  addCalendarYears,
  localDateKey,
  timeCapsuleState,
} from "../services/timeCapsule";

const AUDIO_FILE_ACCEPT = ".mp3,.m4a,.aac,.wav,.oga,.ogg,.weba,audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/webm";

function CapsuleMedia({ item, loader }) {
  const loaded = useStoredPhoto(item, { loader });
  const elementRef = useRef(null);
  useEffect(() => () => {
    elementRef.current?.pause?.();
    loader?.evict?.(item.id);
  }, [item.id, loader]);
  const retainMediaElement = (element) => {
    if (element) elementRef.current = element;
  };
  if (!loaded.url) return <p>Attachment unavailable.</p>;
  if (item.kind === "photo") return <img alt={item.name} src={loaded.url} className="trace-capsule-media__photo" />;
  if (item.kind === "audio") return <audio aria-label={item.name} controls preload="metadata" ref={retainMediaElement} src={loaded.url} />;
  return <video aria-label={item.name} controls playsInline preload="metadata" ref={retainMediaElement} src={loaded.url} />;
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
  onBack,
  onBeginDraft,
  onPersistDraft,
  onStageMedia,
  onRemoveMedia,
  onDiscardDraft,
  onSeal,
  onOpen,
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
  const [ceremony, setCeremony] = useState(false);
  const ceremonyTimerRef = useRef(null);
  const selected = capsules.find(({ id }) => id === selectedId) || null;
  const sorted = useMemo(() => [...capsules].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [capsules]);

  useEffect(() => {
    if (initialCapsuleId) { setSelectedId(initialCapsuleId); setMode("detail"); }
  }, [initialCapsuleId]);

  useEffect(() => () => clearTimeout(ceremonyTimerRef.current), []);

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
    if (!window.confirm("Seal this Time Capsule? Its contents cannot be edited afterward. Trace hides sealed contents in the app, but this is not encryption or a tamper-proof time lock. Device-date changes can affect availability, and backups are not encrypted by this feature.")) return;
    setBusy(true); setError("");
    try {
      const result = await onSeal(form, media);
      if (!result?.value) { setError(result?.error || "This capsule could not be sealed."); return; }
      setSelectedId(result.value.id); setMode("detail"); setMedia([]); setStatus("Time Capsule sealed.");
    } catch (reason) { setError(reason.message || "Trace could not seal this capsule. Your draft remains available."); }
    finally { setBusy(false); }
  }

  async function openSelected() {
    setBusy(true); setError("");
    try {
      const opened = await onOpen(selected.id);
      if (!opened) { setError("Trace could not save the opening. The contents remain sealed; try again."); return; }
      if (!reducedMotion) {
        setCeremony(true);
        ceremonyTimerRef.current = setTimeout(() => setCeremony(false), 900);
      }
    } catch (reason) {
      setError("Trace could not save the opening. The contents remain sealed; try again.");
    } finally {
      setBusy(false);
    }
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
          <label>Custom date<input type="date" min={addCalendarDays(today, 1)} value={form.openOn} disabled={busy} onChange={(event) => updateForm("openOn", event.target.value)} /></label>
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
        {media.length > 0 && <ul aria-label="Draft attachments">{media.map((item) => <li key={item.id}>{item.kind}: {item.name} ({Math.ceil(item.bytes / 1024)} KiB) <button type="button" disabled={busy} onClick={() => remove(item)}>Remove</button></li>)}</ul>}
        <div className="trace-capsule-actions"><button type="button" disabled={busy} onClick={seal}>Seal Time Capsule</button><button type="button" disabled={busy} onClick={discard}>Discard draft</button></div>
      </section>
    </main>
  );

  if (mode === "detail" && selected) {
    const state = timeCapsuleState(selected, today);
    const opened = state === TIME_CAPSULE_STATE.OPENED;
    return (
      <main className="trace-feature-page trace-feature-page--capsules">
        <nav aria-label="Time Capsule detail navigation" className="trace-capsule-detail-navigation">
          <button type="button" onClick={() => { setMode("archive"); setSelectedId(null); }}>Back to Time Capsules</button>
          <button type="button" onClick={onBack}>Back to Timeline</button>
        </nav>
        <article className="trace-feature-surface trace-capsule-detail">
          <p className="trace-feature-page__kicker">{visibleState(selected, today)}</p><h1>{selected.name}</h1><p>Opening date: {formatDateOnly(selected.openOn)}</p>
          {error && <p role="alert">{error}</p>}{status && <p role="status">{status}</p>}
          {!opened && state === TIME_CAPSULE_STATE.SEALED && <p>This capsule remains sealed. Its private contents are hidden.</p>}
          {!opened && state === TIME_CAPSULE_STATE.AVAILABLE && <><p>This capsule is ready. Its contents stay hidden until you choose to open it.</p><button type="button" disabled={busy} onClick={openSelected}>Open Capsule</button></>}
          {ceremony && <div className="trace-capsule-ceremony" role="status"><strong>Your moment is opening…</strong></div>}
          {opened && !ceremony && <section aria-label="Opened capsule contents"><p className="trace-capsule-private-text">{selected.text}</p><div className="trace-capsule-media">{selected.media.map((item) => <CapsuleMedia item={item} key={item.id} loader={mediaLoader} />)}</div></section>}
          <button type="button" onClick={async () => { if (window.confirm(`Delete ${selected.name}? This permanently removes the capsule and its attachments.`) && await onDelete(selected.id)) { setMode("archive"); setSelectedId(null); } }}>Delete Time Capsule</button>
        </article>
      </main>
    );
  }

  return (
    <main className="trace-feature-page trace-feature-page--capsules">
      <header className="trace-feature-page__identity"><p className="trace-feature-page__kicker">Messages across time</p><h1>Time Capsules</h1><p>Seal words and media for a future local calendar date.</p></header>
      <nav><button type="button" onClick={onBack}>Back to Timeline</button> <button type="button" disabled={Boolean(blockedMessage)} onClick={startDraft}>{draft ? "Continue draft" : "Create Time Capsule"}</button></nav>
      {blockedMessage && <p role="alert">{blockedMessage}</p>}{status && <p role="status">{status}</p>}
      <section aria-label="Time Capsule archive" className="trace-capsule-archive">
        {sorted.length === 0 ? <p>No Time Capsules yet.</p> : sorted.slice(0, visibleCount).map((capsule) => (
          <article className="trace-feature-surface trace-capsule-card" key={capsule.id}>
            <h2>{capsule.name}</h2><p>{formatDateOnly(capsule.openOn)}</p><strong>{visibleState(capsule, today)}</strong>
            <button type="button" onClick={() => { setSelectedId(capsule.id); setMode("detail"); }}>View Time Capsule</button>
          </article>
        ))}
        {visibleCount < sorted.length && <button type="button" onClick={() => setVisibleCount((count) => count + 10)}>Show more</button>}
      </section>
    </main>
  );
}
