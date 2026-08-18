import { deriveLifeCurrent, LIFE_CURRENT_TUNING } from "./lifeCurrent";

function localIso(year, month, day, hour = 12, minute = 0) {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function localKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function memory(id, date) {
  return { id, title: `Memory ${id}`, description: "ignored", date, images: ["large-photo"], favorite: true };
}

function workout(id, occurredAt, extras = {}) {
  return { id, occurredAt, exercises: [{ id: "exercise", sets: [{ id: "set" }] }], photos: ["photo"], ...extras };
}

function nutrition(id, loggedAt) {
  return { id, loggedAt, calories: 1000, protein: 50 };
}

function medication(id, occurredAt, extras = {}) {
  return { id, occurredAt, dose: { amount: 1, unit: "mg" }, route: { code: "oral" }, ...extras };
}

function day(result, dateKey) {
  return result.days.find((bucket) => bucket.dateKey === dateKey);
}

test("returns sparse empty output and ignores protocol plans", () => {
  const empty = deriveLifeCurrent();
  expect(empty).toEqual({
    days: [],
    months: [],
    years: [],
    bounds: { earliestDateKey: null, latestDateKey: null },
    unbucketed: { memories: [], trophies: [] },
  });
  expect(deriveLifeCurrent({ protocols: [{ id: "plan", items: new Array(100).fill({}) }] })).toEqual(empty);
});

test("buckets a dated Memory and minimizes copied source data", () => {
  const result = deriveLifeCurrent({ memories: [memory("m1", "2026-08-11")] });
  expect(result.days).toHaveLength(1);
  expect(result.days[0]).toMatchObject({
    dateKey: "2026-08-11",
    year: 2026,
    month: 8,
    day: 11,
    datePrecision: "day",
    contributions: {
      memory: { count: 1, value: LIFE_CURRENT_TUNING.memory.first, sourceIds: ["m1"] },
    },
  });
  expect(JSON.stringify(result)).not.toContain("ignored");
  expect(JSON.stringify(result)).not.toContain("large-photo");
});

test("keeps missing and malformed Memory dates unbucketed instead of assigning today", () => {
  const result = deriveLifeCurrent({
    memories: [memory("missing", ""), memory("bad", "2026-02-30"), memory("text", "sometime")],
  });
  expect(result.days).toEqual([]);
  expect(result.unbucketed.memories).toEqual([
    { sourceId: "bad", reason: "invalid-date" },
    { sourceId: "missing", reason: "missing-date" },
    { sourceId: "text", reason: "invalid-date" },
  ]);
});

test("applies diminishing Memory returns and the daily cap", () => {
  const memories = Array.from({ length: 6 }, (_, index) => memory(`m${index}`, "2026-08-11"));
  const result = deriveLifeCurrent({ memories });
  const contribution = result.days[0].contributions.memory;
  expect(contribution.count).toBe(6);
  expect(contribution.value).toBe(LIFE_CURRENT_TUNING.memory.dailyCap);

  const two = deriveLifeCurrent({ memories: memories.slice(0, 2) }).days[0].contributions.memory.value;
  expect(two).toBe(LIFE_CURRENT_TUNING.memory.first + LIFE_CURRENT_TUNING.memory.additional);
  expect(two).toBeLessThan(LIFE_CURRENT_TUNING.memory.first * 2);
});

test("orders same-day sources deterministically and backdated Memories extend bounds", () => {
  const inputs = [memory("z", "2026-08-11"), memory("a", "2026-08-11"), memory("early", "1980-01-02")];
  const result = deriveLifeCurrent({ memories: inputs });
  expect(day(result, "2026-08-11").contributions.memory.sourceIds).toEqual(["a", "z"]);
  expect(result.bounds).toEqual({ earliestDateKey: "1980-01-02", latestDateKey: "2026-08-11" });
});

test("counts workouts at workout level with diminishing capped daily contribution", () => {
  const timestamp = localIso(2026, 8, 11);
  const first = workout("w1", timestamp, { exercises: new Array(20).fill({ sets: new Array(20).fill({}) }) });
  const one = deriveLifeCurrent({ workoutEntries: [first] }).days[0].contributions.workout;
  expect(one).toEqual({ count: 1, value: LIFE_CURRENT_TUNING.workout.first, sourceIds: ["w1"] });

  const several = deriveLifeCurrent({
    workoutEntries: [first, workout("w2", timestamp), workout("w3", timestamp)],
  }).days[0].contributions.workout;
  expect(several.count).toBe(3);
  expect(several.value).toBe(LIFE_CURRENT_TUNING.workout.dailyCap);
});

test("uses capped daily presence for nutrition, Health measurements, and medications", () => {
  const timestamp = localIso(2026, 8, 11);
  const result = deriveLifeCurrent({
    nutritionEntries: Array.from({ length: 20 }, (_, index) => nutrition(`n${index}`, timestamp)),
    healthMeasurementEntries: Array.from({ length: 20 }, (_, index) => ({ id: `h${index}`, occurredAt: timestamp, measurements: { weight: { value: index + 1, unit: "lb" } } })),
    medicationEntries: Array.from({ length: 20 }, (_, index) =>
      medication(`d${index}`, timestamp, { dose: { amount: index + 1, unit: "custom" }, route: { code: `route-${index}` } })
    ),
  });
  expect(result.days[0].contributions.nutrition).toMatchObject({
    count: 20,
    value: LIFE_CURRENT_TUNING.nutrition.dailyPresence,
  });
  expect(result.days[0].contributions.medication).toMatchObject({
    count: 20,
    value: LIFE_CURRENT_TUNING.medication.dailyPresence,
  });
  expect(result.days[0].contributions.health).toMatchObject({
    count: 20,
    value: LIFE_CURRENT_TUNING.health.dailyPresence,
  });
});

test("saved Journal activity contributes silently by ID and date without leaking content", () => {
  const journalEntry = {
    id: "journal-private",
    visibility: "private",
    title: "Never expose this title",
    body: "Never expose this body",
    mood: "Anxious",
    tags: ["secret-tag"],
    date: "2026-08-11",
    time: "23:55",
  };
  const result = deriveLifeCurrent({
    journalEntries: [journalEntry],
    journalDraft: { form: { ...journalEntry, id: undefined } },
  });
  expect(result.days).toHaveLength(1);
  expect(result.days[0].contributions.journal).toEqual({
    count: 1,
    value: LIFE_CURRENT_TUNING.journal.dailyPresence,
    sourceIds: ["journal-private"],
  });
  expect(JSON.stringify(result)).not.toMatch(/Never expose|Anxious|secret-tag/);

  const edited = deriveLifeCurrent({ journalEntries: [{ ...journalEntry, body: "Edited private content" }] });
  expect(edited.days[0].contributions.journal.count).toBe(1);
  expect(deriveLifeCurrent({ journalEntries: [] }).days).toEqual([]);
});

test("a height-only Health record is one activity and Settings are not activity sources", () => {
  const timestamp = localIso(2026, 8, 11);
  const result = deriveLifeCurrent({
    healthMeasurementEntries: [{ id: "height", occurredAt: timestamp, measurements: { height: { unit: "ft-in", feet: 6, inches: 2 }, leftCalf: { value: 16, unit: "in" }, rightCalf: { value: 16.5, unit: "in" } } }],
    appSettings: { schemaVersion: 1, units: { height: "cm" } },
  });
  expect(result.days[0].contributions.health).toEqual({ count: 1, value: LIFE_CURRENT_TUNING.health.dailyPresence, sourceIds: ["height"] });
});

test("keeps domain contributions independent and applies fixed saturation", () => {
  const timestamp = localIso(2026, 8, 11);
  const result = deriveLifeCurrent({
    memories: [memory("m", "2026-08-11")],
    workoutEntries: [workout("w", timestamp)],
    nutritionEntries: [nutrition("n", timestamp)],
    medicationEntries: [medication("d", timestamp)],
  });
  const bucket = result.days[0];
  const expectedRaw =
    LIFE_CURRENT_TUNING.memory.first +
    LIFE_CURRENT_TUNING.workout.first +
    LIFE_CURRENT_TUNING.nutrition.dailyPresence +
    LIFE_CURRENT_TUNING.medication.dailyPresence;
  expect(bucket.rawActivity).toBeCloseTo(expectedRaw);
  expect(bucket.intensity).toBeCloseTo(1 - Math.exp(-expectedRaw / LIFE_CURRENT_TUNING.intensitySaturation));
  expect(bucket.intensity).toBeGreaterThanOrEqual(0);
  expect(bucket.intensity).toBeLessThanOrEqual(1);
});

test("Memory Trophy modifies its live source day without duplicating the Memory", () => {
  const result = deriveLifeCurrent({
    memories: [memory("m1", "2026-03-10")],
    trophyCaseEntries: [{
      id: "t1",
      sourceType: "memory",
      sourceKey: "memory|m1",
      sourceId: "m1",
      achievedAt: "2026-03-10T12:00:00",
      addedToTrophyCaseAt: "2026-08-11T12:00:00.000Z",
    }],
  });
  expect(result.days).toHaveLength(1);
  expect(result.days[0].dateKey).toBe("2026-03-10");
  expect(result.days[0].contributions.memory.count).toBe(1);
  expect(result.days[0].contributions.trophy).toMatchObject({ count: 1, value: LIFE_CURRENT_TUNING.trophy.each });
});

test("Workout Trophy resolves its workout date and duplicate source keys do not multiply significance", () => {
  const occurredAt = localIso(2026, 4, 5);
  const trophy = {
    id: "t1",
    sourceType: "workout-pr",
    sourceKey: "workout-pr|press|heaviest|w1|set1",
    sourceId: "w1",
    achievedAt: occurredAt,
    addedToTrophyCaseAt: localIso(2030, 1, 1),
  };
  const result = deriveLifeCurrent({
    workoutEntries: [workout("w1", occurredAt)],
    trophyCaseEntries: [trophy, { ...trophy, id: "duplicate" }],
  });
  expect(result.days).toHaveLength(1);
  expect(result.days[0].contributions.workout.count).toBe(1);
  expect(result.days[0].contributions.trophy.count).toBe(1);
  expect(result.days[0].dateKey).toBe(localKey(occurredAt));
});

test("uses reliable Trophy snapshot dates when sources are gone and never invents an unresolved date", () => {
  const achievedAt = localIso(1999, 12, 31);
  const result = deriveLifeCurrent({
    trophyCaseEntries: [
      { id: "memory-snapshot", sourceType: "memory", sourceKey: "memory|gone", sourceId: "gone", sourceSnapshot: { date: "1988-06-07" }, addedToTrophyCaseAt: localIso(2026, 1, 1) },
      { id: "workout-snapshot", sourceType: "workout-pr", sourceKey: "workout|gone", sourceId: "gone", achievedAt, addedToTrophyCaseAt: localIso(2026, 1, 1) },
      { id: "unknown", sourceType: "memory", sourceKey: "memory|unknown", sourceId: "unknown", addedToTrophyCaseAt: localIso(2026, 1, 1) },
    ],
  });
  expect(result.days.map(({ dateKey }) => dateKey)).toEqual(["1988-06-07", localKey(achievedAt)]);
  expect(result.days.some(({ dateKey }) => dateKey === localKey(localIso(2026, 1, 1)))).toBe(false);
  expect(result.unbucketed.trophies).toEqual([{ sourceId: "unknown", reason: "unresolved-date" }]);
});

test("caps multiple distinct Trophy modifiers on one day", () => {
  const trophies = Array.from({ length: 5 }, (_, index) => ({
    id: `t${index}`,
    sourceType: "memory",
    sourceKey: `memory|gone-${index}`,
    sourceSnapshot: { date: "2020-01-01" },
  }));
  const contribution = deriveLifeCurrent({ trophyCaseEntries: trophies }).days[0].contributions.trophy;
  expect(contribution.count).toBe(5);
  expect(contribution.value).toBe(LIFE_CURRENT_TUNING.trophy.dailyCap);
});

test("normalizes ISO timestamps to the runtime local calendar day across UTC offsets", () => {
  const timestamp = "2026-01-01T00:30:00+14:00";
  const expected = localKey(timestamp);
  const result = deriveLifeCurrent({ medicationEntries: [medication("m", timestamp)] });
  expect(result.days[0].dateKey).toBe(expected);
});

test("handles leap days, month/year boundaries, sparse years, decades, and future logs", () => {
  const future = localIso(2045, 7, 2);
  const result = deriveLifeCurrent({
    memories: [memory("leap", "2024-02-29"), memory("old", "1950-01-01")],
    workoutEntries: [workout("year-end", localIso(2025, 12, 31, 23, 59))],
    medicationEntries: [medication("future", future)],
  });
  expect(result.days.map(({ dateKey }) => dateKey)).toEqual([
    "1950-01-01",
    "2024-02-29",
    "2025-12-31",
    "2045-07-02",
  ]);
  expect(result.months).toHaveLength(4);
  expect(result.years.map(({ year }) => year)).toEqual([1950, 2024, 2025, 2045]);
  expect(result.bounds).toEqual({ earliestDateKey: "1950-01-01", latestDateKey: "2045-07-02" });
});

test("derives sparse month and year summaries from populated days", () => {
  const result = deriveLifeCurrent({
    memories: [memory("jan-1", "2026-01-01"), memory("jan-2", "2026-01-03"), memory("mar", "2026-03-01"), memory("next", "2027-01-01")],
  });
  expect(result.months.map(({ monthKey, populatedDayCount }) => [monthKey, populatedDayCount])).toEqual([
    ["2026-01", 2],
    ["2026-03", 1],
    ["2027-01", 1],
  ]);
  expect(result.years.map(({ year, populatedMonthCount, populatedDayCount }) => ({ year, populatedMonthCount, populatedDayCount }))).toEqual([
    { year: 2026, populatedMonthCount: 2, populatedDayCount: 3 },
    { year: 2027, populatedMonthCount: 1, populatedDayCount: 1 },
  ]);
  expect(result.months[0].contributions.memory).toMatchObject({ eventCount: 2, activeDays: 2 });
});

test("is deterministic across shuffled inputs and repeated derivation", () => {
  const timestamp = localIso(2026, 8, 11);
  const source = {
    memories: [memory("z", "2026-08-11"), memory("a", "2026-08-11")],
    nutritionEntries: [nutrition("n2", timestamp), nutrition("n1", timestamp)],
    workoutEntries: [workout("w2", timestamp), workout("w1", timestamp)],
    medicationEntries: [medication("d2", timestamp), medication("d1", timestamp)],
  };
  const first = deriveLifeCurrent(source);
  const shuffled = deriveLifeCurrent({
    memories: [...source.memories].reverse(),
    nutritionEntries: [...source.nutritionEntries].reverse(),
    workoutEntries: [...source.workoutEntries].reverse(),
    medicationEntries: [...source.medicationEntries].reverse(),
  });
  expect(shuffled).toEqual(first);
  expect(deriveLifeCurrent(source)).toEqual(first);
});

test("does not mutate source arrays or nested snapshots", () => {
  const input = {
    memories: [memory("m", "2026-01-01")],
    workoutEntries: [workout("w", localIso(2026, 1, 1))],
    nutritionEntries: [nutrition("n", localIso(2026, 1, 1))],
    medicationEntries: [medication("d", localIso(2026, 1, 1))],
    trophyCaseEntries: [{ id: "t", sourceType: "memory", sourceKey: "memory|m", sourceId: "m", sourceSnapshot: { date: "2026-01-01" } }],
  };
  const before = JSON.parse(JSON.stringify(input));
  deriveLifeCurrent(input);
  expect(input).toEqual(before);
});

test("derives a deterministic multi-decade synthetic history without pathological slowdown", () => {
  const memories = [];
  const workoutEntries = [];
  const nutritionEntries = [];
  const medicationEntries = [];
  for (let year = 1940; year <= 2040; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const date = `${year}-${String(month).padStart(2, "0")}-15`;
      const timestamp = localIso(year, month, 15);
      memories.push(memory(`m-${year}-${month}`, date));
      workoutEntries.push(workout(`w-${year}-${month}`, timestamp));
      nutritionEntries.push(nutrition(`n-${year}-${month}`, timestamp));
      medicationEntries.push(medication(`d-${year}-${month}`, timestamp));
    }
  }
  const startedAt = Date.now();
  const result = deriveLifeCurrent({ memories, workoutEntries, nutritionEntries, medicationEntries });
  const elapsed = Date.now() - startedAt;
  expect(result.days).toHaveLength(101 * 12);
  expect(result.months).toHaveLength(101 * 12);
  expect(result.years).toHaveLength(101);
  expect(elapsed).toBeLessThan(5000);
});
