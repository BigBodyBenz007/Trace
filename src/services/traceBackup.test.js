import {
  createTraceBackup,
  parseTraceBackupText,
  restoreTraceBackup,
  TRACE_BACKUP_SCHEMA_VERSION,
  TRACE_STORAGE_KEYS,
  traceBackupFilename,
  validateTraceBackup,
} from "./traceBackup";
import { readAppSettings } from "./appSettings";
import { DEFAULT_HOME_VISIBILITY } from "./homeModules";
import { createUserFood } from "./userFoodCatalog";
import { createWorkoutDraftFromPlannedWorkout } from "./workoutDraft";
import { createDailyAction, emptyDailyActionCollection } from "./dailyAction";
import {
  completeProtocolOccurrence,
  emptyProtocolOccurrenceCollection,
} from "./protocolOccurrence";
import {
  appendInjectionSession,
  createInjectionSession,
  defaultInjectionSiteSettings,
  emptyInjectionSiteCollection,
} from "./injectionSite";
import {
  MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY,
  createMedicationDoseSchedule,
  deleteMedicationDoseSchedule,
  emptyMedicationDoseOccurrenceCollection,
  emptyMedicationDoseScheduleCollection,
  medicationDoseOccurrenceItem,
  medicationDoseOccurrencesForDate,
  skipMedicationDoseOccurrence,
} from "./medicationDoseSchedule";
import {
  PROTOCOL_COMPOUND_TRANSACTION_KEY,
  createProtocolCompoundOutcome,
  emptyProtocolCompoundOutcomeCollection,
} from "./protocolCompoundOutcome";

function makeStorage(initial = {}, failOnSet = null) {
  const values = new Map(Object.entries(initial));
  let hasFailed = false;
  return {
    getItem: jest.fn((key) => values.has(key) ? values.get(key) : null),
    setItem: jest.fn((key, value) => {
      if (key === failOnSet && !hasFailed) { hasFailed = true; throw new Error("quota full"); }
      values.set(key, String(value));
    }),
    removeItem: jest.fn((key) => values.delete(key)),
    value: (key) => values.get(key) ?? null,
  };
}

function makePhotoDatabase(initial = [], { failWriteCount = 0 } = {}) {
  let records = initial.map((record) => ({ ...record }));
  return {
    records: () => records,
    transaction(storeName, mode) {
      let next = records.map((record) => ({ ...record }));
      const transaction = {
        objectStore() {
          return {
            getAll() {
              const request = {};
              setTimeout(() => { request.result = records.map((record) => ({ ...record })); request.onsuccess?.(); }, 0);
              return request;
            },
            clear() { next = []; },
            put(record) { next = next.filter(({ id }) => id !== record.id); next.push(record); },
          };
        },
      };
      if (mode === "readwrite") setTimeout(() => {
        if (failWriteCount > 0) {
          failWriteCount -= 1;
          transaction.error = new Error("photo write failed");
          transaction.onabort?.();
          return;
        }
        records = next;
        transaction.oncomplete?.();
      }, 0);
      return transaction;
    },
  };
}

function emptyStructured(overrides = {}) {
  return Object.fromEntries(TRACE_STORAGE_KEYS.map((key) => [
    key,
    key === "dailyActions"
      ? emptyDailyActionCollection()
      : key === "protocolOccurrences"
        ? emptyProtocolOccurrenceCollection()
      : key === "protocolCompoundOutcomes"
        ? emptyProtocolCompoundOutcomeCollection()
      : key === "medicationDoseSchedules"
        ? emptyMedicationDoseScheduleCollection()
      : key === "medicationDoseOccurrences"
        ? emptyMedicationDoseOccurrenceCollection()
      : key === "injectionSiteEntries"
        ? emptyInjectionSiteCollection()
      : key === "injectionSiteSettings"
        ? defaultInjectionSiteSettings()
      : ["nutritionGoals", "appSettings", "workoutDraft"].includes(key) ? null : [],
  ]).concat(Object.entries(overrides)));
}

function dailyAction() {
  return createDailyAction({
    title: "Pick up prescription",
    actionType: "errand",
    date: "2026-08-22",
    time: "17:30",
    timeWindow: null,
    durationMinutes: 20,
    location: "Neighborhood pharmacy",
    notes: "Use the drive-through",
    recurrence: null,
  }, { id: "daily-action:pharmacy", now: new Date("2026-08-20T12:00:00.000Z") });
}

function protocolOccurrence() {
  return completeProtocolOccurrence(null, {
    protocolId: "protocol:one",
    itemId: "protocol-item:one",
    date: "2026-08-22",
  }, new Date("2026-08-22T14:00:00.000Z"));
}

function protocolCompoundOutcome() {
  const item = {
    id: "protocol-item:one",
    compound: { name: "Backup peptide" },
    dose: { amount: 250, unit: "mcg" },
    route: { code: "subcutaneous" },
    schedule: { type: "weekly-days", weekdays: [6] },
    notes: "Immutable backup snapshot",
  };
  return createProtocolCompoundOutcome({
    id: "protocol:one",
    name: "Backup Protocol",
    notes: "Protocol snapshot",
  }, [item], "2026-08-22", new Date("2026-08-22T12:00:00.000Z"));
}

function injectionSiteEntry() {
  return {
    schemaVersion: 1,
    id: "injection-site:one",
    protocolId: "protocol:one",
    protocolName: "User plan",
    view: "front",
    x: 0.237,
    y: 0.681,
    siteLabel: "Right Thigh (Outer)",
    occurredAt: "2026-08-22T14:00:00.000Z",
    notes: "",
    createdAt: "2026-08-22T14:01:00.000Z",
    updatedAt: "2026-08-22T14:01:00.000Z",
  };
}

function injectionSiteCollection() {
  const created = createInjectionSession({
    occurredAt: "2026-08-22T14:00:00.000Z",
    shots: [{
      view: "front", x: 0.237, y: 0.681, siteLabel: "Right Thigh (Outer)",
      substanceName: "Vitamin B12", protocolId: "protocol:one", protocolName: "User plan",
      protocolItemId: "protocol-item:one", amount: 1, unit: "mg", notes: "",
    }],
  }, {
    sessionId: "injection-session:one",
    shotIds: ["injection-shot:one"],
    now: new Date("2026-08-22T14:01:00.000Z"),
  });
  return appendInjectionSession(emptyInjectionSiteCollection(), created);
}

