# Shared missing-grade diagnosis — 2026-10-21

Starting HEAD: `12bc90c32194d9f545bf6d7ca1385a1d7969f0a3`. Development research only. No staging, commit, deployment, browser-profile access or saved-record migration.

## Follow-up completion: the nutrition-to-overall gap

The unnecessary restriction was an overly narrow identity vocabulary: ordinary nuts/oats/milk and clearly declared foreign-language ingredients were treated as wholly unreviewed because of wording or formatting. Ordinary foods do not require separate additive safety assessments. Shared matching now handles allergen underscores, bounded preparation/form descriptions, spaced ingredient dashes, decimal/parenthesized percentages, a limited exact French/Spanish food vocabulary, French phosphoric acid, and explicitly contextual Spanish function/SIN identifiers.

Unknown additives, unknown fortificants, uncorroborated provider tags, negations, alternatives, invalid percentages and truncated declarations remain unknown/partial. All 39 scientific policy records (including classifications, weights, evidence and qualifications) are byte-equivalent as serialized data to HEAD; only lexical matching changes. Foreign declarations always retain the limited-language partial-review warning. No barcode-specific rule or nutritional formula was added.

The dairy arithmetic is correct **under the existing policy**, which is not proof of good calibration or accurate source labels. Corrected volume evidence activates the existing beverage fallback. That rule uses both total- and added-sugar density, whichever is stronger, and a 0–60 kcal/100 mL energy ramp. This explains the surprising milk numbers without establishing a new source-data defect. No guessed milk panel or milk-specific exception was introduced.

| Same frozen 100 records | Incoming coverage patch | Completed patch |
| --- | ---: | ---: |
| Lookup products identified | 100 | 100 |
| Nutrition scores | 78 | 78 |
| Combined scores | 59 | 73 |
| Reviewed combined | 4 | 11 |
| Provisional combined | 55 | 62 |
| Nutrition-only numbers | 19 | 5 |
| Nutrition unavailable | 22 | 22 |
| Development reviews rendered correctly | 100 | 100 |

[follow-up-before.json](follow-up-before.json) preserves the incoming 78/59 baseline. [after.json](after.json) and [cached-after.json](cached-after.json) contain the final 78/73 results. The fixed-HEAD replay still reproduces 76/58, so the original patch's history is not rewritten. All 100 nutrition integers/null states are unchanged from the incoming patch. The original 20 fresh-response cohort remains 20 nutrition / 18 overall. No new sample, provider request or manufacturer research was used in this follow-up.

### Every one of the nineteen gaps

| Barcode / captured selected product | Nutrition | Incoming blocker | Final overall / status |
| --- | ---: | --- | --- |
| `00038000196560` Frosted Flakes | 36 | No declaration in captured provider response | Unavailable; nutrition-only |
| `00894700010045` Chobani strawberry yogurt | 80 | Catalog preempts separate OFF ingredient record | Unavailable; nutrition-only |
| `9339687411702` Strawberry Yoghurt | 74 | No declaration in captured provider response | Unavailable; nutrition-only |
| `0068200960548` Reserve Cheddar | 14 | Captured ingredient text empty | Unavailable; nutrition-only |
| `4316268741163` Speisequark | 74 | No declaration in captured provider response | Unavailable; nutrition-only |
| `0675625371189` Sprouted Rolled Oats | 74 | Ordinary oats obscured by sprouted/organic/gluten-free wording | 74 reviewed |
| `0021130070121` Fat Free Milk | 2 | Milk phrase unrecognized; fortificants unassessed | 2 provisional; fortificants remain unresolved |
| `4056489714392` Walnuts | 95 | Allergen markup plus ordinary nut vocabulary | 95 reviewed |
| `0011110024718` Pecan Halves | 95 | Ordinary nut/form wording | 95 reviewed |
| `4099100333985` Creamy Peanut Butter | 87 | Dry-roasted/organic wording and spaced dash | 87 reviewed |
| `0096619196470` Mixed Nuts | 90 | Ordinary nut vocabulary and preparation wording | 90 reviewed |
| `0856312002757` Fairlife nonfat milk | 55 | Ultra-filtered milk phrase; enzyme/fortificants unresolved | 55 provisional; unassessed phrases retained |
| `3168930007340` Bénénuts peanuts | 74 | French ordinary food identities | 74 provisional |
| `6111266962187` French semi-skimmed milk | 59 | French milk/form description | 59 provisional |
| `3036811460259` Vegetable soup | 77 | French foods, decimal commas, trailing comma | 77 provisional; truncation warning retained |
| `3270190174356` Ratatouille | 79 | French foods and decorated/parenthesized percentages | 79 provisional; unknown residual text retained |
| `5400117582676` Walnut kernels | 95 | French ingredient heading and trace-allergen/choking footer | 95 provisional; original text retained |
| `5449000214799` Coca-Cola sans sucres | 85 | French phosphoric acid missed; other identities unassessed | 82 provisional |
| `7755073001807` Drinking yogurt with blueberry/chia | 77 | Spanish ordinary foods and function/SIN codes missed | 77 provisional; unknown additive weights retained |

