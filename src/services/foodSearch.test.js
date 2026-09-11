import starterFoods from "../data/starterFoods";
import restaurantFoods from "../data/restaurantFoods";
import restaurantFoodFixtures from "../data/restaurantFoodFixtures";
import { normalizeRestaurantFood } from "./restaurantFoodModel";
import { scaleNutrition } from "./nutritionCalculation";
import { createUserFood } from "./userFoodCatalog";
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
  expect(searchFoodCatalog("banana", [userFood])[0].id).toBe("grocery:usda:173944");
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
  const mcdonalds = searchFoodCatalog("McDonald's", [], restaurantFoods.length).filter((food) => food.restaurant?.id === "mcdonalds");
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
  expect(searchFoodCatalog("mcdonalds coca cola")[0].servingOptions.map((option) => option.serving.description)).toEqual([
    "Small Coca-Cola",
    "Medium Coca-Cola",
    "Large Coca-Cola",
  ]);
});

test("searches grocery foods by name, brand, and friendly category without changing restaurant results", () => {
  const groceryFood = createUserFood(
    "Raw chicken breast strips",
    { calories: 120, protein: 26 },
    { amount: 4, unit: "oz", description: "4 oz" },
    { brand: "Market Pantry", category: "protein" }
  );

  expect(searchFoodCatalog("raw chicken", [groceryFood])[0]).toBe(groceryFood);
  expect(searchFoodCatalog("market pantry", [groceryFood])[0]).toBe(groceryFood);
  expect(searchFoodCatalog("protein meat", [groceryFood])[0]).toBe(groceryFood);
  expect(searchFoodCatalog("McNuggets", [groceryFood])[0]).toMatchObject({
    sourceType: "restaurant",
    restaurant: { name: "McDonald's" },
  });
});

test("restaurant food and menu-option IDs are collision-free", () => {
  const ids = restaurantFoods.flatMap((food) => [food.id, ...(food.servingOptions || []).map((option) => option.id)]);
  expect(new Set(ids).size).toBe(ids.length);
});

test("searches the McDonald's, Sonic, and Braum's batches by chain and item name", () => {
  const mcdonaldsResults = searchFoodCatalog("McDonald's", [], 150);
  const sonicResults = searchFoodCatalog("Sonic Drive-In", [], 150);
  const braumsResults = searchFoodCatalog("Braum's", [], 150);

  expect(mcdonaldsResults).toHaveLength(125);
  expect(mcdonaldsResults.every((food) => food.restaurant?.id === "mcdonalds")).toBe(true);
  expect(sonicResults).toHaveLength(124);
  expect(sonicResults.every((food) => food.restaurant?.id === "sonic")).toBe(true);
  expect(braumsResults).toHaveLength(69);
  expect(braumsResults.every((food) => food.restaurant?.id === "braums")).toBe(true);
  expect(searchFoodCatalog("Footlong Quarter Pound Coney")[0]).toMatchObject({ restaurant: { id: "sonic" } });
  expect(searchFoodCatalog("braums Grilled Chicken Salad")[0]).toMatchObject({ restaurant: { id: "braums" } });
});