function encodedPhoto(id = "photo-1", text = "hello", type = "image/png") {
  return {
    id,
    memoryId: "memory-1",
    blob: { type, size: text.length, base64: btoa(text) },
  };
}

function readBlobText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function backup(overrides = {}) {
  return {
    format: "trace-backup",
    schemaVersion: TRACE_BACKUP_SCHEMA_VERSION,
    createdAt: "2026-08-12T10:20:30.000Z",
    app: { name: "Trace", version: "0.1.0" },
    data: { structured: emptyStructured(), photos: [] },
    ...overrides,
  };
}

function plannedWorkout(id = "planned-workout:one", overrides = {}) {
  return {
    id,
    schemaVersion: 1,
    type: "strength",
    scheduledDate: "2026-08-22",
    title: "Upper Body",
    notes: "Plan only",
    exercises: [{
      id: `${id}:exercise`,
      name: "Dumbbell Bench Press",
      exerciseId: "trace:chest-db-bench-002",
      notes: "",
      targetSets: [],
    }],
    createdAt: "2026-08-20T12:00:00.000Z",
    updatedAt: "2026-08-20T12:00:00.000Z",
    ...overrides,
  };
}

function activeWorkoutDraft(overrides = {}) {
  return {
    ...createWorkoutDraftFromPlannedWorkout(
      plannedWorkout(),
      new Date("2026-08-22T16:00:00.000Z")
    ),
    ...overrides,
  };
}

test("exports empty Trace data with stable version metadata and filename", async () => {
  const storage = makeStorage();
  const database = makePhotoDatabase();
  const result = await createTraceBackup({
    storage,
    openDatabase: async () => database,
    now: () => new Date("2026-08-12T10:20:30.000Z"),
  });
  expect(result).toMatchObject({ format: "trace-backup", schemaVersion: 1, createdAt: "2026-08-12T10:20:30.000Z" });
  expect(result.data.photos).toEqual([]);
  expect(result.data.structured.workoutDraft).toBeNull();
  expect(result.data.structured.dailyActions).toEqual(emptyDailyActionCollection());
  expect(result.data.structured.protocolOccurrences).toEqual(emptyProtocolOccurrenceCollection());
  expect(result.data.structured.protocolCompoundOutcomes).toEqual(emptyProtocolCompoundOutcomeCollection());
  expect(result.data.structured.injectionSiteEntries).toEqual(emptyInjectionSiteCollection());
  expect(result.data.structured.injectionSiteSettings).toEqual(defaultInjectionSiteSettings());
  expect(traceBackupFilename(new Date(result.createdAt))).toBe("trace-backup-2026-08-12T10-20-30-000Z.json");
});

test("exports structured data and multiple photos without mutating sources", async () => {
  const memories = [{ id: "memory-1", date: "2001-02-03", images: ["photo-1", "photo-2"] }];
  const plans = [plannedWorkout()];
  const workoutDraft = activeWorkoutDraft({ plannedWorkoutId: "planned-workout:orphaned" });
  const actions = { schemaVersion: 1, actions: [dailyAction()] };
  const occurrences = { schemaVersion: 1, occurrences: [protocolOccurrence()] };
  const injectionSites = injectionSiteCollection();
  const injectionSettings = { schemaVersion: 1, bodyStyleId: "feminine-fuller" };
  const storage = makeStorage({
    memories: JSON.stringify(memories),
    plannedWorkouts: JSON.stringify(plans),
    workoutDraft: JSON.stringify(workoutDraft),
    protocols: JSON.stringify([{ id: "protocol-1" }]),
    dailyActions: JSON.stringify(actions),
    protocolOccurrences: JSON.stringify(occurrences),
    injectionSiteEntries: JSON.stringify(injectionSites),
    injectionSiteSettings: JSON.stringify(injectionSettings),
  });
  const database = makePhotoDatabase([
    { id: "photo-1", memoryId: "memory-1", blob: new Blob(["one"], { type: "image/png" }) },
    { id: "photo-2", memoryId: "memory-1", blob: new Blob(["two"], { type: "image/jpeg" }) },
  ]);
  const result = await createTraceBackup({ storage, openDatabase: async () => database });
  expect(result.data.structured.memories).toEqual(memories);
  expect(result.data.structured.plannedWorkouts).toEqual(plans);
  expect(result.data.structured.workoutDraft).toEqual(workoutDraft);
  expect(result.data.structured.protocols).toEqual([{ id: "protocol-1" }]);
  expect(result.data.structured.dailyActions).toEqual(actions);
  expect(result.data.structured.protocolOccurrences).toEqual(occurrences);
  expect(result.data.structured.injectionSiteEntries).toEqual(injectionSites);
  expect(result.data.structured.injectionSiteSettings).toEqual(injectionSettings);
  expect(result.data.structured.workoutEntries).toBeNull();
  expect(result.data.photos.map(({ id, blob }) => [id, blob.type])).toEqual([
    ["photo-1", "image/png"], ["photo-2", "image/jpeg"],
  ]);
  expect(database.records()[0].blob).toBeInstanceOf(Blob);
  expect(memories[0].images).toEqual(["photo-1", "photo-2"]);
});

test("restores a valid pre-execution-flow workout draft without inventing a planned-workout backlink", async () => {
  const legacyDraft = activeWorkoutDraft();
  delete legacyDraft.plannedWorkoutId;
  legacyDraft.context = { activeSearchExerciseId: null };
  legacyDraft.form.exercises.forEach((exercise) => {
    delete exercise.roadmapStatus;
    delete exercise.roadmapSkipReason;
  });
  const value = backup({
    createdAt: "2026-08-23T18:00:00.000Z",
    data: {
      structured: emptyStructured({
        plannedWorkouts: [plannedWorkout()],
        workoutDraft: legacyDraft,
      }),
      photos: [],
    },
  });
  const storage = makeStorage();

  const parsed = validateTraceBackup(value);
  expect(parsed.summary.activeWorkoutDraft).toBe(true);
  expect(parsed.backup.data.structured.workoutDraft).not.toHaveProperty("plannedWorkoutId");

  await restoreTraceBackup(value, {
    confirmed: true,
    storage,
    openDatabase: async () => makePhotoDatabase(),
  });

  const restoredDraft = JSON.parse(storage.value("workoutDraft"));
  expect(restoredDraft).toMatchObject({
    schemaVersion: 1,
    form: {
      title: "Upper Body",
      exercises: [expect.objectContaining({ name: "Dumbbell Bench Press" })],
    },
    context: { activeSearchExerciseId: null },
  });
  expect(restoredDraft).not.toHaveProperty("plannedWorkoutId");
});