The fourteen matching gaps comprise seven English ordinary-food/formatting cases, five French ordinary-food/formatting cases, and two foreign additive-matching cases. They had declaration evidence throughout the gateway, candidate and cache path; none required inventing ingredients. Five newly recognized ordinary English compositions become reviewed and nine become provisional. Two previously provisional pistachio declarations also become reviewed through ordinary-food recognition; their 83 and 62 integers do not change. This gives the final 11 reviewed / 62 provisional partition. **Provisional results are successful assessments, not failures.**

The sole newly applied numerical deduction is the already-existing E338 phosphate rule: the French declaration explicitly names `acide phosphorique`, corroborating provider `en:e338`. Existing concern burden 0.2 gives `85 × (1 − 0.20 × 0.2) = 81.6 → 82`, raw deduction 3.4 and displayed deduction 3. Conditions, evidence qualifications and unknown exposure remain unchanged. Aspartame and other unassessed sweeteners remain null. This is not a regulator-assigned penalty or a claim of harm from this Coke product.

Spanish identifiers are accepted only in explicit function/code contexts such as `Conservantes (sin 211)`, not free `sin 211` or `sin azúcar` absence claims. Existing unknown classifications remain null, `en:e14xx` remains unknown, and E211's beverage/cofactor condition is unresolved. No numeric classification follows merely from recognizing an INS/E-number.

Review reproduced and fixed one new parser edge with synthetic negative controls: a function/SIN code followed by 0%, a negative percentage or a value over 100% could establish presence before the percentage was checked. It now retains the raw declaration and unresolved percentage without corroborating that identity; a provider-only tag stays null/conflicting. A positive declared percentage is not converted into an exposure estimate. This guard changes no outcome in the captured sample.

The established combined rule is unchanged: an attributed usable declaration needs **some** recognized ordinary-food evidence or an existing assessed additive. It does not require every ordinary ingredient to pass an individual safety review. If every available identity remains unassessed and no ordinary food is recognized, no combined number is assigned; nutrition remains separately available. Partial review does not turn unknown substances into zero-weight safety classifications. A reviewed ordinary-food declaration is not an assurance of chemical absence, allergy suitability or product safety.

### The five remaining nutrition-only cases

Four have no usable ingredient text in the **captured requested provider fields**; this does not establish that no declaration exists anywhere, in another language field or on a current package. It establishes that normalization/selection/cache did not drop a declaration present in these responses.

Chobani is different: the selected manufacturer-attributed catalog profile has no ingredient evidence, whereas captured OFF supplies a full declaration and E410/E440 tags for the same barcode/150 g presentation. Catalog priority returns before remote lookup. The independently sourced nutrition panels differ (catalog sodium 60 mg versus OFF 55 mg), and their ingredient/label editions are not proven identical. This is a source-selection limitation, not missing global evidence or a lost normalization field. No silent catalog-nutrition/OFF-ingredient merge was added. A coherent alternate-source selection policy is needed to resolve it while keeping source editions linked.

The 22 nutrition-unavailable products are unchanged: eleven distinct products have missing limiting nutrients (nine saturated-fat cases, two sodium cases; one additional missing-sugar reason overlaps saturated fat), six have incompatible/unknown measurement basis, and five have unresolved energy. Ingredient-review gaps in those products overlap these nutrition failures and are not additional unscored products. Genuine missing inputs and source conflicts were not replaced with zero.

### Dairy: source → basis → category → exact arithmetic

[dairy-calculations.json](dairy-calculations.json) preserves all five complete raw field sets, original units, entered/reference/serving bases, provider revision/retrieval metadata, normalized v2 inputs/outputs, thresholds, individual point attributions, credits and final rounding. Manufacturer publication/label-edition dates are explicitly unknown; provider edit dates are not substituted for them.

