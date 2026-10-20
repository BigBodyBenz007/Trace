# Barcode energy-data correction — 2026-10-20

**The twelve energy rejections were false comparisons between provider-entered kcal and provider-computed approximate kJ.** Trace copied the numeric values correctly but discarded their qualifiers, then treated estimates as independent label declarations. The correction preserves that distinction; it does not widen the prior tolerance or change the scoring equations.

**The same twenty products still produce exactly three scores: FAGE 84, almonds 87, Lay's 21.** Removing the false energy failures reveals other blockers, principally the missing updated fruit/vegetable/legume (FVL) input. This task does not invent that input to produce more scores.

## Evidence and complete energy trace

[Provider evidence](barcode-energy-provider-evidence-2026-10-20.json) archives the twelve official legacy and structured responses, complete nutrient dictionaries, source sets, serving/reference quantities, original URLs and retrieval dates. Both representations match the original product revisions; every originally captured nutrient and serving-metadata value is unchanged. The data remains attributed to Open Food Facts contributors, database ODbL. No label images, private records or browser storage were accessed.

Directly verified official documentation:

- [Open Food Facts legacy nutrition schema](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition/): standard `_100g`/`_serving` units, entered `_value` units/basis, and generic `energy` aliases.
- [Structured nutrition schema](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition_v3.5/): entered `value` versus system `value_computed`, modifiers and source-set bindings. The selected kJ input in **all twelve records** has `value_computed`, with no entered `value`; the legacy kJ and generic-energy fields carry `~`.
- [Official normalization implementation](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/lib/ProductOpener/Nutrition.pm): `compute_energy_from_nutrients_for_nutrients_set` and aggregation show macronutrient calculation, selection of a computed value when an entered value is absent, and the approximate modifier. Reviewed 2026-10-20. No upstream implementation was copied into Trace.

Rice Krispies provides a direct example: its packaging input contains **150 entered kcal**, **156 computed kcal**, and **663 computed kJ** per serving. The kJ estimate uses nutrient factors, rather than converting the entered 150 kcal. Rounded macronutrient inputs and differing factors, including treatment of fiber/polyols, can differ from declared calories. These estimates must not be treated as another measurement of the same declaration or used to reconstruct missing label calories.

| Product | Captured serving | Entered/legacy kcal per serving | Approximate kJ per serving | Legacy reference kcal / approximate kJ per 100 declared units |
| --- | --- | ---: | ---: | --- |
| Frosted Flakes | Absent | Unknown | Unknown | 351.351351 / ~1629.729730, 100 g |
| Rice Krispies | 40 ml; text says 40 g | 150 | ~663 | 375 / ~1657.5, 100 g |
| Post Shredded Wheat | 51 g | 180 | ~892 | 352.941176 / ~1749.019608, 100 g |
| Quest bar | 60 g | 190 | ~1160 | 316.666667 / ~1933.333333, 100 g |
| Nature Valley bar | 40 g | 197 | ~920 | 492 / ~2301, 100 g |
| Dave's bread | 42 g | 100 | ~505 | 238.095238 / ~1201.190476, 100 g |
| Pepperidge Farm bread | 49 g | 114 | ~555 | 232.142857 / ~1132.653061, 100 g |
| Skippy peanut butter | 32 g | 190 | ~829 | 593.75 / ~2591.9, 100 g |
| Smart Ones rice/beans | 255 g | 300 | ~1300 | 117.647059 / ~511.558431, 100 g |
| Oscar Mayer wieners | 45 g | 120 | ~472 | 266.666667 / ~1048.888889, 100 g |
| SPAM Classic | 56.699 g | 182 | ~685 | 321.428571 / ~1208.5, 100 g |
| OREO Original | 34 g | 160 | ~709 | 470.588235 / ~2085.294118, 100 g |

Table decimals are shortened for reading; the evidence retains full original precision. “Entered/legacy” distinguishes the flattened API values Trace received from the actual underlying input sets. They are not newly verified manufacturer declarations.

The trace is: legacy `nutriments` → gateway `captureNutritionAssessmentInputs` → optional assessment observations → normalized/cache/selection snapshot → development evidence adapter → unchanged published calculator and Trace conversion. The ordinary logging gateway already prefers the kcal field and does not perform the grading adapter's cross-unit comparison; this explains why logging was usable while grading failed.

### What was and was not a defect

