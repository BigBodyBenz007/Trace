# Nutrition v2: bounded calibration check

**Verdict:** reliable inputs demonstrate a milk-drink calibration problem. The original baseline scores plain nonfat milk **40**, whole milk **26**, and diet soda **85**. The approved milk-only adjustment now produces **86 / 80 / 72** for the three milks; all other 13 references remain unchanged. These are experimental policy choices, not validated health scores. See the implementation section below. “Current” in the original investigation tables refers to committed baseline `d8d4d22adc2034f243f01a8dcc4be1f04949e050`, not the revised active method.

## Fixed references and results

The 16 slots and then their coherent inputs were frozen before scoring. Inaccessible Coca-Cola/Diet Coke and Chobani pages were replaced by archived official Pepsi/Diet Pepsi and FAGE strawberry panels. Existing Smart Ones, Blue Diamond and USDA broccoli references avoided unnecessary searches. Sweetened milk is explicitly the accessible **fat-free chocolate** variant. The [standalone JSON](nutrition-v2-calibration-2026-10-21.json) preserves every source URL/edition, basis, nutrient/unit, substitution and calculation. The coverage corpus is unchanged.

Milk/sodas use the existing **beverage** rule, almonds the **nuts/fat-quality** rule, and other mass-based references **general**. No editions are spliced. Combined status is independent of source/formulation confidence and is not a safety assurance.

| Reference / source | Actual panel basis | Rule | Current nutrition | Candidate, both changes | Current combined |
| --- | --- | --- | ---: | ---: | --- |
| USDA tap water | 100 g | general* | 85 | 85 | — |
| Pepsi | 355 mL | beverage | 12 | 12 | 12 provisional |
| Diet Pepsi | 355 mL | beverage | 85 | 85 | 82 provisional |
| Umpqua plain nonfat milk | 240 mL | beverage | 40 | 86 | 40 provisional |
| Umpqua plain whole milk | 240 mL | beverage | 26 | 80 | 26 provisional |
| Umpqua fat-free chocolate milk | 240 mL | beverage | 20 | 72 | 20 provisional |
| FAGE Total 0% plain | 150 g | general | 87 | 87 | 87 reviewed |
| FAGE Total 2% strawberry split cup | 150 g, full mixed cup | general | 82 | 82 | 82 provisional |
| Post Original Big Biscuit Shredded Wheat | 51 g, 2 biscuits | general | 83 | 83 | — |
| Frosted Flakes, cereal only | 37 g | general | 20 | 20 | 20 provisional |
| Blue Diamond Whole Natural Almonds | 28 g | nuts | 95 | 95 | 95 reviewed |
| USDA raw broccoli | 100 g edible portion | general | 89 | 89 | — |
| Smart Ones Santa Fe Rice & Beans | 255 g, one package | general | 75 | 75 | — |
| Teddy Grahams Honey | 30 g | general | 20 | 20 | 20 provisional |
| SPAM Classic | 56 g | general | 21 | 21 | 20 provisional |
| Quest Chocolate Chip Cookie Dough | 60 g | general | 54 | 54 | 52 provisional |

*USDA water is mass-based; no density is assumed. Measured zero energy/sugar/fat makes this category distinction immaterial here. Every input records its category-selection reason.

Combined scoring is preserved: **12 results, two reviewed and ten provisional**. `—` means nutrition-only: no package declaration for generic water/broccoli, missing meal ingredients, or insufficient Post declaration recognition. No additive-free inference is made. Candidate overall results remain separate in JSON; unchanged screening cannot become reviewed because nutrition improves. No Yuka comparison is made.

## Exact current arithmetic and safeguards

Every panel is scaled to 100 of its **own** g or mL unit. Let `R(x,l,h)=clamp((x-l)/(h-l),0,1)`. General/nut sugar ramps are added `(2.5,25)` and total `(4.5,45)` g; beverages use `(0,10)` for each. `S` is their available maximum. General/beverage saturated fat uses `(1,10)` g; nuts use saturated/total-fat ratio `(.10,.64)`. Sodium uses `(90,900)` mg. General energy uses `(80,600)` kcal; beverages `(0,60)`; nuts use `9*saturatedFat` through the food-energy ramp, rather than total calories.

