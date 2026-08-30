import {
  MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY,
  MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY,
  completeMedicationDoseOccurrence,
  createMedicationDoseSchedule,
  deleteMedicationDoseSchedule,
  emptyMedicationDoseOccurrenceCollection,
  emptyMedicationDoseScheduleCollection,
  endMedicationDoseSchedule,
  findMedicationDoseDuplicate,
  medicationDoseOccurrenceItem,
  medicationDoseOccurrencesForDate,
  medicationDoseDirectSourceId,
  medicationDoseSchedulePresentation,
  medicationDoseScheduleOccursOnDate,
  nextMedicationDoseOccurrence,
  normalizeMedicationDoseOccurrenceCollection,
  normalizeMedicationDoseSchedule,
  normalizeMedicationDoseScheduleCollection,
  persistMedicationDoseCompletion,
  persistMedicationDoseCompletionUndo,
  readMedicationDoseOccurrences,
  readMedicationDoseSchedules,
  recoverPendingMedicationDoseCompletion,
  removeMedicationDoseOccurrence,
  rescheduleMedicationDoseOccurrence,
  skipMedicationDoseOccurrence,
  updateMedicationDoseSchedule,
  undoMedicationDoseCompletion,
  upsertMedicationDoseOccurrence,
} from "./medicationDoseSchedule";

function draft(overrides = {}) {
  return {
    name: "Vitamin D",
    classification: "supplement",
    dose: { amount: 1, unit: "capsule" },
    route: { code: "oral" },
    notes: "With breakfast",
    source: { type: "saved-compound", id: "compound:vitamin-d" },
    compoundReference: { source: "trace-catalog", sourceId: "vitamin-d", category: "vitamin-mineral", modified: false },
    repeat: { type: "once" },
    startDate: "2026-08-29",
    endDate: null,
    time: "08:15",
    ...overrides,
  };
}

function schedule(overrides = {}) {
  return createMedicationDoseSchedule(draft(overrides), {
    id: `schedule:${overrides.id || "vitamin-d"}`,
    now: new Date("2026-08-29T12:00:00.000Z"),
  });
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: jest.fn((key) => values.has(key) ? values.get(key) : null),
    setItem: jest.fn((key, value) => values.set(key, String(value))),
    removeItem: jest.fn((key) => values.delete(key)),
    values,
  };
}

test("normalizes a valid versioned schedule and rejects malformed structured schedules", () => {
  const value = schedule();
  expect(normalizeMedicationDoseSchedule(value)).toEqual(value);
  expect(normalizeMedicationDoseSchedule({ ...value, schemaVersion: 99 })).toBeNull();
  expect(normalizeMedicationDoseScheduleCollection({
    ...emptyMedicationDoseScheduleCollection(),
    schedules: [{ ...value, revisions: [{ ...value.revisions[0], time: "25:00" }] }],
  })).toBeNull();
});

test("accepts stable direct-entry sources without changing existing source compatibility", () => {
  const directSourceId = medicationDoseDirectSourceId();
  expect(directSourceId).toMatch(/^medication-dose-source:/);
  expect(schedule({ source: { type: "direct-entry", id: directSourceId } })).toMatchObject({
    revisions: [expect.objectContaining({ source: { type: "direct-entry", id: directSourceId } })],
  });
  expect(schedule({ source: { type: "medication-entry", id: "entry:existing" } })).not.toBeNull();
  expect(schedule({ source: { type: "saved-compound", id: "compound:existing" } })).not.toBeNull();
});

test.each([
  ["one time", { type: "once" }, ["2026-08-29"], ["2026-08-30"]],
  ["every day", { type: "daily" }, ["2026-08-29", "2026-08-30"], []],
  ["selected weekdays", { type: "weekdays", weekdays: [1, 5] }, ["2026-08-31", "2026-09-04"], ["2026-09-01"]],
  ["every X days", { type: "interval", intervalDays: 3 }, ["2026-08-29", "2026-09-01", "2026-09-04"], ["2026-08-30", "2026-08-31"]],
])("generates %s using local date rules", (label, repeat, included, excluded) => {
  const value = schedule({ repeat });
  included.forEach((date) => expect(medicationDoseScheduleOccursOnDate(value, date)).toBe(true));
  excluded.forEach((date) => expect(medicationDoseScheduleOccursOnDate(value, date)).toBe(false));
});

