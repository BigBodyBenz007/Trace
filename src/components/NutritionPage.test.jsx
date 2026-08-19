import { fireEvent, render, screen, within } from "@testing-library/react";
import NutritionPage, { calculateNutritionAverages } from "./NutritionPage";
import { createUserFood } from "../services/userFoodCatalog";

function localTimestamp(year, month, day, hour = 12) {
  return new Date(year, month, day, hour).toISOString();
}

function entry(loggedAt, calories, protein, carbohydrates, fat, sodium) {
  return {
    loggedAt,
    calories,
    protein,
    carbohydrates,
    fat,
    ...(sodium === undefined ? {} : { sodium }),
  };
}

test("aggregates known sodium and marks averages incomplete when sodium is unknown", () => {
  const now = new Date(2026, 7, 8, 9);
  const averages = calculateNutritionAverages([
    entry(localTimestamp(2026, 7, 8), 500, 20, 40, 15, 700),
    entry(localTimestamp(2026, 7, 3), 600, 25, 50, 20, null),
  ], now);

  expect(averages.lastSevenDays).toMatchObject({
    loggedDays: 2,
    sodium: 350,
    incompleteNutrients: ["sodium"],
  });
});

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
    sodium: 0,
    incompleteNutrients: ["sodium"],
  });
  expect(averages.thisMonth).toEqual({
    loggedDays: 3,
    calories: 1600,
    protein: 190 / 3,
    carbohydrates: 400 / 3,
    fat: 50,
    sodium: 0,
    incompleteNutrients: ["sodium"],
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
    sodium: 0,
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
  const saveUserFood = jest.fn(({ name, nutrients, serving }) => ({
    status: "added",
    food: createUserFood(name, nutrients, serving),
    matchesDefinition: true,
  }));
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
    saveUserFood,
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

test("uses the scoped Nutrition ledger presentation without changing semantic controls", () => {
  renderNutritionPage();
  expect(screen.getByTestId("nutrition-page")).toHaveClass("trace-feature-page", "trace-feature-page--nutrition");
  expect(screen.getByRole("heading", { name: "Today" }).closest("section")).toHaveClass("trace-nutrition-today");
  expect(screen.getByRole("button", { name: "Save Goals" })).toHaveClass("trace-action--primary");
});

test("confirms successful daily goal saves", () => {
  const props = renderNutritionPage();
  fireEvent.click(screen.getByRole("button", { name: "Save Goals" }));
  expect(props.saveNutritionGoals).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("save-confirmation")).toHaveTextContent("Goals traced");
});

test("saves an optional sodium goal", () => {
  const props = renderNutritionPage();
  const goalsForm = screen.getByRole("heading", { name: "Daily Goals" }).closest("form");
  fireEvent.change(within(goalsForm).getByLabelText("Sodium (mg)"), { target: { value: "2300" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Goals" }));
  expect(props.saveNutritionGoals).toHaveBeenCalledWith(expect.objectContaining({ sodium: 2300 }));
});

test("shows today's sodium total and an incomplete warning", () => {
  renderNutritionPage({
    nutritionEntries: [
      { id: "known", loggedAt: new Date().toISOString(), calories: 100, protein: 5, carbohydrates: 10, fat: 2, sodium: 400 },
      { id: "unknown", loggedAt: new Date().toISOString(), calories: 100, protein: 5, carbohydrates: 10, fat: 2, sodium: null },
    ],
  });

  expect(screen.getByText("400mg · Incomplete: one or more logged foods had unknown sodium.")).toBeInTheDocument();
});

test("shows sodium goal progress in a standard nutrient-sized grid item", () => {
  renderNutritionPage({
    nutritionGoals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, sodium: 2300 },
    nutritionEntries: [entry(new Date().toISOString(), 0, 0, 0, 0, 2045)],
  });

  expect(screen.getByText("2045 / 2300 mg")).toBeInTheDocument();
  expect(screen.getByLabelText("Sodium progress")).toBeInTheDocument();
  expect(screen.getByText("89%")).toBeInTheDocument();
  expect(screen.getByLabelText("Sodium progress").parentElement.parentElement.style.gridTemplateColumns)
    .toBe(screen.getByLabelText("Calories progress").parentElement.parentElement.style.gridTemplateColumns);
});

test("shows sodium total without progress when no sodium goal is set", () => {
  renderNutritionPage({
    nutritionEntries: [entry(new Date().toISOString(), 0, 0, 0, 0, 2045)],
  });

  expect(screen.getAllByText("2045mg").length).toBeGreaterThan(0);
  expect(screen.queryByLabelText("Sodium progress")).not.toBeInTheDocument();
  expect(screen.queryByText("89%")).not.toBeInTheDocument();
});

test("caps sodium bar width when the goal is exceeded", () => {
  renderNutritionPage({
    nutritionGoals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, sodium: 2000 },
    nutritionEntries: [entry(new Date().toISOString(), 0, 0, 0, 0, 2500)],
  });

  expect(screen.getByText("2500 / 2000 mg")).toBeInTheDocument();
  expect(screen.getByText("125%")).toBeInTheDocument();
  expect(screen.getByLabelText("Sodium progress").firstElementChild).toHaveStyle({ width: "100%" });
});

test("warns that sodium goal progress may be incomplete", () => {
  renderNutritionPage({
    nutritionGoals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, sodium: 2300 },
    nutritionEntries: [
      entry(new Date().toISOString(), 0, 0, 0, 0, 400),
      entry(new Date().toISOString(), 0, 0, 0, 0, null),
    ],
  });

  expect(screen.getByText(/400 \/ 2300 mg/)).toBeInTheDocument();
  expect(screen.getByText(/Progress may be incomplete because one or more logged foods had unknown sodium/)).toBeInTheDocument();
  expect(screen.getByText("17%")).toBeInTheDocument();
});

function entryForm() {
  return within(
    screen
      .getByRole("heading", { name: /(?:Add|Edit) Nutrition Entry/ })
      .closest("form")
  );
}

test("provides matching timeline navigation controls at the top and bottom", () => {
  const props = renderNutritionPage();
  const navigationButtons = screen.getAllByRole("button", {
    name: "Back to Timeline",
  });

  expect(navigationButtons).toHaveLength(2);
  fireEvent.click(navigationButtons[0]);
  fireEvent.click(navigationButtons[1]);

  expect(props.onBack).toHaveBeenCalledTimes(2);
});

test("selecting a search result populates the existing form", () => {
  renderNutritionPage();
  selectBanana();
  const form = entryForm();

  expect(form.getByLabelText("Food / meal name")).toHaveValue("Banana");
  expect(form.getByLabelText("Calories")).toHaveValue(105);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(1.3);
  expect(form.getByLabelText("Carbohydrates (g)")).toHaveValue(27);
  expect(form.getByLabelText("Fat (g)")).toHaveValue(0.4);
  expect(form.getByText("Unknown")).toBeInTheDocument();
  expect(form.getByLabelText("Number of servings")).toHaveValue(1);
  expect(form.getByText("One serving: 1 medium banana")).toBeInTheDocument();
});

test("restaurant food uses the existing serving flow and logs scaled macros", () => {
  const props = renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "McNuggets" },
  });
  const result = screen.getByRole("button", { name: /McDonald's.*Chicken McNuggets/i });
  expect(result).toHaveTextContent("McDonald's · Chicken McNuggets");
  expect(result).toHaveTextContent("Official restaurant source");
  expect(result).toHaveTextContent("Protein 9 g");
  expect(result).toHaveTextContent("Sodium 340 mg");
  expect(result).not.toHaveTextContent("Unknown g");
  fireEvent.click(result);
  const form = entryForm();

  expect(form.getByLabelText("Food / meal name")).toHaveValue("Chicken McNuggets");
  fireEvent.change(form.getByLabelText("Number of servings"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry.mock.calls[0][0]).toMatchObject({
    name: "Chicken McNuggets",
    calories: 340,
    protein: 18,
    carbohydrates: 20,
    fat: 20,
    sodium: 680,
    foodReference: {
      sourceType: "restaurant",
      restaurantId: "mcdonalds",
      restaurantName: "McDonald's",
    },
    portion: { amount: 2 },
  });
});

test("food search continues to show Unknown sodium explicitly when a catalog value is unavailable", () => {
  renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), { target: { value: "Sausage, Egg & Cheese McGriddles" } });
  expect(screen.getByRole("button", { name: /McDonald's.*Sausage, Egg & Cheese McGriddles/i })).toHaveTextContent("Sodium Unknown");
});

test("creates a scaled Taco Bell entry from its exact official serving", () => {
  const props = renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), { target: { value: "tacobell crunchy taco" } });
  fireEvent.click(screen.getByRole("button", { name: /Taco Bell.*Crunchy Taco/i }));

  const form = entryForm();
  expect(form.getByText("One serving: 1 taco")).toBeInTheDocument();
  expect(form.getByLabelText("Sodium (mg)")).toHaveValue(310);
  fireEvent.change(form.getByLabelText("Number of servings"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry.mock.calls[0][0]).toMatchObject({
    name: "Crunchy Taco",
    calories: 340,
    protein: 14,
    carbohydrates: 26,
    fat: 18,
    sodium: 620,
    portion: { amount: 2 },
    foodReference: { sourceType: "restaurant", restaurantId: "taco-bell", restaurantName: "Taco Bell" },
  });
});

test("uses exact Chick-fil-A nugget counts before serving scaling", () => {
  const props = renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), { target: { value: "chick fil a nuggets" } });
  fireEvent.click(screen.getByRole("button", { name: /Chick-fil-A · Chick-fil-A® Nuggets/i }));

  const form = entryForm();
  const sizeSelect = screen.getByLabelText("Menu serving size");
  expect(sizeSelect).toHaveDisplayValue("8 count (113 g)");
  fireEvent.change(sizeSelect, { target: { value: "restaurant:chick-fil-a:nuggets:12-count" } });
  expect(form.getByLabelText("Calories")).toHaveValue(380);
  expect(form.getByLabelText("Sodium (mg)")).toHaveValue(1820);
  fireEvent.change(form.getByLabelText("Number of servings"), { target: { value: "0.5" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry.mock.calls[0][0]).toMatchObject({
    calories: 190,
    protein: 20,
    carbohydrates: 8,
    fat: 8.5,
    sodium: 910,
    foodReference: { restaurantId: "chick-fil-a", sourceId: "chick-fil-a:nuggets:12-count" },
  });
});

test("uses exact Whataburger fry sizes before serving scaling", () => {
  const props = renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), { target: { value: "whataburger fries" } });
  fireEvent.click(screen.getByRole("button", { name: /Whataburger.*French Fries/i }));

  const form = entryForm();
  const sizeSelect = screen.getByLabelText("Menu serving size");
  expect(sizeSelect).toHaveDisplayValue("Small French Fries");
  fireEvent.change(sizeSelect, { target: { value: "restaurant:whataburger:french-fries:medium" } });
  expect(form.getByLabelText("Calories")).toHaveValue(420);
  expect(form.getByLabelText("Sodium (mg)")).toHaveValue(260);
  fireEvent.change(form.getByLabelText("Number of servings"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry.mock.calls[0][0]).toMatchObject({
    calories: 840,
    protein: 10,
    carbohydrates: 104,
    fat: 42,
    sodium: 520,
    foodReference: { restaurantId: "whataburger", sourceId: "whataburger:french-fries:medium" },
  });
});

