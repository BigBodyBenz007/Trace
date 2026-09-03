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
