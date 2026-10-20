# Nutritional assessment input foundation

Implemented for review on 2026-10-19, from base commit
`e3c5be29f7e8f205b9f9f8e4f3aea78b66d602e3`. No scoring methodology,
regulatory interpretation, claim-eligibility evaluator, or visible UI is implemented.
The [American-first research](american-first-nutrition-methodology-2026-10-19.md)
supersedes the earlier UK candidate as the direction for future work.

## Separate optional evidence contract

`assessmentInputs` is an optional, immutable, JSON-compatible version-1 field on
normalized remote foods. It does not participate in `nutrients`, `nutritionBasis`,
`logReady`, serving conversions, or food-log calculations. USDA and Open Food
Facts evidence is captured from responses already requested by the gateway.
Four small country/category fields are added to the existing OFF field selection;
there is no additional provider request or runtime name/reference lookup.

Previously lost information includes saturated fat (outside the eight logging
nutrients), country/category fields discarded by provider normalization, and USDA
reference nutrients excluded when a coherent serving label takes precedence.
For example, added sugar present only in `foodNutrients` now survives in its own
reference dataset; the logging serving value remains unknown. We do not splice
datasets to manufacture a complete label.

| Field | Evidence retained |
| --- | --- |
| `schemaVersion`, `identification` | Version 1; provider-reported, never independently confirmed |
| `identity` | Requested GTIN, provider's GTIN if supplied, product name, brand |
| `source` | Provider, record ID, product URL, attribution, revision/publication/retrieval timestamps, original date fields, observed cache staleness |
| `markets`, `categories` | Original provider fields and strings; missing information is an empty collection, not a US default |
| `serving` | Original provider serving amount, unit and description; OFF declared nutrition basis |
| `ingredients` | Field path, language and availability; the unchanged ingredient text remains in the existing sibling `ingredients` model |
| `datasets` | Distinct label/reference/entered-value datasets, basis, declared quantity and raw observations |
| `foodGroups` | Available allowlisted quantitative OFF fields with reported-versus-estimated attribution |
| `limitations` | Explicit incomplete-field, excess-observation and unresolved-reference-dimension flags |

Each observation preserves nutrient identity, raw value, original/schema unit,
unit provenance, contributor-entered unit when distinct, provider field path,
and available derivation description. No unsupported unit becomes a standard
amount. Null/missing, zero, invalid values, incompatible units and conflicting
observations remain distinguishable. Unexpected structures or oversized optional
evidence become `null`; otherwise usable food logging continues.

Supported nutrients are energy/calories, saturated fat, added sugars, total sugars,
sodium, dietary fiber, protein, total fat and carbohydrates. Free sugars have a
separate optional observation key. None of the three sugar types substitutes for
another. Raw observations remain unchanged; a pure projection returns kcal, g
or mg using explicit mass-unit conversion or kJ / 4.184, without rounding.
No %DV conversion, salt-to-sodium inference, ingredient parsing or density
assumption is performed.

## Provider units and measurement basis

USDA `labelNutrients` observations use a per-serving dataset, with explicit units
when present and documented label units otherwise. `foodNutrients` is kept
separately, supporting both search and detail nutrient shapes and available
derivation information. USDA documents reference values on a 100-unit mass or
volume basis. This adapter accepts a 100-g mass reference when the record declares
a gram serving; otherwise it preserves the observations with an unknown basis
and `unconfirmed-usda-reference-dimension`. Volume reference resolution requires
better provider evidence; it does not assume a density of 1. This conservative
assessment policy does not change the existing logging adapter.

OFF standardized `_100g` and `_serving` nutrients use the Product schema's
standard units (g for weight nutrients; kcal for `energy-kcal`, kJ for
`energy`/`energy-kj`). Contributor `_unit` belongs to `_value`, so both are retained
separately. `_100g` can denote 100 g **or 100 mL for liquids**. A declared
`nutrition_data_per` of `100g` or `100ml` provides that dataset's dimension;
otherwise it remains unknown. Explicit `_100ml` fields retain a volume basis.
Serving and entered-value datasets stay separate. Unknown dimensions or units
never inherit an assumption from an adjacent dataset.

Food-group fields currently retained from existing OFF `nutriments` are
`fruits-vegetables-nuts_100g`, `whole-grain_100g`,
`fruits-vegetables-nuts-estimate_100g` and
`fruits-vegetables-nuts-estimate-from-ingredients_100g`, when supplied.
Estimated fields stay estimates. Their percentages do not establish FDA cup-
or ounce-equivalents, recipe composition, eligible food groups or healthy-claim
qualifications. USDA category strings are not quantitative food-group evidence.
Absent amounts are not zero.

## Identity, quality and readiness

Country metadata is evidence about a provider record, not independent confirmation
of a package's country of sale or formulation. Same-name/brand or same-barcode
records are never merged into an assessment. GTIN alone cannot establish US
identity; overseas metadata is retained as overseas metadata. Existing cache keys
remain GTIN-based, not a regional product database. Market matching, formulation
verification and region-aware retrieval remain future work.

`getNutritionAssessmentQuality` recomputes quality from validated evidence:

- `nutrientCapture`: complete, partial or missing. Complete means all nine profile
  nutrients occur on one known-basis dataset with no detected nutrient conflict,
  invalid observation or unsupported nutrient unit. It does not mean all future
  methodology inputs exist.
