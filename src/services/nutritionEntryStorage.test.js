import {
  NUTRITION_ENTRIES_STORAGE_KEY,
  NUTRITION_MUTATION_STATUS,
  NUTRITION_RECOVERY_STORAGE_KEY,
  NUTRITION_STORAGE_STATUS,
  appendNutritionEntry,
  deleteStoredNutritionEntry,
  readNutritionEntries,
  readNutritionRecoveryCollection,
  updateStoredNutritionEntry,
} from "./nutritionEntryStorage";

function storage(initial = {}, { failRecoveryWrite = false, failNutritionWrite = false } = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: jest.fn((key) => values.get(key) ?? null),
    setItem: jest.fn((key, value) => {
      if (failRecoveryWrite && key === NUTRITION_RECOVERY_STORAGE_KEY) throw new Error("recovery full");
      if (failNutritionWrite && key === NUTRITION_ENTRIES_STORAGE_KEY) throw new Error("nutrition full");
      values.set(key, String(value));
    }),
    removeItem: jest.fn((key) => values.delete(key)),
    value: (key) => values.get(key) ?? null,
  };
}

function validEntry(id, overrides = {}) {
  return {
    id,
    name: `Food ${id}`,
    loggedAt: "2026-09-09T12:00:00.000Z",
    calories: 100,
    protein: 10,
    carbohydrates: 12,
    fat: 4,
    notes: "",
    ...overrides,
  };
}

function add(storageTarget, entry = validEntry("ignored")) {
  return appendNutritionEntry(storageTarget, entry, {
    createId: (ids) => ids.has("new-entry") ? "new-entry-2" : "new-entry",
    now: () => new Date("2026-09-09T13:00:00.000Z"),
  });
}

test.each([
  { caseName: "malformed JSON", raw: "{not-json", reason: "malformed-json" },
  { caseName: "non-array JSON", raw: JSON.stringify({ records: [] }), reason: "not-array" },
])("blocks mutations for $caseName without replacing the source", ({ raw, reason }) => {
  const target = storage({ [NUTRITION_ENTRIES_STORAGE_KEY]: raw });

  const read = readNutritionEntries(target);
  const saved = add(target);

  expect(read).toMatchObject({
    status: NUTRITION_STORAGE_STATUS.BLOCKED,
    entries: [],
    mutationBlocked: true,
    reason,
    recoveryRaw: raw,
  });
  expect(saved.status).toBe(NUTRITION_MUTATION_STATUS.BLOCKED);
  expect(saved.message).toContain("Download the raw Nutrition recovery file");
  expect(target.value(NUTRITION_ENTRIES_STORAGE_KEY)).toBe(raw);
  expect(target.setItem).not.toHaveBeenCalled();
});

test("quarantines null, render-unsafe, invalid, missing-ID, and every duplicate-ID record", () => {
  const good = validEntry("good");
  const legacy = validEntry("legacy");
  const values = [
    good,
    legacy,
    null,
    validEntry("object-name", { name: { damaged: true } }),
    validEntry("bad-date", { loggedAt: "not-a-date" }),
    validEntry("bad-nutrient", { calories: { approximate: 100 } }),
    validEntry("bad-portion", { portion: { amount: { approximate: 1 } } }),
    validEntry("bad-portion-child", { portion: { amount: 1, unit: "serving", basis: { amount: 1, unit: "serving", description: { damaged: true } } } }),
    { name: "Missing ID", loggedAt: "2026-09-09T12:00:00.000Z" },
    validEntry("duplicate", { name: "First duplicate" }),
    validEntry("duplicate", { name: "Second duplicate" }),
  ];
  const raw = JSON.stringify(values);

  const read = readNutritionEntries(storage({ [NUTRITION_ENTRIES_STORAGE_KEY]: raw }));

  expect(read.status).toBe(NUTRITION_STORAGE_STATUS.PARTIAL);
  expect(read.entries).toEqual([good, legacy]);
  expect(read.damagedCount).toBe(9);
  expect(read.slots.filter((slot) => slot.reason === "duplicate-id")).toHaveLength(2);
  expect(read.recoveryRaw).toBe(raw);
});

test("normalizes a supported legacy numeric-string portion only in the readable projection", () => {
  const source = validEntry("legacy-portion", {
    portion: { amount: "0.5", unit: "serving" },
  });
  const raw = JSON.stringify([source]);
  const target = storage({ [NUTRITION_ENTRIES_STORAGE_KEY]: raw });

  const read = readNutritionEntries(target);

  expect(read.status).toBe(NUTRITION_STORAGE_STATUS.READY);
  expect(read.entries[0].portion.amount).toBe(0.5);
  expect(target.value(NUTRITION_ENTRIES_STORAGE_KEY)).toBe(raw);
  expect(target.setItem).not.toHaveBeenCalled();
});

