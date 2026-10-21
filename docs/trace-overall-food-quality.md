# Experimental overall food-quality ingredient screen

Development-only policy refinement, reviewed 2026-10-20. Starting HEAD:
`b095a4e93f61e07175fefd58ee0c681ba0a667c3`. Preserves the working combined
assessment, including its unchanged 20% adjustment budget and concern weights.
Nutrition v2, its source vectors, eligibility and all 21 saved nutrition results
are unchanged. No provider records or historical research archives are rewritten.
Public `grade=null`, `scoreReady=false`; no experimental scores enter food logging.

## Actual result

Of the same 21 captured observations: **20 nutrition scores**, **4 reviewed overall**,
**14 provisional overall**, **2 nutrition-only** (Frosted Flakes and Chobani, missing
ingredient evidence), and **1 nutrition unavailable** (Diet Coke, existing basis gap).
The original twenty retain 19 nutrition scores; Teddy remains the additional comparison.
Ingredient coverage, independently of nutrition availability: 4 reviewed, 15 partial,
2 without usable evidence. Seven scored observations have supported raw deductions;
six have lower whole-number ratings. Previously those counts were six and five.
No synthetic fixture contributes to these counts. A reviewed declaration is not
independently verified composition, a completed exposure assessment or a safety finding.

## Teddy and identity corrections

The captured Open Food Facts record for `044000045586` declares soy lecithin,
calcium carbonate ("source of calcium"), baking soda and natural flavor. Its tags
are `en:e322`, `en:e322i`, `en:e500`, `en:e500ii`. Previously lecithin had weight
0; bicarbonate, calcium carbonate and unspecified flavor were null. Thus the known
sum was 0 and provisional overall equaled nutrition 46. This was incomplete
classification, not a different nutrition input or rounding error.

The new bicarbonate limited weight 0.2 yields `46 * (1 - 0.20 * 0.2) = 44.16`,
rounded once to **44**, a displayed deduction of **2**. Calcium carbonate and
flavor constituents remain unresolved; the possible budget range is **37–44**.
Teddy is still provisional. Yuka's observed 36 is not used as a target and is not
a verified matched formulation/source edition. No invented additives or quantities.

The screen and disclosure now group E322/E322i and E500/E500ii while preserving
all four original tags. A parent is not an additional occurrence. Explicit E322i
and E322ii, or E500i/E500ii/E500iii, remain distinct; generic parent text cannot
corroborate competing subtypes. Shared ambiguous provenance is retained and labeled,
not promoted into specific presence. Negations and alternative-use qualifications
survive grouping. The existing provider normalization, original eight verified-name
reference entries and saved/cache formats are unchanged. EFSA's
[lecithin identity section 3.1.1](https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2017.4742)
explicitly distinguishes JECFA INS 322i and 322ii and covers both in its assessment;
the local notes do not create new historical name-reference bindings.

## Exact policy

`trace-overall-declared-profile`, version `3-screening-experimental-2026-10-20`:

```text
N = unchanged whole-number Trace Nutrition v2 score
weight = 0 reviewed / 0.2 limited / 0.5 moderate / 1 substantial / null unassessed
ConcernKnown = min(1, sum of applicable distinct known weights)
rawOverall = N * (1 - 0.20 * ConcernKnown)
overall = Math.round(rawOverall)
displayed additive deduction = N - overall
partial possible range = Math.round(0.80*N) through overall
```