For the fat-free capture, `energy-kcal_100g=90`, `sugars_100g=13`, `added-sugars_100g=0`, `saturated-fat_100g=0`, `sodium_100g=0.14 g`, `fiber_100g=0`, `proteins_100g=9`; entered `_value` fields match the reference. `nutrition_data_per=100g` is the legacy entered-basis enum, while the explicit serving is 240 mL. OFF's canonical suffix covers 100 g or 100 mL. The supported volume reference therefore remains **90 kcal / 13 g total sugar / 0 g added sugar / 0 g saturated fat / 140 mg sodium / 0 g fiber / 9 g protein per 100 mL**. The raw serving fields agree: **216 kcal, 31.2 g total sugar, 0 g added sugar, 0 g saturated fat, 336 mg sodium, 0 g fiber, 21.6 g protein per 240 mL**. No value was relabeled as a serving fact merely because it looked more plausible.

These five have no recognized explicit comparison category in the existing resolver. Once the erroneous mass reference is removed, the adapter's existing volume-only rule chooses beverage. Per 100 mL, existing burdens are `S=max(clamp(added/10),clamp(total/10))`, `F=clamp((sat−1)/9)`, `Na=clamp((sodium−90)/810)`, `W=.4S+.3F+.3Na`, `L=max(W,.8×max(S,F,Na))`, and `E=clamp(kcal/60)`. Fiber credit is capped at 8, protein at 2, whole-grain credit is zero here. These are documented existing equations, not newly proposed rules.

| Captured dairy | S / F / Na burdens | W / L / E | Fiber / protein credit before attenuation | Raw arithmetic → score |
| --- | --- | --- | --- | --- |
| Fat Free Milk | 1 / 0 / .061728395 | .418518519 / .8 / 1 | 0 / 1.8 | `85−48−35+1.8×.2=2.36 → 2` |
| Chocolate ultra-filtered milk | 1 / .222222222 / .234567901 | .537037037 / .8 / 1 | 1.428571429 / 2 | `85−48−35+3.428571429×.2=2.685714286 → 3` |
| French semi-skimmed milk | 0 / 0 / 0 | 0 / 0 / .75 | unknown (no credit) / .62 | `85−0−26.25+.62=59.37 → 59` |
| CORE POWER chocolate | .169082126 / 0 / 0 | .067632850 / .135265700 / .925925926 | .690131125 / 2 | `85−8.115942029−32.407407407+2.326248654=46.802899218 → 47` |
| Fairlife nonfat | .25 / 0 / 0 | .1 / .2 / .55 | 0 / 1.084 | `85−12−19.25+1.084×.8=54.6172 → 55` |

In the fat-free case, added sugar supplies zero burden, but total sugar supplies one. The strongest-sugar safeguard supplies the 48-point limiting deduction; sodium's weighted burden is calculated, but does not add another deduction once that safeguard dominates. Energy supplies 35 points. Protein's 1.8-point credit is attenuated to 0.36. Clamping does not change raw 2.36; integer rounding gives 2.

All five raw reference/serving pairs scale coherently within recorded rounding. No shared conversion/arithmetic defect is demonstrated. The precise policy question is whether the **same beverage total-sugar and energy ramps should apply to volume-only milk**, including naturally occurring sugars even with zero added sugar, while protein credit is capped and attenuated. Arithmetic alone does not validate those choices. They remain unchanged for review.

Source uncertainties also remain unchanged: Fairlife nonfat's `.00012 g` sodium becomes **0.12 mg/100 mL** and **0.288 mg/240 mL** by the correct conversion; the surprising result is not permission to multiply it by 1,000 again. French milk reports zero total sugar alongside 4.9 g carbohydrates and a 470 mL serving for a 450 mL package. The fat-free/chocolate densities may merit independent evidence later, but their current internal consistency does not justify a replacement panel or prove accuracy.

### Complete-patch review and follow-up validation

