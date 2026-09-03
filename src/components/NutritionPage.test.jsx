import { fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "fs";
import NutritionPage, {
  calculateDailySugarTotals,
  calculateNutritionAverages,
} from "./NutritionPage";
import { createUserFood } from "../services/userFoodCatalog";
import brandedPackagedFoods from "../services/brandedPackagedFoodCatalog";

function localTimestamp(year, month, day, hour = 12) {
  return new Date(year, month, day, hour).toISOString();
}

let entrySequence = 0;

function entry(loggedAt, calories, protein, carbohydrates, fat, sodium) {
  return {
    id: `nutrition-test-entry-${entrySequence += 1}`,
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

  const view = render(<NutritionPage {...props} />);
  return { ...props, ...view, props };
}

function historyEntry(index) {
  return {
    id: `food-history-${index}`,
    name: `Food ${index}`,
    loggedAt: new Date(2026, 7, index, 12).toISOString(),
    calories: index,
    protein: index,
    carbohydrates: index,
    fat: index,
    fiber: index,
    sodium: index,
    notes: "",
  };
}

function dailyTotalsSection() {
  return screen.getByRole("heading", { name: "Daily Totals" }).closest("section");
}

test("renders complete daily sugar totals including explicit zero", () => {
  renderNutritionPage({
    nutritionEntries: [
      { ...historyEntry(1), loggedAt: new Date().toISOString(), totalSugar: 10, addedSugar: 4 },
      { ...historyEntry(2), loggedAt: new Date().toISOString(), totalSugar: 0, addedSugar: 0 },
    ],
  });
  const totals = within(dailyTotalsSection());

  expect(totals.getByText("Total Sugar (g)")).toBeInTheDocument();
  expect(totals.getByText("Added Sugar (g)")).toBeInTheDocument();
  expect(totals.getByText("10g")).toBeInTheDocument();
  expect(totals.getByText("4g")).toBeInTheDocument();
});

test("labels partial sugar totals as known and all-unknown sugar as Unknown", () => {
  const view = renderNutritionPage({
    nutritionEntries: [
      { ...historyEntry(1), loggedAt: new Date().toISOString(), totalSugar: 10 },
      { ...historyEntry(2), loggedAt: new Date().toISOString() },
    ],
  });
  let totals = within(dailyTotalsSection());

  expect(totals.getByText("Known Total Sugar (g)")).toBeInTheDocument();
  expect(totals.getByText("10g")).toBeInTheDocument();
  expect(within(totals.getByText("Added Sugar (g)").closest(".trace-stat-card")).getByText("Unknown")).toBeInTheDocument();

  view.rerender(<NutritionPage {...view.props} nutritionEntries={[
    { ...historyEntry(3), loggedAt: new Date().toISOString() },
  ]} />);
  totals = within(dailyTotalsSection());
  expect(within(totals.getByText("Total Sugar (g)").closest(".trace-stat-card")).getByText("Unknown")).toBeInTheDocument();
  expect(within(totals.getByText("Added Sugar (g)").closest(".trace-stat-card")).getByText("Unknown")).toBeInTheDocument();
});

function savedEntriesSection() {
  return screen.getByRole("heading", { name: "Saved Entries" }).closest("section");
}

function selectBanana() {
  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "  BANANA  " },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Banana, raw\b/i }));
}

const USDA_BANANA_REFERENCE = {
  source: "usda-fooddata-central",
  sourceId: "173944",
  confidence: "official-source",
  label: "USDA",
  completeness: "complete",
  sourceType: "grocery",
  dataType: "generic",
  category: "fruit",
  categoryLabel: "Fruit",
  preparationState: "raw",
};

function expandNutritionGoals() {
  fireEvent.click(screen.getByRole("button", { name: "Nutrition Goals" }));
}

test("uses the scoped Nutrition ledger presentation without changing semantic controls", () => {
  renderNutritionPage();
  expect(screen.getByTestId("nutrition-page")).toHaveClass("trace-feature-page", "trace-feature-page--nutrition");
  expect(screen.getByRole("heading", { name: "Daily Totals" }).closest("section")).toHaveClass("trace-nutrition-today");
  expandNutritionGoals();
  expect(screen.getByRole("button", { name: "Save Goals" })).toHaveClass("trace-action--primary");
});

test("daily sugar totals distinguish complete, partial, all-unknown, and explicit zero", () => {
  const today = new Date(2026, 7, 8, 9);
  const timestamp = localTimestamp(2026, 7, 8);

  expect(calculateDailySugarTotals([
    { loggedAt: timestamp, totalSugar: 10, addedSugar: 4 },
    { loggedAt: timestamp, totalSugar: 0, addedSugar: 0 },
  ], today)).toEqual({
    entryCount: 2,
    totalSugar: { knownCount: 2, value: 10 },
    addedSugar: { knownCount: 2, value: 4 },
  });

  expect(calculateDailySugarTotals([
    { loggedAt: timestamp, totalSugar: 10, addedSugar: null },
    { loggedAt: timestamp },
  ], today)).toEqual({
    entryCount: 2,
    totalSugar: { knownCount: 1, value: 10 },
    addedSugar: { knownCount: 0, value: 0 },
  });
});

test("places Water directly below the food entry form", () => {
  renderNutritionPage();
  const foodEntryForm = screen.getByRole("heading", { name: "Add Nutrition Entry" }).closest("form");
  const waterSection = screen.getByRole("heading", { name: "Water" }).closest("section");

  expect(foodEntryForm.nextElementSibling).toBe(waterSection);
});