test("searches the Taco Bell, Chick-fil-A, and Whataburger batches with punctuation variants", () => {
  expect(searchFoodCatalog("Taco Bell", [], restaurantFoods.length)).toHaveLength(120);
  expect(searchFoodCatalog("Chick-fil-A", [], restaurantFoods.length)).toHaveLength(84);
  expect(searchFoodCatalog("Whataburger", [], restaurantFoods.length)).toHaveLength(127);

  expect(searchFoodCatalog("taco bell crunchwrap").map((food) => food.id)).toEqual(expect.arrayContaining([
    "restaurant:taco-bell:crunchwrap-supreme",
    "restaurant:taco-bell:black-bean-crunchwrap-supreme",
  ]));
  expect(searchFoodCatalog("tacobell crunchy taco").map((food) => food.id)).toEqual(expect.arrayContaining([
    "restaurant:taco-bell:crunchy-taco",
    "restaurant:taco-bell:crunchy-taco-supreme",
  ]));
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

test("preserves official metadata and exact published servings for the prior restaurant batch", () => {
  const sourceUrls = {
    "taco-bell": "https://www.tacobell.com/nutrition/info",
    "chick-fil-a": "https://www.chick-fil-a.com/nutrition-allergens",
    whataburger: "https://whataburger.com/menu",
  };

  Object.entries(sourceUrls).forEach(([restaurantId, sourceUrl]) => {
    restaurantFoods.filter((food) => (
      food.restaurant.id === restaurantId
      && food.provenance.verification.accessedAt === "2026-08-18"
    )).forEach((record) => {
      const food = normalizeRestaurantFood(record);
      expect(food.provenance).toMatchObject({
        source: "official-restaurant",
        confidence: "official-source",
        completeness: "complete",
        verification: { status: "complete", sourceType: "official-restaurant", sourceUrl, accessedAt: "2026-08-18" },
      });
      food.servingOptions
        ?.filter((option) => option.provenance.verification.accessedAt === "2026-08-18")
        .forEach((option) => expect(option.provenance.verification).toMatchObject({ sourceUrl, accessedAt: "2026-08-18" }));
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

test("keeps the bounded restaurant expansion valid, dated, and explicit about partial nutrition", () => {
  const expansion = restaurantFoods.filter((food) => food.provenance.verification.accessedAt === "2026-09-09");
  const countByChain = Object.fromEntries(["sonic", "braums", "taco-bell", "chick-fil-a", "whataburger"].map((chainId) => [
    chainId,
    expansion.filter((food) => food.restaurant.id === chainId).length,
  ]));

  expect(expansion).toHaveLength(40);
  expect(countByChain).toEqual({ sonic: 10, braums: 10, "taco-bell": 10, "chick-fil-a": 10, whataburger: 0 });

  expansion.forEach((record) => {
    const food = normalizeRestaurantFood(record);
    expect(food).not.toBeNull();
    expect(food.provenance.verification).toMatchObject({
      sourceType: "official-restaurant",
      accessedAt: "2026-09-09",
      sourceUrl: expect.stringMatching(/^https:\/\//),
      sourceReference: expect.any(String),
    });
    expect(food.serving.description).toBeTruthy();

    if (food.restaurant.id === "taco-bell") {
      expect(food.provenance).toMatchObject({ completeness: "partial", verification: { status: "partial" } });
      expect(food.nutrients).toMatchObject({
        calories: expect.any(Number),
        protein: null,
        carbohydrates: null,
        fat: null,
        sodium: null,
      });
    } else {
      expect(food.provenance).toMatchObject({ completeness: "complete", verification: { status: "complete" } });
      Object.values(food.nutrients).forEach((value) => expect(typeof value === "number" && value >= 0).toBe(true));
    }
  });
});

test("finds representative items from the bounded restaurant expansion", () => {
  expect(searchFoodCatalog("sonic original smasher")[0].id).toBe("restaurant:sonic:original-sonic-smasher-double");
  expect(searchFoodCatalog("braums jalapeno pepper jack")[0].id).toBe("restaurant:braums:jalapeno-pepper-jack-cheeseburger");
  expect(searchFoodCatalog("braums jalape\u00f1o pepper jack")[0].id).toBe("restaurant:braums:jalapeno-pepper-jack-cheeseburger");
  expect(searchFoodCatalog("taco bell spicy potato")[0].id).toBe("restaurant:taco-bell:spicy-potato-soft-taco");
  expect(searchFoodCatalog("chickfila cool wrap")[0].id).toBe("restaurant:chick-fil-a:cool-wrap");
});

test("scales complete and partial expansion servings without inventing unknown nutrients", () => {
  const grilledSandwich = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:chick-fil-a:grilled-chicken-sandwich"));
  const tacoSupreme = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:taco-bell:crunchy-taco-supreme"));

  expect(scaleNutrition(grilledSandwich.nutrients, 0.5)).toEqual({ calories: 195, protein: 14, carbohydrates: 22.5, fat: 5.5, sodium: 382.5 });
  expect(scaleNutrition(tacoSupreme.nutrients, 2)).toEqual({ calories: 380, protein: null, carbohydrates: null, fat: null, sodium: null });
});

test("keeps the current restaurant records valid, dated, and source-specific", () => {
  const expansion = restaurantFoods.filter((food) => food.provenance.verification.accessedAt === "2026-09-10");
  const sourcePatterns = {
    mcdonalds: /^https:\/\/www\.mcdonalds\.com\/us\/en-us\/product\//,
    sonic: /^https:\/\/assets\.ctfassets\.net\/whnlxz6bna9d\/.+\/August_2026_National_Nutritional_Brochure\.pdf$/,
    braums: /^https:\/\/www\.braums\.com\/wp-content\/uploads\/2022\/08\/2018-Nutritional-Chart-for-web\.pdf$/,
    wendys: /^https:\/\/(?:order\.wendys\.com\/us\/en\/national\/menu\/|www\.wendys\.com\/sauces-dressings$)/,
    "burger-king": /^https:\/\/origin\.bk\.com\/pdfs\/nutrition\.pdf$/,
    subway: /^https:\/\/media\.subway\.com\/dam\//,
    chipotle: /^https:\/\/www\.chipotle\.com\/content\/dam\/chipotle\/menu\/nutrition\//,
    popeyes: /^https:\/\/plk-use1-prod\.sites\.rbictg\.com\/nutrition\/PLK_Nutrition\.pdf$/,
    kfc: /^https:\/\/www\.kfc\.com\/full-nutrition-guide$/,
    "raising-canes": /^https:\/\/raisingcanes\.cdn\.prismic\.io\/raisingcanes\//,
    wingstop: /^https:\/\/www\.wingstop\.com\/nutrition$/,
    "dairy-queen": /^https:\/\/www\.dairyqueen\.com\/en-us\/nutrition\/food-treats\/$/,
    arbys: /^https:\/\/assets\.ctfassets\.net\/o19mhvm9a2cm\/.+\/Arbys_Nutritional_and_Allergen_FEB_2025\.pdf$/,
    "jack-in-the-box": /^https:\/\/assets\.ctfassets\.net\/5hs630wuugof\/.+\/Nutrition_Facts_2025\.PDF$/,
    dominos: /^https:\/\/www\.dominos\.com\/cms\/assets\/7d2e19df-e360-41eb-a367-5ab794ab2ebc$/,
    "pizza-hut": /^https:\/\/www\.nutritionix\.com\/pizza-hut\/menu\/premium$/,
    "papa-johns": /^https:\/\/www\.papajohns\.com\/company\/nutritional-details\//,
    "little-caesars": /^https:\/\/littlecaesars\.com\/static\/usnutritionguide\.pdf$/,
    "hideaway-pizza": /^https:\/\/www\.hideawaypizza\.com\/s\/Hideaway-Pizza-Nutrition-Information\.pdf$/,
    "marcos-pizza": /^https:\/\/www\.nutritionix\.com\/marcos-pizza\/menu\/premium$/,
    chilis: /^https:\/\/(?:(?:cdn\.builder\.io\/o\/assets)|(?:www\.chilis\.com\/menu))/,
    applebees: /^https:\/\/www\.nutritionix\.com\/applebees\/menu\/premium$/,
    "texas-roadhouse": /^https:\/\/www\.nutritionix\.com\/texas-roadhouse\/menu\/premium$/,
    "olive-garden": /^https:\/\/media\.olivegarden\.com\/en_us\/pdf\/olive_garden_nutrition\.pdf$/,
    "longhorn-steakhouse": /^https:\/\/media\.longhornsteakhouse\.com\/en_us\/pdf\/nutrition_allergen_guide\.pdf$/,
    "outback-steakhouse": /^https:\/\/edge\.sitecorecloud\.io\/osirestaurantpartners-piq24hos\/media\/Project\/BBI\/outback\/files\/obs-full-nutrition-information\.pdf$/,
    "taco-bell": /^https:\/\/www\.tacobell\.com\/food\//,
    "chick-fil-a": /^https:\/\/www\.chick-fil-a\.com\/nutrition-allergens$/,
    whataburger: /^https:\/\/wbimageserver\.whataburger\.com\/Nutrition\.pdf$/,
  };
  const countByChain = Object.fromEntries(["mcdonalds", "sonic", "braums", "wendys", "burger-king", "subway", "chipotle", "popeyes", "kfc", "raising-canes", "wingstop", "dairy-queen", "arbys", "jack-in-the-box", "dominos", "pizza-hut", "papa-johns", "little-caesars", "hideaway-pizza", "marcos-pizza", "chilis", "applebees", "texas-roadhouse", "olive-garden", "longhorn-steakhouse", "outback-steakhouse", "taco-bell", "chick-fil-a", "whataburger"].map((chainId) => [
    chainId,
    expansion.filter((food) => food.restaurant.id === chainId).length,
  ]));

  expect(expansion).toHaveLength(2412);
  expect(countByChain).toEqual({
    mcdonalds: 100,
    sonic: 102,
    braums: 49,
    wendys: 109,
    "burger-king": 88,
    subway: 193,
    chipotle: 54,
    popeyes: 61,
    kfc: 86,
    "raising-canes": 12,
    wingstop: 70,
    "dairy-queen": 91,
    arbys: 95,
    "jack-in-the-box": 92,
    dominos: 54,
    "pizza-hut": 59,
    "papa-johns": 59,
    "little-caesars": 47,
    "hideaway-pizza": 90,
    "marcos-pizza": 74,
    chilis: 59,
    applebees: 109,
    "texas-roadhouse": 112,
    "olive-garden": 96,
    "longhorn-steakhouse": 82,
    "outback-steakhouse": 102,
    "taco-bell": 95,
    "chick-fil-a": 60,
    whataburger: 112,
  });

  expansion.forEach((record) => {
    const food = normalizeRestaurantFood(record);
    expect(food).not.toBeNull();
    expect(food.provenance.verification).toMatchObject({
      sourceType: "official-restaurant",
      accessedAt: "2026-09-10",
      sourceUrl: expect.stringMatching(/^https:\/\//),
      sourceReference: expect.any(String),
    });
    expect(food.provenance.verification.sourceUrl).toMatch(sourcePatterns[food.restaurant.id]);
    expect(food.serving.description).toBeTruthy();

    if (food.provenance.verification.status === "partial") {
      expect(food.provenance.verification.status).toBe("partial");
      expect(["partial", "complete"]).toContain(food.provenance.completeness);
      expect(food.nutrients.calories).toEqual(expect.any(Number));
      Object.values(food.nutrients).forEach((value) => expect(value === null || (typeof value === "number" && value >= 0)).toBe(true));
    } else {
      expect(food.provenance).toMatchObject({ completeness: "complete", verification: { status: "complete" } });
      ["calories", "protein", "carbohydrates", "fat"].forEach((key) => (
        expect(typeof food.nutrients[key] === "number" && food.nutrients[key] >= 0).toBe(true)
      ));
      ["sodium", "fiber", "totalSugar", "addedSugar"].forEach((key) => (
        expect(food.nutrients[key] === null || food.nutrients[key] === undefined || (typeof food.nutrients[key] === "number" && food.nutrients[key] >= 0)).toBe(true)
      ));
    }
  });
});

test("finds representative items from every chain added in the next restaurant expansion", () => {
  expect(searchFoodCatalog("mcdonalds surf turf")[0].id).toBe("restaurant:mcdonalds:surf-and-turf");
  expect(searchFoodCatalog("mcdonalds ranch snack wrap")[0].id).toBe("restaurant:mcdonalds:ranch-snack-wrap");
  expect(searchFoodCatalog("wendys breakfast baconator")[0].id).toBe("restaurant:wendys:breakfast-baconator");
  expect(searchFoodCatalog("wendy's grilled chicken wrap")[0].id).toBe("restaurant:wendys:grilled-chicken-ranch-wrap");
  expect(searchFoodCatalog("burger king impossible whopper")[0].id).toBe("restaurant:burger-king:impossible-whopper");
  expect(searchFoodCatalog("subway steak philly")[0].id).toBe("restaurant:subway:steak-philly-6-inch");
  expect(searchFoodCatalog("subway bmt")[0].id).toBe("restaurant:subway:bmt-6-inch");
  expect(searchFoodCatalog("chipotle cilantro lime white rice")[0].id).toBe("restaurant:chipotle:cilantro-lime-white-rice-4oz");
});

test("finds Subway, Chipotle, and Popeyes items across the completed menu categories", () => {
  const expectedFirstResults = [
    ["subway footlong roast beef", "restaurant:subway:roast-beef-6-inch"],
    ["subway baja chicken protein pocket", "restaurant:subway:baja-chicken-protein-pocket"],
    ["subway spicy italian salad", "restaurant:subway:spicy-italian-salad"],
    ["subway meatball protein bowl", "restaurant:subway:meatball-marinara-protein-bowl"],
    ["subway bacon egg cheese breakfast", "restaurant:subway:bacon-egg-cheese-breakfast"],
    ["subway footlong chocolate chip cookie", "restaurant:subway:footlong-chocolate-chip-cookie"],
    ["subway jalapeno cheddar bread", "restaurant:subway:jalapeno-cheddar-bread"],
    ["subway jalape\u00f1o cheddar bread", "restaurant:subway:jalapeno-cheddar-bread"],
    ["chipotle pinto beans", "restaurant:chipotle:pinto-beans-4oz"],
    ["chipotle queso blanco", "restaurant:chipotle:queso-blanco"],
    ["chipotle tractor watermelon limeade", "restaurant:chipotle:tractor-watermelon-limeade"],
    ["chipotle chicken bowl white rice black beans salsa cheese", "restaurant:chipotle:calculated-chicken-bowl-white-rice-black-beans-salsa-cheese"],
    ["popeyes classic chicken sandwich", "restaurant:popeyes:classic-chicken-sandwich"],
    ["popeyes blackened tenders", "restaurant:popeyes:blackened-tenders"],
    ["popeyes ghost pepper wings", "restaurant:popeyes:ghost-pepper-bone-in-wings-6-piece"],
    ["popeyes cajun fries", "restaurant:popeyes:cajun-fries"],
    ["popeyes chicken biscuit", "restaurant:popeyes:chicken-biscuit"],
    ["popeyes kids classic leg", "restaurant:popeyes:kids-classic-leg"],
    ["popeyes frozen premium lemonade", "restaurant:popeyes:frozen-premium-lemonade"],
    ["popeyes blackened ranch sauce", "restaurant:popeyes:blackened-ranch-sauce"],
    ["popeyes jalapeno", "restaurant:popeyes:jalapeno"],
    ["popeyes jalape\u00f1o", "restaurant:popeyes:jalapeno"],
  ];

  expect(expectedFirstResults.map(([query]) => [query, searchFoodCatalog(query)[0]?.id]))
    .toEqual(expectedFirstResults);
  expect(searchFoodCatalog("popeyes pepsi")[0].id).toBe("restaurant:popeyes:pepsi");
  expect(searchFoodCatalog("pepsi")[0].id).toBe("beverage:pepsi:pepsi-20oz");
});

test("finds KFC, Raising Cane's, and Wingstop foods across the expanded menu categories", () => {
  const expectedFirstResults = [
    ["kfc original recipe breast", "restaurant:kfc:original-recipe-chicken-breast"],
    ["kentucky fried chicken grilled drumstick", "restaurant:kfc:kentucky-grilled-chicken-drumstick"],
    ["kfc 8 piece nuggets", "restaurant:kfc:kentucky-fried-nuggets"],
    ["kfc secret recipe fries", "restaurant:kfc:secret-recipe-fries"],
    ["kfc famous bowl", "restaurant:kfc:famous-bowl"],
    ["kfc honey mustard", "restaurant:kfc:honey-mustard-dipping-sauce"],
    ["kfc chocolate chip cake", "restaurant:kfc:chocolate-chip-cake-slice"],
    ["raising canes 4 fingers", "restaurant:raising-canes:chicken-finger"],
    ["raising cane's texas toast", "restaurant:raising-canes:texas-toast"],
    ["raising canes sauce", "restaurant:raising-canes:canes-sauce"],
    ["raising canes lemonade", "restaurant:raising-canes:lemonade"],
    ["wingstop 10 piece lemon pepper bone in wings", "restaurant:wingstop:classic-wings-lemon-pepper"],
    ["wingstop 8 piece mango habanero boneless wings", "restaurant:wingstop:boneless-wings-mango-habanero"],
    ["wingstop 5 piece louisiana rub tenders", "restaurant:wingstop:crispy-tenders-louisiana-rub"],
    ["wingstop garlic parmesan chicken sandwich", "restaurant:wingstop:chicken-sandwich-garlic-parmesan"],
    ["wingstop voodoo fries", "restaurant:wingstop:louisiana-voodoo-fries"],
    ["wingstop ranch dip", "restaurant:wingstop:ranch-dip"],
    ["wingstop brownie", "restaurant:wingstop:brownie"],
  ];

  expect(expectedFirstResults.map(([query]) => [query, searchFoodCatalog(query)[0]?.id]))
    .toEqual(expectedFirstResults);
  expect(searchFoodCatalog("kfc pepsi")[0].id).toBe("restaurant:kfc:pepsi");
  expect(searchFoodCatalog("wingstop dr pepper")[0].id).toBe("restaurant:wingstop:dr-pepper");
  expect(searchFoodCatalog("pepsi")[0].id).toBe("beverage:pepsi:pepsi-20oz");
});

test("preserves chicken-chain size and piece-count options with flavor-safe scaling", () => {
  const kfcNuggets = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:kfc:kentucky-fried-nuggets"));
  const kfcFries = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:kfc:secret-recipe-fries"));
  const canesFingers = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:raising-canes:chicken-finger"));
  const canesLemonade = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:raising-canes:lemonade"));
  const wingstopWings = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:wingstop:classic-wings-lemon-pepper"));
  const wingstopFries = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:wingstop:seasoned-fries"));

  expect(kfcNuggets.servingOptions.map(({ serving, nutrients }) => [serving.amount, nutrients.calories])).toEqual([
    [5, 175], [8, 280], [12, 420], [36, 1260],
  ]);
  expect(kfcFries.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Individual Secret Recipe Fries side", 320], ["Family Secret Recipe Fries side", 840],
  ]);
  expect(canesFingers.servingOptions.map(({ serving, nutrients }) => [serving.amount, nutrients.calories])).toEqual([
    [1, 130], [2, 260], [3, 390], [4, 520], [6, 780],
  ]);
  expect(canesLemonade.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["12 fl oz kids' serving", 160], ["22 fl oz regular serving", 290], ["32 fl oz large serving", 420], ["1 gallon jug", 1700],
  ]);
  expect(wingstopWings.servingOptions.map(({ serving, nutrients }) => [serving.amount, nutrients.calories])).toEqual([
    [6, 720], [8, 960], [10, 1200], [15, 1800], [20, 2400], [30, 3600],
  ]);
  expect(wingstopFries.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Regular seasoned fries", 500], ["Large seasoned fries", 900],
  ]);

  expect(scaleNutrition(wingstopWings.servingOptions[2].nutrients, 0.5)).toEqual({
    calories: 600,
    protein: 50,
    carbohydrates: 0,
    fat: 40,
    sodium: 1050,
    fiber: 0,
    totalSugar: 0,
    addedSugar: null,
  });
  expect(scaleNutrition(canesFingers.nutrients, 2).fiber).toBeNull();
  expect(wingstopWings.serving.description).toContain("flavor already included");
  [
    ...kfcNuggets.servingOptions,
    ...canesFingers.servingOptions,
    ...wingstopWings.servingOptions,
    ...wingstopFries.servingOptions,
  ].forEach((option) => expect(option.provenance.verification).toMatchObject({
    sourceType: "official-restaurant",
    accessedAt: "2026-09-10",
    sourceUrl: expect.stringMatching(/^https:\/\//),
    sourceReference: expect.any(String),
  }));
});

test("finds Dairy Queen, Arby's, and Jack in the Box foods across standard menu categories", () => {
  const expectedFirstResults = [
    ["dairy queen flamethrower burger", "restaurant:dairy-queen:flamethrower-burger"],
    ["dq 3 piece chicken strips", "restaurant:dairy-queen:chicken-strips"],
    ["dairy queen fries", "restaurant:dairy-queen:fries"],
    ["dairy queen oreo blizzard", "restaurant:dairy-queen:oreo-cookie-blizzard"],
    ["dairy queen chocolate dipped cone", "restaurant:dairy-queen:chocolate-dipped-cone"],
    ["dq vanilla malt", "restaurant:dairy-queen:vanilla-malt"],
    ["arbys classic roast beef", "restaurant:arbys:roast-beef"],
    ["arby's 5 piece chicken tenders", "restaurant:arbys:chicken-tenders"],
    ["arbys curly fries", "restaurant:arbys:curly-fries"],
    ["arby's jamocha shake", "restaurant:arbys:jamocha-shake"],
    ["arbys jalapeno bites", "restaurant:arbys:jalapeno-bites"],
    ["arby's jalapeño bites", "restaurant:arbys:jalapeno-bites"],
    ["jack in the box jumbo jack", "restaurant:jack-in-the-box:jumbo-jack"],
    ["jackinthebox spicy chicken", "restaurant:jack-in-the-box:jacks-spicy-chicken-sandwich"],
    ["jack in the box two tacos", "restaurant:jack-in-the-box:regular-tacos"],
    ["jack in the box breakfast jack", "restaurant:jack-in-the-box:breakfast-jack"],
    ["jack in the box curly fries", "restaurant:jack-in-the-box:seasoned-curly-fries"],
    ["jack in the box oreo shake", "restaurant:jack-in-the-box:oreo-cookie-shake"],
    ["jack in the box good good sauce", "restaurant:jack-in-the-box:jacks-good-good-dipping-cup"],
  ];

  expect(expectedFirstResults.map(([query]) => [query, searchFoodCatalog(query)[0]?.id]))
    .toEqual(expectedFirstResults);
  expect(searchFoodCatalog("dairy queen vanilla shake")[0].id).toBe("restaurant:dairy-queen:vanilla-shake");
  expect(searchFoodCatalog("dairy queen chocolate shake")[0].id).toBe("restaurant:dairy-queen:chocolate-shake");
  expect(searchFoodCatalog("arbys coke zero")[0].id).toBe("restaurant:arbys:coca-cola-zero-sugar");
  expect(searchFoodCatalog("coke zero")[0].id).toBe("beverage:coca-cola:zero-sugar-12oz");
});

test("finds Domino's, Pizza Hut, and Papa Johns foods across pizza and side categories", () => {
  expect(searchFoodCatalog("Domino's", [], restaurantFoods.length)).toHaveLength(54);
  expect(searchFoodCatalog("Pizza Hut", [], restaurantFoods.length)).toHaveLength(59);
  expect(searchFoodCatalog("Papa Johns", [], restaurantFoods.length)).toHaveLength(59);

  const expectedFirstResults = [
    ["dominos ultimate pepperoni", "restaurant:dominos:ultimate-pepperoni"],
    ["domino's bacon jalapeno stuffed cheesy bread", "restaurant:dominos:stuffed-cheesy-bread-bacon-jalapeno"],
    ["dominos chicken alfredo pasta", "restaurant:dominos:chicken-alfredo-pasta"],
    ["pizza hut meat lovers pizza", "restaurant:pizza-hut:meat-lovers-pizza"],
    ["pizzahut breadsticks", "restaurant:pizza-hut:breadsticks"],
    ["pizza hut garlic parmesan wings", "restaurant:pizza-hut:garlic-parmesan-wings"],
    ["papa johns pepperoni pizza", "restaurant:papa-johns:pepperoni-pizza"],
    ["papa john's philly cheesesteak papadia", "restaurant:papa-johns:philly-cheesesteak-papadia"],
    ["papajohns garlic knots", "restaurant:papa-johns:garlic-knots"],
  ];
  expect(expectedFirstResults.map(([query]) => [query, searchFoodCatalog(query)[0]?.id])).toEqual(expectedFirstResults);

  expect(searchFoodCatalog("pepsi")[0].id).toBe("beverage:pepsi:pepsi-20oz");
  expect(searchFoodCatalog("pizza hut pepsi")[0].id).toBe("restaurant:pizza-hut:pepsi");
});

test("keeps pizza slice, square-cut, and whole-pizza servings explicit and independently scalable", () => {
  const dominosCheese = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:dominos:cheese-pizza"));
  const pizzaHutCheese = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:pizza-hut:cheese-pizza"));
  const papaJohnsPepperoni = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:papa-johns:pepperoni-pizza"));

  const dominosSlice = dominosCheese.servingOptions.find((option) => option.id.endsWith("medium-thin:slice"));
  const dominosWhole = dominosCheese.servingOptions.find((option) => option.id.endsWith("medium-thin:whole"));
  expect(dominosSlice).toMatchObject({
    serving: { amount: 1, description: expect.stringContaining("1 slice — 12\" Medium Crunchy Thin Cheese (4 slices per pizza; calculated configuration)") },
    nutrients: { calories: 315, protein: 13, carbohydrates: 26, fat: 17, sodium: 630, fiber: 2, totalSugar: 2, addedSugar: 1 },
  });
  expect(dominosWhole).toMatchObject({
    serving: { amount: 1, description: expect.stringContaining("Whole 12\" Medium Crunchy Thin Cheese pizza (4 slices") },
    nutrients: { calories: 1260, protein: 52, carbohydrates: 104, fat: 68, sodium: 2520, fiber: 8, totalSugar: 8, addedSugar: 4 },
  });
  expect(scaleNutrition(dominosSlice.nutrients, 2).calories).toBe(630);

  const tavernSlice = pizzaHutCheese.servingOptions.find((option) => option.id.endsWith("medium-chicago-tavern:slice"));
  const tavernWhole = pizzaHutCheese.servingOptions.find((option) => option.id.endsWith("medium-chicago-tavern:whole"));
  expect(tavernSlice.serving.description).toContain("square-cut");
  expect(tavernSlice.serving.description).toContain("16 slices per pizza");
  expect(tavernWhole.nutrients).toMatchObject({ calories: 1280, protein: 64, carbohydrates: 128, fat: 56, sodium: 3200, fiber: null });
  expect(scaleNutrition(tavernSlice.nutrients, 2)).toMatchObject({ calories: 160, fiber: null });

  const papaSmallSlice = papaJohnsPepperoni.servingOptions.find((option) => option.id.endsWith("small-original:slice"));
  const papaSmallWhole = papaJohnsPepperoni.servingOptions.find((option) => option.id.endsWith("small-original:whole"));
  expect(papaSmallSlice.serving.description).toContain("6 slices per pizza");
  expect(papaSmallWhole.nutrients).toMatchObject({ calories: 1260, protein: 48, carbohydrates: 150, fat: 48, sodium: 3180 });

  [dominosSlice, dominosWhole, tavernSlice, tavernWhole, papaSmallSlice, papaSmallWhole].forEach((option) => {
    expect(option.provenance.verification).toMatchObject({
      sourceType: "official-restaurant",
      accessedAt: "2026-09-10",
      sourceUrl: expect.stringMatching(/^https:\/\//),
      sourceReference: expect.any(String),
    });
  });
});

test("finds Little Caesars, Hideaway Pizza, and Marco's foods across standard menu categories", () => {
  expect(searchFoodCatalog("Little Caesars", [], restaurantFoods.length)).toHaveLength(47);
  expect(searchFoodCatalog("Hideaway Pizza", [], restaurantFoods.length)).toHaveLength(90);
  expect(searchFoodCatalog("Marco's Pizza", [], restaurantFoods.length)).toHaveLength(74);

  const expectedFirstResults = [
    ["little caesars classic pepperoni", "restaurant:little-caesars:classic-pepperoni-pizza"],
    ["little caesars detroit deep dish cheese", "restaurant:little-caesars:detroit-style-deep-dish-cheese-pizza"],
    ["little caesars crazy bread", "restaurant:little-caesars:crazy-bread"],
    ["little caesars garlic parmesan wings", "restaurant:little-caesars:garlic-parmesan-caesar-wings"],
    ["hideaway cheese pizza", "restaurant:hideaway-pizza:cheese-pizza"],
    ["hideaway pepperonipalooza", "restaurant:hideaway-pizza:pepperonipalooza"],
    ["hideaway fried mushrooms", "restaurant:hideaway-pizza:fried-mushrooms"],
    ["hideaway meatball hero", "restaurant:hideaway-pizza:meatball-hero"],
    ["hideaway lemonade pie", "restaurant:hideaway-pizza:lemonade-pie"],
    ["marcos pepperoni magnifico", "restaurant:marcos-pizza:pepperoni-magnifico-pizza"],
    ["marco's deluxe pizza bowl", "restaurant:marcos-pizza:deluxe-pizza-bowl"],
    ["marcos cheezybread", "restaurant:marcos-pizza:cheezybread"],
    ["marcos garlic parmesan wings", "restaurant:marcos-pizza:garlic-parmesan-wings"],
    ["marcos jalapeno ranch", "restaurant:marcos-pizza:jalapeno-ranch-dip"],
    ["marcos jalapeño ranch", "restaurant:marcos-pizza:jalapeno-ranch-dip"],
  ];

  expect(expectedFirstResults.map(([query]) => [query, searchFoodCatalog(query)[0]?.id])).toEqual(expectedFirstResults);
  expect(searchFoodCatalog("hideaway pepsi")[0].id).toBe("restaurant:hideaway-pizza:pepsi");
  expect(searchFoodCatalog("marcos pepsi")[0].id).toBe("restaurant:marcos-pizza:pepsi");
  expect(searchFoodCatalog("pepsi")[0].id).toBe("beverage:pepsi:pepsi-20oz");
});

test("keeps new pizza slice, whole-pizza, size, and unknown-nutrient servings explicit", () => {
  const littleCaesarsPepperoni = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:little-caesars:classic-pepperoni-pizza"));
  const hideawayPepperoni = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:hideaway-pizza:pepperoni-pizza"));
  const marcosCheese = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:marcos-pizza:cheese-pizza"));

  const littleSlice = littleCaesarsPepperoni.servingOptions.find((option) => option.id.endsWith(":slice"));
  const littleWhole = littleCaesarsPepperoni.servingOptions.find((option) => option.id.endsWith(":whole"));
  expect(littleSlice.serving.description).toContain("8 slices per pizza");
  expect(littleSlice.nutrients.calories).toBe(287.5);
  expect(scaleNutrition(littleSlice.nutrients, 2).calories).toBe(575);
  expect(littleWhole.nutrients).toMatchObject({ calories: 2300, protein: 109, carbohydrates: 250, fat: 97, sodium: 5050 });

  const hideawayThinMedium = hideawayPepperoni.servingOptions.find((option) => option.id.endsWith("thin-medium-13"));
  expect(hideawayThinMedium).toMatchObject({
    serving: { amount: 1, description: expect.stringContaining("13-inch Medium thin-crust") },
    nutrients: { calories: 265, protein: 9, carbohydrates: 25, fat: 13.5, sodium: 575, fiber: null, totalSugar: null },
  });
  expect(scaleNutrition(hideawayThinMedium.nutrients, 0.5).fiber).toBeNull();

  const marcosSmallSlice = marcosCheese.servingOptions.find((option) => option.id.endsWith("small-original:slice"));
  const marcosSmallWhole = marcosCheese.servingOptions.find((option) => option.id.endsWith("small-original:whole"));
  expect(marcosSmallSlice.serving.description).toContain("6 slices per pizza");
  expect(marcosSmallWhole.nutrients).toMatchObject({ calories: 1260, protein: 48, carbohydrates: 144, fat: 48, sodium: 2520, fiber: null });
  expect(scaleNutrition(marcosSmallSlice.nutrients, 2)).toMatchObject({ calories: 420, fiber: null });

  [littleSlice, littleWhole, hideawayThinMedium, marcosSmallSlice, marcosSmallWhole].forEach((option) => expect(option.provenance.verification).toMatchObject({
    sourceType: "official-restaurant",
    accessedAt: "2026-09-10",
    sourceUrl: expect.stringMatching(/^https:\/\//),
    sourceReference: expect.any(String),
  }));
});

test("finds Chili's, Applebee's, and Texas Roadhouse foods across standard menu categories", () => {
  expect(searchFoodCatalog("Chili's", [], restaurantFoods.length)).toHaveLength(59);
  expect(searchFoodCatalog("Applebees", [], restaurantFoods.length)).toHaveLength(109);
  expect(searchFoodCatalog("Texas Roadhouse", [], restaurantFoods.length)).toHaveLength(112);

  const expectedFirstResults = [
    ["chilis southwestern eggrolls", "restaurant:chilis:southwestern-eggrolls"],
    ["chili's classic sirloin 10 oz", "restaurant:chilis:classic-sirloin"],
    ["chilis lemon pepper bone in wings", "restaurant:chilis:lemon-pepper-bone-in-wings"],
    ["chilis chicken bacon ranch quesadilla", "restaurant:chilis:chicken-bacon-ranch-quesadillas"],
    ["chilis molten chocolate cake", "restaurant:chilis:molten-chocolate-cake"],
    ["applebees spinach artichoke dip", "restaurant:applebees:spinach-artichoke-dip"],
    ["applebee's top sirloin 8 oz", "restaurant:applebees:top-sirloin"],
    ["applebees bourbon street chicken shrimp", "restaurant:applebees:bourbon-street-chicken-shrimp"],
    ["applebees four cheese mac honey pepper chicken", "restaurant:applebees:four-cheese-mac-honey-pepper-chicken"],
    ["applebees kids corn dog", "restaurant:applebees:kids-corn-dog"],
    ["texas roadhouse cactus blossom", "restaurant:texas-roadhouse:cactus-blossom"],
    ["texas roadhouse dallas filet 8 oz", "restaurant:texas-roadhouse:dallas-filet"],
    ["texas roadhouse fall off the bone ribs half slab", "restaurant:texas-roadhouse:fall-off-the-bone-ribs"],
    ["texas roadhouse herb crusted chicken", "restaurant:texas-roadhouse:herb-crusted-chicken"],
    ["texas roadhouse steak fries", "restaurant:texas-roadhouse:steak-fries"],
    ["texas roadhouse strawberry cheesecake", "restaurant:texas-roadhouse:strawberry-cheesecake"],
  ];

  expect(expectedFirstResults.map(([query]) => [query, searchFoodCatalog(query)[0]?.id])).toEqual(expectedFirstResults);
  expect(searchFoodCatalog("applebees coke zero")[0].id).toBe("restaurant:applebees:coke-zero");
  expect(searchFoodCatalog("texas roadhouse dr pepper")[0].id).toBe("restaurant:texas-roadhouse:dr-pepper");
  expect(searchFoodCatalog("coke zero")[0].id).toBe("beverage:coca-cola:zero-sugar-12oz");
});

test("preserves sit-down portions, included components, and unknown nutrients while scaling", () => {
  const chilisSirloin = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:chilis:classic-sirloin"));
  const chilisPartialDrink = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:chilis:blackberry-iced-tea"));
  const applebeesRiblets = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:applebees:riblets"));
  const texasSirloin = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:texas-roadhouse:usda-choice-sirloin"));
  const cactusBlossom = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:texas-roadhouse:cactus-blossom"));

  expect(chilisSirloin.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["6 oz menu-listed Classic Sirloin; sides excluded", 250],
    ["10 oz menu-listed Classic Sirloin; sides excluded", 390],
  ]);
  expect(applebeesRiblets.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Riblets Plate without sauce, with classic fries included", 940],
    ["Riblets Platter without sauce, with classic fries and coleslaw included", 1400],
  ]);
  expect(texasSirloin.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["6 oz menu-listed sirloin; sides excluded", 250],
    ["8 oz menu-listed sirloin; sides excluded", 340],
    ["11 oz menu-listed sirloin; sides excluded", 460],
    ["16 oz menu-listed sirloin; sides excluded", 670],
  ]);
  expect(scaleNutrition(cactusBlossom.nutrients, 0.5)).toMatchObject({
    calories: 1125,
    protein: 12.5,
    carbohydrates: 118,
    fat: 67.5,
    sodium: 2500,
  });
  expect(scaleNutrition(chilisPartialDrink.nutrients, 2)).toEqual({
    calories: 160,
    protein: null,
    carbohydrates: null,
    fat: null,
    sodium: null,
    fiber: null,
    totalSugar: null,
    addedSugar: null,
  });
  expect(applebeesRiblets.serving.description).toContain("classic fries included");
  expect(cactusBlossom.serving.description).toContain("entire appetizer order");

  [
    ...chilisSirloin.servingOptions,
    ...applebeesRiblets.servingOptions,
    ...texasSirloin.servingOptions,
  ].forEach((option) => expect(option.provenance.verification).toMatchObject({
    sourceType: "official-restaurant",
    accessedAt: "2026-09-10",
    sourceUrl: expect.stringMatching(/^https:\/\//),
    sourceReference: expect.any(String),
  }));
});

test("finds Olive Garden, LongHorn, and Outback foods across standard menu categories", () => {
  expect(searchFoodCatalog("Olive Garden", [], restaurantFoods.length)).toHaveLength(96);
  expect(searchFoodCatalog("LongHorn Steakhouse", [], restaurantFoods.length)).toHaveLength(82);
  expect(searchFoodCatalog("Outback Steakhouse", [], restaurantFoods.length)).toHaveLength(102);

  const expectedFirstResults = [
    ["olive garden calamari", "restaurant:olive-garden:calamari"],
    ["olive garden chicken parmigiana dinner", "restaurant:olive-garden:chicken-parmigiana"],
    ["olive garden pasta fagioli", "restaurant:olive-garden:pasta-fagioli-soup"],
    ["olive garden black tie mousse cake", "restaurant:olive-garden:black-tie-mousse-cake"],
    ["longhorn texas tonion", "restaurant:longhorn-steakhouse:texas-tonion"],
    ["long horn flos filet 9 oz", "restaurant:longhorn-steakhouse:flos-filet"],
    ["longhorn seasoned french fries", "restaurant:longhorn-steakhouse:seasoned-french-fries"],
    ["longhorn molten lava cake", "restaurant:longhorn-steakhouse:molten-lava-cake"],
    ["outback bloomin onion", "restaurant:outback-steakhouse:bloomin-onion"],
    ["outback center cut sirloin 8 oz", "restaurant:outback-steakhouse:center-cut-sirloin"],
    ["outback alice springs chicken", "restaurant:outback-steakhouse:alice-springs-chicken"],
    ["outback kids mac a roo cheese", "restaurant:outback-steakhouse:kids-mac-cheese"],
  ];

  expect(expectedFirstResults.map(([query]) => [query, searchFoodCatalog(query)[0]?.id])).toEqual(expectedFirstResults);
  expect(searchFoodCatalog("olive garden coke zero")[0].id).toBe("restaurant:olive-garden:coke-zero");
  expect(searchFoodCatalog("longhorn dr. pepper")[0].id).toBe("restaurant:longhorn-steakhouse:dr-pepper");
  expect(searchFoodCatalog("outback coke zero")[0].id).toBe("restaurant:outback-steakhouse:coke-zero");
  expect(searchFoodCatalog("coke zero")[0].id).toBe("beverage:coca-cola:zero-sugar-12oz");
});

test("preserves restaurant portions, excluded components, fractional sharing, and unknown nutrients", () => {
  const chickenParm = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:olive-garden:chicken-parmigiana"));
  const longHornFilet = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:longhorn-steakhouse:flos-filet"));
  const outbackSirloin = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:outback-steakhouse:center-cut-sirloin"));
  const bloominOnion = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:outback-steakhouse:bloomin-onion"));
  const longHornRanch = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:longhorn-steakhouse:ranch-dressing"));

  expect(chickenParm.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Lunch or lighter portion; soup, salad, and breadsticks excluded", 630],
    ["Dinner portion; soup, salad, and breadsticks excluded", 1020],
  ]);
  expect(longHornFilet.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["6 oz menu-listed filet; sides excluded", 330],
    ["9 oz menu-listed filet; sides excluded", 450],
  ]);
  expect(outbackSirloin.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["5 oz menu-listed sirloin; sides excluded", 260],
    ["6 oz menu-listed sirloin; sides excluded", 330],
    ["8 oz menu-listed sirloin; sides excluded", 400],
    ["9 oz menu-listed sirloin; sides excluded", 420],
    ["12 oz menu-listed sirloin; sides excluded", 500],
  ]);
  expect(scaleNutrition(bloominOnion.nutrients, 0.25)).toMatchObject({
    calories: 480,
    protein: 4.25,
    carbohydrates: 32.75,
    fat: 38,
    sodium: 1217.5,
  });
  expect(scaleNutrition(longHornRanch.servingOptions[0].nutrients, 2).protein).toBeNull();

  [...chickenParm.servingOptions, ...longHornFilet.servingOptions, ...outbackSirloin.servingOptions].forEach((option) => expect(option.provenance.verification).toMatchObject({
    sourceType: "official-restaurant",
    accessedAt: "2026-09-10",
    sourceUrl: expect.stringMatching(/^https:\/\//),
    sourceReference: expect.any(String),
  }));
});

test("preserves published sizes and unknown nutrients across the three-chain expansion", () => {
  const dqOreo = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:dairy-queen:oreo-cookie-blizzard"));
  const dqVanillaMalt = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:dairy-queen:vanilla-malt"));
  const arbysCurlyFries = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:arbys:curly-fries"));
  const arbysTea = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:arbys:brewed-iced-tea"));
  const jackNuggets = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:jack-in-the-box:chicken-nuggets"));
  const jackFries = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:jack-in-the-box:french-fries"));

  expect(dqOreo.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Mini OREO Cookie Blizzard", 330],
    ["Small OREO Cookie Blizzard", 600],
    ["Medium OREO Cookie Blizzard", 820],
    ["Large OREO Cookie Blizzard", 1050],
  ]);
  expect(dqVanillaMalt.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    [expect.stringContaining("Small Vanilla Malt; calculated"), 580],
    [expect.stringContaining("Medium Vanilla Malt; calculated"), 740],
    [expect.stringContaining("Large Vanilla Malt; calculated"), 970],
  ]);
  expect(arbysCurlyFries.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Small Curly Fries", 250], ["Medium Curly Fries", 410], ["Large Curly Fries", 550],
  ]);
  expect(jackNuggets.servingOptions.map(({ serving, nutrients }) => [serving.amount, nutrients.calories])).toEqual([
    [4, 190], [8, 380],
  ]);
  expect(jackFries.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Kids' French Fries", 220], ["Small French Fries", 300], ["Medium French Fries", 430], ["Large French Fries", 550],
  ]);
  expect(scaleNutrition(dqOreo.servingOptions[1].nutrients, 0.5)).toEqual({
    calories: 300,
    protein: 6.5,
    carbohydrates: 44.5,
    fat: 11,
    sodium: 140,
    fiber: 0.5,
    totalSugar: 35,
    addedSugar: null,
  });
  expect(scaleNutrition(arbysTea.nutrients, 2).sodium).toBeNull();
  [dqOreo, dqVanillaMalt, arbysCurlyFries, arbysTea, jackNuggets, jackFries].forEach((food) => {
    expect(food.provenance.verification).toMatchObject({
      sourceType: "official-restaurant",
      accessedAt: "2026-09-10",
      sourceUrl: expect.stringMatching(/^https:\/\//),
      sourceReference: expect.any(String),
    });
  });
});

test("preserves published options and scales unknown restaurant nutrients without inventing zero", () => {
  const subwaySteak = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:subway:steak-philly-6-inch"));
  const subwayPocketWrap = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:subway:protein-pocket-wrap-9-inch"));
  const chipotleQueso = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:chipotle:queso-blanco"));
  const popeyesTenders = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:popeyes:tenders-classic-or-spicy"));

  expect(subwaySteak.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    [expect.stringContaining("1 6-inch sandwich (192 g)"), 510],
    [expect.stringContaining("1 footlong sandwich"), 1020],
  ]);
  expect(chipotleQueso.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["1 entr\u00e9e portion (2 oz)", 120],
    ["1 side (4 oz)", 240],
    ["1 large side (8 oz)", 480],
  ]);
  expect(popeyesTenders.servingOptions.map(({ serving, nutrients }) => [serving.amount, nutrients.calories])).toEqual([
    [3, 390], [5, 650],
  ]);
  expect(scaleNutrition(subwayPocketWrap.nutrients, 2)).toMatchObject({
    calories: 300,
    protein: 8,
    fiber: null,
  });

  [...subwaySteak.servingOptions, ...chipotleQueso.servingOptions, ...popeyesTenders.servingOptions].forEach((option) => {
    expect(option.provenance.verification).toMatchObject({
      sourceType: "official-restaurant",
      accessedAt: "2026-09-10",
      sourceUrl: expect.stringMatching(/^https:\/\//),
      sourceReference: expect.any(String),
    });
  });
});

test("finds McDonald's, Sonic, and Braum's items across the expanded menu categories", () => {
  expect(searchFoodCatalog("mcdonalds steak egg cheese bagel")[0].id).toBe("restaurant:mcdonalds:steak-egg-cheese-bagel");
  expect(searchFoodCatalog("mcdonalds mccrispy strips")[0].id).toBe("restaurant:mcdonalds:mccrispy-strips");
  expect(searchFoodCatalog("mcdonalds oreo mcflurry")[0].id).toBe("restaurant:mcdonalds:oreo-mcflurry");
  expect(searchFoodCatalog("mcdonalds premium roast decaf")[0].id).toBe("restaurant:mcdonalds:premium-roast-decaf-coffee");
  expect(searchFoodCatalog("mcdonalds mccafe premium roast coffee")[0].id).toBe("restaurant:mcdonalds:premium-roast-coffee");
  expect(searchFoodCatalog("mcdonalds mccafé premium roast coffee")[0].id).toBe("restaurant:mcdonalds:premium-roast-coffee");
  expect(searchFoodCatalog("mcdonalds iced caramel macchiato")[0].id).toBe("restaurant:mcdonalds:iced-caramel-macchiato");
  expect(searchFoodCatalog("mcdonalds dragonberry energizer")[0].id).toBe("restaurant:mcdonalds:red-bull-dragonberry-energizer");
  expect(searchFoodCatalog("mcdonalds diet coke")[0].id).toBe("restaurant:mcdonalds:diet-coke");
  expect(searchFoodCatalog("mcdonalds low fat milk jug")[0].id).toBe("restaurant:mcdonalds:low-fat-milk-jug");
  expect(searchFoodCatalog("mcdonalds frozen blue raspberry")[0].id).toBe("restaurant:mcdonalds:frozen-fanta-blue-raspberry");
  expect(searchFoodCatalog("mcdonalds mccafe mango pineapple smoothie")[0].id).toBe("restaurant:mcdonalds:mango-pineapple-smoothie");
  expect(searchFoodCatalog("mcdonalds honey mustard")[0].id).toBe("restaurant:mcdonalds:honey-mustard-sauce");

  expect(searchFoodCatalog("sonic original smasher triple")[0].id).toBe("restaurant:sonic:original-sonic-smasher-triple");
  expect(searchFoodCatalog("sonic premium chicken bites")[0].id).toBe("restaurant:sonic:premium-chicken-bites");
  expect(searchFoodCatalog("sonic bacon croissonic")[0].id).toBe("restaurant:sonic:croissonic-sandwich-bacon");
  expect(searchFoodCatalog("sonic onion rings")[0].id).toBe("restaurant:sonic:onion-rings");
  expect(searchFoodCatalog("sonic oreo blast")[0].id).toBe("restaurant:sonic:oreo-blast");
  expect(searchFoodCatalog("sonic cherry limeade")[0].id).toBe("restaurant:sonic:cherry-limeade");
  expect(searchFoodCatalog("sonic ocean water")[0].id).toBe("restaurant:sonic:ocean-water");
  expect(searchFoodCatalog("sonic french vanilla cold brew")[0].id).toBe("restaurant:sonic:french-vanilla-cold-brew-iced-coffee");
  expect(searchFoodCatalog("sonic barqs root beer")[0].id).toBe("restaurant:sonic:barqs-root-beer");
  expect(searchFoodCatalog("sonic dr pepper")[0].id).toBe("restaurant:sonic:dr-pepper");
  expect(searchFoodCatalog("sonic Dr. Pepper")[0].id).toBe("restaurant:sonic:dr-pepper");
  expect(searchFoodCatalog("sonic jalapeno ranch")[0].id).toBe("restaurant:sonic:jalapeno-ranch");
  expect(searchFoodCatalog("sonic jalapeño ranch")[0].id).toBe("restaurant:sonic:jalapeno-ranch");

  expect(searchFoodCatalog("braums triple quarter cheeseburger")[0].id).toBe("restaurant:braums:triple-quarter-lb-cheeseburger");
  expect(searchFoodCatalog("braums biscuits sausage gravy")[0].id).toBe("restaurant:braums:biscuits-sausage-gravy");
  expect(searchFoodCatalog("braums premium vanilla ice cream")[0].id).toBe("restaurant:braums:premium-vanilla-ice-cream");
  expect(searchFoodCatalog("braums hot fudge sundae")[0].id).toBe("restaurant:braums:hot-fudge-sundae");
  expect(searchFoodCatalog("braums limeade")[0].id).toBe("restaurant:braums:limeade");
  expect(searchFoodCatalog("braums cherry limeade")[0].id).toBe("restaurant:braums:cherry-limeade");
});

test("finds Taco Bell, Chick-fil-A, and Whataburger items across the completed menu categories", () => {
  expect(searchFoodCatalog("tacobell cantina chicken bowl")[0].id).toBe("restaurant:taco-bell:cantina-chicken-bowl");
  expect(searchFoodCatalog("taco bell breakfast crunchwrap sausage")[0].id).toBe("restaurant:taco-bell:breakfast-crunchwrap-sausage");
  expect(searchFoodCatalog("taco bell nacho fries")[0].id).toBe("restaurant:taco-bell:nacho-fries");
  expect(searchFoodCatalog("taco bell chili cheese nacho fries")[0].id).toBe("restaurant:taco-bell:chili-cheese-nacho-fries");
  expect(searchFoodCatalog("taco bell creamy jalapeno")[0].id).toBe("restaurant:taco-bell:creamy-jalapeno-sauce-side");
  expect(searchFoodCatalog("taco bell creamy jalapeño")[0].id).toBe("restaurant:taco-bell:creamy-jalapeno-sauce-side");
  expect(searchFoodCatalog("taco bell grande nachos beef")[0].id).toBe("restaurant:taco-bell:grande-nachos-seasoned-beef");
  expect(searchFoodCatalog("taco bell baja blast freeze")[0].id).toBe("restaurant:taco-bell:large-mtn-dew-baja-blast-freeze");

  expect(searchFoodCatalog("chickfila bacon egg cheese muffin")[0].id).toBe("restaurant:chick-fil-a:bacon-egg-cheese-muffin");
  expect(searchFoodCatalog("chick fil a market salad")[0].id).toBe("restaurant:chick-fil-a:market-salad-chick-fil-a-filet");
  expect(searchFoodCatalog("chickfila cookies cream shake")[0].id).toBe("restaurant:chick-fil-a:cookies-and-cream-milkshake");
  expect(searchFoodCatalog("chick fil a lemonade")[0].id).toBe("restaurant:chick-fil-a:lemonade");
  expect(searchFoodCatalog("chick fil a frosted diet lemonade")[0].id).toBe("restaurant:chick-fil-a:frosted-diet-lemonade");
  expect(searchFoodCatalog("chick fil a avocado lime ranch")[0].id).toBe("restaurant:chick-fil-a:avocado-lime-ranch-dressing");

  expect(searchFoodCatalog("whataburger patty melt")[0].id).toBe("restaurant:whataburger:patty-melt");
  expect(searchFoodCatalog("whataburger taquito potato")[0].id).toBe("restaurant:whataburger:taquito-with-cheese-potato");
  expect(searchFoodCatalog("whataburger kids grilled cheese")[0].id).toBe("restaurant:whataburger:kids-grilled-cheese");
  expect(searchFoodCatalog("whataburger hot apple pie")[0].id).toBe("restaurant:whataburger:hot-apple-pie");
  expect(searchFoodCatalog("whataburger buffalo ranch chicken salad")[0].id).toBe("restaurant:whataburger:buffalo-ranch-chicken-salad");
  expect(searchFoodCatalog("whataburger vanilla malt")[0].id).toBe("restaurant:whataburger:vanilla-malt");
  expect(searchFoodCatalog("whataburger dr pepper")[0].id).toBe("restaurant:whataburger:fountain-dr-pepper");
  expect(searchFoodCatalog("whataburger dr pepper shake")[0].id).toBe("restaurant:whataburger:dr-pepper-shake");
  expect(searchFoodCatalog("whataburger jalapeno ranch")[0].id).toBe("restaurant:whataburger:jalapeno-ranch");
  expect(searchFoodCatalog("whataburger jalapeño ranch")[0].id).toBe("restaurant:whataburger:jalapeno-ranch");
  expect(searchFoodCatalog("whataburger grilled peppers onions add on")[0].id).toBe("restaurant:whataburger:grilled-peppers-and-onions-add-on");
});

test("applies consistent product, brand, and chain-qualified drink ranking", () => {
  const expectedFirstResults = [
    ["pepsi", "beverage:pepsi:pepsi-20oz"],
    ["diet pepsi", "beverage:pepsi:diet-pepsi-20oz"],
    ["pepsi zero", "beverage:pepsi:zero-sugar-20oz"],
    ["pepsi wild cherry", "beverage:pepsi:wild-cherry-20oz"],
    ["gatorade", "beverage:gatorade:cool-blue-20oz"],
    ["taco bell gatorade", "restaurant:taco-bell:large-g2-gatorade-fruit-punch"],
    ["coke zero", "beverage:coca-cola:zero-sugar-12oz"],
    ["sonic coke zero", "restaurant:sonic:coca-cola-zero-sugar"],
    ["sonic dr pepper", "restaurant:sonic:dr-pepper"],
    ["sonic Dr. Pepper", "restaurant:sonic:dr-pepper"],
    ["sonic peppers", "restaurant:sonic:ched-r-peppers"],
    ["braums limeade", "restaurant:braums:limeade"],
    ["braums cherry limeade", "restaurant:braums:cherry-limeade"],
    ["whataburger coke zero", "restaurant:whataburger:fountain-coca-cola-zero-sugar"],
  ];

  expect(expectedFirstResults.map(([query]) => [query, searchFoodCatalog(query)[0]?.id]))
    .toEqual(expectedFirstResults);
  expect(searchFoodCatalog("taco bell pepsi").map((food) => food.id)).toContain("restaurant:taco-bell:large-pepsi");
});

test("preserves new size, piece-count, and mixed-date options with official provenance", () => {
  const tacoBellFries = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:taco-bell:nacho-fries"));
  const chickFilANuggets = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:chick-fil-a:nuggets"));
  const chickFilALemonade = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:chick-fil-a:lemonade"));
  const whataburgerBites = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:whataburger:whatachickn-bites"));
  const whataburgerPattyMelt = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:whataburger:patty-melt"));
  const whataburgerShake = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:whataburger:chocolate-shake"));
  const whataburgerOnionRings = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:whataburger:onion-rings"));

  expect(tacoBellFries.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Regular order of seasoned Nacho Fries; dipping sauce not included", 350],
    ["Large order of seasoned Nacho Fries; dipping sauce not included", 500],
  ]);
  expect(chickFilANuggets.servingOptions.map(({ serving, nutrients }) => [serving.amount, nutrients.calories])).toEqual([
    [8, 250], [12, 380], [5, 160], [30, 950],
  ]);
  expect(chickFilALemonade.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Small (465 g)", 190], ["Medium (612 g)", 260], ["Large (916 g)", 380],
  ]);
  expect(whataburgerBites.servingOptions.map(({ serving, nutrients }) => [serving.amount, nutrients.calories])).toEqual([
    [4, 260], [6, 390], [9, 580],
  ]);
  expect(whataburgerPattyMelt.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Standard Patty Melt: two beef patties, Monterey Jack cheese, grilled onions and Creamy Pepper Sauce on Texas Toast", 940],
    ["Junior Patty Melt with one beef patty", 640],
  ]);
  expect(whataburgerShake.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Small Chocolate Shake (16 fl oz)", 440],
    ["Medium Chocolate Shake (20 fl oz)", 560],
    ["Large Chocolate Shake (32 fl oz)", 890],
  ]);
  expect(whataburgerOnionRings.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Medium Onion Rings", 300], ["Large Onion Rings", 450],
  ]);

  [
    ...tacoBellFries.servingOptions,
    ...chickFilANuggets.servingOptions.filter((option) => option.serving.amount === 5 || option.serving.amount === 30),
    ...chickFilALemonade.servingOptions,
    ...whataburgerBites.servingOptions,
    ...whataburgerPattyMelt.servingOptions,
    ...whataburgerShake.servingOptions,
    whataburgerOnionRings.servingOptions[1],
  ].forEach((option) => expect(option.provenance.verification).toMatchObject({
    sourceType: "official-restaurant",
    accessedAt: "2026-09-10",
    sourceUrl: expect.stringMatching(/^https:\/\//),
    sourceReference: expect.any(String),
  }));
});