test("backs up and restores custom grocery foods and nullable meal snapshots unchanged", async () => {
  const groceryFood = createUserFood(
    "Raw chicken breast strips",
    { protein: 26, carbohydrates: 0 },
    { amount: 4, unit: "oz", description: "4 oz" },
    { brand: "Market Pantry", category: "protein", notes: "Raw weight" }
  );
  const meal = {
    id: "meal-grocery-1",
    name: groceryFood.name,
    calories: null,
    protein: 26,
    carbohydrates: 0,
    fat: null,
    fiber: null,
    sodium: null,
    foodReference: {
      source: "user-added",
      sourceId: groceryFood.provenance.sourceId,
      sourceType: "grocery-custom",
      category: "protein",
      categoryLabel: "Protein / meat",
      brand: "Market Pantry",
    },
  };
  const source = makeStorage({
    userFoods: JSON.stringify([groceryFood]),
    nutritionEntries: JSON.stringify([meal]),
  });
  const created = await createTraceBackup({
    storage: source,
    openDatabase: async () => makePhotoDatabase(),
  });

  expect(created.data.structured.userFoods).toEqual([groceryFood]);
  expect(created.data.structured.nutritionEntries).toEqual([meal]);
  expect(created.data.structured.userFoods[0].nutrients.calories).toBeNull();
  expect(TRACE_STORAGE_KEYS).not.toContain("groceryFoods");
  expect(created.data.structured).not.toHaveProperty("groceryFoods");

  const restored = makeStorage();
  await restoreTraceBackup(created, {
    confirmed: true,
    storage: restored,
    openDatabase: async () => makePhotoDatabase(),
  });

  expect(JSON.parse(restored.value("userFoods"))).toEqual([groceryFood]);
  expect(JSON.parse(restored.value("nutritionEntries"))).toEqual([meal]);
});

test("backs up saved private Journal entries but excludes unfinished drafts", async () => {
  const journalEntry = {
    id: "journal-1", schemaVersion: 1, visibility: "private", title: "", body: "Kept privately",
    date: "2026-08-18", time: "21:00", createdAt: "2026-08-19T02:00:00.000Z",
    updatedAt: "2026-08-19T02:00:00.000Z", mood: "Calm", tags: ["Reflection"],
  };
  const storage = makeStorage({
    journalEntries: JSON.stringify([journalEntry]),
    journalDraft: JSON.stringify({ form: { body: "unfinished" } }),
  });
  const result = await createTraceBackup({ storage, openDatabase: async () => makePhotoDatabase() });
  expect(result.data.structured.journalEntries).toEqual([journalEntry]);
  expect(result.data.structured).not.toHaveProperty("journalDraft");
  expect(result.data.structured.journalEntries[0].visibility).toBe("private");
  expect(result.data.structured.journalEntries[0]).toMatchObject({ id: "journal-1", body: "Kept privately", mood: "Calm", tags: ["Reflection"] });
});

test("validates summaries and rejects corrupt, future, and missing-reference backups", () => {
  const valid = backup({ data: { structured: emptyStructured({
    memories: [{ id: "memory-1", date: "2026-01-02", images: ["photo-1"] }],
    nutritionEntries: [{ id: "meal" }], healthMeasurementEntries: [{ id: "health" }], plannedWorkouts: [plannedWorkout()], workoutDraft: activeWorkoutDraft(), workoutEntries: [{ id: "workout" }],
    medicationEntries: [{ id: "dose" }], protocols: [{ id: "protocol" }],
    dailyActions: { schemaVersion: 1, actions: [dailyAction()] },
    protocolOccurrences: { schemaVersion: 1, occurrences: [protocolOccurrence()] },
    injectionSiteEntries: injectionSiteCollection(),
    trophyCaseEntries: [{ id: "trophy" }],
  }), photos: [encodedPhoto()] } });
  expect(validateTraceBackup(valid).summary).toMatchObject({ memories: 1, photos: 1, nutritionEntries: 1, healthMeasurementEntries: 1, plannedWorkouts: 1, activeWorkoutDraft: true, workouts: 1, medicationEntries: 1, protocols: 1, protocolOccurrences: 1, injectionSiteEntries: 1, dailyActions: 1, trophyCaseEntries: 1 });
  expect(() => parseTraceBackupText("not json")).toThrow("not valid JSON");
  expect(() => validateTraceBackup({ ...valid, schemaVersion: 2 })).toThrow("newer");
  expect(() => validateTraceBackup({ ...valid, data: { ...valid.data, photos: [] } })).toThrow("missing referenced photo");
});

test("preview validation and an unconfirmed restore never mutate storage", async () => {
  const value = backup();
  const storage = makeStorage({ memories: JSON.stringify([{ id: "current" }]) });
  const database = makePhotoDatabase();
  parseTraceBackupText(JSON.stringify(value));
  await expect(restoreTraceBackup(value, { storage, openDatabase: async () => database })).rejects.toThrow("confirmation");
  expect(storage.value("memories")).toBe(JSON.stringify([{ id: "current" }]));
});