- Energy remains a bounded recorded-precision comparison, not an arbitrary relative tolerance. Actual 68 kcal/284 kJ, .3/1.3 and 53/225 pairs reconcile; 345/1460 and the gross REIGN contradiction remain unresolved. Precision follows an entered pair only when both values rescale on the same dimension. The earlier 88-case energy run and gateway/input regressions are reused because those modules did not change in this follow-up. Explicit trailing-zero precision in strings is not modeled after numeric coercion, but no such energy strings occur in this sample; this is a documented representation limit, not a fabricated repair.
- Measurement dimensions use explicit source evidence, with no density guesses. A separately explicit `100ml` reference remains usable when serving/package units disagree; that does not authorize mass/volume conversion of the conflicting serving. Unknown legacy reference dimensions remain guarded.
- Failed cache refresh returns the available cached food. The prior 35-case failure/offline/native/deduplication checks and captured seeded-cache experiment are reused; no cache logic changed. A valid but poorer successful provider refresh can still replace evidence under existing lookup policy; failure fallback does not certify future source quality.
- The final three offline replays reproduce fixed-HEAD **76/58**, final fresh **78/73**, and seeded-cache **78/73**. No computed result is lost in 100 development review renders; no pipeline exception occurs. Fresh lookups make 93 intercepted gateway calls after seven catalog hits; seeded-cache lookup makes eleven intercepted refreshes. These are offline fixture transports, not new provider requests.
- **113 focused follow-up cases passed across final runs**: 77 policy tests, eleven actual-capture integration cases, 23 existing compact-review/production-flag tests and two production CommonJS transform tests. The first combined run passed 106; after adding seven SIN-percentage controls, the affected policy file passed 77/77. Counts overlap across runs and must not be added together. Integration cases include newly recognized foods, French/SIN identities, incomplete declarations, unchanged selection nutrients and no score persistence. The original correction/logging/scanner checks are reused where code is unchanged; Teddy's current review regression still passes with 7 g added sugar and provisional 20. Quest/SPAM corrections remain untouched (220 / 770 mg sodium).
- The five edited follow-up code files pass ESLint with zero errors/warnings. Original thirteen-file lint results remain applicable to untouched code. Syntax/JSON/JSONL/whitespace and complete dependency/preservation checks are recorded at task completion. No build, new dependency, manufacturer investigation, interactive browser or real browser storage operation occurred.

Final preservation/dependency check: HEAD remains `12bc90c32194d9f545bf6d7ca1385a1d7969f0a3`, the index remains empty, all **62 unrelated Git entries** and their existing file hashes are unchanged, and the complete 24-file patch resolves **86 local dependency paths** with no missing or unapproved untracked dependency. All final follow-up lint results are zero errors/warnings; syntax, JSON/JSONL and whitespace checks pass. No browser data was accessed.

This complete patch is ready for a **development-only Git checkpoint**, subject to user approval. It is not approval of the milk calibration or additive precaution policy for consumer use. Production remains `grade=null`, `scoreReady=false`, including query flags. No staging or committing is authorized here.

## Scope and evidence

The dominant gaps are incomplete or contradictory nutrition evidence and declarations outside the existing ingredient screen, rather than a review-display failure. Provisional combined assessments already work; the production gate intentionally hides all grading.

The original 20-product captures were inspected first. Their archived normalized observations, and the available 12-product raw energy capture, are useful regression evidence but do not constitute 100 full raw lookups. To measure the whole path consistently, this assignment froze the original 20 barcodes plus 80 additional distinct barcodes **before examining scoring outcomes**, then captured the actual product API responses for all 100.

- [selection-plan.json](selection-plan.json) records the selection rule before capture.
- [listings.json](listings.json) contains metadata-only category listings, URLs, HTTP outcomes, collection timestamps and response digests. Selection requested only barcode, name and brand, never nutrition/ingredients/scores/completeness.
- [selection.json](selection.json) freezes the 100 distinct GTINs, selection provenance and exclusions.
- [raw-responses.jsonl](raw-responses.jsonl) preserves each parsed original response, requested URL, response digest/status/time, original gateway result and normalizer hashes.
- [before.json](before.json) uses the gateway results captured by the original normalizer loaded at collection start, plus the five changed browser modules read from the fixed starting Git revision. [after.json](after.json) sends the same raw bodies through the changed gateway and working-tree adapters. Both exercise the actual browser lookup, local-catalog precedence, correction/selection, nutrition, combined assessment and server-rendered development review. Re-running `before` does not accidentally apply the repaired energy/ingredient comparators.
- [cached-after.json](cached-after.json) is a **synthetic-memory cache experiment**, seeded with those original gateway results and refreshed from the same saved raw responses. It is separate from fresh-lookup coverage and is not a measurement of anyone's installed cache.

