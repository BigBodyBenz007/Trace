import { validateTraceStructuredDomains } from "./traceBackupValidation";

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

test.each([
  [{ nutritionEntries: [{ id: "entry:negative", totalSugar: -1 }] }, "totalSugar"],
  [{ nutritionEntries: [{ id: "entry:relation", totalSugar: 2, addedSugar: 3 }] }, "addedSugar greater than totalSugar"],
  [{ nutritionEntries: [{ id: "entry:basis", nutritionBasis: { totalSugar: 1, addedSugar: 2 } }] }, "addedSugar greater than totalSugar"],
  [{ userFoods: [{ id: "food:negative", nutrients: { addedSugar: -1 } }] }, "addedSugar"],
])("rejects invalid sugar data in backup Nutrition records", (data, message) => {
  expect(() => validateTraceStructuredDomains(data)).toThrow(message);
});
