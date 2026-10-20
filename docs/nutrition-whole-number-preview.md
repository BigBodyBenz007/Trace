# Whole-number nutrition preview: updated method and honest resolution

Research and implementation checkpoint: **2026-10-20**. This is a local,
development-only experiment. Consumer grading remains unapproved and disabled:
`grade=null`, `scoreReady=false`. No experimental result belongs in a saved food
record or establishes a barcode match.

## Decision

Use the **updated Nutri-Score algorithm (2023)** to calculate its nutritional
points and A–E class, then display an explicit Trace ordinal band value:

| Updated class | Trace display value |
| --- | ---: |
| A | 90 |
| B | 70 |
| C | 50 |
| D | 30 |
| E | 10 |

These are five whole-number display codes on a nominal 0–100 presentation scale.
They are **not** an official Nutri-Score conversion, validated 100-point health
scale, percentage healthy, risk estimate or FDA-endorsed grade. They are not the
mathematical midpoints of the official raw-score bands. The equal spacing is a
Trace interface convention; it does not establish equal nutritional distances.
The letter must remain identifiable alongside the number and the five-value
mapping must be disclosed.

No food receives 100 through this mapping. That avoids communicating a numerical
endpoint as nutritional perfection; it does not prove that 90 is a more accurate
health measurement than 100. Foods in the same class intentionally tie. The
preview must not manufacture 87 versus 88, or interpolate between classes, merely
to make products look different. Actual nutrient quantities and method components
provide the explanation when the class is the same.

## Why change the previous presentation?

The original Nutri-Score-to-Yuka nutrition table maps every general-food raw score
at or below -2 to 100. Multiple prior observations reached that conversion
ceiling: seven of the twelve calculable observations were 100/100.
The previous implementation correctly reproduced the published table;
its many 100s were not evidence that those foods were nutritionally identical or
perfect. Replacing 100 with 90 alone would change presentation, not discrimination.

The updated algorithm supplies a substantive method change. Its published revision
addresses sugar and salt discrimination, fiber/protein contributions, grain-food
comparisons, fat/oil categories and beverages. Its technical rules distinguish
red-meat protein treatment and beverage non-nutritive sweeteners. These changes
are independently specified by the published method, rather than tuned to make
particular Trace fixtures receive desired numbers.

Three numerical presentation choices were considered:

| Choice | Decision and tradeoff |
| --- | --- |
| Linear conversion of raw points to 0–100 | Not selected. Choosing endpoints and a slope introduces a new scale and implies more numerical resolution and equal distances than the five-class presentation establishes. Category rules complicate a universal mapping. |
| Preserve the original Yuka conversion | Retained as reproducible history. It has a published table but keeps its original-method ceiling and must not be applied to updated raw scores as though the versions were interchangeable. |
| Updated A–E with Trace 90/70/50/30/10 display | Selected for this experiment. Preserves five-class resolution, avoids invented within-class precision and makes the Trace-specific display decision explicit. It will still produce ties. |

The method change does not authorize consumer claims or demonstrate that this
particular numeric presentation is understood correctly. A 20-point display gap
does not mean 20% better nutrition. Do not average these codes across foods, treat
them as a dietary adequacy score or interpret them as individual health effects.

## Authoritative references and verification

The following official material was inspected on 2026-10-20. The technical
documents retain their printed editions; a new access date does not make their
contents newly published. Source files and extracted workbook evidence are local
audit checkpoints under
`artifacts/nutrition-whole-number-20261020/references/`, not runtime dependencies.