test("shows only the 10 newest food entries before progressively revealing older entries", () => {
  renderNutritionPage({
    nutritionEntries: Array.from({ length: 12 }, (_, index) => historyEntry(index + 1)),
  });
  const history = within(savedEntriesSection());
  const visibleNames = history.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);

  expect(visibleNames).toEqual([
    "Food 12", "Food 11", "Food 10", "Food 9", "Food 8",
    "Food 7", "Food 6", "Food 5", "Food 4", "Food 3",
  ]);
  expect(history.queryByRole("heading", { name: "Food 2" })).not.toBeInTheDocument();
  const showMore = history.getByRole("button", { name: "Show 2 more older food entries" });
  expect(showMore).toHaveTextContent("Show more (2 older)");

  fireEvent.click(showMore);

  expect(history.getAllByRole("heading", { level: 3 })).toHaveLength(12);
  expect(history.getByRole("heading", { name: "Food 1" })).toBeInTheDocument();
  expect(history.queryByRole("button", { name: /more older food entries/ })).not.toBeInTheDocument();
});

test("does not offer Show more for 10 or fewer food entries", () => {
  renderNutritionPage({
    nutritionEntries: Array.from({ length: 10 }, (_, index) => historyEntry(index + 1)),
  });

  expect(within(savedEntriesSection()).queryByRole("button", { name: /more older food entries/ }))
    .not.toBeInTheDocument();
});

test("food edit and delete controls remain correct with the limited history view", () => {
  window.confirm = jest.fn(() => true);
  const entries = Array.from({ length: 12 }, (_, index) => historyEntry(index + 1));
  const view = renderNutritionPage({ nutritionEntries: entries });
  let history = within(savedEntriesSection());

  fireEvent.click(within(history.getByRole("heading", { name: "Food 12" }).closest("article"))
    .getByRole("button", { name: "Delete" }));
  expect(view.deleteNutritionEntry).toHaveBeenCalledWith("food-history-12");

  view.rerender(<NutritionPage {...view.props} nutritionEntries={entries.slice(0, -1)} />);
  history = within(savedEntriesSection());
  expect(history.getAllByRole("heading", { level: 3 })).toHaveLength(10);
  expect(history.getByRole("heading", { name: "Food 2" })).toBeInTheDocument();
  expect(history.getByRole("button", { name: "Show 1 more older food entries" })).toBeInTheDocument();

  fireEvent.click(history.getByRole("button", { name: "Show 1 more older food entries" }));
  fireEvent.click(within(history.getByRole("heading", { name: "Food 1" }).closest("article"))
    .getByRole("button", { name: "Edit" }));
  expect(entryForm().getByLabelText("Food / meal name")).toHaveValue("Food 1");
  fireEvent.change(entryForm().getByLabelText("Food / meal name"), { target: { value: "Edited oldest food" } });
  fireEvent.click(entryForm().getByRole("button", { name: "Save Changes" }));
  expect(view.updateNutritionEntry).toHaveBeenCalledWith(
    "food-history-1",
    expect.objectContaining({ name: "Edited oldest food" })
  );
});

test("collapses Nutrition Goals by default and preserves edits across disclosure toggles", () => {
  renderNutritionPage();
  const toggle = screen.getByRole("button", { name: "Nutrition Goals" });

  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(toggle).toHaveAttribute("aria-controls", "nutrition-goals-panel");
  expect(screen.queryByRole("heading", { name: "Daily Goals" })).not.toBeInTheDocument();

  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  const goalsForm = screen.getByRole("heading", { name: "Daily Goals" }).closest("form");
  expect(goalsForm).toHaveAttribute("id", "nutrition-goals-panel");
  fireEvent.change(within(goalsForm).getByLabelText("Calories"), { target: { value: "2100" } });

  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("heading", { name: "Daily Goals" })).not.toBeInTheDocument();
  fireEvent.click(toggle);
  expect(within(screen.getByRole("heading", { name: "Daily Goals" }).closest("form")).getByLabelText("Calories")).toHaveValue(2100);
});

