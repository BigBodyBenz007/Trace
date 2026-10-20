# Real US grocery barcode grading pilot — 2026-10-20

Research only. No application changes, scoring changes, user-record writes or deployment.
Revision: `537dff1417e7325a6c12e19a651ea28827a088a2` on the existing `main` branch.

## Method and evidence

[selection.json](selection.json) fixes 20 documented manufacturer/US-retailer barcode selections before the bulk lookup run. Each entry links the exact public listing. Leading-zero equivalent GTINs are handled by Trace's existing identifier code. This is a purposive sample, not a random sample or a national coverage estimate. Listing documentation establishes the intended product; it does not establish that the returned provider record is the current US formulation.

[evaluate.cjs](evaluate.cjs) imports the existing application modules with the already installed Babel CommonJS transform in memory. It calls `createRemoteBarcodeLookup` with its real local-catalog-first policy, empty user foods, no browser storage and Trace's existing deployed gateway. Candidate creation and `assessBarcodeNutrition` run unchanged. No nutrients, categories, formulation evidence, plant percentages or sweetener evidence are supplied from research fixtures, retailer pages or product-name inference. The live gateway remains a lookup service; experimental scoring runs only in this local research process.

[results.json](results.json) records normalized responses, HTTP metadata, retrieval/revision dates, measurement bases, nutrient states, provider sources, disclosures and exact assessment rejections. Every evaluation asserts `grade=null`, `scoreReady=false`, `scanMatchEligible=false` and an unchanged candidate. These are public product records only. Source attribution is retained: Open Food Facts contributors/database ODbL, USDA FoodData Central public-domain/CC0, or the existing catalog's manufacturer attribution. This small archive is research evidence, not a new relicensed product database; preserve its source notices when reusing it.

The first pass requested 19 remote lookups and resolved Chobani from the existing local catalog. A preliminary Coca-Cola connectivity probe preceded selection execution and is not included as a second observation or product. Three first-pass gateway responses were `rate-limited` despite HTTP 200. That status cannot be interpreted as a product not existing. The combined gateway failure does not establish which upstream service limited a request. No direct-provider workaround is used.

## First-pass findings

The first pass returned 17 product records: 14 Open Food Facts, two USDA and one local catalog. Fifteen were usable by the existing food-entry handoff. Sixteen had captured assessment inputs; only FAGE had all eight scoring nutrients usable together. Sixteen had ingredient text. Fourteen had a structured provider additive list: seven nonempty and seven explicitly empty. Three had no available additive list (USDA unknown twice; local legacy absence once). The other three products had no lookup payload because of rate limiting.

**No product received an experimental score.** All 14 Open Food Facts records had conflicting energy observations under the current assessment rules. There are additional independent market, category, measurement and missing-data barriers. No score or nutrient explanation is fabricated for an unresolved assessment.

### Energy consistency needs a bounded investigation

`getAssessmentDatasetNutrients` converts kJ to kcal with 4.184 and compares observations using relative tolerance `1e-9` (minimum comparison scale 1). Unequal observations become `conflicting`, with energy `value=null`. Thus the message "Energy is missing or unsupported" often means conflicting captured values, not absent provider energy. The scoring gate rejects the quality state before applying the published equations.

Examples from the captured records:

| Product and declared basis | Reported kcal | Reported kJ | kJ / 4.184 (kcal) |
| --- | ---: | ---: | ---: |
| Blue Diamond almonds, 28.349 g | 160 | 669 | 159.894837 |
| Rice Krispies, provider-declared 40 ml | 150 | 663 | 158.460803 |
| Frosted Flakes, 100 g | 351.351351 | 1629.729730 | 389.514754 |
| Quest bar, 60 g | 190 | 1160 | 277.246654 |