test("honors optional recurring end dates", () => {
  const value = schedule({ repeat: { type: "daily" }, endDate: "2026-08-31" });
  expect(medicationDoseScheduleOccursOnDate(value, "2026-08-31")).toBe(true);
  expect(medicationDoseScheduleOccursOnDate(value, "2026-09-01")).toBe(false);
});

test.each([
  ["Scheduled", (item) => item],
  ["Taken", (item) => completeMedicationDoseOccurrence(item, new Date("2026-08-29T13:00:00.000Z"))],
  ["Skipped", (item) => skipMedicationDoseOccurrence(item, "Travel", "", new Date("2026-08-29T13:00:00.000Z"))],
  ["Removed", (item) => removeMedicationDoseOccurrence(item, new Date("2026-08-29T13:00:00.000Z"))],
])("derives the one-time %s label from its retained occurrence", (label, occurrenceFromItem) => {
  const value = schedule();
  const item = medicationDoseOccurrenceItem(value, "2026-08-29");
  const occurrence = occurrenceFromItem(item);
  const occurrences = occurrence === item ? [] : [occurrence];
  expect(medicationDoseSchedulePresentation(value, occurrences, "2026-08-29")).toMatchObject({
    type: "once",
    statusLabel: label,
  });
});

test("keeps recurring lifecycle separate from today's occurrence and finds the next scheduled dose", () => {
  const value = schedule({ repeat: { type: "daily" } });
  const completed = completeMedicationDoseOccurrence(
    medicationDoseOccurrenceItem(value, "2026-08-29"),
    new Date("2026-08-29T13:00:00.000Z")
  );
  const presentation = medicationDoseSchedulePresentation(value, [completed], "2026-08-29");
  expect(presentation).toMatchObject({
    type: "recurring",
    primaryStatusLabel: "Taken today",
    lifecycleLabel: "Active schedule",
    lifecycleText: "Schedule active",
    todayOccurrence: { status: "completed" },
    nextOccurrence: { scheduledDate: "2026-08-30", time: "08:15", status: "scheduled" },
  });
});

test("derives lifecycle badge and text when recurring schedules have no current occurrence", () => {
  const active = schedule({ repeat: { type: "daily" } });
  const ended = endMedicationDoseSchedule(active, "2026-08-30", new Date("2026-08-29T13:00:00.000Z"));
  const deleted = deleteMedicationDoseSchedule(active, "2026-08-30", new Date("2026-08-29T13:00:00.000Z"));
  expect(medicationDoseSchedulePresentation(ended, [], "2026-08-30")).toMatchObject({
    primaryStatusLabel: "Ended schedule",
    lifecycleLabel: "Ended schedule",
    lifecycleText: "Schedule ended",
  });
  expect(medicationDoseSchedulePresentation(deleted, [], "2026-08-30")).toMatchObject({
    primaryStatusLabel: "Deleted schedule",
    lifecycleLabel: "Deleted schedule",
    lifecycleText: "Schedule deleted",
  });
});

test("stores independent skip and reschedule state for individual recurring dates", () => {
  const value = schedule({ repeat: { type: "daily" } });
  const first = medicationDoseOccurrenceItem(value, "2026-08-29");
  const skipped = skipMedicationDoseOccurrence(first, "Other", "Travel", new Date("2026-08-29T13:00:00.000Z"));
  const occurrences = upsertMedicationDoseOccurrence([], skipped);
  expect(medicationDoseOccurrencesForDate([value], occurrences, "2026-08-29")[0]).toMatchObject({ status: "skipped", customSkipReason: "Travel" });
  expect(medicationDoseOccurrencesForDate([value], occurrences, "2026-08-30")[0]).toMatchObject({ status: "scheduled" });

  const rescheduled = rescheduleMedicationDoseOccurrence(
    medicationDoseOccurrencesForDate([value], occurrences, "2026-08-29")[0],
    "2026-09-02",
    "09:45",
    new Date("2026-08-29T14:00:00.000Z")
  );
  expect(rescheduled).toMatchObject({ status: "scheduled", skippedAt: null, skipReason: "", customSkipReason: "" });
  expect(medicationDoseOccurrencesForDate([value], [rescheduled], "2026-08-29")).toEqual([]);
  expect(medicationDoseOccurrencesForDate([value], [rescheduled], "2026-09-02"))
    .toEqual(expect.arrayContaining([expect.objectContaining({ id: rescheduled.id, time: "09:45" })]));
});

