# Quest and SPAM manufacturer-panel corrections

Reviewed 2026-10-21 against HEAD `fb40bfe189950d9999fe5f5a877071248a04f8a4`.
This is a two-product correction, not a repeat of the grocery audit. The earlier
audit archives remain historical provider observations. No scoring mathematics,
thresholds, additive classifications or weights change.

## Exact sources and identity

- Quest Chocolate Chip Cookie Dough Protein Bar: UPC **888849000012**;
  captured GTIN **00888849000012**, OFF record **0888849000012**. Captured package
  60 g, serving 60 g; provider markets France and US. The
  [official US product page](https://www.questnutrition.com/products/chocolate-chip-cookie-dough-protein-bar)
  explicitly associates this UPC with the flavor. Its pictured individual bar
  is 2.12 oz (60 g). Listed outer boxes reuse the barcode, so an outer count is
  not inferred. The visible Nutrition Facts table and accompanying ingredients
  supply the selected coherent reference. Its undated embedded JSON-LD description
  instead says 200 kcal, 200 mg sodium, 14 g fiber and 21 g carbohydrate. Those
  conflicting metadata values are recorded as a limitation, never mixed in.
- SPAM Classic: UPC **037600138727**, captured GTIN **00037600138727**,
  OFF record **0037600138727**. The
  [exact-GTIN Hormel SmartLabel page](https://smartlabel.hormelfoods.com/product-info/00037600138727)
  displays the UPC and links a manufacturer package photo showing Classic,
  12 oz (340 g). Its US Nutrition Facts and ingredient list are on the same page:
  6 servings per container, 56 g per serving. Captured provider markets include
  multiple countries and its serving is 56.699 g.

Both source snapshots were directly retrieved on 2026-10-21. Their SHA-256 hashes,
review timestamps, edition limitations, full panels and original provider panel
fingerprints are in `src/data/questSpamManufacturerLabels.json`. Quest has no
verified label publication date. SPAM's live footer says information updated on
21-Oct-2026; this is a page statement, not an established package revision date.
Neither source proves the revision or regional formulation of a physical package.
The US reference is explicit, independently of the older multi-market provider
declaration. Matching current ingredients are not required of an older declaration.

## Full panel comparison

Values are per the stated serving; sodium is mg, energy kcal, other values g.
The before columns are original provider observations, not manufacturer-validated
facts. Saturated fat is retained in assessment/source evidence rather than the
ordinary eight-field food-log nutrient contract.

| Field | Quest provider, 60 g | Quest manufacturer, 60 g | SPAM provider, 56.699 g | SPAM manufacturer, 56 g |
|---|---:|---:|---:|---:|
| Energy | 190 | 190 | 182 | 180 |
| Fat | 9 | 9 | 13.8 | 16 |
| Saturated fat | 3 | 3 | 5.5 | 6 |
| Carbohydrate | 22 | 22 | 1.81 | 1 |
| Fiber | 12 | 12 | 0 | 0 |
| Protein | 21 | 21 | 8.5 | 7 |
| Sodium | 0.22 | 220 | 1.36 | 770 |
| Total sugars | 1 | 1 | 0.737 | 1 |
| Added sugars | 0 | 0 | conflicting; logging null | 1 |

SPAM's raw serving added sugar is 1.01 g, exceeding its 0.737 g total sugars;
Trace preserves that contradiction and the logging null in the original snapshot.
No one multiplies the suspicious sodium fields by 1,000 to guess a replacement.
SPAM uses an entire replacement panel and its 56 g basis, not a scaled version of
the older recipe. Quest also uses a complete manufacturer panel, with its current
ingredients; nutrients that already agree retain the same values.

| Sodium in a new entry | Half serving | One serving | Two servings |
|---|---:|---:|---:|
| Quest | 110 | 220 | 440 |
| SPAM | 385 | 770 | 1540 |

All eight logging nutrients multiply from the replacement serving without
intermediate rounding. No historical saved entry is rewritten.

## Scores from the unchanged existing functions

| Product | Nutrition before → after | Overall before → after |
|---|---|---|
| Quest | 54 → 54 | 52 → 52, provisional |
| SPAM Classic | 23 → 21 | 22 → 20, provisional |
| Teddy regression | 20 → 20 | 20 → 20, provisional |

Quest's normalized sodium rises from 0.366667 to 366.666667 mg/100 g, but its
5 g/100 g saturated fat still drives the strongest-component safeguard.
Saturated-fat burden is 4/9, limiting burden 0.355555556. Corrected sodium burden
is 0.341563786; weighted burden remains below the safeguard. Energy is unchanged
at 316.666667 kcal/100 g. Raw nutrition remains 54.181623932, rounded to 54.
Existing erythritol screening weight 0.2 yields `54 × (1 − .20 × .2) = 51.84`,
rounded to 52. This policy judgment and its uncertainties are unchanged.

SPAM's manufacturer saturated fat is 10.714286 g/100 g versus the provider's
9.7, so saturated-fat burden rises from 0.966666667 to the cap of 1. Manufacturer
sodium is 1375 mg/100 g, also burden 1. Weighted burden 0.6 remains below the
strongest safeguard of 0.8. Energy density remains 321.428571 kcal/100 g despite
the changed serving. Fiber is zero and protein remains at the existing capped
credit of 2 before the limiting adjustment. Raw nutrition becomes
`85 − 60 × .8 − 35 × ((321.428571 − 80)/520) + 2 × (1 − .8) = 21.15`,
rounded to 21, versus 22.803333333 rounded to 23 before. Existing sodium-nitrite
screening weight 0.2 yields `21 × .96 = 20.16`, rounded to 20.

## Application and cache behavior

The existing verified-correction service now supports an explicit whole-panel
replacement alongside Teddy's unchanged single-fact correction. It requires
the exact UPC, flavor/name, brand, package, known captured provider revision,
serving and eight-field provider nutrient fingerprint, plus manufacturer evidence.
Wrong flavors, sizes, source editions, altered values or foreign-only identity
claims do not inherit it. This is intentionally bounded to the reviewed observations;
future provider edits require review instead of silently matching.

The correction is resolved during normal candidate creation **after** remote/cache
lookup. Fresh and expired/offline copies of the reviewed observation use the same
local manufacturer reference, while keeping the stale flag. No cache is cleared
or migrated. Independent manufacturer assessment also runs if an older cached
provider energy wrapper is unscorable; that failed original assessment remains
separate. This fixes the former early-return bypass without changing eligibility
or energy reconciliation rules.

Review, Use This Food, serving edits, new saves and reopen use the same eight
manufacturer logging nutrients. New saved references retain the complete manufacturer
panel, source and qualifications, plus the original provider observations, entered
units, serving, ingredients and additive identifiers. Old tags are not attached
to the newer ingredients. Existing additive screening examines the manufacturer
declaration with manufacturer attribution; no replacement provider tags are invented.
The existing Ingredients control and all score/evidence disclosures retain their
layout and default collapsed state. Generic manufacturer wording replaces the
previously hardcoded Teddy description only for these replacements.

The grading output remains `grade=null`, `scoreReady=false`, with the existing
production query gating and module compatibility repair intact. No camera,
decoder, nutrition calculation, scoring policy, theme, storage migration, browser
profile or user record is modified. No build, commit, push or deployment is part
of this work. Physical package revision remains unconfirmed; optional manual check:
compare these references with the label on the user's own package before relying
on it for a different revision.

## Complete patch inventory

- `src/data/questSpamManufacturerLabels.json` (new)
- `src/services/verifiedProductNutritionCorrections.js`
- `src/services/verifiedProductNutritionCorrections.manufacturer.test.js` (new)
- `src/services/barcodeNutritionSelection.js`
- `src/services/barcodeNutritionDataAudit.test.js`
- `src/components/BarcodeScannerDialog.jsx` (ingredient-attribution prop only)
- `src/components/NutritionPage.jsx` (coherent source persistence and undated attribution)
- `src/development/barcodeNutritionAssessment.js`
- `src/development/verifiedBarcodeNutritionAssessment.js`
- `src/development/traceOverallFoodQuality.js` (ingredient source selection only)
- `src/development/BarcodeNutritionReview.jsx` (manufacturer-specific text only)
- `src/development/BarcodeNutritionReview.test.jsx`
- `docs/remote-barcode-lookup.md`
- `docs/quest-spam-nutrition-corrections-2026-10-21.md` (this report)

Historical batch tests explicitly opt out of later manufacturer corrections: their
purpose remains reproducing the captured source profiles. New tests independently
rejoin the archived **raw nutrient/serving fields** with identity/ingredient/category/
market/tag metadata from the same captured lookup (not an intact original HTTP
response). They exercise the actual gateway request/normalization, browser lookup,
review, assessment, selection, serving multiplication, save and reopen against
test-only memory storage. No fresh grocery provider or user browser is needed.

Validation completed: **247 distinct tests across nine focused suites passed**
across the targeted runs. This includes the new two-product path, existing Teddy,
Nutrition barcode handoff, source-only audit, ingredient disclosure, nutrition
adapter, additive policy, compact review and CommonJS production-transform tests.
Four final targeted checks reconfirmed Teddy, production query gating and the two
startup transforms. Existing UI tests that exceeded the default five-second
timeout passed with a 20-second test timeout; no application workaround was added.
Changed-file lint reports **0 errors and 0 warnings**; syntax, JSON and whitespace
checks pass. Dependency traversal covers 120 project files and 252 local references,
with no missing or omitted dependencies. Its only required untracked code/data are
the two new files explicitly in the inventory. Final preservation checks confirm
all 62 unrelated Git entries and 712 unrelated existing file contents unchanged;
HEAD and the empty index remain unchanged. No actual browser storage was accessed.
