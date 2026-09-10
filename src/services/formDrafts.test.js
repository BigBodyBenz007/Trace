import {
  FORM_DRAFTS_STORAGE_KEY,
  clearFormDraft,
  clearFormDraftsForContext,
  clearFormDraftsForContextPrefix,
  emptyFormDraftCollection,
  formDraftFingerprint,
  formDraftHasMeaningfulWork,
  formDraftValueMatchesShape,
  normalizeFormDraftCollection,
  readFormDraft,
  readFormDraftCollection,
  writeFormDraft,
} from "./formDrafts";

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    value: (key) => values.get(key) ?? null,
  };
}

const createContext = { domain: "nutrition-entry", context: "create", sourceFingerprint: null };

test("round-trips exact blank and invalid form input without creating a saved record", () => {
  const target = storage({ nutritionEntries: JSON.stringify([{ id: "saved" }]) });
  const initial = { name: "", date: "2026-09-09", amount: "1", nested: { selected: [] } };
  const value = { name: "Half typed", date: "", amount: "invalid", nested: { selected: ["one"] } };

  const written = writeFormDraft(target, createContext, initial, value, new Date("2026-09-09T12:00:00.000Z"));

  expect(formDraftHasMeaningfulWork(written)).toBe(true);
  expect(readFormDraft(target, createContext)).toMatchObject({ status: "restored", value });
  expect(JSON.parse(target.value("nutritionEntries"))).toEqual([{ id: "saved" }]);
});

test("isolates create and record-specific edit drafts and rejects a changed saved baseline", () => {
  const target = storage();
  const savedOne = { id: "one", name: "Original", updatedAt: "2026-09-01T00:00:00.000Z" };
  const savedTwo = { id: "two", name: "Other", updatedAt: "2026-09-01T00:00:00.000Z" };
  const contextOne = { domain: "health-measurement", context: "edit:one", sourceFingerprint: formDraftFingerprint(savedOne) };
  const contextTwo = { domain: "health-measurement", context: "edit:two", sourceFingerprint: formDraftFingerprint(savedTwo) };
  writeFormDraft(target, createContext, { name: "" }, { name: "Create" });
  writeFormDraft(target, contextOne, { notes: "Original" }, { notes: "Draft one" });
  writeFormDraft(target, contextTwo, { notes: "Other" }, { notes: "Draft two" });

  expect(readFormDraft(target, contextOne).value.notes).toBe("Draft one");
  expect(readFormDraft(target, contextTwo).value.notes).toBe("Draft two");
  expect(readFormDraft(target, createContext).value.name).toBe("Create");
  expect(readFormDraft(target, {
    ...contextOne,
    sourceFingerprint: formDraftFingerprint({ ...savedOne, name: "Newer saved value" }),
  })).toMatchObject({ status: "conflict", value: null });
  expect(readFormDraftCollection(target).entries).toHaveLength(3);
});

test("reverting to the initial value removes only that form context", () => {
  const target = storage();
  const other = { domain: "protocol", context: "create", sourceFingerprint: null };
  writeFormDraft(target, createContext, { name: "" }, { name: "Meal" });
  writeFormDraft(target, other, { name: "" }, { name: "Plan" });
  expect(writeFormDraft(target, createContext, { name: "" }, { name: "" })).toBeNull();
  expect(readFormDraft(target, createContext).status).toBe("missing");
  expect(readFormDraft(target, other).value).toEqual({ name: "Plan" });
});

test("confirmed cleanup removes only the exact draft or requested record prefix", () => {
  const target = storage();
  const first = { domain: "daily-action", context: "edit:one", sourceFingerprint: "one" };
  const second = { domain: "daily-action", context: "edit:two", sourceFingerprint: "two" };
  const create = { domain: "daily-action", context: "create:2026-09-09", sourceFingerprint: null };
  writeFormDraft(target, first, {}, { title: "One" });
  writeFormDraft(target, second, {}, { title: "Two" });
  writeFormDraft(target, create, {}, { title: "Create" });

  expect(clearFormDraft(target, first)).toBe(true);
  expect(clearFormDraftsForContext(target, "daily-action", "edit:two")).toBe(true);
  expect(readFormDraft(target, create).value.title).toBe("Create");
});

test("record cleanup does not remove a different record whose context shares a text prefix", () => {
  const target = storage();
  const deleted = { domain: "protocol", context: "edit:record", sourceFingerprint: "old" };
  const similarlyNamed = { domain: "protocol", context: "edit:record-two", sourceFingerprint: "other" };
  writeFormDraft(target, deleted, {}, { name: "Delete" });
  writeFormDraft(target, similarlyNamed, {}, { name: "Keep" });

  expect(clearFormDraftsForContext(target, "protocol", "edit:record")).toBe(true);
  expect(readFormDraft(target, similarlyNamed).value.name).toBe("Keep");
});