test("series edits and ending preserve modified occurrences while changing only unmodified dates", () => {
  const original = schedule({ repeat: { type: "daily" } });
  const skipped = skipMedicationDoseOccurrence(
    medicationDoseOccurrenceItem(original, "2026-09-02"),
    "Travel",
    "",
    new Date("2026-08-29T13:00:00.000Z")
  );
  const edited = updateMedicationDoseSchedule(
    original,
    draft({ dose: { amount: 2, unit: "capsule" }, repeat: { type: "daily" } }),
    "2026-08-30",
    new Date("2026-08-29T14:00:00.000Z")
  );
  expect(medicationDoseOccurrencesForDate([edited], [skipped], "2026-09-02")[0].snapshot.dose.amount).toBe(1);
  expect(medicationDoseOccurrencesForDate([edited], [skipped], "2026-09-03")[0].snapshot.dose.amount).toBe(2);

  const ended = endMedicationDoseSchedule(edited, "2026-08-31", new Date("2026-08-30T12:00:00.000Z"));
  expect(medicationDoseOccurrencesForDate([ended], [skipped], "2026-09-02")[0].status).toBe("skipped");
  expect(medicationDoseOccurrencesForDate([ended], [skipped], "2026-09-03")).toEqual([]);
  expect(deleteMedicationDoseSchedule(original, "2026-08-31")).toMatchObject({ status: "deleted" });
});

test("deleted schedules hide untouched occurrences and next-dose claims while preserving outcomes", () => {
  const active = schedule({ repeat: { type: "daily" } });
  const todayItem = medicationDoseOccurrenceItem(active, "2026-08-29");
  const futureScheduled = rescheduleMedicationDoseOccurrence(
    medicationDoseOccurrenceItem(active, "2026-08-30"),
    "2026-09-02",
    "09:45",
    new Date("2026-08-29T13:00:00.000Z")
  );
  const completed = completeMedicationDoseOccurrence(
    todayItem,
    new Date("2026-08-29T13:05:00.000Z")
  );
  const skipped = skipMedicationDoseOccurrence(
    medicationDoseOccurrenceItem(active, "2026-08-30"),
    "Travel",
    "",
    new Date("2026-08-30T13:05:00.000Z")
  );
  const deleted = deleteMedicationDoseSchedule(
    active,
    "2026-08-29",
    new Date("2026-08-29T14:00:00.000Z")
  );

  expect(medicationDoseOccurrencesForDate([deleted], [], "2026-08-29")).toEqual([]);
  expect(medicationDoseOccurrencesForDate([deleted], [futureScheduled], "2026-09-02")).toEqual([]);
  expect(nextMedicationDoseOccurrence(deleted, [futureScheduled], "2026-08-29")).toBeNull();
  expect(medicationDoseSchedulePresentation(deleted, [futureScheduled], "2026-08-29")).toMatchObject({
    primaryStatusLabel: "Deleted schedule",
    nextOccurrence: null,
    todayOccurrence: null,
  });
  expect(medicationDoseOccurrencesForDate([deleted], [completed], "2026-08-29")[0]).toMatchObject({
    status: "completed",
    historyEntryId: completed.historyEntryId,
  });
  expect(medicationDoseOccurrencesForDate([deleted], [skipped], "2026-08-30")[0]).toMatchObject({
    status: "skipped",
  });
  expect(deleteMedicationDoseSchedule(deleted, "2026-08-29")).toEqual(deleted);
});

