# Development-only barcode nutrition review

This opt-in integration is for local research, not consumer grading. It reuses
the existing scanner, lookup, selected-product assessment inputs, updated
nutrient calculations and Trace numerical calibration. No research product is
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

`assessBarcodeNutrition` consumes the selected candidate's normalized
`assessmentInputs`, never the rounded serving display or a research fixture.
It checks GTIN equivalence, product name/brand, source URL/attribution and
provider/record bindings. Legacy inputs and custom edited foods stay unresolved.
It never modifies the candidate, selection, cache, assessment contract or saved
record. All outputs retain `grade=null`, `scoreReady=false` and
`scanMatchEligible=false`. There are no runtime network requests in scoring.

One compatible provider dataset supplies the whole nutrient vector; datasets
are not spliced together. The development evidence adapter reconciles compatible
energy rounding and independently rounded serving/per-100 representations while
retaining all original observations. Genuine conflicts, invalid units and
provenance mismatches still block assessment. Missing nutrients stay unknown;
the unchanged engine may return a score only if every retained possibility agrees.
Unused total fat/carbohydrate fields are not mandatory for general foods.
Added/free sugars remain separate. Direct reported kJ is preserved, including
equal duplicate provider aliases. No mass/volume density conversion is assumed.
Stale data blocks scoring while existing logging remains usable. The shared
assessment-input model and food logging behavior are unchanged.

Provider category claims and corroborating food descriptions/composition can
establish a category without a specific taxonomy tag. Greek/strained yogurt,
single-ingredient nuts and potato crisps have explicit routes. Uncertain
meat/nut proportions retain both applicable published category rules rather than
guessing percentages. Generic yogurt/milk evidence alone remains insufficient;
explicit drinking-yogurt presentation uses the beverage rules. Special-purpose
exclusions remain. Unknown, foreign and multiple market claims are confidence
warnings, not automatic barriers to assessing the supplied coherent profile.
They never establish an exact US formulation or barcode match, nor merge regions.

The captured legacy fruit/vegetable/nut group is not generally the updated
fruit/vegetable/legume fraction. Only an explicitly provider-reported zero can
bound that subset to zero in general/cheese/beverage calculations. Estimates
and positive legacy values remain unknown. This zero shortcut is excluded from
fats/nuts/seeds because updated oil eligibility differs. Three closed composition
patterns can separately establish FVL zero: sole nuts, milk/known yogurt cultures,
and potatoes/declared oils/salt. Unknown additional ingredients do not inherit
this conclusion; estimated percentages and beverage sweetener absence are not
guessed. The engine retains all
possible point bands for unknown method inputs and returns a single score only
when every supported possibility agrees. Many beverages and nut/oil products
will therefore remain unresolved. No published equations or calibration anchors
were changed.

See [the eligibility correction and unchanged 20-product replay](barcode-nutrition-eligibility-2026-10-20.md)
for exact rounding conventions, source qualifications and remaining coverage gaps.

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