The almonds example demonstrates sensitivity to independently rounded energy representations. Much larger discrepancies elsewhere cannot safely be dismissed as ordinary rounding. The archived Rice Krispies serving also declares **ml** despite a gram serving description; the existing selected 100 g dataset and the serving dataset must remain distinct. Coca-Cola additionally reports added sugars exceeding total sugars, a separate conflict. No values are corrected here.

### Identity and formulation warnings

- Coca-Cola's returned record claims **Guyana**, not US availability.
- Nature Valley's returned record claims **Colombia**, with a Spanish-language product description.
- Several records claim US plus other markets or `world`. Those claims cannot establish a US-only formulation.
- FAGE's USDA title says **6 oz**, versus the selected **5.3 oz** retail listing; its serving is **150 g**. The title/size discrepancy requires review, even though it is a barcode hit and its eight scoring nutrients are present.
- Blue Diamond's provider package quantity is **28 g**, versus the documented **6 oz** can. Its category is the literal `undefined`, so no nut category can be inferred.
- Dave's record has a generic "organic bread" name and white-bread/wheat-bread tags, despite the intended 100% whole-wheat listing. Do not turn that into verified product identity by name similarity.
- Chobani uses the pre-existing manufacturer-verified local catalog entry, so the gateway is correctly not called. The local entry has no assessment snapshot or ingredient/additive disclosure data; it is usable for logging but unresolved for grading.

## Additive coverage

The first-pass nonempty lists contain 17 tag occurrences across seven products, representing ten distinct standardized identifiers. Only five occurrences (two identifiers) have an exact name/function match in Trace's deliberately small reference:

- **E322**, Lecithins, on Quest, Nature Valley, Pepperidge Farm and Cheez-It: emulsifier. Function attribution is the existing FDA lecithin inventory reference; name attribution remains the separate historical EU name reference.
- **E415**, Xanthan gum, on Smart Ones: thickener/stabilizer. Function attribution is FDA's Types of Food Ingredients; the existing dated US 21 CFR 172.695 summary preserves its conditions and does not establish product compliance.

E150c, E338, E1200, E322i, E422, E955, E968 and E472e lack an exact name/function reference in this implementation. They remain provider identifiers, without guessed names, safety labels or risk scores. In particular E150c is not substituted with the existing E150d reference, and E322i is not silently treated as its parent E322. Parent/subtype tags are not asserted to be separate physical substances.

No reported identifier in this pass matches the current catalog's scientific-concern entries. This means **no applicable catalog explanation**, not no scientific concerns or proof of safety. Provider presence is not independently verified. Empty lists do not prove an additive-free product; absent USDA/local metadata remains unknown. No ingredient parsing or automatic additive penalty is introduced.

## Reproduction and progress

```powershell
# Offline replay of captured responses; makes no provider requests:
node docs/barcode-grading-grocery-pilot-2026-10-20/evaluate.cjs
```

Only the explicit `--online` flag allows missing public-product lookups. The runner checkpoints after each product and skips completed observations when resumed. `--follow-up-rate-limited` uses a separate archive and only the three originally limited barcodes, preserving the first pass. It spaces those requests by ten seconds and does not repeat completed follow-ups.

## Final coverage after one spaced follow-up

The three follow-ups recovered SPAM, OREO and Lay's through the same lookup path. Their original limited responses remain intact in `results.json`; [follow-up-results.json](follow-up-results.json) records the later responses. [summary.json](summary.json) uses the latest observation per selected barcode, never counting retries as additional products. These are 22 remote requests in the sample plus the separate preliminary connectivity probe; one product resolved locally.

| Measure | Products out of 20 |
| --- | ---: |
| A barcode record returned, including incomplete records | 20 |
| Existing lookup status `found` | 18 |
| Existing lookup status `incomplete` | 2 |
| Usable by the existing Nutrition selection/logging safeguards | 18 |
| Captured assessment inputs | 19 |
| All eight scoring nutrients usable together | 1 |
| Experimental score produced | **0** |
| Ingredient text available | 18 |
| Structured additive lists | 16 |
| Nonempty provider additive lists | 8 |
| Explicitly empty provider additive lists | 8 |
| Unknown additive data | 3 |
| Legacy additive metadata absent | 1 |

