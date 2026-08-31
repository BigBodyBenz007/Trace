import { useEffect, useMemo, useRef, useState } from "react";
import { motionScrollBehavior } from "../services/motionPreference";
import JournalDisableDialog from "./JournalDisableDialog";
import JournalLockSetupDialog, { journalPrivacySetupAvailable } from "./JournalLockSetupDialog";
import {
  JOURNAL_MOODS,
  clearJournalDraft,
  matchesJournalSearch,
  readJournalDraft,
  sortJournalEntriesNewestFirst,
  validateJournalDraft,
  writeJournalDraft,
} from "../services/journalEntry";

function localDateTime(value = new Date()) {
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

function emptyDraft() {
  return { title: "", body: "", ...localDateTime(), mood: "", tags: "" };
}

function entryDraft(entry) {
  return {
    title: entry.title || "",
    body: entry.body || "",
    date: entry.date,
    time: entry.time,
    mood: entry.mood || "",
    tags: (entry.tags || []).join(", "),
  };
}

function BookIcon({ size = 28 }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" width={size} height={size} fill="none">
      <path d="M6 4.5h17.5A2.5 2.5 0 0 1 26 7v20H8.5A3.5 3.5 0 0 1 5 23.5V5.5A1 1 0 0 1 6 4.5Z" fill="#75583d" stroke="#d6c2a2" strokeWidth="1.5" />
      <path d="M9 4.5v22.4M8.5 21.5H26" stroke="#d6c2a2" strokeWidth="1.5" />
    </svg>
  );
}

