import { fireEvent, render, screen, within } from "@testing-library/react";
import NutritionPage from "./NutritionPage";
import { searchFoodCatalog, searchFoods } from "../services/foodSearch";
import {
  appendNutritionEntry,
  NUTRITION_ENTRIES_STORAGE_KEY,
  NUTRITION_MUTATION_STATUS,
  readNutritionEntries,
} from "../services/nutritionEntryStorage";

jest.mock("../services/foodSearch", () => ({
  ...jest.requireActual("../services/foodSearch"),
  searchFoodCatalog: jest.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  searchFoodCatalog.mockReset();
});

function paginatedFoods() {
  return Array.from({ length: 23 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    const sourceId = `fixture-kitchen:pagination-bowl-${number}`;
    const serving = { amount: 1, unit: "serving", description: "Small bowl" };
    const nutrients = {
      calories: 125,
      protein: 7.5,
      carbohydrates: 20,
      fat: 3.25,
      fiber: null,
      sodium: 450.5,
      totalSugar: 0,
      addedSugar: null,
    };
    const provenance = {
      source: "official-restaurant",
      sourceId: `${sourceId}:small`,
      confidence: "official-source",
      completeness: "partial",
    };
    return {
      id: `restaurant:${sourceId}`,
      name: `Pagination Bowl ${number}`,
      sourceType: "restaurant",
      restaurant: { id: "fixture-kitchen", name: "Fixture Kitchen" },
      serving,
      nutrients,
      provenance,
      servingOptions: [
        { id: `${sourceId}:small`, serving, nutrients, provenance },
        {
          id: `${sourceId}:large`,
          serving: { amount: 1, unit: "serving", description: "Large bowl" },
          nutrients: {
            calories: 310,
            protein: 16,
            carbohydrates: 42,
            fat: 9.75,
            fiber: null,
            sodium: 875.5,
            totalSugar: 0,
            addedSugar: null,
          },
          provenance: { ...provenance, sourceId: `${sourceId}:large` },
        },
      ],
    };
  });
}

test("logs a third-batch result with its selected serving, precise nutrition, and unknowns while preserving prior records", () => {
  const foods = paginatedFoods();
  const originalFoods = JSON.stringify(foods);
  // Keep real search ranking and limit handling, with a bounded catalog that
  // cannot shift as more published foods are added.
  searchFoodCatalog.mockImplementation((query, userFoods, limit) =>
    searchFoods(query, foods, limit)
  );
  const previousEntry = {
    id: "previous-saved-entry",
    name: "Earlier meal",
    loggedAt: "2026-09-01T12:00:00.000Z",
    calories: 200,
    protein: null,
    carbohydrates: 30,
    fat: 5,
    notes: "Keep my existing record",
  };
  localStorage.setItem(NUTRITION_ENTRIES_STORAGE_KEY, JSON.stringify([previousEntry]));
  const saveNutritionEntry = jest.fn((entry) => appendNutritionEntry(localStorage, entry, {
    createId: () => "third-batch-entry",
  }).status === NUTRITION_MUTATION_STATUS.SAVED);
  const saveUserFood = jest.fn();
  render(<NutritionPage
    onBack={jest.fn()}
    nutritionEntries={[previousEntry]}
    nutritionGoals={{ calories: 0, protein: 0, carbohydrates: 0, fat: 0 }}
    saveNutritionEntry={saveNutritionEntry}
    saveUserFood={saveUserFood}
    updateNutritionEntry={jest.fn()}
    deleteNutritionEntry={jest.fn()}
    saveNutritionGoals={jest.fn()}
    buttonStyle={{}}
    inputStyle={{}}
    containerStyle={{}}
  />);

  fireEvent.change(screen.getByLabelText("Food search"), { target: { value: "pagination bowl" } });
  const results = () => within(screen.getByLabelText("Food search results"));
  expect(results().getAllByRole("button")).toHaveLength(10);
  expect(results().queryByRole("button", { name: /Pagination Bowl 23/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show more" }));
  expect(results().getAllByRole("button")).toHaveLength(20);
  fireEvent.click(screen.getByRole("button", { name: "Show more" }));
  expect(results().getAllByRole("button")).toHaveLength(23);
  expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();

  fireEvent.click(results().getByRole("button", { name: /Pagination Bowl 23/ }));
  const form = within(screen.getByRole("heading", { name: "Add Nutrition Entry" }).closest("form"));
  expect(form.getByLabelText("Food / meal name")).toHaveValue("Pagination Bowl 23");
  expect(form.getByLabelText("Calories")).toHaveValue(125);
  expect(results().getAllByRole("button")).toHaveLength(23);

  const selectedServing = foods[22].servingOptions[1];
  fireEvent.change(screen.getByLabelText("Menu serving size"), { target: { value: selectedServing.id } });
  expect(screen.getByLabelText("Menu serving size")).toHaveDisplayValue("Large bowl");
  expect(form.getByLabelText("Calories")).toHaveValue(310);
  expect(form.getByLabelText("Fiber (g)")).toHaveValue(null);
  expect(results().getAllByRole("button")).toHaveLength(23);

  fireEvent.change(form.getByLabelText("Number of servings"), { target: { value: "1.5" } });
  fireEvent.change(form.getByLabelText("Notes (optional)"), { target: { value: "Selected from the last batch" } });
  fireEvent.click(screen.getByRole("button", { name: "Nutrition Goals" }));
  expect(results().getAllByRole("button")).toHaveLength(23);
  expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  expect(form.getByLabelText("Calories")).toHaveValue(465);
  fireEvent.click(form.getByRole("button", { name: "Save Entry" }));

  expect(saveNutritionEntry).toHaveBeenCalledTimes(1);
  expect(saveNutritionEntry).toHaveReturnedWith(true);
  const storedEntries = JSON.parse(localStorage.getItem(NUTRITION_ENTRIES_STORAGE_KEY));
  expect(storedEntries).toHaveLength(2);
  expect(storedEntries[0]).toEqual(previousEntry);
  expect(storedEntries[1]).toMatchObject({
    id: "third-batch-entry",
    name: "Pagination Bowl 23",
    calories: 465,
    protein: 24,
    carbohydrates: 63,
    fat: 14.625,
    fiber: null,
    sodium: 1313.25,
    totalSugar: 0,
    addedSugar: null,
    notes: "Selected from the last batch",
    portion: { amount: 1.5, unit: "serving", basis: selectedServing.serving },
    nutritionBasis: selectedServing.nutrients,
    foodReference: {
      source: "official-restaurant",
      sourceId: selectedServing.provenance.sourceId,
      restaurantId: "fixture-kitchen",
      modified: false,
    },
    nutritionCompleteness: { status: "partial", unknownNutrients: ["addedSugar"] },
  });
  expect(readNutritionEntries().entries).toHaveLength(2);
  expect(saveUserFood).not.toHaveBeenCalled();
  expect(JSON.stringify(foods)).toBe(originalFoods);
  expect(screen.getByLabelText("Food search")).toHaveValue("");
});
