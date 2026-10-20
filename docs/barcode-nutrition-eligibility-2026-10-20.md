# Practical barcode nutrition eligibility — development only

The same 20 archived grocery observations now produce **three experimental scores**, up from zero: **FAGE 84/100, Blue Diamond almonds 87/100, Lay's Classic 21/100**. No published nutrient calculations or Trace calibration anchors changed. No nutrients were obtained from another product, region, retailer panel or research profile. Public outputs remain `grade=null`, `scoreReady=false`, `scanMatchEligible=false`.

## Changes and evidence

**Energy:** the development adapter retains the original kcal and kJ fields, validates same-unit aliases, and uses compatible rounding intervals instead of the shared model's nearly exact cross-unit comparison. The shared assessment-input contract, gateway, logging calculations, caches and saved records are unchanged. Direct reported kJ is passed to the unchanged calculator, including duplicate aliases with equal values; it is not averaged with kcal or replaced with a convenient value.

[21 CFR 101.9(c)(1)](https://www.ecfr.gov/current/title-21/section-101.9#p-101.9(c)(1)) permits five-calorie increments through 50, ten-calorie increments above 50, and zero below five. Directly reviewed 2026-10-20; eCFR displayed Title 21 current through 2026-10-16. This supports half-increment compatibility allowances of 2.5/5 kcal (a below-five interval for zero). No FDA laboratory-compliance percentage is used as a rounding tolerance.

Trace-specific reconciliation choices, not regulatory findings:

- These allowances apply to a captured **serving kcal value matching the declaration increments**. A decimal such as 182 kcal does not receive a five-calorie allowance. A per-100 value inherits a serving allowance only when the declared units agree and the recorded serving kcal rescales to that value. No density is assumed.
- Compatible kJ lies between `max(0,kcal − allowance) × 4.184 − kJ allowance` and `(kcal + allowance) × 4.2 + kJ allowance`. The kJ allowance is half the last recorded decimal place for the serving, rescaled only with matching evidence. 4.184 is physical unit conversion; 4.2 is the existing published calculator's convention. The latter is not presented as an FDA unit definition.
- Applying this numeric compatibility interval to a provider observation does **not** verify that it came from a compliant US panel. Unknown/foreign markets retain that qualification. Every accepted interval and original field is available in the collapsed evidence details and replay JSON.
- Serving/per-100 nutrient differences may fit the overlapping intervals implied by their recorded decimal precision. Raw recorded values remain intact in the selected dataset. Identical-quantity conflicting records do not receive this rescaling allowance. Cross-quantity kJ comparisons also allow the 0.016 kJ/kcal difference between conversion conventions, plus recorded precision. Same-unit contradictions, invalid values and substantial cross-basis discrepancies remain blockers.

Of 17 previously blocked OFF records, **five** now pass energy reconciliation: Coca-Cola, almonds, Stouffer's, Cheez-It and Lay's. Coke still contradicts its own sugar values; Stouffer's and Cheez-It lack usable updated plant-content evidence. Twelve energy rejections remain. Examples: almonds' 160 kcal/669 kJ and Cheez-It's 150 kcal/645 kJ fit the intervals; Quest's 190 kcal/1160 kJ and Frosted Flakes' 351.35 kcal/1629.73 kJ per 100 g do not. Smart Ones additionally has inconsistent kJ after serving/per-100 rescaling.

**Categories:** expanded provider mappings cover crackers, potato crisps, pasta dishes and USDA ready-to-drink beverages. Descriptions and corroborating composition support strained/Greek yogurt, single-ingredient nuts and rice/bean meals. Unknown nut proportions retain general and nuts rules; unknown red-meat proportions retain general and red-meat rules. All retained possibilities must yield the same integer before a score is assigned. Product names are used as food descriptions, never as brand-to-score or barcode-to-score mappings. An explicit supplement claim is not silently overruled. A generic milk/yogurt category alone still does not determine food versus beverage presentation.

[Santé publique France FAQ v11, 2025-03-17](https://www.santepubliquefrance.fr/sites/default/files/rdd/document/FAQ-updatedAlgo-V11.pdf), directly reviewed 2026-10-20: food/beverage and meat/nut scope, printed pages 16–20; FVL definitions/exclusions, pages 44–47 and the ingredient annex. These govern category interpretation; they do not validate Trace's independent 0–100 display or establish US endorsement.

Three closed ingredient patterns establish **zero qualifying FVL**, not estimated percentages: sole declared nuts; milk plus a recognized yogurt-culture list; potatoes, declared oils and salt. Under the updated definitions nuts and potatoes are excluded from FVL, and added oils in general foods do not earn that credit. An extra ingredient, unknown culture, or incomplete declaration fails the pattern. This small explicit recognition does not parse arbitrary lists, assume estimated provider percentages are verified, infer sweetener absence, or fill missing nutrient values. Mixed ingredient proportions otherwise remain unknown. The almonds/FAGE/Lay's improvements require this evidence as well as category recognition.

**Markets:** unknown, foreign or multiple provider markets now affect confidence instead of automatically rejecting a coherent attributed profile. The prominent confidence statement and existing collapsed details distinguish profile assessment from exact US formulation verification. Original market claims remain available. No regional records are combined; assessment never establishes a scan match. All ten former market rejections were removed, but those ten real observations still have other blockers. Controlled tests demonstrate that coherent foreign/unknown-market profiles receive the same calculation as identical US-claimed profiles.

**Other unnecessary completeness checks:** a missing total-fat/carbohydrate field does not automatically veto a general-food calculation that does not use it. Missing measurements remain null. The existing engine retains unknown point possibilities and returns an integer only when all agree; used essential nutrients cannot be silently replaced with zero. Provenance matching, invalid-unit checks, contradictions and stale-record safeguards remain.

## Same-product before/after

Every previous result was unresolved. `E` below means energy observations conflict beyond the new intervals; full dataset-specific reasons, confidence, original energy fields and the exact formula result are in [the offline replay](barcode-eligibility-replay-2026-10-20.json). These are assessments of the **captured profiles**, not independently verified current shelf formulations.

| Product | Before | After | Change or remaining blocker | Formulation confidence |
| --- | --- | --- | --- | --- |
| Coca-Cola | Unresolved | Unresolved | Rounding/market barrier removed; added sugars exceed total sugars; saturated fat/fiber also absent | Guyana record; US not verified |
| Diet Coke | Unresolved | Unresolved | Beverage category recognized; reference measurement dimension still unknown, fiber absent | Provider US claim only |
| Frosted Flakes | Unresolved | Unresolved | E; package/ingredient information incomplete | Provider US claim only |
| Rice Krispies | Unresolved | Unresolved | E; serving says ml despite gram text; no density repair | Provider US claim only |
| Post Shredded Wheat | Unresolved | Unresolved | Market barrier removed; E | US + world, exact US not verified |
| FAGE Total 0% plain | Unresolved | **84** | Strained-yogurt category and complete milk/cultures composition establish general-food/FVL-zero route | US claim; title 6 oz versus selected 5.3 oz remains a discrepancy |
| Chobani strawberry | Unresolved | Unresolved | Existing local catalog entry has no captured assessment snapshot | Existing manufacturer catalog attribution; no new formulation verification |
| Quest Cookie Dough bar | Unresolved | Unresolved | E; explicit supplement category requires food-scope clarification | France + US |
| Nature Valley protein bar | Unresolved | Unresolved | Granola-bar/nut category alternatives and market warning replace vetoes; E remains | Colombia record |
| Dave's whole-wheat bread | Unresolved | Unresolved | Market barrier removed; E; generic identity/category discrepancy remains | US + world |
| Pepperidge Farm white bread | Unresolved | Unresolved | Market barrier removed; E and added sugars exceed total sugars | France + US |
| Skippy creamy peanut butter | Unresolved | Unresolved | Both possible category rules retained instead of category veto; E | Germany + US |
| Blue Diamond almonds | Unresolved | **87** | Energy rounding accepted; sole-nut declaration establishes nuts category and FVL zero | US claim; provider's 28 g package differs from selected 6 oz can |
| Smart Ones rice/beans | Unresolved | Unresolved | General rice-meal category recognized; E and cross-basis kJ conflict | Provider US claim only; ingredient declaration truncated |
| Stouffer's lasagna | Unresolved | Unresolved | Energy representations reconciled; pasta-dish/general category recognized; FVL fraction still unknown | Provider US claim only |
| Oscar Mayer wieners | Unresolved | Unresolved | General/red-meat alternatives retained; E; fiber also absent | Lebanon + US |
| SPAM Classic | Unresolved | Unresolved | General/red-meat alternatives retained; E and added sugars exceed total sugars | Germany + US |
| Cheez-It Original | Unresolved | Unresolved | Energy/decimal rounding accepted; crackers category recognized; FVL fraction still unknown | Germany + US |
| OREO Original | Unresolved | Unresolved | E; no automatic selection of one energy representation | Provider US claim only |
| Lay's Classic | Unresolved | **21** | Energy rounding accepted; potato-crisp category and closed potato/oil/salt declaration establish FVL zero | Provider US claim only |

The reported FAGE and almonds size discrepancies remain visible limitations, not reasons to change the captured nutrient calculations. The score describes the attributed profile; it does not validate a package match. The seven other scoring inputs and unchanged raw equations/calibration produce FAGE raw −4, almonds raw −10 and Lay's raw 18 (see replay for exact normalized measurements and contributors).

## Practicality and remaining work

**Three of 20 is a demonstrated improvement, not adequate practical coverage.** The dominant remaining blocker is twelve incompatible energy records, not a new layer of US identity requirements. Another profile contradicts sugar values, two lack usable FVL fractions, one lacks a measurement basis, and the local catalog entry lacks captured inputs. Reasons overlap and downstream gaps may emerge after earlier problems are corrected. No number is manufactured to improve coverage.

Smallest useful next task: inspect the original manufacturer panels for a few of the substantial energy discrepancies, beginning with a cereal and bread, and correct/replace the specific provider observation only with separately reviewed evidence. Keep the original observation and its source history. This is a data-quality task, not a request to loosen the formula or accept large contradictory values. Supplement scope and genuinely missing FVL percentages need evidence rather than guesses. None of those corrections is performed here.

## Reproduction, validation and files

```powershell
node scripts/replay-barcode-eligibility.cjs
```

This replay forbids network calls, uses the latest observation for each barcode from the original first/follow-up archives, asserts candidate immutability and disabled public grades, records original archive SHA-256 hashes, and writes only the new comparison JSON. The original research archive is unchanged; its strict old comparison runner documents behavior at its original source revision and is not the new comparison command.

Modified existing files:

- `src/development/barcodeNutritionAssessment.js`
- `src/development/barcodeNutritionAssessment.test.js`
- `src/development/BarcodeNutritionReview.jsx`
- `src/development/BarcodeNutritionReview.test.jsx`
- `docs/barcode-grading-development.md`

Added files:

- `src/development/barcodeNutritionEvidence.js`
- `src/development/barcodeNutritionEvidence.test.js`
- `scripts/replay-barcode-eligibility.cjs`
- `docs/barcode-eligibility-replay-2026-10-20.json`
- `docs/barcode-nutrition-eligibility-2026-10-20.md`

Validation: **555 tests passed across 17 focused suites** (74.887 seconds). The final Greek-yogurt-smoothie beverage case was then added; **74 tests passed across the three affected suites** (15.998 seconds). Coverage includes rounding/conflicts, cross-basis consistency, categories, market uncertainty, missing measurements, unchanged nutrient mathematics/calibration, barcode lookup/scanner, Nutrition handoff and serving precision, saved records/caches, ingredients/additives, produce fallback, production gating and the startup CommonJS regression. The original 20-product replay was offline and retained exactly three scores.

Changed-file ESLint, script syntax, JSON and whitespace checks passed. Git reports only normal LF-to-CRLF working-copy notices; no whitespace errors. Preservation hashing checks all **723 pre-existing paths**: only the five intended existing files above changed. The original grocery archive, every unrelated path, published nutrient engine and approved numeric conversion are unchanged. HEAD remains `537dff1417e7325a6c12e19a651ea28827a088a2`; nothing is staged. Logs/checkpoints are in ignored `artifacts/barcode-eligibility-20261020/`.

Ready for review as a **development-only eligibility correction**, with the limited three-of-twenty coverage explicitly retained. No production build, dependency installation, commit, push or deployment. No real browser storage or restored user data is accessed. The production gate and camera/scanner, logging, serving, cache, theme and saved-record implementations are unchanged.