Search listings were spaced at least 6.3 seconds apart; product reads at least 4.3 seconds apart, sequentially, under the documented OFF 10-search/15-product-per-minute limits. Several category searches returned HTTP 503. A single metadata-only availability retry recovered cereals and prepared meals; bars, breads and snacks remained unavailable. The predeclared fallback filled unused positions round-robin from successful categories. The final selection groups are original cohort 20, beverages 16, cereals 16, dairy 16, nuts 16 and prepared meals 16. The original cohort also contains bars, breads and snacks; those categories have less representation.

This is a purposive, provider-listed, mixed-market sample, **not** a national coverage or accuracy estimate. Known provider-listed codes make identification especially likely. A provider's US market tag does not prove US formulation. No manufacturer validation was performed or invented. Collection used the supported OFF gateway configuration without a USDA credential; configured production can prefer USDA. The fresh original cohort already scores 20/20 before this patch, compared with the older archived 19/20 source observations. That source/configuration difference is not credited to a repair.

## Pipeline and withholding branches

1. `remoteBarcodeLookup`: invalid GTIN; local catalog/user precedence; valid cache; offline/native restrictions; bounded/invalid/network gateway response. Gateway tries configured USDA first, then OFF, and returns found/incomplete/not-found/unavailable. No source-priority change here.
2. Gateway normalization: strict units, known serving conversion or reference-only logging state; missing/invalid/conflicting basis remains unknown. Optional assessment capture has bounded structural validation and can be absent without preventing ordinary logging.
3. Candidate and corrections: malformed food cannot produce a candidate; existing exact-product manufacturer corrections run before review/selection. Edit/provenance mismatch prevents assessment of an unrelated retained panel. Historical entries are never reprocessed.
4. Development nutrition adapter: unusable capture (with a separate catalog-profile route), identity/source mismatch, incompatible mass/volume, contradictory energy or required units/values, and missing limiting inputs can withhold a number. One whole dataset is selected; nutrients are not spliced across panels. Alternative panels were checked for blocked records; none independently solved the remaining failures. Missing inputs that cannot change the rounded result can already be bounded under existing v2 policy.
5. Categories: existing general/beverage/oil/nut handling is preserved. Unknown taxonomy or US market is not itself a grading prohibition; formulation uncertainty remains visible. No new FVL requirement, category defaults or plant percentages were introduced. Prepared-only fields are not silently substituted for an as-sold panel.
6. Combined assessment: requires nutrition plus an attributed usable declaration with at least some existing ordinary-ingredient or sourced additive review. Incomplete review already permits a provisional number. Missing declarations, or wholly unsupported declarations, remain nutrition-only; absent/empty tags do not establish a clean review. Unrecognized identities stay null.
7. Display: shows combined, else clearly labeled nutrition-only, else unavailable. All 100 results render and retain their computed state. All evidence disclosures remain collapsed. Production and non-local development/absent opt-in deliberately hide grading, including preview flags.

## Shared repairs

### Recorded energy precision

The comparison previously treated non-FDA-quantized kcal and reference kJ values as exact numbers. For example, 68 kcal and 284 kJ were rejected by 0.012 kJ at the lower bound even though independently rounded integers are compatible. The comparator now uses half the last recorded numeric digit for each value, while retaining existing supported serving-label allowances and the existing 4.184–4.2 convention bounds. It never changes the nutrient supplied to v2.

Precision from an entered OFF pair may follow a computed alias only when **both** actual kcal and kJ values rescale on a matching measurement dimension. Long-decimal values retain their small precision intervals. Missing values, estimated energy qualifiers and genuine contradictions remain separate. This is a consistency-comparison correction, not a nutrition formula, calorie estimate or arbitrary percentage tolerance.

Actual captured examples: Ratatouille `3270190174356` (68 kcal/284 kJ), Coca-Cola sans sucres `5449000214799` (0.3 kcal/1.3 kJ), and Mogu lychee `8850389100684` (53 kcal/225 kJ). Contradictions such as REIGN's 1,000 kcal versus 42 kJ per serving, and Spaghetti integral's 345 kcal versus 1,460 kJ per 100 g, remain unresolved.

### Reference dimensions and measurement aliases

OFF's canonical `_100g` suffix represents 100 g **or** 100 mL; `nutrition_data_per` describes the entered `_value` basis. Explicit consistent provider serving/package dimensions now bind canonical reference observations correctly, including when entered values are per serving. Entered values retain their own basis. Printed-gram/structured-mL conflicts and incompatible package/serving units remain guarded, with original fields retained.

