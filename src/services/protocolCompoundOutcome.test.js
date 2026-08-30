import {
  PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY,
  PROTOCOL_COMPOUND_TRANSACTION_KEY,
  createProtocolCompoundOutcome,
  emptyProtocolCompoundOutcomeCollection,
  normalizeProtocolCompoundOutcomeCollection,
  persistProtocolCompoundResults,
  persistProtocolCompoundUndo,
  protocolCompoundOutcomeCounts,
  protocolCompoundOutcomeStatus,
  readProtocolCompoundOutcomes,
  recoverPendingProtocolCompoundTransaction,
} from "./protocolCompoundOutcome";

const NOW = new Date("2026-08-29T13:00:00.000Z");
const DATE = "2026-08-29";

function protocol(overrides = {}) {
  return {
    id: "protocol:recovery",
    name: "Recovery protocol",
    notes: "Original protocol notes",
    items: [
      {
        id: "protocol-item:b12",
        compound: { name: "B12", reference: { source: "trace-catalog", sourceId: "b12", category: "medication" } },
        dose: { amount: 1, unit: "ml" },
        route: { code: "subcutaneous" },
        schedule: { type: "weekly-days", weekdays: [6] },
        notes: "Morning dose",
      },
      {
        id: "protocol-item:peptide",
        compound: { name: "Peptide A" },
        dose: { amount: 250, unit: "mcg" },
        route: { code: "subcutaneous" },
        schedule: { type: "weekly-days", weekdays: [6] },
        notes: "Evening dose",
      },
    ],
    ...overrides,
  };
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: jest.fn((key) => values.has(key) ? values.get(key) : null),
    setItem: jest.fn((key, value) => values.set(key, String(value))),
    removeItem: jest.fn((key) => values.delete(key)),
    value: (key) => values.get(key),
  };
}

function candidate(value = protocol()) {
  return createProtocolCompoundOutcome(value, value.items, DATE, NOW);
}

function persistedState({ decisions, entries = [], outcomes = [], occurrences = [] } = {}) {
  const store = memoryStorage({
    medicationEntries: JSON.stringify(entries),
    [PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY]: JSON.stringify({ schemaVersion: 1, occurrences: outcomes }),
    protocolOccurrences: JSON.stringify({ schemaVersion: 1, occurrences }),
  });
  const result = persistProtocolCompoundResults({
    storage: store,
    outcomes,
    protocolOccurrences: occurrences,
    medicationEntries: entries,
    candidate: candidate(),
    decisions,
    now: NOW,
  });
  return { store, result };
}

test("creates an immutable multi-compound snapshot with stable component identities", () => {
  const legacy = protocol({
    items: [{ ...protocol().items[0], id: undefined }, protocol().items[1]],
  });
  const outcome = createProtocolCompoundOutcome(legacy, legacy.items, DATE, NOW);
  expect(outcome).toMatchObject({
    protocolId: legacy.id,
    date: DATE,
    protocolSnapshot: { name: "Recovery protocol", notes: "Original protocol notes" },
    components: [
      expect.objectContaining({
        id: expect.stringMatching(/^protocol-outcome-component:/),
        sourceItemId: null,
        snapshot: { name: "B12", dose: { amount: 1, unit: "ml" }, route: { code: "subcutaneous" }, notes: "Morning dose", schedule: { type: "weekly-days", weekdays: [6] }, compoundReference: expect.any(Object) },
        status: "not-yet",
      }),
      expect.objectContaining({ id: "protocol-item:peptide", status: "not-yet" }),
    ],
  });
  legacy.items[0].compound.name = "Changed later";
  expect(outcome.components[0].snapshot.name).toBe("B12");
  expect(normalizeProtocolCompoundOutcomeCollection({ schemaVersion: 1, occurrences: [outcome] })?.occurrences).toEqual([outcome]);
});