test("McNuggets exposes verified official menu sizes without deriving nutrition", () => {
  renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), { target: { value: "McNuggets" } });
  fireEvent.click(screen.getByRole("button", { name: /McDonald's.*Chicken McNuggets/i }));

  const sizeSelect = screen.getByLabelText("Menu serving size");
  const form = entryForm();
  expect(sizeSelect).toHaveDisplayValue("4 piece serving");
  expect(screen.getAllByRole("option")).toHaveLength(5);
  fireEvent.change(sizeSelect, { target: { value: "restaurant:mcdonalds:chicken-mcnuggets:20-piece" } });
  expect(form.getByLabelText("Calories")).toHaveValue(830);
  expect(form.getAllByRole("spinbutton")[2]).toHaveValue(44);
  expect(form.getAllByRole("spinbutton")[3]).toHaveValue(54);
  expect(form.getAllByRole("spinbutton")[4]).toHaveValue(50);
  expect(form.getByLabelText("Sodium (mg)")).toHaveValue(1560);
});

test("number of servings scales the selected official McNuggets menu size", () => {
  const props = renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), { target: { value: "McNuggets" } });
  fireEvent.click(screen.getByRole("button", { name: /McDonald's.*Chicken McNuggets/i }));
  fireEvent.change(screen.getByLabelText("Menu serving size"), { target: { value: "restaurant:mcdonalds:chicken-mcnuggets:10-piece" } });
  fireEvent.change(entryForm().getByLabelText("Number of servings"), { target: { value: "2" } });
  expect(entryForm().getByLabelText("Calories")).toHaveValue(820);
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));
  expect(props.saveNutritionEntry.mock.calls[0][0]).toMatchObject({ calories: 820, foodReference: { sourceId: "mcdonalds:chicken-mcnuggets:10-piece" } });
  expect(props.saveNutritionEntry.mock.calls[0][0].sodium).toBe(1500);
});

