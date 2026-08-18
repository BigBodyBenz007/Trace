import {
  clearJournalDraft,
  createJournalEntry,
  matchesJournalSearch,
  normalizeJournalTags,
  readJournalDraft,
  readJournalEntries,
  sortJournalEntriesNewestFirst,
  updateJournalEntry,
  writeJournalDraft,
  writeJournalEntries,
} from "./journalEntry";

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    value: (key) => values.get(key) ?? null,
  };
}

const draft = {
  title: "  A day  ",
  body: "  Private thought  ",
  date: "2026-08-18",
  time: "21:05",
  mood: "Calm",
  tags: "Reflection, family time, reflection",
};

test("creates an explicitly private entry and normalizes optional tags", () => {
  const result = createJournalEntry(draft, { id: "journal-1", now: () => new Date("2026-08-19T02:05:00.000Z") });
  expect(result.value).toEqual({
    id: "journal-1",
    schemaVersion: 1,
    visibility: "private",
    createdAt: "2026-08-19T02:05:00.000Z",
    updatedAt: "2026-08-19T02:05:00.000Z",
    title: "A day",
    body: "Private thought",
    date: "2026-08-18",
    time: "21:05",
    mood: "Calm",
    tags: ["Reflection", "family time"],
  });
  expect(createJournalEntry({ ...draft, body: " \n " }, { id: "bad" }).error).toMatch(/Write something/);
  expect(createJournalEntry({ ...draft, title: "", mood: "", tags: "" }, { id: "untitled" }).value)
    .toMatchObject({ title: "", tags: [], visibility: "private" });
});

test("updates preserve identity and createdAt while advancing updatedAt", () => {
  const existing = createJournalEntry(draft, { id: "stable", now: () => new Date("2026-08-18T10:00:00.000Z") }).value;
  const result = updateJournalEntry(existing, { ...draft, body: "Changed" }, { now: () => new Date("2026-08-19T10:00:00.000Z") });
  expect(result.value).toMatchObject({ id: "stable", createdAt: existing.createdAt, updatedAt: "2026-08-19T10:00:00.000Z", body: "Changed", visibility: "private" });
});

test("stored Journal data is safe, private, unique, and persistent", () => {
  const first = createJournalEntry(draft, { id: "one" }).value;
  const store = storage();
  writeJournalEntries(store, [first]);
  expect(readJournalEntries(store)).toEqual([first]);

  const unsafe = { ...first, visibility: "public", mood: "Invented", tags: ["  Long tag  "] };
  store.setItem("journalEntries", JSON.stringify([unsafe, unsafe, { broken: true }]));
  expect(readJournalEntries(store)).toEqual([{ ...first, mood: undefined, tags: ["Long tag"], visibility: "private" }].map((entry) => {
    const copy = { ...entry }; delete copy.mood; return copy;
  }));
  expect(() => readJournalEntries(storage({ journalEntries: "{}" }))).toThrow("Invalid Journal data");
});

test("Journal-only search covers content, mood, tags, and safe date tokens", () => {
  const entry = createJournalEntry(draft, { id: "search" }).value;
  ["private", "calm", "family", "August 18", "08/18/2026", "21:05"].forEach((query) => {
    expect(matchesJournalSearch(entry, query)).toBe(true);
  });
  expect(matchesJournalSearch(entry, "not present")).toBe(false);
  expect(normalizeJournalTags("One, one, TWO")).toEqual(["One", "TWO"]);
});

test("history sorts by selected local date and time newest first", () => {
  const entries = [
    createJournalEntry({ ...draft, date: "2026-01-01", time: "12:00" }, { id: "old" }).value,
    createJournalEntry({ ...draft, date: "2026-08-18", time: "09:00" }, { id: "new" }).value,
  ];
  expect(sortJournalEntriesNewestFirst(entries).map(({ id }) => id)).toEqual(["new", "old"]);
});

test("unfinished drafts round-trip separately and clear explicitly", () => {
  const store = storage();
  writeJournalDraft(store, { editingId: "one", form: draft });
  expect(readJournalDraft(store)).toMatchObject({ editingId: "one", form: draft });
  expect(store.value("journalEntries")).toBeNull();
  clearJournalDraft(store);
  expect(readJournalDraft(store)).toBeNull();
  expect(readJournalDraft(storage({ journalDraft: "malformed" }))).toBeNull();
});
