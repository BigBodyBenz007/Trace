import { fireEvent, render, screen, within } from "@testing-library/react";
import FoodSearch from "./FoodSearch";
import { createUserFood } from "../services/userFoodCatalog";

function renderFoodSearch(overrides = {}) {
  const onSelectFood = jest.fn();
  render(
    <FoodSearch
      inputStyle={{}}
      onSelectFood={onSelectFood}
      userFoods={[]}
      {...overrides}
    />
  );
  return onSelectFood;
}

function searchFor(query) {
  fireEvent.change(screen.getByLabelText("Food search"), { target: { value: query } });
}

test("renders content-driven compact cards with a six-nutrient summary", () => {
  renderFoodSearch();
  searchFor("raw chicken breast strips");

  const result = screen.getByRole("button", { name: /Chicken breast, boneless, skinless, raw/i });
  expect(result).toHaveClass("trace-food-result");
  expect(result).toHaveAttribute("data-layout", "compact");
  expect(result.style.height).toBe("");
  expect(result.style.minHeight).toBe("");
  expect(within(result).getByLabelText("Nutrition summary").children).toHaveLength(6);
  expect(within(result).getByText("Select")).toBeInTheDocument();
});

test("wraps long names inside the compact card without adding layout spacers", () => {
  const longName = "Extra-long family recipe chicken breast strips with roasted peppers and garlic";
  const userFood = createUserFood(
    longName,
    { calories: 210, protein: 30, carbohydrates: 8, fat: 7, fiber: 2, sodium: 410 },
    { amount: 1, unit: "serving", description: "1 prepared meal container" }
  );
  renderFoodSearch({ userFoods: [userFood] });
  searchFor("family recipe");

  const result = screen.getByRole("button", { name: new RegExp(longName, "i") });
  expect(within(result).getByText(longName)).toHaveClass("trace-food-result__name");
  expect(result.querySelector(".trace-food-result__content")).toBeInTheDocument();
  expect(result.querySelector("[style*='height']")).not.toBeInTheDocument();
});

test("shows Unknown for unavailable nutrients instead of treating them as zero", () => {
  renderFoodSearch();
  searchFor("raw chicken breast strips");

  const result = screen.getByRole("button", { name: /Chicken breast, boneless, skinless, raw/i });
  expect(result.querySelector('[data-nutrient="fiber"]')).toHaveTextContent("Fiber Unknown");
  expect(result.querySelector('[data-nutrient="carbohydrates"]')).toHaveTextContent("Carbs 0 g");
});

test("keeps raw and dried ingredient states separate and clearly labeled", () => {
  renderFoodSearch();
  searchFor("whole egg");

  const raw = screen.getByText("Egg, whole, raw").closest("button");
  const dried = screen.getByText("Egg, whole, dried").closest("button");

  expect(raw).not.toBe(dried);
  expect(within(raw).getByText("Prep: Raw")).toHaveAttribute("data-preparation-state", "raw");
  expect(within(dried).getByText("Prep: Dried")).toHaveAttribute("data-preparation-state", "dry");
});

test("does not render fried grocery eggs", () => {
  renderFoodSearch();
  searchFor("egg fried");

  expect(screen.queryByRole("button", { name: /Egg, whole, cooked, fried/i })).not.toBeInTheDocument();
  expect(screen.getByText(/No catalog foods found/i)).toBeInTheDocument();
});

test("preserves the USDA serving and nutrients without unsupported cooking-fat claims", () => {
  renderFoodSearch();
  searchFor("raw chicken breast strips");

  const result = screen.getByRole("button", { name: /Chicken breast, boneless, skinless, raw/i });
  expect(result).toHaveTextContent("4 oz raw (113 g)");
  expect(result.querySelector('[data-nutrient="calories"]')).toHaveTextContent("Calories 120.2");
  expect(result.querySelector('[data-nutrient="protein"]')).toHaveTextContent("Protein 25.52 g");
  expect(result.querySelector('[data-nutrient="fat"]')).toHaveTextContent("Fat 2.19 g");
  expect(result).not.toHaveTextContent(/includes? (oil|butter)|added fat|cooking adds/i);
});