test("one Taken and one Not yet logs only one entry and remains partial", () => {
  const value = candidate();
  const { result, store } = persistedState({
    decisions: {
      [value.components[0].id]: "taken",
      [value.components[1].id]: "not-yet",
    },
  });
  expect(result.status).toBe("partial");
  expect(protocolCompoundOutcomeStatus(result.outcome)).toBe("partial");
  expect(protocolCompoundOutcomeCounts(result.outcome)).toEqual({ taken: 1, skipped: 0, notYet: 1 });
  expect(result.medicationEntries).toHaveLength(1);
  expect(result.medicationEntries[0]).toMatchObject({
    name: "B12",
    protocolId: "protocol:recovery",
    protocolOccurrenceDate: DATE,
    protocolComponentId: "protocol-item:b12",
    protocolCompoundOutcomeId: result.outcome.id,
    protocolSourceSnapshot: {
      protocolName: "Recovery protocol",
      component: expect.objectContaining({ name: "B12", dose: { amount: 1, unit: "ml" } }),
    },
  });
  expect(result.protocolOccurrences).toEqual([]);
  expect(store.getItem(PROTOCOL_COMPOUND_TRANSACTION_KEY)).toBeNull();
});

test("Taken plus Skipped resolves the parent and returning later logs only the outstanding compound", () => {
  const value = candidate();
  const first = persistedState({
    decisions: {
      [value.components[0].id]: "taken",
      [value.components[1].id]: "not-yet",
    },
  });
  const second = persistProtocolCompoundResults({
    storage: first.store,
    outcomes: first.result.outcomes,
    protocolOccurrences: first.result.protocolOccurrences,
    medicationEntries: first.result.medicationEntries,
    candidate: createProtocolCompoundOutcome(
      protocol({ name: "Edited protocol", items: protocol().items.map((item) => ({ ...item, compound: { ...item.compound, name: `${item.compound.name} changed` } })) }),
      protocol().items,
      DATE,
      new Date("2026-08-29T14:00:00.000Z")
    ),
    decisions: {
      [value.components[0].id]: "taken",
      [value.components[1].id]: "skipped",
    },
    now: new Date("2026-08-29T14:00:00.000Z"),
  });
  expect(second.status).toBe("completed");
  expect(second.medicationEntries).toHaveLength(1);
  expect(second.protocolOccurrences).toHaveLength(2);
  expect(second.outcome.protocolSnapshot.name).toBe("Recovery protocol");
  expect(second.outcome.components.map(({ snapshot }) => snapshot.name)).toEqual(["B12", "Peptide A"]);
  expect(protocolCompoundOutcomeCounts(second.outcome)).toEqual({ taken: 1, skipped: 1, notYet: 0 });
});

test("all Taken creates one deterministic history entry per compound and stale resubmission is idempotent", () => {
  const value = candidate();
  const decisions = Object.fromEntries(value.components.map(({ id }) => [id, "taken"]));
  const first = persistedState({ decisions });
  expect(first.result.medicationEntries).toHaveLength(2);
  expect(new Set(first.result.medicationEntries.map(({ id }) => id)).size).toBe(2);
  const retry = persistProtocolCompoundResults({
    storage: first.store,
    outcomes: first.result.outcomes,
    protocolOccurrences: first.result.protocolOccurrences,
    medicationEntries: first.result.medicationEntries,
    candidate: value,
    decisions,
    now: new Date("2026-08-29T13:01:00.000Z"),
  });
  expect(retry.medicationEntries).toHaveLength(2);
  expect(retry.outcome.components.every(({ status }) => status === "taken")).toBe(true);
});

test("Undo taken removes only its linked automatic entry and Undo skip returns only that component", () => {
  const value = candidate();
  const manualEntry = {
    id: "manual:identical",
    name: "B12",
    dose: { amount: 1, unit: "ml" },
    route: { code: "subcutaneous" },
  };
  const first = persistedState({
    entries: [manualEntry],
    decisions: {
      [value.components[0].id]: "taken",
      [value.components[1].id]: "skipped",
    },
  });
  const undoneTaken = persistProtocolCompoundUndo({
    storage: first.store,
    outcomes: first.result.outcomes,
    protocolOccurrences: first.result.protocolOccurrences,
    medicationEntries: first.result.medicationEntries,
    outcomeId: first.result.outcome.id,
    componentId: value.components[0].id,
    now: new Date("2026-08-29T14:00:00.000Z"),
  });
  expect(undoneTaken.medicationEntries).toEqual([manualEntry]);
  expect(undoneTaken.outcome.components[0]).toMatchObject({ status: "not-yet", historyEntryId: null, takenAt: null });
  expect(undoneTaken.outcome.components[1].status).toBe("skipped");
  expect(undoneTaken.protocolOccurrences).toEqual([]);

  const undoneSkip = persistProtocolCompoundUndo({
    storage: first.store,
    outcomes: undoneTaken.outcomes,
    protocolOccurrences: undoneTaken.protocolOccurrences,
    medicationEntries: undoneTaken.medicationEntries,
    outcomeId: first.result.outcome.id,
    componentId: value.components[1].id,
    now: new Date("2026-08-29T14:01:00.000Z"),
  });
  expect(undoneSkip.outcome.components.every(({ status }) => status === "not-yet")).toBe(true);
  const retry = persistProtocolCompoundUndo({
    storage: first.store,
    outcomes: undoneSkip.outcomes,
    protocolOccurrences: undoneSkip.protocolOccurrences,
    medicationEntries: undoneSkip.medicationEntries,
    outcomeId: first.result.outcome.id,
    componentId: value.components[1].id,
  });
  expect(retry.alreadyUndone).toBe(true);
});

