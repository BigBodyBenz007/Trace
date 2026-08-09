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
    saveUserFood: jest.fn(() => true),
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
    screen
      .getByRole("heading", { name: /(?:Add|Edit) Nutrition Entry/ })
      .closest("form")
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
  expect(form.getByLabelText("Number of servings")).toHaveValue(1);
  expect(form.getByText("One serving: 1 medium banana")).toBeInTheDocument();
});

test("fractional servings recalculate all nutrients live", () => {
  renderNutritionPage();
  selectBanana();
  const form = entryForm();

  fireEvent.change(form.getByLabelText("Number of servings"), {
    target: { value: "0.5" },
  });

  expect(form.getByLabelText("Calories")).toHaveValue(52.5);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(0.65);
  expect(form.getByLabelText("Carbohydrates (g)")).toHaveValue(13.5);
  expect(form.getByLabelText("Fat (g)")).toHaveValue(0.2);
});

test("multiple servings recalculate all nutrients live", () => {
  renderNutritionPage();
  selectBanana();
  const form = entryForm();

  fireEvent.change(form.getByLabelText("Number of servings"), {
    target: { value: "2" },
  });

  expect(form.getByLabelText("Calories")).toHaveValue(210);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(2.6);
  expect(form.getByLabelText("Carbohydrates (g)")).toHaveValue(54);
  expect(form.getByLabelText("Fat (g)")).toHaveValue(0.8);
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
  expect(props.saveNutritionEntry.mock.calls[0][0]).not.toHaveProperty(
    "portion"
  );
  expect(props.saveNutritionEntry.mock.calls[0][0]).not.toHaveProperty(
    "nutritionBasis"
  );
  expect(form.queryByLabelText("Number of servings")).not.toBeInTheDocument();
});

test("successfully saving a catalog food clears search and results", () => {
  renderNutritionPage();
  selectBanana();

  expect(screen.getByLabelText("Food search")).toHaveValue("  BANANA  ");
  fireEvent.click(entryForm().getByRole("button", { name: "Save Entry" }));

  expect(screen.getByLabelText("Food search")).toHaveValue("");
  expect(
    screen.queryByRole("button", { name: /Banana/i })
  ).not.toBeInTheDocument();
});

test("successfully saving a manual food clears search and requests persistence", () => {
  const props = renderNutritionPage();
  const form = entryForm();

  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "meatloaf" },
  });
  fireEvent.change(form.getByLabelText("Food / meal name"), {
    target: { value: "Meatloaf" },
  });
  fireEvent.change(form.getByLabelText("Calories"), {
    target: { value: "350" },
  });
  fireEvent.change(form.getByLabelText("Protein (g)"), {
    target: { value: "22" },
  });
  fireEvent.change(form.getByLabelText("Carbohydrates (g)"), {
    target: { value: "18" },
  });
  fireEvent.change(form.getByLabelText("Fat (g)"), {
    target: { value: "20" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveUserFood).toHaveBeenCalledWith({
    name: "Meatloaf",
    nutrients: {
      calories: 350,
      protein: 22,
      carbohydrates: 18,
      fat: 20,
    },
  });
  expect(screen.getByLabelText("Food search")).toHaveValue("");
  expect(form.getByLabelText("Food / meal name")).toHaveValue("");
});

test("a saved user food appears in search and scales like a catalog food", () => {
  const userFood = {
    id: "user-added:meatloaf",
    name: "Meatloaf",
    serving: {
      amount: 1,
      unit: "serving",
      description: "1 serving",
    },
    nutrients: {
      calories: 350,
      protein: 22,
      carbohydrates: 18,
      fat: 20,
    },
    provenance: {
      source: "user-added",
      sourceId: "meatloaf",
      confidence: "user-added",
    },
  };
  const props = renderNutritionPage({ userFoods: [userFood] });

  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "MEATLOAF" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Meatloaf/i }));
  const form = entryForm();

  expect(screen.getByText("User Added")).toBeInTheDocument();
  expect(form.getByLabelText("Food / meal name")).toHaveValue("Meatloaf");
  fireEvent.change(form.getByLabelText("Number of servings"), {
    target: { value: "1.5" },
  });
  expect(form.getByLabelText("Calories")).toHaveValue(525);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(33);

  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));
  expect(props.saveNutritionEntry.mock.calls[0][0]).toMatchObject({
    calories: 525,
    protein: 33,
    foodReference: {
      source: "user-added",
      sourceId: "meatloaf",
      confidence: "user-added",
      modified: false,
    },
    portion: {
      amount: 1.5,
      unit: "serving",
      basis: {
        amount: 1,
        unit: "serving",
        description: "1 serving",
      },
    },
  });
  expect(props.saveUserFood).not.toHaveBeenCalled();
});