`B=max(.4*S+.3*F+.3*N, .8*max(S,F,N))`. Before applying the limiter, credits are up to eight fiber points (`8*min(fiber/5.6,1)`), two protein points (`2*min(protein/10,1)`), and five source-bound first-whole-grain points. All credits are multiplied by `(1-B)`. `raw=85-60*B-35*E+credits`; clamp to 0–100 and round once. No manufacturer/product target is present.

| Reference | S / F / N / E burdens | Limiter B | Applied fiber / protein / grain credit |
| --- | --- | ---: | --- |
| Water | 0 / 0 / 0 / 0 | 0 | 0 / 0 / 0 |
| Pepsi | 1 / unknown* / 0 / .7042 | .8000 | 0 / 0 / 0 |
| Diet Pepsi | 0 / unknown* / 0 / 0 | 0 | 0 / 0 / 0 |
| Nonfat milk | .5000 / 0 / 0 / .6250 | .4000 | 0 / .4500 / 0 |
| Whole milk | .5000 / .1204 / 0 / 1 | .4000 | 0 / .4500 / 0 |
| Chocolate milk | .7500 / 0 / .0021 / .8333 | .6000 | 0 / .3000 / 0 |
| Plain yogurt | 0 / 0 / 0 / 0 | 0 | 0 / 2 / 0 |
| Strawberry yogurt | .0963 / 0 / 0 / 0 | .0770 | 0 / 1.4767 / 0 |
| Shredded Wheat | 0 / 0 / 0 / .4872 | 0 | 8 / 2 / 5 |
| Frosted Flakes | 1 / 0 / .5229 / .5218 | .8000 | .7722 / .2162 / 0 |
| Almonds | 0 / 0 / 0 / 0 | 0 | 8 / 2 / 0 |
| Broccoli | 0 / 0 / 0 / 0 | 0 | 3.7143 / .5640 / 0 |
| Prepared meal | 0 / 0 / .2181 / .0724 | .1745 | 2.7748 / .6475 / 0 |
| Teddy | .9259 / 0 / .2593 / .6795 | .7407 | 1.2346 / .3457 / 1.2963 |
| SPAM | 0 / 1 / 1 / .4643 | .8000 | 0 / .4000 / 0 |
| Quest | 0 / .4444 / .3416 / .4551 | .3556 | 5.1556 / 1.2889 / 0 |

*Pepsi panels omit numeric saturated fat/fiber; they remain null. Their declared zero total fat and US serving support the **existing conditional rounding bound**, which cannot change the result here; fiber gets no credit. Missing added sugars for water/broccoli remain null and use measured total sugars. This is not transcription of missing values as zero.

For the reliable nonfat panel, **90 kcal / 12 g total / 0 g added / 9 g protein per 240 mL** become **37.5 kcal / 5 g total / 0 g added / 3.75 g protein per 100 mL**. Consequently `raw=85-24-21.875+.45=39.575`, rounding to **40**. Whole milk gives `85-24-35+.45=26.45` → **26**. Chocolate milk gives `85-36-29.1667+.30=20.1333` → **20**. No pipeline defect is needed to produce these results.

## Two candidate policy changes, evaluated separately and together