test("Undo taken tolerates an already-missing linked entry and re-completion creates one replacement", () => {
  const value = candidate();
  const first = persistedState({
    decisions: {
      [value.components[0].id]: "taken",
      [value.components[1].id]: "not-yet",
    },
  });
  const undone = persistProtocolCompoundUndo({
    storage: first.store,
    outcomes: first.result.outcomes,
    protocolOccurrences: first.result.protocolOccurrences,
    medicationEntries: [],
    outcomeId: first.result.outcome.id,
    componentId: value.components[0].id,
    now: new Date("2026-08-29T14:00:00.000Z"),
  });
  expect(undone.medicationEntries).toEqual([]);
  expect(undone.outcome.components[0].status).toBe("not-yet");
  const completedAgain = persistProtocolCompoundResults({
    storage: first.store,
    outcomes: undone.outcomes,
    protocolOccurrences: undone.protocolOccurrences,
    medicationEntries: undone.medicationEntries,
    candidate: value,
    decisions: {
      [value.components[0].id]: "taken",
      [value.components[1].id]: "not-yet",
    },
    now: new Date("2026-08-29T14:01:00.000Z"),
  });
  expect(completedAgain.medicationEntries).toHaveLength(1);
  expect(completedAgain.medicationEntries[0].protocolComponentId).toBe(value.components[0].id);
});

test.each([
  ["Medication History", "medicationEntries"],
  ["compound outcomes", PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY],
  ["parent status", "protocolOccurrences"],
])("%s write failure rolls a compound Undo transaction back", (label, failedKey) => {
  const value = candidate();
  const first = persistedState({
    decisions: Object.fromEntries(value.components.map(({ id }) => [id, "taken"])),
  });
  const entriesRaw = first.store.getItem("medicationEntries");
  const outcomesRaw = first.store.getItem(PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY);
  const occurrencesRaw = first.store.getItem("protocolOccurrences");
  const baseSet = first.store.setItem;
  let shouldFail = true;
  first.store.setItem = jest.fn((key, data) => {
    if (key === failedKey && shouldFail) {
      shouldFail = false;
      throw new Error("quota");
    }
    return baseSet(key, data);
  });
  expect(() => persistProtocolCompoundUndo({
    storage: first.store,
    outcomes: first.result.outcomes,
    protocolOccurrences: first.result.protocolOccurrences,
    medicationEntries: first.result.medicationEntries,
    outcomeId: first.result.outcome.id,
    componentId: value.components[0].id,
    now: new Date("2026-08-29T14:00:00.000Z"),
  })).toThrow("previous data was restored");
  expect(first.store.getItem("medicationEntries")).toBe(entriesRaw);
  expect(first.store.getItem(PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY)).toBe(outcomesRaw);
  expect(first.store.getItem("protocolOccurrences")).toBe(occurrencesRaw);
  expect(first.store.getItem(PROTOCOL_COMPOUND_TRANSACTION_KEY)).toBeNull();
});