test("saves calculated totals with portion and immutable nutrition snapshots", () => {
  const props = renderNutritionPage();
  selectBanana();
  const form = entryForm();

  fireEvent.change(form.getByLabelText("Number of servings"), {
    target: { value: "1.5" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry.mock.calls[0][0]).toMatchObject({
    calories: 157.5,
    protein: 1.9500000000000002,
    carbohydrates: 40.5,
    fat: 0.6000000000000001,
    portion: {
      amount: 1.5,
      unit: "serving",
      basis: {
        amount: 1,
        unit: "item",
        description: "1 medium banana",
        grams: 118,
      },
    },
    nutritionBasis: {
      calories: 105,
      protein: 1.3,
      carbohydrates: 27,
      fat: 0.4,
    },
  });
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

test("changing serving quantity does not mark catalog provenance modified", () => {
  const props = renderNutritionPage();
  selectBanana();
  const form = entryForm();

  fireEvent.change(form.getByLabelText("Number of servings"), {
    target: { value: "1.5" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

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

test("editing a catalog entry restores quantity, basis, nutrition, and provenance", () => {
  const savedEntry = {
    id: "saved-banana",
    name: "Banana",
    calories: 157.5,
    protein: 1.95,
    carbohydrates: 40.5,
    fat: 0.6,
    loggedAt: localTimestamp(2026, 7, 8),
    notes: "Pre-run",
    foodReference: {
      source: "trace-starter",
      sourceId: "banana-medium",
      confidence: "verified",
      modified: false,
    },
    portion: {
      amount: 1.5,
      unit: "serving",
      basis: {
        amount: 1,
        unit: "item",
        description: "1 medium banana",
        grams: 118,
      },
    },
    nutritionBasis: {
      calories: 105,
      protein: 1.3,
      carbohydrates: 27,
      fat: 0.4,
    },
  };
  const props = renderNutritionPage({ nutritionEntries: [savedEntry] });

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const form = entryForm();

  expect(form.getByLabelText("Number of servings")).toHaveValue(1.5);
  expect(form.getByText("One serving: 1 medium banana")).toBeInTheDocument();
  expect(form.getByLabelText("Calories")).toHaveValue(157.5);

  fireEvent.change(form.getByLabelText("Number of servings"), {
    target: { value: "2" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Changes" }));

  expect(props.updateNutritionEntry).toHaveBeenCalledWith(
    "saved-banana",
    expect.objectContaining({
      calories: 210,
      portion: expect.objectContaining({
        amount: 2,
        basis: savedEntry.portion.basis,
      }),
      nutritionBasis: savedEntry.nutritionBasis,
      foodReference: savedEntry.foodReference,
    })
  );
});

test("legacy entries remain editable without portion metadata", () => {
  const legacyEntry = {
    id: "legacy-entry",
    name: "Legacy meal",
    calories: 300,
    protein: 20,
    carbohydrates: 30,
    fat: 10,
    loggedAt: localTimestamp(2026, 7, 8),
    notes: "",
    foodReference: {
      source: "trace-starter",
      sourceId: "legacy-food",
      confidence: "verified",
      modified: false,
    },
  };
  const props = renderNutritionPage({ nutritionEntries: [legacyEntry] });

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const form = entryForm();

  expect(form.queryByLabelText("Number of servings")).not.toBeInTheDocument();
  expect(form.getByLabelText("Calories")).toHaveValue(300);
  fireEvent.click(form.getByRole("button", { name: "Save Changes" }));

  expect(props.updateNutritionEntry).toHaveBeenCalledWith(
    "legacy-entry",
    expect.not.objectContaining({
      portion: expect.anything(),
      nutritionBasis: expect.anything(),
    })
  );
});