- **Demonstrated Trace defect:** the capture path dropped `energy-kj_modifier`/`energy_modifier`. This erased `~`, so the adapter treated approximate estimates as unqualified measurements. Generic `energy` duplicated kJ rather than providing independent corroboration. Its qualifier now follows its corresponding kJ/kcal source if the alias omits it.
- **No demonstrated physical conversion defect:** 4.184 is not the cause. A physiological/macronutrient estimate and an entered declaration are different evidence, so a strict unit-conversion test between them was inappropriate. The existing published `round(kcal × 4.2)` fallback remains unchanged and applies when no usable reported kJ is supplied.
- **Provider basis problem retained:** Rice Krispies has a structured ml serving against gram serving text. It is disclosed without converting ml to grams or repairing the record. The adapter uses only an explicitly compatible reference dataset; the serving inconsistency does not erase the separately declared reference quantity.
- **Provider aggregation/rounding retained:** the legacy API derives serving values from its aggregate reference and rounds them. Smart Ones' ~1300 serving kJ versus a ~1304.474 rescaling is computed-estimate rounding, not two contradictory label energies. No approximate estimate is used to repair a declared nutrient.
- **Competing source panels retained:** structured packaging sets can disagree or represent different label editions/formulations. For example Pepperidge has 130 kcal in a serving input while the flattened aggregate gives 114; SPAM has 180 versus 182; OREO 167 versus 160. Trace does not substitute these alternate values or assert an exact regional formulation. All input sets are preserved in the evidence. Consuming an entire explicitly identified source panel, rather than a provider aggregate, remains a future provenance improvement.

## Small corrections

1. Preserve energy modifiers in the existing optional `derivation` string (`off:modifier:~`, or the original other modifier). No schema version change or historical migration; old inputs without a modifier remain conservative.
2. In development grading, use **unqualified reported** energy. Keep qualified approximations in the evidence and warnings; do not use them as a second label declaration, recompute calories from macros, average numbers or select values by the resulting score. If only approximate energy is available, it stays unknown. Unsupported bounded declarations remain unresolved. Invalid values and conflicting unqualified declarations still fail.
3. Keep approximate kJ out of cross-basis checks of reported energy. If reported kJ is unavailable, the unchanged calculator uses its existing kcal conversion. The existing tolerance for genuinely reported kcal/kJ is unchanged.
4. Show the qualifier and source qualification in the existing collapsed technical details. The approved layout, scoring position, ingredients/additives and default disclosure states are preserved.
5. Extend the existing offline replay with `--energy-audit`. It verifies identical revisions, original nutrient values, units and serving metadata before recovering only the omitted qualifiers. It also verifies the selected structured kJ input is computed-only. No product data is replaced and no network request is possible during replay.

Existing cached records do not acquire missing provenance silently. A normal lookup through the corrected gateway is needed to capture it. The live gateway is unchanged until a later approved deployment; this task does not deploy it. The shared assessment schema, logging nutrients, nutrition calculations and stored records are unchanged.

## All twenty before/after results

“Before” is the approved three-score eligibility implementation, not the original zero-score pilot. Complete reasons, normalized points and source qualifications are in [the new replay](barcode-energy-replay-2026-10-20.json). FVL is an input to the existing published method; ranges below are internal diagnostics, not displayed substitute ratings.

| Product | Before | After | Remaining blocker / qualification |
| --- | --- | --- | --- |
| Coca-Cola | Unresolved | Unresolved | Added sugars exceed both total sugars and carbohydrates; saturated fat/fiber also absent. Guyana record remains unverified as US. |
| Diet Coke | Unresolved | Unresolved | Unknown reference measurement dimension; fiber absent. No density assumption. |
| Frosted Flakes | Energy conflict | Unresolved | Energy qualification corrected; updated FVL missing. Internal score possibilities 19–31. |
| Rice Krispies | Energy conflict | Unresolved | Updated FVL missing (36–48); gram/ml serving inconsistency disclosed. |
| Post Shredded Wheat | Energy conflict | Unresolved | Updated FVL missing (85–91). No missing core numeric nutrients. |
| FAGE Total 0% plain | 84 | **84** | Captured profile only; 6 oz title versus selected 5.3 oz remains unresolved. |
| Chobani strawberry | Unresolved | Unresolved | Existing local catalog entry has no captured assessment snapshot. |
| Quest Cookie Dough bar | Energy conflict + scope | Unresolved | Energy qualification corrected; supplement claim still requires food-scope evidence. |
| Nature Valley protein bar | Energy conflict | Unresolved | FVL and general/nuts category possibilities remain unresolved (21–53); Colombia formulation not promoted to US. |
| Dave's whole-wheat bread | Energy conflict | Unresolved | FVL missing (75–84); generic product identity/category discrepancy remains. |
| Pepperidge Farm white bread | Energy conflict + sugars | Unresolved | Energy qualification corrected; added sugars exceed total sugars. Competing packaging inputs retained. |
| Skippy creamy peanut butter | Energy conflict | Unresolved | FVL and general/nuts category possibilities remain unresolved (19–58). |
| Blue Diamond almonds | 87 | **87** | Captured profile only; provider 28 g package differs from selected 6 oz can. |
| Smart Ones rice/beans | Energy conflict | Unresolved | Computed kJ is not label evidence; FVL missing (58–82), ingredient declaration truncated. |
| Stouffer's lasagna | Unresolved | Unresolved | FVL missing (56–81). |
| Oscar Mayer wieners | Energy conflict | Unresolved | Fiber missing; FVL and meat-category alternatives unresolved (19–41). |
| SPAM Classic | Energy conflict + sugars | Unresolved | Energy qualification corrected; added sugars exceed total sugars. |
| Cheez-It Original | Unresolved | Unresolved | FVL missing (21–33). |
| OREO Original | Energy conflict | Unresolved | FVL missing (15–18); alternate packaging inputs are not substituted. |
| Lay's Classic | 21 | **21** | No new formulation verification; captured profile only. |

