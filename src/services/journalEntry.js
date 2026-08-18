export const JOURNAL_ENTRY_STORAGE_KEY = "journalEntries";
export const JOURNAL_DRAFT_STORAGE_KEY = "journalDraft";
export const JOURNAL_SCHEMA_VERSION = 1;

export const JOURNAL_MOODS = Object.freeze([
  "Happy",
  "Excited",
  "Content",
  "Calm",
  "Neutral",
  "Tired",
  "Stressed",
  "Confused",
  "Sad",
  "Angry",
  "Anxious",
]);

function compactText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function validLocalDateTime(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^\d{2}:\d{2}$/.test(time || "")) return false;
  const value = new Date(`${date}T${time}`);
  if (Number.isNaN(value.getTime())) return false;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return value.getFullYear() === year && value.getMonth() === month - 1 &&
    value.getDate() === day && value.getHours() === hour && value.getMinutes() === minute;
}

export function normalizeJournalTags(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  const seen = new Set();
  return values.reduce((tags, item) => {
    const tag = compactText(item);
    const key = tag.toLocaleLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
    return tags;
  }, []);
}

export function validateJournalDraft(draft) {
  if (!String(draft?.body || "").trim()) return { error: "Write something before saving your Journal entry." };
  if (!validLocalDateTime(draft?.date, draft?.time)) return { error: "Enter a valid date and time." };
  const mood = compactText(draft?.mood);
  if (mood && !JOURNAL_MOODS.includes(mood)) return { error: "Select a valid mood." };
  return {
    value: {
      title: String(draft?.title || "").trim(),
      body: String(draft.body).trim(),
      date: draft.date,
      time: draft.time,
      ...(mood ? { mood } : {}),
      tags: normalizeJournalTags(draft?.tags),
    },
  };
}

export function createJournalEntry(draft, { id, now = () => new Date() } = {}) {
  const validation = validateJournalDraft(draft);
  if (validation.error) return validation;
  const timestamp = now().toISOString();
  return {
    value: {
      id,
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      visibility: "private",
      createdAt: timestamp,
      updatedAt: timestamp,
      ...validation.value,
    },
  };
}

export function updateJournalEntry(existing, draft, { now = () => new Date() } = {}) {
  const validation = validateJournalDraft(draft);
  if (validation.error) return validation;
  return {
    value: {
      ...validation.value,
      id: existing.id,
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      visibility: "private",
      createdAt: existing.createdAt,
      updatedAt: now().toISOString(),
    },
  };
}

function normalizeStoredEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  if (!compactText(entry.id) || !String(entry.body || "").trim()) return null;
  if (!validLocalDateTime(entry.date, entry.time)) return null;
  if (!entry.createdAt || Number.isNaN(Date.parse(entry.createdAt))) return null;
  const mood = JOURNAL_MOODS.includes(entry.mood) ? entry.mood : "";
  return {
    id: String(entry.id),
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    visibility: "private",
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt && !Number.isNaN(Date.parse(entry.updatedAt)) ? entry.updatedAt : entry.createdAt,
    title: String(entry.title || "").trim(),
    body: String(entry.body).trim(),
    date: entry.date,
    time: entry.time,
    ...(mood ? { mood } : {}),
    tags: normalizeJournalTags(entry.tags),
  };
}

export function readJournalEntries(storage = localStorage) {
  const raw = storage.getItem(JOURNAL_ENTRY_STORAGE_KEY);
  if (!raw) return [];
  const value = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("Invalid Journal data.");
  const ids = new Set();
  return value.reduce((entries, item) => {
    const entry = normalizeStoredEntry(item);
    if (entry && !ids.has(entry.id)) {
      ids.add(entry.id);
      entries.push(entry);
    }
    return entries;
  }, []);
}

export function writeJournalEntries(storage, entries) {
  storage.setItem(JOURNAL_ENTRY_STORAGE_KEY, JSON.stringify(entries));
}

export function readJournalDraft(storage = localStorage) {
  try {
    const value = JSON.parse(storage.getItem(JOURNAL_DRAFT_STORAGE_KEY));
    if (value?.schemaVersion !== JOURNAL_SCHEMA_VERSION || !value.form || typeof value.form !== "object") return null;
    return {
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      editingId: value.editingId ? String(value.editingId) : null,
      form: {
        title: String(value.form.title || ""),
        body: String(value.form.body || ""),
        date: String(value.form.date || ""),
        time: String(value.form.time || ""),
        mood: JOURNAL_MOODS.includes(value.form.mood) ? value.form.mood : "",
        tags: String(value.form.tags || ""),
      },
    };
  } catch (error) {
    return null;
  }
}

export function writeJournalDraft(storage, draft) {
  storage.setItem(JOURNAL_DRAFT_STORAGE_KEY, JSON.stringify({ schemaVersion: JOURNAL_SCHEMA_VERSION, ...draft }));
}

export function clearJournalDraft(storage = localStorage) {
  storage.removeItem(JOURNAL_DRAFT_STORAGE_KEY);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function journalDateSearchTokens(entry) {
  const [year, month, day] = String(entry?.date || "").split("-");
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) return [];
  return [entry.date, year, `${month}/${day}/${year}`, monthName, `${monthName} ${Number(day)}`, `${monthName} ${Number(day)} ${year}`, entry.time];
}

export function matchesJournalSearch(entry, query) {
  const normalized = compactText(query).toLocaleLowerCase();
  if (!normalized) return true;
  return compactText([
    entry?.title,
    entry?.body,
    entry?.mood,
    ...(Array.isArray(entry?.tags) ? entry.tags : []),
    ...journalDateSearchTokens(entry),
  ].join(" ")).toLocaleLowerCase().includes(normalized);
}

export function sortJournalEntriesNewestFirst(entries) {
  return [...entries].sort((first, second) => {
    const selected = `${second.date}T${second.time}`.localeCompare(`${first.date}T${first.time}`);
    if (selected) return selected;
    return String(second.createdAt).localeCompare(String(first.createdAt));
  });
}