test("normal Sonic and Braum's items log with chain identity and known sodium", () => {
  const props = renderNutritionPage();

  fireEvent.change(screen.getByLabelText("Food search"), { target: { value: "Footlong Quarter Pound Coney" } });
  fireEvent.click(screen.getByRole("button", { name: /Sonic Drive-In.*Footlong Quarter Pound Coney/i }));
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry.mock.calls[0][0]).toMatchObject({
    name: "Footlong Quarter Pound Coney",
    calories: 770,
    protein: 31,
    carbohydrates: 54,
    fat: 48,
    sodium: 2160,
    foodReference: { sourceType: "restaurant", restaurantId: "sonic", restaurantName: "Sonic Drive-In" },
  });

  fireEvent.change(screen.getByLabelText("Food search"), { target: { value: "Breakfast Burrito" } });
  fireEvent.click(screen.getByRole("button", { name: /Braum's.*Breakfast Burrito/i }));
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry.mock.calls[1][0]).toMatchObject({
    name: "Breakfast Burrito",
    calories: 450,
    protein: 20,
    carbohydrates: 39,
    fat: 23,
    sodium: 840,
    foodReference: { sourceType: "restaurant", restaurantId: "braums", restaurantName: "Braum's" },
  });
});

test("Sonic menu size selection uses exact nutrition before Number of servings scaling", () => {
  const props = renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), { target: { value: "Mozzarella Sticks" } });
  fireEvent.click(screen.getByRole("button", { name: /Sonic Drive-In.*Mozzarella Sticks/i }));

  const form = entryForm();
  const sizeSelect = screen.getByLabelText("Menu serving size");
  expect(sizeSelect).toHaveDisplayValue("4 piece (Small)");
  fireEvent.change(sizeSelect, { target: { value: "restaurant:sonic:mozzarella-sticks:8-piece" } });
  expect(form.getByLabelText("Calories")).toHaveValue(750);
  expect(form.getByLabelText("Sodium (mg)")).toHaveValue(1590);

  fireEvent.change(form.getByLabelText("Number of servings"), { target: { value: "2" } });
  expect(sizeSelect).toHaveDisplayValue("8 piece (Large)");
  expect(form.getByLabelText("Calories")).toHaveValue(1500);
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));
  expect(props.saveNutritionEntry.mock.calls[0][0]).toMatchObject({
    calories: 1500,
    sodium: 3180,
    portion: { amount: 2 },
    foodReference: { sourceId: "sonic:mozzarella-sticks:8-piece" },
  });
});

