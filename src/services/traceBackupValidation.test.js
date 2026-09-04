import {
  normalizeNutritionEntryPortions,
  validateTraceStructuredDomains,
} from "./traceBackupValidation";

function providerFood(barcode = "012000001291") {
  return {
    sourceType: "remote-barcode",
    dataType: "branded",
    identifiers: [{ scheme: "gtin", value: barcode }],
    provider: { id: "usda-fdc", recordId: "123", attribution: "USDA FoodData Central" },
    brand: "Brand",
    name: "Food",
    packageQuantity: null,
    serving: { description: "30 g", amount: 30, unit: "g", grams: 30 },
    servingsPerContainer: null,
    nutrients: {
      calories: null,
      protein: 4,
      carbohydrates: 8,
      fat: 2,
      fiber: null,
      sodium: 25,
      totalSugar: 3,
      addedSugar: null,
    },
    dataBasis: "serving",
    completeness: "insufficient",
    unknownFields: [
      "packageQuantity",
      "servingsPerContainer",
      "nutrients.calories",
      "nutrients.fiber",
      "nutrients.addedSugar",
      "provenance.revisionDate",
    ],
    logReady: false,
    provenance: {
      sourceUrl: "https://fdc.nal.usda.gov/food-details/123/nutrients",
      provider: "USDA FoodData Central",
      providerRecordId: "123",
      attribution: "USDA FoodData Central (public domain / CC0)",
      revisionDate: null,
      retrievedAt: "2026-09-03T12:00:00.000Z",
    },
  };
}

test("accepts normalized product identifiers and legacy Nutrition records without them", () => {
  expect(() => validateTraceStructuredDomains({
    userFoods: [
      { id: "food:legacy" },
      {
        id: "food:identified",
        identifiers: [{ scheme: "gtin", value: "96385074" }],
      },
    ],
    nutritionEntries: [
      { id: "entry:legacy" },
      {
        id: "entry:identified",
        foodReference: {
          identifiers: [{ scheme: "gtin", value: "00012000001291" }],
        },
      },
    ],
  })).not.toThrow();
});

test("rejects malformed or non-normalized product identifiers in backups", () => {
  expect(() => validateTraceStructuredDomains({
    userFoods: [{
      id: "food:invalid",
      identifiers: [{ scheme: "gtin", value: "00012000001290" }],
    }],
  })).toThrow("invalid user food product identifiers");

  expect(() => validateTraceStructuredDomains({
    nutritionEntries: [{
      id: "entry:non-normalized",
      foodReference: {
        identifiers: [{ scheme: "gtin", value: "0 12000-00129 1" }],
      },
    }],
  })).toThrow("invalid nutrition entry food reference product identifiers");
});

test("accepts legacy, partial, and explicit-zero sugar data in Nutrition backups", () => {
  expect(() => validateTraceStructuredDomains({
    userFoods: [
      { id: "food:legacy", nutrients: { calories: 10 } },
      { id: "food:sugar", nutrients: { totalSugar: 4, addedSugar: 0 } },
    ],
    nutritionEntries: [
      { id: "entry:legacy" },
      { id: "entry:partial", totalSugar: 4, addedSugar: null },
      {
        id: "entry:basis",
        totalSugar: 0,
        addedSugar: 0,
        nutritionBasis: { totalSugar: 0, addedSugar: 0 },
      },
    ],
  })).not.toThrow();
});

test("preserves historical and unknown portion shapes while accepting explicit zero and fractions", () => {
  const entries = [
    { id: "entry:pre-portion" },
    { id: "entry:null-portion", portion: null },
    { id: "entry:missing-amount", portion: { unit: "serving" } },
    { id: "entry:null-amount", portion: { amount: null } },
    { id: "entry:blank-amount", portion: { amount: "" } },
    { id: "entry:space-amount", portion: { amount: "   " } },
    { id: "entry:zero", portion: { amount: 0 } },
    { id: "entry:fraction", portion: { amount: 0.5 } },
    { id: "entry:whole", portion: { amount: 2 } },
  ];

  expect(normalizeNutritionEntryPortions(entries)).toBe(entries);
  expect(() => validateTraceStructuredDomains({ nutritionEntries: entries })).not.toThrow();
});