test("scales new restaurant options without converting unpublished nutrients to zero", () => {
  const tacoBellFries = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:taco-bell:nacho-fries"));
  const whataburgerShake = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:whataburger:chocolate-shake"));

  expect(scaleNutrition(tacoBellFries.servingOptions[1].nutrients, 0.5)).toEqual({
    calories: 250,
    protein: null,
    carbohydrates: null,
    fat: null,
    sodium: null,
  });
  expect(scaleNutrition(whataburgerShake.servingOptions[0].nutrients, 2)).toEqual({
    calories: 880,
    protein: 20,
    carbohydrates: 160,
    fat: 22,
    sodium: 780,
    fiber: 0,
    totalSugar: 156,
    addedSugar: null,
  });
});

test("preserves published McDonald's, Sonic, and Braum's size and piece-count options", () => {
  const mcdonaldsCoffee = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:mcdonalds:premium-roast-decaf-coffee"));
  const mcdonaldsMacchiato = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:mcdonalds:iced-caramel-macchiato"));
  const mcdonaldsSprite = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:mcdonalds:sprite"));
  const sonicPeppers = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:sonic:ched-r-peppers"));
  const sonicOceanWater = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:sonic:ocean-water"));
  const braumsStrips = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:braums:chicken-strips"));

  expect(mcdonaldsCoffee.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Small Premium Roast Decaf Coffee", 5],
    ["Medium Premium Roast Decaf Coffee", 10],
    ["Large Premium Roast Decaf Coffee", 15],
  ]);
  expect(mcdonaldsMacchiato.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Small Iced Caramel Macchiato", 200],
    ["Medium Iced Caramel Macchiato", 240],
    ["Large Iced Caramel Macchiato", 360],
  ]);
  expect(mcdonaldsSprite.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Extra Small Sprite", 140],
    ["Small Sprite", 190],
    ["Medium Sprite", 250],
    ["Large Sprite", 350],
  ]);
  expect(sonicPeppers.servingOptions.map(({ serving, nutrients }) => [serving.amount, nutrients.calories])).toEqual([
    [4, 330], [6, 490], [8, 660],
  ]);
  expect(sonicOceanWater.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Wacky Pack Ocean Water", 80],
    ["Small Ocean Water", 110],
    ["Medium Ocean Water", 190],
    ["Large Ocean Water", 300],
    ["RT 44 Ocean Water", 400],
  ]);
  expect(braumsStrips.servingOptions.map(({ serving, nutrients }) => [serving.amount, nutrients.calories])).toEqual([
    [2, 250], [4, 490], [6, 740],
  ]);

  [...mcdonaldsCoffee.servingOptions, ...mcdonaldsMacchiato.servingOptions, ...mcdonaldsSprite.servingOptions, ...sonicPeppers.servingOptions, ...sonicOceanWater.servingOptions].forEach((option) => {
    expect(option.provenance.verification).toMatchObject({
      sourceType: "official-restaurant",
      accessedAt: "2026-09-10",
      sourceUrl: expect.stringMatching(/^https:\/\//),
      sourceReference: expect.any(String),
    });
  });
  expect(braumsStrips.servingOptions[0].provenance.verification).toMatchObject({
    sourceType: "official-restaurant",
    accessedAt: "2026-09-10",
    sourceUrl: "https://www.braums.com/wp-content/uploads/2022/08/2018-Nutritional-Chart-for-web.pdf",
  });
});