test("missing, old, malformed, and unsupported draft data fail closed without mutation", () => {
  expect(readFormDraftCollection(storage())).toEqual(emptyFormDraftCollection());
  const malformedBytes = "{not-json";
  const malformed = storage({ [FORM_DRAFTS_STORAGE_KEY]: malformedBytes });
  expect(readFormDraft(malformed, createContext).status).toBe("malformed");
  expect(() => writeFormDraft(malformed, createContext, {}, { name: "Keep" })).toThrow("malformed");
  expect(() => clearFormDraft(malformed, createContext)).toThrow("malformed");
  expect(malformed.value(FORM_DRAFTS_STORAGE_KEY)).toBe(malformedBytes);
  expect(normalizeFormDraftCollection({ schemaVersion: 0, entries: [] })).toBeNull();
  expect(normalizeFormDraftCollection({ schemaVersion: 1, entries: [{ domain: "bad" }] })).toBeNull();
});

test("shape validation quarantines a structurally incompatible draft without deleting it", () => {
  const target = storage();
  writeFormDraft(target, createContext, { name: "", items: [] }, { name: "Draft", items: "not-an-array" });

  expect(readFormDraft(target, createContext, { name: "", items: [] })).toMatchObject({
    status: "invalid-value",
    value: null,
  });
  expect(readFormDraftCollection(target).entries).toHaveLength(1);
  expect(formDraftValueMatchesShape({ name: "", items: [] }, { name: "", items: [] })).toBe(true);
});

test("domain shape guards quarantine malformed items hidden by empty array baselines", () => {
  const protocolContext = { domain: "protocol", context: "create", sourceFingerprint: null };
  const target = storage();
  const initial = { name: "", startDate: "2026-09-09", endDate: "", notes: "", items: [] };
  writeFormDraft(target, protocolContext, initial, { ...initial, name: "Recover me", items: [{}] });
  const storedBytes = target.value(FORM_DRAFTS_STORAGE_KEY);

  expect(readFormDraft(target, protocolContext, initial)).toMatchObject({
    status: "invalid-value",
    value: null,
  });
  expect(readFormDraftCollection(target).entries[0].value.name).toBe("Recover me");
  expect(() => writeFormDraft(target, protocolContext, initial, initial)).toThrow("malformed");
  expect(target.value(FORM_DRAFTS_STORAGE_KEY)).toBe(storedBytes);
});

test("domain shape guards preserve valid temporarily blank and invalid editable values", () => {
  const target = storage();
  const context = { domain: "protocol", context: "create", sourceFingerprint: null };
  const initial = { name: "", startDate: "2026-09-09", endDate: "", notes: "", items: [] };
  const value = {
    ...initial,
    startDate: "",
    items: [{
      id: "item:1",
      compound: { name: "" },
      dose: { amount: "not-yet-valid", unit: "", customUnit: "" },
      route: { code: "", customLabel: "" },
      schedule: { type: "weekly-days", weekdays: [] },
      notes: "unfinished",
    }],
  };
  writeFormDraft(target, context, initial, value);

  expect(readFormDraft(target, context, initial)).toMatchObject({ status: "restored", value });
});

test("shape validation accepts blank or invalid form strings derived from numeric saved baselines", () => {
  const target = storage();
  const context = { domain: "workout-template", context: "edit:template:one", sourceFingerprint: "saved-v1" };
  const initial = {
    name: "Template",
    exercises: [{
      id: "exercise:one",
      name: "Press",
      notes: "",
      targetSets: [{ id: "set:one", setType: "working", reps: 10, load: { mode: "external", amount: 75, unit: "lb" }, notes: "" }],
    }],
  };
  const value = {
    ...initial,
    exercises: [{
      ...initial.exercises[0],
      targetSets: [{ ...initial.exercises[0].targetSets[0], reps: "", load: { mode: "external", amount: "not-yet-valid", unit: "lb" } }],
    }],
  };
  writeFormDraft(target, context, initial, value);

  expect(readFormDraft(target, context, initial)).toMatchObject({ status: "restored", value });
});

