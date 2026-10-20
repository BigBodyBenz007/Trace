# Published nutrition method in the local Trace preview

Research implementation and evidence review: **2026-10-19**. Starting HEAD:
`5e495f8cc81628f7619d4465a83856d296af2d24`. No consumer-method approval,
independent product verification or exact reproduction of Yuka's application is
claimed. Public outputs remain `grade=null` and `scoreReady=false`.

The active preview uses original Nutri-Score nutritional mathematics followed by
Yuka's published nutrition conversion. A separate combined-rating function uses
the verified portions of Yuka's published component rules. These are distinct
results: a nutrition number does not supply missing additive or organic evidence.
All 18 real observations currently lack a complete combined assessment.

## Decision and isolation

The previous Trace density formula introduced its own weights, positive-component
baseline and exclusions. This replacement uses a published method that supplies
explicit nutrient points, a protein rule and category handling for beverages,
cheese and added fats. Yuka currently documents using the original algorithm
during the Nutri-Score transition. The updated algorithm is a different method;
its rules are not mixed into this implementation.

International mathematics supplies those capabilities; it does not supply product
composition. The preview retains the actual US observations, their uncertainty
and source identities. Generic USDA composition is explicitly identified. It is
never substituted for a branded scan match. Neither the algorithm's origin nor a
US government data source establishes FDA endorsement or individual health effects.

Open `http://localhost:3000/?nutritionPilot=1` in the existing development app.
The loader requires development mode, a loopback hostname and explicit opt-in.
A query string cannot enable production grading. The preview stores no scores,
performs no runtime provider requests and offers an exit to ordinary Trace logging.
There is no isolated `Use This Food` callback or replacement scanner workflow.

The original experimental engine, the previous density engine and its fixtures,
the three-eligible original archive and the five-eligible reviewed-label archive
remain reproducible and unchanged. The old density result appears only as a
historical comparison, not as the active nutrition method.

## Sources and editions

The linked material was inspected directly during this task. Live help pages
reported relative update ages; those are not invented publication dates. Local
captures are audit checkpoints under `artifacts/yuka-method-20261019/`, not runtime
dependencies. Essential rules, minimal observations and tests are self-contained.

