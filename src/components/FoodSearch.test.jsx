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

function paginationFoods(count = 23) {
  return Array.from({ length: count }, (_, index) => createUserFood(
    `Pagination fixture ${String(index + 1).padStart(2, "0")}`,
    { calories: 100 + index, protein: 8, carbohydrates: 10, fat: 4, sodium: 120 },
    { amount: 1, unit: "serving", description: "1 fixture serving" }
  ));
}

function foodResultButtons() {
  return within(screen.getByLabelText("Food search results")).getAllByRole("button");
}

test("reveals all ranked matches in batches of ten, including a final partial batch", () => {
  const foods = paginationFoods();
  const onSelectFood = renderFoodSearch({ userFoods: [...foods].reverse() });
  searchFor("pagination fixture");

  const visibleNames = () => foodResultButtons().map(
    (button) => button.querySelector(".trace-food-result__name").textContent
  );
  expect(visibleNames()).toEqual(foods.slice(0, 10).map((food) => food.name));
  const showMore = screen.getByRole("button", { name: "Show more" });
  expect(showMore).toHaveAttribute("type", "button");
  expect(showMore).toHaveClass("trace-food-search__show-more");
  showMore.focus();
  expect(showMore).toHaveFocus();

  fireEvent.click(showMore);
  expect(visibleNames()).toEqual(foods.slice(0, 20).map((food) => food.name));
  fireEvent.click(foodResultButtons()[16]);
  expect(onSelectFood).toHaveBeenLastCalledWith(foods[16]);
  expect(foodResultButtons()).toHaveLength(20);

  fireEvent.click(screen.getByRole("button", { name: "Show more" }));
  expect(visibleNames()).toEqual(foods.map((food) => food.name));
  expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  fireEvent.click(foodResultButtons()[22]);
  expect(onSelectFood).toHaveBeenLastCalledWith(foods[22]);
  expect(onSelectFood.mock.calls[1][0].nutrients.fiber).toBeNull();
  expect(onSelectFood.mock.calls[1][0].serving).toEqual(foods[22].serving);
});