test("ending preserves today's pending dose but stops all future and can then be deleted", () => {
  const active = schedule({ repeat: { type: "daily" } });
  const ended = endMedicationDoseSchedule(
    active,
    "2026-08-29",
    new Date("2026-08-29T14:00:00.000Z")
  );

  expect(medicationDoseOccurrencesForDate([ended], [], "2026-08-29")[0]).toMatchObject({
    status: "scheduled",
    scheduledDate: "2026-08-29",
  });
  expect(medicationDoseOccurrencesForDate([ended], [], "2026-08-30")).toEqual([]);
  expect(nextMedicationDoseOccurrence(ended, [], "2026-08-29")).toBeNull();
  expect(medicationDoseSchedulePresentation(ended, [], "2026-08-29")).toMatchObject({
    primaryStatusLabel: "Ended schedule",
    lifecycleText: "Schedule ended",
    todayOccurrence: { status: "scheduled" },
    nextOccurrence: null,
  });

  const deleted = deleteMedicationDoseSchedule(ended, "2026-08-29");
  expect(deleted).toMatchObject({ status: "deleted", inactiveFrom: "2026-08-29" });
  expect(medicationDoseOccurrencesForDate([deleted], [], "2026-08-29")).toEqual([]);
});

test("lifecycle derivation ignores malformed legacy schedule values safely", () => {
  const valid = schedule({ repeat: { type: "daily" } });
  const completed = completeMedicationDoseOccurrence(
    medicationDoseOccurrenceItem(valid, "2026-08-29"),
    new Date("2026-08-29T13:05:00.000Z")
  );
  expect(medicationDoseOccurrencesForDate([null, {}, { id: valid.id }], [completed], "2026-08-29"))
    .toEqual([]);
});

test("schedule snapshots stay independent of later source object changes", () => {
  const sourceDraft = draft();
  const value = createMedicationDoseSchedule(sourceDraft, { id: "schedule:snapshot", now: new Date("2026-08-29T12:00:00.000Z") });
  sourceDraft.name = "Changed name";
  sourceDraft.dose.amount = 99;
  sourceDraft.route.code = "topical";
  expect(medicationDoseOccurrenceItem(value, "2026-08-29").snapshot).toMatchObject({
    name: "Vitamin D",
    dose: { amount: 1 },
    route: { code: "oral" },
    source: { id: "compound:vitamin-d" },
  });
});

test("duplicate warnings include removed occurrences and permit excluding the edited schedule", () => {
  const existing = schedule();
  const removed = removeMedicationDoseOccurrence(
    medicationDoseOccurrenceItem(existing, "2026-08-29"),
    new Date("2026-08-29T13:00:00.000Z")
  );
  const candidate = schedule({ id: "copy" });
  expect(findMedicationDoseDuplicate([existing], [removed], candidate)).toMatchObject({ date: "2026-08-29", time: "08:15" });
  expect(findMedicationDoseDuplicate([existing], [removed], candidate, { excludeScheduleId: existing.id })).toBeNull();
});

test("strict occurrence collections reject invalid and duplicate identities", () => {
  const value = schedule();
  const removed = removeMedicationDoseOccurrence(medicationDoseOccurrenceItem(value, "2026-08-29"));
  expect(normalizeMedicationDoseOccurrenceCollection({
    ...emptyMedicationDoseOccurrenceCollection(),
    occurrences: [removed],
  })?.occurrences).toHaveLength(1);
  expect(normalizeMedicationDoseOccurrenceCollection({
    ...emptyMedicationDoseOccurrenceCollection(),
    occurrences: [removed, removed],
  })).toBeNull();
});

test("missing schedule storage migrates safely to empty collections", () => {
  const storage = memoryStorage();
  expect(readMedicationDoseSchedules(storage)).toEqual([]);
  expect(readMedicationDoseOccurrences(storage)).toEqual([]);
});

test("completion is idempotent and creates exactly one linked Medication History entry", () => {
  const storage = memoryStorage();
  const item = medicationDoseOccurrenceItem(schedule({
    source: { type: "direct-entry", id: "medication-dose-source:idempotent" },
  }), "2026-08-29");
  const first = persistMedicationDoseCompletion({
    storage,
    medicationEntries: [],
    occurrences: [],
    item,
    now: new Date("2026-08-29T13:10:00.000Z"),
  });
  expect(first.medicationEntries).toHaveLength(1);
  expect(first.medicationEntries[0]).toMatchObject({
    name: "Vitamin D",
    dose: { amount: 1, unit: "capsule" },
    route: { code: "oral" },
    notes: "With breakfast",
    scheduledDoseOccurrenceId: first.occurrence.id,
    scheduledDoseScheduleId: item.scheduleId,
    scheduledFor: { date: "2026-08-29", time: "08:15" },
  });

  const completedItem = { ...first.occurrence, occurrence: first.occurrence, schedule: item.schedule };
  const retry = persistMedicationDoseCompletion({
    storage,
    medicationEntries: first.medicationEntries,
    occurrences: first.occurrences,
    item: completedItem,
    now: new Date("2026-08-29T13:11:00.000Z"),
  });
  expect(retry.alreadyCompleted).toBe(true);
  expect(retry.medicationEntries).toHaveLength(1);
});