test("scales expanded McDonald's, Sonic, and Braum's servings without inventing nutrients", () => {
  const mcdonaldsCoffee = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:mcdonalds:premium-roast-decaf-coffee"));
  const sonicOnionRings = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:sonic:onion-rings"));
  const braumsVanilla = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:braums:premium-vanilla-ice-cream"));

  expect(scaleNutrition(mcdonaldsCoffee.servingOptions[1].nutrients, 2)).toEqual({
    calories: 20,
    protein: null,
    carbohydrates: null,
    fat: null,
    sodium: null,
    fiber: null,
    totalSugar: null,
    addedSugar: null,
  });
  expect(scaleNutrition(sonicOnionRings.servingOptions[1].nutrients, 0.5)).toEqual({
    calories: 290,
    protein: 4,
    carbohydrates: 37,
    fat: 14.5,
    sodium: 285,
    fiber: 2,
    totalSugar: 9.5,
  });
  expect(scaleNutrition(braumsVanilla.servingOptions[0].nutrients, 2)).toEqual({
    calories: 380,
    protein: 6,
    carbohydrates: 38,
    fat: 22,
    sodium: 120,
    fiber: 0,
    totalSugar: 38,
  });
});

test("finds Wendy's and Burger King items across the expanded menu categories", () => {
  expect(searchFoodCatalog("wendys daves double")[0].id).toBe("restaurant:wendys:daves-double");
  expect(searchFoodCatalog("wendys spicy nuggets")[0].id).toBe("restaurant:wendys:spicy-chicken-nuggets");
  expect(searchFoodCatalog("wendys maple bacon croissant")[0].id).toBe("restaurant:wendys:maple-bacon-chicken-croissant");
  expect(searchFoodCatalog("wendys natural cut fries")[0].id).toBe("restaurant:wendys:french-fries");
  expect(searchFoodCatalog("wendys classic chocolate frosty")[0].id).toBe("restaurant:wendys:classic-chocolate-frosty");
  expect(searchFoodCatalog("wendys signature sauce")[0].id).toBe("restaurant:wendys:signature-sauce");
  expect(searchFoodCatalog("wendys coke")[0].id).toBe("restaurant:wendys:coca-cola");

  expect(searchFoodCatalog("burger king bacon double cheeseburger")[0].id).toBe("restaurant:burger-king:bacon-double-cheeseburger");
  expect(searchFoodCatalog("burger king chicken nuggets")[0].id).toBe("restaurant:burger-king:chicken-nuggets");
  expect(searchFoodCatalog("burger king fully loaded croissanwich")[0].id).toBe("restaurant:burger-king:fully-loaded-croissanwich");
  expect(searchFoodCatalog("burger king french fries")[0].id).toBe("restaurant:burger-king:french-fries");
  expect(searchFoodCatalog("burger king applesauce")[0].id).toBe("restaurant:burger-king:motts-natural-applesauce");
  expect(searchFoodCatalog("burger king hershey pie")[0].id).toBe("restaurant:burger-king:hershey-sundae-pie");
  expect(searchFoodCatalog("burger king zesty sauce")[0].id).toBe("restaurant:burger-king:zesty-onion-ring-dipping-sauce");
  expect(searchFoodCatalog("burger king coke")[0].id).toBe("restaurant:burger-king:coca-cola");
});

