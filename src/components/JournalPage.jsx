import { useEffect, useMemo, useRef, useState } from "react";
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
  onDraftStorageError = () => {},
  buttonStyle,
  inputStyle,
  containerStyle,
}) {
  const recovered = useMemo(() => readJournalDraft(localStorage), []);
  const [draft, setDraft] = useState(() => recovered?.form || emptyDraft());
  const [editingId, setEditingId] = useState(() => recovered?.editingId || null);
  const [showRecoveredDraft, setShowRecoveredDraft] = useState(Boolean(recovered));
  const [draftActive, setDraftActive] = useState(Boolean(recovered));
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const editorRef = useRef(null);
  const entryRefs = useRef(new Map());
  const pendingHistoryScrollRef = useRef(null);

  const sortedEntries = useMemo(() => sortJournalEntriesNewestFirst(entries), [entries]);
  const visibleEntries = useMemo(
    () => sortedEntries.filter((entry) => matchesJournalSearch(entry, search)),
    [search, sortedEntries]
  );

  useEffect(() => {
    if (!draftActive) return;
    try {
      writeJournalDraft(localStorage, { editingId, form: draft });
    } catch (storageError) {
      onDraftStorageError();
    }
  }, [draft, draftActive, editingId, onDraftStorageError]);

  useEffect(() => {
    const id = pendingHistoryScrollRef.current;
    if (!id) return;
    const node = entryRefs.current.get(id);
    if (!node) return;
    pendingHistoryScrollRef.current = null;
    node.scrollIntoView?.({ behavior: "smooth", block: "start" });
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

  function change(field, value) {
    setDraftActive(true);
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function persistCurrentDraft() {
    if (!draftActive) return;
    try {
      writeJournalDraft(localStorage, { editingId, form: draft });
    } catch (storageError) {
      onDraftStorageError();
    }
  }

  function backToTimeline() {
    persistCurrentDraft();
    onBack();
  }

  function submit(event) {
    event.preventDefault();
    const validation = validateJournalDraft(draft);
    if (validation.error) {
      setError(validation.error);
      persistCurrentDraft();
      return;
    }
    const saved = saveEntry(draft, editingId);
    if (!saved) return;
    try {
      clearJournalDraft(localStorage);
    } catch (storageError) {
      onDraftStorageError();
    }
    pendingHistoryScrollRef.current = saved.id;
    setExpandedIds((current) => new Set(current).add(saved.id));
    setEditingId(null);
    setDraft(emptyDraft());
    setError("");
    setShowRecoveredDraft(false);
    setDraftActive(false);
  }

  function beginEdit(entry) {
    setDraft(entryDraft(entry));
    setEditingId(entry.id);
    setDraftActive(true);
    setError("");
    window.requestAnimationFrame(() => editorRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" }));
  }

  function cancelEdit() {
    if (!window.confirm("Discard unsaved changes to this Journal entry?")) return;
    clearJournalDraft(localStorage);
    setEditingId(null);
    setDraft(emptyDraft());
    setError("");
    setShowRecoveredDraft(false);
    setDraftActive(false);
  }

  function discardDraft() {
    if (!window.confirm("Discard this unfinished Journal draft?")) return;
    clearJournalDraft(localStorage);
    setEditingId(null);
    setDraft(emptyDraft());
    setError("");
    setShowRecoveredDraft(false);
    setDraftActive(false);
  }

  function remove(entry) {
    if (!window.confirm("Delete this Journal entry?")) return;
    const index = visibleEntries.findIndex(({ id }) => id === entry.id);
    const restoreEntry = visibleEntries[index + 1] || visibleEntries[index - 1];
    if (!deleteEntry(entry.id)) return;
    pendingHistoryScrollRef.current = restoreEntry?.id || null;
    if (editingId === entry.id) {
      clearJournalDraft(localStorage);
      setEditingId(null);
      setDraft(emptyDraft());
      setShowRecoveredDraft(false);
      setDraftActive(false);
    }
  }

  return (
    <main className="journal-page" style={{ ...containerStyle, justifyContent: "flex-start" }}>
      <header className="journal-page__header">
        <BookIcon size={38} />
        <div>
          <h1 style={{ margin: 0 }}>Journal</h1>
          <p style={{ color: "#c8b99f", margin: "5px 0 0" }}>Private reflections in Trace. Entries are never shared.</p>
        </div>
      </header>
      <button type="button" onClick={backToTimeline} style={{ ...smallButtonStyle, backgroundColor: "#4b5563" }}>Back to Timeline</button>

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
            <button type="submit" style={{ ...smallButtonStyle, backgroundColor: "#75583d" }}>{editingId ? "Save Changes" : "Save Journal Entry"}</button>
            {editingId && <button type="button" onClick={cancelEdit} style={{ ...smallButtonStyle, backgroundColor: "#4b5563" }}>Cancel Edit</button>}
            {draftActive && <button type="button" onClick={discardDraft} style={{ ...smallButtonStyle, backgroundColor: "#6b3f3f" }}>Discard draft</button>}
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
                  {needsPreview && <button type="button" onClick={() => setExpandedIds((current) => { const next = new Set(current); if (expanded) next.delete(entry.id); else next.add(entry.id); return next; })} style={{ ...smallButtonStyle, backgroundColor: "#5b4634" }}>{expanded ? "Show less" : "Read full entry"}</button>}
                  <div className="journal-actions">
                    <button type="button" onClick={() => beginEdit(entry)} style={{ ...smallButtonStyle, backgroundColor: "#374151" }}>Edit</button>
                    <button type="button" onClick={() => remove(entry)} style={{ ...smallButtonStyle, backgroundColor: "#991b1b" }}>Delete</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <button type="button" onClick={backToTimeline} style={{ ...smallButtonStyle, backgroundColor: "#4b5563", marginTop: "24px" }}>Back to Timeline</button>
    </main>
  );
}