Final providers: **17 Open Food Facts, two USDA, one existing local catalog**. A successful barcode lookup is not independent confirmation of an exact current US formulation. "Usable nutrition" above means existing food-entry usability, not suitability for nutritional grading or assurance that the source is correct. No food is actually logged in this evaluation.

### Product-by-product results

All scores below remain **unresolved**, with no nutritional ranking or inferred contributor explanation. `E` means conflicting energy observations under the existing consistency rule; it does not necessarily mean energy is absent. `C` means a supported unambiguous scoring category is missing. `M` means the captured provider market claims do not establish a US-only record. Reasons overlap; they are not mutually exclusive bins. Exact strings and all captured nutrients are in the JSON archives.

`OFF` = Open Food Facts, `USDA` = FoodData Central, `Local` = existing manufacturer-verified Trace catalog. A "US" market in this table is only a provider claim. The local catalog's historical verification is separate from a captured assessment market.

| Intended product | Documented GTIN | Returned source; market claims | Logging usable | Ingredients | Structured additive result | Why no experimental score / material uncertainty |
| --- | --- | --- | --- | --- | --- | --- |
| Coca-Cola Original Taste 20 fl oz | `00049000000443` | OFF; Guyana | Yes | Yes | E150c, E338 | E, M; saturated fat/fiber absent; added sugars exceed total sugars |
| Diet Coke 20 fl oz | `00049000000450` | USDA; US | No | Yes | Unknown | C; unknown measurement dimension; fiber absent in the captured dataset |
| Frosted Flakes 28.5 oz | `00038000196560` | OFF; US | No | No | Unknown | E; no usable declared logging serving; package quantity missing |
| Rice Krispies 9 oz | `00038000199929` | OFF; US | Yes | Yes | Reported empty | E; provider serving quantity is 40 ml despite gram serving text |
| Post Big Biscuit Shredded Wheat 15 oz | `00884912180056` | OFF; US + world | Yes | Yes | Reported empty | E, M |
| FAGE Total 0% Plain 5.3 oz | `00689544080008` | USDA; US | Yes | Yes | Unknown | C; USDA title says 6 oz and serving 150 g; all eight scoring nutrients present |
| Chobani Strawberry on the Bottom 5.3 oz | `00894700010045` | Local; no captured assessment market | Yes | No | Legacy absence | Assessment inputs not captured; existing catalog manufacturer verification does not create a new snapshot |
| Quest Chocolate Chip Cookie Dough bar | `00888849000012` | OFF; France + US | Yes | Yes | E1200, E322, E322i, E422, E955, E968 | E, C, M; protein-bar/supplement claims are not a supported general-food category |
| Nature Valley Peanut Butter Dark Chocolate protein bars | `00016000457232` | OFF; Colombia | Yes | Yes | E322, E322i, E422 | E, C, M; Spanish product record is not proof of US formulation |
| Dave's Killer Bread 100% Whole Wheat | `00013764027176` | OFF; US + world | Yes | Yes | Reported empty | E, M; generic returned name and white-bread category conflict with intended presentation |
| Pepperidge Farm Farmhouse Hearty White | `00014100070832` | OFF; France + US | Yes | Yes | E322, E322i, E472e | E, M |
| Skippy Creamy Peanut Butter | `00037600110754` | OFF; Germany + US | Yes | Yes | Reported empty | E, C, M; no inferred nut/plant fraction |
| Blue Diamond Whole Natural Almonds 6 oz | `00041570003831` | OFF; US | Yes | Yes | Reported empty | E, C; category `undefined`, package quantity 28 g instead of the documented can |
| Smart Ones Santa Fe Rice & Beans | `00025800023608` | OFF; US | Yes | Yes | E415 | E, C; category `undefined` |
| Stouffer's Classic Lasagna with Meat & Sauce | `00013800103215` | OFF; US | Yes | Yes | Reported empty | E, C; no supported specific category supplied |
| Oscar Mayer Classic Wieners | `00044700000632` | OFF; Lebanon + US | Yes | Yes | Reported empty | E, C, M; fiber absent; no additive-free inference |
| SPAM Classic | `00037600138727` | OFF; Germany + US | Yes | Yes | E250 | E, C, M; first request limited, follow-up returned a record |
| Cheez-It Original | `00024100106851` | OFF; Germany + US | Yes | Yes | E322, E322i | E, C, M; exact provider crackers tag does not map to supported `en:biscuits` |
| OREO Original | `00044000060114` | OFF; US | Yes | Yes | E322, E322i, E341, E500, E500ii | E; first request limited, follow-up returned a record |
| Lay's Classic | `00028400199148` | OFF; US | Yes | Yes | Reported empty | E, C; first request limited, follow-up returned a record |