test.each([
  ["Medication History", "medicationEntries"],
  ["compound outcomes", PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY],
  ["parent status", "protocolOccurrences"],
])("%s write failure rolls every Protocol result collection back", (label, failedKey) => {
  const value = candidate();
  const entriesRaw = "[]";
  const outcomesRaw = JSON.stringify(emptyProtocolCompoundOutcomeCollection());
  const occurrencesRaw = JSON.stringify({ schemaVersion: 1, occurrences: [] });
  const store = memoryStorage({
    medicationEntries: entriesRaw,
    [PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY]: outcomesRaw,
    protocolOccurrences: occurrencesRaw,
  });
  const baseSet = store.setItem;
  let shouldFail = true;
  store.setItem = jest.fn((key, data) => {
    if (key === failedKey && shouldFail) {
      shouldFail = false;
      throw new Error("quota");
    }
    return baseSet(key, data);
  });
  expect(() => persistProtocolCompoundResults({
    storage: store,
    outcomes: [],
    protocolOccurrences: [],
    medicationEntries: [],
    candidate: value,
    decisions: Object.fromEntries(value.components.map(({ id }) => [id, "taken"])),
    now: NOW,
  })).toThrow("previous data was restored");
  expect(store.getItem("medicationEntries")).toBe(entriesRaw);
  expect(store.getItem(PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY)).toBe(outcomesRaw);
  expect(store.getItem("protocolOccurrences")).toBe(occurrencesRaw);
  expect(store.getItem(PROTOCOL_COMPOUND_TRANSACTION_KEY)).toBeNull();
});

test("reads strict collections and startup recovery finishes an interrupted result transaction", () => {
  const value = candidate();
  const completed = persistedState({
    decisions: Object.fromEntries(value.components.map(({ id }) => [id, "taken"])),
  }).result;
  const next = {
    medicationEntries: JSON.stringify(completed.medicationEntries),
    protocolCompoundOutcomes: JSON.stringify({ schemaVersion: 1, occurrences: completed.outcomes }),
    protocolOccurrences: JSON.stringify({ schemaVersion: 1, occurrences: completed.protocolOccurrences }),
  };
  const store = memoryStorage({
    medicationEntries: "[]",
    [PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY]: next.protocolCompoundOutcomes,
    protocolOccurrences: JSON.stringify({ schemaVersion: 1, occurrences: [] }),
    [PROTOCOL_COMPOUND_TRANSACTION_KEY]: JSON.stringify({
      schemaVersion: 1,
      id: value.id,
      operation: "save-results",
      previous: {
        medicationEntries: "[]",
        protocolCompoundOutcomes: JSON.stringify(emptyProtocolCompoundOutcomeCollection()),
        protocolOccurrences: JSON.stringify({ schemaVersion: 1, occurrences: [] }),
      },
      next,
    }),
  });
  expect(recoverPendingProtocolCompoundTransaction(store)).toBe(true);
  expect(store.getItem("medicationEntries")).toBe(next.medicationEntries);
  expect(store.getItem("protocolOccurrences")).toBe(next.protocolOccurrences);
  expect(store.getItem(PROTOCOL_COMPOUND_TRANSACTION_KEY)).toBeNull();
  expect(readProtocolCompoundOutcomes(store)).toEqual(completed.outcomes);
});

test("startup recovery rolls all collections back when a forward write fails", () => {
  const value = candidate();
  const completed = persistedState({
    decisions: Object.fromEntries(value.components.map(({ id }) => [id, "taken"])),
  }).result;
  const previous = {
    medicationEntries: "[]",
    protocolCompoundOutcomes: JSON.stringify(emptyProtocolCompoundOutcomeCollection()),
    protocolOccurrences: JSON.stringify({ schemaVersion: 1, occurrences: [] }),
  };
  const next = {
    medicationEntries: JSON.stringify(completed.medicationEntries),
    protocolCompoundOutcomes: JSON.stringify({ schemaVersion: 1, occurrences: completed.outcomes }),
    protocolOccurrences: JSON.stringify({ schemaVersion: 1, occurrences: completed.protocolOccurrences }),
  };
  const store = memoryStorage({
    ...previous,
    [PROTOCOL_COMPOUND_TRANSACTION_KEY]: JSON.stringify({
      schemaVersion: 1,
      id: value.id,
      operation: "save-results",
      previous,
      next,
    }),
  });
  const baseSet = store.setItem;
  let shouldFail = true;
  store.setItem = jest.fn((key, data) => {
    if (key === PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY && shouldFail) {
      shouldFail = false;
      throw new Error("quota");
    }
    return baseSet(key, data);
  });
  expect(() => recoverPendingProtocolCompoundTransaction(store)).toThrow("previous data was restored");
  expect(store.getItem("medicationEntries")).toBe(previous.medicationEntries);
  expect(store.getItem(PROTOCOL_COMPOUND_OUTCOMES_STORAGE_KEY)).toBe(previous.protocolCompoundOutcomes);
  expect(store.getItem("protocolOccurrences")).toBe(previous.protocolOccurrences);
  expect(store.getItem(PROTOCOL_COMPOUND_TRANSACTION_KEY)).toBeNull();
});
