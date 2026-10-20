# Trace nutrition v2: density-based development experiment

Implemented and reviewed against the existing grocery observations on 2026-10-20.
This is an independent numerical nutrition model, not Yuka's algorithm, an
official Nutri-Score conversion, an FDA endorsement, or a validated health-risk
measure. Public `grade` remains `null` and `scoreReady` remains `false`.

## What changed and why

The previous development model used a small, energy-capped comparison portion.
That allowed calorie-dense snacks to receive a favorable score from a small
quantity, while a sodium-heavy bread could lose most of its score. Version 2
uses a consistent 100 g or 100 mL panel, limits protein credit to two points,
adds explicit energy density, and gives a small, attributed first-whole-grain
ingredient benefit. A strong limiting nutrient still constrains positive credit.
There are no product-name rules or brand-specific targets.

Yuka's [public explanation](https://help.yuka.io/l/en/article/ijzgfvi1jq), reviewed
2026-10-20, describes 60% nutrition, 30% additives and 10% organic, including an
additional cap for additives it classifies at its highest risk level. Its
nutrition factors include energy, sugars, saturated fat, sodium, fiber, protein
and fruit/vegetable content. Trace borrows the nutrient-balancing principles,
separate beverage treatment and limited positive offsets. It does not adopt
Yuka's risk categories, cap, organic bonus or overall weighting. The linked
[technical FAQ](https://yuka.io/wp-content/uploads/QR_Nutri-Score_EN.pdf) is dated
2022-04-01; the help page does not establish every detail of Yuka's current
implementation for every product.

The [updated official technical FAQ](https://www.santepubliquefrance.fr/sites/default/files/rdd/document/FAQ-updatedAlgo-V11.pdf),
dated 2025-03-17, provides the comparison rationale for treating nuts/oils using
saturated-fat energy and fat quality. Trace's continuous ramps and weights below
are independent choices, not an implementation of those published point tables.
The preserved published engines are unchanged.

## Exact equation

Read one coherent source panel. Normalize its values to 100 g for general foods
and nuts, or 100 mL for beverages. Oils can retain either known dimension; there
is no assumed g/mL density. All quantities below refer to that normalized panel.

`R(x, low, high) = max(0, min(1, (x - low) / (high - low)))`.

| Component | General foods | Beverages | Nuts and oils |
| --- | --- | --- | --- |
| Energy burden `E` | `R(kcal, 80, 600)` | `R(kcal, 0, 60)` | `R(9 * saturatedFat_g, 80, 600)` |
| Added-sugar screen | `R(addedSugar_g, 2.5, 25)` | `R(addedSugar_g, 0, 10)` | Same as general |
| Total-sugar screen | `R(totalSugar_g, 4.5, 45)` | `R(totalSugar_g, 0, 10)` | Same as general |
| Saturated-fat burden `F` | `R(saturatedFat_g, 1, 10)` | Same as general | `R(saturatedFat_g / totalFat_g, .10, .64)` |
| Sodium burden `N` | `R(sodium_mg, 90, 900)` | Same as general | Same as general |

`S` is the larger **available, usable** sugar screen. These are separate screens;
they are not added, and total sugars are never relabeled as added sugars.
Contradictory optional added-sugar values are retained and excluded explicitly.
If both sugar measurements are missing, sugar burden is unknown.

```text
weightedBurden = .40*S + .30*F + .30*N
B = max(weightedBurden, .80*max(S, F, N))
C = 8*min(fiber_g/5.6, 1)
  + 2*min(protein_g/10, 1)
  + 5*wholeGrainFirst
raw = 85 - 60*B - 35*E + C*(1-B)
score = round(max(0, min(100, raw)))
```

Rounding is JavaScript `Math.round` on the unrounded final raw result. No
intermediate rounding is applied. At most 60 points come from the combined
limiting-nutrient burden, 35 from energy density, eight from fiber, two from
protein and five from first-listed whole grain. Positive credit shrinks as the
limiting burden grows. These are not independent percentage weights summing to
100. The numerical rating is entirely nutrition; no additive or organic term is
silently treated as zero or awarded full credit.

For fixed category and other inputs, higher energy/sugar/saturated fat/sodium
cannot improve the score. Fiber and protein benefits are capped. For nuts/oils,
the monotonic comparisons are saturated-fat energy and saturated/total-fat ratio,
not all calories or total fat in isolation. A raw value cannot exceed 100:
`85 + maximum C(15) = 100`. No product reaches 100 because a higher raw value was
clipped. A value of 100 would mean meeting this model's numerical criteria only.

### Where the choices come from

[FDA's Daily Values](https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels)
are 50 g added sugar, 20 g saturated fat, 2,300 mg sodium, 28 g fiber and 50 g
protein. The fiber and protein credit ceilings correspond to 20% of those DVs
in the comparison quantity. Added-sugar food endpoints correspond to 5% and 50%
of its DV. FDA recommends comparing lower added sugar, saturated fat and sodium
and higher fiber, but does **not** prescribe this score or these 100 g cutoffs.
There is no FDA total-sugar DV. Total sugar, energy, saturated-fat and sodium
density endpoints are Trace calibration choices informed by published profiling
principles. The base 85, deductions, 40/30/30 split, 80% strongest-factor
safeguard and five-point grain indicator have not been clinically validated.

The saturated-fat energy feature uses the conventional 9 kcal/g fat factor;
it does not replace a product's reported calories. FDA's
[healthy-claim framework](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/use-healthy-claim-food-labeling)
supports considering food groups as well as limiting nutrients. Trace neither
tests that claim's legal requirements nor equates its score with eligibility.

`wholeGrainFirst = 1` only for the general-food rule when the source-attributed
ingredient text starts with an explicitly recognized whole grain, including
graham flour explicitly identified as whole-grain wheat flour. Language,
truncation and first-ingredient checks are conservative. The nutrition and grain
evidence must have the same source URL/attribution. FDA explains that ingredients
are listed in [descending order by weight](https://www.fda.gov/food/food-additives-and-gras-ingredients-information-consumers/types-food-ingredients).
The indicator does not establish a percentage, an all-whole-grain product or
independent verification of the package. Refined flour and missing evidence earn
no grain credit; an unfamiliar ingredient is not declared refined.

### Missing data and formulation confidence

Required measurements, supported units and the existing energy reconciliation
remain necessary. No nutrient panels are spliced. No GTIN, US market, ingredient
or additive requirement was added for standalone nutrition-profile assessment.
Source, formulation, stale-data and energy qualifications remain visible.

Missing fiber/protein remain null and earn no positive credit. Missing limiting
measurements are evaluated across their supported burden bounds; a score is
returned only if the entire range gives the same rounded integer. Uncertain raw
results and point contributions remain ranges, not invented nutrient values.
The existing conditional US zero-total-fat serving rounding bound is retained
for the manufacturer-attributed Chobani catalog profile. Saturated fat stays
unknown; current label/package applicability remains explicitly unverified.

Diet Coke remains unresolved: its captured nutrition panel lacks a compatible
known volume basis. No mass-to-volume conversion is invented. No record is
promoted to an independently verified US formulation or barcode match.

## Real-product replay

The original 20 observations and their historical replay files were preserved.
The new [comparison JSON](trace-nutrition-v2-comparison-2026-10-20.json) retains
original panels, attribution, dates, warnings, old/new results and explanations.
It prohibits network requests during replay and asserts no changes to logging
eligibility, candidates or original archive bytes.

Teddy Grahams is one additional [captured gateway observation](trace-nutrition-v2-teddy-2026-10-20.json)
for real barcode `044000045586`, captured 2026-10-20T21:57:56.506Z. Its record is
Open Food Facts, not a newly independently verified manufacturer label. The
Yuka 36 benchmark is user-verified as stated in the task; it was not fetched or
used as a target. A Yuka overall score and Trace nutrition-only score measure
different things.

| Product | Previous Trace | Trace v2 |
| --- | ---: | ---: |
| Coca-Cola Original Taste | 17 | 12 |
| Diet Coke | Unresolved | Unresolved |
| Frosted Flakes | 25 | 36 |
| Rice Krispies | 56 | 42 |
| Post Shredded Wheat Original Big Biscuit | 98 | 82 |
| FAGE 0% Plain Greek Yogurt | 90 | 87 |
| Chobani Strawberry on Bottom | 56 | 80 |
| Quest Chocolate Chip Cookie Dough Protein Bar | 42 | 54 |
| Nature Valley Peanut Butter Dark Chocolate Protein Bar | 31 | 19 |
| Dave's Killer Bread 100% Whole Wheat | 41 | 68 |
| Pepperidge Farm Hearty White Bread | 30 | 55 |
| Skippy Creamy Peanut Butter | 47 | 69 |
| Blue Diamond Whole Natural Almonds | 92 | 95 |
| Smart Ones Santa Fe Rice & Beans | 59 | 75 |
| Stouffer's Classic Lasagna with Meat & Sauce | 43 | 70 |
| Oscar Mayer Classic Wieners | 18 | 25 |
| SPAM Classic | 18 | 23 |
| Cheez-It Original | 50 | 19 |
| OREO Original | 18 | 12 |
| Lay's Classic | 68 | 32 |
| Teddy Grahams, additional comparison | 82 | 46 |

Coverage is **19/20 original profiles** and **20/21 including Teddy**. These are
archived profiles, not 20 current independently verified US labels. Neither this
sample nor a numerical score establishes national coverage or product safety.

### Stouffer's comparison clarification

The captured Classic Lasagna with Meat & Sauce is a 297 g package, GTIN
`00013800103215`, and receives Trace v2 **nutrition-only 70**. It is not the same
observation as the user's Yuka Meat Lovers Lasagna, Large Size screenshot (215 g
serving; no GTIN or organic status established by that observation).

The screenshot panel (340 kcal, 5 g total sugar, 7 g saturated fat, 760 mg sodium,
16 g protein and 2 g fiber per 215 g) produces Trace v2 **nutrition-only 66**.
The preserved original published method and documented Yuka conversion produce
**nutrition-only 75**, conditional on using Yuka's reported **51% vegetable
content** as an attributed assumption. That percentage is not independently
verified Trace product data and was not imported into any product record.

Yuka's displayed **45 is an overall score**, not its nutrition-only component.
The conditional nutrition result contributes `75 * .60 = 45` overall points;
this is consistent with zero additive-component points and no organic bonus,
but the complete assessment and organic status are unknown. The reported seven
additives and Yuka's high-risk labels for sodium nitrite, BHA and BHT are user
observations of Yuka, not independently verified Trace composition or risk
findings. No score, formula, threshold or product datum was changed to match 45.

## Additives remain separate

The existing disclosures retain verified names/functions, original identifiers,
scientific context, dated jurisdiction-specific legal qualifications and unknown
states. The new bounded assessment records identity/function/context availability,
but leaves exposure, additive score, organic score and combined food-quality
score unknown. Missing data and a provider-reported empty list remain distinct;
neither earns automatic safety credit.

[FDA's explanation of food chemical assessment](https://www.fda.gov/consumers/consumer-updates/food-safe-if-it-has-chemicals)
requires considering chemical identity, amounts and likely consumption. The
provider tags do not provide that exposure evidence. This task therefore does
not assign a combined score, an additive penalty or a risk-free designation.
Legal permission does not establish product-specific safety. Existing historical
regulatory sources were not refreshed or relabeled current by this work.

## Remaining questionable comparisons and source problems

- Lasagna 70 versus whole-wheat bread 68 reflects a 100 g density comparison,
  including the meal's water content. It does not compare full eating portions;
  the existing Nutrition grid still reports the selected serving. There is no
  invented meal portion or new density assumption.
- Quest 54 is not a favorable assessment of sweeteners or added fibers as a
  class. Protein gives at most two points, fiber at most eight, with reduced
  offsets under limiting burdens. The model cannot distinguish all fiber types
  from a total-fiber label value.
- The archived Quest sodium is about 0.367 mg/100 g. The
  [current official manufacturer panel](https://www.questnutrition.com/products/chocolate-chip-cookie-dough-protein-bar),
  directly reviewed 2026-10-20, gives 220 mg per 60 g. This suggests a provider
  entry problem; it is not a demonstrated Trace conversion defect. The original
  profile was not repaired with a different label edition. SPAM's archived
  sodium is also suspiciously small. Its current manufacturer's complete panel
  was not directly recoverable here, so no replacement value is asserted.
- Teddy gets whole-grain-first credit because its supplied list starts with
  explicitly whole-grain graham flour. It also contains refined flour; no
  percentage or exclusively whole-grain claim is made. It still loses points
  for energy and sugar density.
- A complete zero-energy, zero-sugar beverage can receive a favorable nutrition
  score without an additive assessment. This is a limitation of a nutrition-only
  rating, not a declaration that unidentified sweeteners are safe.
- The model deliberately avoids processing or additive penalties unsupported by
  this data. Trans fat, micronutrients, total diet, quantities eaten and individual
  needs are not modeled. Numerical differences are experimental and do not have
  established clinical significance.

The smallest next validation task is to verify the suspect original sodium
observations against matching current US packages, without merging formulations,
then compare portions alongside these density rankings. Broader consumer approval
requires independent nutritional review; adding unverified additive penalties
would not resolve these limitations.

## Implementation inventory

The approved checkpoint contains exactly **19 files**: the original 16-file
inventory plus the preserved v1 engine, published adapter and prior replay JSON
needed by its imports and comparison inputs. Approval is for a development-stage
checkpoint only; consumer grading remains disabled.

Modified:

- `src/development/barcodeNutritionAssessment.js`
- `src/development/barcodeNutritionAssessment.test.js`
- `src/development/barcodeReviewInformation.js`
- `src/development/BarcodeNutritionReview.jsx`
- `src/development/BarcodeNutritionReview.test.jsx`
- `scripts/replay-barcode-eligibility.cjs`
- `docs/barcode-grading-development.md`

Added:

- `src/development/traceUsNutritionScoringV2.js`
- `src/development/traceUsNutritionScoringV2.test.js`
- `src/development/traceFoodQualityEvidence.js`
- `src/development/traceFoodQualityEvidence.test.js`
- `src/development/practicalBarcodeNutritionAssessmentV1.js`
- `src/development/practicalBarcodeNutritionAssessmentV1.test.js`
- `docs/trace-nutrition-v2-teddy-2026-10-20.json`
- `docs/trace-nutrition-v2-comparison-2026-10-20.json`
- `docs/trace-nutrition-v2.md`
- `src/development/traceUsNutritionScoring.js`
- `src/development/publishedBarcodeNutritionAssessment.js`
- `docs/barcode-practical-us-replay-2026-10-20.json`

The preserved v1 adapter is byte-identical to the active adapter at this task's
start; its copied tests only change the import. The v1 engine/tests and published
engines are unchanged. No scanner, camera, proxy, logging, storage, theme, source
registry or public assessment-contract files changed.

## Local use and validation

```powershell
npm.cmd start
```

Open `http://localhost:3000/?barcodeGrading=1`, go to Nutrition, choose Scan
Barcode and use a manual, photo or camera lookup. For Teddy use `044000045586`.
Lookups still depend on existing gateway/provider availability. The flag must
be in the URL while opening the scanner; it is not stored. The development-mode
and localhost gate is unchanged. Disclosures still start collapsed and the
existing logging buttons/layout are retained.

Replay the archived comparisons offline:

```powershell
node scripts/replay-barcode-eligibility.cjs --calibration-v2
```

This updates only the new v2 comparison file. Historical replay modes use the
preserved v1/published adapters. No application build, dependencies, migration,
runtime network call for scoring, commit, push or deployment is required.

Initial implementation validation (before the 19-file Git checkpoint):

- 297 tests pass across 14 focused suites, using the latest result per suite.
  Coverage includes both nutrition engines, real-profile replay, explanations,
  additive states, Nutrition handoff/serving/saved payload, camera/decoder/photo,
  ingredient disclosure and production module compatibility.
- The initial run found one explanation mismatch, corrected to retain the clear
  missing-saturated-fat message. An unchanged camera-switch test also timed out
  once and passed on rerun. No scanner code was edited to address that timeout.
- Changed-file ESLint: 12 JavaScript/JSX/CJS files, zero errors and zero warnings.
  Syntax, both new JSON files and whitespace checks pass.
- A focused production Webpack probe of the real BarcodeScannerDialog graph
  compiled 343 modules and confirmed no grading engine, review, evidence helper
  or development proxy entered the production graph. This is not a full
  production build or a deployment. Babel printed existing large-catalog-file
  formatting notices only.
- SHA-256 checks across 743 baseline paths found no changes outside the seven
  intended modified files. The preserved v1 adapter matches its starting bytes.
  HEAD remains `da61ca9588f0262929cb931950bf05f047577f94`; the staging index is empty.

Ignored local evidence is under `artifacts/trace-nutrition-v2-20261020/`.
No physical camera retest, user-storage access, commit, push or deployment was
performed. The remaining device-specific Edge limitation is unchanged.

19-file checkpoint validation:

- Dependency traversal covers 132 implementation/test/input files with no
  omitted dependencies. Focused tests and offline replay additionally reject
  repository dependencies outside already-tracked files and the 19-file scope.
- 401 tests pass across 14 focused suites, including the preserved published
  calculation, v1 adapter, v2, scanner/Nutrition workflows, production gating
  and the CommonJS/ESM startup repair. An omitted untracked v1 test file is not
  used to establish checkpoint completeness.
- All 14 approved JavaScript/JSX/CJS files pass lint with zero errors/warnings;
  syntax, three JSON files and whitespace checks pass. The replay reproduces
  the approved comparison byte-for-byte without rewriting its product data.
- Original coverage remains 19/20; including Teddy it is 20/21. Expected scores
  remain Teddy 46, Coca-Cola 12, Lay's 32, Dave's 68, almonds 95 and OREO 12.
- Only this report changed during checkpoint preparation. Formula, thresholds,
  eligibility, product data and expected results were preserved. This checkpoint
  does not approve consumer grading or enable the production preview.
