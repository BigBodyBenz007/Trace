import {
  describeExerciseRecord,
  getExerciseRecordDescriptor,
  getExerciseRecordTrackKey,
} from "./exerciseRecordDescriptor";

test.each([
  ["heaviest-weight", "Heaviest Weight", "100 lb × 5 reps", "New Heaviest Weight Record"],
  ["reps-at-weight", "Reps at Weight", "100 lb × 8 reps", "New Reps-at-Weight Record"],
  ["bodyweight-reps", "Bodyweight Reps", "12 reps", "New Bodyweight Reps Record"],
])("formats %s with its own descriptor", (recordType, label, value, status) => {
  expect(
    describeExerciseRecord({ recordType, weight: 100, unit: "lb", reps: recordType === "heaviest-weight" ? 5 : recordType === "reps-at-weight" ? 8 : 12 })
  ).toEqual({ label, value, status });
});

test("formats matched status with the specific record type", () => {
  expect(describeExerciseRecord({
    recordType: "reps-at-weight",
    achievement: "matched",
    weight: 100,
    unit: "lb",
    reps: 8,
  }).status).toBe("Matched Reps-at-Weight Record");
});

test("formats current and former status without changing the record value", () => {
  const record = {
    recordType: "heaviest-weight",
    weight: 120,
    unit: "lb",
    reps: 5,
  };
  expect(describeExerciseRecord(record, "current").status).toBe(
    "Current Heaviest Weight Record"
  );
  expect(describeExerciseRecord(record, "former").status).toBe(
    "Former Heaviest Weight Record"
  );
});

test("defines independent descriptor-driven record tracks", () => {
  expect(getExerciseRecordTrackKey({ recordType: "heaviest-weight", unit: "lb", weight: 100 }))
    .toBe("heaviest-weight|lb");
  expect(getExerciseRecordTrackKey({ recordType: "heaviest-weight", unit: "kg", weight: 100 }))
    .toBe("heaviest-weight|kg");
  expect(getExerciseRecordTrackKey({ recordType: "reps-at-weight", unit: "lb", weight: 50 }))
    .toBe("reps-at-weight|lb|50");
  expect(getExerciseRecordTrackKey({ recordType: "reps-at-weight", unit: "lb", weight: 100 }))
    .toBe("reps-at-weight|lb|100");
  expect(getExerciseRecordTrackKey({ recordType: "bodyweight-reps" }))
    .toBe("bodyweight-reps|bodyweight");
});

test("keeps unknown future record types safe for shared presentation", () => {
  expect(getExerciseRecordDescriptor("future-record")).toBeNull();
  expect(describeExerciseRecord({ recordType: "future-record" })).toEqual({
    label: "Personal Record",
    value: "Achievement",
    status: "New Personal Record",
  });
});
