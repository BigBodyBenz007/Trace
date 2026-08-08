import { calculateNutritionAverages } from "./NutritionPage";

function localTimestamp(year, month, day, hour = 12) {
  return new Date(year, month, day, hour).toISOString();
}

function entry(loggedAt, calories, protein, carbohydrates, fat) {
  return { loggedAt, calories, protein, carbohydrates, fat };
}

test("averages daily totals over only logged local days", () => {
  const now = new Date(2026, 7, 8, 9);
  const entries = [
    entry(localTimestamp(2026, 7, 8), 400, 20, 50, 10),
    entry(localTimestamp(2026, 7, 8, 18), 600, 30, 70, 20),
    entry(localTimestamp(2026, 7, 3), 800, 40, 80, 30),
    entry(localTimestamp(2026, 7, 1), 3000, 100, 200, 90),
    entry(localTimestamp(2026, 6, 31), 5000, 200, 300, 100),
  ];

  const averages = calculateNutritionAverages(entries, now);

  expect(averages.lastSevenDays).toEqual({
    loggedDays: 2,
    calories: 900,
    protein: 45,
    carbohydrates: 100,
    fat: 30,
  });
  expect(averages.thisMonth).toEqual({
    loggedDays: 3,
    calories: 1600,
    protein: 190 / 3,
    carbohydrates: 400 / 3,
    fat: 50,
  });
});

test("returns zero averages when a period has no logged days", () => {
  const averages = calculateNutritionAverages([], new Date(2026, 7, 8, 9));
  const emptyPeriod = {
    loggedDays: 0,
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
  };

  expect(averages.lastSevenDays).toEqual(emptyPeriod);
  expect(averages.thisMonth).toEqual(emptyPeriod);
});

test("uses local calendar boundaries across months", () => {
  const now = new Date(2026, 2, 2, 8);
  const entries = [
    entry(localTimestamp(2026, 2, 2, 0), 200, 10, 20, 5),
    entry(localTimestamp(2026, 1, 28, 23), 400, 20, 40, 10),
  ];

  const averages = calculateNutritionAverages(entries, now);

  expect(averages.lastSevenDays.loggedDays).toBe(2);
  expect(averages.lastSevenDays.calories).toBe(300);
  expect(averages.thisMonth.loggedDays).toBe(1);
  expect(averages.thisMonth.calories).toBe(200);
});
