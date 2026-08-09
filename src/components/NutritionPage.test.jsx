import { fireEvent, render, screen, within } from "@testing-library/react";
import NutritionPage, { calculateNutritionAverages } from "./NutritionPage";

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

function renderNutritionPage(overrides = {}) {
  const props = {
    onBack: jest.fn(),
    nutritionEntries: [],
    nutritionGoals: {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
    },
    saveNutritionEntry: jest.fn(() => true),
    updateNutritionEntry: jest.fn(() => true),
    deleteNutritionEntry: jest.fn(() => true),
    saveNutritionGoals: jest.fn(() => true),
    buttonStyle: {},
    inputStyle: {},
    containerStyle: {},
    ...overrides,
  };

  render(<NutritionPage {...props} />);
  return props;
}

function selectBanana() {
  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "  BANANA  " },
  });
  fireEvent.click(screen.getByRole("button", { name: /Banana/i }));
}

function entryForm() {
  return within(
    screen.getByRole("heading", { name: "Add Nutrition Entry" }).closest("form")
  );
}

test("selecting a search result populates the existing form", () => {
  renderNutritionPage();
  selectBanana();
  const form = entryForm();

  expect(form.getByLabelText("Food / meal name")).toHaveValue("Banana");
  expect(form.getByLabelText("Calories")).toHaveValue(105);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(1.3);
  expect(form.getByLabelText("Carbohydrates (g)")).toHaveValue(27);
  expect(form.getByLabelText("Fat (g)")).toHaveValue(0.4);
});

test("catalog-populated values remain editable", () => {
  renderNutritionPage();
  selectBanana();
  const form = entryForm();

  fireEvent.change(form.getByLabelText("Calories"), {
    target: { value: "120" },
  });
  fireEvent.change(form.getByLabelText("Food / meal name"), {
    target: { value: "Banana with topping" },
  });

  expect(form.getByLabelText("Calories")).toHaveValue(120);
  expect(form.getByLabelText("Food / meal name")).toHaveValue(
    "Banana with topping"
  );
});

test("manual nutrition entry still saves without provenance", () => {
  const props = renderNutritionPage();
  const form = entryForm();
  fireEvent.change(form.getByLabelText("Food / meal name"), {
    target: { value: "Homemade meal" },
  });
  fireEvent.change(form.getByLabelText("Calories"), {
    target: { value: "450" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry).toHaveBeenCalledTimes(1);
  expect(props.saveNutritionEntry.mock.calls[0][0]).toMatchObject({
    name: "Homemade meal",
    calories: 450,
  });
  expect(props.saveNutritionEntry.mock.calls[0][0]).not.toHaveProperty(
    "foodReference"
  );
});

test("selected catalog provenance is saved when values are unchanged", () => {
  const props = renderNutritionPage();
  selectBanana();
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry.mock.calls[0][0].foodReference).toEqual({
    source: "trace-starter",
    sourceId: "banana-medium",
    confidence: "verified",
    modified: false,
  });
});

test("catalog provenance is marked modified after a populated value changes", () => {
  const props = renderNutritionPage();
  selectBanana();
  fireEvent.change(entryForm().getByLabelText("Protein (g)"), {
    target: { value: "2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry.mock.calls[0][0].foodReference).toEqual({
    source: "trace-starter",
    sourceId: "banana-medium",
    confidence: "verified",
    modified: true,
  });
});