test("places food logging before daily, weekly, and monthly totals in semantic DOM order", () => {
  renderNutritionPage();
  const foodSearch = screen.getByRole("heading", { name: "Find a Food" });
  const addFood = screen.getByRole("heading", { name: "Add Nutrition Entry" });
  const totals = ["Daily Totals", "Weekly Totals", "Monthly Totals"].map((name) =>
    screen.getByRole("heading", { name })
  );

  for (const total of totals) {
    expect(foodSearch.compareDocumentPosition(total) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
    expect(addFood.compareDocumentPosition(total) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  }
});

test("confirms successful daily goal saves", () => {
  const props = renderNutritionPage();
  expandNutritionGoals();
  fireEvent.click(screen.getByRole("button", { name: "Save Goals" }));
  expect(props.saveNutritionGoals).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("save-confirmation")).toHaveTextContent("Goals traced");
});

test("saves an optional sodium goal", () => {
  const props = renderNutritionPage();
  expandNutritionGoals();
  const goalsForm = screen.getByRole("heading", { name: "Daily Goals" }).closest("form");
  fireEvent.change(within(goalsForm).getByLabelText("Sodium (mg)"), { target: { value: "2300" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Goals" }));
  expect(props.saveNutritionGoals).toHaveBeenCalledWith(expect.objectContaining({ sodium: 2300 }));
});

test("creates and edits an optional Water goal in the active display unit", () => {
  const view = renderNutritionPage({ waterUnit: "oz" });
  expandNutritionGoals();
  const waterGoal = screen.getByLabelText("Daily water goal in oz");
  expect(waterGoal).toHaveValue(null);

  fireEvent.change(waterGoal, { target: { value: "80" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Goals" }));
  expect(view.saveNutritionGoals).toHaveBeenLastCalledWith(expect.objectContaining({
    waterGoalMl: 2365.882365,
  }));

  fireEvent.change(waterGoal, { target: { value: "96" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Goals" }));
  expect(view.saveNutritionGoals).toHaveBeenLastCalledWith(expect.objectContaining({
    waterGoalMl: 2839.058838,
  }));
});

test("accepts a metric Water goal and keeps the no-goal state optional", () => {
  const view = renderNutritionPage({ waterUnit: "mL" });
  const totals = within(screen.getByRole("heading", { name: "Daily Totals" }).closest("section"));

  expect(totals.getByText("0 mL")).toBeInTheDocument();
  expect(totals.queryByLabelText("Water progress")).not.toBeInTheDocument();
  expandNutritionGoals();
  fireEvent.change(screen.getByLabelText("Daily water goal in mL"), { target: { value: "2400" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Goals" }));
  expect(view.saveNutritionGoals).toHaveBeenCalledWith(expect.objectContaining({ waterGoalMl: 2400 }));
});

test("Water goal unit switches display from the exact canonical draft without saving", () => {
  const goalMl = 80 * 29.5735295625;
  const view = renderNutritionPage({
    nutritionGoals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, sodium: 0, waterGoalMl: goalMl },
    waterUnit: "oz",
  });
  expandNutritionGoals();
  expect(screen.getByLabelText("Daily water goal in oz")).toHaveValue(80);

  view.rerender(<NutritionPage {...view.props} waterUnit="mL" />);
  expect(screen.getByLabelText("Daily water goal in mL")).toHaveValue(2366);
  view.rerender(<NutritionPage {...view.props} waterUnit="oz" />);
  expect(screen.getByLabelText("Daily water goal in oz")).toHaveValue(80);
  view.rerender(<NutritionPage
    {...view.props}
    nutritionGoals={{ ...view.props.nutritionGoals, waterGoalMl: 1000 }}
    waterUnit="mL"
  />);
  expect(screen.getByLabelText("Daily water goal in mL")).toHaveValue(1000);
  expect(view.saveNutritionGoals).not.toHaveBeenCalled();
});

test("shows today's Water against its goal and updates progress with Water entry changes", () => {
  const today = new Date().toISOString();
  const view = renderNutritionPage({
    nutritionGoals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0, sodium: 0, waterGoalMl: 1000 },
    waterEntries: [{ id: "water-one", amountMl: 250, loggedAt: today }],
    waterUnit: "mL",
  });
  let totals = within(screen.getByRole("heading", { name: "Daily Totals" }).closest("section"));
  expect(totals.getByText("250 mL / 1,000 mL")).toBeInTheDocument();
  expect(totals.getByText("25%")).toBeInTheDocument();

  view.rerender(<NutritionPage
    {...view.props}
    waterEntries={[
      { id: "water-one", amountMl: 500, loggedAt: today },
      { id: "water-two", amountMl: 250, loggedAt: today },
    ]}
  />);
  totals = within(screen.getByRole("heading", { name: "Daily Totals" }).closest("section"));
  expect(totals.getByText("750 mL / 1,000 mL")).toBeInTheDocument();
  expect(totals.getByText("75%")).toBeInTheDocument();

  view.rerender(<NutritionPage
    {...view.props}
    waterEntries={[{ id: "water-two", amountMl: 250, loggedAt: today }]}
  />);
  expect(within(screen.getByRole("heading", { name: "Daily Totals" }).closest("section"))
    .getByText("250 mL / 1,000 mL")).toBeInTheDocument();
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

test("provides matching timeline navigation controls without changing draft or search state", () => {
  const props = renderNutritionPage({
    nutritionEntries: [{
      ...entry(new Date().toISOString(), 420, 24, 36, 18, 510),
      name: "Logged lunch",
      notes: "",
    }],
  });
  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "banana" },
  });
  fireEvent.change(entryForm().getByLabelText("Food / meal name"), {
    target: { value: "Draft supper" },
  });
  const navigationButtons = screen.getAllByRole("button", {
    name: "Back to Timeline",
  });
  const bottomButton = screen.getByTestId("nutrition-bottom-back");
  const bottomNavigation = screen.getByRole("navigation", {
    name: "Nutrition page navigation",
  });

  expect(navigationButtons).toHaveLength(2);
  expect(navigationButtons[1]).toBe(bottomButton);
  [
    screen.getByRole("heading", { name: "Find a Food" }),
    screen.getByRole("heading", { name: "Add Nutrition Entry" }),
    screen.getByRole("heading", { name: "Saved Entries" }),
    screen.getByRole("heading", { name: "Logged lunch" }),
  ].forEach((content) => {
    expect(content.compareDocumentPosition(bottomNavigation) & Node.DOCUMENT_POSITION_FOLLOWING)
      .not.toBe(0);
  });

  fireEvent.click(bottomButton);
  expect(screen.getByLabelText("Food search")).toHaveValue("banana");
  expect(entryForm().getByLabelText("Food / meal name")).toHaveValue("Draft supper");
  expect(props.saveNutritionEntry).not.toHaveBeenCalled();
  fireEvent.click(navigationButtons[0]);

  expect(props.onBack).toHaveBeenCalledTimes(2);
});

test("selecting a search result populates the existing form", () => {
  renderNutritionPage();
  selectBanana();
  const form = entryForm();

  expect(form.getByLabelText("Food / meal name")).toHaveValue("Banana, raw");
  expect(form.getByLabelText("Calories")).toHaveValue(105);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(1.29);
  expect(form.getByLabelText("Carbohydrates (g)")).toHaveValue(26.9);
  expect(form.getByLabelText("Fat (g)")).toHaveValue(0.39);
  expect(form.getByLabelText("Total Sugar (g)")).toHaveValue(null);
  expect(form.getByLabelText("Added Sugar (g)")).toHaveValue(null);
  expect(form.getAllByText("Unknown")).toHaveLength(2);
  expect(form.getByLabelText("Number of servings")).toHaveValue(1);
  expect(form.getByText("One serving: 1 medium banana (118 g)")).toBeInTheDocument();
});

test("selecting and logging a branded drink preserves package, caffeine, sugars, and unknowns", () => {
  const props = renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "monster ultra zero" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Monster Energy.*Ultra Zero/i }));

  const form = entryForm();
  expect(form.getByLabelText("Food / meal name")).toHaveValue("Ultra Zero");
  expect(form.getByText("One serving: 16 fl oz can")).toBeInTheDocument();
  expect(form.getByText("Packaged drink: Monster Energy")).toBeInTheDocument();
  expect(form.getByText("Caffeine per serving: 150 mg")).toBeInTheDocument();
  expect(form.getByLabelText("Calories")).toHaveValue(10);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(null);
  expect(form.getByLabelText("Carbohydrates (g)")).toHaveValue(null);
  expect(form.getByLabelText("Total Sugar (g)")).toHaveValue(0);
  expect(form.getByLabelText("Added Sugar (g)")).toHaveValue(null);

  fireEvent.change(form.getByLabelText("Number of servings"), { target: { value: "2" } });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry).toHaveBeenCalledWith(expect.objectContaining({
    name: "Ultra Zero",
    calories: 20,
    protein: null,
    carbohydrates: null,
    totalSugar: 0,
    addedSugar: null,
    portion: expect.objectContaining({ amount: 2 }),
    foodReference: expect.objectContaining({
      sourceType: "beverage",
      brand: "Monster Energy",
      category: "energy",
      packageSize: "16 fl oz can",
      caffeineMg: 150,
      modified: false,
    }),
    nutritionBasis: expect.objectContaining({
      calories: 10,
      protein: null,
      carbohydrates: null,
      totalSugar: 0,
      addedSugar: null,
    }),
  }));
});

test("scales a branded yogurt to multiple servings and marks edited provenance", () => {
  const props = renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "Chobani high protein vanilla" },
  });
  fireEvent.click(screen.getByRole("button", {
    name: /Chobani.*20g Protein Lowfat Greek Yogurt Vanilla/i,
  }));

  const form = entryForm();
  fireEvent.change(form.getByLabelText("Number of servings"), { target: { value: "2" } });
  expect(form.getByLabelText("Calories")).toHaveValue(280);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(40);
  expect(form.getByLabelText("Total Sugar (g)")).toHaveValue(14);
  expect(form.getByLabelText("Added Sugar (g)")).toHaveValue(0);
  fireEvent.change(form.getByLabelText("Sodium (mg)"), { target: { value: "201" } });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry).toHaveBeenCalledWith(expect.objectContaining({
    calories: 280,
    protein: 40,
    totalSugar: 14,
    addedSugar: 0,
    sodium: 201,
    foodReference: expect.objectContaining({
      sourceType: "packaged-food",
      brand: "Chobani",
      identifiers: [{ scheme: "gtin", value: "818290015150" }],
      modified: true,
    }),
  }));
});

test("saves structured product identifiers in the immutable food reference snapshot", () => {
  const props = renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "pepsi cola" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Pepsi.*20 fl oz bottle/i }));
  const form = entryForm();
  expect(form.getByLabelText("Total Sugar (g)")).toHaveValue(69);
  expect(form.getByLabelText("Added Sugar (g)")).toHaveValue(69);
  fireEvent.change(form.getByLabelText("Number of servings"), { target: { value: "0.5" } });
  expect(form.getByLabelText("Total Sugar (g)")).toHaveValue(34.5);
  expect(form.getByLabelText("Added Sugar (g)")).toHaveValue(34.5);
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry.mock.calls[0][0].foodReference).toMatchObject({
    sourceType: "beverage",
    sourceId: "beverage:pepsi:pepsi-20oz",
    identifiers: [{ scheme: "gtin", value: "00012000001291" }],
    modified: false,
  });
  expect(props.saveNutritionEntry.mock.calls[0][0]).toMatchObject({
    totalSugar: 34.5,
    addedSugar: 34.5,
    nutritionBasis: { totalSugar: 69, addedSugar: 69 },
  });
});