1. **Added sugars first:** use the existing added-sugar ramp when that declaration is usable; otherwise retain total-sugar fallback. Never infer zero from omissions/ingredients. [FDA](https://www.fda.gov/food/nutrition-facts-label/added-sugars-nutrition-facts-label) distinguishes natural milk/fruit sugars from added sugars and has no total-sugar Daily Value; this supports the distinction, not Trace's cutoffs.
2. **Milk energy treatment:** source-identified milk drinks retain mL but use the existing **80–600 kcal ramp**, replacing 0–60. Everything else is unchanged. Applying these thresholds per 100 mL is an experimental Trace choice, not an official dairy threshold or density conversion. No bonus or barcode exception is added.

| Milk reference | Current | Change 1 only | Change 2 only | Both |
| --- | ---: | ---: | ---: | ---: |
| Nonfat | 40 | 64 | 61 | 86 |
| Whole | 26 | 45 | 61 | 80 |
| Fat-free chocolate | 20 | 42 | 49 | 72 |

All 13 other references are unchanged in **each** candidate. Change 2 alone still lets lactose mask the fat difference; change 1 alone retains the energy penalty. Together, sugar/fat distinguish the milks. [Current federal guidance](https://cdn.realfood.gov/DGA.pdf), pp. 2–4, includes full-fat dairy without added sugars and retains a saturated-fat limit; the [FDA label guide](https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label) identifies saturated fat, sodium and added sugars as limiting nutrients. Neither endorses Trace's numbers.

**Tradeoffs:** differently complete labels can diverge: making nonfat's added sugars unknown yields **61** under both changes, not 86. Milk below 80 kcal/100 mL loses its energy deduction. Plant drinks, shakes, coffee blends and concentrated fruit/juice are not validated here; the milk boundary must be explicit. Water/diet soda still tie at 85 because hydration, sweeteners and micronutrients are absent from the subtotal. Almonds' exemption and sweetened yogurt's 82 remain policy tradeoffs. No additional adjustments are proposed.

## Constructed controls and captured milk observations

All controlled variants are **constructed**, not real reformulated labels. Scaling each panel and its basis together by .5, 1.25 and 2, or expressing it per 100 of the same unit, preserves its raw bounds and score (**64 checks**). No g/mL density conversion is performed. Increasing sodium on the meal from 680/800/1000/1200 mg with all other values fixed gives **75/72/67/63** in every method. Increasing added sugar within nonfat's fixed 12 g total gives current **40/40/40/40/40**, versus **86/80/74/68/61** for both changes. Increasing whole milk's saturated fat from 5 to 8 g within its fixed 8 g total fat gives current **26/26/26/26**, versus **80/78/75/73**. These original plateaus follow the strongest-component rule, not a reversal or arithmetic error. All 12 method/nutrient series are non-increasing in raw and rounded scores.

The five existing captured milk records were replayed separately and excluded from the reliable batch:

| Captured barcode | kcal / total sugar per 100 mL | Existing nutrition |
| --- | --- | ---: |
| 0021130070121, Fat Free Milk | 90 / 13 g | 2 |
| 0856312002795, chocolate reduced-fat | 140 / 12 g | 3 |
| 6111266962187, semi-skimmed milk | 45 / 0 g | 59 |
| 0811620020633, Core Power chocolate | 55.5556 / 1.6908 g | 47 |
| 0856312002757, Fairlife nonfat | 33 / 2.5 g | 55 |

For **0021130070121**, raw kcal `_value/_100g/_serving` are **90/90/216**; sugars **13/13/31.2**; serving **240 mL**. Canonical OFF fields plus volume evidence support the current **100 mL interpretation of the provider claim**. Consistent aliases do not validate the original entry. The reliable reference has **90 kcal per 240 mL**. Serving-sized values may have been entered on a reference basis, but a different manufacturer's panel cannot prove this or authorize dividing by 2.4. No replacement is made. Its score of 2 combines suspect input with policy effects and must not calibrate the engine. All five remain unverified; zeros are not repaired from food names.

## Sources, validation and scope

[USDA tap water 173647](https://fdc.nal.usda.gov/food-details/173647/nutrients) was fetched directly; [USDA broccoli 170379](https://fdc.nal.usda.gov/food-details/170379/nutrients) reuses the existing SR Legacy capture. Neither is a branded formulation.

Umpqua [nonfat](https://umpquadairy.com/our-products/milk-cream/regular-milk/fat-free-skim-milk/), [whole](https://umpquadairy.com/our-products/milk-cream/regular-milk/whole-milk/), and [chocolate](https://umpquadairy.com/our-products/milk-cream/flavored-milk/fat-free-chocolate-milk/) panels were retrieved 2026-10-21 local time; publication/package revision is unknown. Remaining sources are the existing 2026-10-19/21 manufacturer captures, copied with attribution into JSON. No mandatory hashes/reviewer IDs/new revision requirements were added.

FAGE's 150 g cup, Post's 51 g Big Biscuit panel and USDA broccoli explain differences from older grocery observations. They do not overwrite those products. Teddy's complete manufacturer comparison remains distinct from its partial provider correction; Quest/SPAM panels are unchanged.

Reproduce: `node scripts/evaluate-nutrition-v2-calibration.cjs`. It calls active v2 and the existing combined screen; candidates are isolated in-memory copies changing only the specified numeric expressions and reported sugar mode. JSON retains full arithmetic and controls. **25 focused scoring/startup tests passed**, plus 256 method/representation checks and 12 monotonic series; lint/syntax passed. Public `grade=null`, `scoreReady=false` and production flag gating are asserted. No application file, scanner, logging, theme, cache, saved record or user storage changed. No build/dependency installation.

The original investigation added this report, `docs/nutrition-v2-calibration-2026-10-21.json`, and `scripts/evaluate-nutrition-v2-calibration.cjs`. Its preceding sections describe pre-implementation investigation and validation. These three files are preserved in the complete inventory below.

## Implemented milk-only adjustment

Version **`2.1-milk-development-2026-10-21`** implements only the approved joint milk policy. The original sugar candidate was **global**. Before application edits, its milk-only equivalent reproduced **86/80/72**, with all other 13 references unchanged. Those 13 profiles do not distinguish global from milk-only preference. A constructed non-milk drink with 0 g added and 12 g total sugars per 240 mL confirms the implementation keeps the older beverage treatment (**40**), rather than granting global added-first treatment.

For eligible milk only, `S=R(addedSugar,0,10)` when usable, including declared zero; otherwise `S=R(totalSugar,0,10)`, or unknown when neither is usable. Existing validation excludes unsupported units, negative and contradictory optional declarations before this choice. Both sugar quantities remain separate; lactose is never estimated. `E=R(kcal,80,600)` on **100 mL**, not 100 g. Transferring these food-energy endpoints to volume is an explicitly experimental Trace choice, not an official dairy standard or assumed density. All other burdens, credits, weights, limiting safeguard and rounding stay unchanged. Combined remains `round(nutrition × (1 − 0.20 × known concern))`; screening rules and provisional status do not change.

Eligibility requires matching attribution/URL, explicit source classification of fluid dairy milk and measured volume. Recognized OFF tags include milks, whole, skimmed, semi-skimmed, flavored, chocolate, ultra-filtered and lactose-free milk; the reliable Umpqua inputs use their attributed official regular/flavored-milk page sections and product titles. OFF's shared liquid-and-powder ancestor alone neither qualifies nor asserts powder. No new GTIN, date or US-formulation certification requirement is introduced. Source classification does not independently verify panel accuracy or US formulation.

Milk ingredients, loose name substrings, broad dairy and `Milk/Milk Substitutes` claims alone cannot qualify. Plant drinks, juice/coffee blends, shakes/supplements, yogurt, milk chocolate, solid desserts, powders/concentrates, infant formula and conflicting category claims keep their existing policy. High-protein ultra-filtered fluid milk can qualify; protein shakes do not. Ambiguous cases remain gradable under their existing policy. Mass-only milk stays on its mass rule; supported L-to-mL normalization is allowed, g-to-mL guessing is not. This finite recognition does not claim complete milk taxonomy coverage.

The reliable references keep their original panels, sources and editions. Milk nutrition and provisional combined scores change **40→86, 26→80, 20→72**; additive deductions stay zero and screening remains provisional. All other 13 nutrition and combined outcomes stay unchanged. The JSON separately retains the historical engine, original global-sugar candidates, scoped candidate and active implementation calculations. The script reads the pinned baseline from Git without changing the checkout.

### One captured-corpus replay

The existing source-fallback script ran the same 100 captured observations **once**, through lookup, assessment and server-rendered review, writing to an isolated output path. It made no real provider requests and did not overwrite historical reports. Its reconstructed OFF-first transport and captured USDA alternatives retain the original coverage limitations; these are not live US-market results.

| Barcode / captured observation | Nutrition before → after | Combined before → after |
| --- | ---: | ---: |
| 0021130070121 — Fat Free Milk | 2 → 83 | 2 → 83 |
| 0049576000168 — Chocolate milk | 2 → 41 | 2 → 41 |
| 0856312002795 — Chocolate Reduced Fat Ultra-filtered Milk | 3 → 54 | 3 → 54 |
| 0856312002757 — Fairlife Nonfat Ultra-Filtered Milk | 55 → 86 | 55 → 86 |

All four remain **provisional and unverified**. The other 96 scores are unchanged. Coverage remains **83 nutrition / 79 combined: 13 reviewed, 66 provisional**; 90 remain loggable. No provider selection, correction identifier, logging readiness or overall status changed. All 100 reviews rendered the computed score without errors. Full comparisons appear under `corpusReplay` in the calibration JSON. The French semi-skimmed capture has conflicting `en:meals` scope and remains 59; Core Power/shakes keep their older policy.

The suspect fat-free panel still claims 90 kcal/100 mL: its new 83 is a result on the **same uncertain input**, not manufacturer confirmation or a data correction. No captured nutrients, ingredient editions or product identities were replaced.

### Validation and remaining limitations

**154 tests pass across six focused suites**, using the latest run per suite, including 36 milk-adjustment tests. Coverage includes declared zero/unknown/unusable sugar, compatible units and serving invariance, monotonic added sugar/saturated fat/sodium, eligible and excluded classifications, actual review/combined arithmetic, collapsed details, cached observations, existing barcode integration and production gating/startup. The reference script checks **384** method/representation combinations and **24** one-variable series. Changed-file lint reports **zero errors and warnings**; syntax/JSON/whitespace checks pass. Dependency traversal covers **71 paths** with no omitted untracked dependencies outside the listed inventory. Preservation checks confirm all **62 unrelated expanded Git entries** and **747 other existing file hashes** remain unchanged; HEAD and the empty index are unchanged. New controlled variants and OFF transport fixtures are explicitly synthetic; numeric reference panels remain separately attributed to their official sources.

Opening reasons still follow actually applied contributions; plain nonfat milk does not claim a sugar or energy deduction. Existing collapsed details explain the milk rule, volume ramp and source limitations. No CSS, theme, layout or scanner edits. The food cache stores observations rather than scoring results: review recomputes the new version without clearing caches or migrating saved entries. Manufacturer checks preserve Quest **220 mg sodium/60 g**, SPAM **770 mg/56 g**, Teddy **7 g added and total sugars/30 g**, and Teddy provisional overall **20**, including half/one/two-serving multiplication.

Unknown added sugar still matters: removing nonfat milk's declared zero produces **61 instead of 86**, because measured total-sugar fallback includes naturally occurring sugars. No lactose or missing zero is guessed. Broad/mass-only/conflicting classifications can retain older scores. This adjustment does not validate uncertain panels, settle other category tradeoffs or approve consumer calibration. Public `grade=null`, `scoreReady=false`; production preview flags remain ineffective.

Reproduce without overwriting historical reports:

```powershell
node scripts/evaluate-nutrition-v2-calibration.cjs
node scripts/replay-barcode-source-fallback.cjs after artifacts/milk-calibration-20261021/corpus-after.json
node scripts/evaluate-nutrition-v2-calibration.cjs --corpus=artifacts/milk-calibration-20261021/corpus-after.json
```

The corpus command is recorded for reproducibility; it was run once during this task. Create the output directory first if it is absent.

Complete implementation inventory (12 files, including the original three calibration files):

1. `src/development/milkDrinkEvidence.js`
2. `src/development/milkDrinkCalibration.test.jsx`
3. `src/development/traceUsNutritionScoringV2.js`
4. `src/development/traceUsNutritionScoringV2.test.js`
5. `src/development/barcodeNutritionAssessment.js`
6. `src/development/barcodeReviewInformation.js`
7. `src/development/BarcodeNutritionReview.jsx`
8. `scripts/replay-barcode-source-fallback.cjs`
9. `scripts/evaluate-nutrition-v2-calibration.cjs`
10. `docs/nutrition-v2-calibration-2026-10-21.json`
11. `docs/nutrition-v2-calibration-2026-10-21.md`
12. `docs/trace-nutrition-v2.md`

No staging, commit, push, deployment, user-storage access or production build. Optional manual appearance check: `npm.cmd start`, then `http://localhost:3000/?barcodeGrading=1`, Nutrition → Scan Barcode. Live provider content may differ from the frozen references.