| Reference | Edition and role |
| --- | --- |
| [Santé publique France Nutri-Score overview](https://www.santepubliquefrance.fr/en/nutrition-and-physical-activity/nutri-score) | Official page updated 2026-03-19. Describes the five-class output, the updated algorithm and links both original and updated calculators. |
| [Official technical FAQ](https://www.santepubliquefrance.fr/sites/default/files/rdd/document/FAQ-updatedAlgo-V11.pdf) | Printed version 2025-03-17; updated algorithm pp. 26–35 and category definitions read separately from original rules. SHA-256 `877f52a7397613e2e29f16d0b353df4099bff8cf758fb1fbc293bbf7997e82ac`. |
| [Official updated calculator](https://www.santepubliquefrance.fr/sites/default/files/rdd/document/Nutri-Score_Updated-algorithm_20240404.xlsx) | Filename edition 2024-04-04; formulas and cached examples inspected directly. SHA-256 `64ce97cd4fc6eda12eccf12467d93532b6da34ef0e03b0d9a5616ba6aeb0699e`. |
| [Official consumer comparison guidance](https://www.mangerbouger.fr/manger-mieux/s-informer-sur-les-produits-qu-on-achete/nouveau-nutri-score/comment-bien-utiliser-le-nutri-score) | Published 2025-02-28, modified 2025-03-24. Recommends comparisons within a category/aisle, between brands of the same product, and between foods eaten for the same occasion. |
| [Yuka's original nutrition correspondence](https://help.yuka.io/l/en/article/owuc9rbhqs-how-is-the-nutri-score-correlated-to-obtain-the-yuka-rating) | Prior-method reference only. Its numeric table and limits are preserved in [the previous implementation report](yuka-method.md); the updated calculation is not represented as a Yuka app score. |

No official 0–100 mapping for the updated algorithm was established by these
sources. No source provides the Trace band values or validates their equal
spacing. Published algorithm facts are implemented independently; no third-party
product/risk database or logo is copied. Trademark/branding rights and scientific
validation are separate from availability of mathematical rules.

## Method boundaries and source discrepancies

The scientific calculation and Trace display conversion remain separate steps.
Updated nutritional points use the correct general-food, fats/nuts/seeds or
beverage rules, with the applicable cheese and red-meat protein qualifications.
Energy, total sugars, saturated fat and salt contribute adverse points; fiber,
protein and qualifying fruit/vegetable/legume content contribute according to the
updated tables and gates. Non-nutritive sweeteners have a specified beverage
component. This is a method input, not an independently established additive-risk
classification for a product.

Original nuts, oil, milk/plant-drink and qualifying-plant rules cannot simply be
carried over into the updated method. Category evidence and composition must be
interpreted against the new definitions. A whole-grain claim alone is not a
quantitative nutrient measurement; identical eligible inputs still produce the
same result. Explicit preparation, measurement units and source coherence remain
necessary. No US/international formulation merge, density guess or replacement of
missing nutrients with zero is permitted.

The official materials contain two identified boundary inconsistencies. The
implementation resolves them explicitly rather than concealing them:

- At exactly **3.2 g salt per 100 mL**, the beverage workbook comparison yields
  16 points, while FAQ table 9 assigns the sixteenth point only above 3.2 g. The
  implementation follows the FAQ's strict threshold, yielding 15 at equality.
- The general-food qualifying-plant table's first row leaves 40% ambiguous by
  printing a strict less-than condition. The workbook and other corresponding
  FAQ tables consistently give zero points at exactly 40%; that boundary is used.

The workbook's instructions specify qualifying-plant percentage rounded to one
decimal. This does not authorize extra rounding of declared nutrients. Its energy
conversion remains `round(kcal * 4.2)` where direct declared kJ is unavailable;
direct source kJ is retained. These implementation choices and discrepancies
require focused boundary checks and are not claims of perfect workbook agreement
at the known inconsistent salt boundary. The previous original-calculator/Yuka
simulator calorie discrepancy remains historical evidence in `yuka-method.md`.

## What the comparison means

Use the rating to compare plausible alternatives: cereals with cereals, a product
across brands, or alternatives for a similar meal role. Official guidance also
permits comparisons across categories when foods serve the same occasion, such
as dessert alternatives. It does not turn a sortable list of unrelated foods into
a prescription for an optimal diet.

Some food groups have different attainable classes; a lower class than another
unrelated food does not establish that the latter should replace it. Do not
renormalize each group to its own 100 or award a perfect value to its best example.
The display does not account for all micronutrients, personal needs, portions,
allergies, exposure, ingredients or additive concerns. Ingredient/additive
information remains separately accessible and a favorable nutrition class must
not imply its completeness or safety.

American-first data handling remains intact: use the supplied US label or clearly
identified composition source and retain its identity and uncertainty. Applying
internationally published mathematics is not substituting an overseas product.
A source review or calculable nutrition profile does not establish an exact scan
match, current shelf formulation or independent human/physical-package inspection.

## Combined rating and compatibility

The Trace band values must **not** be inserted into the old Yuka 60% nutrition,
30% additive, 10% organic calculation. Multiplying an ordinal display code by
those weights would create a new composite method, not reproduce Yuka or inherit
its published conversion. Missing additive assessments likewise receive no
automatic favorable credit. An updated-method combined result remains unavailable
without a separately justified numerical combination rule.

The original published-method engine/composite and earlier Trace experimental
engines remain historical implementations. Their inputs, formulas, conversion
tables and research archives are preserved. Existing barcode scanning, lookup,
food selection/logging, serving calculations, saved records and provider metadata
remain outside this display experiment. The opt-in preview stays development-only;
URL parameters cannot enable production grading. Experimental outputs remain
separate from `grade=null` and `scoreReady=false` and are not persisted.

## Before/after results

Both columns below are whole numbers out of 100. Before uses the preserved original
Nutri-Score/Yuka conversion; after uses the updated algorithm and Trace band codes.
A numerical change is not a measured change in health. All 18 original nutrient
vectors, ingredients, product identity and source fields remain unchanged. Updated
category/FVL/NNS metadata is maintained as a separate local overlay.

| Dated observation | Before /100 | Updated /100 | Interpretation / remaining gap |
| --- | ---: | ---: | --- |
| Kellogg's Rice Krispies cereal | Unavailable | Unavailable | Unresolved package/panel conflict. |
| Kellogg's Frosted Flakes Cereal | 9 | 10 (E) | Original D becomes updated E; conversion numbers are on different scales. |
| Whole Natural Almonds | 100 | 90 (A) | New fats/nuts/seeds rules; updated FVL excludes nuts. |
| Creamy Peanut Butter | Unavailable | Unavailable | Nut proportion and eligible oil fraction unknown; possible C/D/E. |
| Santa Fe Rice & Beans with Zucchini, Zesty Green Chile Sour Cream Sauce & Mozzarella Cheese Frozen Meal | Unavailable | Unavailable | Unknown FVL permits A/B/C. |
| Classic Wieners Hot Dogs | 0 | 10 (E) | General/red-meat alternatives both E; no pork percentage inferred. |
| Peanut Butter Dark Chocolate Protein Chewy Bars 15ct | Unavailable | Unavailable | Missing serving mass and unresolved panel conflict. |
| Farmhouse Hearty White Sliced Bread | Unavailable | Unavailable | Serving mass absent; no invented conversion. |
| 100% Whole Wheat | 100 | Unavailable | Missing ingredient/FVL evidence now permits A or B. |
| Shredded Wheat Original Big Biscuit cereal | 100 | 90 (A) | Single-ingredient whole wheat; A remains A. |
| Robust Extra Virgin Olive Oil | 50 | 70 (B) | Fats-category rules and qualifying olive-oil exception yield B. |
| Pepsi | Unavailable | 10 (E) | US-label rounding-aware residual bounds determine fiber points; fiber value stays unknown. |
| Diet Pepsi | 68 | 50 (C) | Updated beverage NNS component gives C; no toxicity classification. |
| Unsweetened Black Tea | 68 | 70 (B) | Non-water beverage B; no NNS in reviewed full ingredients. |
| Total 0% Plain Greek Yogurt 5.3 oz | 100 | 90 (A) | Spoonable yogurt remains general food; A. |
| Total 2% Split Cup Strawberry 5.3 oz | 100 | 90 (A) | All unknown fruit-fraction possibilities remain A; no invented fruit percentage. |
| Apple, raw with skin (USDA SR Legacy reference) | 100 | 90 (A) | USDA generic raw apple with skin; no packaged formulation claim. |
| Broccoli, raw (USDA SR Legacy reference) | 100 | 90 (A) | USDA generic raw broccoli; no packaged formulation claim. |

The original method determines 12 ratings, including seven at 100. The updated
method determines 12 bands, including six A/90 results; six observations remain
unresolved. Pepsi becomes calculable, while the whole-wheat bread loses a definite
result because its unknown plant fraction can change the updated class. This is
not evidence of a nutritional deterioration or a new ingredient measurement.

Plain and sweetened FAGE still tie at A/90. Their known sugar quantities differ,
but the published method does not justify inventing different within-A numbers.
Almonds and produce also share A; this does not make them interchangeable portions.
The high-energy almond control receives A under the published special category,
while oil receives B. No calorie-density penalty or brand-specific adjustment was
invented. The processed-meat sample is E under either supported category candidate.

The synthetic bread pair (all other nutrients held equal) is C/50 with 2 g fiber
and B/70 with 6 g fiber per 100 g. The existing same-nutrient whole/refined grain
controls both remain A/90: a name alone contributes no extra points. The synthetic
red-meat/poultry pair is C/50 versus A/90 because of the published protein cap.
Synthetic pure starch is C/50; water is A/90, a sugary drink E/10, a diet drink
C/50 and milk B/70. These controls are invented inputs, not manufacturer claims.

### Narrow US-label residual bound

[21 CFR 101.9(c)(6), (i) and (ii)](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9)
was verified on 2026-10-20 (eCFR displayed current through 2026-10-16). It describes
US total carbohydrate and nearest-gram carbohydrate/fiber/sugar declarations. For
an explicit US manufacturer/retailer serving label with whole-gram declarations,
the engine may conservatively bound an unknown component by total carbohydrate
minus the other known component, plus **1 g per declared serving** for rounding.
The source URL, allowance and derived upper bound are retained in the result.

Pepsi declares 41 g total carbohydrate and 41 g total sugars per 355 mL. Allowing
1 g residual gives at most 0.282 g fiber per 100 mL, below the first updated fiber
threshold. The engine retains fiber=null and awards zero fiber *points*, without
claiming the product contains exactly zero fiber. This rule is not applied to
USDA composition, API records, unknown markets or non-serving bases. It evaluates
the supplied label declarations; it is not a laboratory interval estimate, FDA
approval, or a general model of manufacturing/analytical tolerance.

## Validation results

Focused method/fixture/UI and preserved-method compatibility: **388 tests passed
in 6 suites**. Includes five independent cached examples from the official
workbook (general food, red meat, cheese, fats and beverage), threshold boundaries,
unknown inputs/categories, whole-number outputs, public-grade guards, ingredients,
source confidence and before/after coverage. An ESLint conditional-expect finding
in a new test was corrected without changing engine behavior.

Existing nutrition/scanner regressions: **325 tests passed in 11 suites**. Total:
**713 unique tests passed in 17 suites**. After the test-only lint correction,
all 178 updated-engine tests passed again. Changed-file ESLint finished with zero
errors and zero warnings. JavaScript/JSX syntax, research JSON parsing, whitespace
and conflict-marker checks passed. PowerShell rendered Jest's stderr PASS lines
as NativeCommandError log annotations; the test processes exited successfully.

The preservation check covered 686 pre-existing tracked/untracked paths. Exactly
four prior preview files changed and five new task files were added; all other
682 paths retained their original content or missing-file state. Git HEAD and
the staging index remained unchanged. Existing research/history/regulatory
documents, original engines, scanner, nutrition/logging/caching code and Zibblez
were not edited.

Screenshots and serial seven-theme browser checks are under
`artifacts/nutrition-whole-number-20261020/`. Browser checks cover desktop
1280x960 and mobile viewport 390x844, page overflow, readable theme contrast,
44px ingredient controls, visible score/source/additive access, collapsed details,
and the ordinary app when the opt-in flag is absent. This is Chromium emulation,
not a new physical iPhone/Safari check.

## Exact task inventory

New files:

- `src/development/updatedNutritionScoring.js`
- `src/development/updatedNutritionScoring.test.js`
- `src/development/updatedNutritionFixtures.js`
- `src/development/updatedNutritionFixtures.test.js`
- `docs/nutrition-whole-number-preview.md`

Updated prior uncommitted preview files:

- `src/development/NutritionPilot.jsx`
- `src/development/NutritionPilot.css`
- `src/development/NutritionPilot.test.jsx`
- `scripts/verify-nutrition-pilot.cjs`

The previous method, composite, fixtures, density engine and existing reports are
preserved. Research copies, comparison JSON, test logs, screenshots and preservation
checkpoints are isolated in the new ignored artifact directory. No production
build, dependency installation, commit, push or deployment is part of this task.

## Next review

Review whether users understand the five numbers as ordinal bands and whether the
letter and explanation sufficiently prevent percentage-health interpretations.
Resolve the six observation-level data gaps using matched US source evidence and
extend independent updated-calculator comparisons before considering consumer
release. A more granular numerical score would require a separately justified
and validated mapping; it must not be inferred from this display convention.