test("selects, scales, and saves a branded dairy package with sugars and provenance", () => {
  const props = renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "Good Culture lactose free" },
  });
  const result = screen.getByRole("button", {
    name: /Good Culture.*Simply Lactose Free 2% Low-Fat Cottage Cheese/i,
  });
  expect(within(result).getByText("Packaged food")).toBeInTheDocument();
  expect(within(result).getByText("Verified manufacturer label")).toBeInTheDocument();
  fireEvent.click(result);

  const form = entryForm();
  expect(form.getByLabelText("Food / meal name")).toHaveValue("Simply Lactose Free 2% Low-Fat Cottage Cheese");
  expect(form.getByText("One serving: 1/2 cup")).toBeInTheDocument();
  expect(form.getByText("Packaged food: Good Culture · 15 oz tub")).toBeInTheDocument();
  expect(form.getByLabelText("Calories")).toHaveValue(90);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(14);
  expect(form.getByLabelText("Sodium (mg)")).toHaveValue(380);
  expect(form.getByLabelText("Total Sugar (g)")).toHaveValue(4);
  expect(form.getByLabelText("Added Sugar (g)")).toHaveValue(0);

  fireEvent.change(form.getByLabelText("Number of servings"), { target: { value: "0.5" } });
  expect(form.getByLabelText("Calories")).toHaveValue(45);
  expect(form.getByLabelText("Total Sugar (g)")).toHaveValue(2);
  expect(form.getByLabelText("Added Sugar (g)")).toHaveValue(0);
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry).toHaveBeenCalledWith(expect.objectContaining({
    name: "Simply Lactose Free 2% Low-Fat Cottage Cheese",
    calories: 45,
    protein: 7,
    totalSugar: 2,
    addedSugar: 0,
    portion: expect.objectContaining({
      amount: 0.5,
      basis: expect.objectContaining({ description: "1/2 cup" }),
    }),
    nutritionBasis: expect.objectContaining({ calories: 90, totalSugar: 4, addedSugar: 0 }),
    foodReference: expect.objectContaining({
      sourceType: "packaged-food",
      dataType: "branded",
      brand: "Good Culture",
      category: "cottage-cheese",
      packageSize: "15 oz tub",
      servingsPerContainer: 4,
      identifiers: [{ scheme: "gtin", value: "850011288252" }],
      catalogVersion: 1,
      catalogBatch: "yogurt-dairy-phase-1a",
      verification: expect.objectContaining({
        sourceUrl: "https://goodculture.com/product/simply-cottage-cheese-15-oz-lactose-free/",
        accessedAt: "2026-09-03",
      }),
      modified: false,
    }),
  }));
  const source = brandedPackagedFoods.find((food) => food.id === "packaged-food:good-culture-simply-lactose-free-lowfat-15oz");
  const savedReference = props.saveNutritionEntry.mock.calls[0][0].foodReference;
  expect(savedReference.identifiers).not.toBe(source.identifiers);
  expect(savedReference.identifiers[0]).not.toBe(source.identifiers[0]);
  expect(savedReference.verification).not.toBe(source.provenance.verification);
  expect(savedReference.verification.secondarySources[0])
    .not.toBe(source.provenance.verification.secondarySources[0]);
});

