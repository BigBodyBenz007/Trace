import starterFoods from "../data/starterFoods";
import {
  DEFAULT_RESULT_LIMIT,
  normalizeFoodQuery,
  searchFoodCatalog,
  searchFoods,
} from "./foodSearch";

test("normalizes case and whitespace for name searches", () => {
  expect(normalizeFoodQuery("  CHICKEN   breast  ")).toBe("chicken breast");
  expect(searchFoods("  cHiCkEn   ")[0].id).toBe(
    "chicken-breast-cooked-100g"
  );
});

test("returns no results for empty or meaningless input", () => {
  expect(searchFoods("")).toEqual([]);
  expect(searchFoods("    ")).toEqual([]);
  expect(searchFoods("---")).toEqual([]);
});

test("matches primarily by name and limits visible results", () => {
  const foods = Array.from({ length: 10 }, (_, index) => ({
    ...starterFoods[0],
    id: `banana-${index}`,
    name: `Banana ${index}`,
  }));

  expect(searchFoods("banana", foods)).toHaveLength(DEFAULT_RESULT_LIMIT);
  expect(searchFoods("banana", foods, 2)).toHaveLength(2);
  expect(searchFoods("118", starterFoods)).toEqual([]);
});

test("starter foods use the normalized source and confidence fields", () => {
  starterFoods.forEach((food) => {
    expect(food.provenance.source).toBe("trace-starter");
    expect(["verified", "community-verified", "user-added"]).toContain(
      food.provenance.confidence
    );
    expect(food.serving.description).toBeTruthy();
  });
});

test("combined catalog search includes user foods and keeps starter foods", () => {
  const userFood = {
    id: "user-added:meatloaf",
    name: "Meatloaf",
    serving: { amount: 1, unit: "serving", description: "1 serving" },
    nutrients: { calories: 350, protein: 22, carbohydrates: 18, fat: 20 },
    provenance: {
      source: "user-added",
      sourceId: "meatloaf",
      confidence: "user-added",
    },
  };

  expect(searchFoodCatalog("meatloaf", [userFood])).toEqual([userFood]);
  expect(searchFoodCatalog("banana", [userFood])[0].id).toBe("banana-medium");
});