No false energy-conflict rejection remains in the recovered-qualifier replay. **Eleven** profiles reach the engine but lack a settled FVL value, including two with uncertain category proportions and one with missing fiber. Separately, three have contradictory sugar values, one has no usable reference dimension, one has no captured snapshot, and one is outside supported food scope. Some additional concerns overlap these primary outcomes. Unknown/foreign markets remain confidence warnings, not new rejection requirements.

The FVL blocker is partly adapter coverage, not universally absent nutrition. A verified zero can likely be established for some complete simple ingredient lists, such as a single-grain cereal; mixed meals may need genuine percentage evidence. No such determination is added in this energy-only correction.

## Validation, files and next step

```powershell
node scripts/replay-barcode-eligibility.cjs --energy-audit
```

Original pilot files and the approved three-score replay are preserved. The research replay uses no provider calls and asserts unchanged logging eligibility, immutable candidates, `grade=null`, `scoreReady=false` and `scanMatchEligible=false` for every product. The original unqualified legacy records remain conservative until refreshed; the replay explicitly identifies the twelve same-edition qualifier recoveries.

Focused regression run: **19 suites, 618 tests passed**, serial execution, 84.497 seconds. Coverage includes modifier capture/reconstruction and aliases, approximate-only unknowns, genuine unqualified energy conflicts, invalid/bounded values, serving/reference precision, source/calculation separation, unchanged scoring/calibration, cache and saved-record compatibility, scanner/ingredients, Nutrition handoff and serving calculations, production gating and the CommonJS startup repair.

Modified during this task:

- `api/nutrition/_assessmentInputs.cjs`
- `src/services/nutritionAssessmentInputs.test.js`
- `src/development/barcodeNutritionEvidence.js`
- `src/development/barcodeNutritionEvidence.test.js`
- `src/development/BarcodeNutritionReview.jsx`
- `src/development/BarcodeNutritionReview.test.jsx`
- `scripts/replay-barcode-eligibility.cjs`

Added: this report, `docs/barcode-energy-provider-evidence-2026-10-20.json` and `docs/barcode-energy-replay-2026-10-20.json`.

Final validation: changed-file ESLint passed with zero errors/warnings; both CommonJS syntax checks passed; JSON and whitespace/conflict-marker checks passed for all ten task files. Git emitted only its existing LF-to-CRLF working-copy notices. The energy disclosure's final accessible label was rechecked with **14 passing review tests** (16.356 seconds), including default collapse, qualified evidence, production gating and real Nutrition handoff. The full 618-test regression run was not repeated unnecessarily.

Preservation checks hashed **728 pre-existing paths**: only the seven intended existing files above changed. The original six-file grocery archive and approved three-score replay are byte-for-byte unchanged. The published nutrient engine/calibration and all unrelated paths are unchanged; prior eligibility edits are retained with the specified energy corrections. HEAD remains `537dff1417e7325a6c12e19a651ea28827a088a2`, and nothing is staged. Checkpoints/logs are in ignored `artifacts/barcode-energy-20261020/`.

No production build, dependency installation, commit, push or deployment. Real browser storage, restored records, scanner/camera, logging, themes, other source archives and Zibblez are untouched.

**Smallest next task:** verify zero updated-FVL contribution for a narrowly selected complete simple-ingredient product, starting with Post's single-grain cereal, using its captured full ingredient statement and the published definitions. Retain unknowns for incomplete lists and mixed formulations. That addresses a demonstrated remaining calculation input without another framework or a scoring change. Review conflicting packaging panels separately before claiming an exact current US formulation.