test("resets the revealed count on query changes, even when the matching foods stay the same", () => {
  renderFoodSearch({ userFoods: paginationFoods() });
  searchFor("pagination fixture");
  fireEvent.click(screen.getByRole("button", { name: "Show more" }));
  expect(foodResultButtons()).toHaveLength(20);

  searchFor("pagination");
  expect(foodResultButtons()).toHaveLength(10);
  fireEvent.click(screen.getByRole("button", { name: "Show more" }));
  expect(foodResultButtons()).toHaveLength(20);

  searchFor("missingfixture");
  expect(screen.getByText(/No catalog foods found/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  searchFor("!!!");
  expect(screen.queryByLabelText("Food search results")).not.toBeInTheDocument();
  expect(screen.queryByText(/No catalog foods found/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();

  searchFor("pagination fixture");
  expect(foodResultButtons()).toHaveLength(10);
});

test("preserves expanded results through selection and equivalent saved-food parent renders", () => {
  const foods = paginationFoods();
  const onSelectFood = jest.fn();
  const { rerender } = render(<FoodSearch onSelectFood={onSelectFood} userFoods={foods} />);
  searchFor("pagination fixture");
  fireEvent.click(screen.getByRole("button", { name: "Show more" }));
  fireEvent.click(foodResultButtons()[16]);
  expect(onSelectFood).toHaveBeenCalledWith(foods[16]);

  rerender(
    <FoodSearch
      inputStyle={{ color: "white" }}
      onSelectFood={jest.fn()}
      userFoods={JSON.parse(JSON.stringify(foods))}
    />
  );
  expect(foodResultButtons()).toHaveLength(20);
  expect(screen.getByRole("button", { name: /Pagination fixture 17/i })).toBeInTheDocument();

  const unrelatedFood = createUserFood("Unrelated saved meal", { calories: 80 });
  rerender(<FoodSearch onSelectFood={onSelectFood} userFoods={[...foods, unrelatedFood]} />);
  expect(foodResultButtons()).toHaveLength(20);
});

test("resets expanded results when matching saved foods are added, removed, or edited", () => {
  const foods = paginationFoods();
  const onSelectFood = jest.fn();
  const { rerender } = render(<FoodSearch onSelectFood={onSelectFood} userFoods={foods} />);
  searchFor("pagination fixture");
  fireEvent.click(screen.getByRole("button", { name: "Show more" }));

  const expandedFoods = paginationFoods(24);
  rerender(<FoodSearch onSelectFood={onSelectFood} userFoods={expandedFoods} />);
  expect(foodResultButtons()).toHaveLength(10);
  fireEvent.click(screen.getByRole("button", { name: "Show more" }));

  rerender(<FoodSearch onSelectFood={onSelectFood} userFoods={foods} />);
  expect(foodResultButtons()).toHaveLength(10);
  fireEvent.click(screen.getByRole("button", { name: "Show more" }));

  const editedFoods = foods.map((food, index) => index === 0
    ? { ...food, nutrients: { ...food.nutrients, calories: 155 } }
    : food);
  rerender(<FoodSearch onSelectFood={onSelectFood} userFoods={editedFoods} />);
  expect(foodResultButtons()).toHaveLength(10);
  expect(foodResultButtons()[0]).toHaveTextContent("Calories 155");
});

test("hides Show more for ten or fewer results and resets after a completed selection", () => {
  const foods = paginationFoods();
  const onSelectFood = jest.fn();
  const { rerender } = render(<FoodSearch onSelectFood={onSelectFood} userFoods={foods} resetKey={0} />);
  expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  searchFor("pagination fixture");
  fireEvent.click(screen.getByRole("button", { name: "Show more" }));

  rerender(<FoodSearch onSelectFood={onSelectFood} userFoods={foods} resetKey={1} />);
  expect(screen.getByLabelText("Food search")).toHaveValue("");
  expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
  searchFor("pagination fixture");
  expect(foodResultButtons()).toHaveLength(10);

  rerender(<FoodSearch onSelectFood={onSelectFood} userFoods={foods.slice(0, 10)} resetKey={1} />);
  expect(foodResultButtons()).toHaveLength(10);
  expect(screen.queryByRole("button", { name: "Show more" })).not.toBeInTheDocument();
});

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

test("discovers and selects final-batch coffee, breakfast, bowl, and sub records", () => {
  const onSelectFood = renderFoodSearch();

  searchFor("starbucks hot caffe latte");
  let result = screen.getByRole("button", { name: /^Starbucks · Caffè Latte\b/i });
  expect(result).toHaveTextContent("Short 8 fl oz");
  expect(result).toHaveTextContent("Official restaurant source");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:starbucks:caffe-latte-hot",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:starbucks:caffe-latte-hot:grande-16-fl-oz" }),
    ]),
  }));

  searchFor("panera broccoli cheddar soup");
  result = screen.getByRole("button", { name: /Panera Bread.*Broccoli Cheddar Soup/i });
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:panera:broccoli-cheddar-soup",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:panera:broccoli-cheddar-soup:bowl" }),
    ]),
  }));

  searchFor("jersey mikes original italian");
  result = screen.getByRole("button", { name: /Jersey Mike's.*Original Italian/i });
  expect(result).toHaveTextContent(/Mini; official standard configuration/i);
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:jersey-mikes:the-original-italian",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:jersey-mikes:the-original-italian:bowl" }),
    ]),
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

test("discovers and selects pizza-chain records with ordinary brand spellings", () => {
  const onSelectFood = renderFoodSearch();

  searchFor("domino's ultimate pepperoni");
  let result = screen.getByRole("button", { name: /Domino's.*Ultimate Pepperoni/i });
  expect(result).toHaveTextContent("1 slice");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:dominos:ultimate-pepperoni",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:dominos:ultimate-pepperoni:large-hand-tossed:whole" }),
    ]),
  }));

  searchFor("pizzahut meat lovers pizza");
  result = screen.getByRole("button", { name: /Pizza Hut.*Meat Lover's Pizza/i });
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:pizza-hut:meat-lovers-pizza",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:pizza-hut:meat-lovers-pizza:medium-chicago-tavern:slice" }),
    ]),
  }));

  searchFor("papa johns philly cheesesteak papadia");
  result = screen.getByRole("button", { name: /Papa Johns.*Philly Cheesesteak Papadia/i });
  expect(result).toHaveTextContent("garlic dipping sauce included");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:papa-johns:philly-cheesesteak-papadia",
  }));
});

