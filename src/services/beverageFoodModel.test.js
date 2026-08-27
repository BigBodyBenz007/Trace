import beverageFoods from "../data/beverageFoods";
import {
  BEVERAGE_CATEGORIES,
  normalizeBeverageFood,
  normalizeBeverageFoods,
  validateBeverageCatalog,
} from "./beverageFoodModel";

const NUTRIENT_KEYS = [
  "calories",
  "protein",
  "carbohydrates",
  "fat",
  "sodium",
  "totalSugar",
  "addedSugar",
];

test("the Phase 1 catalog contains valid, unique, officially sourced packaged drinks", () => {
  expect(beverageFoods).toHaveLength(135);
  expect(validateBeverageCatalog(beverageFoods)).toEqual([]);
  expect(new Set(beverageFoods.map(({ id }) => id)).size).toBe(beverageFoods.length);

  beverageFoods.forEach((food) => {
    expect(food).toEqual(expect.objectContaining({
      id: expect.stringMatching(/^beverage:/),
      brand: expect.any(String),
      name: expect.any(String),
      category: expect.stringMatching(new RegExp(`^(${Object.keys(BEVERAGE_CATEGORIES).join("|")})$`)),
      serving: expect.objectContaining({ description: expect.any(String) }),
      beverage: expect.objectContaining({ packageSize: expect.any(String) }),
      provenance: expect.objectContaining({
        source: "official-manufacturer",
        sourceId: expect.any(String),
        verification: expect.objectContaining({
          sourceType: "official-manufacturer",
          sourceUrl: expect.stringMatching(/^https:\/\//),
          sourceReference: expect.any(String),
          accessedAt: "2026-08-26",
        }),
      }),
    }));
    expect(Object.keys(food.nutrients)).toEqual(NUTRIENT_KEYS);
    Object.values(food.nutrients).forEach((value) => {
      expect(value === null || (Number.isFinite(value) && value >= 0)).toBe(true);
    });
    expect(food.beverage.caffeineMg === null || (Number.isFinite(food.beverage.caffeineMg) && food.beverage.caffeineMg >= 0)).toBe(true);
  });
});

test("normalization preserves known zeroes, caffeine, and genuinely unknown nutrients", () => {
  const normalized = normalizeBeverageFoods(beverageFoods);
  const monster = normalized.find(({ id }) => id === "beverage:monster:ultra-zero-16oz");
  const coke = normalized.find(({ id }) => id === "beverage:coca-cola:original-20oz");

  expect(normalized).toHaveLength(beverageFoods.length);
  expect(monster).toMatchObject({
    sourceType: "beverage",
    categoryLabel: "Energy Drink",
    nutrients: { calories: 10, protein: null, carbohydrates: null, totalSugar: 0, addedSugar: null },
    beverage: { packageSize: "16 fl oz can", caffeineMg: 150 },
    provenance: { completeness: "partial", verification: { status: "partial" } },
  });
  expect(coke.beverage.caffeineMg).toBeNull();
});

test("validation rejects duplicate IDs, duplicate product definitions, and invalid numerics", () => {
  const first = beverageFoods[0];
  const duplicateId = { ...beverageFoods[1], id: first.id };
  const duplicateProduct = { ...beverageFoods[1], id: "beverage:test:duplicate", brand: first.brand, name: first.name, serving: first.serving };
  const invalidNumeric = { ...beverageFoods[2], id: "beverage:test:invalid", nutrients: { ...beverageFoods[2].nutrients, sodium: -1 } };
  const errors = validateBeverageCatalog([first, duplicateId, duplicateProduct, invalidNumeric]);

  expect(errors).toEqual(expect.arrayContaining([
    expect.stringContaining("Duplicate beverage ID"),
    expect.stringContaining("Duplicate beverage product"),
    expect.stringContaining("invalid sodium"),
  ]));
  expect(normalizeBeverageFood({ ...first, category: "alcohol" })).toBeNull();
});

test("the catalog covers every Phase 1 category and a broad brand set", () => {
  const categoryCounts = beverageFoods.reduce((counts, { category }) => ({
    ...counts,
    [category]: (counts[category] || 0) + 1,
  }), {});
  const brands = new Set(beverageFoods.map(({ brand }) => brand));

  expect(categoryCounts).toEqual({
    soda: 29,
    energy: 36,
    "sports-hydration": 24,
    "ready-to-drink-coffee": 17,
    tea: 26,
    other: 3,
  });
  expect(brands.size).toBeGreaterThanOrEqual(20);
  ["Coca-Cola", "Pepsi", "Monster Energy", "Red Bull", "Gatorade", "Powerade", "Starbucks", "Pure Leaf", "Gold Peak"].forEach((brand) => {
    expect(brands).toContain(brand);
  });
});
