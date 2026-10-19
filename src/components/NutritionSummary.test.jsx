import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NutritionSummary, { calculateDailyNutritionTotals } from "./NutritionSummary";

const goals = { calories: 1800, protein: 90, carbohydrates: 180, fat: 60, sodium: 2000, waterGoalMl: 2000 };
const loggedAt = new Date().toISOString();
const food = { loggedAt, calories: 450, protein: 22.5, carbohydrates: 45, fat: 15, sodium: 500, fiber: 3, totalSugar: 5, addedSugar: 0 };

function setup(overrides = {}) {
  const props = { entries: [food], goals, waterEntries: [{ id: "water-today", loggedAt, amountMl: 500 }], waterUnit: "mL", barcodeAccess: { available: true }, onScanBarcode: jest.fn(), onAddFood: jest.fn(), ...overrides };
  return { ...render(<NutritionSummary {...props} />), props };
}

test("starts collapsed with real calories, goals, remaining calories and primary progress", () => {
  setup();
  expect(screen.getByRole("button", { name: "View all nutrition" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByText("Fat (g)")).not.toBeVisible();
  expect(screen.getByText("1350 left")).toBeVisible();
  for (const name of ["Calories", "Protein", "Carbs"]) {
    expect(screen.getByRole("progressbar", { name: `${name} progress` })).toHaveAttribute("aria-valuenow", "25");
  }
  expect(screen.queryByRole("progressbar", { name: "Sodium progress" })).not.toBeInTheDocument();
});

test("keyboard disclosure reveals all secondary metrics and collapses without losing focus", () => {
  setup();
  const button = screen.getByRole("button", { name: "View all nutrition" });
  button.focus();
  userEvent.keyboard("{Enter}");
  expect(button).toHaveAccessibleName("Hide nutrition details");
  expect(button).toHaveAttribute("aria-expanded", "true");
  expect(button).toHaveAttribute("aria-controls", "nutrition-details");
  for (const label of ["Fat (g)", "Sodium (mg)", "Water (mL)", "Total Sugar (g)", "Added Sugar (g)", "Fiber (g)"]) {
    expect(screen.getByText(label)).toBeVisible();
  }
  expect(screen.getByRole("progressbar", { name: "Water progress" })).toHaveAttribute("aria-valuenow", "25");
  userEvent.keyboard(" ");
  expect(button).toHaveFocus();
  expect(screen.getByText("Fat (g)")).not.toBeVisible();
});

test("changing date updates food and water together without UTC day shifts", () => {
  setup({ entries: [food, { ...food, loggedAt: new Date(2024, 0, 2, 23, 55).toISOString(), calories: 100 }], waterEntries: [{ id: "water-past", loggedAt: new Date(2024, 0, 2, 0, 5).toISOString(), amountMl: 250 }] });
  fireEvent.change(screen.getByLabelText("Nutrition date"), { target: { value: "2024-01-02" } });
  expect(screen.getByText("1700 left")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "View all nutrition" }));
  expect(screen.getByText("250 mL / 2,000 mL")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Nutrition date"), { target: { value: "2024-01-03" } });
  expect(screen.getByText("1800 left")).toBeVisible();
  expect(screen.getByText("0 mL / 2,000 mL")).toBeVisible();
});

test("unknown and partial totals never claim zero intake or an accurate remaining amount", () => {
  const { rerender, props } = setup({ entries: [{ loggedAt, calories: null }] });
  expect(within(screen.getByRole("region", { name: "Daily Totals" })).getAllByText("Unknown")[0]).toBeVisible();
  expect(screen.getByText("Remaining unknown")).toBeVisible();
  expect(screen.getByRole("progressbar", { name: "Calories progress" })).not.toHaveAttribute("aria-valuenow");
  rerender(<NutritionSummary {...props} entries={[food, { loggedAt, calories: null }]} />);
  expect(screen.getByText("Known Calories")).toBeVisible();
  expect(screen.getAllByText("Totals may be incomplete: some foods have missing nutrition data.")).toHaveLength(1);
  expect(screen.getByText("Remaining unknown")).toBeVisible();
  expect(screen.getByRole("progressbar", { name: "Calories progress" })).toHaveAttribute("aria-valuetext", "25% · Known values only; incomplete");
});

test("rounds summary values only, retaining exact totals, goals, and progress calculations", () => {
  const entries = [{ ...food, calories: 450.56, protein: 22.56, carbohydrates: 45.67 }];
  const preciseGoals = { ...goals, calories: 1800.44, protein: 90.26, carbohydrates: 180.37 };
  const originalEntries = JSON.stringify(entries);
  const originalGoals = JSON.stringify(preciseGoals);
  setup({ entries, goals: preciseGoals });
  const summary = within(screen.getByRole("region", { name: "Daily Totals" }));
  expect(summary.getByText("451")).toBeVisible();
  expect(summary.getByText("/ 1800")).toBeVisible();
  expect(summary.getByText("1350 left")).toBeVisible();
  expect(summary.getByText("22.6")).toBeVisible();
  expect(summary.getByText("/ 90.3 g")).toBeVisible();
  expect(summary.getByText("45.7")).toBeVisible();
  expect(summary.getByText("/ 180.4 g")).toBeVisible();
  expect(screen.getByRole("progressbar", { name: "Calories progress" })).toHaveAttribute("aria-valuenow", String(450.56 / 1800.44 * 100));
  expect(calculateDailyNutritionTotals(entries).protein.value).toBe(22.56);
  expect(JSON.stringify(entries)).toBe(originalEntries);
  expect(JSON.stringify(preciseGoals)).toBe(originalGoals);
});

test("partial macros keep simple labels and an accessible shared explanation", () => {
  setup({ entries: [food, { loggedAt, protein: null, carbohydrates: null }] });
  const summary = within(screen.getByRole("region", { name: "Daily Totals" }));
  expect(summary.getByText("Protein")).toBeVisible();
  expect(summary.getByText("Carbs")).toBeVisible();
  expect(summary.queryByText(/Known Protein|Known Carbohydrates|Known Carbs/)).not.toBeInTheDocument();
  const describedValues = summary.getAllByRole("paragraph", { description: "Totals may be incomplete: some foods have missing nutrition data." });
  expect(describedValues.some((value) => value.textContent === "22.5 / 90 g")).toBe(true);
  expect(describedValues.some((value) => value.textContent === "45 / 180 g")).toBe(true);
});

test("daily aggregation preserves precision, explicit zero, and missing nutrient metadata", () => {
  const totals = calculateDailyNutritionTotals([
    { ...food, calories: 120.2, addedSugar: 0 },
    { ...food, calories: 120.2, addedSugar: null, totalSugar: "", fiber: NaN },
    { ...food, loggedAt: "invalid date", calories: 999 },
  ]);
  expect(totals.entryCount).toBe(2);
  expect(totals.calories).toEqual({ value: 240.4, knownCount: 2 });
  expect(totals.addedSugar).toEqual({ value: 0, knownCount: 1 });
  expect(totals.totalSugar).toEqual({ value: 5, knownCount: 1 });
  expect(totals.fiber).toEqual({ value: 3, knownCount: 1 });
});

test("over-goal and no-goal states stay accurate as saved goals and records change", () => {
  const { rerender, props } = setup({ goals: { ...goals, calories: 400 } });
  expect(screen.getByText("50 over goal")).toBeVisible();
  const progress = screen.getByRole("progressbar", { name: "Calories progress" });
  expect(progress).toHaveAttribute("aria-valuenow", "100");
  rerender(<NutritionSummary {...props} goals={{ ...goals, calories: 0 }} />);
  expect(progress).toHaveAttribute("aria-valuetext", "No goal set");
  expect(screen.queryByText(/left|over goal/)).not.toBeInTheDocument();
  rerender(<NutritionSummary {...props} entries={[]} />);
  expect(screen.getByText("400 left")).toBeVisible();
});

test("primary actions use the supplied flows and honor scanner availability", () => {
  const { props, rerender } = setup();
  userEvent.click(screen.getByRole("button", { name: "Scan Barcode" }));
  userEvent.click(screen.getByRole("button", { name: "Add Food" }));
  expect(props.onScanBarcode).toHaveBeenCalledTimes(1);
  expect(props.onAddFood).toHaveBeenCalledTimes(1);
  rerender(<NutritionSummary {...props} barcodeAccess={{ available: false, message: "Scanner unavailable." }} />);
  expect(screen.getByRole("button", { name: "Scan Barcode" })).toBeDisabled();
  expect(screen.getByText(/Scanner unavailable/)).toBeVisible();
});
