# Shared assessment-source fallback — 2026-10-21

Starting HEAD: `8fd1803291f073b5c2b6d3bdb9ab817cae876c48`. Development-only implementation; no staging, commit, push, deployment or access to the user's browser profile/records is authorized in this task.

## Existing source-selection gaps

Ordinary lookup considered whether a record could supply basic food-log macros, rather than whether its full captured evidence could support the requested experimental assessment. A local catalog hit returned immediately, even when an already captured matching OFF panel supplied missing scoring nutrients or ingredients. The gateway returned its first usable USDA result and discarded other exact-GTIN USDA candidates; it also discarded a normalized incomplete USDA record when OFF won. The browser could therefore neither reuse those candidates nor ask the other supported provider after a loggable but ungradable preferred record.

The new optional assessment callback reports only usability booleans, never score magnitude. Ordinary lookups retain existing catalog/user/provider order. Development grading first keeps a preferred record that supports both nutrition and combined assessment. Otherwise it considers retained complete source records, then makes a bounded request only for a provider whose evidence is still needed. Whole records are selected, not a mixture of one source's nutrition and another source's ingredient declaration. Exact-GTIN, product/variant and available market checks reject explicit conflicts; missing edition metadata remains uncertainty. Manufacturer fact corrections run on each candidate before assessing usability.

Cached candidates and provider attempt outcomes are retained within bounded existing cache records. Recording a failed attempt or adding candidate metadata preserves the primary record's original age/expiry; it does not make old food evidence fresh. An expired observation retained after a failed refresh remains explicitly stale. The focused cache regressions verify this separately from the fresh synthetic-cache corpus experiment.

Provider requests retain the existing timeouts and in-flight coalescing. Repeated unavailable checks have a one-minute cooldown; an explicit response's longer `Retry-After` (seconds or HTTP date) is honored. Older gateway captures do not expose hidden losing-provider retry headers or attempt outcomes, so those details remain unknown.

An ordinary-food lexical gap also affected both captured Quaker declarations: `whole grain rolled oats` now resolves to the existing oats rule. No scientific classification, concern weight, nutrition equation or overall-score weight changes.

## Frozen sample and evidence boundaries

The same 100 barcodes from [the original selection](../barcode-grade-coverage-2026-10-21/selection.json) are used throughout. This is a purposive, mixed-market provider sample, not a random sample or a national US coverage/accuracy estimate. Provider country claims do not independently establish a specific US formulation. No new products or manufacturer labels were researched.

- [before.json](before.json) preserves the pre-edit replay at the actual starting HEAD: **78 nutrition / 73 combined**, comprising **11 reviewed / 62 provisional**; 91 loggable candidates and 100 correctly rendered development reviews.
- [captured-candidate-audit.json](captured-candidate-audit.json) independently evaluates the existing original raw OFF responses for the 27 unresolved assessments, bypassing catalog precedence for diagnosis only. The original raw archive remains unchanged. This diagnoses evidence that existed before implementation; it does not automatically promote those records.
- [alternative-responses.jsonl](alternative-responses.jsonl) contains read-only live requests for only those 27 unresolved barcodes, spaced at least 4.3 seconds apart. All 27 completed with HTTP 200. Four initial network failures in the restricted execution context are preserved separately; they are transport failures, not evidence that a provider has no matching food. Successful retries used the authorized network execution context.
- Those live captures are parsed **normalized Trace gateway responses**, not original upstream USDA search responses. Five selected USDA records; 22 selected OFF. An OFF result does not reveal whether the hidden USDA attempt was unavailable, unconfigured or had no usable match. That missing outcome is not invented.
- [alternative-candidate-audit.json](alternative-candidate-audit.json) evaluates each complete live record separately through existing candidate/assessment functions. It describes potentially usable evidence before compatibility/source selection, not automatic application to another edition.
- [implementation-only.json](implementation-only.json) replays the new implementation using only the original raw OFF evidence. [after.json](after.json) also makes the five captured USDA alternatives available. [cached-after.json](cached-after.json) seeds a synthetic in-memory cache with original captured lookups and runs the same shared path. None accesses installed browser storage.

The replay transport is deliberately reconstructed: it retains the original corpus's OFF observation preference so implementation gains can be separated from newly obtained alternative evidence. It supplies a real captured normalized USDA record only for a matching explicit USDA request. Other unobserved USDA outcomes are modeled as unavailable controls, never reported as actual provider not-found results. Counts from this experiment are not a measurement of a live configured USDA-first deployment.