- `missingEssentialNutrients`: saturated fat, added sugars and sodium missing
  from the best single known-basis dataset. This is the provisional US profile
  minimum, not an approved list of scoring requirements.
- States include unknown measurement basis, missing essential profile nutrients,
  unknown market/category, conflicting provider information, stale/undated source,
  invalid measurements and unsupported units.
- Repeated observations, added/free sugar exceeding total sugar, saturated fat
  exceeding total fat, or disagreeing compatible datasets are flagged. Comparing
  datasets requires explicit compatible mass or volume quantities; no cross-
  dimension conversion occurs. Differences above relative tolerance 1e-9 are
  conservatively flagged, including potential label-rounding differences.
- Date status distinguishes stale, undated and dated-but-not-currentness-verified.
  Retrieval is not revision. Publication is not revision. A future revision
  relative to retrieval is flagged. Expired-cache selection persists the observed
  stale flag in snapshots; a later fresh lookup can supply a new snapshot.
- `scoreReady` is always false; `scoreReadiness` is `method-not-approved`.
  Market/category/food-group data may still be missing even with complete nutrients.

## Compatibility and bounds

The shared normalizer binds evidence to the containing remote food's GTIN, name,
brand, provider, record ID, URL, attribution and retrieval date. It accepts only
known provider source hosts, valid ISO dates, supported contract versions and
bounded structures. It reconstructs whitelisted fields and discards claimed
scores or cached quality assertions. This is structural validation, not cryptographic
verification of provider claims.

The optional field is limited to 12 KiB UTF-8 with bounded field lengths, arrays,
datasets and observations. The gateway also drops optional evidence when its
addition would take the food above 60 KiB, leaving headroom within the existing
64-KiB browser response limit. Existing response limits still apply. No raw response,
credentials or duplicate ingredient text is stored.

Cache version 2 remains unchanged. Old foods without the field remain without it;
malformed/future-version optional fields become null instead of invalidating
nutrition. No migration, forced refresh or historical rewrite occurs. Metadata
survives remote review, selection, incomplete-food recovery, custom provider
snapshots, and Nutrition food references. User edits and serving multipliers
change logging values while preserving the original assessment evidence. Those
snapshots describe provider observations, not the edited meal's composition.
Ingredients, additives and legal-event records are unchanged.

## Fixtures and verification

`src/services/__fixtures__/nutritionAssessmentInputs.cjs` contains ten explicitly
synthetic, source-schema-attributed fixtures: sugary beverage, cereal, yogurt,
protein bar, frozen meal, nuts, processed meat, packaged fresh produce, missing
nutrients and unknown market. These are contract/limitation cases, not real brands,
verified nutrient measurements or national coverage estimates.

Focused tests cover units, sugars, saturated fat, basis, identity, provenance,
quality, cache compatibility, persistence, response bounds and unchanged serving
precision. Existing scanner/photo/manual-entry, ingredients and logging tests
provide regression coverage. No production build or new dependency is required.

Validation on 2026-10-19: 315 distinct focused tests across 19 suites passed over
targeted runs: 77 assessment/gateway tests, 14 Nutrition barcode workflow tests,
and 224 other scanner, ingredients, cache, lookup, selection, storage, additive
and calculation regression tests. Early new storage fixtures omitted required
ID/identifier setup; they were corrected and their tests rerun successfully.
Changed-file lint introduces no errors or warnings; the 18 existing Testing
Library errors in `NutritionPage.barcode.test.jsx` match HEAD by rule, message,
severity and offending source line. All eight changed JS/CJS files pass Node
syntax checks; both JSX files parse through ESLint. Targeted Git whitespace
checks and direct checks of new files pass.

Reproduce the core contract and Nutrition workflow checks from the project root:

```powershell
$env:CI = 'true'
node node_modules/react-scripts/scripts/test.js --watchAll=false --runInBand --testTimeout=30000 --runTestsByPath src/services/nutritionAssessmentInputs.test.js src/services/nutritionAssessmentInputs.integration.test.js src/services/remoteBarcodeGateway.test.js src/components/NutritionPage.barcode.test.jsx
```

Run details and the original working-tree hash checkpoint are preserved locally
under ignored `artifacts/barcode-ingredients-disclosure-20261019/assessment-*`.
These automated checks do not replace physical Safari/PWA/native-camera testing;
scanner implementations and rendered layouts are unchanged.

## Source documentation

Checked 2026-10-19. These document provider interpretation, not a grading formula:

- [USDA GBFPD documentation](https://fdc.nal.usda.gov/GBFPD_Documentation/):
  Market Country; Standardizing and Presenting GBFPD Data; Missing Data, Zero
  Values and NSS; Derivation of Nutrient Values. Supplier reporting, 100-unit
  mass/volume conventions and label rounding limit interpretation.
- [Official OFF Product schema](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product/):
  `nutriments`, standardized `_100g`/`_serving`, contributor `_value`/`_unit`,
  nutrition basis, country/category fields and modification timestamps.

Existing USDA and OFF product attribution is preserved. Existing OFF ODbL reuse
review requirements still apply; capturing more metadata does not settle them.

Next: approve a versioned US Nutrition Profile requirements specification and
market/basis eligibility policy, then validate it against a small independently
checked US-label sample. Resolve quantitative food-group and added-sugar gaps
before choosing or implementing a numerical grade.