test("add, edit, and delete use current storage while preserving damaged and unrelated members", () => {
  const damaged = { id: "damaged", name: { original: true }, privateNote: "retain exactly" };
  const first = validEntry("first");
  const second = validEntry("second");
  const originalRaw = JSON.stringify([null, damaged, first, second]);
  const target = storage({ [NUTRITION_ENTRIES_STORAGE_KEY]: originalRaw });

  const added = add(target, validEntry("ignored", { name: "Added" }));
  expect(added.status).toBe(NUTRITION_MUTATION_STATUS.SAVED);
  let stored = JSON.parse(target.value(NUTRITION_ENTRIES_STORAGE_KEY));
  expect(stored.slice(0, 4)).toEqual([null, damaged, first, second]);
  expect(stored[4]).toMatchObject({ id: "new-entry", name: "Added" });
  expect(readNutritionRecoveryCollection(target).snapshots[0].raw).toBe(originalRaw);

  target.setItem(NUTRITION_ENTRIES_STORAGE_KEY, JSON.stringify([
    ...stored,
    validEntry("newer-external", { name: "Written by another tab" }),
  ]));
  const updated = updateStoredNutritionEntry(target, "first", { name: "Updated current first" });
  expect(updated.status).toBe(NUTRITION_MUTATION_STATUS.SAVED);
  stored = JSON.parse(target.value(NUTRITION_ENTRIES_STORAGE_KEY));
  expect(stored).toEqual(expect.arrayContaining([
    null,
    damaged,
    expect.objectContaining({ id: "first", name: "Updated current first" }),
    second,
    expect.objectContaining({ id: "newer-external", name: "Written by another tab" }),
  ]));

  const deleted = deleteStoredNutritionEntry(target, "second");
  expect(deleted.status).toBe(NUTRITION_MUTATION_STATUS.SAVED);
  stored = JSON.parse(target.value(NUTRITION_ENTRIES_STORAGE_KEY));
  expect(stored.some((entry) => entry?.id === "second")).toBe(false);
  expect(stored[0]).toBeNull();
  expect(stored[1]).toEqual(damaged);
  expect(stored.some((entry) => entry?.id === "newer-external")).toBe(true);
});

test("blocks a mixed-data mutation when the exact raw recovery snapshot cannot be stored", () => {
  const raw = JSON.stringify([null, validEntry("good")]);
  const target = storage(
    { [NUTRITION_ENTRIES_STORAGE_KEY]: raw },
    { failRecoveryWrite: true }
  );

  const saved = add(target);

  expect(saved.status).toBe(NUTRITION_MUTATION_STATUS.ERROR);
  expect(saved.message).toContain("could not preserve the original damaged Nutrition data");
  expect(target.value(NUTRITION_ENTRIES_STORAGE_KEY)).toBe(raw);
  expect(target.setItem).not.toHaveBeenCalledWith(NUTRITION_ENTRIES_STORAGE_KEY, expect.anything());
});

test("a malformed existing recovery journal cannot be overwritten or used to authorize a mixed-data write", () => {
  const raw = JSON.stringify([null, validEntry("good")]);
  const malformedRecovery = "{not-recovery-json";
  const target = storage({
    [NUTRITION_ENTRIES_STORAGE_KEY]: raw,
    [NUTRITION_RECOVERY_STORAGE_KEY]: malformedRecovery,
  });

  const saved = add(target);

  expect(saved.status).toBe(NUTRITION_MUTATION_STATUS.ERROR);
  expect(saved.report.recoveryError).toBeInstanceOf(Error);
  expect(saved.report.recoveryRaw).toBe(raw);
  expect(target.value(NUTRITION_ENTRIES_STORAGE_KEY)).toBe(raw);
  expect(target.value(NUTRITION_RECOVERY_STORAGE_KEY)).toBe(malformedRecovery);
});

test("a failed Nutrition write leaves the readable state and source unchanged after preserving recovery", () => {
  const raw = JSON.stringify([null, validEntry("good")]);
  const target = storage(
    { [NUTRITION_ENTRIES_STORAGE_KEY]: raw },
    { failNutritionWrite: true }
  );

  const saved = updateStoredNutritionEntry(target, "good", { name: "Unsaved edit" }, {
    now: () => new Date("2026-09-09T13:00:00.000Z"),
  });

  expect(saved.status).toBe(NUTRITION_MUTATION_STATUS.ERROR);
  expect(saved.report.entries[0].name).toBe("Food good");
  expect(target.value(NUTRITION_ENTRIES_STORAGE_KEY)).toBe(raw);
  expect(readNutritionRecoveryCollection(target).snapshots[0].raw).toBe(raw);
});

test("does not allow edit or delete targets that were quarantined", () => {
  const duplicateOne = validEntry("duplicate", { name: "One" });
  const duplicateTwo = validEntry("duplicate", { name: "Two" });
  const raw = JSON.stringify([duplicateOne, duplicateTwo, validEntry("good")]);
  const target = storage({ [NUTRITION_ENTRIES_STORAGE_KEY]: raw });

  expect(updateStoredNutritionEntry(target, "duplicate", { name: "Overwrite" }).status)
    .toBe(NUTRITION_MUTATION_STATUS.NOT_FOUND);
  expect(deleteStoredNutritionEntry(target, "duplicate").status)
    .toBe(NUTRITION_MUTATION_STATUS.NOT_FOUND);
  expect(target.value(NUTRITION_ENTRIES_STORAGE_KEY)).toBe(raw);
});

test("detects a storage race before writing instead of overwriting a newer collection", () => {
  const originalRaw = JSON.stringify([validEntry("good")]);
  const newerRaw = JSON.stringify([validEntry("good"), validEntry("newer")]);
  const target = storage({ [NUTRITION_ENTRIES_STORAGE_KEY]: originalRaw });
  const baseGetItem = target.getItem.getMockImplementation();
  let nutritionReads = 0;
  target.getItem.mockImplementation((key) => {
    if (key === NUTRITION_ENTRIES_STORAGE_KEY) {
      nutritionReads += 1;
      if (nutritionReads === 2) return newerRaw;
    }
    return baseGetItem(key);
  });

  const updated = updateStoredNutritionEntry(target, "good", { name: "Stale overwrite" });

  expect(updated.status).toBe(NUTRITION_MUTATION_STATUS.CONFLICT);
  expect(updated.message).toContain("changed before this update could finish");
  expect(target.setItem).not.toHaveBeenCalledWith(NUTRITION_ENTRIES_STORAGE_KEY, expect.anything());
});
