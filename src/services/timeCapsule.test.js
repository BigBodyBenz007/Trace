import {
  TIME_CAPSULE_REMINDER_STATE,
  TIME_CAPSULE_STATE,
  addCalendarDays,
  addCalendarYears,
  createSealedTimeCapsule,
  createTimeCapsuleDraft,
  localDateKey,
  millisecondsUntilNextLocalMidnight,
  normalizeTimeCapsule,
  pendingTimeCapsuleReminder,
  readTimeCapsules,
  reminderFor,
  timeCapsuleDraftHasMeaningfulWork,
  timeCapsuleState,
} from "./timeCapsule";

const draft = (overrides = {}) => createTimeCapsuleDraft({
  id: "draft-1", capsuleId: "capsule-1", createdAt: "2026-09-11T12:00:00.000Z",
  form: { name: "Future me", text: "Private message", openOn: "2027-09-11" }, media: [], ...overrides,
}, new Date("2026-09-11T12:00:00.000Z"));

test("uses calendar years with sensible leap-day behavior", () => {
  expect(addCalendarYears("2024-02-29", 1)).toBe("2025-02-28");
  expect(addCalendarYears("2024-02-29", 5)).toBe("2029-02-28");
  expect(addCalendarYears("2026-09-11", 10)).toBe("2036-09-11");
  expect(addCalendarDays("2024-02-28", 1)).toBe("2024-02-29");
  expect(localDateKey(new Date(2026, 8, 11, 23, 59))).toBe("2026-09-11");
  const now = new Date(2026, 2, 8, 1, 30);
  const nextRefresh = new Date(now.getTime() + millisecondsUntilNextLocalMidnight(now));
  expect(localDateKey(nextRefresh)).toBe("2026-03-09");
  expect(nextRefresh.getHours()).toBe(0);
});

test("seals only meaningful drafts with a future local date", () => {
  expect(createSealedTimeCapsule(draft(), new Date("2026-09-11T12:00:00"))).toMatchObject({ value: { id: "capsule-1", openedAt: null } });
  expect(createSealedTimeCapsule(draft({ form: { name: "Name", text: "", openOn: "2026-09-11" } }), new Date("2026-09-11T12:00:00"))).toMatchObject({ error: expect.any(String) });
  expect(timeCapsuleDraftHasMeaningfulWork(draft({ form: { name: "", text: "", openOn: "2027-09-11" } }))).toBe(false);
});

test("derives sealed, available, and permanently opened states", () => {
  const capsule = createSealedTimeCapsule(draft(), new Date("2026-09-11T12:00:00")).value;
  expect(timeCapsuleState(capsule, "2027-09-10")).toBe(TIME_CAPSULE_STATE.SEALED);
  expect(timeCapsuleState(capsule, "2027-09-11")).toBe(TIME_CAPSULE_STATE.AVAILABLE);
  expect(timeCapsuleState({ ...capsule, openedAt: "2027-09-11T00:01:00.000Z" }, "2020-01-01")).toBe(TIME_CAPSULE_STATE.OPENED);
});

test("orders eligible reminders deterministically and honors dismiss and postpone", () => {
  const first = createSealedTimeCapsule(draft(), new Date("2026-09-11T12:00:00")).value;
  const second = { ...first, id: "capsule-2", name: "Second", sealedAt: "2026-09-12T12:00:00.000Z" };
  expect(pendingTimeCapsuleReminder([second, first], [], "2027-09-11").id).toBe("capsule-1");
  expect(pendingTimeCapsuleReminder([first], [reminderFor(first.id, TIME_CAPSULE_REMINDER_STATE.POSTPONED, "2027-09-12")], "2027-09-11")).toBeNull();
  expect(pendingTimeCapsuleReminder([first], [reminderFor(first.id, TIME_CAPSULE_REMINDER_STATE.ACKNOWLEDGED)], "2027-09-12")).toBeNull();
});

test("malformed capsule storage is blocked without overwriting source bytes", () => {
  const storage = { getItem: jest.fn(() => "{broken"), setItem: jest.fn() };
  expect(readTimeCapsules(storage)).toMatchObject({ status: "blocked", raw: "{broken" });
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(normalizeTimeCapsule({})).toBeNull();
});
