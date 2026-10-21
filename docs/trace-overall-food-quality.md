# Experimental combined food-quality preview

Development-only simplification, 2026-10-20. Starting HEAD:
`f01de8f86624af73de6d57589f15a0b2f74b1032`. This updates the existing combined
assessment; Nutrition v2, nutrition inputs, eligibility, caches and saved records
are unchanged. Public `grade=null`, `scoreReady=false`. No consumer-release approval.

## Opening result

One prominent whole-number overall score. Up to three short nutrition factors
appear immediately below, selected by the magnitude of actually applied point
contributions. No new nutrient thresholds or calculations. Unknown/ranged values
with zero guaranteed contribution never become a claimed factor. Nut/oil
saturated-fat energy and fat-quality contributions share one readable factor.
The complete nutrient explanation remains in details.

A short additive note appears only for an applied, supported concern. No opening
baking-soda warning, cohort hazard ratios, source editions or technical calculation.
A small Provisional label and 'Additive review incomplete' preserve uncertainty;
source/formulation uncertainty remains one short line, with full context in details.
The existing nutrition grid, Ingredients/Additives disclosures, controls, scrolling,
seven themes and compact panel are preserved. No new cards or visible letter grades.

Nutrition subtotal, additive deduction, exact raw contributions/rounding, full
scientific evidence, contrary findings, source attribution and possible remaining
budget range are in the existing default-collapsed Score details & limitations.
Nutrition-only/unavailable states remain explicitly identified when an overall
score cannot be supported. Missing additive evidence does not block nutrition.
A reviewed declaration is not certified safety or independently verified contents.

## Same combined formula; revised evidence application

Policy `trace-overall-declared-profile`, version
`4-general-evidence-experimental-2026-10-20`. The mathematical budget and weights
are unchanged:

```text
N = unchanged whole-number Nutrition v2 result
weight = 0 reviewed / 0.2 limited / 0.5 moderate / 1 substantial / null unresolved
ConcernKnown = min(1, sum of applicable distinct known weights)
rawOverall = N * (1 - 0.20 * ConcernKnown)
overall = Math.round(rawOverall)
displayed deduction = N - overall
individual raw deduction = N * 0.20 * weight / max(1, sumWeights)
provisional possible range = round(0.80*N) through overall
```

The maximum is 20% of nutrition, not 20 points. Round the combined result once;
individual raw contributions are not separately rounded. No organic component,
product-specific override or tuning to Yuka. The weights are Trace's experimental
precautionary policy, not regulator-assigned penalties or measured health risk.

A numerical adjustment needs an integrated food-use assessment describing an
adverse-effect reference/mechanism, or an established human adverse effect.
An isolated observational/subgroup association or short acute surrogate response
alone does not support a general consumer-food penalty. No new risk taxonomy,
provider request, exposure estimate or eligibility gate was introduced.

| Identity | Numerical decision | Reason and limits |
| --- | --- | --- |
| E500ii baking soda | Remove 0.2; classification/weight null | Observational premenopausal subgroup does not establish a general consumer concern. |
| E282 calcium propionate | Remove 0.2; null | Small acute human surrogate-response study does not establish chronic dietary harm. |
| E415 xanthan gum | Remove 0.2; null | Single prospective observational signal, with contrary integrated food-use assessment. |
| E471 mono/diglycerides | Remove 0.2; null | Observational associations and unresolved confounding/replication do not establish additive-specific causation. |
| E472e DATEM | Remove 0.2; null | Small borderline cohort association, without sufficient general-consumer evidence. |
| E338/E339/E341 added phosphates | Retain existing 0.2 each | Integrated assessment identifies high-intake kidney effects and an intake reference. It concerns all dietary phosphorus; package quantity/excess is unknown. |
| E250 sodium nitrite in declared meat use | Retain conditional 0.2 | Integrated nitrosation/exposure assessment supports limited precaution; permitted-use nitrosamine contribution was considered low concern. No additive-specific cancer causation or package risk is inferred. |
| E968 erythritol | Retain 0.2 for digestive endpoint | Established dose-related laxative effects in human studies. Preliminary cardiovascular associations no longer supply the rationale for a deduction. Intake here is unknown. |
| E211/E212 benzoate + explicit vitamin C/erythorbic-acid beverage evidence | Retain conditional 0.2 | Established benzene-formation mechanism, not an isolated epidemiological association. FDA's historical survey found no consumer safety concern; ingredients do not prove benzene in a package. No scored observation here triggers this condition. |

