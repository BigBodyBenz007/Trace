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

test("formats floating-point nutrient tails in serving search previews without changing source values", () => {
  const food = createUserFood(
    "Chicken serving preview",
    {
      calories: 360.59999999999997,
      protein: 76.55999999999999,
      carbohydrates: 5.999999999999993,
      fat: 6.569999999999999,
      fiber: 2.0000000000000004,
      sodium: 223.79999999999998,
    },
    { amount: 0.3, unit: "serving", description: "0.3 chicken serving" }
  );
  renderFoodSearch({ userFoods: [food] });
  searchFor("chicken serving preview");

  const result = screen.getByRole("button", { name: /Chicken serving preview/i });
  expect(result.querySelector('[data-nutrient="calories"]')).toHaveTextContent("Calories 360.6");
  expect(result.querySelector('[data-nutrient="protein"]')).toHaveTextContent("Protein 76.56 g");
  expect(result.querySelector('[data-nutrient="carbohydrates"]')).toHaveTextContent("Carbs 6 g");
  expect(result.querySelector('[data-nutrient="fat"]')).toHaveTextContent("Fat 6.57 g");
  expect(result.querySelector('[data-nutrient="fiber"]')).toHaveTextContent("Fiber 2 g");
  expect(result.querySelector('[data-nutrient="sodium"]')).toHaveTextContent("Sodium 223.8 mg");
  expect(food.nutrients.fat).toBe(6.569999999999999);
  expect(food.nutrients.sodium).toBe(223.79999999999998);
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
  result = screen.getByRole("button", { name: /^McDonald's \u00b7 Chicken McNuggets\b/i });
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

test("discovers and selects new chicken-chain foods with ordinary punctuation and flavor queries", () => {
  const onSelectFood = renderFoodSearch();

  searchFor("raising canes 4 fingers");
  let result = screen.getByRole("button", { name: /Raising Cane's.*Chicken Finger/i });
  expect(result).toHaveTextContent("Official restaurant source");
  expect(result).toHaveTextContent("1 chicken finger");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:raising-canes:chicken-finger",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:raising-canes:chicken-finger:4-piece" }),
    ]),
  }));

  searchFor("wingstop lemon pepper bone in");
  result = screen.getByRole("button", { name: /Wingstop.*Classic Bone-In Wings - Lemon Pepper/i });
  expect(result).toHaveTextContent("flavor already included");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:wingstop:classic-wings-lemon-pepper",
    nutrients: expect.objectContaining({ calories: 720, protein: 60, sodium: 1260 }),
  }));
});

test("discovers and selects Dairy Queen, Arby's, and Jack in the Box records", () => {
  const onSelectFood = renderFoodSearch();

  searchFor("dairy queen oreo blizzard");
  let result = screen.getByRole("button", { name: /Dairy Queen.*OREO Cookie Blizzard/i });
  expect(result).toHaveTextContent("Mini OREO Cookie Blizzard");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:dairy-queen:oreo-cookie-blizzard",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:dairy-queen:oreo-cookie-blizzard:large" }),
    ]),
  }));

  searchFor("arby's curly fries");
  result = screen.getByRole("button", { name: /Arby's.*Curly Fries/i });
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:arbys:curly-fries",
  }));

  searchFor("jackinthebox two tacos");
  result = screen.getByRole("button", { name: /Jack in the Box.*Regular Tacos/i });
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:jack-in-the-box:regular-tacos",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:jack-in-the-box:regular-tacos:2-piece" }),
    ]),
  }));
});

test("shows branded-drink source, package, caffeine, and unknown nutrient details", () => {
  const onSelectFood = renderFoodSearch();
  searchFor("monster ultra zero");

  const result = screen.getByRole("button", { name: /Monster Energy.*Ultra Zero/i });
  expect(within(result).getByText("Packaged drink")).toHaveClass("trace-badge");
  expect(within(result).getByText("Official manufacturer source")).toHaveClass("trace-badge");
  expect(result).toHaveTextContent("16 fl oz can");
  expect(result).toHaveTextContent("Caffeine 150 mg");
  expect(result.querySelector('[data-nutrient="protein"]')).toHaveTextContent("Protein Unknown");
  expect(result.querySelector('[data-nutrient="carbohydrates"]')).toHaveTextContent("Carbs Unknown");
  expect(result).toHaveTextContent("Nutrition values not published by the manufacturer remain unknown.");

  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenCalledWith(expect.objectContaining({
    id: "beverage:monster:ultra-zero-16oz",
    beverage: { packageSize: "16 fl oz can", caffeineMg: 150 },
  }));
});

test("shows the mobile-safe Premium Preview scanner action without changing search", () => {
  const onScanBarcode = jest.fn();
  renderFoodSearch({
    barcodeAccess: {
      available: true,
      label: "Premium Preview",
      message: "Available during beta.",
    },
    onScanBarcode,
  });

  const action = screen.getByRole("button", { name: "Scan Barcode" });
  expect(action.closest(".trace-food-search__scanner-action")).toBeInTheDocument();
  expect(screen.getByText("Premium Preview")).toBeInTheDocument();
  fireEvent.click(action);
  expect(onScanBarcode).toHaveBeenCalledTimes(1);

  searchFor("banana");
  expect(screen.getByRole("button", { name: /^Banana, raw/i })).toBeInTheDocument();
});

test("honors an unavailable feature-access decision", () => {
  renderFoodSearch({
    barcodeAccess: {
      available: false,
      label: "Premium",
      message: "Unavailable.",
    },
    onScanBarcode: jest.fn(),
  });
  expect(screen.getByRole("button", { name: "Scan Barcode" })).toBeDisabled();
});
