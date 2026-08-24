import {
  completeProtocolOccurrence,
  emptyProtocolOccurrenceCollection,
  findProtocolOccurrence,
  normalizeProtocolOccurrenceCollection,
  protocolOccurrenceId,
  readProtocolOccurrences,
  skipProtocolOccurrence,
  upsertProtocolOccurrence,
  writeProtocolOccurrences,
} from "./protocolOccurrence";

const IDENTITY = {
  protocolId: "protocol:recovery",
  itemId: "protocol-item:b12",
  date: "2026-08-24",
};
const NOW = new Date("2026-08-24T14:00:00.000Z");

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: jest.fn((key) => values.has(key) ? values.get(key) : null),
    setItem: jest.fn((key, value) => values.set(key, String(value))),
    value: (key) => values.get(key),
  };
}

test("records completion for one protocol item occurrence without changing the protocol", () => {
  const occurrence = completeProtocolOccurrence(null, IDENTITY, NOW);
  expect(occurrence).toEqual({
    schemaVersion: 1,
    id: protocolOccurrenceId(IDENTITY.protocolId, IDENTITY.itemId, IDENTITY.date),
    ...IDENTITY,
    status: "completed",
    completedAt: NOW.toISOString(),
    skippedAt: null,
    skipReason: "",
    customSkipReason: "",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  });
  expect(findProtocolOccurrence([occurrence], IDENTITY.protocolId, IDENTITY.itemId, "2026-08-31"))
    .toBeNull();
});

test("records a persisted skip reason for only the selected date", () => {
  const skipped = skipProtocolOccurrence(null, IDENTITY, "Other", "Travel day", NOW);
  expect(skipped).toMatchObject({
    status: "skipped",
    date: "2026-08-24",
    skipReason: "Other",
    customSkipReason: "Travel day",
    skippedAt: NOW.toISOString(),
    completedAt: null,
  });
  expect(skipProtocolOccurrence(null, IDENTITY, "Unknown reason", "", NOW)).toBeNull();
  expect(skipProtocolOccurrence(null, IDENTITY, "Schedule conflict", "extra", NOW)).toBeNull();
});

test("completes a previously skipped occurrence while retaining its skip provenance", () => {
  const skipped = skipProtocolOccurrence(null, IDENTITY, "Other", "Travel day", NOW);
  const completedAt = new Date("2026-08-24T16:00:00.000Z");
  const completed = completeProtocolOccurrence(skipped, IDENTITY, completedAt);

  expect(completed).toMatchObject({
    id: skipped.id,
    protocolId: IDENTITY.protocolId,
    itemId: IDENTITY.itemId,
    date: IDENTITY.date,
    status: "completed",
    completedAt: completedAt.toISOString(),
    skippedAt: NOW.toISOString(),
    skipReason: "Other",
    customSkipReason: "Travel day",
    createdAt: skipped.createdAt,
  });
  expect(findProtocolOccurrence([completed], IDENTITY.protocolId, IDENTITY.itemId, "2026-08-31"))
    .toBeNull();
});

test("upserts the same date occurrence while preserving creation time", () => {
  const completed = completeProtocolOccurrence(null, IDENTITY, NOW);
  const later = new Date("2026-08-24T15:00:00.000Z");
  const skipped = skipProtocolOccurrence(completed, IDENTITY, "Low energy", "", later);
  expect(skipped).toMatchObject({
    id: completed.id,
    createdAt: completed.createdAt,
    updatedAt: later.toISOString(),
    status: "skipped",
  });
  expect(upsertProtocolOccurrence([completed], skipped)).toEqual([skipped]);
});

test("reads and writes a strict versioned collection", () => {
  const store = storage();
  const occurrence = completeProtocolOccurrence(null, IDENTITY, NOW);
  expect(readProtocolOccurrences(store)).toEqual([]);
  expect(writeProtocolOccurrences(store, [occurrence])).toEqual([occurrence]);
  expect(JSON.parse(store.value("protocolOccurrences"))).toEqual({
    schemaVersion: 1,
    occurrences: [occurrence],
  });
  expect(readProtocolOccurrences(store)).toEqual([occurrence]);
  expect(emptyProtocolOccurrenceCollection()).toEqual({ schemaVersion: 1, occurrences: [] });
  expect(normalizeProtocolOccurrenceCollection({ schemaVersion: 1, occurrences: [occurrence, occurrence] }))
    .toBeNull();
  expect(() => writeProtocolOccurrences(store, [{ ...occurrence, date: "2026-02-30" }]))
    .toThrow("Invalid protocol occurrence data.");
});