### Rejection counts and what they mean

- **17** assessments flag conflicting provider information and unavailable/conflicting energy. These are all the OFF responses, including the follow-ups.
- **12** lack a supported unambiguous category. Some genuinely require more use/presentation evidence; others expose limited exact-tag coverage. No name-based override is applied.
- **10** lack US-only market evidence. Two claim a foreign country without US; eight combine US with other/world claims. Provider tags are not independent formulation review.
- **One** lacks a compatible measurement basis (Diet Coke). Its fiber is also absent; the assessment returns at the basis check, so its exact message list does not enumerate that downstream issue.
- **One** has no assessment snapshot (local Chobani).
- Exact returned missing-nutrient messages also include saturated fat once and fiber twice (Coca-Cola and Oscar Mayer). These overlap the conflicts above.

These counts describe actual guard behavior, not how many would score after fixing only one issue. Further plant-fraction, beverage-sweetener or other method uncertainties may remain after earlier gates; no hypothetical corrected score is assigned. No assessment reaches a numerical result, so there are **no surprising real-product scores or defensible nutrient-contribution comparisons to report**. Previously documented research-fixture scores do not transfer to these live provider observations.

### Final additive coverage and sources

The follow-ups add OREO's five tags and SPAM's E250; Lay's list is reported empty. The final sample has **23 tag occurrences, 14 distinct identifiers**, with exact verified names/functions on **seven occurrences across six products**:

- E322 Lecithins appears on the four first-pass products above plus OREO (five products).
- E415 Xanthan gum remains on Smart Ones.
- E500ii Sodium hydrogen carbonate appears on OREO; the existing FDA inventory attributes its leavening function.

The remaining **11 distinct identifiers** are unnamed by Trace's current reference. E250, E341 and E500 add to the eight first-pass unknown identifiers. No concern explanation from the existing reference matches any reported tag; one product (Smart Ones) has the existing qualified US regulatory summary. E250 is left unnamed without a newly sourced assessment, rather than importing an assumed nitrite risk classification. Barcode success or an empty additive array does not establish product compliance, safety or absence of other substances.

Official references carried by the **existing information catalog**, not a newly conducted comprehensive scientific/legal review:

- [FDA Types of Food Ingredients](https://www.fda.gov/food/food-additives-and-gras-ingredients-information-consumers/types-food-ingredients), general function table, catalog review 2026-10-20.
- [FDA Lecithin inventory](https://www.hfpappexternal.fda.gov/scripts/fdcc/index.cfm?set=FoodSubstances&id=LECITHIN), technical effect/synonyms, catalog records page update 2026-09-08 and review 2026-10-20.
- [FDA Sodium Bicarbonate inventory](https://www.hfpappexternal.fda.gov/scripts/fdcc/index.cfm?set=FoodSubstances&id=SODIUMBICARBONATE), same catalog date qualifications.
- [21 CFR 172.695](https://www.ecfr.gov/current/title-21/section-172.695), xanthan gum conditions; catalog review text through 2026-10-16, reviewed 2026-10-20. The live URL may change and does not itself establish this product's compliance.
- Verified names retain their exact [existing historical EU source/version bindings](../regulatory-source-registry.md). Those name references do not establish US approval, current authorization or independently verified product contents.

## Validation and preservation

Focused regressions: **16 suites, 520 tests passed**, 80.519 seconds, serial execution. Coverage includes the updated nutrient engine, Trace calibration, barcode assessment/gating, explanations, disclosures, scanner dialog, gateway, local/cache lookup, selection, Nutrition barcode handoff, serving precision/saved-record compatibility, USDA produce fallback and production CommonJS startup regression. Existing production/remote-host/flag-off cases reject grading access. Every one of the 23 archived observations also preserves public output `grade=null`, `scoreReady=false` and `scanMatchEligible=false`.

Offline replay passed for all **20 initial observations plus three follow-ups**, without network requests. Research-runner ESLint and syntax checks passed with **zero errors and zero warnings**. All four research JSON files parsed, all six added research files passed newline/trailing-whitespace/conflict-marker checks, and `git diff --check` passed. The focused test log contained no warning/error matches. Babel printed only its existing large-catalog code-generation formatting notices during the research runner; those modules were not edited.

The preservation check hashed **717 pre-existing paths**, including tracked application files and untracked archives: **zero changed original paths**. HEAD remains the approved commit, and all 59 original Git entries are preserved. The only new nonignored files are this README, `selection.json`, `results.json`, `follow-up-results.json`, `summary.json` and `evaluate.cjs`, all in this new research directory. Baseline/preservation snapshots and the test log are in ignored `artifacts/us-barcode-grocery-pilot-20261020/`. Nothing was staged, committed, pushed or deployed; Zibblez, user records and browser storage were not accessed.

No production build or dependency installation was needed. Scanner/camera use on a physical device and a new visual review are not part of this headless data evaluation; those implementations/layouts are unchanged.

```powershell
# Replay the three later observations separately, also offline:
node docs/barcode-grading-grocery-pilot-2026-10-20/evaluate.cjs --follow-up-rate-limited
# Focused regressions used for this evaluation (serial; no build):
$env:CI='true'
npm.cmd test -- --watchAll=false --runInBand --testTimeout=15000 --runTestsByPath src/development/barcodeNutritionAssessment.test.js src/development/barcodeReviewInformation.test.js src/development/BarcodeNutritionReview.test.jsx src/development/updatedNutritionScoring.test.js src/development/traceNutritionConversion.test.js src/development/UsdaProduceFallback.test.jsx src/services/usdaProduceFallback.test.js src/services/remoteBarcodeLookup.test.js src/services/remoteBarcodeGateway.test.js src/services/remoteBarcodeCache.test.js src/services/barcodeNutritionSelection.test.js src/services/productionCommonJs.test.js src/components/BarcodeScannerDialog.test.jsx src/components/BarcodeScannerDialog.ingredients.test.jsx src/components/BarcodeIngredients.test.jsx src/components/NutritionPage.barcode.test.jsx
```

## Smallest recommended next improvement

Investigate and specify **energy evidence reconciliation** using these captured counterexamples: distinguish independent label rounding from substantial kcal/kJ contradictions, preserve direct reported kJ for the published engine, retain both original observations and keep genuine conflicts unresolved. Add focused regression cases before a narrowly reviewed change to assessment normalization. Do not change the scoring formula, use a broad permissive tolerance, or choose whichever value produces a score.

That is a proposed next task, **not implemented here**. Afterwards reassess these identical observations before expanding category mapping or seeking stronger US formulation evidence. Resolving energy alone is not a promise of scores: market, category, basis and method-specific inputs remain separate barriers.
