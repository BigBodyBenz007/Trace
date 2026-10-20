# Development-only barcode nutrition review

This opt-in integration is for local research, not consumer grading. It reuses
the existing scanner, lookup, selected-product assessment inputs and the independent Trace US nutrition
experiment described in [the current methodology](trace-nutrition-v2.md). No research product is
matched by name, and no USDA reference is silently substituted for a scan.

## Access and local review

For actual lookup data, start the existing application:

```powershell
npm start
```

Open `http://localhost:3000/?barcodeGrading=1`, navigate to Nutrition, choose
Scan Barcode and use the existing camera, photo or manual barcode workflow.
Lookup configuration and provider availability are unchanged. The flag must
be present in the URL while opening the scanner. It is not stored.

For an offline, reproducible review without a camera or provider service:

```powershell
node scripts/verify-barcode-grading.cjs --serve
```

Open `http://127.0.0.1:4175/?barcodeGrading=1`. Choose Scan Barcode, enter
`00012345600012`, then Look Up Barcode. The fixture is explicitly synthetic,
not a manufacturer observation. Add `&scenario=unresolved` or
`&scenario=unknown-additives` to inspect missing-data states. Add `&theme=river`
or another existing theme ID. Use This Food opens the real Nutrition form;
changing the number of servings and saving exercises the real calculation
path with a memory-only save callback. No saved nutrition records are written
by this harness. Form drafts follow the existing local draft mechanism on
this separate localhost origin. Ctrl+C stops the server. The script uses only
installed dependencies and a focused development bundle, not an application
production build. `--reuse-bundle --serve` resumes an existing harness bundle.

`shouldLoadBarcodeGrading` requires development mode, localhost/127.0.0.1/[::1]
and `barcodeGrading=1`. The actual dialog also has a compile-time
`process.env.NODE_ENV === 'development'` guard around its module require. A URL
flag in production cannot enable either the score or Additives disclosure.
Production and flag-off review retain the original layout and handoff.

## Data boundary

The active local preview uses `traceUsNutritionScoringV2.js`. See [the density-based revision and 21-product comparison](trace-nutrition-v2.md). The previous practical engine remains unchanged in `traceUsNutritionScoring.js`; `practicalBarcodeNutritionAssessmentV1.js` preserves its adapter. The published engine, conversion and `publishedBarcodeNutritionAssessment.js` remain research references. Existing historical reports retain their original dates and results.

One compatible captured reference panel supplies the assessment. No nutrients are spliced across products, datasets or countries. Reported energy and provider-qualified approximations remain separately attributed. Energy is needed for calorie-capped solid comparisons, while fixed beverage/oil portions can retain unknown energy. Normally use saturated fat, sodium and usable added or total sugar; a missing limiting nutrient is unnecessary only when its entire possible burden range gives the same result. Unknown values remain null. Optional fiber/protein absence earns no benefit. Total sugars use an explicitly different screening rule, never an estimate of added sugar. Contradictory added-sugar fields can be excluded with a visible explanation while coherent total sugars are used. Other required nutrient or selected energy conflicts still reject the calculation.

No fruit/vegetable/legume percentage, exact category tag, reviewer record, hash, source revision or verified US market is required. The pure profile engine needs no GTIN. Optional barcode identity bindings in the review still prevent attaching another record's nutrition to the selected product. Unknown/foreign/multiple markets and older observations remain confidence warnings. Assessing a profile never proves a current US formulation, barcode match, product compliance or safety.

The general, beverage, nuts and oil comparison portions are Trace choices, not FDA recommended portions or a published scoring standard. Source confidence, missing information and ingredient/additive disclosures remain visible. All output retains `grade=null`, `scoreReady=false` and `scanMatchEligible=false`; no score is saved, cached or passed to food logging. The production gate, scanner, serving calculations and saved-record contracts are unchanged.

## Display and additives

The opt-in review places product identity before a compact whole-number score,
short positive/negative explanation, source confidence, nutrition information,
the existing Ingredients disclosure, a collapsed Additives disclosure and the
existing logging controls. Calculation details remain expandable; no letter
ratings are displayed. During an opt-in product review the already-completed
scan controls are hidden to reduce scrolling; Scan Again restores them. Camera,
photo, orientation, lifecycle and decoding code are unchanged.

