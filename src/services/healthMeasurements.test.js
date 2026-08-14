import {
  createHealthMeasurementEntry,
  readHealthMeasurementEntries,
  updateHealthMeasurementEntry,
  validateHealthMeasurementDraft,
  writeHealthMeasurementEntries,
} from "./healthMeasurements";

function draft(measurements, extras = {}) {
  return { date: "2026-08-14", time: "07:30", measurements, notes: "", ...extras };
}

test("creates versioned stable-unit entries for partial and multiple measurements", () => {
  const result = createHealthMeasurementEntry(draft({
    weight: { value: "255", unit: "lb" },
    waist: { value: "40.5", unit: "in" },
    bodyFat: { value: "27.5", unit: "%" },
  }, { notes: "Morning" }), { id: "health-1", now: () => new Date("2026-08-14T13:00:00Z") });
  expect(result.value).toMatchObject({ id: "health-1", schemaVersion: 1, createdAt: "2026-08-14T13:00:00.000Z", notes: "Morning" });
  expect(result.value.measurements).toEqual({ weight: { value: 255, unit: "lb" }, bodyFat: { value: 27.5, unit: "%" }, waist: { value: 40.5, unit: "in" } });
});

test.each([
  ["empty", draft({})],
  ["malformed", draft({ weight: { value: "nope", unit: "lb" } })],
  ["negative", draft({ waist: { value: "-1", unit: "cm" } })],
  ["zero body fat", draft({ bodyFat: { value: "0", unit: "%" } })],
  ["body fat above 100", draft({ bodyFat: { value: "101", unit: "%" } })],
])("rejects %s measurements", (name, value) => {
  expect(validateHealthMeasurementDraft(value).error).toBeTruthy();
});

test("editing preserves historical identity and creation time", () => {
  const existing = createHealthMeasurementEntry(draft({ weight: { value: "80", unit: "kg" } }), { id: "stable", now: () => new Date("2026-01-01") }).value;
  const updated = updateHealthMeasurementEntry(existing, draft({ chest: { value: "100", unit: "cm" } })).value;
  expect(updated.id).toBe("stable");
  expect(updated.createdAt).toBe(existing.createdAt);
  expect(updated.measurements).toEqual({ chest: { value: 100, unit: "cm" } });
});

test("storage round-trips an accumulating history", () => {
  const storage = { value: null, getItem: jest.fn(() => storage.value), setItem: jest.fn((key, value) => { storage.value = value; }) };
  const entries = [{ id: "one" }, { id: "two" }];
  writeHealthMeasurementEntries(storage, entries);
  expect(readHealthMeasurementEntries(storage)).toEqual(entries);
});

test("stores imperial and metric height representations and accepts height-only entries", () => {
  expect(createHealthMeasurementEntry(draft({}, { height: { unit: "ft-in", feet: "6", inches: "2.5" } }), { id: "imperial" }).value.measurements.height).toEqual({ unit: "ft-in", feet: 6, inches: 2.5 });
  expect(createHealthMeasurementEntry(draft({}, { height: { unit: "cm", centimeters: "188" } }), { id: "metric" }).value.measurements.height).toEqual({ unit: "cm", value: 188 });
});

test.each([
  { unit: "ft-in", feet: "0", inches: "0" },
  { unit: "ft-in", feet: "6", inches: "12" },
  { unit: "ft-in", feet: "-1", inches: "2" },
  { unit: "cm", centimeters: "0" },
  { unit: "cm", centimeters: "bad" },
])("rejects invalid height %#", (height) => {
  expect(validateHealthMeasurementDraft(draft({}, { height })).error).toBeTruthy();
});

test("calf measurements validate, preserve units, and survive storage", () => {
  const entry = createHealthMeasurementEntry(draft({ leftCalf: { value: "16.25", unit: "in" }, rightCalf: { value: "41", unit: "cm" } }), { id: "calves" }).value;
  expect(entry.measurements).toMatchObject({ leftCalf: { value: 16.25, unit: "in" }, rightCalf: { value: 41, unit: "cm" } });
  const storage = { raw: null, setItem(key, value) { this.raw = value; }, getItem() { return this.raw; } };
  writeHealthMeasurementEntries(storage, [entry]);
  expect(readHealthMeasurementEntries(storage)[0].measurements).toEqual(entry.measurements);
});
