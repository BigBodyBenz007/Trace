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
import { createUserFood } from "./userFoodCatalog";
import { createWorkoutDraftFromPlannedWorkout } from "./workoutDraft";
import { createDailyAction, emptyDailyActionCollection } from "./dailyAction";
import {
  completeProtocolOccurrence,
  emptyProtocolOccurrenceCollection,
} from "./protocolOccurrence";

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
  expect(traceBackupFilename(new Date(result.createdAt))).toBe("trace-backup-2026-08-12T10-20-30-000Z.json");
});

test("exports structured data and multiple photos without mutating sources", async () => {
  const memories = [{ id: "memory-1", date: "2001-02-03", images: ["photo-1", "photo-2"] }];
  const plans = [plannedWorkout()];
  const workoutDraft = activeWorkoutDraft({ plannedWorkoutId: "planned-workout:orphaned" });
  const actions = { schemaVersion: 1, actions: [dailyAction()] };
  const occurrences = { schemaVersion: 1, occurrences: [protocolOccurrence()] };
  const storage = makeStorage({
    memories: JSON.stringify(memories),
    plannedWorkouts: JSON.stringify(plans),
    workoutDraft: JSON.stringify(workoutDraft),
    protocols: JSON.stringify([{ id: "protocol-1" }]),
    dailyActions: JSON.stringify(actions),
    protocolOccurrences: JSON.stringify(occurrences),
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
  expect(result.data.structured.workoutEntries).toBeNull();
  expect(result.data.photos.map(({ id, blob }) => [id, blob.type])).toEqual([
    ["photo-1", "image/png"], ["photo-2", "image/jpeg"],
  ]);
  expect(database.records()[0].blob).toBeInstanceOf(Blob);
  expect(memories[0].images).toEqual(["photo-1", "photo-2"]);
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
    trophyCaseEntries: [{ id: "trophy" }],
  }), photos: [encodedPhoto()] } });
  expect(validateTraceBackup(valid).summary).toMatchObject({ memories: 1, photos: 1, nutritionEntries: 1, healthMeasurementEntries: 1, plannedWorkouts: 1, activeWorkoutDraft: true, workouts: 1, medicationEntries: 1, protocols: 1, protocolOccurrences: 1, dailyActions: 1, trophyCaseEntries: 1 });
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
  expect(summary).toMatchObject({ memories: 1, photos: 1, plannedWorkouts: 1, dailyActions: 1, protocolOccurrences: 1, activeWorkoutDraft: true, workouts: 1 });
  expect(JSON.parse(storage.value("memories"))[0]).toMatchObject({ id: "memory-1", date: "1999-06-12", images: ["photo-1"] });
  expect(JSON.parse(storage.value("nutritionEntries"))).toEqual([{ id: "meal-1", sodium: 640 }]);
  expect(JSON.parse(storage.value("nutritionGoals"))).toEqual({ calories: 2000, sodium: 2300 });
  expect(JSON.parse(storage.value("healthMeasurementEntries"))).toEqual([{ id: "health-1", measurements: { height: { unit: "ft-in", feet: 6, inches: 2 }, leftCalf: { value: 16, unit: "in" }, rightCalf: { value: 41, unit: "cm" } } }]);
  expect(JSON.parse(storage.value("appSettings"))).toEqual({ schemaVersion: 1, units: { weight: "kg", height: "cm", circumference: "cm" }, lifeCurrentThemeId: "river" });
  expect(JSON.parse(storage.value("workoutEntries"))).toEqual([workoutWithDrops]);
  expect(JSON.parse(storage.value("medicationEntries"))).toEqual([{ id: "dose-1" }]);
  expect(JSON.parse(storage.value("protocols"))).toEqual([{ id: "protocol-1" }]);
  expect(JSON.parse(storage.value("dailyActions"))).toEqual({ schemaVersion: 1, actions: [dailyAction()] });
  expect(JSON.parse(storage.value("protocolOccurrences"))).toEqual({ schemaVersion: 1, occurrences: [protocolOccurrence()] });
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
  expect(readAppSettings(storage).lifeCurrentThemeId).toBe("river");
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

test("new backups preserve and restore the selected Life Current theme", async () => {
  const source = makeStorage({
    appSettings: JSON.stringify({
      schemaVersion: 1,
      units: { weight: "kg", height: "cm", circumference: "cm" },
      lifeCurrentThemeId: "haunted-forest",
    }),
  });
  const value = await createTraceBackup({
    storage: source,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(value.data.structured.appSettings).toMatchObject({
    lifeCurrentThemeId: "haunted-forest",
  });

  const restored = makeStorage();
  await restoreTraceBackup(value, {
    confirmed: true,
    storage: restored,
    openDatabase: async () => makePhotoDatabase(),
  });
  expect(readAppSettings(restored)).toMatchObject({
    units: { weight: "kg", height: "cm", circumference: "cm" },
    lifeCurrentThemeId: "haunted-forest",
  });
});

test("legacy and invalid backup theme values safely fall back to River without corrupting settings", async () => {
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
      schemaVersion: 1,
      units: { weight: "kg", height: "cm", circumference: "cm" },
      lifeCurrentThemeId: "river",
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
  const storage = makeStorage({ memories: "[]", unrelated: JSON.stringify({ secret: true }) });
  const result = await createTraceBackup({ storage, openDatabase: async () => makePhotoDatabase() });
  expect(Object.keys(result.data.structured)).toEqual(TRACE_STORAGE_KEYS);
  expect(JSON.stringify(result)).not.toMatch(/unrelated|service-worker|trace-app-shell|migrations/);
});
