import { formatNutrientValue } from "./nutritionDisplay";

test.each([
  ["sodium", 223.79999999999998, " mg", "223.8 mg"],
  ["sodium", 224, " mg", "224 mg"],
  ["calories", 360.59999999999997, "", "360.6"],
  ["protein", 76.55999999999999, " g", "76.56 g"],
  ["carbohydrates", 5.999999999999993, " g", "6 g"],
  ["fat", 6.569999999999999, " g", "6.57 g"],
  ["fiber", 2.0000000000000004, " g", "2 g"],
  ["totalSugar", 3.000000000000003, " g", "3 g"],
  ["addedSugar", 0, " g", "0 g"],
  ["caffeine", 22.399999999999995, " mg", "22.4 mg"],
  ["protein", null, " g", "Unknown"],
  ["sodium", undefined, " mg", "Unknown"],
])("formats %s value %p for display", (nutrient, value, unit, expected) => {
  expect(formatNutrientValue(value, nutrient, unit)).toBe(expected);
});
