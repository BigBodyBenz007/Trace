# Barcode serving-panel normalization — 2026-10-23

Development Preview checkpoint. No scoring equations, additive rules, product overrides, provider ranking, historical-entry migration or Production release.

## Demonstrated shared defects and repair

1. The USDA path requested `/foods/search` only. Search supplies rounded per-100 reference nutrients and omits `labelNutrients`. Reconstructing servings from those rounded values discarded the serving panel available at `/food/{fdcId}`. The gateway now retrieves **only the preferred exact USDA record**, once, using the remainder of its existing four-second USDA request budget. FDC ID, equivalent GTIN and Branded type must match. A usable detail serving panel replaces the search panel as a whole, with its own ingredients, dates and assessment observations. No nutrients are borrowed across records. Failed, mismatched, absent or unusable details retain usable search nutrition and valid derivation.
2. Experimental assessment preferred per-100 data even when USDA serving details were available to review/logging. At equal nutrient completeness it now prefers `usda-label-serving`. OFF preference is unchanged: its serving fields can be computed aliases. Scoring calculations and existing contradictory-sugar exclusion remain unchanged.
3. Existing derived USDA caches would bypass the acquisition improvement. They now receive one online evidence refresh per lookup-service session. Offline/failed refresh retains usable cached food. A transient detail failure may retry on a later session rather than being suppressed for the entire cache lifetime. A gateway response does not immediately trigger another evidence refresh. No cache clearing or saved-entry rewriting occurs.

`usdaDetails` retains acquisition status and, when a detail panel is used, the original normalized search food, including raw assessment observations, entered units, serving, ingredients and provenance. It survives browser normalization, cache, selection and new-entry provenance. Original full public provider HTTP bodies are in the regression fixture. Search observations are retained separately, never assessed as an extra independent panel alongside the detail record. Existing source fallback may still choose another complete record under its unchanged usability rules.

