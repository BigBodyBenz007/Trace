import {
  SERVING_UNIT_OPTIONS,
  createServingDefinition,
  getServingDefinitionError,
} from "./servingDefinition";

test.each([
  ["serving", 1, "1 serving"],
  ["item", 1, "1 item"],
  ["slice", 1, "1 slice"],
  ["cup", 1, "1 cup"],
  ["tbsp", 2, "2 tbsp"],
  ["oz", 4, "4 oz"],
])("creates a %s serving definition", (unit, amount, description) => {
  expect(createServingDefinition({ amount, unit })).toEqual({
    amount,
    unit,
    description,
  });
});

test("preserves decimal serving amounts", () => {
  expect(createServingDefinition({ amount: "1.5", unit: "cup" })).toEqual({
    amount: 1.5,
    unit: "cup",
    description: "1.5 cups",
  });
});

test("sets grams equal to the serving amount for gram servings", () => {
  expect(createServingDefinition({ amount: 100, unit: "g" })).toEqual({
    amount: 100,
    unit: "g",
    description: "100 g",
    grams: 100,
  });
});

test("accepts a meaningful custom serving description", () => {
  expect(
    createServingDefinition({
      amount: 1,
      unit: "custom",
      customDescription: "  1 small homemade patty  ",
    })
  ).toEqual({
    amount: 1,
    unit: "custom",
    description: "1 small homemade patty",
  });
});

test("rejects invalid amounts and meaningless custom descriptions", () => {
  expect(createServingDefinition({ amount: 0, unit: "slice" })).toBeNull();
  expect(createServingDefinition({ amount: -1, unit: "slice" })).toBeNull();
  expect(createServingDefinition({ amount: "", unit: "slice" })).toBeNull();
  expect(
    createServingDefinition({
      amount: 1,
      unit: "custom",
      customDescription: "---",
    })
  ).toBeNull();
  expect(
    getServingDefinitionError({ amount: 0, unit: "serving" })
  ).toBe("Serving amount must be greater than zero.");
});

test("keeps grams optional for non-gram units and accepts them when supplied", () => {
  expect(createServingDefinition({ amount: 1, unit: "slice" })).not.toHaveProperty(
    "grams"
  );
  expect(
    createServingDefinition({ amount: 4, unit: "oz", grams: 113.398 })
  ).toMatchObject({ grams: 113.398 });
});

test("publishes the approved stable serving unit keys", () => {
  expect(SERVING_UNIT_OPTIONS.map(({ value }) => value)).toEqual([
    "serving",
    "item",
    "slice",
    "cup",
    "tbsp",
    "oz",
    "g",
    "custom",
  ]);
});
