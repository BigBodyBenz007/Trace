import { getSugarValidationError, scaleNutrition } from "./nutritionCalculation";

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

test("scales optional known nutrients and preserves optional unknown nutrients", () => {
  expect(scaleNutrition({ calories: 170, protein: 9, carbohydrates: 10, fat: 10, sodium: 340 }, 2)).toMatchObject({ sodium: 680 });
  expect(scaleNutrition({ calories: 170, protein: null, carbohydrates: null, fat: null, sodium: null }, 2)).toMatchObject({ protein: null, carbohydrates: null, fat: null, sodium: null });
});

test("scales true-zero sodium without converting unknown sodium", () => {
  expect(scaleNutrition({ calories: 100, protein: 5, carbohydrates: 10, fat: 2, sodium: 0 }, 3).sodium).toBe(0);
  expect(scaleNutrition({ calories: 100, protein: 5, carbohydrates: 10, fat: 2, sodium: null }, 3).sodium).toBeNull();
});

test("scales known sugar for fractional and multiple servings while preserving zero and unknown", () => {
  expect(scaleNutrition({ ...nutritionBasis, totalSugar: 12, addedSugar: 5 }, 0.5)).toMatchObject({
    totalSugar: 6,
    addedSugar: 2.5,
  });
  expect(scaleNutrition({ ...nutritionBasis, totalSugar: 12, addedSugar: 5 }, 2)).toMatchObject({
    totalSugar: 24,
    addedSugar: 10,
  });
  expect(scaleNutrition({ ...nutritionBasis, totalSugar: 0, addedSugar: null }, 3)).toMatchObject({
    totalSugar: 0,
    addedSugar: null,
  });
});

test("validates nonnegative sugar and the added-to-total relationship", () => {
  expect(getSugarValidationError({ totalSugar: "", addedSugar: "" })).toBe("");
  expect(getSugarValidationError({ totalSugar: 0, addedSugar: 0 })).toBe("");
  expect(getSugarValidationError({ totalSugar: -1, addedSugar: 0 })).toBe(
    "Total Sugar must be zero or greater."
  );
  expect(getSugarValidationError({ totalSugar: 4, addedSugar: 5 })).toBe(
    "Added Sugar cannot exceed Total Sugar."
  );
});

test("treats invalid or negative amounts as zero but preserves unknown nutrients", () => {
  expect(scaleNutrition({ calories: "invalid", protein: -2 }, -1)).toEqual({
    calories: null,
    protein: 0,
    carbohydrates: null,
    fat: null,
  });
  expect(scaleNutrition(null, "invalid")).toEqual({
    calories: null,
    protein: null,
    carbohydrates: null,
    fat: null,
  });
});