test("preserves published Wendy's and Burger King size and piece-count options", () => {
  const wendysFries = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:wendys:french-fries"));
  const wendysNuggets = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:wendys:10-piece-chicken-nuggets"));
  const burgerKingNuggets = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:burger-king:chicken-nuggets"));
  const burgerKingHashBrowns = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:burger-king:hash-browns-small"));

  expect(wendysFries.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Junior Natural-Cut Fries", 210],
    ["Small Natural-Cut Fries", 260],
    ["Medium Natural-Cut Fries", 350],
    ["Large Natural-Cut Fries", 470],
  ]);
  expect(wendysNuggets.servingOptions.map(({ serving, nutrients }) => [serving.amount, nutrients.calories])).toEqual([
    [10, 430], [4, 170], [6, 260],
  ]);
  expect(burgerKingNuggets.servingOptions.map(({ serving, nutrients }) => [serving.amount, nutrients.calories])).toEqual([
    [4, 170], [6, 260], [10, 430], [20, 860],
  ]);
  expect(burgerKingHashBrowns.servingOptions.map(({ serving, nutrients }) => [serving.description, nutrients.calories])).toEqual([
    ["Small order (84 g)", 250],
    ["Medium order (169 g)", 500],
    ["Large order (225 g)", 670],
  ]);

  [...wendysFries.servingOptions, ...wendysNuggets.servingOptions, ...burgerKingNuggets.servingOptions, ...burgerKingHashBrowns.servingOptions].forEach((option) => {
    expect(option.provenance.verification).toMatchObject({
      sourceType: "official-restaurant",
      accessedAt: "2026-09-10",
      sourceUrl: expect.stringMatching(/^https:\/\//),
      sourceReference: expect.any(String),
    });
  });
});