test("selects, scales, and saves Phase 1B oatmeal with its barcode-ready snapshot", () => {
  const props = renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "Premier Protein maple brown sugar oatmeal" },
  });
  const result = screen.getByRole("button", {
    name: /Premier Protein.*Maple & Brown Sugar Instant Oatmeal/i,
  });
  expect(within(result).getByText("Packaged food")).toBeInTheDocument();
  expect(within(result).getByText("Verified manufacturer label")).toBeInTheDocument();
  fireEvent.click(result);

  const form = entryForm();
  expect(form.getByText("One serving: 1 pouch")).toBeInTheDocument();
  expect(form.getByLabelText("Calories")).toHaveValue(190);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(13);
  expect(form.getByLabelText("Total Sugar (g)")).toHaveValue(8);
  expect(form.getByLabelText("Added Sugar (g)")).toHaveValue(7);

  fireEvent.change(form.getByLabelText("Number of servings"), { target: { value: "1.5" } });
  expect(form.getByLabelText("Calories")).toHaveValue(285);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(19.5);
  expect(form.getByLabelText("Added Sugar (g)")).toHaveValue(10.5);
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry).toHaveBeenCalledWith(expect.objectContaining({
    name: "Maple & Brown Sugar Instant Oatmeal",
    calories: 285,
    protein: 19.5,
    totalSugar: 12,
    addedSugar: 10.5,
    portion: expect.objectContaining({ amount: 1.5 }),
    nutritionBasis: expect.objectContaining({ calories: 190, totalSugar: 8, addedSugar: 7 }),
    foodReference: expect.objectContaining({
      sourceType: "packaged-food",
      dataType: "branded",
      brand: "Premier Protein",
      category: "oatmeal",
      packageSize: "6 pouches (10.6 oz)",
      servingsPerContainer: 6,
      identifiers: [{ scheme: "gtin", value: "00884912491183" }],
      catalogVersion: 1,
      catalogBatch: "cereal-oatmeal-phase-1b",
      verification: expect.objectContaining({
        sourceUrl: "https://www.postconsumerbrands.com/brands/premier-protein/products/premier-protein-maple-brown-sugar-oatmeal/",
        accessedAt: "2026-09-03",
      }),
      modified: false,
    }),
  }));
});

test("shows USDA grocery source, serving, and unknown nutrients for raw chicken breast strips", () => {
  const props = renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "raw chicken breast strips" },
  });

  const result = screen.getByRole("button", {
    name: /Chicken breast, boneless, skinless, raw/i,
  });
  expect(within(result).getByText("USDA")).toBeInTheDocument();
  expect(within(result).getByText("Grocery")).toBeInTheDocument();
  expect(result).toHaveTextContent("4 oz raw (113 g)");
  expect(result).toHaveTextContent("Carbs 0 g");
  expect(result).toHaveTextContent("Fiber Unknown");
  expect(result).toHaveTextContent("Some USDA nutrient values are unavailable and remain unknown.");

  fireEvent.click(result);
  const form = entryForm();
  expect(form.getByLabelText("Food / meal name")).toHaveValue(
    "Chicken breast, boneless, skinless, raw"
  );
  expect(form.getByLabelText("Calories")).toHaveValue(120.2);
  expect(form.getByLabelText("Carbohydrates (g)")).toHaveValue(0);
  expect(form.getByLabelText("Fiber (g)")).toHaveValue(null);
  expect(form.getByText("One serving: 4 oz raw (113 g)")).toBeInTheDocument();

  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));
  expect(props.saveNutritionEntry).toHaveBeenCalledWith(expect.objectContaining({
    carbohydrates: 0,
    fiber: null,
    foodReference: expect.objectContaining({
      source: "usda-fooddata-central",
      sourceId: "2646170",
      label: "USDA",
      sourceType: "grocery",
      dataType: "generic",
      preparationState: "raw",
      modified: false,
    }),
  }));
});