| Source | Edition and verification use |
| --- | --- |
| [Official original Nutri-Score calculator](https://www.santepubliquefrance.fr/sites/default/files/rdd/document/Outil_Calcul_Nutri-Score_SpF_EN_20210921.xlsx) | 2021-09-21 workbook; OOXML formulas, instructions and cached reference outputs read without executing Office. Original 2017 algorithm with the qualifying-oil adaptation. SHA-256 `8585481ec24f240b799ebbf7d3ab89bffc6485ffeb253f8c4b50f6aa2541c6f0`. |
| [Santé publique France FAQ](https://www.santepubliquefrance.fr/sites/default/files/rdd/document/FAQ-updatedAlgo-V11.pdf) | 2025-03-17; original-algorithm sections pp. 21–25, category discussion pp. 16–17, and qualifying-plant/reuse sections inspected separately from updated rules. |
| [Yuka's algorithm explanation](https://help.yuka.io/l/en/article/fw1tjp24o4-what-is-the-nutri-score) and its [technical FAQ](https://yuka.io/wp-content/uploads/QR_Nutri-Score_EN.pdf) | Help page states original-algorithm use. Linked technical document prints `01/04/2022`; original milk/plant-drink and plain-water categories checked. Yuka's practice of estimating missing plant fractions is not adopted. |
| [Yuka nutrition correspondence](https://help.yuka.io/l/en/article/owuc9rbhqs-how-is-the-nutri-score-correlated-to-obtain-the-yuka-rating) | Numeric table visually checked. Linked image filename is dated 2024-12-20; this does not establish the help page's publication date. Image SHA-256 `1cb64086d6150e74664b1aa9319c45aaa60ef435bc6bd4ea268ee86f70b18dcd`. |
| [Yuka ordinary scoring](https://help.yuka.io/l/en/article/ijzgfvi1jq-how-are-food-products-scored) and [additive deductions](https://help.yuka.io/l/en/article/yth80j3vle-sources-analysis-of-food-additives) | Component weights, certification requirement, published classification deductions and red cap. No classification database copied or inferred. |
| [Hydrogenated oils](https://help.yuka.io/l/en/article/zng6f5sv6y-les-huiles-hydrog-n-es-sont-elles-prises-en-compte-dans-la-notation), [salt](https://help.yuka.io/l/en/article/0ugjxul5pe-untitled-article-en), [chocolate](https://help.yuka.io/l/en/article/s10gg49v7c-how-are-the-chocolates-rated) | US oil treatment and special-category rules; incomplete aggregation/cocoa rules remain explicit limitations. The apparent additive-identifier error on the salt page is not used as a name mapping. |
| [Unrated foods](https://help.yuka.io/l/en/article/erodqtx4nx-unrated-food-products), [unrated sugars](https://help.yuka.io/l/en/article/upa9faci9p-sugar-not-rated), [prepared products](https://help.yuka.io/l/en/article/vj6oskxerl-rating-of-reconstituted-products) | Scope exclusions and the need for a coherent consumed/prepared composition. |
| [Public Yuka simulator](https://editor.yuka.io/) | Dated observations of component rounding, red caps, plain water and discrepancies described below. This is not a complete specification or validation of an independent replica. |

The algorithm and thresholds are publicly described for reproducibility. No
permissive licence for redistributing the official workbook was established; the
implementation independently expresses factual mathematical rules and links its
sources. No workbook, bulk product database, artwork, logo or Yuka additive-risk
database is bundled. Nutri-Score trademark/logo permissions are separate; no
licensed-mark or organizational endorsement is implied.

## Exact nutrition calculation

Method ID: `original-nutriscore-with-yuka-nutrition-conversion`. Version:
`2017-original-2021-calculator+2024-12-20-yuka+water-verified-2026-10-19`.

Normalize a coherent declared basis to 100 g or 100 mL. Beverage rules require
volume; no density is assumed. An explicitly US fluid ounce can convert using
29.5735295625 mL. Unknown serving mass/volume cannot be repaired using calories.
Known source kJ is preferred. Otherwise the original calculator specifies
`round(kcal * 4.2)` after normalization. Known sodium is preferred; explicit salt
can convert using `round(salt_g / 2.5 * 1000)`. Incompatible paired declarations,
source bindings, market claims or panel conflicts are rejected.

For ordinary nutrients, points equal the number of thresholds **strictly below**
the normalized value. Equality does not cross the threshold.

| Component | General-food thresholds |
| --- | --- |
| Energy, kJ | 335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350 |
| Total sugars, g | 4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45 |
| Saturated fat, g | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| Sodium, mg | 90, 180, 270, 360, 450, 540, 630, 720, 810, 900 |
| Fiber, g | 0.9, 1.9, 2.8, 3.7, 4.7 |
| Protein, g | 1.6, 3.2, 4.8, 6.4, 8 |

Beverages replace energy thresholds with 0, 30, 60, 90, 120, 150, 180, 210, 240,
270 kJ and sugar thresholds with 0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5 g.
Added fats replace saturated-fat gram points with saturated/total-fat percentage
points at **greater than or equal to** 10, 16, 22, 28, 34, 40, 46, 52, 58, 64%.
A known positive total-fat denominator is required.

Qualifying plant percentage, rounded to one decimal per the workbook, earns
0/1/2/5 points for foods at <=40/>40/>60/>80%; beverages use 0/2/4/10. This is
the method's specified fruits, vegetables, pulses, nuts and qualifying oils, not
all plant ingredients. Grains, starchy tubers and excluded processed ingredients
do not automatically qualify. A supplied percentage needs its derivation and
source. Single-ingredient identities can support explicit composition-derived
fractions; ingredient order does not establish a guessed mixed-food percentage.

```text
N = energyPoints + sugarPoints + saturatedFatPoints + sodiumPoints
countProtein = cheese OR N < 11 OR maximumPlantPoints
raw = N - fiberPoints - plantPoints - (countProtein ? proteinPoints : 0)
```

Cheese always counts protein. Original nuts use general-food rules. Milk,
drinkable yogurt, eligible >80%-milk drinks, plant drinks, soup and gazpacho use
original general-food rules. Finished oils/butter/margarine/cream use added-fat
rules; ordinary composite foods do not become added fats merely by containing oil.
Water has its separate categorical exception. Published unrated product types
remain excluded even if a caller selects an ordinary method category.

General letters are A below 0, B 0–2, C 3–10, D 11–18 and E at least 19. Non-water
beverage letters are B below 2, C 2–5, D 6–9 and E at least 10. Plain water is A.
These method outputs remain separate from the disabled public `grade` field.

The independently transcribed Yuka nutrition conversion is a table, not a linear
rescaling of raw Nutri-Score:

| General raw | Nutrition /100 |
| --- | --- |
| <=-2; -1; 0; 1; 2; 3; 4; 5; 6; 7; 8; 9; 10 | 100; 90; 80; 75; 70; 65; 60; 55; 50; 45; 40; 35; 30 |
| 11; 12; 13; 14; 15; 16; 17; 18; >=19 | 15; 13; 11; 9; 7; 5; 3; 1; 0 |
| Beverage raw | Nutrition /100 |
| <=-4; -3; -2; -1; 0; 1; 2; 3; 4; 5; 6; 7; 8; 9; >=10 | 80; 77; 74; 71; 68; 65; 57; 49; 41; 33; 15; 11; 7; 3; 0 |

Plain water's simulator-verified nutrition exception is 100, without inventing a
raw nutrient score. UI ratings divide the resulting /100 value by ten and display
one decimal; this adds no scientific precision or personal health interpretation.

## Missing data and product evidence

Total sugars determine this method's sugar points. Added and free sugars remain
distinct optional measurements; neither replaces a missing total. Missing values
remain null. Rather than assigning missing inputs zero, the evaluator enumerates
their possible point bands, including the protein gate for each completion.

Known totals constrain those bands. For example, declared zero carbohydrate
constrains an unknown fiber or total-sugar point contribution to zero within the
declared profile; declared zero total fat constrains saturates. The missing
subcomponent is still null, and label rounding is not proof of analytical absence.
The bound applies to the supplied declarations, not an unmeasured true composition.
All unknown qualifying plant bands are considered; no best-case percentage is
chosen. A single nutrition number is returned only if every retained completion
produces the same published conversion. Otherwise possible values/ranges and the
unavailable result remain visible. These are conservative arithmetic possibilities,
not confidence intervals or estimated nutrient measurements.

GTIN, archive hash, review identity and source age are attribution/confidence
information rather than automatic arithmetic gates. Conflicting supplied evidence
still blocks calculation. Unknown market remains unknown; an overseas profile
cannot establish a US formulation. The ordinary combined route additionally
requires a supplied US claim. No assessment establishes barcode matching, current
packaging, current shelf contents or independent human/physical-package review.

## Separate combined rating

For a supported ordinary product with determined nutrition and complete attributed
assessments:

```text
nutritionComponent = nutritionScore100 * 0.6
deduction = sum(supplied classified additive deductions)
additiveComponent = max(0, 30 - deduction), within the verified supported cases
organicComponent = 10 if officially certified; otherwise 0 after assessment
rawCombined = nutritionComponent + additiveComponent + organicComponent
combined = round(rawCombined), capped at 49 when a red assessment applies
```

The published classification deductions are green 0, yellow 6, orange 15 and red
30. These inputs require a complete, attributed full-ingredient assessment and
attribution for each distinct classified item. Provider-reported identifiers,
verified additive names, historical regulatory actions and provider-reported
empty lists supply no classification or automatic 30-point award. No real sample
has been promoted into a complete additive assessment. Organic status requires
attributed certified/not-certified evidence; missing is not non-organic and its
weight is not redistributed.

The US route also requires a hydrogenated-oil assessment. The public help rule
supports a single fully hydrogenated oil deduction of 15 or partially hydrogenated
oil deduction of 30 with the red cap. The implementation does not infer their
presence/absence from missing ingredient data. Mixed oil/additive deductions and
multiple oils remain unavailable until their aggregation is verified. Duplicate
additive assessments are rejected. Non-red deductions above 30 remain guarded
because their floor behavior has not been independently established.

Salt uses its published special rule: zero nutrition contribution, additive
component up to 30, and separately evidenced unrefined and sea-extraction bonuses
of 10 each, maximum 50. Known source conflicts still block salt. Plain water has
a separately named `waterException=10`; the simulator awarded it with organic
disabled. It is not an organic-certification claim and does not waive missing
additive/oil assessments. Chocolate's special weights are documented, but its
complete cocoa conversion is unverified, so the combined rating is unavailable.

## Reference checks and known departures

Four original-workbook examples provide independent arithmetic checks: general
cereal raw 10/C, Camembert raw 14/D, rapeseed oil raw 5/C, and sweet soft drink raw
12/E. These are the workbook's CIQUAL examples, not US manufacturer observations.

Simulator observations saved in `simulator-verified-checks.json`,
`simulator-fresh-checks.json` and `simulator-floor-checks.json` establish bounded
checks, not exhaustive app equivalence. Rows displaying a required-field error or
blank output are not successful reference cases. Scenario names are test labels,
not evidence that a presumed additive color was correct.

- Nutrition 13 yields 7.8 weighted points, displayed as 8; adding 30 and no organic
  bonus gives 38. Nutrition 57 yields 34.2, displayed as 34, with total 64.
- A red case and tested multiple-red mixtures yield zero additive points and the
  49 cap. Organic's 10 points do not lift that cap.
- Plain water produced 60 nutrition + 30 additive + 10 exception = 100 despite
  organic being disabled.
- Six tested polyols produced a 24-point deduction, leaving 6 additive points.
  They were not demonstrated to be six yellow items. This does not verify the
  non-red floor for deductions above 30.
- The tested fully hydrogenated oil plus E420 input produced only a six-point
  deduction in the simulator, conflicting with the public US oil description.
  The implementation retains the attributed single-oil help rule and rejects
  mixed aggregation; it does not claim the simulator established that rule.

An important energy-boundary discrepancy remains: the official workbook converts
80 kcal to 336 kJ, yielding one general energy point and nutrition 75 when all
other contributions are zero. The Yuka simulator yielded nutrition 80 and a
non-organic combined 78 for that input. Its underlying kcal conversion constant
was not established. Trace keeps the verified workbook rule rather than fitting
an undocumented constant. Therefore even complete input does **not** promise the
same number as Yuka's app or database.

## The 18-observation comparison

Values below are /100 for reproducibility; the UI displays /10. A range denotes
possible conversions and **no assigned point estimate**. Earlier density values
use their original profiles and different equations. No ranking-validity claim
follows from a changed number.

| Observation | Prior density | Published-method nutrition | Change or remaining barrier |
| --- | ---: | ---: | --- |
| Rice Krispies | Unavailable | Unavailable | Existing package/panel conflict retained. |
| Frosted Flakes | 26 | 9 | Different published formula; reviewed qualifying-plant fraction is zero. |
| Whole Natural Almonds | 90 | 100 | Original general-food rules and source-derived 100% qualifying nuts. |
| Jif Creamy Peanut Butter | 61 | Range 1–40 | Qualifying peanut fraction unknown; no guessed percentage. |
| Santa Fe Rice & Beans frozen meal | 64 | Range 90–100 | Qualifying mixed-food fraction unknown. |
| Oscar Mayer Classic Wieners | 27 | 0 | Published limiting points and protein gate; no additive penalty inferred. |
| Nature Valley protein bars | Unavailable | Unavailable | Existing conflicting panels and absent serving mass. |
| Farmhouse Hearty White bread | 61 | Unavailable | Per-100-g method requires missing serving mass. |
| Dave's 100% Whole Wheat | 68 | 100 | Unknown plant fraction changes raw points but not the converted result. |
| Post Shredded Wheat Big Biscuit | 100 | 100 | Source-derived zero qualifying plant fraction; grain is not this component. |
| Pompeian olive oil | Unavailable | 50 | Added-fat rule; omitted sugar/fiber point bounds constrained by declared carbohydrate. |
| Pepsi | Unavailable | Range 0–3 | Missing fiber allows different results; no point estimate. |
| Diet Pepsi | Unavailable | 68 | Declared totals constrain omitted subcomponent points; nulls retained. |
| Pure Leaf unsweetened tea | Unavailable | 68 | Explicit US-volume conversion, source-derived zero qualifying plants and bounded omissions. |
| FAGE Total 0% plain | 68 | 100 | Published formula; reviewed milk/culture ingredient composition. |
| FAGE Total 2% strawberry | 41 | 100 | Unknown plant fraction cannot change the published nutrition conversion. |
| Raw apple | Unavailable | 100 | Entire earlier FDA vector replaced by attributed USDA composition. |
| Raw broccoli | Unavailable | 100 | Entire earlier FDA vector replaced by attributed USDA composition. |

There are **12 determined nutrition ratings**, three unresolved numerical ranges
and three invalid/basis-conflicted observations. **Zero of 18 has a combined
rating**, because the required additive/organic/oil assessments are incomplete.
This small purposive sample measures neither national grocery coverage nor
scanned-product coverage. High nutrition results for several different foods and
ties between identical whole/refined nutrient profiles remain method limitations,
not proof that those products are interchangeable or healthy in every context.

The new generic profiles use USDA SR Legacy records
[171688](https://api.nal.usda.gov/fdc/v1/food/171688?api_key=DEMO_KEY) and
[170379](https://api.nal.usda.gov/fdc/v1/food/170379?api_key=DEMO_KEY), published
2019-04-01 and captured 2026-10-19. Their source hashes and nutrient IDs/derivations
are bundled in `publishedNutritionReferences.json`. Both original FDA profiles
remain in `priorProfiles`; values are not spliced between providers. Added sugars
remain unknown in the USDA records. Existing audits and regulatory archives are
preserved.

## File inventory and validation checkpoint

This method-replacement task adds exactly these eight files:

```text
src/development/publishedNutritionScoring.js
src/development/publishedNutritionScoring.test.js
src/development/publishedNutritionFixtures.js
src/development/publishedNutritionFixtures.test.js
src/development/__fixtures__/publishedNutritionReferences.json
src/development/publishedCompositeScoring.js
src/development/publishedCompositeScoring.test.js
docs/yuka-method.md
```

It updates these four existing preview/tool files:

```text
src/development/NutritionPilot.jsx
src/development/NutritionPilot.css
src/development/NutritionPilot.test.jsx
scripts/verify-nutrition-pilot.cjs
```

The previously uncommitted preview loader in `src/index.js`, its development-mode
guard, older density modules/fixtures and all unrelated work are preserved; they
are not new edits in this replacement task. No dependencies, production build,
commit or push are part of this work.

Final validation completed across 2026-10-19/20, serially:

- **560 tests passed across 16 distinct suites**: 235 method/fixture/composite/preview
  and preserved-density tests, plus 325 existing nutrition, identity, serving,
  storage, ingredient and scanner regressions. Targeted reruns followed test-only
  assertion/lint corrections; passing unchanged suites were not repeatedly run.
- Changed-file ESLint: no errors or warnings. Node syntax, JSON parsing and
  whitespace checks passed, including untracked task files.
- Local Chrome checked 390x844 mobile and 1280x960 desktop. All seven themes
  retained distinct colors, no page overflow, 44-pixel ingredient controls and
  primary/secondary text contrast above 4.5:1. The additive-status link remains
  visible beside the mobile rating. Normal Trace loads without opt-in.
- Screenshots were visually inspected: [mobile](../artifacts/yuka-method-20261019/pilot-mobile-390x844.png),
  [desktop](../artifacts/yuka-method-20261019/pilot-desktop-1280x960.png) and
  [expanded ingredients/additives](../artifacts/yuka-method-20261019/pilot-additives-390x844.png).
- Preservation hashes confirmed that only the four listed existing files changed;
  eight new files were added. The other **674 recorded paths**, HEAD and empty
  index were unchanged, including old density inputs, audits and regulatory archives.
  No scanner, food logging, saved-data, production grading or Zibblez changes.
- No dependencies, production build, commit, push, deployment or physical-device
  test. These checks establish implementation behavior, not scientific validation
  or product-specific Yuka equivalence.

Detailed test, lint, browser and preservation reports are in
`artifacts/yuka-method-20261019/`. The checkpoint there records completed work so
an interruption can be resumed without discarding or repeating it.

Focused method and preview checks can be reproduced from the repository root:

```powershell
$env:CI = 'true'
node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --runTestsByPath src/development/publishedNutritionScoring.test.js src/development/publishedCompositeScoring.test.js src/development/publishedNutritionFixtures.test.js src/development/NutritionPilot.test.jsx
```

The next useful step is a small, explicitly reviewed set of complete ingredient,
organic and US oil assessments plus resolution of the documented calculator/app
discrepancies. It should demonstrate the separate combined calculation without
copying a risk database, inventing missing classifications or expanding public
grading.