test("keeps user-added cooking ingredients separate from the selected food macros", () => {
  const oil = createUserFood(
    "User cooking olive oil",
    { calories: 120, protein: 0, carbohydrates: 0, fat: 14, fiber: 0, sodium: 0 },
    { amount: 1, unit: "tbsp", description: "1 tablespoon" }
  );
  const onSelectFood = renderFoodSearch({ userFoods: [oil] });

  searchFor("raw chicken breast strips");
  fireEvent.click(screen.getByRole("button", { name: /Chicken breast, boneless, skinless, raw/i }));
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "grocery:usda:2646170",
    nutrients: expect.objectContaining({ calories: 120.2, fat: 2.19 }),
  }));

  searchFor("user cooking olive oil");
  fireEvent.click(screen.getByRole("button", { name: /User cooking olive oil/i }));
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: oil.id,
    nutrients: expect.objectContaining({ calories: 120, fat: 14 }),
  }));
  expect(onSelectFood.mock.calls[0][0].id).not.toBe(onSelectFood.mock.calls[1][0].id);
});

test("keeps USDA, restaurant, and user-entered source badges understandable", () => {
  const userFood = createUserFood(
    "Home freezer breakfast bowl",
    { calories: 320, protein: 24, carbohydrates: 31, fat: 12 },
    { amount: 1, unit: "serving", description: "1 bowl" }
  );
  renderFoodSearch({ userFoods: [userFood] });

  searchFor("raw chicken breast strips");
  let result = screen.getByRole("button", { name: /Chicken breast, boneless, skinless, raw/i });
  expect(within(result).getByText("USDA")).toHaveClass("trace-badge");
  expect(within(result).getByText("Grocery")).toHaveClass("trace-badge");

  searchFor("McNuggets");
  result = screen.getByRole("button", { name: /McDonald's.*Chicken McNuggets/i });
  expect(within(result).getByText("Restaurant")).toHaveClass("trace-badge");

  searchFor("freezer breakfast");
  result = screen.getByRole("button", { name: /Home freezer breakfast bowl/i });
  expect(within(result).getByText("User-entered")).toHaveClass("trace-badge");
  expect(within(result).getByText("Grocery")).toHaveClass("trace-badge");
});

test("keeps cards contained by the 390px layout contract", () => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  renderFoodSearch();
  searchFor("chicken breast");

  const results = screen.getByLabelText("Food search results");
  expect(results).toHaveClass("trace-food-search__results");
  screen.getAllByRole("button", { name: /Chicken breast/i }).forEach((result) => {
    expect(result).toHaveClass("trace-food-result");
    const nutrients = result.querySelector(".trace-food-result__nutrients");
    expect(nutrients).toHaveAttribute("data-compact-grid", "3x2");
    expect(nutrients).toHaveStyle({ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" });
    expect([...nutrients.children].map((nutrient) => nutrient.dataset.nutrient)).toEqual([
      "calories",
      "protein",
      "carbohydrates",
      "fat",
      "fiber",
      "sodium",
    ]);
    if (result.dataset.foodSource === "grocery") {
      expect(result.querySelector(".trace-food-result__preparation")).toHaveStyle({ maxWidth: "100%" });
    }
  });
});

test("preserves click selection and native keyboard button semantics", () => {
  const onSelectFood = renderFoodSearch();
  searchFor("raw chicken breast strips");

  const result = screen.getByRole("button", { name: /Chicken breast, boneless, skinless, raw/i });
  expect(result).toHaveAttribute("type", "button");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenCalledTimes(1);
  expect(onSelectFood).toHaveBeenCalledWith(expect.objectContaining({ id: "grocery:usda:2646170" }));
});
