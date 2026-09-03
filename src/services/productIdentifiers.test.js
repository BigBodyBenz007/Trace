import {
  SUPPORTED_GTIN_LENGTHS,
  canonicalGtinKey,
  createProductIdentifierIndex,
  hasValidGtinCheckDigit,
  normalizeGtin,
  normalizeProductIdentifiers,
} from "./productIdentifiers";
import { normalizeBeverageFood } from "./beverageFoodModel";
import { normalizeGroceryFood } from "./groceryFoodCatalog";
import { normalizeRestaurantFood } from "./restaurantFoodModel";
import { createUserFood } from "./userFoodCatalog";

const identifier = [{ scheme: "gtin", value: "00012000001291" }];

function beverageRecord(identifiers = identifier) {
  return {
    id: "beverage:test",
    brand: "Test",
    name: "Drink",
    category: "soda",
    serving: { amount: 1, unit: "item", description: "1 bottle" },
    nutrients: {},
    beverage: { packageSize: "1 bottle", caffeineMg: null },
    identifiers,
    provenance: {
      sourceId: "beverage:test",
      verification: { sourceUrl: "https://example.com/drink" },
    },
  };
}

function groceryRecord(identifiers = identifier) {
  return {
    fdcId: 1,
    name: "Test grocery",
    category: "pantry",
    preparationState: "ready-to-use",
    serving: { amount: 1, unit: "item", description: "1 item", grams: 10 },
    nutrientsPer100g: {},
    identifiers,
  };
}

function restaurantRecord(identifiers = identifier) {
  return {
    id: "restaurant:test",
    restaurant: { id: "test", name: "Test" },
    name: "Restaurant item",
    serving: { amount: 1, unit: "item", description: "1 item" },
    nutrients: {},
    identifiers,
    provenance: {},
  };
}

test("supports GTIN-8, UPC-A, EAN-13, and GTIN-14 while preserving leading zeroes", () => {
  expect(SUPPORTED_GTIN_LENGTHS).toEqual([8, 12, 13, 14]);
  expect(normalizeGtin("96385074")).toBe("96385074");
  expect(normalizeGtin("0 12000-00129 1")).toBe("012000001291");
  expect(normalizeGtin("0 012000001291")).toBe("0012000001291");
  expect(normalizeGtin("  00012000001291  ")).toBe("00012000001291");
});

test("validates GS1 check digits and rejects lossy or malformed input", () => {
  expect(hasValidGtinCheckDigit("00012000001291")).toBe(true);
  expect(hasValidGtinCheckDigit("00012000001290")).toBe(false);
  expect(normalizeGtin("00012000001290")).toBeNull();
  expect(normalizeGtin("1234567")).toBeNull();
  expect(normalizeGtin("0001200000129A")).toBeNull();
  expect(normalizeGtin(12000001291)).toBeNull();
  expect(normalizeGtin("")).toBeNull();
});

test("normalizes the optional identifier contract and rejects duplicate equivalents", () => {
  expect(normalizeProductIdentifiers(undefined)).toEqual([]);
  expect(normalizeProductIdentifiers([
    { scheme: "gtin", value: "0 12000-00129 1" },
  ])).toEqual([{ scheme: "gtin", value: "012000001291" }]);
  expect(normalizeProductIdentifiers([{ scheme: "upc", value: "012000001291" }])).toBeNull();
  expect(normalizeProductIdentifiers([
    { scheme: "gtin", value: "012000001291" },
    { scheme: "gtin", value: "00012000001291" },
  ])).toBeNull();
});

test("uses a common GTIN-14 key and prevents cross-catalog collisions", () => {
  expect(canonicalGtinKey("012000001291")).toBe("gtin:00012000001291");
  expect(canonicalGtinKey("00012000001291")).toBe("gtin:00012000001291");

  expect(() => createProductIdentifierIndex([
    { id: "beverage:one", identifiers: [{ scheme: "gtin", value: "012000001291" }] },
    { id: "grocery:two", identifiers: [{ scheme: "gtin", value: "00012000001291" }] },
  ])).toThrow("Product identifier collision");
});

test("preserves valid identifiers through every applicable food normalizer", () => {
  const beverage = normalizeBeverageFood(beverageRecord());
  const grocery = normalizeGroceryFood(groceryRecord());
  const restaurant = normalizeRestaurantFood(restaurantRecord());
  const userFood = createUserFood(
    "User product",
    {},
    { amount: 1, unit: "item", description: "1 item" },
    { identifiers: identifier }
  );

  [beverage, grocery, restaurant, userFood].forEach((food) => {
    expect(food.identifiers).toEqual(identifier);
  });
});

test("rejects malformed identifiers in every applicable food normalizer", () => {
  const invalid = [{ scheme: "gtin", value: "00012000001290" }];
  expect(normalizeBeverageFood(beverageRecord(invalid))).toBeNull();
  expect(normalizeGroceryFood(groceryRecord(invalid))).toBeNull();
  expect(normalizeRestaurantFood(restaurantRecord(invalid))).toBeNull();
  expect(createUserFood("Invalid product", {}, undefined, { identifiers: invalid })).toBeNull();
});