Removed weights stay null, not 'safe' or zero-concern. Their original identity,
function, study estimates, conditions, conflicting findings, source URLs/editions
and review dates remain in the internal expandable review. All previously unknown
identities remain unknown. No transfer from calcium propionate to calcium carbonate;
fortification/purity questions for E170 remain unresolved. Packaging-only BHT is
not a food ingredient; aliases/parent tags do not multiply deductions or merge
sibling substances. E322/E322i and E500/E500ii grouping remains intact.

Sources checked narrowly against the existing notes:

- [2024 primary cancer cohort](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1004338): E500 sodium bicarbonate subgroup and E471 associations, not causal product effects.
- [2024 diabetes cohort](https://pubmed.ncbi.nlm.nih.gov/38663950/): E415/E472e observational findings.
- [2021 calcium-propionate experiment](https://pubmed.ncbi.nlm.nih.gov/34312159/): acute surrogate endpoints in 28 adults; no product dose assigned.
- [EFSA phosphates 2019](https://www.efsa.europa.eu/en/press/news/190612): integrated all-source exposure and kidney-effect reference.
- [EFSA nitrites 2017](https://www.efsa.europa.eu/en/press/news/170615): preserves low permitted-use concern and high-intake qualifications.
- [EFSA erythritol 2023](https://www.efsa.europa.eu/en/plain-language-summary/re-evaluation-erythritol-e-968-food-additive): established digestive endpoint versus unproven dietary cardiovascular causation.
- [FDA benzene explanation](https://www.fda.gov/food/environmental-contaminants-food/questions-and-answers-occurrence-benzene-soft-drinks-and-other-beverages): formation conditions and historical survey limits.

These judgments do not imply FDA endorsement, current legal compliance, harmful
exposure or a safe/unsafe product classification. Full source notes remain in
`src/development/additiveScreeningPolicy.js` and the existing replay JSON.

## All 21 observations

20 nutrition results (19/20 original groceries plus Teddy); 18 combined results:
4 declaration-reviewed and 14 provisional. Frosted Flakes and Chobani remain
nutrition-only for missing ingredient evidence. Diet Coke's existing nutrition
basis gap remains unresolved. Four raw deductions, three displayed reductions;
Coca-Cola's 0.48 raw point reduction rounds back to 12 and stays in details.

| Captured profile | Nutrition (unchanged) | Previous overall | Current overall | Deduction | Review |
| --- | ---: | ---: | ---: | ---: | --- |
| Coca-Cola Original Taste | 12 | 12 | 12 | 0 | provisional |
| Diet Coke | Unavailable | Unavailable | Unavailable | Unavailable | nutrition-unavailable |
| Kellogg's Frosted Flakes | 36 | Unavailable | Unavailable | Unavailable | nutrition-only |
| Kellogg's Rice Krispies | 42 | 42 | 42 | 0 | provisional |
| Post Shredded Wheat Original Big Biscuit | 82 | 82 | 82 | 0 | provisional |
| FAGE Total 0% Plain Greek Yogurt | 87 | 87 | 87 | 0 | reviewed |
| Chobani Strawberry on the Bottom Greek Yogurt | 80 | Unavailable | Unavailable | Unavailable | nutrition-only |
| Quest Chocolate Chip Cookie Dough Protein Bar | 54 | 52 | 52 | 2 | provisional |
| Nature Valley Peanut Butter Dark Chocolate Protein Bars | 19 | 19 | 19 | 0 | provisional |
| Dave's Killer Bread 100% Whole Wheat | 68 | 68 | 68 | 0 | reviewed |
| Pepperidge Farm Farmhouse Hearty White Bread | 55 | 48 | 55 | 0 | provisional |
| Skippy Creamy Peanut Butter | 69 | 69 | 69 | 0 | provisional |
| Blue Diamond Whole Natural Almonds | 95 | 95 | 95 | 0 | reviewed |
| Smart Ones Santa Fe Rice & Beans | 75 | 72 | 75 | 0 | provisional |
| Stouffer's Classic Lasagna with Meat & Sauce | 70 | 70 | 70 | 0 | provisional |
| Oscar Mayer Classic Wieners | 25 | 24 | 24 | 1 | provisional |
| SPAM Classic | 23 | 22 | 22 | 1 | provisional |
| Cheez-It Original | 19 | 19 | 19 | 0 | provisional |
| OREO Original | 12 | 12 | 12 | 0 | provisional |
| Lay's Classic Potato Chips | 32 | 32 | 32 | 0 | reviewed |
| Teddy Grahams | 46 | 44 | 46 | 0 | provisional |

Only three changes: Teddy 44 -> 46 (bicarbonate), Pepperidge Farm 48 -> 55
(mono/diglycerides, calcium propionate, DATEM), Smart Ones 72 -> 75 (xanthan).
Nutrition for all 21 is unchanged. All three remain provisional, not clean/safe
reviews. No source observations or archived nutrient values are altered.

Stouffer's captured Classic Lasagna with Meat & Sauce stays 70 overall/nutrition.
It is not the Meat Lovers Large Size screenshot observation: that separate panel
has Nutrition v2 66 and preserved published-method nutrition 75 only conditional
on Yuka's unverified 51% vegetable claim. Its overall remains unknown. Yuka's
observed overall scores (Meat Lovers 45, Teddy 36) are not matched formulations
or calibration targets.

## Scope, files and local preview

The existing development + loopback + explicit URL flag gate is unchanged.
No scanner/camera, logging, storage, native iOS, theme or Nutrition v2 changes.
No runtime network calls for grading and no migrations or score persistence.
Source/US formulation uncertainty, missing ingredients, partial/truncated lists,
unknown flavors/modification types and historical legal qualifications remain.
The separate archived Quest sodium source-quality concern is not repaired or
replaced with an assumed value in this task.

Exact modified files:

- src/development/additiveScreeningPolicy.js
- src/development/traceOverallFoodQuality.js
- src/development/traceOverallFoodQuality.test.js
- src/development/BarcodeNutritionReview.jsx
- src/development/BarcodeNutritionReview.test.jsx
- src/development/barcodeReviewInformation.js
- src/development/barcodeReviewInformation.test.js
- scripts/verify-barcode-grading.cjs
- docs/trace-overall-food-quality-2026-10-20.json
- docs/trace-overall-food-quality.md

Existing application: `npm.cmd start`, open
http://localhost:3000/?barcodeGrading=1 -> Nutrition -> Scan Barcode.

Offline integrated preview (archived records, stub camera, memory-only logging):

```powershell
node scripts/verify-barcode-grading.cjs --simple-review --serve
```

Open http://127.0.0.1:4175/?barcodeGrading=1&scenario=teddy and enter
`044000045586` (overall 46). Use `scenario=stouffers`, barcode `00013800103215`
(overall 70), or `scenario=quest`, barcode `00888849000012` (overall 52).
Default scenario is explicitly synthetic. Stop with Ctrl+C; no existing user
browser profile/storage is accessed. Do not reuse an old bundle after editing.

Offline replay: `node scripts/replay-overall-food-quality.cjs`. It prohibits
network calls, asserts engine and integrated-adapter nutrition against all saved
v2 results, and writes only the existing overall JSON. Legacy approximate-energy
qualifiers are recovered from the already-approved source metadata after exact
raw-value/unit assertions; no nutrient facts are invented.

Validation progress and screenshots are under
`artifacts/food-grade-simplification-20261020/`. Historical research, prior
checkpoint artifacts and unrelated work are preserved. No commit/push/deployment.

## Validation results

- 248 unique tests pass across 10 focused suites using the latest result for each suite. One existing scanner-recovery lookup timed out in the combined run; its unchanged 56-test suite passed on isolated rerun. Initial and rerun logs are both retained.
- All 21 saved observations replay through the unchanged v2 engine and integrated adapter. Only the three additive-policy score changes listed above occur.
- Eight changed code files: zero lint errors/warnings. JavaScript/JSX/CJS syntax, JSON, existing CSS syntax and whitespace checks pass.
- Isolated Chrome checks pass at 390x844 and 1280x960 with all seven themes, 13 screenshots, default-collapsed disclosures, hidden nutrition subtotal, compact opening reasons, and unobstructed Use This Food/Scan Again controls. Real archived Teddy, Quest, almonds and Stouffer's Classic are included; remaining controls are synthetic.
- The browser checks preserve serving math and memory-only logging with no experimental scores in saved payloads. No user browser profile, restored archive or storage was accessed.
- Production/test URL-flag gating and the CommonJS startup regression tests pass. Gate and shared startup-repair files remain unchanged. No full production build or deployment was run.
- Baseline hashes/status preserve all 62 unrelated entries, historical research, scanner, nutrition calculation/storage files and themes. HEAD remains the starting commit; the index is empty.

Screenshots: `artifacts/food-grade-simplification-20261020/mobile-teddy-390x844.png`,
`mobile-provisional-390x844.png` (Quest) and `desktop-stouffers-1280x960.png`.