test("scales expanded serving options without converting unknown nutrients to zero", () => {
  const wendysFries = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:wendys:french-fries"));
  const burgerKingNuggets = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:burger-king:chicken-nuggets"));
  const wendysMedium = wendysFries.servingOptions.find((option) => option.id.endsWith(":medium"));
  const burgerKingSixPiece = burgerKingNuggets.servingOptions.find((option) => option.id.endsWith(":6-piece"));

  expect(scaleNutrition(wendysMedium.nutrients, 2)).toEqual({
    calories: 700,
    protein: null,
    carbohydrates: null,
    fat: null,
    sodium: null,
    fiber: null,
    totalSugar: null,
    addedSugar: null,
  });
  expect(scaleNutrition(burgerKingSixPiece.nutrients, 0.5)).toEqual({
    calories: 130,
    protein: 6,
    carbohydrates: 8,
    fat: 8,
    sodium: 235,
    fiber: 0.5,
    totalSugar: 0,
    addedSugar: null,
  });
});

test("scales published supplemental nutrients while preserving new unknown nutrients", () => {
  const chipotleSteak = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:chipotle:steak-4oz"));
  const burgerKingImpossible = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:burger-king:impossible-whopper"));
  const wendysSingle = normalizeRestaurantFood(restaurantFoods.find((food) => food.id === "restaurant:wendys:daves-single"));

  expect(scaleNutrition(chipotleSteak.nutrients, 0.5)).toEqual({
    calories: 75,
    protein: 10.5,
    carbohydrates: 0.5,
    fat: 3,
    sodium: 165,
    fiber: 0.5,
    totalSugar: 0,
    addedSugar: null,
  });
  expect(scaleNutrition(burgerKingImpossible.nutrients, 0.5)).toEqual({
    calories: 315,
    protein: 12.5,
    carbohydrates: 29,
    fat: 17,
    sodium: 540,
    fiber: 2,
    totalSugar: 6,
    addedSugar: null,
  });
  expect(scaleNutrition(wendysSingle.nutrients, 2)).toEqual({
    calories: 1120,
    protein: null,
    carbohydrates: null,
    fat: null,
    sodium: null,
    fiber: null,
    totalSugar: null,
    addedSugar: null,
  });
});

