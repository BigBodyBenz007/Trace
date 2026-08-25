# Grocery food catalog

Trace ships a versioned, read-only grocery seed catalog so ordinary Nutrition
search stays local-first and works offline. The browser never calls USDA and no
FoodData Central API key is present in the application bundle. User-created
foods remain separate in the `userFoods` localStorage collection and are the
only grocery catalog records included in Trace backups.

## Source and data contract

Version 1 contains 460 curated foods from USDA FoodData Central Foundation
Foods (April 2026) and SR Legacy (April 2018). It is split into eight generated
category modules so the reviewed batch remains navigable:

- 85 protein foods
- 50 seafood foods
- 55 egg and dairy foods
- 55 fruits
- 75 vegetables
- 75 grains, starches, and legumes
- 20 fats and oils
- 45 pantry foods

- API and key guidance: <https://fdc.nal.usda.gov/api-guide/>
- Official downloads: <https://fdc.nal.usda.gov/download-datasets/>
- Suggested USDA citation: U.S. Department of Agriculture, Agricultural
  Research Service. FoodData Central, 2019. <https://fdc.nal.usda.gov/>

USDA data are public domain under CC0. Each runtime record keeps its FDC ID,
source description, USDA data type/release, catalog version, practical serving,
preparation state, and nullable nutrients. Missing values remain `null`; an
explicit USDA zero remains `0`. A record is `partial` whenever any displayed
nutrient is unknown and lists those fields in `provenance.unknownNutrients`.

The complete source batch remains normalized and addressable for provenance
tests, but ordinary Nutrition search applies an ingredient-only eligibility
policy. Raw, uncooked, dried, basic as-sold ingredients, safe unprepared frozen
foods, and standalone cooking fats remain searchable. Cooked, fried, baked,
roasted, boiled, grilled, breaded, marinated, prepared-meal, and similar records
are excluded from USDA grocery search. Filtering does not mutate or delete a
source record and cannot alter an immutable nutrition snapshot already saved in
`nutritionEntries`.

Generic raw and cooked foods retain separate FDC records and stable IDs in the
source batch; they are never merged. Search aliases may describe a cut form,
such as raw chicken breast strips, but do not transfer nutrition between forms.
Cooking additions are also never attached to another food. Olive, avocado,
canola, vegetable/soybean, coconut, sesame, peanut, and sunflower oils plus
butter, ghee, lard, vegetable shortening, and a USDA cooking-spray record remain
standalone search results with their own exact serving and nutrient data.

## Regenerating the checked-in seed

1. Download the official Foundation Foods JSON and SR Legacy JSON archives.
2. Extract both archives outside the runtime source tree.
3. Run:

   ```powershell
   node scripts/import-usda-grocery-catalog.mjs `
     <path-to-sr-legacy.json> `
     <path-to-foundation-foods.json>
   ```

The script preserves the original reviewed FDC IDs, pins complete USDA records
for the common standalone oils and fats, fills fixed category quotas
through deterministic description rules, and writes the small
`src/data/groceryFoods.v1.js` index plus eight
`src/data/groceryFoods.v1.<category>.js` modules. A dataset change cannot alter
the checked-in app until the generated diff is reviewed. The generator rejects
an incomplete category quota. Review every generated name, source description,
serving, preparation/form state, alias, nullable nutrient, and duplicate check
before accepting output. Then run the grocery catalog, food search, Nutrition,
backup, App, full-suite, build, and browser validation checks.

To add branded grocery records later, create a new catalog version and keep the
brand plus the exact FDC branded identifier. Do not treat a branded product as
interchangeable with a generic USDA food solely because their names are alike.