test("Nutrition drafts accept legacy values without input metadata and validate new precise metadata", () => {
  const target = storage();
  const legacyInitial = { name: "", calories: "", fat: "", sodium: "" };
  const legacyValue = { ...legacyInitial, name: "Legacy draft", fat: "6.57", sodium: "223.8" };
  writeFormDraft(target, createContext, legacyInitial, legacyValue);
  const currentShape = {
    ...legacyInitial,
    nutrientInputMetadata: { preciseValues: {}, editedKeys: [] },
  };

  expect(readFormDraft(target, createContext, currentShape)).toMatchObject({
    status: "restored",
    value: legacyValue,
  });

  const currentValue = {
    ...legacyValue,
    nutrientInputMetadata: {
      preciseValues: { fat: 6.569999999999999, sodium: 223.79999999999998 },
      editedKeys: ["fat"],
    },
  };
  expect(() => writeFormDraft(target, createContext, currentShape, currentValue)).not.toThrow();
  expect(readFormDraft(target, createContext, currentShape)).toMatchObject({
    status: "restored",
    value: currentValue,
  });

  const groceryContext = { domain: "grocery-food", context: "create", sourceFingerprint: null };
  const groceryTarget = storage();
  writeFormDraft(groceryTarget, groceryContext, legacyInitial, legacyValue);
  expect(readFormDraft(groceryTarget, groceryContext, currentShape)).toMatchObject({
    status: "restored",
    value: legacyValue,
  });
});

test("Nutrition draft shape guards quarantine malformed precise nutrient metadata", () => {
  const target = storage();
  const initial = {
    name: "",
    nutrientInputMetadata: { preciseValues: {}, editedKeys: [] },
  };
  const value = {
    name: "Recoverable text",
    nutrientInputMetadata: {
      preciseValues: { fat: "not-a-precise-number" },
      editedKeys: ["not-a-nutrient"],
    },
  };
  writeFormDraft(target, createContext, initial, value);

  expect(readFormDraft(target, createContext, initial)).toMatchObject({
    status: "invalid-value",
    value: null,
  });
  expect(readFormDraftCollection(target).entries[0].value.name).toBe("Recoverable text");
});

test("workout-template shape validation permits heterogeneous optional fields while domain guards validate each item", () => {
  const target = storage();
  const context = { domain: "workout-template", context: "edit:template:mixed", sourceFingerprint: "saved-v1" };
  const initial = {
    name: "Mixed template",
    exercises: [
      {
        id: "exercise:built-in",
        name: "Bench Press",
        exerciseId: "trace:bench",
        notes: "",
        targetSets: [{ id: "set:external", setType: "working", reps: 10, load: { mode: "external", amount: 75, unit: "lb" }, notes: "" }],
      },
      {
        id: "exercise:custom",
        name: "Custom movement",
        notes: "",
        targetSets: [{ id: "set:bodyweight", setType: "working", reps: 8, load: { mode: "bodyweight" }, notes: "" }],
      },
    ],
  };
  const value = {
    ...initial,
    name: "Edited mixed template",
    exercises: [
      { ...initial.exercises[0], targetSets: [{ ...initial.exercises[0].targetSets[0], reps: "" }] },
      initial.exercises[1],
      { id: "exercise:new", name: "", notes: "", targetSets: [] },
    ],
  };
  writeFormDraft(target, context, initial, value);
  writeFormDraft(target, context, initial, { ...value, name: "Edited again" });

  expect(readFormDraft(target, context, initial)).toMatchObject({
    status: "restored",
    value: { name: "Edited again", exercises: value.exercises },
  });
});

test("storage write and clear failures leave the previously recoverable collection unchanged", () => {
  const target = storage();
  writeFormDraft(target, createContext, { name: "" }, { name: "First" });
  const previousBytes = target.value(FORM_DRAFTS_STORAGE_KEY);
  const failing = {
    getItem: target.getItem,
    setItem: () => { throw new Error("quota"); },
  };

  expect(() => writeFormDraft(failing, createContext, { name: "" }, { name: "Second" })).toThrow("quota");
  expect(() => clearFormDraft(failing, createContext)).toThrow("quota");
  expect(target.value(FORM_DRAFTS_STORAGE_KEY)).toBe(previousBytes);
  expect(readFormDraft(target, createContext).value.name).toBe("First");
});

test("save and discard cleanup reread the latest collection and preserve interleaved form contexts", () => {
  const target = storage();
  const protocol = { domain: "protocol", context: "create", sourceFingerprint: null };
  const health = { domain: "health-measurement", context: "create", sourceFingerprint: null };
  writeFormDraft(target, protocol, { name: "" }, { name: "Protocol work" });

  writeFormDraft(target, health, { notes: "" }, { notes: "Health work written during save" });
  expect(clearFormDraft(target, protocol)).toBe(true);
  expect(readFormDraft(target, health).value.notes).toBe("Health work written during save");

  writeFormDraft(target, protocol, { name: "" }, { name: "Second protocol" });
  expect(clearFormDraftsForContextPrefix(target, "protocol", "create")).toBe(true);
  expect(readFormDraft(target, health).value.notes).toBe("Health work written during save");
});

test("rejects non-JSON values so blobs, object URLs, and mutable browser objects cannot be persisted", () => {
  expect(() => formDraftFingerprint({ photo: new Blob(["bytes"]) })).toThrow("unsupported");
  expect(() => writeFormDraft(storage(), createContext, {}, { amount: Number.NaN })).toThrow("unsupported");
});
