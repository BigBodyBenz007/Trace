import {
  getMedicationEntryLocalDateKey,
  getVisibleMedicationHistory,
  normalizeMedicationHistoryQuery,
} from "./medicationHistory";

function localEntry(id, name, year, month, day, hour, minute = 0) {
  return { id, name, occurredAt: new Date(year, month, day, hour, minute).toISOString() };
}

test("normalizes case and whitespace without mutating entries", () => {
  const entries = [localEntry("one", "Alpha   Peptide", 2026, 7, 10, 12)];
  const snapshot = JSON.parse(JSON.stringify(entries));
  expect(normalizeMedicationHistoryQuery("  ALPHA    peptide ")).toBe("alpha peptide");
  expect(getVisibleMedicationHistory(entries, " alpha  PEPTIDE ")[0].entries).toEqual(entries);
  expect(entries).toEqual(snapshot);
});

test("groups by local date with newest groups and entries first", () => {
  const groups = getVisibleMedicationHistory([
    localEntry("older-day", "Older day", 2026, 7, 9, 23),
    localEntry("newer-time", "Newer time", 2026, 7, 10, 18),
    localEntry("older-time", "Older time", 2026, 7, 10, 8),
  ]);
  expect(groups.map((group) => group.dateKey)).toEqual(["2026-08-10", "2026-08-09"]);
  expect(groups[0].entries.map((entry) => entry.id)).toEqual(["newer-time", "older-time"]);
});

test("uses the local calendar date across UTC boundaries", () => {
  const entry = localEntry("boundary", "Boundary", 2026, 7, 10, 23, 30);
  expect(getMedicationEntryLocalDateKey(entry)).toBe("2026-08-10");
});

test("breaks identical timestamps deterministically by entry id", () => {
  const occurredAt = new Date(2026, 7, 10, 12).toISOString();
  const groups = getVisibleMedicationHistory([
    { id: "entry-b", name: "Second", occurredAt },
    { id: "entry-a", name: "First", occurredAt },
  ]);
  expect(groups[0].entries.map((entry) => entry.id)).toEqual(["entry-a", "entry-b"]);
});