test("matches non-adjacent chain and item tokens in any searchable-field order", () => {
  expect(searchFoodCatalog("sonic groovy").map((food) => food.id)).toEqual([
    "restaurant:sonic:cheese-groovy-fries",
    "restaurant:sonic:chili-cheese-groovy-fries",
    "restaurant:sonic:groovy-fries",
    "restaurant:sonic:groovy-sauce",
  ]);
  expect(searchFoodCatalog("sonic fries").map((food) => food.id)).toEqual([
    "restaurant:sonic:cheese-groovy-fries",
    "restaurant:sonic:chili-cheese-groovy-fries",
    "restaurant:sonic:groovy-fries",
  ]);
  expect(searchFoodCatalog("braums fries").map((food) => food.id)).toEqual([
    "restaurant:braums:french-fries",
  ]);
  expect(searchFoodCatalog("mcdonalds nuggets").map((food) => food.id)).toEqual([
    "restaurant:mcdonalds:chicken-mcnuggets",
    "restaurant:mcdonalds:spicy-chicken-mcnuggets-10-piece",
  ]);
  expect(searchFoodCatalog("sonic french").map((food) => food.id)).toEqual([
    "restaurant:sonic:french-toast-sticks-4-without-syrup",
    "restaurant:sonic:french-vanilla-cold-brew-iced-coffee",
  ]);
});

test("keeps partial single-token results, ordering, and saved-food priority", () => {
  const restaurantFood = (id, restaurantId, restaurantName, name, searchAliases = []) => ({
    id,
    name,
    restaurant: { id: restaurantId, name: restaurantName },
    sourceType: "restaurant",
    searchAliases,
    provenance: { source: "official-restaurant" },
  });
  const controlledFoods = [
    restaurantFood("fixture:nacho", "taco-bell", "Taco Bell", "Nacho Fries", ["Taco Bell Nacho Fries"]),
    restaurantFood("fixture:waffle", "bravo", "Bravo", "Waffle Fries"),
    restaurantFood("fixture:leading", "zulu", "Zulu", "Fries Basket"),
    restaurantFood("fixture:curly", "alpha", "Alpha", "Curly Fries"),
    restaurantFood("fixture:unrelated", "echo", "Echo", "Onion Rings"),
  ];

  expect(searchFoods("frie", controlledFoods, 3).map((food) => food.id)).toEqual([
    "fixture:leading",
    "fixture:curly",
    "fixture:waffle",
  ]);
  expect(searchFoods("frie", controlledFoods, 4).map((food) => food.id)).toEqual([
    "fixture:leading",
    "fixture:curly",
    "fixture:waffle",
    "fixture:nacho",
  ]);

  const savedFries = {
    id: "user-added:fries",
    name: "Fries",
    serving: { amount: 1, unit: "serving", description: "1 serving" },
    nutrients: { calories: 300, protein: 4, carbohydrates: 40, fat: 14 },
    provenance: { source: "user-added", sourceId: "fries", confidence: "user-added" },
  };
  expect(searchFoodCatalog("fries", [savedFries])[0]).toBe(savedFries);
  expect(searchFoodCatalog("banana", [savedFries])[0].id).toBe("grocery:usda:173944");
});

test("keeps real-catalog partial fries results discoverable as the catalog grows", () => {
  const ids = searchFoodCatalog("frie", [], restaurantFoods.length).map((food) => food.id);

  expect(ids).toEqual(expect.arrayContaining([
    "restaurant:braums:french-fries",
    "restaurant:burger-king:french-fries",
    "restaurant:chick-fil-a:waffle-potato-fries",
    "restaurant:mcdonalds:french-fries",
    "restaurant:taco-bell:nacho-fries",
    "restaurant:whataburger:french-fries",
  ]));
  expect(searchFoodCatalog("nugget", [], restaurantFoods.length).map((food) => food.id))
    .toContain("restaurant:mcdonalds:chicken-mcnuggets");
  expect(searchFoodCatalog("sonic").every((food) => food.restaurant?.id === "sonic")).toBe(true);
});

test("finds raw chicken breast strips through USDA aliases before restaurant foods", () => {
  const results = searchFoodCatalog("raw chicken breast strips");

  expect(results[0]).toMatchObject({
    id: "grocery:usda:2646170",
    sourceType: "grocery",
    dataType: "generic",
    preparationState: "raw",
    provenance: { source: "usda-fooddata-central", label: "USDA" },
  });
  expect(results[0].serving.description).toBe("4 oz raw (113 g)");
  expect(results.findIndex((food) => food.sourceType === "restaurant")).not.toBe(0);
});

