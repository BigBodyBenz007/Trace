import {
  createTraceBackup,
  parseTraceBackupText,
  restoreTraceBackup,
  TRACE_BACKUP_SCHEMA_VERSION,
  TRACE_STORAGE_KEYS,
  traceBackupFilename,
  validateTraceBackup,
} from "./traceBackup";

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
    ["nutritionGoals", "appSettings"].includes(key) ? null : [],
  ]).concat(Object.entries(overrides)));
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
  expect(traceBackupFilename(new Date(result.createdAt))).toBe("trace-backup-2026-08-12T10-20-30-000Z.json");
});

test("exports structured data and multiple photos without mutating sources", async () => {
  const memories = [{ id: "memory-1", date: "2001-02-03", images: ["photo-1", "photo-2"] }];
  const storage = makeStorage({ memories: JSON.stringify(memories), protocols: JSON.stringify([{ id: "protocol-1" }]) });
  const database = makePhotoDatabase([
    { id: "photo-1", memoryId: "memory-1", blob: new Blob(["one"], { type: "image/png" }) },
    { id: "photo-2", memoryId: "memory-1", blob: new Blob(["two"], { type: "image/jpeg" }) },
  ]);
  const result = await createTraceBackup({ storage, openDatabase: async () => database });
  expect(result.data.structured.memories).toEqual(memories);
  expect(result.data.structured.protocols).toEqual([{ id: "protocol-1" }]);
  expect(result.data.photos.map(({ id, blob }) => [id, blob.type])).toEqual([
    ["photo-1", "image/png"], ["photo-2", "image/jpeg"],
  ]);
  expect(database.records()[0].blob).toBeInstanceOf(Blob);
  expect(memories[0].images).toEqual(["photo-1", "photo-2"]);
});

test("validates summaries and rejects corrupt, future, and missing-reference backups", () => {
  const valid = backup({ data: { structured: emptyStructured({
    memories: [{ id: "memory-1", date: "2026-01-02", images: ["photo-1"] }],
    nutritionEntries: [{ id: "meal" }], healthMeasurementEntries: [{ id: "health" }], workoutEntries: [{ id: "workout" }],
    medicationEntries: [{ id: "dose" }], protocols: [{ id: "protocol" }],
    trophyCaseEntries: [{ id: "trophy" }],
  }), photos: [encodedPhoto()] } });
  expect(validateTraceBackup(valid).summary).toMatchObject({ memories: 1, photos: 1, nutritionEntries: 1, healthMeasurementEntries: 1, workouts: 1, medicationEntries: 1, protocols: 1, trophyCaseEntries: 1 });
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
  const structured = emptyStructured({
    memories: [{ id: "memory-1", date: "1999-06-12", categories: ["Family"], tags: ["legacy"], images: ["photo-1"] }],
    nutritionEntries: [{ id: "meal-1", sodium: 640 }], healthMeasurementEntries: [{ id: "health-1", measurements: { height: { unit: "ft-in", feet: 6, inches: 2 }, leftCalf: { value: 16, unit: "in" }, rightCalf: { value: 41, unit: "cm" } } }], appSettings: { schemaVersion: 1, units: { weight: "kg", height: "cm", circumference: "cm" } }, workoutEntries: [workoutWithDrops],
    medicationEntries: [{ id: "dose-1" }], medicationCompounds: [{ id: "compound-1" }],
    protocols: [{ id: "protocol-1" }], trophyCaseEntries: [{ id: "trophy-1" }],
    savedExercises: [{ id: "exercise-1" }], userFoods: [{ id: "food-1" }],
    nutritionGoals: { calories: 2000, sodium: 2300 },
  });
  const value = backup({ data: { structured, photos: [encodedPhoto("photo-1", "hello", "image/webp")] } });
  const storage = makeStorage({ memories: JSON.stringify([{ id: "old" }]) });
  const database = makePhotoDatabase([{ id: "old-photo", blob: new Blob(["old"]) }]);
  const summary = await restoreTraceBackup(value, { confirmed: true, storage, openDatabase: async () => database });
  expect(summary).toMatchObject({ memories: 1, photos: 1, workouts: 1 });
  expect(JSON.parse(storage.value("memories"))[0]).toMatchObject({ id: "memory-1", date: "1999-06-12", images: ["photo-1"] });
  expect(JSON.parse(storage.value("nutritionEntries"))).toEqual([{ id: "meal-1", sodium: 640 }]);
  expect(JSON.parse(storage.value("nutritionGoals"))).toEqual({ calories: 2000, sodium: 2300 });
  expect(JSON.parse(storage.value("healthMeasurementEntries"))).toEqual([{ id: "health-1", measurements: { height: { unit: "ft-in", feet: 6, inches: 2 }, leftCalf: { value: 16, unit: "in" }, rightCalf: { value: 41, unit: "cm" } } }]);
  expect(JSON.parse(storage.value("appSettings"))).toEqual({ schemaVersion: 1, units: { weight: "kg", height: "cm", circumference: "cm" } });
  expect(JSON.parse(storage.value("workoutEntries"))).toEqual([workoutWithDrops]);
  expect(JSON.parse(storage.value("medicationEntries"))).toEqual([{ id: "dose-1" }]);
  expect(JSON.parse(storage.value("protocols"))).toEqual([{ id: "protocol-1" }]);
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
  const storage = makeStorage({ memories: originalMemories });
  const database = makePhotoDatabase(
    [{ id: "old-photo", blob: new Blob(["old"], { type: "image/png" }) }],
    { failWriteCount: 1 }
  );
  const value = backup({ data: { structured: emptyStructured({ memories: [{ id: "new" }] }), photos: [] } });
  await expect(restoreTraceBackup(value, { confirmed: true, storage, openDatabase: async () => database }))
    .rejects.toThrow("previous data was restored");
  expect(storage.value("memories")).toBe(originalMemories);
  expect(database.records().map(({ id }) => id)).toEqual(["old-photo"]);
});

test("only audited Trace storage is exported; caches and migration markers are absent", async () => {
  const storage = makeStorage({ memories: "[]", unrelated: JSON.stringify({ secret: true }) });
  const result = await createTraceBackup({ storage, openDatabase: async () => makePhotoDatabase() });
  expect(Object.keys(result.data.structured)).toEqual(TRACE_STORAGE_KEYS);
  expect(JSON.stringify(result)).not.toMatch(/unrelated|service-worker|trace-app-shell|migrations/);
});