## Completion results

| Same 100 captured products | Starting HEAD | Existing evidence + repair | With newly captured alternatives | Seeded-cache replay |
| --- | ---: | ---: | ---: | ---: |
| Nutrition scores | 78 | **83** | **83** | **83** |
| Combined assessments | 73 | **79** | **79** | **79** |
| Reviewed combined | 11 | **13** | **13** | **13** |
| Provisional combined | 62 | **66** | **66** | **66** |
| Nutrition-only | 5 | 4 | 4 | 4 |
| Nutrition unavailable | 22 | 17 | 17 | 17 |
| Loggable selected development candidates | 91 | 90 | 90 | 90 |
| Correctly rendered development reviews | 100 | 100 | 100 | 100 |

All gains come from shared implementation repairs using **already captured OFF evidence**, including the ordinary-oats phrase. Newly obtained USDA observations add **zero** supported scores: four do not independently supply the missing scoring nutrients, while the independently scorable Lidl/Crownfield pair retains its identity conflict. No existing nutrition or overall score is withdrawn or changed. The lower loggable-development-candidate count is Honey Nut Cheerios selecting a scorable but incomplete logging panel; this does not change ordinary nonassessment catalog logging or any saved entry.

| Barcode / selected coherent OFF product | Before nutrition / overall | After nutrition / overall | Why newly available |
| --- | --- | --- | --- |
| `00894700010045` Chobani strawberry | 80 / unavailable | **80 / 80 provisional** | Use the complete OFF panel and its ingredients instead of splicing ingredients into the catalog panel |
| `0016000275263` Cheerios | unavailable / unavailable | **52 / 52 provisional** | OFF supplies the scoring and ingredient evidence missing from the catalog |
| `0818290015150` Chobani vanilla | unavailable / unavailable | **80 / 80 provisional** | Same shared whole-record fallback; no manufacturer/package-revision claim |
| `0030000010402` Quaker Old Fashioned Oats | unavailable / unavailable | **88 / 88 reviewed** | Complete OFF nutrition plus existing ordinary-oats rule |
| `0016000124790` Honey Nut Cheerios | unavailable / unavailable | **39 / 39 provisional** | Explicit 100 g panel can be assessed without inventing missing logging macros/serving conversion |
| `0030000012000` Quaker Quick 1-Minute Oats | unavailable / unavailable | **74 / 74 reviewed** | Complete OFF nutrition plus existing ordinary-oats rule |

Reviewed ingredient status is not a safety assurance. Source country/edition uncertainty remains separate from the availability of a numerical assessment. Six whole-record source selections are made. The two fresh modes each intercept 121 gateway requests; the seeded-cache mode intercepts 32. These are deterministic offline fixture transports, not additional provider calls.

The remaining 17 nutrition failures comprise six distinct products missing required nutrients (four saturated-fat cases, two sodium cases; a missing-sugar reason overlaps one saturated-fat case), six unknown/incompatible measurement bases, and five unresolved energy conflicts. Four additional products have nutrition but no captured usable declaration: Frosted Flakes `00038000196560` (36), Strawberry Yoghurt `9339687411702` (74), Reserve Cheddar `0068200960548` (14), and Speisequark `4316268741163` (74). This describes the requested captured fields, not proof that no label/declaration exists elsewhere. Unknown ingredient-review reasons among nutrition failures overlap those failures and are not additional unscored products.

## Conflicting editions and remaining limitations

Chobani strawberry illustrates coherent replacement: the catalog's 150 g sodium is 60 mg, while the captured OFF source has 55 mg and its own full ingredient declaration. Selecting OFF must preserve the original catalog snapshot and attribute the effective complete OFF record. It must not combine the catalog's panel with OFF ingredients or claim a manufacturer-verified package revision.

The new USDA bran-flakes observation for `20621483` is independently scorable but not automatically interchangeable with the captured OFF record. OFF identifies Crownfield Special Flakes Bran Flakes, 500 g package/50 g serving; USDA identifies LIDL Bran Flakes Cereal with a 61 g serving. The available brand/edition differences remain explicit. A matching store EAN-8 is not permission to discard those conflicts. The `01231809` observations likewise disagree between Waitrose/Montain Dew and Pepsi DIET SODA; no replacement values or variant match are invented.