function formatSelectedDate(entry) {
  const [year, month, day] = entry.date.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return `${date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} at ${new Date(`${entry.date}T${entry.time}`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

export default function JournalPage({
  entries,
  onBack,
  saveEntry,
  deleteEntry,
  initialDraft,
  journalPrivacyEnabled = false,
  journalPrivacyUnlocked = false,
  persistDraft = (value) => writeJournalDraft(localStorage, value),
  removeDraft = () => clearJournalDraft(localStorage),
  onEnablePrivacy,
  onLock,
  onDisable,
  recoveryFormat,
  onDraftStorageError = () => {},
  buttonStyle,
  inputStyle,
  containerStyle,
}) {
  const recovered = useMemo(
    () => initialDraft === undefined ? readJournalDraft(localStorage) : initialDraft,
    [initialDraft]
  );
  const [draft, setDraft] = useState(() => recovered?.form || emptyDraft());
  const [editingId, setEditingId] = useState(() => recovered?.editingId || null);
  const [showRecoveredDraft, setShowRecoveredDraft] = useState(Boolean(recovered));
  const [draftActive, setDraftActive] = useState(Boolean(recovered));
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [privacyStatus, setPrivacyStatus] = useState("");
  const editorRef = useRef(null);
  const entryRefs = useRef(new Map());
  const pendingHistoryScrollRef = useRef(null);
  const persistDraftRef = useRef(persistDraft);
  const draftErrorRef = useRef(onDraftStorageError);
  persistDraftRef.current = persistDraft;
  draftErrorRef.current = onDraftStorageError;

  const sortedEntries = useMemo(() => sortJournalEntriesNewestFirst(entries), [entries]);
  const visibleEntries = useMemo(
    () => sortedEntries.filter((entry) => matchesJournalSearch(entry, search)),
    [search, sortedEntries]
  );

  useEffect(() => {
    if (!draftActive) return;
    try {
      Promise.resolve(persistDraftRef.current({ editingId, form: draft })).catch(() => draftErrorRef.current());
    } catch (storageError) {
      draftErrorRef.current();
    }
  }, [draft, draftActive, editingId]);

  useEffect(() => {
    const id = pendingHistoryScrollRef.current;
    if (!id) return;
    const node = entryRefs.current.get(id);
    if (!node) return;
    pendingHistoryScrollRef.current = null;
    node.scrollIntoView?.({ behavior: motionScrollBehavior(), block: "start" });
  }, [entries]);

  const fieldStyle = {
    ...inputStyle,
    boxSizing: "border-box",
    fontSize: "16px",
    marginTop: "6px",
    minHeight: "44px",
    padding: "10px",
    width: "100%",
  };
  const smallButtonStyle = { ...buttonStyle, fontSize: "16px", marginTop: 0, minHeight: "44px", padding: "10px 14px" };
  const showSetupAction = !journalPrivacyEnabled && Boolean(onEnablePrivacy);
  const showLockAction = journalPrivacyEnabled && journalPrivacyUnlocked && Boolean(onLock);
  const showPrivacyAction = showSetupAction || showLockAction;

  function change(field, value) {
    setDraftActive(true);
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function persistCurrentDraft() {
    if (!draftActive) return;
    try {
      return persistDraft({ editingId, form: draft });
    } catch (storageError) {
      onDraftStorageError();
      throw storageError;
    }
  }

  function backToTimeline() {
    let result;
    try {
      result = persistCurrentDraft();
    } catch (error) {
      return;
    }
    if (result && typeof result.then === "function") result.then(onBack).catch(onDraftStorageError);
    else onBack();
  }

  function submit(event) {
    event.preventDefault();
    const validation = validateJournalDraft(draft);
    if (validation.error) {
      setError(validation.error);
      persistCurrentDraft();
      return;
    }
    function finish(saved) {
      if (!saved) return;
      function clearComposer() {
        pendingHistoryScrollRef.current = saved.id;
        setExpandedIds((current) => new Set(current).add(saved.id));
        setEditingId(null);
        setDraft(emptyDraft());
        setError("");
        setShowRecoveredDraft(false);
        setDraftActive(false);
      }
      try {
        const result = removeDraft();
        if (result && typeof result.then === "function") result.then(clearComposer).catch(onDraftStorageError);
        else clearComposer();
      } catch (storageError) {
        onDraftStorageError();
      }
    }
    try {
      const result = saveEntry(draft, editingId);
      if (result && typeof result.then === "function") result.then(finish).catch(onDraftStorageError);
      else finish(result);
    } catch (storageError) {
      onDraftStorageError();
    }
  }

  function beginEdit(entry) {
    setDraft(entryDraft(entry));
    setEditingId(entry.id);
    setDraftActive(true);
    setError("");
    window.requestAnimationFrame(() => editorRef.current?.scrollIntoView?.({ behavior: motionScrollBehavior(), block: "start" }));
  }

  function cancelEdit() {
    if (!window.confirm("Discard unsaved changes to this Journal entry?")) return;
    function clearComposer() {
      setEditingId(null);
      setDraft(emptyDraft());
      setError("");
      setShowRecoveredDraft(false);
      setDraftActive(false);
    }
    try {
      const result = removeDraft();
      if (result && typeof result.then === "function") result.then(clearComposer).catch(onDraftStorageError);
      else clearComposer();
    } catch (storageError) {
      onDraftStorageError();
    }
  }

  function discardDraft() {
    if (!window.confirm("Discard this unfinished Journal draft?")) return;
    function clearComposer() {
      setEditingId(null);
      setDraft(emptyDraft());
      setError("");
      setShowRecoveredDraft(false);
      setDraftActive(false);
    }
    try {
      const result = removeDraft();
      if (result && typeof result.then === "function") result.then(clearComposer).catch(onDraftStorageError);
      else clearComposer();
    } catch (storageError) {
      onDraftStorageError();
    }
  }

  function remove(entry) {
    if (!window.confirm("Delete this Journal entry?")) return;
    const index = visibleEntries.findIndex(({ id }) => id === entry.id);
    const restoreEntry = visibleEntries[index + 1] || visibleEntries[index - 1];
    function finish(deleted) {
      if (!deleted) return;
      pendingHistoryScrollRef.current = restoreEntry?.id || null;
      if (editingId === entry.id) {
        function clearEditor() {
          setEditingId(null);
          setDraft(emptyDraft());
          setShowRecoveredDraft(false);
          setDraftActive(false);
        }
        try {
          const result = removeDraft();
          if (result && typeof result.then === "function") result.then(clearEditor).catch(onDraftStorageError);
          else clearEditor();
        } catch (storageError) {
          onDraftStorageError();
        }
      }
    }
    try {
      const result = deleteEntry(entry.id);
      if (result && typeof result.then === "function") result.then(finish).catch(onDraftStorageError);
      else finish(result);
    } catch (storageError) {
      onDraftStorageError();
    }
  }

  async function lockJournal() {
    try {
      await persistCurrentDraft();
      await Promise.resolve(onLock?.());
    } catch (error) {
      onDraftStorageError();
    }
  }

  async function enableJournalLock(credentials) {
    try {
      await persistCurrentDraft();
    } catch (error) {
      onDraftStorageError();
      throw error;
    }
    await Promise.resolve(onEnablePrivacy(credentials));
  }

  async function openTurnOffDialog() {
    try {
      await persistCurrentDraft();
      setPrivacyStatus("");
      setDisableOpen(true);
    } catch (error) {
      onDraftStorageError();
    }
  }

  return (
    <main className="trace-feature-page trace-feature-page--journal journal-page" style={{ ...containerStyle, justifyContent: "flex-start" }}>
      <header className={`trace-feature-page__identity journal-page__header${showPrivacyAction ? " journal-page__header--with-action" : ""}`}>
        <BookIcon size={38} />
        <div className="journal-page__header-copy">
          <h1 style={{ margin: 0 }}>Journal</h1>
          <p style={{ color: "#c8b99f", margin: "5px 0 0" }}>Private reflections in Trace. Entries are never shared.</p>
        </div>
        {showSetupAction && (
          <button
            className="trace-action trace-action--primary journal-page__privacy-action"
            disabled={!journalPrivacySetupAvailable()}
            type="button"
            onClick={() => setSetupOpen(true)}
            style={smallButtonStyle}
          >
            Set Up Journal Lock
          </button>
        )}
        {showLockAction && <button className="trace-action trace-action--brass journal-page__privacy-action" type="button" onClick={lockJournal} style={{ ...smallButtonStyle, backgroundColor: "#75583d" }}>Lock Journal</button>}
      </header>
      <div className="journal-actions journal-page__navigation">
        <button className="trace-action trace-action--secondary" type="button" onClick={backToTimeline} style={{ ...smallButtonStyle, backgroundColor: "#4b5563" }}>Back to Timeline</button>
      </div>

      {privacyStatus && <p className="journal-privacy-page-status" role="status">{privacyStatus}</p>}
      {setupOpen && onEnablePrivacy && (
        <JournalLockSetupDialog
          onCancel={() => setSetupOpen(false)}
          onComplete={() => setSetupOpen(false)}
          onEnable={enableJournalLock}
        />
      )}
      {onDisable && (
        <section className="journal-section journal-page-privacy-controls" aria-labelledby="journal-page-privacy-heading">
          <h2 id="journal-page-privacy-heading">Journal Lock: On</h2>
          <div className="journal-actions">
            <button className="trace-action trace-action--brass" type="button" onClick={openTurnOffDialog} style={{ ...smallButtonStyle }}>Turn Off Journal Lock</button>
          </div>
        </section>
      )}

      <section ref={editorRef} aria-labelledby="journal-composer-heading" className="journal-section journal-composer">
        <h2 id="journal-composer-heading">{editingId ? "Edit Journal Entry" : "New Journal Entry"}</h2>
        {showRecoveredDraft && <p className="journal-recovery" role="status">Your unfinished Journal draft was restored.</p>}
        <form onSubmit={submit} noValidate className="journal-paper">
          <label>Title <span className="journal-optional">(optional)</span>
            <input aria-label="Title" autoComplete="off" value={draft.title} onChange={(event) => change("title", event.target.value)} style={fieldStyle} />
          </label>
          <label>Entry
            <textarea aria-label="Entry" required value={draft.body} onChange={(event) => change("body", event.target.value)} style={{ ...fieldStyle, lineHeight: 1.5, minHeight: "180px", resize: "vertical" }} />
          </label>
          <div className="journal-date-time">
            <label>Date<input aria-label="Date" type="date" required value={draft.date} onChange={(event) => change("date", event.target.value)} style={fieldStyle} /></label>
            <label>Time<input aria-label="Time" type="time" required value={draft.time} onChange={(event) => change("time", event.target.value)} style={fieldStyle} /></label>
          </div>
          <fieldset className="journal-moods">
            <legend>Mood <span className="journal-optional">(optional)</span></legend>
            <div className="journal-mood-options">
              {JOURNAL_MOODS.map((mood) => <button key={mood} type="button" aria-pressed={draft.mood === mood} onClick={() => change("mood", draft.mood === mood ? "" : mood)}>{mood}</button>)}
            </div>
          </fieldset>
          <label>Topics <span className="journal-optional">(optional)</span>
            <input aria-label="Tags" autoComplete="off" placeholder="Work, family, goals…" value={draft.tags} onChange={(event) => change("tags", event.target.value)} style={fieldStyle} />
          </label>
          {error && <p role="alert" className="journal-error">{error}</p>}
          <div className="journal-actions">
            <button className="trace-action trace-action--brass" type="submit" style={{ ...smallButtonStyle, backgroundColor: "#75583d" }}>{editingId ? "Save Changes" : "Save Journal Entry"}</button>
            {editingId && <button className="trace-action trace-action--secondary" type="button" onClick={cancelEdit} style={{ ...smallButtonStyle, backgroundColor: "#4b5563" }}>Cancel Edit</button>}
            {draftActive && <button className="trace-action trace-action--danger" type="button" onClick={discardDraft} style={{ ...smallButtonStyle, backgroundColor: "#6b3f3f" }}>Discard draft</button>}
          </div>
        </form>
      </section>

      <section aria-labelledby="journal-history-heading" className="journal-section">
        <h2 id="journal-history-heading">Journal History</h2>
        <label className="journal-search-label">Search Journal
          <input type="search" placeholder="Search Journal..." value={search} onChange={(event) => setSearch(event.target.value)} style={fieldStyle} />
        </label>
        {visibleEntries.length === 0 ? (
          <p className="journal-empty">{entries.length ? "No Journal entries match your search." : "Your Journal is ready when you are."}</p>
        ) : (
          <div className="journal-history">
            {visibleEntries.map((entry) => {
              const expanded = expandedIds.has(entry.id);
              const needsPreview = entry.body.length > 280;
              const body = !expanded && needsPreview ? `${entry.body.slice(0, 280).trimEnd()}…` : entry.body;
              return (
                <article key={entry.id} ref={(node) => { if (node) entryRefs.current.set(entry.id, node); else entryRefs.current.delete(entry.id); }} data-journal-entry-id={entry.id} className="journal-card">
                  <h3>{entry.title || "Untitled entry"}</h3>
                  <p className="journal-card__date">{formatSelectedDate(entry)}</p>
                  <p className="journal-card__body">{body}</p>
                  {(entry.mood || entry.tags.length > 0) && <p className="journal-card__meta">{[entry.mood, ...entry.tags.map((tag) => `#${tag}`)].filter(Boolean).join(" · ")}</p>}
                  {needsPreview && <button className="trace-action trace-action--brass" type="button" onClick={() => setExpandedIds((current) => { const next = new Set(current); if (expanded) next.delete(entry.id); else next.add(entry.id); return next; })} style={{ ...smallButtonStyle, backgroundColor: "#5b4634" }}>{expanded ? "Show less" : "Read full entry"}</button>}
                  <div className="journal-actions">
                    <button className="trace-action trace-action--secondary" type="button" onClick={() => beginEdit(entry)} style={{ ...smallButtonStyle, backgroundColor: "#374151" }}>Edit</button>
                    <button className="trace-action trace-action--danger" type="button" onClick={() => remove(entry)} style={{ ...smallButtonStyle, backgroundColor: "#991b1b" }}>Delete</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <button className="trace-action trace-action--secondary" type="button" onClick={backToTimeline} style={{ ...smallButtonStyle, backgroundColor: "#4b5563", marginTop: "24px" }}>Back to Timeline</button>
      {disableOpen && onDisable && (
        <JournalDisableDialog
          onCancel={() => setDisableOpen(false)}
          onComplete={() => {
            setDisableOpen(false);
            setPrivacyStatus("Journal Lock turned off.");
          }}
          onDisable={onDisable}
          recoveryFormat={recoveryFormat}
        />
      )}
    </main>
  );
}