test("full restore preserves IDs, dates, all structured domains, photo bytes and MIME type", async () => {
  const workoutWithDrops = {
    id: "workout-1",
    exercises: [{
      id: "exercise-1",
      sets: [{
        id: "set-1",
        reps: 10,
        load: { mode: "external", amount: 70, unit: "lb" },
        notes: "Parent",
        drops: [
          { id: "drop-1", reps: 8, load: { mode: "external", amount: 55, unit: "lb" }, notes: "First" },
          { id: "drop-2", reps: 6, load: { mode: "external", amount: 40, unit: "kg" }, notes: "Second" },
        ],
      }],
    }],
  };
  const restoredDraft = activeWorkoutDraft();
  const structured = emptyStructured({
    memories: [{ id: "memory-1", date: "1999-06-12", categories: ["Family"], tags: ["legacy"], images: ["photo-1"] }],
    nutritionEntries: [{ id: "meal-1", sodium: 640 }], healthMeasurementEntries: [{ id: "health-1", measurements: { height: { unit: "ft-in", feet: 6, inches: 2 }, leftCalf: { value: 16, unit: "in" }, rightCalf: { value: 41, unit: "cm" } } }], appSettings: { schemaVersion: 1, units: { weight: "kg", height: "cm", circumference: "cm" } }, workoutEntries: [workoutWithDrops],
    medicationEntries: [{ id: "dose-1" }], medicationCompounds: [{ id: "compound-1" }],
    protocols: [{ id: "protocol-1" }], plannedWorkouts: [plannedWorkout()], workoutDraft: restoredDraft, trophyCaseEntries: [{ id: "trophy-1" }],
    dailyActions: { schemaVersion: 1, actions: [dailyAction()] },
    protocolOccurrences: { schemaVersion: 1, occurrences: [protocolOccurrence()] },
    injectionSiteEntries: injectionSiteCollection(),
    injectionSiteSettings: { schemaVersion: 1, bodyStyleId: "masculine-average" },
    savedExercises: [{ id: "exercise-1" }], userFoods: [{ id: "food-1" }],
    nutritionGoals: { calories: 2000, sodium: 2300 },
  });
  const value = backup({ data: { structured, photos: [encodedPhoto("photo-1", "hello", "image/webp")] } });
  const storage = makeStorage({
    memories: JSON.stringify([{ id: "old" }]),
    workoutDraft: JSON.stringify(activeWorkoutDraft({ plannedWorkoutId: "planned-workout:current" })),
  });
  const database = makePhotoDatabase([{ id: "old-photo", blob: new Blob(["old"]) }]);
  const summary = await restoreTraceBackup(value, { confirmed: true, storage, openDatabase: async () => database });
  expect(summary).toMatchObject({ memories: 1, photos: 1, plannedWorkouts: 1, dailyActions: 1, protocolOccurrences: 1, injectionSiteEntries: 1, activeWorkoutDraft: true, workouts: 1 });
  expect(JSON.parse(storage.value("memories"))[0]).toMatchObject({ id: "memory-1", date: "1999-06-12", images: ["photo-1"] });
  expect(JSON.parse(storage.value("nutritionEntries"))).toEqual([{ id: "meal-1", sodium: 640 }]);
  expect(JSON.parse(storage.value("nutritionGoals"))).toEqual({ calories: 2000, sodium: 2300 });
  expect(JSON.parse(storage.value("healthMeasurementEntries"))).toEqual([{ id: "health-1", measurements: { height: { unit: "ft-in", feet: 6, inches: 2 }, leftCalf: { value: 16, unit: "in" }, rightCalf: { value: 41, unit: "cm" } } }]);
  expect(JSON.parse(storage.value("appSettings"))).toEqual({ schemaVersion: 4, units: { weight: "kg", height: "cm", circumference: "cm" }, themeId: "modern-heirloom", homeVisibility: DEFAULT_HOME_VISIBILITY, motionPreference: "standard" });
  expect(JSON.parse(storage.value("workoutEntries"))).toEqual([workoutWithDrops]);
  expect(JSON.parse(storage.value("medicationEntries"))).toEqual([{ id: "dose-1" }]);
  expect(JSON.parse(storage.value("protocols"))).toEqual([{ id: "protocol-1" }]);
  expect(JSON.parse(storage.value("dailyActions"))).toEqual({ schemaVersion: 1, actions: [dailyAction()] });
  expect(JSON.parse(storage.value("protocolOccurrences"))).toEqual({ schemaVersion: 1, occurrences: [protocolOccurrence()] });
  expect(JSON.parse(storage.value("injectionSiteEntries"))).toEqual(injectionSiteCollection());
  expect(JSON.parse(storage.value("injectionSiteSettings"))).toEqual({ schemaVersion: 1, bodyStyleId: "masculine-average" });
  expect(JSON.parse(storage.value("plannedWorkouts"))).toEqual([plannedWorkout()]);
  expect(JSON.parse(storage.value("workoutDraft"))).toEqual(restoredDraft);
  expect(JSON.parse(storage.value("trophyCaseEntries"))).toEqual([{ id: "trophy-1" }]);
  expect(database.records()).toHaveLength(1);
  expect(database.records()[0]).toMatchObject({ id: "photo-1", memoryId: "memory-1" });
  expect(database.records()[0].blob.type).toBe("image/webp");
  expect(database.records()[0].blob.size).toBe(5);
  await expect(readBlobText(database.records()[0].blob)).resolves.toBe("hello");
});

test("restores pre-Health backups with Health history empty", async () => {
  const structured = emptyStructured();
  delete structured.healthMeasurementEntries;
  const value = backup({ data: { structured, photos: [] } });
  const storage = makeStorage({ healthMeasurementEntries: JSON.stringify([{ id: "current-health" }]) });
  await restoreTraceBackup(value, { confirmed: true, storage, openDatabase: async () => makePhotoDatabase() });
  expect(storage.value("healthMeasurementEntries")).toBeNull();
});

test("restores pre-Settings backups with default Settings storage fallback", async () => {
  const structured = emptyStructured();
  delete structured.appSettings;
  const storage = makeStorage({ appSettings: JSON.stringify({ units: { weight: "kg" } }) });
  await restoreTraceBackup(backup({ data: { structured, photos: [] } }), { confirmed: true, storage, openDatabase: async () => makePhotoDatabase() });
  expect(storage.value("appSettings")).toBeNull();
  expect(readAppSettings(storage).themeId).toBe("modern-heirloom");
  expect(readAppSettings(storage).motionPreference).toBe("standard");
});

