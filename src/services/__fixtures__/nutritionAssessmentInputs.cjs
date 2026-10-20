// All products and numbers are SYNTHETIC test data, not real product observations.
const BARCODE = "00012345600012";
const RETRIEVED_AT = "2026-10-19T12:00:00.000Z";
const SCHEMA_SOURCES = Object.freeze([
  "https://fdc.nal.usda.gov/GBFPD_Documentation/",
  "https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product/",
]);

function usdaRecord(overrides = {}) {
  return {
    fdcId: 100, dataType: "Branded", gtinUpc: BARCODE,
    description: "Synthetic assessment fixture", brandOwner: "Trace synthetic fixtures",
    servingSize: 30, servingSizeUnit: "g", householdServingFullText: "30 g",
    marketCountry: "United States", foodCategory: "Synthetic cereal",
    modifiedDate: "2026-10-01", publicationDate: "2026-09-01",
    ingredients: "Synthetic whole oats and sugar", packageWeight: "300 g",
    labelNutrients: {
      calories: { value: 120 }, saturatedFat: { value: 0.6 }, addedSugar: { value: 4.5 },
      sugars: { value: 6 }, sodium: { value: 150 }, fiber: { value: 3 },
      protein: { value: 3 }, fat: { value: 2.4 }, carbohydrates: { value: 21 },
    },
    foodNutrients: [
      { nutrientName: "Energy", unitName: "KCAL", value: 400 },
      { nutrientName: "Fatty acids, total saturated", unitName: "G", value: 2 },
      { nutrientName: "Added Sugars", unitName: "G", value: 15 },
      { nutrientName: "Total Sugars", unitName: "G", value: 20 },
      { nutrientName: "Sodium, Na", unitName: "MG", value: 500 },
      { nutrientName: "Fiber, total dietary", unitName: "G", value: 10 },
      { nutrientName: "Protein", unitName: "G", value: 10 },
      { nutrientName: "Total lipid (fat)", unitName: "G", value: 8 },
      { nutrientName: "Carbohydrate, by difference", unitName: "G", value: 70 },
    ], ...overrides,
  };
}

function offRecord(overrides = {}) {
  return {
    code: BARCODE, product_name: "Synthetic assessment fixture", brands: "Trace synthetic fixtures",
    countries_tags: ["en:united-states"], categories_tags: ["en:breakfast-cereals"],
    ingredients_text: "Synthetic whole oats and sugar", lang: "en", additives_tags: ["en:e330"],
    nutrition_data_per: "100g", serving_size: "30 g", serving_quantity: 30,
    serving_quantity_unit: "g", quantity: "300 g", servings_per_container: 10,
    last_modified_datetime: "2026-10-01T00:00:00.000Z",
    nutriments: { "energy-kcal_100g": 400, "saturated-fat_100g": 2,
      "added-sugars_100g": 15, sugars_100g: 20, sodium_100g: 0.5,
      fiber_100g: 10, proteins_100g: 10, fat_100g: 8, carbohydrates_100g: 70 },
    ...overrides,
  };
}

// Deliberately varied synthetic label patterns, not sampled product composition.
function usdaCategory(category, amounts, servingSize, servingSizeUnit = "g") {
  const keys = ["calories", "saturatedFat", "addedSugar", "sugars", "sodium", "fiber", "protein", "fat", "carbohydrates"];
  return usdaRecord({ description: `Synthetic ${category}`, foodCategory: category,
    ingredients: `Synthetic ${category} ingredient fixture`, servingSize, servingSizeUnit,
    householdServingFullText: `${servingSize} ${servingSizeUnit}`, foodNutrients: [],
    labelNutrients: Object.fromEntries(keys.map((key, index) => [key, { value: amounts[index] }])) });
}

const COVERAGE_FIXTURES = Object.freeze([
  ["sugary-beverage", "usda-fdc", usdaCategory("Soft Drinks", [140, 0, 32, 32, 25, 0, 0, 0, 36], 355, "ml")],
  ["breakfast-cereal", "open-food-facts", offRecord()],
  ["yogurt", "usda-fdc", usdaCategory("Yogurt", [100, 0, 0, 8, 55, 0, 10, 0, 15], 170)],
  ["protein-bar", "open-food-facts", offRecord({ categories_tags: ["en:protein-bars"],
    nutriments: { "energy-kcal_100g": 500, "saturated-fat_100g": 10, "added-sugars_100g": 15,
      sugars_100g: 20, sodium_100g: 0.3, fiber_100g: 10, proteins_100g: 30, fat_100g: 25, carbohydrates_100g: 30 } })],
  ["frozen-meal", "usda-fdc", usdaCategory("Frozen meals", [280, 3, 1, 5, 550, 5, 15, 10, 33], 300)],
  ["nuts", "open-food-facts", offRecord({ categories_tags: ["en:nuts"], serving_size: "28 g", serving_quantity: 28,
    nutriments: { "energy-kcal_100g": 600, "saturated-fat_100g": 7, "added-sugars_100g": 0,
      sugars_100g: 4, sodium_100g: 0.01, fiber_100g: 10, proteins_100g: 21, fat_100g: 50, carbohydrates_100g: 20 } })],
  ["processed-meat", "usda-fdc", usdaCategory("Processed meats", [90, 2, 1, 1, 380, 0, 7, 6, 2], 30)],
  ["packaged-fresh-produce", "usda-fdc", usdaCategory("Fresh produce", [70, 0, 0, 10, 0, 4, 1, 0, 18], 140)],
  ["missing-nutrients", "usda-fdc", usdaRecord({ labelNutrients: undefined,
    foodNutrients: [{ nutrientName: "Protein", unitName: "G", value: 2 }] })],
  ["unknown-market", "open-food-facts", offRecord({ countries_tags: undefined })],
].map(([id, provider, product]) => ({ id, fixtureType: "synthetic", provider,
  attribution: "Trace synthetic schema fixtures; no real product or population coverage claim",
  schemaSources: SCHEMA_SOURCES, product })));

module.exports = { BARCODE, RETRIEVED_AT, SCHEMA_SOURCES, usdaRecord, offRecord, COVERAGE_FIXTURES };