function completedUndoFixture() {
  const value = schedule({ repeat: { type: "daily" } });
  const original = medicationDoseOccurrenceItem(value, "2026-08-29");
  const rescheduled = rescheduleMedicationDoseOccurrence(
    original,
    "2026-08-29",
    "09:45",
    new Date("2026-08-29T12:30:00.000Z")
  );
  const item = medicationDoseOccurrenceItem(value, "2026-08-29", rescheduled);
  const manualEntry = {
    id: "manual:identical-vitamin-d",
    schemaVersion: 1,
    name: item.snapshot.name,
    dose: { ...item.snapshot.dose },
    route: { ...item.snapshot.route },
    occurredAt: "2026-08-29T13:00:00.000Z",
    notes: item.snapshot.notes,
    createdAt: "2026-08-29T13:00:00.000Z",
    updatedAt: "2026-08-29T13:00:00.000Z",
  };
  const occurrenceCollection = JSON.stringify({ schemaVersion: 1, occurrences: [rescheduled] });
  const storage = memoryStorage({
    medicationEntries: JSON.stringify([manualEntry]),
    [MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY]: occurrenceCollection,
  });
  const completed = persistMedicationDoseCompletion({
    storage,
    medicationEntries: [manualEntry],
    occurrences: [rescheduled],
    item,
    now: new Date("2026-08-29T13:10:00.000Z"),
  });
  return {
    schedule: value,
    storage,
    manualEntry,
    completed,
    completedItem: medicationDoseOccurrenceItem(value, "2026-08-29", completed.occurrence),
  };
}

test("undo completion removes only linked history and preserves occurrence scheduling identity", () => {
  const fixture = completedUndoFixture();
  const result = persistMedicationDoseCompletionUndo({
    storage: fixture.storage,
    medicationEntries: fixture.completed.medicationEntries,
    occurrences: fixture.completed.occurrences,
    item: fixture.completedItem,
    now: new Date("2026-08-29T13:20:00.000Z"),
  });

  expect(result.alreadyUndone).toBe(false);
  expect(result.medicationEntries).toEqual([fixture.manualEntry]);
  expect(result.removedHistoryEntry).toMatchObject({
    id: fixture.completed.occurrence.historyEntryId,
    scheduledDoseOccurrenceId: fixture.completed.occurrence.id,
    scheduledDoseScheduleId: fixture.completed.occurrence.scheduleId,
  });
  expect(result.occurrence).toMatchObject({
    id: fixture.completed.occurrence.id,
    scheduleId: fixture.completed.occurrence.scheduleId,
    originalDate: fixture.completed.occurrence.originalDate,
    originalTime: fixture.completed.occurrence.originalTime,
    scheduledDate: fixture.completed.occurrence.scheduledDate,
    time: fixture.completed.occurrence.time,
    rescheduledAt: fixture.completed.occurrence.rescheduledAt,
    snapshot: fixture.completed.occurrence.snapshot,
    status: "scheduled",
    completedAt: null,
    historyEntryId: null,
  });
  expect(fixture.storage.getItem(MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY)).toBeNull();

  const restoredItem = medicationDoseOccurrenceItem(
    fixture.schedule,
    result.occurrence.originalDate,
    result.occurrence
  );
  const completedAgain = persistMedicationDoseCompletion({
    storage: fixture.storage,
    medicationEntries: result.medicationEntries,
    occurrences: result.occurrences,
    item: restoredItem,
    now: new Date("2026-08-29T13:30:00.000Z"),
  });
  expect(completedAgain.medicationEntries).toHaveLength(2);
  expect(completedAgain.medicationEntries.filter(
    (entry) => entry.scheduledDoseOccurrenceId === result.occurrence.id
  )).toHaveLength(1);
  const retry = persistMedicationDoseCompletion({
    storage: fixture.storage,
    medicationEntries: completedAgain.medicationEntries,
    occurrences: completedAgain.occurrences,
    item: medicationDoseOccurrenceItem(
      fixture.schedule,
      completedAgain.occurrence.originalDate,
      completedAgain.occurrence
    ),
  });
  expect(retry.alreadyCompleted).toBe(true);
  expect(retry.medicationEntries).toHaveLength(2);
});

