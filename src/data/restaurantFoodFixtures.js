// Synthetic values belong in tests only and are never imported by production search.
const restaurantFoodFixtures = [
  { id: "fixture:restaurant:mcdonalds:nuggets", restaurant: { id: "mcdonalds", name: "McDonald's" }, name: "Chicken McNuggets", serving: { amount: 4, unit: "item", description: "4 piece serving" }, nutrients: { calories: 170, protein: 9, carbohydrates: 10, fat: 10 }, provenance: { source: "test-fixture", sourceId: "fixture:restaurant:mcdonalds:nuggets", confidence: "test-fixture", verification: { status: "fixture", sourceType: "fixture", sourceUrl: null } } },
];

export default restaurantFoodFixtures;
