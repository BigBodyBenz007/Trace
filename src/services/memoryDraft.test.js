import {
  clearMemoryDraft,
  createMemoryDraft,
  memoryDraftHasMeaningfulWork,
  memoryDraftPhoto,
  normalizeMemoryDraft,
  readMemoryDraft,
  writeMemoryDraft,
} from "./memoryDraft";

function storage(initial = null) {
  const values = new Map(initial ? [["memoryDraft", initial]] : []);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    value: (key) => values.get(key) ?? null,
  };
}

function draft(overrides = {}) {
  return createMemoryDraft({
    id: "memory-draft-1",
    memoryId: "future-memory-1",
    initialDate: "2026-09-09",
    form: {
      title: "Unfinished",
      description: "Every field survives",
      date: "2026-09-08",
      categories: ["Milestone", "Travel"],
    },
    photos: [{ id: "draft-photo-1", name: "memory.jpg", storedBytes: 1234 }],
    ...overrides,
  }, new Date("2026-09-09T12:00:00.000Z"));
}

test("round-trips every editable field and only serializable photo metadata", () => {
  const target = storage();
  const value = draft();
  writeMemoryDraft(target, value);

  expect(readMemoryDraft(target)).toEqual(value);
  expect(target.value("memoryDraft")).not.toMatch(/blob:|base64/i);
  expect(memoryDraftHasMeaningfulWork(value)).toBe(true);
});

test("missing, old, and malformed drafts fail closed without mutating storage", () => {
  expect(readMemoryDraft(storage())).toBeNull();
  const old = JSON.stringify({ ...draft(), schemaVersion: 0 });
  const malformed = storage(old);
  expect(readMemoryDraft(malformed)).toBeNull();
  expect(malformed.value("memoryDraft")).toBe(old);
  expect(normalizeMemoryDraft({ broken: true })).toBeNull();
});

test("an untouched default date is not meaningful, while a selected date is", () => {
  const empty = draft({
    form: { title: "", description: "", date: "2026-09-09", categories: [] },
    photos: [],
  });
  expect(memoryDraftHasMeaningfulWork(empty)).toBe(false);
  expect(memoryDraftHasMeaningfulWork({
    ...empty,
    form: { ...empty.form, date: "2026-09-07" },
  })).toBe(true);
  expect(memoryDraftHasMeaningfulWork({
    ...empty,
    form: { ...empty.form, date: "" },
  })).toBe(true);
});

test("photo normalization rejects IDs that could not durably reference IndexedDB", () => {
  expect(memoryDraftPhoto({ id: "photo-1", blob: new Blob(["bytes"]), url: "blob:unsafe" }))
    .toEqual({ id: "photo-1" });
  expect(memoryDraftPhoto({ id: "" })).toBeNull();
});

test("clear removes only the Memory draft key", () => {
  const target = storage(JSON.stringify(draft()));
  target.setItem("memories", "saved");
  clearMemoryDraft(target);
  expect(target.value("memoryDraft")).toBeNull();
  expect(target.value("memories")).toBe("saved");
});