test("shows raw chicken breast and excludes the cooked USDA variant", () => {
  renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "chicken breast" },
  });

  const raw = screen.getByRole("button", { name: /Chicken breast, boneless, skinless, raw/i });
  expect(raw).toHaveTextContent("4 oz raw (113 g)");
  expect(screen.queryByRole("button", { name: /Chicken breast, cooked, roasted/i })).not.toBeInTheDocument();
});

test("keeps food search results contained at the 390px mobile contract", () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  renderNutritionPage();
  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "raw chicken breast strips" },
  });

  const search = screen.getByRole("heading", { name: "Find a Food" }).closest("section");
  const result = screen.getByRole("button", { name: /Chicken breast, boneless, skinless, raw/i });
  expect(search).toHaveStyle({ boxSizing: "border-box", maxWidth: "700px", minWidth: 0, width: "100%" });
  expect(result).toHaveStyle({ boxSizing: "border-box", maxWidth: "100%", minWidth: 0, width: "100%" });
  expect(result.querySelector(".trace-food-result__heading")).toHaveStyle({ minWidth: 0 });
  expect(result.querySelector(".trace-food-result__badges")).toHaveStyle({ maxWidth: "100%", minWidth: 0 });
  const css = readFileSync(require.resolve("../index.css"), "utf8");
  expect(css).toMatch(/\.trace-nutrition-bottom-navigation\s*\{[^}]*box-sizing:\s*border-box;[^}]*max-width:\s*700px;[^}]*width:\s*100%/s);
  expect(css).toMatch(/\.trace-nutrition-bottom-navigation \.trace-action\s*\{[^}]*max-width:\s*100%;[^}]*width:\s*100%/s);
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
  expect(form.getByLabelText("Protein (g)")).toHaveValue(0.645);
  expect(form.getByLabelText("Carbohydrates (g)")).toHaveValue(13.45);
  expect(form.getByLabelText("Fat (g)")).toHaveValue(0.195);
});