test("canonicalizes only unambiguous nonnegative numeric-string portion amounts", () => {
  const entries = [
    { id: "entry:string-zero", portion: { amount: "0", unit: "serving" } },
    { id: "entry:string-fraction", portion: { amount: "0.25", unit: "serving" } },
    { id: "entry:string-whole", portion: { amount: "2", unit: "serving" } },
    { id: "entry:string-exponent", portion: { amount: "1e2", unit: "serving" } },
  ];

  const normalized = normalizeNutritionEntryPortions(entries);

  expect(normalized.map((entry) => entry.portion.amount)).toEqual([0, 0.25, 2, 100]);
  expect(entries.map((entry) => entry.portion.amount)).toEqual(["0", "0.25", "2", "1e2"]);
  expect(() => validateTraceStructuredDomains({ nutritionEntries: normalized })).not.toThrow();
});

test.each([
  ["negative number", -1],
  ["negative numeric string", "-1"],
  ["nonfinite number", Infinity],
  ["nonfinite numeric string", "1e999"],
  ["padded numeric string", " 1 "],
  ["leading-zero numeric string", "01"],
  ["fraction expression", "1/2"],
  ["boolean", true],
])("rejects an unrecognized %s portion amount", (label, amount) => {
  expect(() => normalizeNutritionEntryPortions([{
    id: `entry:${label}`,
    portion: { amount },
  }])).toThrow("unrecognized portion for a Nutrition entry");
});

test("identifies an unrepairable Nutrition entry without exposing its private notes", () => {
  const record = {
    id: "meal-stable-17",
    name: "Morning oats",
    loggedAt: "2026-08-09T13:15:00.000Z",
    notes: "private note must not appear",
    portion: { amount: { approximate: 1 } },
  };

  expect(() => normalizeNutritionEntryPortions([record])).toThrow(
    /Morning oats.*date 2026-08-09.*ID meal-stable-17/
  );
  try {
    normalizeNutritionEntryPortions([record]);
  } catch (error) {
    expect(error.message).toContain("edit and save this entry");
    expect(error.message).toContain("delete only this entry");
    expect(error.message).not.toContain(record.notes);
  }
});

test.each([
  [{ nutritionEntries: [{ id: "entry:negative", totalSugar: -1 }] }, "totalSugar"],
  [{ nutritionEntries: [{ id: "entry:relation", totalSugar: 2, addedSugar: 3 }] }, "addedSugar greater than totalSugar"],
  [{ nutritionEntries: [{ id: "entry:basis", nutritionBasis: { totalSugar: 1, addedSugar: 2 } }] }, "addedSugar greater than totalSugar"],
  [{ userFoods: [{ id: "food:negative", nutrients: { addedSugar: -1 } }] }, "addedSugar"],
])("rejects invalid sugar data in backup Nutrition records", (data, message) => {
  expect(() => validateTraceStructuredDomains(data)).toThrow(message);
});

test("accepts a barcode-linked custom food with a matching immutable provider snapshot", () => {
  expect(() => validateTraceStructuredDomains({
    userFoods: [{
      id: "user-added:barcode:gtin:00012000001291",
      identifiers: [{ scheme: "gtin", value: "012000001291" }],
      serving: { amount: 1, unit: "serving", description: "1 serving", grams: 30 },
      packaged: { packageSize: "5 oz", servingsPerContainer: 1 },
      nutrients: { calories: 100, protein: 4, carbohydrates: 8, fat: 2 },
      providerSourceSnapshot: providerFood(),
    }],
  })).not.toThrow();
});

test("rejects duplicate barcode identities and mismatched or malformed provider mappings", () => {
  expect(() => validateTraceStructuredDomains({
    userFoods: [
      { id: "one", identifiers: [{ scheme: "gtin", value: "012000001291" }] },
      { id: "two", identifiers: [{ scheme: "gtin", value: "00012000001291" }] },
    ],
  })).toThrow("duplicate user food barcodes");

  expect(() => validateTraceStructuredDomains({
    userFoods: [{
      id: "mismatch",
      identifiers: [{ scheme: "gtin", value: "00000000000000" }],
      providerSourceSnapshot: providerFood(),
    }],
  })).toThrow("mismatched user food barcode");

  expect(() => validateTraceStructuredDomains({
    userFoods: [{
      id: "malformed",
      identifiers: [{ scheme: "gtin", value: "012000001291" }],
      providerSourceSnapshot: { ...providerFood(), logReady: true },
    }],
  })).toThrow("invalid user food provider source");
});

test("rejects negative or nonfinite user-food nutrition and invalid package quantities", () => {
  expect(() => validateTraceStructuredDomains({
    userFoods: [{ id: "negative", nutrients: { calories: -1 } }],
  })).toThrow("invalid user food nutrients calories");
  expect(() => validateTraceStructuredDomains({
    userFoods: [{ id: "package", packaged: { servingsPerContainer: 0 } }],
  })).toThrow("invalid user food package servingsPerContainer");
});
