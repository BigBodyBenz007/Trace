# Experimental Trace nutrition calibration, version 2

Review date: 2026-10-20. Bounded presentation correction only; the published
updated nutrient engine, input data and category rules are unchanged. Public
output remains grade=null and scoreReady=false. No scores are saved.

## Published boundaries checked

The official updated Nutri-Score FAQ, edition 2025-03-17, page 32 (PDF index 31),
and the archived official 2024-04-04 calculator specify these integer raw ranges,
ordered from the most to least favorable nutritional category:

| Family | Published raw ranges |
| --- | --- |
| General food, cheese, red meat | <=0; 1-2; 3-10; 11-18; >=19 |
| Fats, nuts and seeds | <=-6; -5 to 2; 3-10; 11-18; >=19 |
| Non-water beverages | <=2; 3-6; 7-9; >=10 |
| Plain water | Separate categorical result; no invented raw total |

Official reference: [technical FAQ](https://www.santepubliquefrance.fr/sites/default/files/rdd/document/FAQ-updatedAlgo-V11.pdf)
and [updated calculator](https://www.santepubliquefrance.fr/sites/default/files/rdd/document/Nutri-Score_Updated-algorithm_20240404.xlsx).
The FAQ was accessed again on 2026-10-20. The archived extracted official evidence
and hashes remain in artifacts/nutrition-whole-number-20261020/references/.
Letters remain internal to the original raw module; none are displayed as ratings.

## Exact revised conversion

Use the following ordered (raw point, numerical edge) anchors. For integer raw
r between adjacent anchors (a,H) and (b,L), compute:

    score = floor(H + (L-H) * (r-a) / (b-a))

| Family | Exact anchors, in increasing raw-point order |
| --- | --- |
| General food, cheese, red meat | (-17, 99), (0.5, 80), (2.5, 60), (10.5, 40), (18.5, 20), (55, 0) |
| Fats, nuts and seeds | (-17, 99), (-5.5, 80), (2.5, 60), (10.5, 40), (18.5, 20), (55, 0) |
| Non-water beverages | (-18, 79), (2.5, 60), (6.5, 40), (9.5, 20), (54, 0) |

Plain water retains 100 as a categorical reference, not a nutrient interpolation.
All other profiles are bounded below 100. No raw score is clipped: unsupported
categories, fractions, nonfinite values and out-of-envelope raw values are rejected.

The resulting integer display ranges are 80-99, 60-79, 40-59, 20-39, 0-19, in published
category order. Non-water beverages use only the latter four ranges. A worse
published category always receives a lower score than a better one. Inside a
category, scores are nonincreasing as raw points worsen; integer rounding can tie
adjacent totals. Not all integers in each display range must be attained.

## Trace-specific choices and justification

The numerical edges 80/60/40/20, equal 20-point display intervals, halfway placement
between neighboring integer raw totals, linear interpolation and downward final
rounding are Trace choices. Neither the official method nor clinical evidence
establishes these numerical endpoints or equal health distances. They provide a
transparent category-faithful research presentation; they are not an official
conversion, percentage healthy, FDA endorsement or validated risk measurement.

Halfway edges keep interpolation continuous before integer rounding. This avoids
the 19-point single-step jump possible with the earlier discrete endpoint draft.
The narrow general-food 1-2 interval still produces a 10-point step between its two
raw totals. Other slopes differ. This explicitly emphasizes published category
separation and is a real limitation, not evidence of a 10% health change. A larger
study of user interpretation is required before consumer release.

The mathematical envelopes -17..55 and -18..54 are retained only as finite outer
tail endpoints, not as the calibration of the entire scale. They are component
limits, not claims of physically attainable ideal/worst foods. The top food
endpoint is 99, so no food gets 100 from theoretical saturation or clipping.
No observed product, brand or sample percentile sets an anchor. Red meat is not
renormalized to an invented ideal; its existing protein cap remains intact.

The old global conversion spread the full mathematical envelope across 0-100,
allowing the least favorable published category into the midrange. Version 2
allocates that category exclusively 0-19. This resolves that communication mismatch
by construction; it does not establish scientific validation of exact scores or
prove that the full scale is understood correctly.

## Product comparison

All original US observations, source editions, ingredients and nutrient values
are preserved. Apples/broccoli are complete USDA generic records, not branded
formulation matches. Current shelf/scan identity remains unconfirmed. No missing
values or fruit percentages were manufactured.

| Dated US observation | Old linear /100 | Revised /100 |
| --- | ---: | ---: |
| Regular Pepsi | 56 | 18 |
| Diet Pepsi | 69 | 52 |
| Frosted Flakes | 50 | 19 |
| Blue Diamond natural almonds | 90 | 87 |
| FAGE Total 0% plain Greek yogurt | 82 | 84 |
| FAGE Total 2% strawberry split cup | Unresolved 76-83 | Unresolved 80-85 |
| White bread | Unavailable | Unavailable: serving mass missing |
| Dave's whole-wheat bread | Unresolved 75-82 | Unresolved 75-84 |
| Pompeian extra virgin olive oil | 76 | 66 |
| Post Shredded Wheat | 83 | 85 |
| USDA raw apple with skin | 79 | 82 |
| USDA raw broccoli | 85 | 87 |
| Oscar Mayer classic wieners | 47 | 18 |

Across all 18 observations, 11 remain definite and seven unresolved. A single score
is assigned only when every retained raw/category possibility gives the same
number; otherwise show a possible range, never its midpoint or favorable endpoint.
Ranges are not statistical confidence intervals, nor a claim that all enclosed
integers are attainable. Panel conflicts and missing measurement bases still
block calculation.

Almonds and broccoli tie 87 despite different nutrient profiles and category rules.
Soda and wieners tie 18 despite different uses and nutrient burdens. These ties do
not establish interchangeable portions, equal health effects or identical nutrients.
The same-nutrient whole/refined grain controls still tie, now 83; brand and grain
wording add no points. Category-aware raw thresholds and display rounding limit
fine distinctions. The two yogurts' possible ordering remains unresolved.

## Compatibility, files and review

Only the existing conversion module/test, preview component/test, browser checker
and this document are modified. No new grading engine, research framework, data
registry, dependencies or runtime requests are added. The raw nutrient engine,
fixtures, scanner, logging, serving calculations, caches, records and themes remain
unchanged. Ingredients, provider additive states, separate incomplete scientific
assessment, regulatory-review status and formulation confidence remain prominent.
No additive-risk penalty is introduced.

The previous complete conversion report/module are archived before editing under
artifacts/nutrition-calibration-20261020/*.before.txt. The prior research and
regulatory archives remain intact. Version 1 scores in the preview comparison are
historical calculations only, never the active rating.

Validation: 283 focused tests passed in four suites. The final preview test plus
eight existing scanner/logging/nutrition/serving/storage suites passed 140 tests;
accounting for repeated preview tests, 406 unique tests passed across 12 suites.
Coverage includes every raw integer, every published category interval, boundary
ordering, deterministic downward rounding, no clipping to 100, unknown inputs,
unchanged raw calculations, ingredient disclosure and absent UI letter ratings.
Changed-file ESLint is clean. JavaScript/JSX syntax, JSON and whitespace checks
passed. Git's pre-existing CRLF warning for unchanged src/index.js remains.

Mobile 390x844 and desktop 1280x960 layouts were inspected. Five screenshots cover
the opening score, desktop, ingredients/additives, regular soda and unresolved
yogurt. All seven themes passed contrast, page-width and ingredient touch-target
checks. No physical iPhone/Safari retest was performed.

Preservation: six intended existing files changed; no new application files.
The other 688 of 694 baseline paths retain their contents or missing-file state.
The raw engine, Git HEAD and staging index are unchanged. All results and source
snapshots are in artifacts/nutrition-calibration-20261020/.

No commit, push or deployment. Ready for review as an experimental
category-preserving calibration; consumer numerical interpretation remains
unvalidated and public grading stays disabled.
