import starterFoods from "../data/starterFoods";
import restaurantFoods from "../data/restaurantFoods";
import restaurantFoodFixtures from "../data/restaurantFoodFixtures";
import { normalizeRestaurantFood } from "./restaurantFoodModel";
import {
  DEFAULT_RESULT_LIMIT,
  normalizeFoodQuery,
  searchFoodCatalog,
  searchFoods,
} from "./foodSearch";

test("normalizes case and whitespace for name searches", () => {
  expect(normalizeFoodQuery("  CHICKEN   breast  ")).toBe("chicken breast");
  expect(normalizeFoodQuery("Braum’s / McDonald's")).toBe("braums mcdonalds");
  expect(normalizeFoodQuery("tacobell chickfila")).toBe("taco bell chick fil a");
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

test("normalizes restaurant foods with a distinct source type and verification metadata", () => {
  const food = normalizeRestaurantFood(restaurantFoods[0]);

  expect(food).toMatchObject({
    id: "restaurant:mcdonalds:chicken-mcnuggets",
    sourceType: "restaurant",
    restaurant: { id: "mcdonalds", name: "McDonald's" },
    provenance: {
      source: "official-restaurant",
      confidence: "official-source",
      completeness: "complete",
      verification: { sourceType: "official-restaurant-app", status: "complete" },
    },
  });
  expect(food.nutrients).toEqual({ calories: 170, protein: 9, carbohydrates: 10, fat: 10, sodium: 340 });
  expect(food.servingOptions.map((option) => option.serving.amount)).toEqual([4, 6, 10, 20, 40]);
  expect(food.servingOptions.slice(0, 3).map((option) => option.nutrients)).toEqual([
    { calories: 170, protein: 9, carbohydrates: 10, fat: 10, sodium: 340 },
    { calories: 250, protein: 14, carbohydrates: 15, fat: 15, sodium: 470 },
    { calories: 410, protein: 23, carbohydrates: 25, fat: 24, sodium: 750 },
  ]);
  expect(food.servingOptions.slice(0, 3).map((option) => option.provenance.verification)).toEqual([
    expect.objectContaining({ status: "complete", sourceType: "official-restaurant-app" }),
    expect.objectContaining({ status: "complete", sourceType: "trusted-third-party", sourceReference: expect.stringContaining("250-calorie") }),
    expect.objectContaining({ status: "complete", sourceType: "trusted-third-party", sourceReference: expect.stringContaining("410-calorie") }),
  ]);
  expect(normalizeRestaurantFood(restaurantFoods.find((item) => item.name === "Egg McMuffin"))).toMatchObject({
    nutrients: { calories: 310, protein: 17, carbohydrates: 30, fat: 13, sodium: 770 },
    provenance: { completeness: "complete", source: "trusted-third-party", verification: { status: "complete", sourceType: "trusted-third-party" } },
  });
  expect(normalizeRestaurantFood(restaurantFoods.find((item) => item.name === "Sausage McMuffin with Egg"))).toMatchObject({
    nutrients: { calories: 480, protein: 20, carbohydrates: 30, fat: 31, sodium: 830 },
    provenance: { completeness: "complete", source: "trusted-third-party", verification: { status: "complete", sourceType: "trusted-third-party" } },
  });
  [
    ["Big Mac", { calories: 580, protein: 25, carbohydrates: 45, fat: 34, sodium: 1060 }],
    ["Double Cheeseburger", { calories: 440, protein: 25, carbohydrates: 34, fat: 24, sodium: 1120 }],
    ["Quarter Pounder with Cheese", { calories: 520, protein: 30, carbohydrates: 42, fat: 26, sodium: 1140 }],
    ["Double Quarter Pounder with Cheese", { calories: 740, protein: 48, carbohydrates: 43, fat: 42, sodium: 1360 }],
    ["McChicken", { calories: 390, protein: 14, carbohydrates: 38, fat: 21, sodium: 560 }],
  ].forEach(([name, nutrients]) => {
    expect(normalizeRestaurantFood(restaurantFoods.find((item) => item.name === name))).toMatchObject({
      nutrients,
      provenance: { completeness: "complete", source: "official-restaurant", verification: { status: "complete", sourceType: "official-restaurant" } },
    });
  });
  expect(normalizeRestaurantFood(restaurantFoods.find((item) => item.name === "French Fries"))).toMatchObject({
    nutrients: { calories: 230, protein: 3, carbohydrates: 31, fat: 11, sodium: 190 },
    provenance: { completeness: "complete", verification: { status: "complete", sourceType: "official-restaurant" } },
  });
  expect(food.servingOptions[3]).toMatchObject({
    nutrients: { calories: 830, protein: 44, carbohydrates: 54, fat: 50, sodium: 1560 },
    provenance: { source: "trusted-third-party", confidence: "trusted-source", verification: { status: "complete", sourceType: "trusted-third-party" } },
  });
  [
    ["McDouble", 390, 22, 32, 20, 920],
    ["Cheeseburger", 300, 15, 32, 13, 720],
    ["Hamburger", 250, 12, 30, 9, 510],
    ["Hash Browns", 140, 2, 18, 8, 310],
    ["Sausage McMuffin", 400, 14, 29, 25, 760],
    ["Bacon, Egg & Cheese Biscuit", 460, 17, 39, 26, 1330],
    ["Sausage McGriddles", 430, 11, 41, 24, 990],
    ["Bacon, Egg & Cheese McGriddles", 430, 17, 44, 21, 1230],
    ["Sausage Biscuit with Egg", 530, 17, 38, 35, 1190],
    ["Hotcakes", 580, 9, 102, 15, 530],
    ["Hotcakes and Sausage", 770, 15, 102, 33, 810],
    ["Big Breakfast", 760, 26, 57, 48, 1530],
    ["Big Breakfast with Hotcakes", 1340, 36, 158, 63, 2070],
  ].forEach(([name, calories, protein, carbohydrates, fat, sodium]) => {
    const item = normalizeRestaurantFood(restaurantFoods.find((food) => food.name === name));
    expect(item).toMatchObject({
      nutrients: { calories, protein, carbohydrates, fat, sodium },
      provenance: { completeness: "complete", source: "trusted-third-party", verification: { status: "complete", sourceType: "trusted-third-party" } },
    });
  });
  expect(normalizeRestaurantFood(restaurantFoods.find((item) => item.name === "Sausage, Egg & Cheese McGriddles"))).toMatchObject({
    nutrients: { calories: 550, protein: 19, carbohydrates: 44, fat: 33, sodium: null },
    provenance: { completeness: "complete", verification: { status: "complete", sourceType: "trusted-third-party" } },
  });
  expect(normalizeRestaurantFood(restaurantFoods.find((item) => item.name === "Sausage and Cheese Biscuit"))).toMatchObject({
    nutrients: { calories: 510, protein: 13, carbohydrates: 38, fat: 34, sodium: 1300 },
    provenance: { completeness: "complete", source: "official-restaurant", verification: { status: "complete", sourceType: "official-restaurant" } },
  });
  expect(normalizeRestaurantFood(restaurantFoods.find((item) => item.name === "Coca-Cola"))).toMatchObject({
    nutrients: { calories: 270, protein: 0, carbohydrates: 70, fat: 0, sodium: 65 },
    provenance: { completeness: "complete", source: "trusted-third-party", verification: { status: "complete", sourceType: "trusted-third-party" } },
  });
  expect(restaurantFoods.find((item) => item.name === "Coca-Cola").servingOptions).toEqual(expect.arrayContaining([
    expect.objectContaining({ serving: expect.objectContaining({ description: "Small Coca-Cola" }), nutrients: { calories: 200, protein: 0, carbohydrates: 53, fat: 0, sodium: null } }),
    expect.objectContaining({ serving: expect.objectContaining({ description: "Medium Coca-Cola" }), nutrients: { calories: 270, protein: 0, carbohydrates: 70, fat: 0, sodium: 65 } }),
    expect.objectContaining({ serving: expect.objectContaining({ description: "Large Coca-Cola" }), nutrients: { calories: 380, protein: 0, carbohydrates: 100, fat: 0, sodium: 90 } }),
  ]));
  expect(food.servingOptions[4]).toMatchObject({
    nutrients: { calories: 1650, protein: 92, carbohydrates: 102, fat: 98, sodium: 3400 },
    provenance: { source: "trusted-third-party", confidence: "trusted-source", verification: { status: "complete", sourceType: "trusted-third-party" } },
  });
  expect(new Set(restaurantFoods.map(({ id }) => id)).size).toBe(restaurantFoods.length);
  expect(normalizeRestaurantFood({ ...restaurantFoods[0], id: restaurantFoods[1].id })).toBeTruthy();
  expect(normalizeRestaurantFood(restaurantFoodFixtures[0]).provenance.source).toBe("test-fixture");
});

test("zero remains zero and unavailable values remain unknown", () => {
  const food = normalizeRestaurantFood({ ...restaurantFoods[0], nutrients: { calories: 0, protein: null, carbohydrates: "", fat: undefined } });
  expect(food.nutrients).toEqual({ calories: 0, protein: null, carbohydrates: null, fat: null, sodium: null });
});

test("searches restaurant catalogs by chain and item while preserving saved-food results", () => {
  const userFood = {
    id: "user-added:chicken-sandwich",
    name: "Chicken Sandwich",
    serving: { amount: 1, unit: "serving", description: "1 serving" },
    nutrients: { calories: 500, protein: 30, carbohydrates: 40, fat: 20 },
    provenance: { source: "user-added", sourceId: "chicken-sandwich", confidence: "user-added" },
  };

  expect(searchFoodCatalog("McDonald's").every((food) => food.restaurant?.name === "McDonald's")).toBe(true);
  expect(searchFoodCatalog("McNuggets")[0]).toMatchObject({ restaurant: { name: "McDonald's" } });
  expect(searchFoodCatalog("Chicken Sandwich", [userFood]).some((food) => food.id === userFood.id)).toBe(true);
  expect(searchFoodCatalog("McNuggets").some((food) => food.provenance.source === "test-fixture")).toBe(false);
  const mcdonalds = searchFoodCatalog("McDonald's", [], 40).filter((food) => food.restaurant?.id === "mcdonalds");
  expect(mcdonalds.length).toBeGreaterThanOrEqual(20);
  expect(mcdonalds.map((food) => food.name)).toEqual(expect.arrayContaining([
    "Big Mac",
    "Hamburger",
    "French Fries",
    "Chicken McNuggets",
    "Egg McMuffin",
    "Hotcakes",
    "Coca-Cola",
  ]));
  expect(searchFoodCatalog("Hotcakes").some((food) => food.name === "Hotcakes" && food.restaurant?.name === "McDonald's" && food.provenance?.verification?.status === "complete")).toBe(true);
  expect(searchFoodCatalog("Coca-Cola")[0].servingOptions.map((option) => option.serving.description)).toEqual([
    "Small Coca-Cola",
    "Medium Coca-Cola",
    "Large Coca-Cola",
  ]);
});

test("restaurant food and menu-option IDs are collision-free", () => {
  const ids = restaurantFoods.flatMap((food) => [food.id, ...(food.servingOptions || []).map((option) => option.id)]);
  expect(new Set(ids).size).toBe(ids.length);
});

test("searches the Sonic and Braum's batches by chain and item name", () => {
  const sonicResults = searchFoodCatalog("Sonic Drive-In", [], 30);
  const braumsResults = searchFoodCatalog("Braum's", [], 30);

  expect(sonicResults).toHaveLength(12);
  expect(sonicResults.every((food) => food.restaurant?.id === "sonic")).toBe(true);
  expect(braumsResults).toHaveLength(10);
  expect(braumsResults.every((food) => food.restaurant?.id === "braums")).toBe(true);
  expect(searchFoodCatalog("Footlong Quarter Pound Coney")[0]).toMatchObject({ restaurant: { id: "sonic" } });
  expect(searchFoodCatalog("Grilled Chicken Salad")[0]).toMatchObject({ restaurant: { id: "braums" } });
});

test("searches the Taco Bell, Chick-fil-A, and Whataburger batches with punctuation variants", () => {
  expect(searchFoodCatalog("Taco Bell", [], 30)).toHaveLength(15);
  expect(searchFoodCatalog("Chick-fil-A", [], 30)).toHaveLength(14);
  expect(searchFoodCatalog("Whataburger", [], 30)).toHaveLength(15);

  expect(searchFoodCatalog("taco bell crunchwrap").map((food) => food.id)).toEqual(["restaurant:taco-bell:crunchwrap-supreme"]);
  expect(searchFoodCatalog("tacobell crunchy taco").map((food) => food.id)).toEqual(["restaurant:taco-bell:crunchy-taco"]);
  expect(searchFoodCatalog("chick fil a nuggets")[0].id).toBe("restaurant:chick-fil-a:nuggets");
  expect(searchFoodCatalog("chick fil a nuggets").map((food) => food.id)).toEqual(expect.arrayContaining([
    "restaurant:chick-fil-a:nuggets",
    "restaurant:chick-fil-a:grilled-nuggets",
  ]));
  expect(searchFoodCatalog("chickfila fries").map((food) => food.id)).toEqual(["restaurant:chick-fil-a:waffle-potato-fries"]);
  expect(searchFoodCatalog("chick-fil-a sauce").map((food) => food.id)).toContain("restaurant:chick-fil-a:chick-fil-a-sauce");
  expect(searchFoodCatalog("whataburger double").map((food) => food.id)).toContain("restaurant:whataburger:double-meat-whataburger");
  expect(searchFoodCatalog("whata chicken sandwich")[0].id).toBe("restaurant:whataburger:premium-whatachickn-sandwich");
});

test("preserves official metadata and exact published servings for the three new chains", () => {
  const sourceUrls = {
    "taco-bell": "https://www.tacobell.com/nutrition/info",
    "chick-fil-a": "https://www.chick-fil-a.com/nutrition-allergens",
    whataburger: "https://whataburger.com/menu",
  };

  Object.entries(sourceUrls).forEach(([restaurantId, sourceUrl]) => {
    restaurantFoods.filter((food) => food.restaurant.id === restaurantId).forEach((record) => {
      const food = normalizeRestaurantFood(record);
      expect(food.provenance).toMatchObject({
        source: "official-restaurant",
        confidence: "official-source",
        completeness: "complete",
        verification: { status: "complete", sourceType: "official-restaurant", sourceUrl, accessedAt: "2026-08-18" },
      });
      food.servingOptions?.forEach((option) => expect(option.provenance.verification).toMatchObject({ sourceUrl, accessedAt: "2026-08-18" }));
    });
  });

  expect(normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:taco-bell:crunchy-taco"))).toMatchObject({
    serving: { description: "1 taco" },
    nutrients: { calories: 170, protein: 7, carbohydrates: 13, fat: 9, sodium: 310 },
  });
  expect(restaurantFoods.find((food) => food.id === "restaurant:chick-fil-a:nuggets").servingOptions).toEqual(expect.arrayContaining([
    expect.objectContaining({ serving: { amount: 8, unit: "item", description: "8 count (113 g)" }, nutrients: { calories: 250, protein: 27, carbohydrates: 11, fat: 11, sodium: 1210 } }),
    expect.objectContaining({ serving: { amount: 12, unit: "item", description: "12 count (170 g)" }, nutrients: { calories: 380, protein: 40, carbohydrates: 16, fat: 17, sodium: 1820 } }),
  ]));
  expect(restaurantFoods.find((food) => food.id === "restaurant:whataburger:french-fries").servingOptions).toEqual(expect.arrayContaining([
    expect.objectContaining({ serving: { amount: 1, unit: "item", description: "Small French Fries" }, nutrients: { calories: 280, protein: 3, carbohydrates: 35, fat: 14, sodium: 170 } }),
    expect.objectContaining({ serving: { amount: 1, unit: "item", description: "Large French Fries" }, nutrients: { calories: 560, protein: 7, carbohydrates: 70, fat: 28, sodium: 350 } }),
  ]));
});

test("matches non-adjacent chain and item tokens in any searchable-field order", () => {
  expect(searchFoodCatalog("sonic groovy").map((food) => food.id)).toEqual([
    "restaurant:sonic:groovy-fries",
  ]);
  expect(searchFoodCatalog("sonic fries").map((food) => food.id)).toEqual([
    "restaurant:sonic:groovy-fries",
  ]);
  expect(searchFoodCatalog("braums fries").map((food) => food.id)).toEqual([
    "restaurant:braums:french-fries",
  ]);
  expect(searchFoodCatalog("mcdonalds nuggets").map((food) => food.id)).toEqual([
    "restaurant:mcdonalds:chicken-mcnuggets",
  ]);
  expect(searchFoodCatalog("sonic french")).toEqual([]);
});

test("keeps partial single-token results, ordering, and saved-food priority", () => {
  expect(searchFoodCatalog("frie").map((food) => food.id)).toEqual([
    "restaurant:braums:french-fries",
    "restaurant:chick-fil-a:waffle-potato-fries",
    "restaurant:mcdonalds:french-fries",
    "restaurant:sonic:groovy-fries",
    "restaurant:whataburger:french-fries",
  ]);
  expect(searchFoodCatalog("nugget").map((food) => food.id)).toContain("restaurant:mcdonalds:chicken-mcnuggets");
  expect(searchFoodCatalog("sonic").every((food) => food.restaurant?.id === "sonic")).toBe(true);

  const savedFries = {
    id: "user-added:fries",
    name: "Fries",
    serving: { amount: 1, unit: "serving", description: "1 serving" },
    nutrients: { calories: 300, protein: 4, carbohydrates: 40, fat: 14 },
    provenance: { source: "user-added", sourceId: "fries", confidence: "user-added" },
  };
  expect(searchFoodCatalog("fries", [savedFries])[0]).toBe(savedFries);
  expect(searchFoodCatalog("banana", [savedFries])[0].id).toBe("banana-medium");
});

test("preserves exact official Sonic and Braum's serving-option nutrition", () => {
  const sonicFries = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:sonic:groovy-fries"));
  expect(sonicFries.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients])).toEqual([
    ["Small Groovy Fries", { calories: 260, protein: 2, carbohydrates: 28, fat: 16, sodium: 570 }],
    ["Medium Groovy Fries", { calories: 370, protein: 3, carbohydrates: 39, fat: 22, sodium: 790 }],
    ["Large Groovy Fries", { calories: 520, protein: 4, carbohydrates: 56, fat: 31, sodium: 1110 }],
  ]);

  const braumsHashBrowns = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:braums:hash-browns"));
  expect(braumsHashBrowns.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients])).toEqual([
    ["Small (3 oz)", { calories: 330, protein: 2, carbohydrates: 24, fat: 25, sodium: 470 }],
    ["Large (5 oz)", { calories: 550, protein: 4, carbohydrates: 40, fat: 42, sodium: 790 }],
  ]);
  expect(braumsHashBrowns.provenance.verification).toMatchObject({
    accessedAt: "2026-08-18",
    sourceReference: expect.stringContaining("2018 Nutritional Chart"),
  });
});

test("every restaurant catalog record follows the normalized data contract", () => {
  const normalized = restaurantFoods.map(normalizeRestaurantFood);
  expect(normalized.every(Boolean)).toBe(true);

  normalized.forEach((food) => {
    expect(food.id).toBe(`restaurant:${food.restaurant.id}:${food.id.split(":").slice(2).join(":")}`);
    expect(food.serving.description).toBeTruthy();
    expect(food.provenance.sourceId).toBeTruthy();
    expect(food.provenance.verification.sourceUrl).toBeTruthy();
    [food, ...(food.servingOptions || [])].forEach((record) => {
      expect(Object.keys(record.nutrients).sort()).toEqual(["calories", "carbohydrates", "fat", "protein", "sodium"]);
      Object.values(record.nutrients).forEach((value) => expect(value === null || (typeof value === "number" && value >= 0)).toBe(true));
    });
  });
});