test("multiple servings recalculate all nutrients live", () => {
  renderNutritionPage();
  selectBanana();
  const form = entryForm();

  fireEvent.change(form.getByLabelText("Number of servings"), {
    target: { value: "2" },
  });

  expect(form.getByLabelText("Calories")).toHaveValue(210);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(2.58);
  expect(form.getByLabelText("Carbohydrates (g)")).toHaveValue(53.8);
  expect(form.getByLabelText("Fat (g)")).toHaveValue(0.78);
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
  fireEvent.change(form.getByLabelText("Total Sugar (g)"), {
    target: { value: "8" },
  });
  fireEvent.change(form.getByLabelText("Added Sugar (g)"), {
    target: { value: "3" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveUserFood).toHaveBeenCalledWith({
    name: "Meatloaf",
    nutrients: {
      calories: 350,
      protein: 22,
      carbohydrates: 18,
      fat: 20,
      fiber: null,
      sodium: null,
      totalSugar: 8,
      addedSugar: 3,
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
      sourceType: "grocery-custom",
      category: "other",
      categoryLabel: "Other",
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
      totalSugar: 8,
      addedSugar: 3,
    },
  });
  expect(screen.getByLabelText("Food search")).toHaveValue("");
  expect(form.getByLabelText("Food / meal name")).toHaveValue("");
});

test("manual sugar rejects negative values and added sugar above total sugar", () => {
  const props = renderNutritionPage();
  const form = entryForm();
  fireEvent.change(form.getByLabelText("Food / meal name"), {
    target: { value: "Sweet snack" },
  });
  fireEvent.change(form.getByLabelText("Total Sugar (g)"), {
    target: { value: "4" },
  });
  fireEvent.change(form.getByLabelText("Added Sugar (g)"), {
    target: { value: "5" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(form.getByRole("alert")).toHaveTextContent(
    "Added Sugar cannot exceed Total Sugar."
  );
  expect(props.saveNutritionEntry).not.toHaveBeenCalled();

  fireEvent.change(form.getByLabelText("Added Sugar (g)"), {
    target: { value: "-1" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));
  expect(form.getByRole("alert")).toHaveTextContent(
    "Added Sugar must be zero or greater."
  );
  expect(props.saveNutritionEntry).not.toHaveBeenCalled();
});

test("creates a custom grocery food with nullable nutrients and reusable source metadata", () => {
  const saveUserFood = jest.fn((food) => ({
    status: "added",
    food: createUserFood(food.name, food.nutrients, food.serving, food),
    matchesDefinition: true,
  }));
  const props = renderNutritionPage({ saveUserFood });

  fireEvent.click(screen.getByRole("button", { name: "Create grocery food" }));
  const creator = screen.getByRole("button", { name: "Save grocery food" }).closest("form");
  fireEvent.change(within(creator).getByLabelText("Food name"), {
    target: { value: "Raw chicken breast strips" },
  });
  fireEvent.change(within(creator).getByLabelText("Brand (optional)"), {
    target: { value: "Market Pantry" },
  });
  fireEvent.change(within(creator).getByLabelText("Food category / type"), {
    target: { value: "protein" },
  });
  fireEvent.change(within(creator).getByLabelText("Serving amount"), {
    target: { value: "4" },
  });
  fireEvent.change(within(creator).getByLabelText("Serving unit"), {
    target: { value: "oz" },
  });
  fireEvent.change(within(creator).getByLabelText("Protein (g)"), {
    target: { value: "26" },
  });
  fireEvent.change(within(creator).getByLabelText("Total Sugar (g), optional"), {
    target: { value: "2" },
  });
  fireEvent.change(within(creator).getByLabelText("Added Sugar (g), optional"), {
    target: { value: "0" },
  });
  fireEvent.change(within(creator).getByLabelText("Food notes (optional)"), {
    target: { value: "Raw weight" },
  });
  fireEvent.click(within(creator).getByRole("button", { name: "Save grocery food" }));

  expect(props.saveNutritionEntry).not.toHaveBeenCalled();
  expect(saveUserFood).toHaveBeenCalledWith(expect.objectContaining({
    name: "Raw chicken breast strips",
    brand: "Market Pantry",
    category: "protein",
    serving: { amount: 4, unit: "oz", description: "4 oz" },
    nutrients: {
      calories: "",
      protein: "26",
      carbohydrates: "",
      fat: "",
      fiber: "",
      sodium: "",
      totalSugar: "2",
      addedSugar: "0",
    },
    notes: "Raw weight",
  }));
  expect(saveUserFood.mock.results[0].value.food).toMatchObject({
    sourceType: "grocery-custom",
    categoryLabel: "Protein / meat",
    nutrients: {
      calories: null,
      protein: 26,
      carbohydrates: null,
      fat: null,
      fiber: null,
      sodium: null,
      totalSugar: 2,
      addedSugar: 0,
    },
    provenance: { label: "User-entered", completeness: "partial" },
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "Raw chicken breast strips saved. Search for it above to log a meal."
  );
});

test("keeps the existing grocery food when a duplicate name is submitted", () => {
  const existingFood = createUserFood("Oats", { calories: 150 });
  const saveUserFood = jest.fn(() => ({
    status: "duplicate",
    food: existingFood,
    matchesDefinition: false,
  }));
  const props = renderNutritionPage({ saveUserFood });

  fireEvent.click(screen.getByRole("button", { name: "Create grocery food" }));
  const creator = screen.getByRole("button", { name: "Save grocery food" }).closest("form");
  fireEvent.change(within(creator).getByLabelText("Food name"), {
    target: { value: "  OATS " },
  });
  fireEvent.click(within(creator).getByRole("button", { name: "Save grocery food" }));

  expect(screen.getByRole("alert")).toHaveTextContent(
    "A grocery food named Oats is already saved. The existing food was kept."
  );
  expect(props.saveNutritionEntry).not.toHaveBeenCalled();
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

  expect(screen.getByText("Grocery")).toBeInTheDocument();
  expect(screen.getByText("User-entered")).toBeInTheDocument();
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
      sourceType: "grocery-custom",
      category: "other",
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

test("searches a grocery food later and logs unknown nutrients without converting them to zero", () => {
  const groceryFood = createUserFood(
    "Raw chicken breast strips",
    { protein: 26, carbohydrates: 0 },
    { amount: 4, unit: "oz", description: "4 oz" },
    { brand: "Market Pantry", category: "protein" }
  );
  const props = renderNutritionPage({ userFoods: [groceryFood] });

  fireEvent.change(screen.getByLabelText("Food search"), {
    target: { value: "Market Pantry" },
  });
  const result = screen.getByRole("button", { name: /Raw chicken breast strips/i });
  expect(within(result).getByText("Grocery")).toBeInTheDocument();
  expect(within(result).getByText("User-entered")).toBeInTheDocument();
  expect(within(result).getByText("Protein / meat · Market Pantry")).toBeInTheDocument();
  fireEvent.click(result);

  const form = entryForm();
  expect(form.getByLabelText("Calories")).toHaveValue(null);
  expect(form.getByLabelText("Protein (g)")).toHaveValue(26);
  expect(form.getByLabelText("Carbohydrates (g)")).toHaveValue(0);
  expect(form.getByLabelText("Fat (g)")).toHaveValue(null);
  expect(form.getByLabelText("Fiber (g)")).toHaveValue(null);
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry).toHaveBeenCalledWith(expect.objectContaining({
    name: "Raw chicken breast strips",
    calories: null,
    protein: 26,
    carbohydrates: 0,
    fat: null,
    fiber: null,
    foodReference: expect.objectContaining({
      sourceType: "grocery-custom",
      category: "protein",
      categoryLabel: "Protein / meat",
      brand: "Market Pantry",
    }),
    nutritionCompleteness: expect.objectContaining({
      status: "partial",
      unknownNutrients: expect.arrayContaining([
        "calories",
        "fat",
        "sodium",
        "totalSugar",
        "addedSugar",
      ]),
    }),
  }));
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
  const duplicateEntryStatus = screen.getByText(
    "Entry logged. Your existing saved Meatloaf was kept.",
    { selector: '[role="status"]' }
  );
  expect(duplicateEntryStatus).toHaveTextContent(
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
    protein: 1.935,
    carbohydrates: 40.349999999999994,
    fat: 0.585,
    portion: {
      amount: 1.5,
      unit: "serving",
      basis: {
        amount: 1,
        unit: "item",
        description: "1 medium banana (118 g)",
        grams: 118,
      },
    },
    nutritionBasis: {
      calories: 105,
      protein: 1.29,
      carbohydrates: 26.9,
      fat: 0.39,
    },
  });
});

test("selected catalog provenance is saved when values are unchanged", () => {
  const props = renderNutritionPage();
  selectBanana();
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  expect(props.saveNutritionEntry.mock.calls[0][0].foodReference).toEqual({
    ...USDA_BANANA_REFERENCE,
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
    ...USDA_BANANA_REFERENCE,
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
    ...USDA_BANANA_REFERENCE,
    modified: true,
  });
});

test("editing saved sugar restores values and marks provenance modified without changing its basis", () => {
  const savedEntry = {
    id: "saved-pepsi",
    name: "Pepsi",
    calories: 250,
    protein: 0,
    carbohydrates: 69,
    fat: 0,
    fiber: null,
    sodium: 55,
    totalSugar: 69,
    addedSugar: 69,
    loggedAt: localTimestamp(2026, 7, 8),
    notes: "",
    foodReference: {
      source: "official-manufacturer",
      sourceId: "beverage:pepsi:pepsi-20oz",
      confidence: "official-source",
      sourceType: "beverage",
      brand: "Pepsi",
      category: "soda",
      packageSize: "20 fl oz bottle",
      caffeineMg: 63,
      identifiers: [{ scheme: "gtin", value: "00012000001291" }],
      modified: false,
    },
    portion: {
      amount: 1,
      unit: "serving",
      basis: { amount: 1, unit: "item", description: "20 fl oz bottle" },
    },
    nutritionBasis: {
      calories: 250,
      protein: 0,
      carbohydrates: 69,
      fat: 0,
      sodium: 55,
      totalSugar: 69,
      addedSugar: 69,
    },
  };
  const props = renderNutritionPage({ nutritionEntries: [savedEntry] });

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const form = entryForm();
  expect(form.getByLabelText("Total Sugar (g)")).toHaveValue(69);
  expect(form.getByLabelText("Added Sugar (g)")).toHaveValue(69);
  fireEvent.change(form.getByLabelText("Added Sugar (g)"), {
    target: { value: "50" },
  });
  fireEvent.click(form.getByRole("button", { name: "Save Changes" }));

  expect(props.updateNutritionEntry).toHaveBeenCalledWith(
    "saved-pepsi",
    expect.objectContaining({
      totalSugar: 69,
      addedSugar: 50,
      nutritionBasis: savedEntry.nutritionBasis,
      foodReference: expect.objectContaining({
        identifiers: savedEntry.foodReference.identifiers,
        modified: true,
      }),
    })
  );
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

test("keeps a previously logged cooked USDA food and its immutable snapshot intact", () => {
  const savedEntry = {
    id: "saved-cooked-chicken",
    name: "Chicken breast, cooked, roasted",
    calories: 140.3,
    protein: 26.35,
    carbohydrates: 0,
    fat: 3.03,
    fiber: 0,
    sodium: 62.9,
    loggedAt: localTimestamp(2026, 7, 8),
    notes: "Historical USDA entry",
    foodReference: {
      source: "usda-fooddata-central",
      sourceId: "171477",
      confidence: "official-source",
      label: "USDA",
      sourceType: "grocery",
      dataType: "generic",
      category: "protein",
      categoryLabel: "Protein / meat",
      preparationState: "cooked",
      modified: false,
    },
    portion: {
      amount: 1,
      unit: "serving",
      basis: { amount: 3, unit: "oz", description: "3 oz cooked (85 g)", grams: 85 },
    },
    nutritionBasis: {
      calories: 140.3,
      protein: 26.35,
      carbohydrates: 0,
      fat: 3.03,
      fiber: 0,
      sodium: 62.9,
    },
  };
  const props = renderNutritionPage({ nutritionEntries: [savedEntry] });

  expect(screen.getByText("Chicken breast, cooked, roasted")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const form = entryForm();
  expect(form.getByText("One serving: 3 oz cooked (85 g)")).toBeInTheDocument();
  expect(form.getByLabelText("Calories")).toHaveValue(140.3);
  expect(form.getByLabelText("Fat (g)")).toHaveValue(3.03);
  fireEvent.click(form.getByRole("button", { name: "Save Changes" }));
  expect(props.updateNutritionEntry).toHaveBeenCalledWith(
    "saved-cooked-chicken",
    expect.objectContaining({
      nutritionBasis: savedEntry.nutritionBasis,
      portion: savedEntry.portion,
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
  const legacyCard = screen.getByRole("heading", { name: "Legacy meal" }).closest("article");
  expect(legacyCard).not.toHaveTextContent("Total Sugar");
  expect(legacyCard).not.toHaveTextContent("Added Sugar");

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  const form = entryForm();

  expect(form.queryByLabelText("Number of servings")).not.toBeInTheDocument();
  expect(form.getByLabelText("Calories")).toHaveValue(300);
  expect(form.getByLabelText("Total Sugar (g)")).toHaveValue(null);
  expect(form.getByLabelText("Added Sugar (g)")).toHaveValue(null);
  fireEvent.click(form.getByRole("button", { name: "Save Changes" }));

  expect(props.updateNutritionEntry).toHaveBeenCalledWith(
    "legacy-entry",
    expect.not.objectContaining({
      portion: expect.anything(),
      nutritionBasis: expect.anything(),
    })
  );
});

test("saved entry cards show known sugar and preserve explicit zero", () => {
  renderNutritionPage({
    nutritionEntries: [{
      id: "sugar-entry",
      name: "Sugar example",
      calories: 100,
      protein: 1,
      carbohydrates: 20,
      fat: 1,
      fiber: null,
      sodium: null,
      totalSugar: 2,
      addedSugar: 0,
      loggedAt: new Date().toISOString(),
      notes: "",
    }],
  });

  const card = screen.getByRole("heading", { name: "Sugar example" }).closest("article");
  expect(card).toHaveTextContent("Total Sugar 2 g");
  expect(card).toHaveTextContent("Added Sugar 0 g");
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