test("undo completion safely handles a missing linked history entry and repeated undo", () => {
  const fixture = completedUndoFixture();
  fixture.storage.setItem("medicationEntries", JSON.stringify([fixture.manualEntry]));
  const first = persistMedicationDoseCompletionUndo({
    storage: fixture.storage,
    medicationEntries: [fixture.manualEntry],
    occurrences: fixture.completed.occurrences,
    item: fixture.completedItem,
    now: new Date("2026-08-29T13:20:00.000Z"),
  });
  expect(first.removedHistoryEntry).toBeNull();
  expect(first.medicationEntries).toEqual([fixture.manualEntry]);

  const staleRetry = persistMedicationDoseCompletionUndo({
    storage: fixture.storage,
    medicationEntries: first.medicationEntries,
    occurrences: first.occurrences,
    item: fixture.completedItem,
    now: new Date("2026-08-29T13:20:30.000Z"),
  });
  expect(staleRetry.medicationEntries).toEqual([fixture.manualEntry]);
  expect(staleRetry.occurrence).toMatchObject({ status: "scheduled", historyEntryId: null });

  const writesBeforeRetry = fixture.storage.setItem.mock.calls.length;
  const retry = persistMedicationDoseCompletionUndo({
    storage: fixture.storage,
    medicationEntries: staleRetry.medicationEntries,
    occurrences: staleRetry.occurrences,
    item: staleRetry.occurrence,
    now: new Date("2026-08-29T13:21:00.000Z"),
  });
  expect(retry.alreadyUndone).toBe(true);
  expect(retry.medicationEntries).toEqual([fixture.manualEntry]);
  expect(fixture.storage.setItem).toHaveBeenCalledTimes(writesBeforeRetry);
});

test.each([
  ["history removal", "medicationEntries"],
  ["occurrence reset", MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY],
])("undo %s storage failure restores both collections", (label, failedKey) => {
  const fixture = completedUndoFixture();
  const previousEntries = fixture.storage.getItem("medicationEntries");
  const previousOccurrences = fixture.storage.getItem(MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY);
  const baseSet = fixture.storage.setItem;
  let shouldFail = true;
  fixture.storage.setItem = jest.fn((key, value) => {
    if (key === failedKey && shouldFail) {
      shouldFail = false;
      throw new Error("quota");
    }
    return baseSet(key, value);
  });

  expect(() => persistMedicationDoseCompletionUndo({
    storage: fixture.storage,
    medicationEntries: fixture.completed.medicationEntries,
    occurrences: fixture.completed.occurrences,
    item: fixture.completedItem,
    now: new Date("2026-08-29T13:20:00.000Z"),
  })).toThrow("previous data was restored");
  expect(fixture.storage.getItem("medicationEntries")).toBe(previousEntries);
  expect(fixture.storage.getItem(MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY)).toBe(previousOccurrences);
  expect(fixture.storage.getItem(MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY)).toBeNull();
});

test("undo startup recovery rolls a valid interrupted transaction forward", () => {
  const fixture = completedUndoFixture();
  const occurrence = undoMedicationDoseCompletion(
    fixture.completed.occurrence,
    new Date("2026-08-29T13:20:00.000Z")
  );
  const nextEntries = JSON.stringify([fixture.manualEntry]);
  const nextOccurrences = JSON.stringify({ schemaVersion: 1, occurrences: [occurrence] });
  const previousEntries = JSON.stringify(fixture.completed.medicationEntries);
  const previousOccurrences = JSON.stringify({ schemaVersion: 1, occurrences: fixture.completed.occurrences });
  const pending = memoryStorage({
    medicationEntries: nextEntries,
    [MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY]: previousOccurrences,
    [MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY]: JSON.stringify({
      schemaVersion: 1,
      id: occurrence.id,
      operation: "undo-completion",
      previous: { medicationEntries: previousEntries, medicationDoseOccurrences: previousOccurrences },
      next: { medicationEntries: nextEntries, medicationDoseOccurrences: nextOccurrences },
    }),
  });

  expect(recoverPendingMedicationDoseCompletion(pending)).toBe(true);
  expect(pending.getItem("medicationEntries")).toBe(nextEntries);
  expect(pending.getItem(MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY)).toBe(nextOccurrences);
  expect(pending.getItem(MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY)).toBeNull();
});