test("discovers and selects Little Caesars, Hideaway, and Marco's pizza records", () => {
  const onSelectFood = renderFoodSearch();

  searchFor("little caesars classic pepperoni");
  let result = screen.getByRole("button", { name: /Little Caesars.*Classic Pepperoni Pizza/i });
  expect(result).toHaveTextContent("1 slice");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:little-caesars:classic-pepperoni-pizza",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:little-caesars:classic-pepperoni-pizza:whole" }),
    ]),
  }));

  searchFor("hideaway pepperonipalooza");
  result = screen.getByRole("button", { name: /Hideaway Pizza.*Pepperonipalooza/i });
  expect(result).toHaveTextContent("10-inch Small hand-tossed");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:hideaway-pizza:pepperonipalooza",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:hideaway-pizza:pepperonipalooza:thin-large-16" }),
    ]),
  }));

  searchFor("marcos pepperoni magnifico");
  result = screen.getByRole("button", { name: /Marco's Pizza · Pepperoni Magnifico Pizza\s+Restaurant/i });
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:marcos-pizza:pepperoni-magnifico-pizza",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:marcos-pizza:pepperoni-magnifico-pizza:extra-large-original:whole" }),
    ]),
  }));
});

test("discovers and selects Chili's, Applebee's, and Texas Roadhouse records", () => {
  const onSelectFood = renderFoodSearch();

  searchFor("chilis classic sirloin");
  let result = screen.getByRole("button", { name: /Chili's.*Classic Sirloin/i });
  expect(result).toHaveTextContent("6 oz menu-listed Classic Sirloin");
  expect(result).toHaveTextContent("sides excluded");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:chilis:classic-sirloin",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:chilis:classic-sirloin:10oz" }),
    ]),
  }));

  searchFor("applebees riblets");
  result = screen.getByRole("button", { name: /Applebee's.*Riblets without Sauce/i });
  expect(result).toHaveTextContent("classic fries included");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:applebees:riblets",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:applebees:riblets:platter" }),
    ]),
  }));

  searchFor("texas roadhouse dallas filet");
  result = screen.getByRole("button", { name: /Texas Roadhouse.*Dallas Filet/i });
  expect(result).toHaveTextContent("6 oz menu-listed Dallas Filet");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:texas-roadhouse:dallas-filet",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:texas-roadhouse:dallas-filet:8oz" }),
    ]),
  }));
});

test("discovers and selects Olive Garden, LongHorn, and Outback records", () => {
  const onSelectFood = renderFoodSearch();

  searchFor("olive garden chicken parmigiana");
  let result = screen.getByRole("button", { name: /Olive Garden.*Chicken Parmigiana/i });
  expect(result).toHaveTextContent("Lunch or lighter portion");
  expect(result).toHaveTextContent("breadsticks excluded");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:olive-garden:chicken-parmigiana",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:olive-garden:chicken-parmigiana:dinner" }),
    ]),
  }));

  searchFor("long horn flos filet");
  result = screen.getByRole("button", { name: /LongHorn Steakhouse.*Flo's Filet/i });
  expect(result).toHaveTextContent("6 oz menu-listed filet");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:longhorn-steakhouse:flos-filet",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:longhorn-steakhouse:flos-filet:9oz" }),
    ]),
  }));

  searchFor("outback center cut sirloin");
  result = screen.getByRole("button", { name: /Outback Steakhouse.*Center-Cut Sirloin/i });
  expect(result).toHaveTextContent("5 oz menu-listed sirloin");
  expect(result).toHaveTextContent("sides excluded");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:outback-steakhouse:center-cut-sirloin",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:outback-steakhouse:center-cut-sirloin:12oz" }),
    ]),
  }));
});

test("discovers and selects Cheesecake Factory, Red Lobster, and Red Robin records", () => {
  const onSelectFood = renderFoodSearch();

  searchFor("cheesecake factory original cheesecake");
  let result = screen.getByRole("button", { name: /The Cheesecake Factory.*Original Cheesecake/i });
  expect(result).toHaveTextContent("1 restaurant slice");
  expect(result).toHaveTextContent("whole-cake nutrition is not published");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:cheesecake-factory:original-cheesecake",
  }));

  searchFor("red lobster lobster bisque");
  result = screen.getByRole("button", { name: /Red Lobster.*Lobster Bisque/i });
  expect(result).toHaveTextContent("1 cup of Lobster Bisque");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:red-lobster:lobster-bisque",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:red-lobster:lobster-bisque:bowl" }),
    ]),
  }));

  searchFor("red robin bottomless steak fries");
  result = screen.getByRole("button", { name: /Red Robin.*Bottomless Steak Fries/i });
  expect(result).toHaveTextContent("1 standard published serving");
  fireEvent.click(result);
  expect(onSelectFood).toHaveBeenLastCalledWith(expect.objectContaining({
    id: "restaurant:red-robin:bottomless-steak-fries",
    servingOptions: expect.arrayContaining([
      expect.objectContaining({ id: "restaurant:red-robin:bottomless-steak-fries:8oz" }),
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
