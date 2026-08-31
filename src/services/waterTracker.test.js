import {
  ML_PER_FLUID_OUNCE,
  WATER_STORAGE_KEY,
  calculateWaterSummary,
  emptyWaterCollection,
  formatWaterAmount,
  readWaterEntries,
  waterAmountToMilliliters,
  writeWaterEntries,
} from "./waterTracker";

function storage(initialValue = null) {
  let raw = initialValue;
  return {
    getItem: jest.fn(() => raw),
    setItem: jest.fn((key, value) => { raw = value; }),
    value: () => raw,
  };
}

function entry(id, amountMl, year, month, day, hour = 12) {
  return { id, amountMl, loggedAt: new Date(year, month, day, hour).toISOString() };
}

test("converts oz and mL inputs to stable canonical milliliters", () => {
  const stored = waterAmountToMilliliters(16, "oz");
  expect(stored).toBe(Number((16 * ML_PER_FLUID_OUNCE).toFixed(6)));
  expect(waterAmountToMilliliters(500, "mL")).toBe(500);
  expect(formatWaterAmount(stored, "oz")).toBe("16 oz");
  expect(formatWaterAmount(stored, "mL")).toBe("473 mL");
  expect(waterAmountToMilliliters(0, "oz")).toBeNull();
});

test("calculates today and 7/30 calendar-day averages using local dates", () => {
  const now = new Date(2026, 7, 31, 9);
  const summary = calculateWaterSummary([
    entry("today-morning", 700, 2026, 7, 31, 0),
    entry("today-evening", 300, 2026, 7, 31, 23),
    entry("six-days-ago", 400, 2026, 7, 25),
    entry("twenty-nine-days-ago", 600, 2026, 7, 2),
    entry("outside", 9000, 2026, 7, 1),
    entry("future", 9000, 2026, 8, 1),
  ], now);

  expect(summary.todayMl).toBe(1000);
  expect(summary.sevenDayAverageMl).toBe(1400 / 7);
  expect(summary.thirtyDayAverageMl).toBe(2000 / 30);
});

test("returns zero totals and averages without entries", () => {
  expect(calculateWaterSummary([], new Date(2026, 7, 31, 9))).toEqual({
    todayMl: 0,
    sevenDayAverageMl: 0,
    thirtyDayAverageMl: 0,
  });
});

test("filters malformed stored entries without crashing and persists valid entries across reload", () => {
  const valid = entry("valid", 250, 2026, 7, 31);
  const store = storage(JSON.stringify({
    schemaVersion: 1,
    entries: [valid, null, { id: "bad-amount", amountMl: -2, loggedAt: valid.loggedAt }, { ...valid }],
  }));
  expect(readWaterEntries(store)).toEqual({ schemaVersion: 1, entries: [valid] });

  writeWaterEntries(store, { entries: [valid] });
  expect(JSON.parse(store.value())).toEqual({ schemaVersion: 1, entries: [valid] });
  expect(readWaterEntries(store).entries).toEqual([valid]);
  expect(readWaterEntries(storage("not-json"))).toEqual(emptyWaterCollection());
  expect(readWaterEntries(storage(JSON.stringify({ entries: "broken" })))).toEqual(emptyWaterCollection());
});