test("failed startup recovery of an interrupted undo restores its previous collections", () => {
  const fixture = completedUndoFixture();
  const occurrence = undoMedicationDoseCompletion(fixture.completed.occurrence);
  const previousEntries = JSON.stringify(fixture.completed.medicationEntries);
  const previousOccurrences = JSON.stringify({ schemaVersion: 1, occurrences: fixture.completed.occurrences });
  const pending = memoryStorage({
    medicationEntries: JSON.stringify([fixture.manualEntry]),
    [MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY]: previousOccurrences,
    [MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY]: JSON.stringify({
      schemaVersion: 1,
      id: occurrence.id,
      operation: "undo-completion",
      previous: { medicationEntries: previousEntries, medicationDoseOccurrences: previousOccurrences },
      next: {
        medicationEntries: JSON.stringify([fixture.manualEntry]),
        medicationDoseOccurrences: JSON.stringify({ schemaVersion: 1, occurrences: [occurrence] }),
      },
    }),
  });
  const baseSet = pending.setItem;
  let shouldFail = true;
  pending.setItem = jest.fn((key, value) => {
    if (key === MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY && shouldFail) {
      shouldFail = false;
      throw new Error("quota");
    }
    return baseSet(key, value);
  });

  expect(() => recoverPendingMedicationDoseCompletion(pending)).toThrow("previous data was restored");
  expect(pending.getItem("medicationEntries")).toBe(previousEntries);
  expect(pending.getItem(MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY)).toBe(previousOccurrences);
  expect(pending.getItem(MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY)).toBeNull();
});

test("completion rolls both collections back when the occurrence write fails", () => {
  const storage = memoryStorage({ medicationEntries: JSON.stringify([{ id: "existing" }]) });
  let shouldFail = true;
  const baseSet = storage.setItem;
  storage.setItem = jest.fn((key, value) => {
    if (key === MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY && shouldFail) {
      shouldFail = false;
      throw new Error("quota");
    }
    return baseSet(key, value);
  });
  const item = medicationDoseOccurrenceItem(schedule(), "2026-08-29");
  expect(() => persistMedicationDoseCompletion({
    storage,
    medicationEntries: [{ id: "existing" }],
    occurrences: [],
    item,
    now: new Date("2026-08-29T13:10:00.000Z"),
  })).toThrow("previous data was restored");
  expect(storage.getItem("medicationEntries")).toBe(JSON.stringify([{ id: "existing" }]));
  expect(storage.getItem(MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY)).toBeNull();
});

test("startup recovery safely rolls an interrupted linked completion forward", () => {
  const initial = memoryStorage();
  const item = medicationDoseOccurrenceItem(schedule(), "2026-08-29");
  const completed = persistMedicationDoseCompletion({
    storage: initial,
    medicationEntries: [],
    occurrences: [],
    item,
    now: new Date("2026-08-29T13:10:00.000Z"),
  });
  const nextEntries = JSON.stringify(completed.medicationEntries);
  const nextOccurrences = initial.getItem(MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY);
  const pending = memoryStorage({
    medicationEntries: "[]",
    [MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY]: JSON.stringify({
      schemaVersion: 1,
      id: completed.occurrence.id,
      previous: { medicationEntries: "[]", medicationDoseOccurrences: null },
      next: { medicationEntries: nextEntries, medicationDoseOccurrences: nextOccurrences },
    }),
  });
  expect(recoverPendingMedicationDoseCompletion(pending)).toBe(true);
  expect(pending.getItem("medicationEntries")).toBe(nextEntries);
  expect(pending.getItem(MEDICATION_DOSE_OCCURRENCES_STORAGE_KEY)).toBe(nextOccurrences);
  expect(pending.getItem(MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY)).toBeNull();
});