test("Braum's menu size selection keeps the published size separate from serving count", () => {
  const props = renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), { target: { value: "Hash Browns" } });
  fireEvent.click(screen.getByRole("button", { name: /Braum's.*Hash Browns/i }));

  const form = entryForm();
  const sizeSelect = screen.getByLabelText("Menu serving size");
  fireEvent.change(sizeSelect, { target: { value: "restaurant:braums:hash-browns:large-5oz" } });
  expect(sizeSelect).toHaveDisplayValue("Large (5 oz)");
  expect(form.getByLabelText("Calories")).toHaveValue(550);
  expect(form.getByLabelText("Sodium (mg)")).toHaveValue(790);

  fireEvent.change(form.getByLabelText("Number of servings"), { target: { value: "0.5" } });
  expect(sizeSelect).toHaveDisplayValue("Large (5 oz)");
  expect(form.getByLabelText("Calories")).toHaveValue(275);
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));
  expect(props.saveNutritionEntry.mock.calls[0][0]).toMatchObject({
    calories: 275,
    sodium: 395,
    portion: { amount: 0.5 },
    foodReference: { sourceId: "braums:hash-browns:large-5oz" },
  });
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

test("manual-only nutrition entry still saves without reusable metadata", () => {
  const props = renderNutritionPage();
  const form = entryForm();
  fireEvent.click(form.getByLabelText("Save as reusable food"));
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
  expect(screen.getByTestId("save-confirmation")).toHaveTextContent("Meal traced");
  expect(props.saveNutritionEntry.mock.calls[0][0]).not.toHaveProperty(
    "portion"
  );
  expect(props.saveNutritionEntry.mock.calls[0][0]).not.toHaveProperty(
    "nutritionBasis"
  );
  expect(form.queryByLabelText("Number of servings")).not.toBeInTheDocument();
  expect(props.saveUserFood).not.toHaveBeenCalled();
});

test("new manual foods default to a reusable one-serving definition", () => {
  renderNutritionPage();
  const form = entryForm();

  expect(form.getByLabelText("Save as reusable food")).toBeChecked();
  expect(form.getByLabelText("Serving amount")).toHaveValue(1);
  expect(form.getByLabelText("Serving unit")).toHaveValue("serving");
  expect(
    form.getByText("Nutrition entered for: 1 serving")
  ).toBeInTheDocument();
});

test("invalid reusable serving amounts block saving with an explanation", () => {
  const props = renderNutritionPage();
  const form = entryForm();
  fireEvent.change(form.getByLabelText("Food / meal name"), {
    target: { value: "Meatloaf" },
  });
  fireEvent.change(form.getByLabelText("Serving amount"), {
    target: { value: "0" },
  });

  fireEvent.submit(
    screen
      .getByRole("heading", { name: "Add Nutrition Entry" })
      .closest("form")
  );

  expect(props.saveNutritionEntry).not.toHaveBeenCalled();
  expect(form.getByRole("alert")).toHaveTextContent(
    "Serving amount must be greater than zero."
  );
});

test("custom reusable servings require and snapshot a meaningful description", () => {
  const props = renderNutritionPage();
  const form = entryForm();
  fireEvent.change(form.getByLabelText("Food / meal name"), {
    target: { value: "Homemade patty" },
  });
  fireEvent.change(form.getByLabelText("Calories"), {
    target: { value: "240" },
  });
  fireEvent.change(form.getByLabelText("Serving unit"), {
    target: { value: "custom" },
  });
  fireEvent.change(form.getByLabelText("Custom serving description"), {
    target: { value: "1 small homemade patty" },
  });

  expect(
    form.getByText("Nutrition entered for: 1 small homemade patty")
  ).toBeInTheDocument();
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry.mock.calls[0][0]).toMatchObject({
    portion: {
      amount: 1,
      unit: "serving",
      basis: {
        amount: 1,
        unit: "custom",
        description: "1 small homemade patty",
      },
    },
    nutritionBasis: expect.objectContaining({ calories: 240 }),
  });
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
      sodium: null,
    },
    serving: {
      amount: 1,
      unit: "serving",
      description: "1 serving",
    },
  });
  expect(props.saveNutritionEntry.mock.calls[0][0]).toMatchObject({
    foodReference: {
      source: "user-added",
      sourceId: "meatloaf",
      confidence: "user-added",
      modified: false,
    },
    portion: {
      amount: 1,
      unit: "serving",
      basis: {
        amount: 1,
        unit: "serving",
        description: "1 serving",
      },
    },
    nutritionBasis: {
      calories: 350,
      protein: 22,
      carbohydrates: 18,
      fat: 20,
      sodium: null,
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

test("a richer saved user food can be searched, selected, and scaled", () => {
  const userFood = createUserFood(
    "Meatloaf",
    { calories: 350, protein: 22, carbohydrates: 18, fat: 20 },
    { amount: 4, unit: "oz", description: "4 oz" }
  );
  const props = renderNutritionPage({ userFoods: [userFood] });

  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "meatloaf" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Meatloaf/i }));
  const form = entryForm();

  expect(form.queryByLabelText("Serving amount")).not.toBeInTheDocument();
  expect(form.getByText("One serving: 4 oz")).toBeInTheDocument();
  fireEvent.change(form.getByLabelText("Number of servings"), {
    target: { value: "0.5" },
  });
  expect(form.getByLabelText("Calories")).toHaveValue(175);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(11);

  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));
  expect(props.saveNutritionEntry.mock.calls[0][0].portion).toEqual({
    amount: 0.5,
    unit: "serving",
    basis: { amount: 4, unit: "oz", description: "4 oz" },
  });
});

