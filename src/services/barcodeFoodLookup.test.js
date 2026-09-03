import beverageFoods from "../data/beverageFoods";
import { lookupCatalogFoodByBarcode } from "./barcodeFoodLookup";
import { normalizeBeverageFoods } from "./beverageFoodModel";
import { searchFoodCatalog } from "./foodSearch";

test("promotes all 54 reviewed PepsiCo GTINs without changing their provenance", () => {
  const candidates = beverageFoods.filter((food) =>
    /[?&]gtin=\d+/.test(food.provenance.verification.sourceUrl)
  );

  expect(candidates).toHaveLength(54);
  expect(candidates.filter((food) => food.identifiers?.length)).toHaveLength(54);
  expect(new Set(candidates.map((food) => food.identifiers[0].value)).size).toBe(54);

  candidates.forEach((food) => {
    const identifier = food.identifiers[0];
    const sourceGtin = new URL(food.provenance.verification.sourceUrl)
      .searchParams.get("gtin");

    expect(identifier).toEqual({ scheme: "gtin", value: sourceGtin });
    expect(food.provenance.verification.sourceReference).toContain(`GTIN ${sourceGtin}`);
    expect(lookupCatalogFoodByBarcode(sourceGtin)).toMatchObject({
      status: "found",
      food: { id: food.id },
    });
  });
});

test("looks up representative promoted drinks using GTIN and equivalent UPC-A input", () => {
  expect(lookupCatalogFoodByBarcode("00012000001291")).toMatchObject({
    status: "found",
    identifier: { scheme: "gtin", value: "00012000001291" },
    food: { id: "beverage:pepsi:pepsi-20oz", name: "Pepsi" },
  });
  expect(lookupCatalogFoodByBarcode("0 12000-00129 1")).toMatchObject({
    status: "found",
    identifier: { scheme: "gtin", value: "012000001291" },
    food: { id: "beverage:pepsi:pepsi-20oz" },
  });
  expect(lookupCatalogFoodByBarcode("00052000324815").food.id)
    .toBe("beverage:gatorade:cool-blue-20oz");
  expect(lookupCatalogFoodByBarcode("00012000016721").food.id)
    .toBe("beverage:starbucks:frappuccino-caramel-13-7oz");
});

test("returns safe invalid and not-found results without throwing", () => {
  expect(lookupCatalogFoodByBarcode("not-a-barcode")).toEqual({
    status: "invalid",
    identifier: null,
    food: null,
  });
  expect(lookupCatalogFoodByBarcode(12000001291)).toEqual({
    status: "invalid",
    identifier: null,
    food: null,
  });
  expect(lookupCatalogFoodByBarcode("00000000000000")).toEqual({
    status: "not-found",
    identifier: { scheme: "gtin", value: "00000000000000" },
    food: null,
  });
});

test("beverage normalization preserves identifiers and legacy records remain identifier-free", () => {
  const normalized = normalizeBeverageFoods(beverageFoods);
  expect(normalized.find((food) => food.id === "beverage:pepsi:pepsi-20oz").identifiers)
    .toEqual([{ scheme: "gtin", value: "00012000001291" }]);
  expect(normalized.find((food) => food.id === "beverage:coca-cola:original-20oz"))
    .not.toHaveProperty("identifiers");
});

test("existing food search ranking is unchanged and structured identifiers survive results", () => {
  const results = searchFoodCatalog("pepsi", [], 20);
  expect(results.map(({ id }) => id)).toEqual([
    "beverage:pepsi:pepsi-20oz",
    "beverage:pepsi:wild-cherry-20oz",
    "beverage:pepsi:zero-sugar-20oz",
    "beverage:pepsi:diet-pepsi-20oz",
  ]);
  expect(results[0].identifiers).toEqual([
    { scheme: "gtin", value: "00012000001291" },
  ]);
});