USDA branded reference values can likewise be per 100 g or 100 mL. Observed standardized unit codes `GRM` and `MLT` are recognized as grams and millilitres. Original codes survive in assessment serving metadata; there is no density conversion or inference from a product name. Synthetic schema controls cover these input classes; the archived USDA Diet Coke wrapper demonstrates the legacy MLT/unknown-reference shape, but is not relabeled a fresh raw USDA response.

These fixes improve reference evidence and supported logging conversions. In the selected fresh OFF sample, existing serving panels already provided scores where nutrients were sufficient: dimension repairs alone add no nutrition scores. Unknown dimensions without adequate source evidence stay unknown.

Thirteen selected wrappers change reference basis/quantity metadata. Eleven of the original wrappers trigger a refresh in the seeded-cache experiment. Five consistently volume-based dairy profiles consequently use the **existing** beverage fallback instead of the previous general-food path; their changed numbers are disclosed below. This is not a change to category calculations or a manufacturer validation of their panels.

A related integration defect was also corrected: if an OFF reference is unresolved and explicit mass evidence remains in raw metadata, the remaining mL serving alone must not manufacture a beverage category. The captured tomato soup has a 120 mL serving, a gram package quantity and an unresolved reference. It now stays general/unresolved for grading while its independently declared serving remains loggable. A separately known 100 mL reference retains existing category handling even if package mass is also available; this guard does not impose a new blanket mass/volume restriction.

### Older optional assessment caches

A valid 30-day cache previously returned before remote lookup even if it predated assessment capture or retained a known basis/unit capture defect. Online web lookup now attempts one refresh per canonical barcode per service lifetime for those narrow shapes. Equivalent GTIN forms share an in-flight request. A failed/unavailable/malformed refresh returns usable cached food. Complete cache hits, offline/native behavior, local/user precedence and saved entries remain unchanged. Missing nutrients or unknown categories alone do not trigger requests. No cache clearing or historical migration occurs.

The actual development dialog regression seeds a synthetic legacy cache with the real captured Coke record but no optional wrapper: the previously unavailable grade becomes 12/100 provisional after one refreshed lookup. This demonstrates a conditional legacy-cache repair, **not** additional fresh-sample coverage or evidence that a real user's cache has that shape.

### Ingredient percentage decorations

The screen normalized `water 72.57%` into `water 72 57%`, then failed its existing exact `water` identity. A narrow trailing-percentage normalizer now recognizes the same previously reviewed identity without adding any vocabulary/classification or using the percentage as exposure. Unknown ingredient names stay unknown, zero/out-of-range percentages do not establish presence, and the complete original declaration stays intact.

The actual Mogu Mogu melon response (`8850389111352`) now supports the already-allowed provisional route: nutrition 8, provisional overall 8, with unassessed ingredients and possible range still disclosed. It is not promoted to reviewed or given an additive-safety credit.

## Initial coverage-patch validation and results (before follow-up)

This historical section preserves the incoming 78/59 findings. The completion section above and current `after.json` supersede its final counts; `follow-up-before.json` preserves the incoming per-product results.

| Outcome | Before | After |
| --- | ---: | ---: |
| Raw products evaluated | 100 | 100 |
| Gateway products identified | 100 | 100 |
| Browser lookup products identified | 100 | 100 |
| Logging-ready selected foods | 91 | 91 |
| Nutrition scores | 76 | 78 |
| Combined overall scores | 58 | 59 |
| Fully reviewed combined | 4 | 4 |
| Provisional combined | 54 | 55 |
| Nutrition-only numbers | 18 | 19 |
| Nutrition unavailable | 24 | 22 |
| Correct development review render | 100 | 100 |
| Pipeline/display errors | 0 | 0 |

Three energy-rounding cases gain nutrition; one unsupported mass-basis soup score is withheld. Thus nutrition improves by **two net**, without filling missing values. Combined assessment gains the lychee energy case and the melon percentage-text case, and loses the soup: **one net**. There is no hidden fallback labeling a nutrition-only number as combined. The original 20 fresh-response records remain 20 nutrition / 18 overall before and after. All changes occur in the expanded cohort.

