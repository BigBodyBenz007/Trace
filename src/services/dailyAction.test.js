import {
  completeDailyAction,
  createDailyAction,
  dailyActionsForDate,
  emptyDailyActionCollection,
  getDailyActionError,
  normalizeDailyActionCollection,
  readDailyActions,
  skipDailyAction,
  updateDailyAction,
  writeDailyActions,
} from "./dailyAction";

const NOW = new Date("2026-08-24T14:30:00.000Z");

function draft(overrides = {}) {
  return {
    title: "Dentist appointment",
    actionType: "appointment",
    date: "2026-08-24",
    time: "09:30",
    timeWindow: null,
    durationMinutes: 45,
    location: "North clinic",
    notes: "Bring insurance card",
    recurrence: null,
    ...overrides,
  };
}

function action(overrides = {}) {
  return createDailyAction(draft(overrides), {
    id: overrides.id || "daily-action:dentist",
    now: NOW,
  });
}

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: jest.fn((key) => values.has(key) ? values.get(key) : null),
    setItem: jest.fn((key, value) => values.set(key, String(value))),
    value: (key) => values.get(key),
  };
}

test("creates a strict versioned daily action with local scheduling fields", () => {
  expect(action()).toEqual({
    schemaVersion: 1,
    id: "daily-action:dentist",
    title: "Dentist appointment",
    actionType: "appointment",
    date: "2026-08-24",
    time: "09:30",
    timeWindow: null,
    durationMinutes: 45,
    location: "North clinic",
    notes: "Bring insurance card",
    recurrence: null,
    status: "scheduled",
    completedAt: null,
    skippedAt: null,
    skipReason: "",
    customSkipReason: "",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  });

  expect(getDailyActionError(draft({ title: "" }))).toBe("Enter an action title.");
  expect(getDailyActionError(draft({ date: "2026-02-30" }))).toBe("Enter a valid action date.");
  expect(getDailyActionError(draft({ time: "25:00" }))).toBe("Enter a valid action time.");
  expect(getDailyActionError(draft({ time: null, timeWindow: { start: "11:00", end: "10:00" } })))
    .toBe("Enter a valid time window.");
  expect(getDailyActionError(draft({ durationMinutes: "1.5" })))
    .toBe("Enter a whole-number duration greater than zero.");
  expect(createDailyAction(draft(), { now: new Date("invalid") })).toBeNull();
});

test("updates details without changing identity and persists completion or skip metadata", () => {
  const existing = action();
  const updatedAt = new Date("2026-08-24T15:00:00.000Z");
  const updated = updateDailyAction(existing, draft({
    title: "Updated dentist",
    time: null,
    timeWindow: { start: "10:00", end: "11:30" },
  }), updatedAt);
  expect(updated).toMatchObject({
    id: existing.id,
    createdAt: existing.createdAt,
    title: "Updated dentist",
    time: null,
    timeWindow: { start: "10:00", end: "11:30" },
    updatedAt: updatedAt.toISOString(),
  });

  const completedAt = new Date("2026-08-24T16:00:00.000Z");
  expect(completeDailyAction(updated, completedAt)).toMatchObject({
    status: "completed",
    completedAt: completedAt.toISOString(),
    skippedAt: null,
  });

  const skippedAt = new Date("2026-08-24T17:00:00.000Z");
  expect(skipDailyAction(existing, "Other", "Weather delay", skippedAt)).toMatchObject({
    status: "skipped",
    skippedAt: skippedAt.toISOString(),
    skipReason: "Other",
    customSkipReason: "Weather delay",
    completedAt: null,
  });
  expect(skipDailyAction(existing, "Unknown reason", "", skippedAt)).toBeNull();

  const skipped = skipDailyAction(existing, "Other", "Weather delay", skippedAt);
  const completedAfterSkip = completeDailyAction(
    skipped,
    new Date("2026-08-24T18:00:00.000Z")
  );
  expect(completedAfterSkip).toMatchObject({
    status: "completed",
    completedAt: "2026-08-24T18:00:00.000Z",
    skippedAt: skippedAt.toISOString(),
    skipReason: "Other",
    customSkipReason: "Weather delay",
  });
});

test("filters one-time, daily, and weekly actions against browser-local date keys", () => {
  const monday = action({ id: "daily-action:one-time" });
  const daily = action({
    id: "daily-action:daily",
    title: "Vitamin D",
    actionType: "supplement",
    date: "2026-08-22",
    recurrence: { type: "daily", until: "2026-08-25" },
  });
  const weekly = action({
    id: "daily-action:weekly",
    title: "Monday meeting",
    actionType: "meeting",
    date: "2026-08-17",
    recurrence: { type: "weekly", weekdays: [1], until: null },
  });

  expect(dailyActionsForDate([monday, daily, weekly], "2026-08-24").map(({ id }) => id))
    .toEqual(["daily-action:one-time", "daily-action:daily", "daily-action:weekly"]);
  expect(dailyActionsForDate([monday, daily, weekly], "2026-08-25").map(({ id }) => id))
    .toEqual(["daily-action:daily"]);
  expect(dailyActionsForDate([monday, daily, weekly], "2026-08-26")).toEqual([]);
});

test("reads and writes only a valid collection and rejects duplicate or malformed records", () => {
  const first = action();
  const second = action({ id: "daily-action:second", title: "Pick up prescription" });
  const store = storage();
  expect(readDailyActions(store)).toEqual([]);
  expect(writeDailyActions(store, [first, second])).toEqual([first, second]);
  expect(JSON.parse(store.value("dailyActions"))).toEqual({ schemaVersion: 1, actions: [first, second] });
  expect(readDailyActions(store)).toEqual([first, second]);

  expect(normalizeDailyActionCollection({ schemaVersion: 1, actions: [first, first] })).toBeNull();
  expect(emptyDailyActionCollection()).toEqual({ schemaVersion: 1, actions: [] });
  expect(() => writeDailyActions(store, [{ ...first, status: "completed", completedAt: null }])).toThrow(
    "Invalid daily action data."
  );
});
