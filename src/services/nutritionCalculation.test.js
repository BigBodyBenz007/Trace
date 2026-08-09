import { scaleNutrition } from "./nutritionCalculation";

const nutritionBasis = {
  calories: 105,
  protein: 1.3,
  carbohydrates: 27,
  fat: 0.4,
};

test("returns the canonical nutrition for one serving", () => {
  expect(scaleNutrition(nutritionBasis, 1)).toEqual(nutritionBasis);
});

test("scales nutrition for fractional servings without rounding", () => {
  expect(scaleNutrition(nutritionBasis, 0.5)).toEqual({
    calories: 52.5,
    protein: 0.65,
    carbohydrates: 13.5,
    fat: 0.2,
  });
});

test("scales nutrition for multiple servings", () => {
  expect(scaleNutrition(nutritionBasis, 2)).toEqual({
    calories: 210,
    protein: 2.6,
    carbohydrates: 54,
    fat: 0.8,
  });
});

test("treats invalid or negative amounts and nutrient values as zero", () => {
  expect(scaleNutrition({ calories: "invalid", protein: -2 }, -1)).toEqual({
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
  });
  expect(scaleNutrition(null, "invalid")).toEqual({
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
  });
});
