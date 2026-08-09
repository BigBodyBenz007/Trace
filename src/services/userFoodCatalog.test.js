import {
  USER_FOODS_STORAGE_KEY,
  addUserFood,
  createUserFood,
  readUserFoods,
  writeUserFoods,
} from "./userFoodCatalog";

const nutrients = {
  calories: 350,
  protein: 22,
  carbohydrates: 18,
  fat: 20,
};

beforeEach(() => {
  localStorage.clear();
});

test("creates a reusable one-serving food with user-added provenance", () => {
  expect(createUserFood("  Meatloaf  ", nutrients)).toEqual({
    id: "user-added:meatloaf",
    name: "Meatloaf",
    serving: {
      amount: 1,
      unit: "serving",
      description: "1 serving",
    },
    nutrients,
    provenance: {
      source: "user-added",
      sourceId: "meatloaf",
      confidence: "user-added",
    },
  });
});

test("persists and reads user foods from their own storage key", () => {
  const food = createUserFood("Meatloaf", nutrients);

  writeUserFoods(localStorage, [food]);

  expect(JSON.parse(localStorage.getItem(USER_FOODS_STORAGE_KEY))).toEqual([
    food,
  ]);
  expect(readUserFoods(localStorage)).toEqual([food]);
});

test("prevents duplicate user foods by normalized name and keeps first values", () => {
  const original = createUserFood("Meatloaf", nutrients);
  const replacement = createUserFood("  MEATLOAF ", {
    ...nutrients,
    calories: 500,
  });

  expect(addUserFood([original], replacement)).toEqual({
    foods: [original],
    added: false,
  });
});