test("searches branded drinks across Phase 1 categories with tokenized AND matching", () => {
  expect(searchFoodCatalog("coke zero")[0]).toMatchObject({
    id: "beverage:coca-cola:zero-sugar-12oz",
    sourceType: "beverage",
    brand: "Coca-Cola",
  });
  expect(searchFoodCatalog("sonic coke zero")[0]).toMatchObject({
    id: "restaurant:sonic:coca-cola-zero-sugar",
    sourceType: "restaurant",
    restaurant: { id: "sonic" },
  });
  expect(searchFoodCatalog("monster ultra")[0]).toMatchObject({
    id: "beverage:monster:ultra-zero-16oz",
    category: "energy",
  });
  expect(searchFoodCatalog("gatorade")[0]).toMatchObject({
    brand: "Gatorade",
    category: "sports-hydration",
  });
  expect(searchFoodCatalog("taco bell gatorade")[0]).toMatchObject({
    id: "restaurant:taco-bell:large-g2-gatorade-fruit-punch",
    sourceType: "restaurant",
    restaurant: { id: "taco-bell" },
  });
  expect(searchFoodCatalog("starbucks frappuccino")[0]).toMatchObject({
    brand: "Starbucks",
    category: "ready-to-drink-coffee",
  });
  expect(searchFoodCatalog("pure leaf sweet tea")[0]).toMatchObject({
    id: "beverage:pure-leaf:sweet-tea-18-5oz",
    category: "tea",
  });
});

test("keeps diet and zero-sugar drinks distinct with exact package metadata", () => {
  const results = searchFoodCatalog("pepsi", [], 20);
  const diet = results.find(({ id }) => id === "beverage:pepsi:diet-pepsi-20oz");
  const zero = results.find(({ id }) => id === "beverage:pepsi:zero-sugar-20oz");

  expect(diet).toMatchObject({ name: "Diet Pepsi", serving: { description: "20 fl oz bottle" }, nutrients: { sodium: 60 } });
  expect(zero).toMatchObject({ name: "Pepsi Zero Sugar", serving: { description: "20 fl oz bottle" }, nutrients: { sodium: 65 } });
  expect(diet.id).not.toBe(zero.id);
});

test("preserves optional beverage caffeine and null nutrients in search results", () => {
  expect(searchFoodCatalog("monster ultra zero")[0]).toMatchObject({
    nutrients: { protein: null, carbohydrates: null, totalSugar: 0, addedSugar: null },
    beverage: { caffeineMg: 150 },
  });
  expect(searchFoodCatalog("coca cola original")[0]).toMatchObject({
    id: "beverage:coca-cola:original-20oz",
    beverage: { caffeineMg: null },
  });
  expect(searchFoodCatalog("McNuggets")[0]).toMatchObject({ sourceType: "restaurant" });
});

test("keeps raw chicken breast searchable and excludes the cooked USDA variant", () => {
  const results = searchFoodCatalog("chicken breast", [], 20);
  const raw = results.find((food) => food.id === "grocery:usda:2646170");
  const cooked = results.find((food) => food.id === "grocery:usda:171477");

  expect(raw).toMatchObject({ preparationState: "raw", serving: { description: expect.stringContaining("raw") } });
  expect(cooked).toBeUndefined();
  expect(results.filter((food) => food.sourceType === "grocery")).not.toEqual(expect.arrayContaining([
    expect.objectContaining({ preparationState: "cooked" }),
  ]));
});

test("searches generic grocery foods by category and useful staple names", () => {
  const rice = searchFoodCatalog("rice", [], 20).filter(({ sourceType }) => sourceType === "grocery");
  expect(rice.length).toBeGreaterThan(0);
  expect(rice.some(({ preparationState, name }) => ["raw", "dry"].includes(preparationState) || /uncooked/i.test(name))).toBe(true);
  expect(rice.some(({ preparationState }) => preparationState === "cooked")).toBe(false);
  expect(searchFoodCatalog("eggs dairy").every((food) => food.category === "eggs-dairy")).toBe(true);
  expect(searchFoodCatalog("eggs")[0]).toMatchObject({
    id: "grocery:usda:171287",
    name: "Egg, whole, raw",
  });
  expect(searchFoodCatalog("Greek yogurt")[0]).toMatchObject({
    sourceType: "grocery",
    dataType: "generic",
    provenance: { label: "USDA" },
  });
});

test.each([
  ["ground beef", "protein", /Ground beef/],
  ["cod raw", "seafood", /Cod.*raw|raw.*Cod/i],
  ["egg whites", "eggs-dairy", /Egg white/],
  ["pineapple raw", "fruit", /Pineapple.*raw|raw.*Pineapple/i],
  ["frozen broccoli", "vegetables", /Broccoli.*frozen|frozen.*Broccoli/i],
  ["quinoa", "grains-starches", /Quinoa/],
  ["avocado oil", "fats-oils", /Avocado oil|Oil, avocado/],
  ["almond butter", "pantry", /Almond butter|almond butter/],
])("searches ingredient-level %s from the %s category", (query, category, name) => {
  const result = searchFoodCatalog(query, [], 20).find((food) => name.test(food.name));
  expect(result).toMatchObject({
    category,
    sourceType: "grocery",
    dataType: "generic",
    provenance: { source: "usda-fooddata-central", label: "USDA" },
  });
});

test("keeps raw and dried eggs while excluding cooked and fried grocery eggs", () => {
  expect(searchFoodCatalog("whole egg raw").map(({ id }) => id)).toContain("grocery:usda:171287");
  expect(searchFoodCatalog("egg whites").map(({ id }) => id)).toContain("grocery:usda:172183");
  expect(searchFoodCatalog("egg dried", [], 20).map(({ id }) => id)).toEqual(expect.arrayContaining([
    "grocery:usda:329490",
    "grocery:usda:323793",
  ]));
  expect(searchFoodCatalog("egg fried", [], 20).filter(({ sourceType }) => sourceType === "grocery")).toEqual([]);
  expect(searchFoodCatalog("egg cooked", [], 20).filter(({ sourceType }) => sourceType === "grocery")).toEqual([]);
});

test("searches standalone oils and fats without attaching them to ingredient results", () => {
  expect(searchFoodCatalog("vegetable oil")[0]).toMatchObject({
    id: "grocery:usda:171411",
    nutrients: { calories: 120.2, protein: 0, carbohydrates: 0, fat: 13.6, fiber: 0, sodium: 0 },
  });
  expect(searchFoodCatalog("ghee")[0]).toMatchObject({
    id: "grocery:usda:171314",
    nutrients: { calories: 126, protein: 0, carbohydrates: 0, fat: 14, fiber: 0, sodium: 0 },
  });
  expect(searchFoodCatalog("cooking spray")[0]).toMatchObject({
    id: "grocery:usda:171430",
    serving: { description: "1 spray, about 1/3 second (0.3 g)" },
  });
  expect(searchFoodCatalog("raw chicken breast strips")[0].id).toBe("grocery:usda:2646170");
  expect(searchFoodCatalog("raw chicken breast strips")[0].nutrients).toEqual({
    calories: 120.2,
    protein: 25.52,
    carbohydrates: 0,
    fat: 2.19,
    fiber: null,
    sodium: 74.6,
  });
});

test("ranks reviewed common ground-beef staples before less common lean variants", () => {
  expect(searchFoodCatalog("ground beef").slice(0, 2).map(({ id }) => id)).toEqual([
    "grocery:usda:2514744",
    "grocery:usda:2514743",
  ]);
});

test("supports high-value aliases without collapsing preparation forms", () => {
  expect(searchFoodCatalog("chicken strips")[0]).toMatchObject({
    id: "grocery:usda:2646170",
    preparationState: "raw",
  });
  expect(searchFoodCatalog("sweet potato").some((food) => (
    food.category === "vegetables" && /Sweet potato/i.test(food.name)
  ))).toBe(true);
  expect(searchFoodCatalog("egg whites")[0].name).toMatch(/Egg white/);
  expect(searchFoodCatalog("greek yogurt")[0]).toMatchObject({ category: "eggs-dairy" });
});

test("suppresses starter duplicates while retaining the USDA grocery record", () => {
  const bananaResults = searchFoodCatalog("banana", [], 20);

  expect(bananaResults.filter(({ dedupeKey }) => dedupeKey === "generic:banana-medium")).toHaveLength(1);
  expect(bananaResults.find(({ dedupeKey }) => dedupeKey === "generic:banana-medium")).toMatchObject({
    id: "grocery:usda:173944",
    provenance: { source: "usda-fooddata-central" },
  });
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
      expect(Object.keys(record.nutrients)).toEqual(expect.arrayContaining(["calories", "carbohydrates", "fat", "protein", "sodium"]));
      expect(Object.keys(record.nutrients).every((key) => ["calories", "carbohydrates", "fat", "protein", "sodium", "fiber", "totalSugar", "addedSugar"].includes(key))).toBe(true);
      Object.values(record.nutrients).forEach((value) => expect(value === null || (typeof value === "number" && value >= 0)).toBe(true));
    });
  });
});

test("searches the Phase 1A dairy catalog by brand, product, style, flavor, and alias", () => {
  expect(searchFoodCatalog("Yoplait cherry orchard")[0]).toMatchObject({
    id: "packaged-food:yoplait-original-cherry-orchard-6oz",
    sourceType: "packaged-food",
    category: "yogurt",
  });
  expect(searchFoodCatalog("Oikos lemon tart")[0]).toMatchObject({
    brand: "Oikos",
    packaged: { packageSize: "5.3 oz cup" },
  });
  expect(searchFoodCatalog("Chobani sugar free").every((food) => (
    food.sourceType === "packaged-food" && food.brand === "Chobani"
  ))).toBe(true);
  expect(searchFoodCatalog("Good Culture lactose free")[0]).toMatchObject({
    category: "cottage-cheese",
    brand: "Good Culture",
  });
  expect(searchFoodCatalog("Babybel brown")[0]).toMatchObject({
    id: "packaged-food:babybel-gouda-12ct",
  });
  expect(searchFoodCatalog("cheese snack")).toHaveLength(DEFAULT_RESULT_LIMIT);
  expect(new Set(searchFoodCatalog("cheese snack").map((food) => food.id)).size)
    .toBe(DEFAULT_RESULT_LIMIT);
});

test("searches Phase 1B cereal and oatmeal by brand, product style, and aliases", () => {
  expect(searchFoodCatalog("plain cheerios")[0]).toMatchObject({
    id: "packaged-food:cheerios-original-8-9oz",
    category: "cereal",
  });
  expect(searchFoodCatalog("Kelloggs raisin cereal")[0]).toMatchObject({
    id: "packaged-food:kelloggs-raisin-bran-crunch-24-5oz",
  });
  expect(searchFoodCatalog("high protein chocolate cereal")[0]).toMatchObject({
    id: "packaged-food:premier-protein-chocolate-almond-cereal-9oz",
    nutrients: { protein: 20 },
  });
  expect(searchFoodCatalog("plain quick oatmeal")[0]).toMatchObject({
    id: "packaged-food:quaker-quick-one-minute-oats-42oz",
    category: "oatmeal",
  });
  expect(searchFoodCatalog("low sugar maple oatmeal")[0]).toMatchObject({
    id: "packaged-food:quaker-lower-sugar-maple-brown-sugar-8ct",
  });
  expect(searchFoodCatalog("Post protein oatmeal", [], 20).map((food) => food.id)).toEqual(expect.arrayContaining([
    "packaged-food:premier-protein-apple-cinnamon-oatmeal-6ct",
    "packaged-food:premier-protein-maple-brown-sugar-oatmeal-6ct",
  ]));
});