The relative weights borrow 6:15:30 from
[Yuka's published deductions](https://help.yuka.io/l/en/article/yth80j3vle-sources-analysis-of-food-additives).
[Yuka's classification criteria](https://help.yuka.io/l/en/article/uell2r13f8-classification-food-additives)
consider seriousness, evidence and estimated exposure. Trace does not copy their
classifications, risk-free label, formula or cap of 49. The weights and 20% cap are
an approved experimental precautionary policy, not measured probabilities or
severity of harm. The raw result retains at least 80% of nutrition before whole-number rounding. The policy
never gives a bonus, organic points or an assumed nonorganic status.

The maximum raw deduction is **20% of the nutrition score, not 20 points**.
For nutrition 50, the cap is 10 raw points; for nutrition 100, it is 20.
Final whole-number rounding can change the displayed deduction by up to half a point.
The expandable calculation allocates raw deductions as
`N * 0.20 * individualWeight / max(1, sumWeights)`. This preserves the same capped
formula, shares a saturated budget proportionally, and never rounds each additive
separately. An individual contribution is a policy adjustment, not measured harm.
Checkpoint approval preserves this development implementation; it does not validate
its scientific classifications or calibration for consumer release.

Current nonzero batch classifications are **limited only**. No moderate/substantial
finding is forced into the data. Those approved weight levels remain defined;
synthetic tests exercise accumulation and the cap, not claimed real-world coverage.

Unknown items stay null and are excluded only from the *known* sum. A mixed,
source-attributed declaration can be screened without package-specific laboratory
testing. Fully reviewed means no unresolved relevant identities in the available
declaration under this small policy, not certified safety or complete chemistry.
A partial review uses supported deductions, prominently says **PROVISIONAL**, and
may decrease after review. The details retain the full remaining budget range;
that range is not a statistical confidence interval. Missing/entirely unassessed
evidence yields no overall rating and never blocks an available nutrition score.

## Scientific classifications and limits

Each batch record in `src/development/additiveScreeningPolicy.js` retains its exact
aliases, function, classification/weight, rationale, source URL/edition, review date,
human/animal evidence, applicability and conflicting findings. These are local
development policy notes, not additions to the legal registry or claims of US approval.

- **Added E338/E339/E341 phosphates: 0.2 each when explicitly identified.**
  [EFSA 2019](https://www.efsa.europa.eu/en/press/news/190612) found that total dietary
  intake may exceed its reference in some age groups. Phosphorus is essential;
  this does not establish excess intake from a package. Its group reference includes
  natural sources and excludes moderate/severe kidney impairment. The screen applies
  only to added phosphate identities, not every naturally occurring phosphorus source.
- **E968 erythritol: 0.2.** [NIH 2023](https://www.nih.gov/news-events/nih-research-matters/erythritol-cardiovascular-events)
  describes human associations and mechanistic work, including a small ingestion
  study, not a trial proving clinical harm. [EFSA December 2023](https://www.efsa.europa.eu/en/plain-language-summary/re-evaluation-erythritol-e-968-food-additive)
  found no established dietary cardiovascular causation and set a dose-related
  diarrhoea reference. The limited precaution retains both findings and unknown exposure.
- **E250 nitrite in explicitly declared meat use: 0.2.**
  [EFSA 2017](https://www.efsa.europa.eu/en/press/news/170615) describes nitrosation,
  high-intake uncertainties and low concern from permitted additive uses.
  [NCI 2021](https://www.cancer.gov/news-events/cancer-currents-blog/2021/red-meat-colorectal-cancer-genetic-signature)
  discusses meat-associated human findings and possible mechanisms, not isolated
  additive causation. No nitrite is inferred from cultured celery juice; no product
  cancer risk, harmful dose or nitrosamine amount is claimed.
- **E415 xanthan and E472e DATEM: 0.2 each.** The
  [2024 French prospective diabetes cohort](https://pubmed.ncbi.nlm.nih.gov/38663950/)
  reports associations for both. These are limited screening signals, not causal
  conclusions. DATEM's association is small and borderline. Confounding, correlated
  exposures, intake error and replication/US generalizability remain material.
  [EFSA's xanthan assessment](https://efsa.onlinelibrary.wiley.com/doi/abs/10.2903/j.efsa.2017.4909)
  reached a different general-food conclusion from toxicology/refined exposure.
- **E471 mono/diglycerides: 0.2.** A
  [2024 prospective cancer study](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1004338)
  reports adult intake associations needing replication; it does not isolate causation.
  [EFSA 2017](https://efsa.onlinelibrary.wiley.com/doi/abs/10.2903/j.efsa.2017.5045)
  found no concern at reported uses. Trace does not extrapolate findings to every
  emulsifier or infer trans fats from this identity.
- **E500ii sodium bicarbonate: 0.2, limited preliminary evidence.** The same
  [2024 primary cancer paper](https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1004338)
  explicitly names sodium bicarbonate, although it reports the broad code E500.
  Its result is a premenopausal breast-cancer subgroup association (HR 1.48,
  95% CI 1.07–2.05), not a general-population finding or proof of causation.
  The previous screen recorded this result but assigned null because consumer
  population was unknown. This refinement applies the existing limited-precaution
  tier consistently to that documented signal, without assuming any user's
  subgroup, exposure or outcome. It is a contestable experimental policy judgment,
  not a demonstrated defect in the food or a regulator-assigned deduction.
  [FDA's SCOGS inventory](https://www.hfpappexternal.fda.gov/scripts/fdcc/index.cfm?order=ASC&search=CARBON&set=SCOGS&sort=Sortsubstance)
  records independent expert report 26 (1975), conclusion type 1 for sodium
  bicarbonate at then-current/expected uses; that contrary historical conclusion
  remains attached and does not address the newer cohort. Multiple testing,
  confounding, intake errors and replication needs remain explicit. Neither the
  study nor weight transfers to sodium carbonate, sesquicarbonate or generic E500.
- **E282 calcium propionate: 0.2.** A US
  [randomized crossover study](https://pubmed.ncbi.nlm.nih.gov/34312159/)
  (2021-07-26, doi:10.1136/bmjdrc-2021-002336) tested 1500 mg calcium propionate
  in 28 healthy adults. Acute counterregulatory hormone responses and glucose
  production under hypoglycemic clamp are surrogate endpoints, not incident
  diabetes or evidence about a bread serving. The small, short study supports
  only limited precaution under this policy; no quantity is assigned to a food.
  [EFSA 2014](https://efsa.onlinelibrary.wiley.com/doi/abs/10.2903/j.efsa.2014.3779)
  found no concern at assessed maximum food-use concentrations. Both findings
  remain visible. No transfer to other propionate salts or gut-produced propionate.
- **E322 lecithins, E422 glycerol, E1200 polydextrose: 0** for this general-grocery
  batch, based on the linked scientific assessments, not authorization alone.
  [Lecithins](https://efsa.onlinelibrary.wiley.com/doi/abs/10.2903/j.efsa.2017.4742),
  [glycerol](https://efsa.onlinelibrary.wiley.com/doi/abs/10.2903/j.efsa.2017.4720),
  [its 2022 follow-up](https://efsa.onlinelibrary.wiley.com/doi/abs/10.2903/j.efsa.2022.7353),
  and [polydextrose](https://efsa.onlinelibrary.wiley.com/doi/abs/10.2903/j.efsa.2021.6363)
  retain reported-use limits, contaminant-specification qualifications and gastrointestinal
  considerations. Allergy suitability is separate. Zero is no qualifying concern in
  this review, not proof of no risk at every dose or for every population.
- **Benzoates E211/E212: conditional 0.2 only with explicit beverage/cofactor evidence.**
  [FDA's historical beverage survey/explanation](https://www.fda.gov/food/environmental-contaminants-food/questions-and-answers-occurrence-benzene-soft-drinks-and-other-beverages)
  describes benzoate plus ascorbic/erythorbic acid, with heat/light encouraging benzene
  formation, but no survey-level consumer concern. The interaction is counted once
  on the benzoate; citric acid is not vitamin C. Unestablished conditions stay null.
  No real scored observation in this batch triggers this rule.

These source-based judgments do not claim current regulatory compliance. Historical
legal events and the original eight name bindings remain unchanged, shown only with
existing exact identifier/source bindings and dated qualifications. Foreign rules do
not automatically cause deductions. No Yuka product risk label is imported into policy.

## The same 21 observations

Nutrition is the previous baseline; overall is the new screened result. Provisional
numbers include only supported deductions and are not completed additive-risk assessments.

| Captured profile | Nutrition | Previous overall | Overall now | Displayed deduction | Identified screening items | Supported findings | Remaining gaps |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| Coca-Cola Original Taste | 12 | 12 | 12 | 0 | caramel-color, E338, flavor-mixture, caffeine, E150c | E338 (limited 0.2) | caramel-color; flavor-mixture; caffeine; E150c |
| Diet Coke | ? | ? | ? | ? | caramel-color, E951, E338, E212, flavor-mixture, E330, caffeine | None supported | caramel-color; E951; E212; flavor-mixture; E330; caffeine; nutrition basis unresolved |
| Kellogg's Frosted Flakes | 36 | ? | ? | ? | None identified | None supported | ingredient evidence missing |
| Kellogg's Rice Krispies | 42 | 42 | 42 | 0 | None identified | None supported | declaration gaps |
| Post Shredded Wheat Original Big Biscuit | 82 | 82 | 82 | 0 | BHT (packaging only) | None supported | BHT |
| FAGE Total 0% Plain Greek Yogurt | 87 | 87 | 87 | 0 | None identified | None supported | No unresolved declaration identities; exposure/formulation unverified |
| Chobani Strawberry on the Bottom Greek Yogurt | 80 | ? | ? | ? | None identified | None supported | ingredient evidence missing |
| Quest Chocolate Chip Cookie Dough Protein Bar | 54 | 52 | 52 | 2 | E1200, E968, E422, flavor-mixture, E960-unspecified, E955, E322i | E968 (limited 0.2) | flavor-mixture; E960-unspecified; E955 |
| Nature Valley Peanut Butter Dark Chocolate Protein Bars | 19 | 19 | 19 | 0 | flavor-mixture, E422, E322i | None supported | flavor-mixture; declaration gaps |
| Dave's Killer Bread 100% Whole Wheat | 68 | 68 | 68 | 0 | None identified | None supported | No unresolved declaration identities; exposure/formulation unverified |
| Pepperidge Farm Farmhouse Hearty White Bread | 55 | 51 | 48 | 7 | E471, E282, E200, E472e, E322i | E471 (limited 0.2), E282 (limited 0.2), E472e (limited 0.2) | E200 |
| Skippy Creamy Peanut Butter | 69 | 69 | 69 | 0 | hydrogenated-oil | None supported | hydrogenated-oil |
| Blue Diamond Whole Natural Almonds | 95 | 95 | 95 | 0 | None identified | None supported | No unresolved declaration identities; exposure/formulation unverified |
| Smart Ones Santa Fe Rice & Beans | 75 | 72 | 72 | 3 | modified-starch, E415 | E415 (limited 0.2) | modified-starch; declaration gaps |
| Stouffer's Classic Lasagna with Meat & Sauce | 70 | 70 | 70 | 0 | modified-starch, flavor-mixture | None supported | modified-starch; flavor-mixture; declaration gaps |
| Oscar Mayer Classic Wieners | 25 | 24 | 24 | 1 | E339, flavor-mixture | E339 (limited 0.2) | flavor-mixture; declaration gaps |
| SPAM Classic | 23 | 22 | 22 | 1 | modified-starch, E250 | E250 (limited 0.2) | modified-starch |
| Cheez-It Original | 19 | 19 | 19 | 0 | E319, E160b-unspecified, E322i | None supported | E319; E160b-unspecified; declaration gaps |
| OREO Original | 12 | 12 | 12 | 0 | E341, E500ii, flavor-mixture, E322i | None supported | E341; E500ii; flavor-mixture |
| Lay's Classic Potato Chips | 32 | 32 | 32 | 0 | None identified | None supported | No unresolved declaration identities; exposure/formulation unverified |
| Teddy Grahams | 46 | 46 | 44 | 2 | E170, E500ii, flavor-mixture, E322i | E500ii (limited 0.2) | E170; flavor-mixture |

Actual supported arithmetic (no product-specific score overrides):

- **Coca-Cola Original Taste**: 12 * (1 - 0.20 * 0.2) = 11.52 -> **12**. Displayed deduction: 0 point(s); before rounding: 0.48. Applied: E338 Phosphoric acid (0.48 raw points).
- **Quest Chocolate Chip Cookie Dough Protein Bar**: 54 * (1 - 0.20 * 0.2) = 51.84 -> **52**. Displayed deduction: 2 point(s); before rounding: 2.16. Applied: E968 Erythritol (2.16 raw points).
- **Pepperidge Farm Farmhouse Hearty White Bread**: 55 * (1 - 0.20 * 0.6) = 48.4 -> **48**. Displayed deduction: 7 point(s); before rounding: 6.6. Applied: E471 Mono- and diglycerides of fatty acids (2.2 raw points); E282 Calcium propionate (2.2 raw points); E472e DATEM (2.2 raw points).
- **Smart Ones Santa Fe Rice & Beans**: 75 * (1 - 0.20 * 0.2) = 72 -> **72**. Displayed deduction: 3 point(s); before rounding: 3. Applied: E415 Xanthan gum (3 raw points).
- **Oscar Mayer Classic Wieners**: 25 * (1 - 0.20 * 0.2) = 24 -> **24**. Displayed deduction: 1 point(s); before rounding: 1. Applied: E339 Sodium phosphates (subtype unspecified) (1 raw points).
- **SPAM Classic**: 23 * (1 - 0.20 * 0.2) = 22.08 -> **22**. Displayed deduction: 1 point(s); before rounding: 0.92. Applied: E250 Sodium nitrite (0.92 raw points).
- **Teddy Grahams**: 46 * (1 - 0.20 * 0.2) = 44.16 -> **44**. Displayed deduction: 2 point(s); before rounding: 1.84. Applied: E500ii Sodium hydrogen carbonate (baking soda) (1.84 raw points).

Coca-Cola's raw deduction disappears in whole-number rounding; it is **not** reported
as a zero-concern product. Diet Coke's ingredient screen finds phosphoric acid, but
cannot create a nutrition/overall rating while its existing nutrition basis is unresolved.

## Specific gaps retained

- Frosted Flakes and Chobani have no usable captured ingredient declaration.
- Generic caramel color does not identify its class or 4-MEI exposure; original OFF
  E150c/E150d claims remain attributed, uncorroborated by class-unspecified text.
  [FDA's animal/high-dose context and dietary advice](https://www.fda.gov/food/food-additives-petitions/questions-answers-about-4-mei)
  do not automatically establish a product penalty.
- Sucralose remains null: [EFSA February 2026](https://www.efsa.europa.eu/en/news/efsa-finds-sucralose-safe-when-used-currently-authorised-cannot-confirm-safety-extending-its)
  distinguishes assessed uses from prolonged heating uncertainty. A protein bar name
  does not establish how it was processed.
- TBHQ remains null after reviewing [NTP TR-459](https://ntp.niehs.nih.gov/publications/reports/tr/tr459):
  no evidence of carcinogenic activity in the long-term animal studies does not complete
  other endpoint/exposure synthesis. Packaging-only BHT is not inferred to be in food.
- Natural/artificial flavor constituents, starch modification, stevia preparation,
  annatto type and oil hydrogenation extent remain unspecified. No nitrite from celery,
  no assumed trans fat, and no guessing unknown substances by chemical-sounding names.
- Sorbic acid, aspartame and caffeine need more complete scientific
  synthesis; function or permission alone does not set their weight.
- Baking soda's limited precaution retains its specific subgroup and conflicting
  historical assessment; it is not generalized into a clinical finding for every user.
  Calcium carbonate remains null after a narrower source review: [EFSA 2023](https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2023.8106),
  sections 1.1.3 and 4, assesses technological additive uses, explicitly excluding
  safety as a calcium fortificant/supplement, and flags aluminium impurity concerns.
  Teddy's declaration says "source of calcium". Neither the technological-use
  conclusion nor a hypothetical impurity is silently assigned to that fortification
  use. FDA's historical SCOGS carbonate conclusion is also retained. No measured
  contaminants, total calcium exposure or completed fortification synthesis exist.
  Rice Krispies' ambiguous "tric phosphate" is not silently
  identified as calcium phosphate. OREO's "and/or" calcium phosphate remains conditional.
- Truncated/mismatched subingredient lists remain partial. A complete-looking declaration
  still does not exclude incidental/exempt ingredients; see [FDA ingredient-label explanation](https://www.fda.gov/food/food-additives-and-gras-ingredients-information-consumers/types-food-ingredients).
  This is a closed English vocabulary, not a universal parser. Language conflicts remain
  explicit. Empty provider tags are never used as proof of absence.

The amounts are unknown but are not a blanket prerequisite for precautionary screening.
A separate existing source-quality issue remains: the archived Quest provider snapshot
reports sodium_serving=0.00022 g (about 0.2 mg for the captured serving), an unusually
low value that warrants checking against the actual US package. This task preserves
that input and its approved nutrition score; it does not substitute an assumed value.

No hazard association becomes demonstrated harm. Remaining gaps concern particular
identities, conditions or incomplete synthesis, not a demand to lab-test every product.

## Stouffer's / Yuka comparison

Captured Classic Lasagna with Meat & Sauce (GTIN 00013800103215; 297 g package) stays
nutrition 70, now provisional overall 70. It is not the Meat Lovers Large Size screenshot
observation (215 g serving): nutrition v2 66; preserved published-method nutrition 75 only
conditional on Yuka's reported, independently unverified 51% vegetable content.
Meat Lovers overall remains unknown: no full attributed ingredient list/GTIN. Its seven
additives and Yuka high-risk descriptions for nitrite/BHA/BHT are Yuka observations only.
Yuka 45 is overall. Teddy's Yuka 36 also lacks matching formulation/GTIN evidence.
There are **no verified matched overall-score pairs**. Neither number is a tuning target.

## Interface, scope and local review

Same compact layout and existing disclosures, collapsed by default. Overall when
supported; separate nutrition subtotal and whole-number additive deduction. Partial
scores visibly say PROVISIONAL and can decrease. The short opening names the screened
substance and shows the total whole-number deduction; study narratives, raw per-rule
deductions, conflicting findings, unknowns and remaining range stay expandable.
Findings remain visible even when rounding leaves the displayed deduction at zero.
No letter ratings, safety badges, risk colors or organic bonus. All seven themes use
the existing styles; the existing CSS rule prevents the prominent /100 denominator wrapping
on a narrow screen. No scanner/camera, nutrition/logging/storage or theme changes.

The existing development + loopback + explicit URL opt-in gate is unchanged. No runtime
network requests, migrations or score persistence. Original source text, provider IDs,
legacy/missing/empty additive states and formulation uncertainty are retained.

Exact nine-file refinement inventory (all already tracked):

- src/development/additiveScreeningPolicy.js
- src/development/traceOverallFoodQuality.js
- src/development/traceOverallFoodQuality.test.js
- src/development/BarcodeNutritionReview.jsx
- src/development/BarcodeNutritionReview.test.jsx
- scripts/replay-overall-food-quality.cjs
- scripts/verify-barcode-grading.cjs
- docs/trace-overall-food-quality-2026-10-20.json
- docs/trace-overall-food-quality.md

`npm.cmd start`, open http://localhost:3000/?barcodeGrading=1 -> Nutrition -> Scan Barcode.
Existing network provider availability still applies. No feature is exposed in production.
For offline repeatable UI review (fresh bundle, no installed dependencies):

```powershell
node scripts/verify-barcode-grading.cjs --screening-refinement --serve
```

Open http://127.0.0.1:4175/?barcodeGrading=1&scenario=quest and enter 00888849000012.
This is the archived Quest observation; expected nutrition 54, provisional overall 52.
Use scenario=almonds / barcode 00041570003831 for the reviewed 95 profile. Default
scenario is labeled synthetic. Camera is stubbed; logging is memory-only in an isolated
origin/profile. Ctrl+C stops the server. Never use an old bundle after source changes.
For the captured Teddy record, use `scenario=teddy` and enter `044000045586`:
nutrition 46, deduction 2, provisional overall 44. Expand Additives to see two
provider identity groups from the four original tags, plus the ingredient-text
screen. Expand Score details for 1.84 raw points and the remaining 37–44 range.
Offline replay: `node scripts/replay-overall-food-quality.cjs` asserts all v2 results
unchanged through both the engine and integrated adapter, and writes only the existing
overall report. It prohibits network calls. The oldest lookup archive predates the
approved energy-qualifier recovery; replay and visual fixtures reuse the exact stored
qualifiers from the approved v2 source dataset after asserting identical raw values
and units. They do not modify nutrient values, source archives or application behavior.

Refinement progress/logs and visual checks are saved under
artifacts/additive-screening-refinement-20261020/. Prior checkpoint artifacts remain
unchanged. No commit, push,
deployment, dependency installation or user browser-storage access is performed.

## Completed focused validation

- 221 tests pass across 9 suites, including source-specific rules, actual Teddy grouping/arithmetic, distinct siblings, ambiguous parent evidence, conditional/negated presence, raw contributions under the cap, current integrated review, unchanged v2/adapters, scanner and ingredient behavior, real Nutrition handoff/serving math, saved payload isolation and production CommonJS repair.
- Seven JavaScript/JSX/CJS files: zero lint errors and warnings. JS/JSX/CJS and CSS parse; report JSON and whitespace checks pass.
- Offline replay checks all 21 engine results and integrated-adapter results against the unchanged approved nutrition baseline.
- Isolated Chrome checks pass at 390x844 and 1280x960; all seven themes fit, disclosures start collapsed, whole /100 denominator stays on one line, and both food controls remain unobstructed. Eleven screenshots include actual captured Teddy 44/46, its grouped disclosure, Quest 52/54 and almond 95. Memory-only saved entries omit experimental fields. No user browser profile or archive is accessed.
- Focused production scanner dependency graph (343 modules) excludes the development review, nutrition engines and additive screening policy. No full production build.
- Baseline hashes/status confirm unrelated files and original archives unchanged; HEAD remains b095a4e93f61e07175fefd58ee0c681ba0a667c3 and index empty.
- Only routine Babel large-catalog formatting notices and Git LF/CRLF notices; no failed final checks. The small captured sample does not establish national coverage. Source/US-formulation and scientific gaps above remain.

Screenshots: artifacts/additive-screening-refinement-20261020/mobile-teddy-390x844.png,
desktop-teddy-1280x960.png and mobile-teddy-additives-390x844.png. Baseline,
before/after replay results and focused validation remain in the same directory.