test("a conflicting duplicate logs without provenance and keeps the saved food", () => {
  const existingFood = createUserFood(
    "Meatloaf",
    { calories: 350, protein: 22, carbohydrates: 18, fat: 20 },
    { amount: 1, unit: "slice", description: "1 slice" }
  );
  const saveUserFood = jest.fn(() => ({
    status: "duplicate",
    food: existingFood,
    matchesDefinition: false,
  }));
  const props = renderNutritionPage({ saveUserFood });
  const form = entryForm();
  fireEvent.change(form.getByLabelText("Food / meal name"), {
    target: { value: "  MEATLOAF " },
  });
  fireEvent.change(form.getByLabelText("Calories"), {
    target: { value: "500" },
  });
  fireEvent.change(form.getByLabelText("Serving amount"), {
    target: { value: "4" },
  });
  fireEvent.change(form.getByLabelText("Serving unit"), {
    target: { value: "oz" },
  });

  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  const loggedEntry = props.saveNutritionEntry.mock.calls[0][0];
  expect(loggedEntry).not.toHaveProperty("foodReference");
  expect(loggedEntry).toMatchObject({
    name: "MEATLOAF",
    calories: 500,
    portion: {
      amount: 1,
      unit: "serving",
      basis: { amount: 4, unit: "oz", description: "4 oz" },
    },
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "Entry logged. Your existing saved Meatloaf was kept."
  );
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

test("editing a richer user food restores its snapshot and scales fractionally", () => {
  const savedEntry = {
    id: "saved-meatloaf",
    name: "Meatloaf",
    calories: 350,
    protein: 22,
    carbohydrates: 18,
    fat: 20,
    loggedAt: localTimestamp(2026, 7, 8),
    notes: "",
    foodReference: {
      source: "user-added",
      sourceId: "meatloaf",
      confidence: "user-added",
      modified: false,
    },
    portion: {
      amount: 1,
      unit: "serving",
      basis: {
        amount: 4,
        unit: "oz",
        description: "4 oz",
      },
    },
    nutritionBasis: {
      calories: 350,
      protein: 22,
      carbohydrates: 18,
      fat: 20,
    },
  };
  const props = renderNutritionPage({ nutritionEntries: [savedEntry] });

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const form = entryForm();

  expect(form.getByLabelText("Number of servings")).toHaveValue(1);
  expect(form.getByText("One serving: 4 oz")).toBeInTheDocument();
  fireEvent.change(form.getByLabelText("Number of servings"), {
    target: { value: "1.5" },
  });

  expect(form.getByLabelText("Calories")).toHaveValue(525);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(33);
  expect(form.getByLabelText("Carbohydrates (g)")).toHaveValue(27);
  expect(form.getByLabelText("Fat (g)")).toHaveValue(30);

  fireEvent.click(form.getByRole("button", { name: "Save Changes" }));
  expect(props.updateNutritionEntry).toHaveBeenCalledWith(
    "saved-meatloaf",
    expect.objectContaining({
      calories: 525,
      protein: 33,
      carbohydrates: 27,
      fat: 30,
      portion: {
        amount: 1.5,
        unit: "serving",
        basis: savedEntry.portion.basis,
      },
      nutritionBasis: savedEntry.nutritionBasis,
      foodReference: savedEntry.foodReference,
    })
  );
});

test("editing an entry with an incomplete snapshot keeps manual edit behavior", () => {
  const incompleteEntry = {
    id: "incomplete-entry",
    name: "Older saved food",
    calories: 300,
    protein: 20,
    carbohydrates: 30,
    fat: 10,
    loggedAt: localTimestamp(2026, 7, 8),
    notes: "",
    portion: {
      amount: 1,
      unit: "serving",
      basis: { amount: 1, unit: "serving", description: "1 serving" },
    },
    nutritionBasis: {
      calories: 300,
      protein: 20,
      carbohydrates: 30,
    },
  };
  renderNutritionPage({ nutritionEntries: [incompleteEntry] });

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));

  expect(entryForm().queryByLabelText("Number of servings")).not.toBeInTheDocument();
  expect(entryForm().getByLabelText("Calories")).toHaveValue(300);
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

test("cancel resets the form and smoothly scrolls the nutrition view to the top", () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalConfirm = window.confirm;
  const scrollIntoView = jest.fn();
  window.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  window.confirm = jest.fn(() => true);

  renderNutritionPage();
  const form = entryForm();
  screen.getByTestId("nutrition-page").scrollIntoView = scrollIntoView;
  fireEvent.change(form.getByLabelText("Food / meal name"), {
    target: { value: "Draft meal" },
  });
  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "banana" },
  });

  fireEvent.click(form.getByRole("button", { name: "Cancel Entry" }));

  expect(form.getByLabelText("Food / meal name")).toHaveValue("");
  expect(screen.getByLabelText("Food search")).toHaveValue("");
  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });

  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.confirm = originalConfirm;
});