| Shared cause | Before → after affected products | Action / limitation |
| --- | ---: | --- |
| Energy comparison rejects kcal/kJ | 8 → 5 | Three numeric-precision defects repaired; five unresolved declarations retained |
| Incompatible/unknown measurement basis | 5 → 6 | One formerly scored soup now correctly unresolved; includes one prepared-only response with no supported as-sold panel |
| Missing saturated fat/fat-quality input | 9 → 9 | Six selected local-catalog profiles and three OFF profiles; do not merge different provider panels or fill zero |
| Missing sodium | 2 → 2 | Source data required |
| Missing added and total sugars | 1 → 1 | Same product also lacks saturated fat; do not add this count as a separate product |
| Missing ingredient declaration | 13 → 13 | Five still have nutrition; missing/empty additive tags cannot replace a declaration |
| Declaration has no supported ingredient review | 21 → 20 | One percentage-format defect repaired; remaining English-vocabulary/language/identity limits stay explicit |
| Pipeline/display exceptions | 0 → 0 | No computed grade hidden by the development review |
| Seeded original caches refreshed | Separate experiment: 11/100 | No additional fresh scores credited to cache refresh; absent-wrapper restoration is independently tested |

Counts overlap. The five remaining energy cases are also labeled `invalid-or-conflicting-nutrient`; they are the same five products, not five extra failures. Of the 22 nutrition-unavailable products, nine lack saturated fat, six lack a compatible basis, five have unresolved energy and two lack sodium; the one missing-sugars case overlaps saturated fat. Of the 78 with nutrition, 19 lack an overall assessment: five missing declarations and fourteen without any supported declaration review. `overlaps` and exact per-product reasons in both JSON reports provide the full partition.

The six selected catalog profiles missing saturated fat are Post The Original, Original Cheerios, Oikos 20g vanilla, Old Fashioned Oats, Honey Nut Cheerios and Quick 1-Minute Oats. Existing catalog precedence is intentional and remains unchanged. OFF having another panel for a barcode is not permission to splice its saturated fat into a differently sourced/dated catalog panel. A future source-selection decision could assess a coherent alternate panel with its own attribution; this patch adds no override or extra eligibility framework.

### Changed numbers

`Unavailable` is a state, not zero. Numbers below describe the **captured profiles**, not independently verified US package contents.

| Barcode / captured name | Nutrition before → after | Overall before → after | Cause |
| --- | --- | --- | --- |
| `3270190174356` Ratatouille | unavailable → 79 | unavailable → unavailable | Compatible energy precision; French declaration outside existing screen |
| `5449000214799` Coca-Cola sans sucres | unavailable → 85 | unavailable → unavailable | Compatible energy precision; no supported declaration review |
| `8850389100684` Mogu lychee | unavailable → 6 | unavailable → 6 provisional | Compatible energy precision |
| `8850389111352` Mogu Mogu melon | 8 → 8 | unavailable → 8 provisional | Known ingredient identity with percentage decoration |
| `0051000000118` Tomato Soup | 69 → unavailable | 69 → unavailable | Conflicting reference basis retained; no invented beverage category |
| `0021130070121` Fat Free Milk | 76 → 2 | unavailable → unavailable | Corrected volume reference activates unchanged beverage handling |
| `0856312002795` Chocolate reduced-fat ultra-filtered milk | 71 → 3 | 71 → 3 provisional | Same volume/category effect |
| `6111266962187` Lait frais demi écrémé | 86 → 59 | unavailable → unavailable | Same volume/category effect |
| `0811620020633` CORE POWER chocolate milk shake | 88 → 47 | 88 → 47 provisional | Same volume/category effect |
| `0856312002757` Fairlife nonfat ultra-filtered milk | 86 → 55 | unavailable → unavailable | Same volume/category effect |

The very low captured milk numbers are **not manufacturer-validated conclusions**. For example, the fat-free milk response reports 90 kcal and 13 g sugars **per 100** and scales those to 216 kcal / 31.2 g sugars per 240 mL. The new code does not correct those numbers, certify their basis as a true package panel, or change v2 to make them look plausible. Internally consistent provider errors and the existing beverage calibration are remaining accuracy/policy limits. Further food-specific evidence is outside this assignment.

### Focused checks

