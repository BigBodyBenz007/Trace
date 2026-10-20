# Narrow ingredient-derived zero qualifying content — 2026-10-20

The original twenty captured grocery profiles now produce **four experimental scores, up from three**. Post Shredded Wheat becomes assessable at **85/100**, raw −5, using its unchanged captured nutrition. FAGE remains 84, almonds 87 and Lay's 21. This is an interpretation of attributed provider records, not independent verification of current US shelf formulations. Public output remains `grade = null`, `scoreReady = false`; assessment never establishes a barcode match.

## Published rules checked

[Santé publique France FAQ v11, 2025-03-17](https://www.santepubliquefrance.fr/sites/default/files/rdd/document/FAQ-updatedAlgo-V11.pdf), directly reviewed 2026-10-20: updated calculation pp. 26–32, category scope pp. 19–21, ingredient definitions pp. 44–48 and Appendix 2. The updated component counts qualifying fruits, vegetables, legumes and herbs. Intact/minimally processed ingredients and eligible juice/purée preparations can count; processing and reconstitution conditions matter. Concentrated juice sugars, isolated soy proteins, flours and certain further-processed preparations do not inherit the original plant's credit.

Cereal grains, including whole wheat, are outside this component. Starches, nuts, seeds and potatoes do not become qualifying FVL merely because they originate from plants. General foods, cheese and red-meat calculations share the FVL thresholds; beverages use different point amounts. The fats/nuts/seeds category additionally counts qualifying oils from the whole edible part of eligible plants, including olive, avocado and soybean oils. This does not extend to every vegetable oil or to added oils in general foods. Processed nut/seed category assignment requires its separate proportion evidence. No scoring equations or category thresholds were changed.

## Captured evidence and implementation

Post barcode **00884912180056**, OFF record **0884912180056**, revision **2026-05-18T02:00:00.000Z**, captured **2026-10-20T17:59:56.334Z**:

> Whole grain wheat. bht is added to the packaging material to preserve freshness.

Original source: [Open Food Facts product record](https://world.openfoodfacts.org/product/00884912180056), Open Food Facts contributors; database ODbL. The archived observation retains original capitalization, language and source metadata. Wheat is the only declared food ingredient. The second sentence explicitly describes packaging treatment; this inference says nothing about BHT exposure or safety. The provider's estimated older plant percentage of zero remains an estimate and is not the reason zero is established.

The development adapter now recognizes a closed single-grain declaration: whole-grain wheat, whole wheat, wheat flour, rice, whole-grain oats or rolled oats, optionally followed by that exact packaging-only BHT notice. Case and surrounding whitespace are immaterial. No product names, brands or barcodes trigger the rule. It requires the supported general-food category and attributed available ingredient text. An appended ingredient, trailing comma/ellipsis, unfamiliar term, unreviewed preservative statement or ambiguous category stays unknown. This is deliberately a small reviewed vocabulary, not a general ingredient parser. Missing percentages alone never establish zero.

The existing milk/culture, sole-nut and potato/oil/salt patterns now pass through the same evidence resolver. It returns `verified-zero`, `unknown` or `conflicting`, with a nullable percentage, identification method, exact ingredient text, provider source/revision/capture metadata, original provider quantities, methodology edition and limited verification scope. `verified-zero` means a checked interpretation of the declaration; it does **not** certify a physical package or independent formulation review.

A positive, malformed or unsupported provider-reported older plant quantity cannot be overwritten by an ingredient-derived zero: the result stays conflicting and unscored. Even potentially explainable differences involving the older nut-inclusive component require review. Provider estimates remain separately attributed and unchanged; they are not declared quantities. The prior reported-zero route remains available where the broader component bounds the updated component, retaining the existing exclusion for fats/nuts/seeds because qualifying oils differ. Unknown inputs remain unknown. No provider field or stored product snapshot is changed.

Source details appear only inside the existing collapsed technical disclosure. Ingredients/additives and the approved layout are preserved. No new gateway fields, runtime requests, cache formats, saved-record migrations or production feature-gate changes were introduced.

## Same twenty observations

“Unresolved” is not a zero score. Reasons can overlap; these rows describe the captured profile rather than current manufacturer data.

| Product | Before | After | Evidence or remaining blocker |
| --- | ---: | ---: | --- |
| Coca-Cola Original | Unresolved | Unresolved | Added sugars exceed total sugars/carbohydrates; saturated fat and fiber absent |
| Diet Coke | Unresolved | Unresolved | Reference dimension unknown; downstream fiber/sweetener evidence incomplete |
| Frosted Flakes | Unresolved | Unresolved | Ingredient text absent; qualifying fraction unknown |
| Rice Krispies | Unresolved | Unresolved | Fortified multi-ingredient list includes malt flavor; not a reviewed closed composition; serving ml/g discrepancy retained |
| Post Shredded Wheat | Unresolved | **85** | Complete single-grain declaration establishes zero qualifying FVL |
| FAGE Total 0% | 84 | 84 | Existing closed milk/culture evidence |
| Chobani strawberry | Unresolved | Unresolved | Local catalog lacks assessment-input snapshot |
| Quest Cookie Dough | Unresolved | Unresolved | Explicit supplement category remains outside supported food scope |
| Nature Valley protein bar | Unresolved | Unresolved | Complex composition and unknown nut proportion; both category possibilities retained |
| Dave's whole-wheat bread | Unresolved | Unresolved | Multi-ingredient composition not covered by this narrow rule; current manufacturer formulation also differs |
| Pepperidge Farm white bread | Unresolved | Unresolved | Added sugars exceed total sugars |
| Skippy peanut butter | Unresolved | Unresolved | Unknown nut proportion and added oil composition; special-category possibilities retained |
| Blue Diamond almonds | 87 | 87 | Existing sole-nut declaration; nuts excluded from FVL |
| Smart Ones rice/beans | Unresolved | Unresolved | Truncated declaration contains qualifying vegetables; no percentages inferred |
| Stouffer's lasagna | Unresolved | Unresolved | Qualifying tomato/other ingredients; proportions unknown |
| Oscar Mayer wieners | Unresolved | Unresolved | Incomplete composition, unknown qualifying fraction, missing fiber; red-meat proportion unresolved |
| SPAM Classic | Unresolved | Unresolved | Added sugars exceed total sugars |
| Cheez-It | Unresolved | Unresolved | Declaration ends with a comma; no completeness assumption |
| OREO Original | Unresolved | Unresolved | Compound ingredients/flavor not covered by the reviewed closed patterns |
| Lay's Classic | 21 | 21 | Existing closed potato/oil/salt evidence |

There are **16 unresolved profiles**. Ten still reach the calculation with unknown qualifying plant fractions (wieners also lack fiber); the other six first encounter sugar conflicts (three), unknown measurement basis (one), absent assessment snapshot (one), or unsupported scope (one). These are not mutually exclusive counts of every possible downstream problem. No remaining failure in the energy-corrected replay is reclassified as an energy conflict.

[Full offline replay](barcode-plant-replay-2026-10-20.json) includes all twenty before/after results, original source hashes, energy-qualification recovery, nutrient contributions and plant evidence. It uses the energy-corrected three-score snapshot as its comparison and leaves both prior replay files and original observations unchanged.

## Formulation limitations and next step

The [current US Post page](https://www.postconsumerbrands.com/brands/shredded-wheat/products/shredded-wheat-original-big-biscuit-cereal/), checked 2026-10-20, also lists whole-grain wheat and BHT, but does not specify packaging treatment and declares **170 kcal per 51 g**, versus **180 kcal** in the captured profile. It is contextual corroboration of the grain, not the source of a replacement panel, proof of the archived packaging wording, or an exact GTIN match. The 85 belongs to the original provider observation. Its US/world market uncertainty remains visible.

The [current Dave's manufacturer page](https://www.daveskillerbread.com/100-whole-wheat), checked 2026-10-20, includes additional ingredients absent from the captured list, including acerola cherry powder. Neither formulation is substituted for the other. This mismatch is a concrete reason to preserve source/formulation uncertainty, not a new automatic market veto.

The archives contain normalized ingredient text and food-group quantities, including provider estimates, but **no structured provider ingredient arrays or independently verified ingredient percentages**. The raw energy archive contains structured nutrition, not ingredient trees. No extra provider request was made. Other complete-looking mixed lists may support zero after their components are reviewed, but absence of an implemented match is not a claim that they contain qualifying plants.

Smallest next practical improvement: review the Rice Krispies manufacturer ingredient declaration and fortified ingredients, then add only the corresponding closed composition support if justified. Separately resolve the real bread/source-panel discrepancies before claiming current US package accuracy. No nonzero fractions should be guessed.

## Validation and exact task inventory

**543 tests passed across 14 focused suites** (61.142 seconds): new composition/provenance/conflict cases, unchanged published calculations and numerical conversion, Nutrition assessment capture/integration, scanner review and Ingredients, real Nutrition handoff/serving precision/saved payload, product selection, cache compatibility, production gating and the CommonJS startup regression. The initial three-suite run caught a test looking for Ingredients inside the score-only component; that assertion was corrected before the successful regression run.

Changed-file ESLint passed with no findings. Babel syntax checks for six JS/JSX files, Node script syntax, replay JSON/totals/gating checks and whitespace/conflict-marker checks passed. Git whitespace checks passed; normal LF-to-CRLF notices only. No production build, dependencies, commit, push or deployment.

Modified existing files (including files already uncommitted before this task):

- `src/development/barcodeNutritionEvidence.js`
- `src/development/barcodeNutritionEvidence.test.js`
- `src/development/barcodeNutritionAssessment.js`
- `src/development/barcodeNutritionAssessment.test.js`
- `src/development/BarcodeNutritionReview.jsx`
- `src/development/BarcodeNutritionReview.test.jsx`
- `scripts/replay-barcode-eligibility.cjs`

Added files:

- `docs/barcode-plant-content-2026-10-20.md`
- `docs/barcode-plant-replay-2026-10-20.json`

Preservation checkpoint and validation logs: ignored `artifacts/barcode-plant-20261020/`. HEAD remains `537dff1417e7325a6c12e19a651ea28827a088a2`; all 731 pre-existing paths were checked, with changes limited to the seven files listed above and two new documents. Prior eligibility/energy corrections, original research archives, unrelated deletions and modifications, published nutrient engine and numerical calibration remain intact. Nothing was staged. No browser storage or restored user data was accessed.

Replay command:

```powershell
node scripts/replay-barcode-eligibility.cjs --plant-audit
```
