# Experimental overall food-quality ingredient screen

Development-only policy revision, reviewed 2026-10-20. Starting HEAD:
`7b6188dc0a96e663d443f55320ff193d8f828ee1`. Preserves and completes the existing
eight-file overall candidate, including its unchanged 20% adjustment budget.
Nutrition v2, its source vectors, eligibility and all 21 saved nutrition results
are unchanged. No provider records or historical research archives are rewritten.
Public `grade=null`, `scoreReady=false`; no experimental scores enter food logging.

## Actual result

Of the same 21 captured observations: **20 nutrition scores**, **4 reviewed overall**,
**14 provisional overall**, **2 nutrition-only** (Frosted Flakes and Chobani, missing
ingredient evidence), and **1 nutrition unavailable** (Diet Coke, existing basis gap).
The original twenty retain 19 nutrition scores; Teddy remains the additional comparison.
Ingredient coverage, independently of nutrition availability: 4 reviewed, 15 partial,
2 without usable evidence. Six scored observations have supported raw deductions;
five have lower whole-number ratings. No synthetic fixture contributes to these counts.
The previous candidate supported only the almond declaration; it had one overall result.

## Exact policy

`trace-overall-declared-profile`, version `2-screening-experimental-2026-10-20`:

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

| Captured profile | Nutrition baseline | Overall | Coverage | Applied weights |
| --- | ---: | ---: | --- | --- |
| Coca-Cola Original Taste | 12 | 12 | provisional | E338 (0.2) |
| Diet Coke | Unavailable | Unavailable | nutrition-unavailable | None supported |
| Kellogg's Frosted Flakes | 36 | Unavailable | nutrition-only | None supported |
| Kellogg's Rice Krispies | 42 | 42 | provisional | None supported |
| Post Shredded Wheat Original Big Biscuit | 82 | 82 | provisional | None supported |
| FAGE Total 0% Plain Greek Yogurt | 87 | 87 | reviewed | None supported |
| Chobani Strawberry on the Bottom Greek Yogurt | 80 | Unavailable | nutrition-only | None supported |
| Quest Chocolate Chip Cookie Dough Protein Bar | 54 | 52 | provisional | E968 (0.2) |
| Nature Valley Peanut Butter Dark Chocolate Protein Bars | 19 | 19 | provisional | None supported |
| Dave's Killer Bread 100% Whole Wheat | 68 | 68 | reviewed | None supported |
| Pepperidge Farm Farmhouse Hearty White Bread | 55 | 51 | provisional | E471 (0.2), E472e (0.2) |
| Skippy Creamy Peanut Butter | 69 | 69 | provisional | None supported |
| Blue Diamond Whole Natural Almonds | 95 | 95 | reviewed | None supported |
| Smart Ones Santa Fe Rice & Beans | 75 | 72 | provisional | E415 (0.2) |
| Stouffer's Classic Lasagna with Meat & Sauce | 70 | 70 | provisional | None supported |
| Oscar Mayer Classic Wieners | 25 | 24 | provisional | E339 (0.2) |
| SPAM Classic | 23 | 22 | provisional | E250 (0.2) |
| Cheez-It Original | 19 | 19 | provisional | None supported |
| OREO Original | 12 | 12 | provisional | None supported |
| Lay's Classic Potato Chips | 32 | 32 | reviewed | None supported |
| Teddy Grahams | 46 | 46 | provisional | None supported |

Actual supported arithmetic (no product-specific score overrides):

- **Coca-Cola Original Taste**: 12 * (1 - 0.20 * 0.2) = 11.52 -> **12**. Displayed deduction: 0 point(s); before rounding: 0.48. Applied: E338 Phosphoric acid.
- **Quest Chocolate Chip Cookie Dough Protein Bar**: 54 * (1 - 0.20 * 0.2) = 51.84 -> **52**. Displayed deduction: 2 point(s); before rounding: 2.16. Applied: E968 Erythritol.
- **Pepperidge Farm Farmhouse Hearty White Bread**: 55 * (1 - 0.20 * 0.4) = 50.6 -> **51**. Displayed deduction: 4 point(s); before rounding: 4.4. Applied: E471 Mono- and diglycerides of fatty acids; E472e DATEM.
- **Smart Ones Santa Fe Rice & Beans**: 75 * (1 - 0.20 * 0.2) = 72 -> **72**. Displayed deduction: 3 point(s); before rounding: 3. Applied: E415 Xanthan gum.
- **Oscar Mayer Classic Wieners**: 25 * (1 - 0.20 * 0.2) = 24 -> **24**. Displayed deduction: 1 point(s); before rounding: 1. Applied: E339 Sodium phosphates (subtype unspecified).
- **SPAM Classic**: 23 * (1 - 0.20 * 0.2) = 22.08 -> **22**. Displayed deduction: 1 point(s); before rounding: 0.92. Applied: E250 Sodium nitrite.

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
- Calcium propionate, sorbic acid, aspartame and caffeine need more complete scientific
  synthesis; function or permission alone does not set their weight.