- Final development run: **129/129**, including six actual-capture integration cases, original assessment cases, combined screening regressions and production-flag UI tests.
- Preceding affected gateway/energy/input run: **214/214** across six files, including all 88 energy tests. Repeated development-file counts above overlap this run and must not be added together.
- Cache suite: **35/35**, including once-only refresh, canonical GTIN deduplication, network failure fallback, offline/native behavior, local/user precedence and synthetic historical-entry preservation.
- Earlier unaffected correction, Nutrition logging, scanner-dialog and CommonJS browser-transform tests passed. One old gateway fixture initially failed because it assumed `_100g` proved mass; it was corrected to contain an actual gram-package/mL-serving conflict and passed the affected rerun. The new UI test's jsdom scroll stub and preferred async query were also corrected. No unresolved test failures remain.
- All **13 changed/new code files**: ESLint **0 errors / 0 warnings**. CJS syntax, JSON/JSONL parsing and task-file whitespace checks passed.
- The original Quest/SPAM manufacturer and Teddy regressions pass: 220 mg sodium, 770 mg sodium / 56 g, and 7 g added sugar / 30 g respectively; Teddy remains provisional overall 20.
- Production/query-flag gating remains disabled (`grade=null`, `scoreReady=false`), and the CommonJS/ESM startup repair is unchanged. No production build or interactive/live browser test was launched; UI checks used isolated jsdom plus 100 server-rendered actual reviews.
- Dependency traversal resolved 83 local files with no missing or unapproved untracked dependency. The new raw-response JSONL is an explicit required test input. Final baseline comparison found no unrelated file-hash or Git-status changes; HEAD and the empty index remain unchanged.

## Exact patch inventory

Modified application/normalization modules (no camera, logging, storage contract, theme or nutrition-mathematics edits):

- `api/nutrition/_assessmentInputs.cjs`
- `api/nutrition/_barcodeGateway.cjs`
- `src/services/remoteBarcodeLookup.js`
- `src/development/barcodeNutritionEvidence.js`
- `src/development/barcodeNutritionAssessment.js`
- `src/development/additiveScreeningPolicy.js` — identity-text formatting only; classification records and weights unchanged
- `src/development/traceOverallFoodQuality.js` — accurate limited-language warning only; scoring formula unchanged

Modified tests:

- `src/services/nutritionAssessmentInputs.test.js`
- `src/services/remoteBarcodeGateway.test.js`
- `src/services/remoteBarcodeLookup.test.js`
- `src/development/barcodeNutritionEvidence.test.js`
- `src/development/traceOverallFoodQuality.test.js`

Added:

- `src/development/barcodeGradeCoverage.integration.test.jsx`
- `scripts/replay-barcode-grade-coverage.cjs`
- `docs/barcode-grade-coverage-2026-10-21/README.md`
- `docs/barcode-grade-coverage-2026-10-21/selection-plan.json`
- `docs/barcode-grade-coverage-2026-10-21/selection.json`
- `docs/barcode-grade-coverage-2026-10-21/listings.json`
- `docs/barcode-grade-coverage-2026-10-21/raw-responses.jsonl`
- `docs/barcode-grade-coverage-2026-10-21/before.json`
- `docs/barcode-grade-coverage-2026-10-21/after.json`
- `docs/barcode-grade-coverage-2026-10-21/cached-after.json`
- `docs/barcode-grade-coverage-2026-10-21/follow-up-before.json`
- `docs/barcode-grade-coverage-2026-10-21/dairy-calculations.json`

**24 files total.** Ignored diagnostic logs, baseline hashes and the one-off collector remain under `artifacts/barcode-grade-coverage-20261021/`; they are not application dependencies or part of this patch inventory. No unrelated archive or pre-existing untracked test is required by the patch. No manual check is needed to finish this noninteractive assignment; an optional later local check is `npm start`, then `http://localhost:3000/?barcodeGrading=1` with the example codes above.

## Reference semantics

- [OFF nutrition schema](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition/): canonical reference fields and entered-value basis.
- [OFF product schema](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product/): package quantities and units.
- [OFF API documentation](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/): provider usage limits and attribution.
- [USDA branded-food documentation, April 2024](https://fdc.nal.usda.gov/docs/Branded_Foods_Documentation_Apr2024.pdf), Standardizing and Presenting section: 100 g/100 mL reference standardization.
- [GS1 unit codes](https://gs1.se/en/guides/documentation/code-lists/t0055-unit-of-measure/): GRM and MLT aliases.
- [21 CFR 101.9(c)(1)](https://www.ecfr.gov/current/title-21/section-101.9#p-101.9(c)(1)): existing calorie-label rounding context; ordinary numeric representation intervals are distinct from those US labeling allowances.

Reproduce offline, without provider requests or user-browser access:

```powershell
node scripts/replay-barcode-grade-coverage.cjs before
node scripts/replay-barcode-grade-coverage.cjs after
node scripts/replay-barcode-grade-coverage.cjs cached-after
```