Additives are reconstructed through the existing normalization/name-reference
service. Displayed names are exact verified reference names, with original
provider tags, provider attribution and EU historical name-source metadata.
Unrecognized names, unknown lists and provider-reported empty lists remain
distinct. The subsequent [information polish](barcode-review-information.md)
adds sourced general functions for the eight names, conditional FDA scientific
context and three dated US provision summaries, without risk classifications,
additive-risk penalties or inferred regulatory events. The panel explicitly
says scientific assessment is incomplete. A name-source citation is not current legal authorization or proof
of product safety or additive presence. Product changes reset disclosures.

The score module and styles use the seven existing theme tokens. They are
loaded only behind the development guard. NutritionPage's handoff, serving
calculations, cache formats, storage and saved food references are untouched.

## Validation and resuming

Focused tests cover environment/URL gating, eligible and incomplete candidates,
source/identity binding, categories, market uncertainty, missing/invalid inputs,
additive names/states, product switching and actual Nutrition form logging with
serving changes. Existing scanner, ingredient, assessment, cache, storage and
calculation suites provide regressions.

```powershell
node scripts/verify-barcode-grading.cjs --production-check
node scripts/verify-barcode-grading.cjs
```

The first command compiles the real dialog alone under production replacement
and verifies experimental scoring/UI modules are absent from its dependency
graph. This avoids a full application production build. The second uses one
hidden Chrome process and the real NutritionPage/dialog with synthetic products
to capture mobile eligible/unresolved/additive and desktop reviews, check themes,
and verify logging does not save scores. No physical iPhone test is needed yet.

Artifacts and the initial hash snapshot are under
`artifacts/barcode-grading-integration-20261020/`. No commit, push or deployment
is authorized. Next: review the integrated layouts and assess real-provider
coverage before expanding category or formulation evidence capture.

The subsequent explanation/additive copy review writes its new screenshots and
checks to `artifacts/barcode-explanations-polish-20261020/`; the earlier captures
are preserved. See [review information](barcode-review-information.md).

## File inventory

Modified existing file:

- `src/components/BarcodeScannerDialog.jsx`: gated display slots and placement
  of the existing action controls; no camera, decoding or handoff changes.

Added:

- `src/development/barcodeGradingMode.js`
- `src/development/barcodeNutritionAssessment.js`
- `src/development/barcodeNutritionAssessment.test.js`
- `src/development/BarcodeNutritionReview.jsx`
- `src/development/BarcodeNutritionReview.css`
- `src/development/BarcodeNutritionReview.test.jsx`
- `src/development/__fixtures__/barcodeGrading.cjs`
- `scripts/verify-barcode-grading.cjs`
- `docs/barcode-grading-development.md`

## Validation results

Focused regression runs cover 479 distinct passing tests across 15 suites,
including 35 final adapter/UI integration tests. The latter verify a different
GTIN replaces the earlier assessment, both eligible and unresolved foods can
be logged, saved records omit scores, and reopening a saved entry preserves
its serving basis (120 kcal/serving → 240 kcal for two → 60 kcal for half).
Existing scanner, Ingredients, assessment capture, additive persistence,
nutrition, precision, serving and storage regressions pass.

Changed-file ESLint passes. JavaScript/JSX/CJS syntax, fixture parsing and
whitespace checks pass. The focused production compilation of the real dialog
contains 343 modules and excludes the experimental score/UI modules. A full
application production build was not run. Babel emitted its existing large
catalog formatting notices for `restaurantFoods.js` and `sixChainMenuData.js`;
these are not errors and those files were not edited.

The offline browser harness checks all seven theme palettes, overflow,
development flag gating and actual Nutrition saving, and captures:

- `artifacts/barcode-grading-integration-20261020/mobile-eligible-390x844.png`
- `artifacts/barcode-grading-integration-20261020/mobile-unresolved-390x844.png`
- `artifacts/barcode-grading-integration-20261020/mobile-additives-390x844.png`
- `artifacts/barcode-grading-integration-20261020/desktop-review-1280x960.png`

The initial snapshot covers 701 tracked/untracked file states, including absent
historical artifacts. All 700 paths outside the intentionally modified dialog
are preserved. The existing nutrient engine, Trace calibration, scanner/camera
services, NutritionPage, caches, saved-record code and research archives remain
unchanged. No files were staged, committed, pushed or deployed.