- Baking soda's observational cancer finding was a specific premenopausal subgroup;
  population applicability is not assumed for every user. Calcium carbonate's science
  remains unassessed here. Rice Krispies' ambiguous "tric phosphate" is not silently
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
scores visibly say PROVISIONAL and can decrease. Plain-English deduction reasons appear
without expanding. Evidence, unknown items and the remaining range are expandable.
No letter ratings, safety badges, risk colors or organic bonus. All seven themes use
the existing styles; one CSS rule prevents the prominent /100 denominator wrapping
on a narrow screen. No scanner/camera, nutrition/logging/storage or theme changes.

The existing development + loopback + explicit URL opt-in gate is unchanged. No runtime
network requests, migrations or score persistence. Original source text, provider IDs,
legacy/missing/empty additive states and formulation uncertainty are retained.

Exact ten-file inventory (the original eight, the batch policy and a denominator wrapping fix):

- src/development/additiveScreeningPolicy.js (new)
- src/development/traceOverallFoodQuality.js (new)
- src/development/traceOverallFoodQuality.test.js (new)
- src/development/BarcodeNutritionReview.jsx
- src/development/BarcodeNutritionReview.css
- src/development/BarcodeNutritionReview.test.jsx
- scripts/replay-overall-food-quality.cjs (new)
- scripts/verify-barcode-grading.cjs
- docs/trace-overall-food-quality-2026-10-20.json (new)
- docs/trace-overall-food-quality.md (new)

`npm.cmd start`, open http://localhost:3000/?barcodeGrading=1 -> Nutrition -> Scan Barcode.
Existing network provider availability still applies. No feature is exposed in production.
For offline repeatable UI review (fresh bundle, no installed dependencies):

```powershell
node scripts/verify-barcode-grading.cjs --overall-review --serve
```

Open http://127.0.0.1:4175/?barcodeGrading=1&scenario=quest and enter 00888849000012.
This is the archived Quest observation; expected nutrition 54, provisional overall 52.
Use scenario=almonds / barcode 00041570003831 for the reviewed 95 profile. Default
scenario is labeled synthetic. Camera is stubbed; logging is memory-only in an isolated
origin/profile. Ctrl+C stops the server. Never use an old bundle after source changes.
Offline replay: `node scripts/replay-overall-food-quality.cjs` asserts all v2 results
unchanged through both the engine and integrated adapter, and writes only the existing
overall report. It prohibits network calls. The oldest lookup archive predates the
approved energy-qualifier recovery; replay and visual fixtures reuse the exact stored
qualifiers from the approved v2 source dataset after asserting identical raw values
and units. They do not modify nutrient values, source archives or application behavior.

Validation progress/logs are saved under artifacts/additive-screening-20261020/;
visual checks use artifacts/trace-overall-food-quality-20261020/. No commit, push,
deployment, dependency installation or user browser-storage access is performed.

## Completed focused validation

- 212 tests pass across 9 suites (latest result per suite), including policy/alias/conditional rules, current integrated review, unchanged v2/adapters, scanner and ingredient behavior, real Nutrition handoff/serving math, saved payload isolation and production CommonJS repair.
- Seven JavaScript/JSX/CJS files: zero lint errors and warnings. JS/JSX/CJS and CSS parse; report JSON and whitespace checks pass.
- Offline replay checks all 21 engine results and integrated-adapter results against the unchanged approved nutrition baseline.
- Isolated Chrome checks pass at 390x844 and 1280x960; all seven themes fit, disclosures start collapsed, whole /100 denominator stays on one line, and both food controls remain unobstructed. Eight screenshots include real Quest 52/54 and almond 95. Memory-only saved entries omit experimental fields. No user browser profile or archive is accessed.
- Focused production scanner dependency graph (343 modules) excludes the development review, nutrition engines and additive screening policy. No full production build.
- Baseline hashes/status confirm unrelated files and original archives unchanged; HEAD remains 7b6188dc0a96e663d443f55320ff193d8f828ee1 and index empty.
- Only routine Babel large-catalog formatting notices and Git LF/CRLF notices; no failed final checks. The small captured sample does not establish national coverage. Source/US-formulation and scientific gaps above remain.

Screenshots: artifacts/trace-overall-food-quality-20261020/mobile-provisional-390x844.png and desktop-provisional-1280x960.png. Progress, baseline and focused results remain under artifacts/additive-screening-20261020/.