USDA endpoint distinction: [official API guide](https://fdc.nal.usda.gov/api-guide/). OFF canonical field semantics: [official product schema](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product/). Neither source establishes the edition on a user's physical package.

## Bun reproduction: two causes, not one

UPC `050400740280`, FDC `2678411`, Bimbo Bakeries USA seeded jumbo burger buns, 65 g/bun. The hosted pre-fix gateway selected exactly this record. The original upstream search response independently reproduces the screenshot. Its detail record has the same identifier and a 2023-10-28 modification date. That provider date does not date the user's package.

| Per bun (65 g) | User's package photo | Search reconstruction before | Detail serving panel after |
|---|---:|---:|---:|
| Calories | 190 | 180.05 | 180 |
| Fat (g) | 3 | 3.003 | 3 |
| Carbohydrates (g) | 33 | 33.02 | 33 |
| Fiber (g) | 2 | 0.975 | 0.975 |
| Protein (g) | 6 | 5.9995 | 6 |
| Sodium (mg) | 340 | 369.85 | 370 |
| Total sugar (g) | 5 | 3.9975 | 4 |
| Added sugar (g) | 4 | Unknown | Unknown |

The search raw values per 100 g are 277 kcal, 4.62 g fat, 50.8 g carbohydrate, 1.5 g fiber, 9.23 g protein, 569 mg sodium, 6.15 g total sugars and 6.2 g added sugars. Multiplication by 0.65 explains the old values; Trace did not misread their units. Added sugar exceeds total sugar, so logging retains unknown; the existing scoring engine excludes it and uses its existing total-sugar fallback. The detail similarly reports 4.03 g added versus 4 g total, preserved as contradictory raw observations rather than guessed or rounded to 4 g. Nutrition remains 45 using the unchanged engine and detail serving panel.

The larger package discrepancies (190 versus 180 calories, 340 versus 370 mg sodium, 2 versus 0.975 g fiber and 5 versus 4 g total sugar) are **already upstream**. The package image establishes the user's observed panel, but this task adds no barcode override and cannot establish every current package edition from the UPC alone. The captured OFF panel is a third observation: per bun 180 kcal, 2.5 g fat, 33 g carbohydrate, 0.975 g fiber, 6 g protein, 290 mg sodium, 3 g total and 1.5 g added sugar. It is not spliced into USDA or selected because its score is higher.

## Bounded cross-product evidence

The new fixture contains original upstream USDA search/detail and OFF bodies for the bun, plus a single bulk USDA detail response for three products already captured in the repository. The earlier Quest/Teddy/Dymatize captures are **normalized gateway responses**, not raw USDA search HTTP bodies. Their retained raw assessment observations permit the comparison below, but retrievals are from different dates; this is not proof of an unchanged current package edition. Controls synthesized by editing a captured body are explicitly named “constructed” in tests.

| Existing product | Earlier captured gateway reconstruction | Captured USDA detail | Effective result/protection |
|---|---|---|---|
| Quest Cookie Dough `888849000012`, FDC 2629232, 60 g | 199.8 kcal; 199.8 mg sodium; 13.98 g fiber | 200 kcal; 200 mg sodium; 14 g fiber | Existing coherent manufacturer replacement still supplies 190 kcal and 220 mg sodium; nutrition 54 / provisional overall 52 |
| Teddy Honey `044000045586`, FDC 2500838, 30 g | 129.9 kcal; 2.001 g protein; 21.99 g carbohydrate; 3.99 g fat | 130 kcal; 2 g protein; 22 g carbohydrate; 4 g fat | Existing partial correction still supplies 7 g added/total sugar; separately attributed manufacturer-reference score 20 |
| Dymatize Cocoa Pebbles `705016356201`, FDC 2665690, 32 g | 24.992 g protein; 179.84 mg sodium | 25 g protein; 180 mg sodium | Facts/logging improve automatically; existing protein-supplement rating boundary remains |

Four original OFF controls are replayed from `docs/barcode-grade-coverage-2026-10-21/raw-responses.jsonl`: Coca-Cola `00049000000443`, SPAM `00037600138727`, Fairlife `0856312002757`, and cereal `0016000435094`. Canonical grams-to-mg conversion and available serving-field precedence already work. Coca-Cola's contradictory added sugar stays excluded by the existing engine; SPAM keeps its 770 mg/56 g manufacturer panel; Fairlife's sodium/salt contradiction remains unknown; the cereal's conflicting measurement basis is not guessed. No shared OFF parser repair was justified. A one-time structural screen of the existing 100 raw OFF captures found six omitted added-sugar outputs; all six already had added sugar exceeding total sugar, rather than a discarded compatible declaration. No full scoring-corpus replay or new product sample was performed.

## Validation and reproduction

- Captured raw bun search -> actual gateway detail request -> review/assessment/selection, retaining original observations.
- Constructed controls: wrong GTIN/FDC ID, missing/partial details, timeout, compatible g/GRM and mL/MLT representations, supported derivation, unknown added sugar, fractional quantities.
- Cache: fresh/reopened agreement, equivalent identifiers, targeted legacy refresh, offline/failure preservation, bounded retry after transient failure.
- Actual Nutrition component -> manual lookup -> review -> Use This Food -> 1.25 servings -> save -> remount/reopen/edit -> 0.5 servings. 370 mg scales to 462.5 mg and 185 mg; nullable added sugar and original search observations survive. Synthetic history is unchanged. Only disposable test storage is used.
- Existing manufacturer, sodium-conflict, scoring-adapter, protein-boundary, CommonJS startup and production-gating checks are reused or rerun as affected. No new dependency or production build is required for local tests.

Focused commands:

```powershell
node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand --runTestsByPath src/services/barcodeServingPipeline.test.js src/services/remoteBarcodeGateway.test.js src/services/remoteBarcodeLookup.test.js src/components/NutritionPage.barcodeServing.test.jsx
```

## Complete patch inventory

- `api/nutrition/_barcodeGateway.cjs`
- `src/services/remoteFoodModel.js`
- `src/services/remoteBarcodeLookup.js`
- `src/services/barcodeNutritionSelection.js`
- `src/services/remoteBarcodeGateway.test.js`
- `src/services/barcodeServingPipeline.test.js`
- `src/services/__fixtures__/barcodeServingEvidence.json`
- `src/components/NutritionPage.jsx`
- `src/components/NutritionPage.barcodeServing.test.jsx`
- `src/development/barcodeNutritionAssessment.js`
- `docs/barcode-serving-normalization-2026-10-23.md`

Generated screenshots, browser profiles, captured hosted checks and temporary diagnostics remain local under `artifacts/barcode-serving-pipeline-20261023/`; they are not commit dependencies. Main/Production and the original 62 unrelated entries remain preserved. Public output remains `grade=null`, `scoreReady=false`; Preview experimental scores are separately gated.