Honey Nut Cheerios has a usable explicit per-100-g scoring panel while its logging panel is incomplete: captured serving carbohydrates are missing and the 37 g serving text conflicts with a structured mL unit. If this whole source is selected for development assessment, Use This Food remains disabled. A score does not authorize a guessed carbohydrate value or serving conversion. Ordinary nonassessment catalog logging remains unchanged.

The five previously traced dairy calculations are not recalibrated. They establish the existing rules' result using captured, unverified inputs; they do not independently establish label accuracy or prove a required formula change.

At most three alternative whole records are retained within a 60 KiB evidence envelope, with the selected usable alternative taking precedence over unused editions. Exceptionally large records or exhausted browser cache capacity can prevent offline retention; online retries remain possible. No sample case reached this bound. A cache-write failure never clears the older cached food or historical entries.

## Reproduction and validation

Run the offline same-corpus experiments with existing dependencies:

```powershell
node scripts/replay-barcode-source-fallback.cjs all
```

Or run one mode: `implementation-only`, `after`, or `cached-after`. The saved `before.json` is the actual pre-edit starting-HEAD baseline, not overwritten with later code. The script prohibits network requests, validates all computed results through the real server-rendered development review, and asserts `grade=null` / `scoreReady=false` plus production query-flag gating. Cache experiments use synthetic Maps, not localStorage or IndexedDB.

The final three modes each evaluate all 100 products, render all 100 actual development reviews and report zero errors. The replay script passes ESLint with zero errors/warnings and `node --check`. Focused application tests and complete-patch dependency/preservation checks are recorded by the implementation review; the replay is evidence for the paths it exercises, not a substitute for save/reopen, failure/offline or scanner regressions. No production build or new dependency is needed.

Focused validation: 281 distinct Jest cases passed across gateway, model, cache, lookup, selection, scanner, Nutrition, review, production gating and production CommonJS transforms. The initial regression run had nine UI timing failures; those nine passed in an isolated rerun with a 30-second test timeout and five-second asynchronous query allowance, without changing assertions or application code. New controls cover whole-record selection, source conflicts, score-independent ties, failed/expired/offline cache, Retry-After and actual review → selection → save → reopen at half, one and two servings. Changed-file lint has zero errors/warnings.

A separate isolated captured-input check confirms fresh/cached agreement and half/one/two-serving precision: Quest USDA supplies the existing coherent manufacturer reference at 220 mg sodium/60 g; SPAM OFF supplies 770 mg/56 g; Teddy USDA supplies corrected added and total sugars of 7 g/30 g. Teddy remains provisional 20 using the explicitly separate manufacturer-reference assessment, not verification of every provider-panel value. Original observations and historical entries are preserved.

## Complete implementation inventory

Runtime and focused regressions:

```text
api/nutrition/_barcodeGateway.cjs
src/services/remoteFoodModel.js
src/services/remoteBarcodeLookup.js
src/services/remoteBarcodeCache.js
src/services/barcodeSourceSelection.js
src/services/barcodeNutritionSelection.js
src/services/remoteBarcodeGateway.fallback.test.js
src/services/remoteBarcodeLookup.fallback.test.js
src/development/barcodeAssessmentFallback.js
src/development/barcodeSourceFallback.integration.test.jsx
src/development/BarcodeNutritionReview.jsx
src/development/additiveScreeningPolicy.js
src/components/BarcodeScannerDialog.jsx
src/components/NutritionPage.jsx
scripts/replay-barcode-source-fallback.cjs
```

New evidence and reproducible reports:

```text
docs/barcode-source-fallback-2026-10-21/README.md
docs/barcode-source-fallback-2026-10-21/before.json
docs/barcode-source-fallback-2026-10-21/captured-candidate-audit.json
docs/barcode-source-fallback-2026-10-21/alternative-responses.jsonl
docs/barcode-source-fallback-2026-10-21/alternative-candidate-audit.json
docs/barcode-source-fallback-2026-10-21/implementation-only.json
docs/barcode-source-fallback-2026-10-21/after.json
docs/barcode-source-fallback-2026-10-21/cached-after.json
```

Original coverage/research archives, historical food records, scanner/camera behavior, nutrition calculations and all themes are preserved. Production grading remains disabled, including preview flags.