test("accepts older backups without planned workouts and restores that domain empty", async () => {
  const structured = emptyStructured();
  delete structured.plannedWorkouts;
  const value = backup({ data: { structured, photos: [] } });
  const storage = makeStorage({
    plannedWorkouts: JSON.stringify([plannedWorkout("planned-workout:current")]),
  });

  expect(validateTraceBackup(value).summary.plannedWorkouts).toBe(0);
  await restoreTraceBackup(value, {
    confirmed: true,
    storage,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(storage.value("plannedWorkouts")).toBeNull();
});

test("accepts older backups without daily actions and replaces current actions with an empty collection", async () => {
  const structured = emptyStructured();
  delete structured.dailyActions;
  const value = backup({ data: { structured, photos: [] } });
  const storage = makeStorage({
    dailyActions: JSON.stringify({ schemaVersion: 1, actions: [dailyAction()] }),
  });

  expect(validateTraceBackup(value).summary.dailyActions).toBe(0);
  await restoreTraceBackup(value, {
    confirmed: true,
    storage,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(JSON.parse(storage.value("dailyActions"))).toEqual(emptyDailyActionCollection());
});

test("accepts older backups without protocol occurrence statuses and clears current statuses", async () => {
  const structured = emptyStructured();
  delete structured.protocolOccurrences;
  const value = backup({ data: { structured, photos: [] } });
  const storage = makeStorage({
    protocolOccurrences: JSON.stringify({ schemaVersion: 1, occurrences: [protocolOccurrence()] }),
  });

  expect(validateTraceBackup(value).summary.protocolOccurrences).toBe(0);
  await restoreTraceBackup(value, {
    confirmed: true,
    storage,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(JSON.parse(storage.value("protocolOccurrences"))).toEqual(emptyProtocolOccurrenceCollection());
});

test("round-trips Protocol compound outcomes with preview counts and safely defaults older backups", async () => {
  const collection = { schemaVersion: 1, occurrences: [protocolCompoundOutcome()] };
  const storage = makeStorage({ protocolCompoundOutcomes: JSON.stringify(collection) });
  const exported = await createTraceBackup({ storage, openDatabase: async () => makePhotoDatabase() });
  expect(exported.data.structured.protocolCompoundOutcomes).toEqual(collection);
  expect(validateTraceBackup(exported).summary.protocolCompoundOutcomes).toBe(1);

  const restoredStorage = makeStorage();
  await restoreTraceBackup(exported, {
    confirmed: true,
    storage: restoredStorage,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(JSON.parse(restoredStorage.value("protocolCompoundOutcomes"))).toEqual(collection);

  const olderStructured = emptyStructured();
  delete olderStructured.protocolCompoundOutcomes;
  const older = backup({ data: { structured: olderStructured, photos: [] } });
  expect(validateTraceBackup(older).summary.protocolCompoundOutcomes).toBe(0);
  await restoreTraceBackup(older, {
    confirmed: true,
    storage: restoredStorage,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(JSON.parse(restoredStorage.value("protocolCompoundOutcomes"))).toEqual(emptyProtocolCompoundOutcomeCollection());
});

test("accepts older backups without injection sites and replaces current site history with a safe empty collection", async () => {
  const structured = emptyStructured();
  delete structured.injectionSiteEntries;
  const value = backup({ data: { structured, photos: [] } });
  const storage = makeStorage({
    injectionSiteEntries: JSON.stringify({ schemaVersion: 1, entries: [injectionSiteEntry()] }),
  });

  expect(validateTraceBackup(value).summary.injectionSiteEntries).toBe(0);
  await restoreTraceBackup(value, {
    confirmed: true,
    storage,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(JSON.parse(storage.value("injectionSiteEntries"))).toEqual(emptyInjectionSiteCollection());
});

test("accepts older backups without injection body settings and restores the neutral default", async () => {
  const structured = emptyStructured();
  delete structured.injectionSiteSettings;
  const value = backup({ data: { structured, photos: [] } });
  const storage = makeStorage({
    injectionSiteSettings: JSON.stringify({ schemaVersion: 1, bodyStyleId: "feminine-fuller" }),
  });

  await restoreTraceBackup(value, {
    confirmed: true,
    storage,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(JSON.parse(storage.value("injectionSiteSettings"))).toEqual(defaultInjectionSiteSettings());
});

test("rejects malformed injection-site history before restore mutates existing data", async () => {
  const current = JSON.stringify({ schemaVersion: 1, entries: [injectionSiteEntry()] });
  const malformed = { schemaVersion: 1, entries: [{ ...injectionSiteEntry(), x: 1.2 }] };
  const value = backup({ data: { structured: emptyStructured({ injectionSiteEntries: malformed }), photos: [] } });
  const storage = makeStorage({ injectionSiteEntries: current });

  expect(() => validateTraceBackup(value)).toThrow("invalid injection site data");
  await expect(restoreTraceBackup(value, {
    confirmed: true,
    storage,
    openDatabase: async () => makePhotoDatabase(),
  })).rejects.toThrow("invalid injection site data");
  expect(storage.value("injectionSiteEntries")).toBe(current);
});

test("rejects malformed protocol occurrence statuses before restore mutates storage", async () => {
  const current = JSON.stringify({ schemaVersion: 1, occurrences: [protocolOccurrence()] });
  const malformed = { schemaVersion: 1, occurrences: [{ ...protocolOccurrence(), date: "2026-02-30" }] };
  const value = backup({ data: { structured: emptyStructured({ protocolOccurrences: malformed }), photos: [] } });
  const storage = makeStorage({ protocolOccurrences: current });

  expect(() => validateTraceBackup(value)).toThrow("invalid protocol occurrence data");
  await expect(restoreTraceBackup(value, {
    confirmed: true,
    storage,
    openDatabase: async () => makePhotoDatabase(),
  })).rejects.toThrow("invalid protocol occurrence data");
  expect(storage.value("protocolOccurrences")).toBe(current);
});

test("rejects malformed Protocol compound outcomes before restore mutates storage", async () => {
  const current = JSON.stringify({ schemaVersion: 1, occurrences: [protocolCompoundOutcome()] });
  const malformed = {
    schemaVersion: 1,
    occurrences: [{ ...protocolCompoundOutcome(), date: "2026-02-30" }],
  };
  const value = backup({ data: { structured: emptyStructured({ protocolCompoundOutcomes: malformed }), photos: [] } });
  const storage = makeStorage({ protocolCompoundOutcomes: current });

  expect(() => validateTraceBackup(value)).toThrow("invalid Protocol compound outcome data");
  await expect(restoreTraceBackup(value, {
    confirmed: true,
    storage,
    openDatabase: async () => makePhotoDatabase(),
  })).rejects.toThrow("invalid Protocol compound outcome data");
  expect(storage.value("protocolCompoundOutcomes")).toBe(current);
});

test("rejects malformed daily actions before restore mutates existing data", async () => {
  const current = JSON.stringify({ schemaVersion: 1, actions: [dailyAction()] });
  const malformed = { schemaVersion: 1, actions: [{ ...dailyAction(), date: "2026-02-30" }] };
  const value = backup({ data: { structured: emptyStructured({ dailyActions: malformed }), photos: [] } });
  const storage = makeStorage({ dailyActions: current });

  expect(() => validateTraceBackup(value)).toThrow("invalid daily action data");
  await expect(restoreTraceBackup(value, {
    confirmed: true,
    storage,
    openDatabase: async () => makePhotoDatabase(),
  })).rejects.toThrow("invalid daily action data");
  expect(storage.value("dailyActions")).toBe(current);
});

test("accepts older backups without an active workout draft and clears the current draft", async () => {
  const structured = emptyStructured();
  delete structured.workoutDraft;
  const storage = makeStorage({ workoutDraft: JSON.stringify(activeWorkoutDraft()) });

  expect(validateTraceBackup(backup({ data: { structured, photos: [] } })).summary.activeWorkoutDraft).toBe(false);
  await restoreTraceBackup(backup({ data: { structured, photos: [] } }), {
    confirmed: true,
    storage,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(storage.value("workoutDraft")).toBeNull();
});

test("rejects malformed planned workouts before restore mutates storage", async () => {
  const invalidPlan = plannedWorkout("planned-workout:invalid", {
    scheduledDate: "2026-02-30",
  });
  const value = backup({
    data: {
      structured: emptyStructured({ plannedWorkouts: [invalidPlan] }),
      photos: [],
    },
  });
  const original = JSON.stringify([plannedWorkout("planned-workout:current")]);
  const storage = makeStorage({ plannedWorkouts: original });
  const openDatabase = jest.fn(async () => makePhotoDatabase());

  expect(() => validateTraceBackup(value)).toThrow("invalid planned workout data");
  await expect(restoreTraceBackup(value, {
    confirmed: true,
    storage,
    openDatabase,
  })).rejects.toThrow("invalid planned workout data");
  expect(openDatabase).not.toHaveBeenCalled();
  expect(storage.value("plannedWorkouts")).toBe(original);
  expect(storage.value("workoutEntries")).toBeNull();
});

test("rejects malformed nested workout drafts before restore mutates storage or IndexedDB", async () => {
  const malformedDraft = activeWorkoutDraft();
  malformedDraft.form.exercises[0].sets[0].reps = 8;
  const value = backup({
    data: { structured: emptyStructured({ workoutDraft: malformedDraft }), photos: [] },
  });
  const original = JSON.stringify(activeWorkoutDraft({ plannedWorkoutId: "planned-workout:current" }));
  const storage = makeStorage({ workoutDraft: original });
  const openDatabase = jest.fn(async () => makePhotoDatabase());

  expect(() => validateTraceBackup(value)).toThrow("invalid active workout draft data");
  await expect(restoreTraceBackup(value, {
    confirmed: true,
    storage,
    openDatabase,
  })).rejects.toThrow("invalid active workout draft data");
  expect(openDatabase).not.toHaveBeenCalled();
  expect(storage.value("workoutDraft")).toBe(original);
});

test.each(["river", "haunted-forest", "gnome-village", "desert-journey", "outer-space-journey"])(
  "backups migrate and restore the selected legacy %s theme",
  async (lifeCurrentThemeId) => {
    const source = makeStorage({
      appSettings: JSON.stringify({
        schemaVersion: 1,
        units: { weight: "kg", height: "cm", circumference: "cm" },
        lifeCurrentThemeId,
      }),
    });
    const value = await createTraceBackup({
      storage: source,
      openDatabase: async () => makePhotoDatabase(),
    });
    expect(value.data.structured.appSettings).toMatchObject({
      schemaVersion: 4,
      themeId: lifeCurrentThemeId,
    });
    expect(value.data.structured.appSettings).not.toHaveProperty("lifeCurrentThemeId");

    const restored = makeStorage();
    await restoreTraceBackup(value, {
      confirmed: true,
      storage: restored,
      openDatabase: async () => makePhotoDatabase(),
    });
    expect(readAppSettings(restored)).toMatchObject({
      units: { weight: "kg", height: "cm", circumference: "cm" },
      themeId: lifeCurrentThemeId,
    });
  }
);

test("backup export and restore preserve a current schema-v4 themeId", async () => {
  const source = makeStorage({
    appSettings: JSON.stringify({
      schemaVersion: 4,
      units: { weight: "lb", height: "ft-in", circumference: "in" },
      themeId: "modern-heirloom",
      homeVisibility: DEFAULT_HOME_VISIBILITY,
      motionPreference: "standard",
    }),
  });
  const value = await createTraceBackup({
    storage: source,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(value.data.structured.appSettings).toMatchObject({
    schemaVersion: 4,
    themeId: "modern-heirloom",
  });

  const restored = makeStorage();
  await restoreTraceBackup(value, {
    confirmed: true,
    storage: restored,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(readAppSettings(restored).themeId).toBe("modern-heirloom");
});

test("missing and invalid backup theme values safely default to Modern Heirloom", async () => {
  const legacySettings = {
    schemaVersion: 1,
    units: { weight: "kg", height: "cm", circumference: "cm" },
  };
  const invalidSettings = { ...legacySettings, lifeCurrentThemeId: "abandoned-theme" };

  for (const appSettings of [legacySettings, invalidSettings]) {
    const value = backup({
      data: {
        structured: emptyStructured({
          appSettings,
          memories: [{ id: "kept-memory", date: "2026-01-01", images: [] }],
        }),
        photos: [],
      },
    });
    const validated = validateTraceBackup(value).backup;
    expect(validated.data.structured.appSettings).toEqual({
      schemaVersion: 4,
      units: { weight: "kg", height: "cm", circumference: "cm" },
      themeId: "modern-heirloom",
      homeVisibility: DEFAULT_HOME_VISIBILITY,
      motionPreference: "standard",
    });

    const storage = makeStorage();
    await restoreTraceBackup(value, {
      confirmed: true,
      storage,
      openDatabase: async () => makePhotoDatabase(),
    });
    expect(readAppSettings(storage)).toEqual(validated.data.structured.appSettings);
    expect(JSON.parse(storage.value("memories"))).toEqual([
      { id: "kept-memory", date: "2026-01-01", images: [] },
    ]);
  }
});

test("backup export and restore retain Home visibility and Motion settings", async () => {
  const homeVisibility = {
    ...DEFAULT_HOME_VISIBILITY,
    workouts: false,
    protocols: false,
  };
  const source = makeStorage({
    appSettings: JSON.stringify({
      schemaVersion: 2,
      units: { weight: "lb", height: "ft-in", circumference: "in" },
      lifeCurrentThemeId: "river",
      homeVisibility,
      motionPreference: "reduced",
    }),
  });
  const value = await createTraceBackup({
    storage: source,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(value.data.structured.appSettings.homeVisibility).toEqual(homeVisibility);
  expect(value.data.structured.appSettings.motionPreference).toBe("reduced");

  const restored = makeStorage();
  await restoreTraceBackup(value, {
    confirmed: true,
    storage: restored,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(readAppSettings(restored).homeVisibility).toEqual(homeVisibility);
  expect(readAppSettings(restored).motionPreference).toBe("reduced");
});

test("older backups without Home visibility restore with every module visible", async () => {
  const value = backup({
    data: {
      structured: emptyStructured({
        appSettings: {
          schemaVersion: 1,
          units: { weight: "kg", height: "cm", circumference: "cm" },
          lifeCurrentThemeId: "river",
        },
      }),
      photos: [],
    },
  });
  const restored = makeStorage();
  await restoreTraceBackup(value, {
    confirmed: true,
    storage: restored,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(readAppSettings(restored).homeVisibility).toEqual(DEFAULT_HOME_VISIBILITY);
  expect(readAppSettings(restored).motionPreference).toBe("standard");
});

test("restores Journal entries and accepts older backups with no Journal collection", async () => {
  const journalEntry = {
    id: "journal-1", schemaVersion: 1, visibility: "private", body: "Restored",
    title: "", date: "2026-08-18", time: "21:00", createdAt: "2026-08-19T02:00:00.000Z",
    updatedAt: "2026-08-19T02:00:00.000Z", tags: [],
  };
  const storage = makeStorage();
  await restoreTraceBackup(backup({ data: { structured: emptyStructured({ journalEntries: [journalEntry] }), photos: [] } }), {
    confirmed: true, storage, openDatabase: async () => makePhotoDatabase(),
  });
  expect(JSON.parse(storage.value("journalEntries"))).toEqual([journalEntry]);

  const legacyStructured = emptyStructured();
  delete legacyStructured.journalEntries;
  const legacyStorage = makeStorage({ journalEntries: JSON.stringify([journalEntry]) });
  await restoreTraceBackup(backup({ data: { structured: legacyStructured, photos: [] } }), {
    confirmed: true, storage: legacyStorage, openDatabase: async () => makePhotoDatabase(),
  });
  expect(legacyStorage.value("journalEntries")).toBeNull();
});

test("Journal backup validation enforces private visibility while optional fields may be absent", () => {
  const minimal = {
    id: "journal-minimal", schemaVersion: 1, visibility: "private", body: "Required body",
    date: "2026-08-18", time: "21:00", createdAt: "2026-08-19T02:00:00.000Z",
    updatedAt: "2026-08-19T02:00:00.000Z",
  };
  expect(validateTraceBackup(backup({ data: { structured: emptyStructured({ journalEntries: [minimal] }), photos: [] } })).summary.journalEntries).toBe(1);
  expect(() => validateTraceBackup(backup({ data: { structured: emptyStructured({ journalEntries: [{ ...minimal, visibility: "public" }] }), photos: [] } })))
    .toThrow("invalid Journal data");
});

test("storage failure rolls structured data and photos back instead of leaving a mixed dataset", async () => {
  const originalMemories = JSON.stringify([{ id: "original" }]);
  const storage = makeStorage({ memories: originalMemories }, "workoutEntries");
  const oldPhoto = { id: "old-photo", blob: new Blob(["old"], { type: "image/png" }) };
  const database = makePhotoDatabase([oldPhoto]);
  const value = backup({ data: { structured: emptyStructured({ memories: [{ id: "new" }] }), photos: [] } });
  await expect(restoreTraceBackup(value, { confirmed: true, storage, openDatabase: async () => database }))
    .rejects.toThrow("previous data was restored");
  expect(storage.value("memories")).toBe(originalMemories);
  expect(database.records().map(({ id }) => id)).toEqual(["old-photo"]);
});

test("photo transaction failure rolls already-written structured data back", async () => {
  const originalMemories = JSON.stringify([{ id: "original" }]);
  const originalDraft = JSON.stringify(activeWorkoutDraft({ plannedWorkoutId: "planned-workout:original" }));
  const storage = makeStorage({ memories: originalMemories, workoutDraft: originalDraft });
  const database = makePhotoDatabase(
    [{ id: "old-photo", blob: new Blob(["old"], { type: "image/png" }) }],
    { failWriteCount: 1 }
  );
  const value = backup({ data: { structured: emptyStructured({
    memories: [{ id: "new" }],
    workoutDraft: activeWorkoutDraft({ plannedWorkoutId: "planned-workout:replacement" }),
  }), photos: [] } });
  await expect(restoreTraceBackup(value, { confirmed: true, storage, openDatabase: async () => database }))
    .rejects.toThrow("previous data was restored");
  expect(storage.value("memories")).toBe(originalMemories);
  expect(storage.value("workoutDraft")).toBe(originalDraft);
  expect(database.records().map(({ id }) => id)).toEqual(["old-photo"]);
});

test("only audited Trace storage is exported; caches and migration markers are absent", async () => {
  const storage = makeStorage({
    memories: "[]",
    unrelated: JSON.stringify({ secret: true }),
    [MEDICATION_DOSE_COMPLETION_TRANSACTION_KEY]: JSON.stringify({ operation: "undo-completion" }),
    [PROTOCOL_COMPOUND_TRANSACTION_KEY]: JSON.stringify({ operation: "save-results" }),
  });
  const result = await createTraceBackup({ storage, openDatabase: async () => makePhotoDatabase() });
  expect(Object.keys(result.data.structured)).toEqual(TRACE_STORAGE_KEYS);
  expect(JSON.stringify(result)).not.toMatch(/unrelated|service-worker|trace-app-shell|migrations|undo-completion|save-results/);
});

function backedUpDoseSchedule() {
  return createMedicationDoseSchedule({
    name: "Backup supplement",
    classification: "supplement",
    dose: { amount: 1, unit: "capsule" },
    route: { code: "oral" },
    notes: "Preserve this snapshot",
    source: { type: "direct-entry", id: "medication-dose-source:backup" },
    repeat: { type: "daily" },
    startDate: "2026-08-22",
    endDate: "2026-09-22",
    time: "08:00",
  }, { id: "schedule:backup", now: new Date("2026-08-20T12:00:00.000Z") });
}

test("backup round-trips dose schedules and occurrence state with preview counts", async () => {
  const schedule = backedUpDoseSchedule();
  const occurrence = skipMedicationDoseOccurrence(
    medicationDoseOccurrenceItem(schedule, "2026-08-22"),
    "Schedule conflict",
    "",
    new Date("2026-08-22T13:00:00.000Z")
  );
  const scheduleCollection = { schemaVersion: 1, schedules: [schedule] };
  const occurrenceCollection = { schemaVersion: 1, occurrences: [occurrence] };
  const storage = makeStorage({
    medicationDoseSchedules: JSON.stringify(scheduleCollection),
    medicationDoseOccurrences: JSON.stringify(occurrenceCollection),
  });
  const value = await createTraceBackup({ storage, openDatabase: async () => makePhotoDatabase() });
  const validated = validateTraceBackup(value);
  expect(validated.summary).toMatchObject({ medicationDoseSchedules: 1, medicationDoseOccurrences: 1 });
  expect(validated.backup.data.structured.medicationDoseSchedules).toEqual(scheduleCollection);
  expect(validated.backup.data.structured.medicationDoseOccurrences).toEqual(occurrenceCollection);

  const restored = makeStorage();
  await restoreTraceBackup(value, { confirmed: true, storage: restored, openDatabase: async () => makePhotoDatabase() });
  expect(JSON.parse(restored.value("medicationDoseSchedules"))).toEqual(scheduleCollection);
  expect(JSON.parse(restored.value("medicationDoseOccurrences"))).toEqual(occurrenceCollection);
});

test("backup round-trips deleted schedule tombstones without restoring actionable doses", async () => {
  const deleted = deleteMedicationDoseSchedule(backedUpDoseSchedule(), "2026-08-22");
  const scheduleCollection = { schemaVersion: 1, schedules: [deleted] };
  const storage = makeStorage({
    medicationDoseSchedules: JSON.stringify(scheduleCollection),
    medicationDoseOccurrences: JSON.stringify(emptyMedicationDoseOccurrenceCollection()),
  });
  const value = await createTraceBackup({ storage, openDatabase: async () => makePhotoDatabase() });
  const restored = makeStorage();
  await restoreTraceBackup(value, {
    confirmed: true,
    storage: restored,
    openDatabase: async () => makePhotoDatabase(),
  });
  const restoredSchedules = JSON.parse(restored.value("medicationDoseSchedules")).schedules;
  expect(restoredSchedules).toEqual([deleted]);
  expect(medicationDoseOccurrencesForDate(restoredSchedules, [], "2026-08-22")).toEqual([]);
});

test("older backups without dose scheduling collections restore safe empty versioned defaults", async () => {
  const structured = emptyStructured();
  delete structured.medicationDoseSchedules;
  delete structured.medicationDoseOccurrences;
  const value = backup({ data: { structured, photos: [] } });
  const result = validateTraceBackup(value);
  expect(result.summary).toMatchObject({ medicationDoseSchedules: 0, medicationDoseOccurrences: 0 });
  const restored = makeStorage({
    medicationDoseSchedules: JSON.stringify({ schemaVersion: 1, schedules: [backedUpDoseSchedule()] }),
    medicationDoseOccurrences: JSON.stringify({ schemaVersion: 1, occurrences: [] }),
  });
  await restoreTraceBackup(value, { confirmed: true, storage: restored, openDatabase: async () => makePhotoDatabase() });
  expect(JSON.parse(restored.value("medicationDoseSchedules"))).toEqual(emptyMedicationDoseScheduleCollection());
  expect(JSON.parse(restored.value("medicationDoseOccurrences"))).toEqual(emptyMedicationDoseOccurrenceCollection());
});

test("malformed dose scheduling data is rejected before mutation", async () => {
  const current = JSON.stringify({ schemaVersion: 1, schedules: [backedUpDoseSchedule()] });
  const malformedSchedule = backedUpDoseSchedule();
  const malformed = {
    schemaVersion: 1,
    schedules: [{
      ...malformedSchedule,
      revisions: [{ ...malformedSchedule.revisions[0], time: "99:00" }],
    }],
  };
  const value = backup({ data: { structured: emptyStructured({ medicationDoseSchedules: malformed }), photos: [] } });
  const storage = makeStorage({ medicationDoseSchedules: current });
  expect(() => validateTraceBackup(value)).toThrow("invalid medication dose schedule data");
  await expect(restoreTraceBackup(value, {
    confirmed: true,
    storage,
    openDatabase: async () => makePhotoDatabase(),
  })).rejects.toThrow("invalid medication dose schedule data");
  expect(storage.value("medicationDoseSchedules")).toBe(current);
});

test("dose occurrence restore failure rolls the already-written schedule collection back", async () => {
  const oldSchedules = JSON.stringify(emptyMedicationDoseScheduleCollection());
  const oldOccurrences = JSON.stringify(emptyMedicationDoseOccurrenceCollection());
  const storage = makeStorage({
    medicationDoseSchedules: oldSchedules,
    medicationDoseOccurrences: oldOccurrences,
  }, "medicationDoseOccurrences");
  const value = backup({ data: { structured: emptyStructured({
    medicationDoseSchedules: { schemaVersion: 1, schedules: [backedUpDoseSchedule()] },
  }), photos: [] } });
  await expect(restoreTraceBackup(value, {
    confirmed: true,
    storage,
    openDatabase: async () => makePhotoDatabase(),
  })).rejects.toThrow("previous data was restored");
  expect(storage.value("medicationDoseSchedules")).toBe(oldSchedules);
  expect(storage.value("medicationDoseOccurrences")).toBe(oldOccurrences);
});
